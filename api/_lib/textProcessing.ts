import type { DocumentParagraph, RiskLevel } from "../../src/shared/types.js";

const STOPWORDS = new Set([
  "yang","dan","di","ke","dari","dalam","untuk","pada","dengan","sebagai","adalah","ini","itu",
  "the","and","of","to","in","for","on","with","as","is","are","this","that","an","a"
]);

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function sanitizeInput(text: string): string {
  return normalizeText(text).replace(/\u0000/g, "");
}

export function splitIntoSentences(text: string): string[] {
  return normalizeText(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

export function tokenize(text: string): string[] {
  return normalizeText(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/)
    .map((t) => t.trim()).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function countWords(text: string): number {
  return normalizeText(text).split(/\s+/).filter(Boolean).length;
}

export function toParagraphs(text: string): DocumentParagraph[] {
  return text.split(/\n{1,}/).map(normalizeText).filter(Boolean)
    .map((text, index) => ({ index, text, wordCount: countWords(text) }));
}

export function getStats(text: string, paragraphs: DocumentParagraph[]) {
  const wordCount = countWords(text);
  return { wordCount, paragraphCount: paragraphs.length, estimatedPages: Math.max(1, Math.ceil(wordCount / 350)) };
}

export function makeNgrams(tokens: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - size; i += 1) out.push(tokens.slice(i, i + size).join(" "));
  return out;
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function pickRepresentativeQuery(text: string): string {
  const sentence = splitIntoSentences(text).sort((a,b)=>b.length-a.length).find((s) => countWords(s) >= 8) || normalizeText(text);
  return sentence.split(/\s+/).slice(0, 18).join(" ");
}
