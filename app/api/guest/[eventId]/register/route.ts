import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasEventSession } from "@/lib/guest-session";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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
    const { phone, displayName } = await req.json();
    if (!phone || !displayName) {
      return NextResponse.json({ error: "Missing phone or displayName" }, { status: 400 });
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
