import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

// ── F-12: Private/internal IP allowlist for the AI service URL ───────────────
// Prevents SSRF if AI_SERVICE_URL is misconfigured to an external host.
// Only loopback and RFC-1918 private addresses are permitted.
const PRIVATE_IP_RE = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?/;

function resolveAiServiceUrl(): string | null {
  // Only use the server-only env var — never the NEXT_PUBLIC_ one
  const raw = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
  const cleaned = raw.replace(/\/+$/, "").replace("://0.0.0.0", "://127.0.0.1");

  if (!PRIVATE_IP_RE.test(cleaned)) {
    console.error(
      `[ai-health] AI_SERVICE_URL "${cleaned}" does not match private IP allowlist. Refusing to proxy.`
    );
    return null;
  }
  return cleaned;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aiServiceUrl = resolveAiServiceUrl();
  if (!aiServiceUrl) {
    return NextResponse.json(
      { status: "misconfigured", error: "AI_SERVICE_URL is not a valid private address." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${aiServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!res.ok) {
      throw new Error(`AI service responded with ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ai-health route] Failed to fetch live AI health:", err);
    return NextResponse.json({
      status: "offline",
      error: "AI service is offline or unreachable."
    }, { status: 503 });
  }
}

