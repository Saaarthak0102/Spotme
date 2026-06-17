import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/track-visit
 *
 * Lightweight endpoint that inserts a row into `page_visits`.
 * Uses the service-role key so we don't need to grant anon/authenticated
 * INSERT access to the page_visits table — keeps the attack surface small.
 *
 * This endpoint is intentionally unauthenticated (public site visitors
 * won't be logged in), but we validate and sanitise the input.
 */

// Service-role client — safe because this runs server-side only
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      page_path,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      referrer,
      session_id,
    } = body;

    // Basic validation
    if (!page_path || typeof page_path !== "string") {
      return NextResponse.json({ error: "page_path required" }, { status: 400 });
    }
    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    // Sanitise: truncate overly long strings to prevent abuse
    const maxLen = 2000;
    const sanitize = (val: unknown): string | null => {
      if (val === null || val === undefined || val === "") return null;
      if (typeof val !== "string") return null;
      return val.slice(0, maxLen);
    };

    const supabase = getServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("page_visits").insert({
      page_path: sanitize(page_path) ?? "/",
      utm_source: sanitize(utm_source),
      utm_medium: sanitize(utm_medium),
      utm_campaign: sanitize(utm_campaign),
      utm_content: sanitize(utm_content),
      referrer: sanitize(referrer),
      session_id: sanitize(session_id) ?? "unknown",
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Fail silently — never break the client
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
