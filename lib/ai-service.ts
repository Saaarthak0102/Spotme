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
  // Prefer server-only env var, fallback to local default
  const raw = process.env.AI_SERVICE_URL ?? process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://127.0.0.1:8000";
  const cleaned = raw.replace(/\/+$/, "").replace("://0.0.0.0", "://127.0.0.1");

  if (!PRIVATE_IP_RE.test(cleaned)) {
    console.error(
      `[ai-service] AI_SERVICE_URL "${cleaned}" does not match private IP allowlist. Connection refused.`
    );
    return null;
  }
  return cleaned;
}

export function aiServiceHeaders(): HeadersInit {
  const token = process.env.AI_INTERNAL_SECRET;
  return token ? { "X-Internal-Token": token } : {};
}
