import type { VercelRequest, VercelResponse } from "@vercel/node";

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
const allowedOriginEnv = process.env.ALLOWED_ORIGIN?.trim();
const requestOrigin = req.headers.origin;

// allowedOriginEnv can be a comma‑separated list of origins.
// Example: "https://localhost:3000,https://myapp.vercel.app"
let allowedOrigins: string[] = [];
if (allowedOriginEnv) {
  allowedOrigins = allowedOriginEnv.split(",").map(o => o.trim()).filter(Boolean);
}

// Determine if the request origin is allowed.
let originToAllow = "*";
if (requestOrigin) {
  if (allowedOrigins.length === 0) {
    // No whitelist defined – allow any origin (use requestOrigin for echo)
    originToAllow = requestOrigin;
  } else if (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes("*")) {
    originToAllow = requestOrigin;
  } else {
    // Origin not in whitelist → block
    res.status(403).json({ error: "Origin tidak diizinkan." });
    return true;
  }
}

res.setHeader("Access-Control-Allow-Origin", originToAllow);
res.setHeader("Vary", "Origin");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
res.setHeader("Access-Control-Max-Age", "86400");

if (req.method === "OPTIONS") {
  res.status(204).end();
  return true;
}

  return false;
}