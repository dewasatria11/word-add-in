import type { AgentRequestBody, AgentResponse, AIAction, AIRequestBody, DocumentBlock, SuggestedAction } from "../../src/shared/types.js";
import { createJournalAgentPrompt, createSystemPrompt } from "./prompts.js";

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

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  return trimmed;
}

function normalizeAgentResponse(raw: string): AgentResponse {
  let parsed: Partial<AgentResponse>;

  try {
    parsed = JSON.parse(extractJsonObject(raw)) as Partial<AgentResponse>;
  } catch {
    throw new AIServiceError("AI agent tidak mengembalikan JSON valid. Coba ulangi dengan instruksi yang lebih singkat.");
  }

  const result = typeof parsed.result === "string" && parsed.result.trim()
    ? parsed.result.trim()
    : "Agent selesai memproses, tetapi preview kosong.";

  const blocks: DocumentBlock[] = Array.isArray(parsed.blocks)
    ? parsed.blocks
        .filter((block): block is DocumentBlock => {
          return !!block && typeof block === "object" && typeof block.text === "string" && typeof block.type === "string";
        })
        .map((block) => ({
          type: block.type,
          text: block.text.trim(),
          format: block.format
        }))
        .filter((block) => block.text.length > 0)
    : [];

  const suggestedActions: SuggestedAction[] = Array.isArray(parsed.suggestedActions)
    ? parsed.suggestedActions
        .filter((action): action is SuggestedAction => {
          return (
            !!action &&
            typeof action === "object" &&
            typeof action.label === "string" &&
            typeof action.action === "string" &&
            typeof action.instruction === "string"
          );
        })
        .slice(0, 6)
    : [];

  return {
    result,
    blocks,
    suggestedActions,
    nextStep: parsed.nextStep || "continue",
    safetyNotes: Array.isArray(parsed.safetyNotes)
      ? parsed.safetyNotes.filter((note): note is string => typeof note === "string").slice(0, 5)
      : []
  };
}

async function callChatCompletion(systemPrompt: string, messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, temperature = 0.3): Promise<string> {
  const apiKey = getRequiredEnv("AI_API_KEY");
  const baseUrl = getRequiredEnv("AI_API_BASE_URL").replace(/\/+$/, "");
  const model = getRequiredEnv("AI_MODEL");

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
        ...messages
      ],
      temperature,
      stream: false
    })
  });

  const responseText = await response.text();

  if (!response.ok) {
    let detail = "";
    try {
      const errorPayload = JSON.parse(responseText) as { error?: { message?: string }; message?: string };
      detail = errorPayload.error?.message || errorPayload.message || "";
    } catch {
      detail = responseText.slice(0, 200);
    }

    throw new AIServiceError(
      detail ? `AI API gagal (${response.status}): ${detail}` : `AI API gagal dengan status ${response.status}.`
    );
  }

  let data: ChatCompletionResponse;
  try {
    data = JSON.parse(responseText) as ChatCompletionResponse;
  } catch (err: any) {
    throw new AIServiceError(`Gagal parse JSON dari AI API: ${err?.message || ""}. Raw response: ${responseText.slice(0, 500)}`);
  }

  const result = data.choices?.[0]?.message?.content?.trim();

  if (!result) {
    throw new AIServiceError("AI API tidak mengembalikan hasil pada choices[0].message.content.");
  }

  return result;
}

export async function callAI(action: AIAction, request: AIRequestBody): Promise<string> {
  const systemPrompt = createSystemPrompt(action, {
    language: request.language,
    style: request.style,
    userInstructions: request.userInstructions
  });

  return callChatCompletion(systemPrompt, [
    {
      role: "user",
      content: request.text
    }
  ]);
}

export async function callJournalAgent(request: AgentRequestBody): Promise<AgentResponse> {
  const systemPrompt = createJournalAgentPrompt(request);

  const historyMessages = (request.history || []).map((item) => ({
    role: item.role,
    content: item.content
  }));

  const documentContext = request.documentContext
    ? `\n\nKonteks dokumen/seleksi Word saat ini:\n${request.documentContext}`
    : "";

  const raw = await callChatCompletion(
    systemPrompt,
    [
      ...historyMessages,
      {
        role: "user",
        content: `${request.message}${documentContext}`
      }
    ],
    0.35
  );

  return normalizeAgentResponse(raw);
}
