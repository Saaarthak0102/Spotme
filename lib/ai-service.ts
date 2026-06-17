// ============================================================
// ai-service.ts — AI Service connection and URL resolution
// Server-only helper to prevent SSRF vulnerabilities
// ============================================================

// Only loopback and RFC-1918 private addresses are permitted.
const PRIVATE_IP_RE = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?/;

/**
 * Resolves the server-side AI_SERVICE_URL environment variable and verifies
 * that it points to a private/loopback address to prevent SSRF attacks.
 */
export function resolveAiServiceUrl(): string | null {
  const urls = resolveAiServiceUrls();
  return urls.length > 0 ? urls[0] : null;
}

/**
 * Resolves all server-side AI service URLs (supports comma-separated list).
 * Verifies that each URL points to a private address, unless running in production
 * or ALLOW_PUBLIC_AI_URL is set to true.
 */
export function resolveAiServiceUrls(): string[] {
  const raw = process.env.AI_SERVICE_URL ?? process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://127.0.0.1:8000";
  const urls = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const isProd = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
  const allowPublic = process.env.ALLOW_PUBLIC_AI_URL === "true";

  return urls
    .map((url) => {
      const cleaned = url.replace(/\/+$/, "").replace("://0.0.0.0", "://127.0.0.1");
      const isPrivate = PRIVATE_IP_RE.test(cleaned);

      if (!isPrivate && !isProd && !allowPublic) {
        console.error(
          `[ai-service] AI_SERVICE_URL "${cleaned}" does not match private IP allowlist. Connection refused in development mode.`
        );
        return null;
      }
      return cleaned;
    })
    .filter((u): u is string => u !== null);
}

export function aiServiceHeaders(): HeadersInit {
  const token = process.env.AI_INTERNAL_SECRET;
  return token ? { "X-Internal-Token": token } : {};
}

