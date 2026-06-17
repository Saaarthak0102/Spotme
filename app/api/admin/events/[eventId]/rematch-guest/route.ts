import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await requireAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const body = await req.json();
    const { guestId } = body;
    if (!guestId) {
      return NextResponse.json({ error: "Missing guestId" }, { status: 400 });
    }

    // Service role client to bypass RLS and update tables
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch guest selfies
    const { data: selfies, error: selfiesErr } = await supabaseAdmin
      .from("guest_selfies")
      .select("id, public_url")
      .eq("guest_id", guestId)
      .eq("event_id", eventId);

    if (selfiesErr) {
      return NextResponse.json({ error: selfiesErr.message }, { status: 500 });
    }

    if (!selfies || selfies.length === 0) {
      return NextResponse.json({ error: "No selfies found for this guest" }, { status: 404 });
    }

    // 2. Delete existing matches for this guest in this event
    const { error: deleteErr } = await supabaseAdmin
      .from("photo_matches")
      .delete()
      .eq("guest_id", guestId)
      .eq("event_id", eventId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // 3. Reset selfies status back to 'uploaded'
    const selfieIds = selfies.map((s) => s.id);
    const { error: updateErr } = await supabaseAdmin
      .from("guest_selfies")
      .update({ status: "uploaded" })
      .in("id", selfieIds);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 4. Cancel any pending/processing jobs for these selfies in processing_queue
    try {
      const { data: existingJobs } = await supabaseAdmin
        .from("processing_queue")
        .select("id, payload")
        .eq("event_id", eventId)
        .eq("job_type", "embed_selfie")
        .in("status", ["pending", "processing"]);

      const jobIdsToCancel = [];
      if (existingJobs) {
        for (const job of existingJobs) {
          const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
          if (payload && selfieIds.includes(payload.selfie_id)) {
            jobIdsToCancel.push(job.id);
          }
        }
      }

      if (jobIdsToCancel.length > 0) {
        await supabaseAdmin
          .from("processing_queue")
          .update({ status: "dead", error_msg: "Cancelled by manual guest rematch" })
          .in("id", jobIdsToCancel);
      }
    } catch (err) {
      console.warn("Queue cancellation failed:", err);
    }

    // 5. Insert new embed_selfie jobs
    const newJobs = selfies.map((selfie) => ({
      job_type: "embed_selfie",
      payload: {
        selfie_id: selfie.id,
        guest_id: guestId,
        event_id: eventId,
        public_url: selfie.public_url,
      },
      event_id: eventId,
      priority: 1, // High priority
      status: "pending",
    }));

    const { error: queueErr } = await supabaseAdmin
      .from("processing_queue")
      .insert(newJobs);

    if (queueErr) {
      return NextResponse.json({ error: queueErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Successfully re-queued ${selfies.length} selfie(s) for rematching.` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[rematch-guest API] Error:", msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
