import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../_lib/cors";
import { validateAIRequest, ValidationError } from "../_lib/validateRequest";
import { callAI, AIServiceError } from "../_lib/callAI";
import { sendError, sendJson, getSafeErrorMessage } from "../_lib/response";
import type { AIRequestBody, AISuccessResponse } from "../../src/shared/types";

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