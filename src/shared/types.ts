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

export type ArticleType = "research article" | "literature review" | "conceptual paper" | "case study";
export type AcademicField = "education" | "technology" | "health" | "social" | "economics" | "law" | "custom";
export type TargetLength = "short" | "medium" | "long";
export type AgentStep =
  | "start"
  | "plan"
  | "outline"
  | "research_gap"
  | "introduction"
  | "literature_review"
  | "methodology"
  | "results_discussion"
  | "conclusion"
  | "abstract"
  | "revision"
  | "continue";

export interface AgentHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface SuggestedAction {
  label: string;
  action: AgentStep | string;
  instruction: string;
}

export type DocumentBlockType =
  | "title"
  | "author"
  | "abstract"
  | "keywords"
  | "heading1"
  | "heading2"
  | "paragraph"
  | "numbered"
  | "bullet"
  | "quote"
  | "note";

export interface DocumentBlockFormat {
  fontName?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: "left" | "center" | "right" | "justify";
  lineSpacing?: number;
  spaceAfter?: number;
  spaceBefore?: number;
}

export interface DocumentBlock {
  type: DocumentBlockType;
  text: string;
  format?: DocumentBlockFormat;
}

export interface AgentRequestBody {
  message: string;
  language: AILanguage;
  articleType: ArticleType;
  field: AcademicField;
  customField?: string;
  style: AIStyle;
  targetLength: TargetLength;
  currentStep: AgentStep;
  documentContext?: string;
  history?: AgentHistoryItem[];
}

export interface AgentResponse {
  result: string;
  blocks: DocumentBlock[];
  suggestedActions: SuggestedAction[];
  nextStep: AgentStep;
  safetyNotes?: string[];
}