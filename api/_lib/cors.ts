import type { VercelRequest, VercelResponse } from "@vercel/node";

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const allowedOrigin = process.env.ALLOWED_ORIGIN?.trim();
  const requestOrigin = req.headers.origin;

  const origin = allowedOrigin || requestOrigin || "*";

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) {
    res.status(403).json({ error: "Origin tidak diizinkan." });
    return true;
  }

  return false;
}