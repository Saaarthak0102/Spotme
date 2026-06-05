import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasEventSession } from "@/lib/guest-session";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";

// ── F-17 Fix: Per-request factory instead of module-level singleton ───────────
// Module-level instantiation silently swallows missing env vars at cold start.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── F-03: E.164 phone format pattern ─────────────────────────────────────────
// Accepts +[country code][number], 8–15 digits total after the leading +.
const E164_RE = /^\+[1-9]\d{7,14}$/;

// ── F-18: Max displayName length ─────────────────────────────────────────────
const MAX_NAME_LENGTH = 100;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  // F-09: CSRF check
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // F-14: Body size limit (16 KB is more than enough for name + phone)
  const sizeError = checkBodySize(req, 16 * 1024);
  if (sizeError) return sizeError;

  const { eventId } = await params;

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  // 1. Verify guest session cookie for this event
  const isAuthorized = await hasEventSession(eventId);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { phone: rawPhone, displayName: rawName } = await req.json();

    // ── F-03: Validate and normalise phone number ──────────────────────────
    if (!rawPhone) {
      return NextResponse.json({ error: "Missing phone" }, { status: 400 });
    }
    // Strip common visual separators, then enforce E.164
    const phone = String(rawPhone).trim().replace(/[\s\-().]/g, "");
    if (!E164_RE.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Please use international format, e.g. +919876543210" },
        { status: 400 }
      );
    }

    // ── F-18: Validate and sanitise displayName ────────────────────────────
    if (!rawName) {
      return NextResponse.json({ error: "Missing displayName" }, { status: 400 });
    }
    const displayName = String(rawName).trim().slice(0, MAX_NAME_LENGTH);
    if (!displayName) {
      return NextResponse.json({ error: "displayName cannot be empty" }, { status: 400 });
    }
    // Reject HTML tags to prevent stored XSS in any rendering surface
    if (/<[^>]*>/.test(displayName)) {
      return NextResponse.json(
        { error: "displayName must not contain HTML tags" },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // 2. Check if guest already exists for this event + phone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: selectError } = await (adminClient as any)
      .from("guests")
      .select("*")
      .eq("event_id", eventId)
      .eq("phone", phone)
      .maybeSingle();

    if (selectError) {
      console.error("[guest/register] DB select error:", selectError.message);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(existing);
    }

    // 3. Register a new guest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newGuest, error: insertError } = await (adminClient as any)
      .from("guests")
      .insert({ event_id: eventId, phone, display_name: displayName })
      .select()
      .single();

    if (insertError) {
      console.error("[guest/register] DB insert error:", insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newGuest);
  } catch (err) {
    console.error("[guest/register] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

