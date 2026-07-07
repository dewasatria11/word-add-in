export type AILanguage = "id" | "en";
export type ParaphraseStyle = "academic" | "formal" | "concise" | "natural";

export interface ParaphraseRequestBody {
  text: string;
  language: AILanguage;
  style: ParaphraseStyle;
  userInstructions?: string;
}

export interface AISuccessResponse { result: string; }
export interface AIErrorResponse { error: string; }

export interface DocumentParagraph {
  index: number;
  text: string;
  wordCount: number;
}

export interface DocumentAnalysisRequest {
  text: string;
  paragraphs: DocumentParagraph[];
  language?: AILanguage;
}

export type AnalysisType = "similarity" | "ai-detector";
export type RiskLevel = "low" | "medium" | "high";

export interface SourceCandidate {
  title: string;
  url: string;
  provider: string;
  snippet?: string;
  doi?: string;
  similarity?: number;
  confidence?: "low" | "medium" | "high";
}

export interface FlaggedItem {
  paragraphIndex: number;
  score: number;
  reason: string;
  text: string;
  matchedParagraphIndex?: number;
  sources?: SourceCandidate[];
}

export interface AnalysisStats {
  wordCount: number;
  paragraphCount: number;
  estimatedPages: number;
}

export interface AnalysisResponse {
  type: AnalysisType;
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  stats: AnalysisStats;
  flaggedItems: FlaggedItem[];
  sources: SourceCandidate[];
  limitations: string[];
  generatedAt: string;
}
