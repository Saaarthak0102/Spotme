import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { signEventToken, verifyEventToken, SESSION_DURATION } from "@/lib/guest-session";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";
import { verifyOtpCode } from "@/lib/twofactor";

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

  try {
    const adminClient = getAdminClient();

    // 1. Validate that the event actually exists and is active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: event, error: eventError } = await (adminClient as any)
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("status", "active")
      .eq("qr_active", true)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json({ error: "Invalid or inactive event" }, { status: 404 });
    }
    const { phone: rawPhone, displayName: rawName, code, sessionId } = await req.json();

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

    // ── OTP Verification ───────────────────────────────────────────────────
    if (!code || !sessionId) {
      return NextResponse.json({ error: "Verification code and session ID are required" }, { status: 400 });
    }
    const verifyResult = await verifyOtpCode(sessionId, code);
    if (!verifyResult.success) {
      return NextResponse.json({ error: verifyResult.error || "Invalid verification code" }, { status: 400 });
    }

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

    let guestRecord = existing;

    if (!guestRecord) {
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
      guestRecord = newGuest;
    }

    // 4. Assign the session cookie to the guest for this event
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get("spotme_guest_session")?.value;

    let payload = {
      access: {} as Record<string, number>,
      guests: {} as Record<string, string>,
    };

    if (existingCookie) {
      const verified = verifyEventToken(existingCookie);
      if (verified) {
        payload = {
          access: verified.access,
          guests: verified.guests ?? {},
        };
      }
    }

    // Grant/refresh access for this specific eventId
    payload.access[eventId] = Date.now() + SESSION_DURATION;
    payload.guests[eventId] = guestRecord.id;

    const token = signEventToken(payload);

    cookieStore.set("spotme_guest_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 24 * 60 * 60, // 2 days in seconds
      path: "/",
    });

    return NextResponse.json(guestRecord);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[guest/register] Error:", msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
