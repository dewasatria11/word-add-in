import type { AnalysisResponse, DocumentParagraph, FlaggedItem } from "../../src/shared/types.js";
import { clampScore, getStats, riskLevel, splitIntoSentences, tokenize } from "./textProcessing.js";

const GENERIC = ["secara umum","dapat disimpulkan","penting untuk dicatat","selain itu","lebih lanjut","in conclusion","furthermore","it is important to note","overall","in general"];

function std(values: number[]): number {
  if (!values.length) return 0;
  const avg = values.reduce((a,b)=>a+b,0)/values.length;
  return Math.sqrt(values.reduce((s,v)=>s+(v-avg)**2,0)/values.length);
}

export function analyzeAIDetector(text: string, paragraphs: DocumentParagraph[]): AnalysisResponse {
  const items: FlaggedItem[] = [];
  const sentenceLengths = splitIntoSentences(text).map(s => tokenize(s).length).filter(Boolean);
  const uniformity = sentenceLengths.length > 4 ? clampScore(100 - std(sentenceLengths) * 8) : 20;
  let genericHits = 0;
  let repetitive = 0;

  for (const p of paragraphs) {
    if (p.wordCount < 20) continue;
    const lower = p.text.toLowerCase();
    const hits = GENERIC.filter(g => lower.includes(g)).length;
    genericHits += hits;
    const sentences = splitIntoSentences(p.text);
    const starts = sentences.map(s => s.split(/\s+/).slice(0,2).join(" ").toLowerCase());
    repetitive += starts.length - new Set(starts).size;
    const vocab = new Set(tokenize(p.text)).size;
    const redundancy = p.wordCount ? 1 - vocab / Math.max(p.wordCount, 1) : 0;
    const score = clampScore(hits * 18 + redundancy * 55 + (sentences.length >= 3 ? 12 : 0));
    if (score >= 40) items.push({ paragraphIndex: p.index, score, reason: "Possible AI-like pattern: generic phrasing, low lexical variety, or repetitive structure.", text: p.text });
  }

  const score = clampScore(uniformity * 0.35 + Math.min(genericHits * 8, 30) + Math.min(repetitive * 10, 20) + (items[0]?.score || 0) * 0.2);
  return {
    type: "ai-detector",
    score,
    riskLevel: riskLevel(score),
    summary: `AI Writing Risk dihitung dari heuristik burstiness, variasi kalimat, repetisi frasa, dan kekhususan leksikal. Ditemukan ${items.length} paragraf yang perlu ditinjau.`,
    stats: getStats(text, paragraphs),
    flaggedItems: items.sort((a,b)=>b.score-a.score).slice(0,15),
    sources: [],
    limitations: [
      "AI detector bersifat probabilistik dan dapat salah.",
      "Skor ini bukan bukti bahwa teks dibuat AI.",
      "Gunakan hasil sebagai bahan review gaya penulisan, bukan vonis akademik."
    ],
    generatedAt: new Date().toISOString()
  };
}
