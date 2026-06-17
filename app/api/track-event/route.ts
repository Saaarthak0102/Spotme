import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/track-event
 *
 * Lightweight endpoint that inserts a row into `user_events`.
 * Uses the service-role key so we don't need to grant anon/authenticated
 * INSERT access to the user_events table — keeps the attack surface small.
 *
 * Mirrors the pattern established by /api/track-visit.
 * Intentionally unauthenticated (public site visitors won't be logged in).
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
      event_type,
      event_label,
      session_id,
      user_id,
      page_path,
      metadata,
    } = body;

    // Basic validation
    if (!event_type || typeof event_type !== "string") {
      return NextResponse.json({ error: "event_type required" }, { status: 400 });
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
    await (supabase as any).from("user_events").insert({
      event_type: sanitize(event_type) ?? "unknown",
      event_label: sanitize(event_label),
      session_id: sanitize(session_id) ?? "unknown",
      user_id: sanitize(user_id),
      page_path: sanitize(page_path),
      metadata: metadata && typeof metadata === "object" ? metadata : null,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Fail silently — never break the client
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
