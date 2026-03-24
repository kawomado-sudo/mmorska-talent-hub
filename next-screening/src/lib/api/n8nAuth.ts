import { getServerEnv } from "@/lib/env";

/** Returns true if the request is allowed (secret not configured = allow). */
export function assertN8nWebhook(req: Request): boolean {
  const secret = getServerEnv().n8nWebhookSecret;
  if (!secret) return true;
  const header =
    req.headers.get("x-n8n-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return header === secret;
}
