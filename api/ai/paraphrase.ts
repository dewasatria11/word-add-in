import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../_lib/cors.js";
import { callParaphraseAI, AIServiceError } from "../_lib/callAI.js";
import { sendError, sendJson } from "../_lib/response.js";
import { validateParaphraseRequest, ValidationError } from "../_lib/validateAnalysisRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;
  try {
    const request = validateParaphraseRequest(req);
    const result = await callParaphraseAI(request);
    sendJson(res, 200, { result });
  } catch (error) {
    if (error instanceof ValidationError) return sendError(res, error.statusCode, error.message);
    if (error instanceof AIServiceError) return sendError(res, 502, error.message);
    return sendError(res, 500, "Gagal memproses parafrase secara aman.");
  }
}
