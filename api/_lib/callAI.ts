import type { AIAction, AIRequestBody } from "../../src/shared/types.js";
import { createSystemPrompt } from "./prompts.js";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIServiceError";
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AIServiceError(`Environment variable ${name} belum diisi.`);
  }

  return value;
}

export async function callAI(action: AIAction, request: AIRequestBody): Promise<string> {
  const apiKey = getRequiredEnv("AI_API_KEY");
  const baseUrl = getRequiredEnv("AI_API_BASE_URL").replace(/\/+$/, "");
  const model = getRequiredEnv("AI_MODEL");

  const systemPrompt = createSystemPrompt(action, {
    language: request.language,
    style: request.style,
    userInstructions: request.userInstructions
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: request.text
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errorPayload = (await response.json()) as { error?: { message?: string }; message?: string };
      detail = errorPayload.error?.message || errorPayload.message || "";
    } catch {
      detail = "";
    }

    throw new AIServiceError(
      detail ? `AI API gagal (${response.status}): ${detail}` : `AI API gagal dengan status ${response.status}.`
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const result = data.choices?.[0]?.message?.content?.trim();

  if (!result) {
    throw new AIServiceError("AI API tidak mengembalikan hasil pada choices[0].message.content.");
  }

  return result;
}