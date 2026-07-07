import type { VercelResponse } from "@vercel/node";

export function sendJson<T>(res: VercelResponse, statusCode: number, payload: T): void {
  res.status(statusCode).json(payload);
}

export function sendError(res: VercelResponse, statusCode: number, message: string): void {
  sendJson(res, statusCode, { error: message });
}

export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Terjadi kesalahan tidak terduga.";
}