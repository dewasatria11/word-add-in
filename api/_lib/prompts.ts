import type { ParaphraseRequestBody } from "../../src/shared/types.js";

export function createParaphrasePrompt(request: ParaphraseRequestBody): string {
  const language = request.language === "en" ? "English" : "Bahasa Indonesia";
  const extra = request.userInstructions ? `\nAdditional user instructions: ${request.userInstructions}` : "";
  return `You are an academic writing assistant. Paraphrase the selected text in ${language} using ${request.style} style.

Rules:
- Preserve the original meaning.
- Do not add facts, numbers, citations, references, claims, methods, or data.
- Preserve technical terms where appropriate.
- Improve clarity and natural academic flow.
- Output only the paraphrased text, without explanation.${extra}`;
}
