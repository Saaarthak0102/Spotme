import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signEventToken, verifyEventToken, SESSION_DURATION } from "@/lib/guest-session";
import { createClient } from "@supabase/supabase-js";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";

// ── F-17 Fix: Per-request factory — avoids silent env-var failures at module load
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  // F-09: CSRF check
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // F-14: Body size limit
  const sizeError = checkBodySize(req, 4 * 1024);
  if (sizeError) return sizeError;

  try {
    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // Validate that the event actually exists and is active
    const adminSupabase = getAdminClient();
    const { data: event, error } = await (adminSupabase as any)
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("status", "active")
      .eq("qr_active", true)
      .maybeSingle();

    if (error || !event) {
      return NextResponse.json({ error: "Invalid or inactive event" }, { status: 404 });
    }

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get("spotme_guest_session")?.value;

    let payload = { access: {} as Record<string, number> };

    if (existingCookie) {
      const verified = verifyEventToken(existingCookie);
      if (verified) {
        payload = verified;
      }
    }

    // Grant/refresh access for this specific eventId
    payload.access[eventId] = Date.now() + SESSION_DURATION;

    const token = signEventToken(payload);

    cookieStore.set("spotme_guest_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
