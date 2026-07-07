import type { AnalysisResponse, DocumentParagraph, FlaggedItem, SourceCandidate } from "../../src/shared/types.js";
import { clampScore, getStats, jaccardSimilarity, makeNgrams, pickRepresentativeQuery, riskLevel, tokenize } from "./textProcessing.js";

const DOMAINS = ["garuda.kemdikbud.go.id","neliti.com","moraref.kemenag.go.id","onesearch.id","doaj.org","jurnal.ugm.ac.id","ejournal.undip.ac.id","journal.unnes.ac.id","ejournal.upi.edu","journal.uny.ac.id"];

function internal(paragraphs: DocumentParagraph[]): { score: number; items: FlaggedItem[] } {
  const items: FlaggedItem[] = [];
  let highest = 0;
  for (let i=0;i<paragraphs.length;i++) for (let j=i+1;j<paragraphs.length;j++) {
    const a = paragraphs[i], b = paragraphs[j];
    if (!a || !b || a.wordCount < 18 || b.wordCount < 18) continue;
    const ta = tokenize(a.text), tb = tokenize(b.text);
    const score = clampScore((jaccardSimilarity(ta,tb)*0.55 + jaccardSimilarity(makeNgrams(ta,3),makeNgrams(tb,3))*0.45)*100);
    highest = Math.max(highest, score);
    if (score >= 42) items.push({ paragraphIndex: b.index, matchedParagraphIndex: a.index, score, reason: `High internal overlap with paragraph ${a.index + 1}.`, text: b.text });
  }
  return { score: clampScore(highest * 0.85 + Math.min(items.length * 5, 15)), items: items.sort((a,b)=>b.score-a.score).slice(0,12) };
}

async function google(query: string): Promise<SourceCandidate[]> {
  const key = process.env.GOOGLE_SEARCH_API_KEY?.trim(), cx = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim();
  if (!key || !cx) return [];
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key); url.searchParams.set("cx", cx);
  url.searchParams.set("q", `"${query}" (${DOMAINS.slice(0,6).map(d=>`site:${d}`).join(" OR ")})`);
  url.searchParams.set("num", "3");
  const r = await fetch(url); if (!r.ok) return [];
  const d = await r.json() as { items?: Array<{ title?: string; link?: string; snippet?: string }> };
  return (d.items || []).filter(x=>x.title && x.link).map(x=>({ title:x.title!, url:x.link!, snippet:x.snippet, provider:"Google Programmable Search", confidence:"medium" }));
}

async function openAlex(query: string): Promise<SourceCandidate[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query); url.searchParams.set("per-page", "3");
  const mailto = process.env.OPENALEX_MAILTO?.trim(); if (mailto) url.searchParams.set("mailto", mailto);
  const r = await fetch(url); if (!r.ok) return [];
  const d = await r.json() as { results?: Array<{ title?: string; doi?: string; primary_location?: { landing_page_url?: string } }> };
  return (d.results || []).filter(x=>x.title).map(x=>({ title:x.title!, url:x.primary_location?.landing_page_url || x.doi || "https://openalex.org", doi:x.doi, provider:"OpenAlex", confidence:"low" }));
}

async function sourcesFor(paragraphs: DocumentParagraph[]): Promise<SourceCandidate[]> {
  const max = Math.max(0, Math.min(Number.parseInt(process.env.MAX_SEARCH_QUERIES || "4",10) || 4, 12));
  const picks = paragraphs.filter(p=>p.wordCount>=25).sort((a,b)=>b.wordCount-a.wordCount).slice(0,max);
  const all: SourceCandidate[] = [];
  for (const p of picks) {
    const q = pickRepresentativeQuery(p.text);
    const [g,o] = await Promise.all([google(q).catch(()=>[]), openAlex(q).catch(()=>[])]);
    all.push(...g,...o);
  }
  const seen = new Set<string>();
  return all.filter(s => { const k=s.url.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0,10);
}

export async function analyzeSimilarity(text: string, paragraphs: DocumentParagraph[]): Promise<AnalysisResponse> {
  const stats = getStats(text, paragraphs);
  const inside = internal(paragraphs);
  const src = await sourcesFor(paragraphs);
  const sources = src.map(s => {
    let best = 0;
    for (const p of paragraphs) best = Math.max(best, jaccardSimilarity(tokenize(p.text), tokenize(`${s.title} ${s.snippet || ""}`)));
    const similarity = clampScore(best*100);
    return { ...s, similarity, confidence: similarity >= 45 ? "high" as const : similarity >= 24 ? "medium" as const : s.confidence };
  }).sort((a,b)=>(b.similarity||0)-(a.similarity||0));
  const score = clampScore(inside.score * 0.75 + (sources.some(s=>(s.similarity||0)>=45) ? 18 : sources.length ? 8 : 0));
  return {
    type: "similarity",
    score,
    riskLevel: riskLevel(score),
    summary: sources.length ? `Ditemukan ${inside.items.length} indikasi kemiripan internal dan ${sources.length} kandidat sumber eksternal.` : `Ditemukan ${inside.items.length} indikasi kemiripan internal. No external source found.`,
    stats,
    flaggedItems: inside.items,
    sources,
    limitations: [
      "Similarity score adalah indikator risiko, bukan vonis plagiarisme resmi.",
      "Cakupan sumber bergantung pada provider yang dikonfigurasi.",
      "Tidak ada sumber yang dibuat oleh AI; hanya URL/DOI dari provider yang ditampilkan."
    ],
    generatedAt: new Date().toISOString()
  };
}
