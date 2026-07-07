import type { VercelRequest } from "@vercel/node";
import type {
  AcademicField,
  AgentHistoryItem,
  AgentRequestBody,
  AgentStep,
  AIRequestBody,
  AIStyle,
  AILanguage,
  ArticleType,
  TargetLength
} from "../../src/shared/types.js";

const ALLOWED_LANGUAGES = new Set<AILanguage>(["id", "en"]);
const ALLOWED_STYLES = new Set<AIStyle>([
  "academic journal",
  "formal",
  "concise",
  "critical review"
]);

const ALLOWED_ARTICLE_TYPES = new Set<ArticleType>([
  "research article",
  "literature review",
  "conceptual paper",
  "case study"
]);

const ALLOWED_FIELDS = new Set<AcademicField>([
  "education",
  "technology",
  "health",
  "social",
  "economics",
  "law",
  "custom"
]);

const ALLOWED_TARGET_LENGTHS = new Set<TargetLength>(["short", "medium", "long"]);

const ALLOWED_AGENT_STEPS = new Set<AgentStep>([
  "start",
  "plan",
  "outline",
  "research_gap",
  "introduction",
  "literature_review",
  "methodology",
  "results_discussion",
  "conclusion",
  "abstract",
  "revision",
  "continue"
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

function validatePostJson(req: VercelRequest): void {
  if (req.method !== "POST") {
    throw new ValidationError("Method tidak diizinkan. Gunakan POST.", 405);
  }

  const contentType = req.headers["content-type"] || "";
  if (!Array.isArray(contentType) && contentType && !contentType.includes("application/json")) {
    throw new ValidationError("Content-Type harus application/json.", 415);
  }
}

export function validateAIRequest(req: VercelRequest): AIRequestBody {
  validatePostJson(req);

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

export function validateAgentRequest(req: VercelRequest): AgentRequestBody {
  validatePostJson(req);

  const body = req.body as Partial<AgentRequestBody> | undefined;
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body JSON tidak valid.");
  }

  if (typeof body.message !== "string") {
    throw new ValidationError("Field message wajib berupa string.");
  }

  const message = sanitizeText(body.message);
  if (!message) {
    throw new ValidationError("Instruksi agent tidak boleh kosong.");
  }

  const maxInputChars = getMaxInputChars();
  const documentContext = typeof body.documentContext === "string"
    ? sanitizeText(body.documentContext).slice(0, maxInputChars)
    : undefined;

  const totalChars = message.length + (documentContext?.length || 0);
  if (totalChars > maxInputChars) {
    throw new ValidationError(`Input terlalu panjang. Maksimal ${maxInputChars.toLocaleString("id-ID")} karakter.`);
  }

  const language = body.language === "en" ? "en" : "id";

  const articleType =
    typeof body.articleType === "string" && ALLOWED_ARTICLE_TYPES.has(body.articleType as ArticleType)
      ? (body.articleType as ArticleType)
      : "research article";

  const field =
    typeof body.field === "string" && ALLOWED_FIELDS.has(body.field as AcademicField)
      ? (body.field as AcademicField)
      : "custom";

  const customField =
    typeof body.customField === "string" ? sanitizeText(body.customField).slice(0, 120) : undefined;

  const style =
    typeof body.style === "string" && ALLOWED_STYLES.has(body.style as AIStyle)
      ? (body.style as AIStyle)
      : "academic journal";

  const targetLength =
    typeof body.targetLength === "string" && ALLOWED_TARGET_LENGTHS.has(body.targetLength as TargetLength)
      ? (body.targetLength as TargetLength)
      : "medium";

  const currentStep =
    typeof body.currentStep === "string" && ALLOWED_AGENT_STEPS.has(body.currentStep as AgentStep)
      ? (body.currentStep as AgentStep)
      : "start";

  const history = Array.isArray(body.history)
    ? body.history
        .slice(-12)
        .filter((item): item is AgentHistoryItem => {
          return (
            !!item &&
            typeof item === "object" &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string"
          );
        })
        .map((item) => ({
          role: item.role,
          // SECURITY: limit history per item to avoid runaway prompt size and accidental full-document logging.
          content: sanitizeText(item.content).slice(0, 4000)
        }))
    : [];

  return {
    message,
    language,
    articleType,
    field,
    customField,
    style,
    targetLength,
    currentStep,
    documentContext,
    history
  };
}