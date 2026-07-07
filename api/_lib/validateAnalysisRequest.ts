import type { VercelRequest } from "@vercel/node";
import type { DocumentAnalysisRequest, DocumentParagraph, ParaphraseRequestBody } from "../../src/shared/types.js";
import { countWords, sanitizeInput, toParagraphs } from "./textProcessing.js";

export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

function maxChars(): number {
  const n = Number.parseInt(process.env.MAX_INPUT_CHARS || "50000", 10);
  return Number.isFinite(n) && n > 0 ? n : 50000;
}

export function ensurePostJson(req: VercelRequest): void {
  if (req.method !== "POST") throw new ValidationError("Method tidak diizinkan. Gunakan POST.", 405);
  const ct = req.headers["content-type"];
  if (ct && !String(ct).toLowerCase().includes("application/json")) throw new ValidationError("Content-Type harus application/json.", 415);
}

function normalizeParagraphs(raw: unknown, text: string): DocumentParagraph[] {
  if (!Array.isArray(raw)) return toParagraphs(text);
  const items = raw.map((item, fallbackIndex): DocumentParagraph | null => {
    if (!item || typeof item !== "object") return null;
    const value = item as Partial<DocumentParagraph>;
    if (typeof value.text !== "string") return null;
    const clean = sanitizeInput(value.text);
    if (!clean) return null;
    return { index: typeof value.index === "number" ? value.index : fallbackIndex, text: clean, wordCount: typeof value.wordCount === "number" ? value.wordCount : countWords(clean) };
  }).filter((x): x is DocumentParagraph => x !== null);
  return items.length ? items : toParagraphs(text);
}

export function validateAnalysisRequest(req: VercelRequest): DocumentAnalysisRequest {
  ensurePostJson(req);
  const body = req.body as Partial<DocumentAnalysisRequest> | undefined;
  if (!body || typeof body.text !== "string") throw new ValidationError("Field text wajib berupa string.");
  const text = sanitizeInput(body.text);
  if (!text) throw new ValidationError("Dokumen kosong. Tambahkan teks di Word terlebih dahulu.");
  if (text.length > maxChars()) throw new ValidationError(`Dokumen terlalu panjang. Maksimal ${maxChars().toLocaleString("id-ID")} karakter per analisis.`);
  return { text, paragraphs: normalizeParagraphs(body.paragraphs, text), language: body.language === "en" ? "en" : "id" };
}

export function validateParaphraseRequest(req: VercelRequest): ParaphraseRequestBody {
  ensurePostJson(req);
  const body = req.body as Partial<Record<keyof ParaphraseRequestBody, unknown>> | undefined;
  if (!body || typeof body.text !== "string") throw new ValidationError("Silakan pilih teks di dokumen Word terlebih dahulu.");
  const text = sanitizeInput(body.text);
  if (!text) throw new ValidationError("Silakan pilih teks di dokumen Word terlebih dahulu.");
  if (text.length > Math.min(maxChars(), 12000)) throw new ValidationError("Teks parafrase terlalu panjang. Pilih bagian yang lebih pendek.");
  const styles = new Set(["academic","formal","concise","natural"]);
  return {
    text,
    language: body.language === "en" ? "en" : "id",
    style: typeof body.style === "string" && styles.has(body.style) ? body.style as ParaphraseRequestBody["style"] : "academic",
    userInstructions: typeof body.userInstructions === "string" ? sanitizeInput(body.userInstructions).slice(0, 1000) : ""
  };
}
