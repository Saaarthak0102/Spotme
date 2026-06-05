// ============================================================
// lib/api-guard.ts — Shared API security helpers
//
// F-09: CSRF origin validation
// F-14: Request body size limit
// ============================================================

import { NextRequest, NextResponse } from "next/server";

/**
 * F-09: CSRF Protection — Double Submit Origin Check
 *
 * Validates that the `Origin` header matches the request host.
 * Rejects cross-origin state-changing requests. JSON endpoints are
 * safer than form endpoints (browsers can't set Content-Type:
 * application/json cross-origin without preflight), but fetch()
 * with credentials: 'include' from a malicious site can still
 * trigger mutations if the user is authenticated.
 *
 * Usage: call at the top of any mutating (POST/PATCH/DELETE) route.
 * Returns a NextResponse error if the check fails, or null if safe.
 */
export function checkCsrf(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  // If no Origin header, the request is same-origin (e.g. server-to-server
  // or direct curl) — allow through. Browser-initiated cross-site requests
  // always include Origin.
  if (!origin) return null;

  const host = req.headers.get("host");
  if (!host) {
    return NextResponse.json({ error: "Bad request: missing Host header" }, { status: 400 });
  }

  // Compare the origin's hostname to the request host (ignoring port on local)
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      console.warn(
        `[api-guard] CSRF check failed: origin="${origin}" host="${host}"`
      );
      return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid Origin header" }, { status: 400 });
  }

  return null;
}

/**
 * F-14: Request Body Size Limit
 *
 * Rejects requests whose Content-Length exceeds maxBytes.
 * Prevents memory exhaustion from huge JSON payloads.
 * Default limit: 64 KB (generous for JSON; selfie uploads use signed URLs,
 * so the body never carries file data).
 *
 * Usage: call before req.json() in any POST handler.
 * Returns a NextResponse error if too large, or null if safe.
 */
export function checkBodySize(
  req: NextRequest,
  maxBytes = 64 * 1024
): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json(
      { error: `Request body too large (max ${maxBytes} bytes)` },
      { status: 413 }
    );
  }
  return null;
}
