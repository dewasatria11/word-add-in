export type AILanguage = "id" | "en";

export type AIStyle = "academic journal" | "formal" | "concise" | "critical review";

export type AIAction =
  | "rewrite"
  | "paraphrase"
  | "abstract"
  | "outline"
  | "improve-argument"
  | "summarize";

export interface AIRequestBody {
  text: string;
  language: AILanguage;
  style: AIStyle;
  userInstructions?: string;
}

export interface AISuccessResponse {
  result: string;
}

export interface AIErrorResponse {
  error: string;
}

export interface AIOptions {
  language: AILanguage;
  style: AIStyle;
  userInstructions?: string;
}