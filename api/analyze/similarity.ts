import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../_lib/cors.js";
import { sendError, sendJson } from "../_lib/response.js";
import { analyzeSimilarity } from "../_lib/similarity.js";
import { validateAnalysisRequest, ValidationError } from "../_lib/validateAnalysisRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) return;
  try {
    const request = validateAnalysisRequest(req);
    sendJson(res, 200, await analyzeSimilarity(request.text, request.paragraphs));
  } catch (error) {
    if (error instanceof ValidationError) return sendError(res, error.statusCode, error.message);
    return sendError(res, 500, "Gagal menjalankan similarity check secara aman.");
  }
}
