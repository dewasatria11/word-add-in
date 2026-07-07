import type { VercelRequest } from "@vercel/node";
import type { AIRequestBody, AIStyle, AILanguage } from "../../src/shared/types";

const ALLOWED_LANGUAGES = new Set<AILanguage>(["id", "en"]);
const ALLOWED_STYLES = new Set<AIStyle>([
  "academic journal",
  "formal",
  "concise",
  "critical review"
]);

export class ValidationError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

function getMaxInputChars(): number {
  const configured = Number(process.env.MAX_INPUT_CHARS);
  return Number.isFinite(configured) && configured > 0 ? configured : 50000;
}

function sanitizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export function validateAIRequest(req: VercelRequest): AIRequestBody {
  if (req.method !== "POST") {
    throw new ValidationError("Method tidak diizinkan. Gunakan POST.", 405);
  }

  const contentType = req.headers["content-type"] || "";
  if (!Array.isArray(contentType) && contentType && !contentType.includes("application/json")) {
    throw new ValidationError("Content-Type harus application/json.", 415);
  }

  const body = req.body as Partial<AIRequestBody> | undefined;

  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body JSON tidak valid.");
  }

  if (typeof body.text !== "string") {
    throw new ValidationError("Field text wajib berupa string.");
  }

  const text = sanitizeText(body.text);

  if (!text) {
    throw new ValidationError("Teks tidak boleh kosong.");
  }

  const maxInputChars = getMaxInputChars();
  if (text.length > maxInputChars) {
    throw new ValidationError(`Teks terlalu panjang. Maksimal ${maxInputChars.toLocaleString("id-ID")} karakter.`);
  }

  const language = body.language === "en" ? "en" : "id";
  if (!ALLOWED_LANGUAGES.has(language)) {
    throw new ValidationError("Language tidak valid. Gunakan id atau en.");
  }

  const style = typeof body.style === "string" ? body.style : "academic journal";
  if (!ALLOWED_STYLES.has(style as AIStyle)) {
    throw new ValidationError("Style tidak valid.");
  }

  const userInstructions =
    typeof body.userInstructions === "string"
      ? sanitizeText(body.userInstructions).slice(0, 2000)
      : undefined;

  return {
    text,
    language,
    style: style as AIStyle,
    userInstructions
  };
}