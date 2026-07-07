import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../_lib/cors.js";
import { validateAIRequest, ValidationError } from "../_lib/validateRequest.js";
import { callAI, AIServiceError } from "../_lib/callAI.js";
import { sendError, sendJson, getSafeErrorMessage } from "../_lib/response.js";
import type { AIRequestBody, AISuccessResponse } from "../../src/shared/types.js";

export default async function (req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) {
    return;
  }

  let requestBody: AIRequestBody;
  try {
    requestBody = validateAIRequest(req);
  } catch (error: unknown) {
    const message = getSafeErrorMessage(error);
    const statusCode = error instanceof ValidationError ? error.statusCode : 400;
    return sendError(res, statusCode, message);
  }

  try {
    const result = await callAI("summarize", requestBody);
    sendJson<AISuccessResponse>(res, 200, { result });
  } catch (error: unknown) {
    const message = getSafeErrorMessage(error);
    const statusCode = error instanceof AIServiceError ? 502 : 500;
    sendError(res, statusCode, message);
  }
}