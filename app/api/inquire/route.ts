import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { InquiryInsert } from "@/types/database";

/**
 * POST /api/inquire
 *
 * Public contact/inquiry form endpoint. Inserts into the `inquiries` table.
 *
 * S-09 fix: uses the anon Supabase client (not service-role) to follow
 * the principle of least privilege. The inquiries table grants INSERT
 * to anon via a simple RLS policy.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, date, location, eventType, guestCount, story } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and Email are required." }, { status: 400 });
    }

    // Use anon key — least privilege for a public insert endpoint
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const payload: InquiryInsert = {
      name,
      email,
      phone: phone || null,
      event_date: date || null,
      location: location || null,
      event_type: eventType || null,
      guest_count: guestCount || null,
      story: story || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (anonClient as any)
      .from("inquiries")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[api/inquire] Database error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log inquiry to server console (email sending placeholder)
    console.log("\n=======================================================");
    console.log(`✉️ [SMTP SIMULATOR] NEW EVENT INQUIRY RECEIVED`);
    console.log(`   To: spotmeus@gmail.com`);
    console.log(`   From: ${name} <${email}>`);
    console.log(`   Phone: ${phone || "N/A"}`);
    console.log(`   Date: ${date || "N/A"}`);
    console.log(`   Location: ${location || "N/A"}`);
    console.log(`   Type: ${eventType}`);
    console.log(`   Guest Count: ${guestCount}`);
    console.log(`   Story: ${story || "N/A"}`);
    console.log("=======================================================\n");

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/inquire] Server error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
