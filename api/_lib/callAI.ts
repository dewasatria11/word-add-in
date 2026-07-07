import type { ParaphraseRequestBody } from "../../src/shared/types.js";
import { createParaphrasePrompt } from "./prompts.js";

interface ChatCompletionResponse { choices?: Array<{ message?: { content?: string } }>; }

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIServiceError";
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new AIServiceError(`Environment variable ${name} belum diisi.`);
  return value;
}

async function callChatCompletion(systemPrompt: string, userText: string, temperature = 0.3): Promise<string> {
  const apiKey = requiredEnv("AI_API_KEY");
  const baseUrl = requiredEnv("AI_API_BASE_URL").replace(/\/+$/, "");
  const model = requiredEnv("AI_MODEL");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
      temperature,
      stream: false
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    let detail = "";
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
      detail = parsed.error?.message || parsed.message || "";
    } catch {
      detail = raw.slice(0, 200);
    }
    throw new AIServiceError(detail ? `AI API gagal (${response.status}): ${detail}` : `AI API gagal dengan status ${response.status}.`);
  }

  let data: ChatCompletionResponse;
  try {
    data = JSON.parse(raw) as ChatCompletionResponse;
  } catch {
    throw new AIServiceError("AI API tidak mengembalikan JSON valid.");
  }

  const result = data.choices?.[0]?.message?.content?.trim();
  if (!result) throw new AIServiceError("AI API tidak mengembalikan hasil pada choices[0].message.content.");
  return result;
}

export async function callParaphraseAI(request: ParaphraseRequestBody): Promise<string> {
  return callChatCompletion(createParaphrasePrompt(request), request.text, 0.28);
}
