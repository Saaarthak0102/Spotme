import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(
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

    // Service role client to bypass RLS and get all diagnostics
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch Event and Owner Info
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .select(`
        *,
        owner:profiles!events_owner_id_fkey (
          full_name,
          email
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: eventErr?.message || "Event not found" }, { status: 404 });
    }

    // 2. Fetch all photos for this event
    const { data: photos, error: photosErr } = await supabaseAdmin
      .from("event_photos")
      .select("id, original_filename, public_url, face_indexed, face_indexed_at, processing_time, uploaded_at")
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false });

    if (photosErr) {
      return NextResponse.json({ error: photosErr.message }, { status: 500 });
    }

    // 3. Fetch all guests for this event
    const { data: guests, error: guestsErr } = await supabaseAdmin
      .from("guests")
      .select("id, display_name, email, phone, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (guestsErr) {
      return NextResponse.json({ error: guestsErr.message }, { status: 500 });
    }

    // 4. Fetch all guest selfies for this event
    const { data: selfies, error: selfiesErr } = await supabaseAdmin
      .from("guest_selfies")
      .select("id, guest_id, status, public_url, created_at")
      .eq("event_id", eventId);

    if (selfiesErr) {
      return NextResponse.json({ error: selfiesErr.message }, { status: 500 });
    }

    // 5. Fetch all face embeddings for this event (to count embeddings per photo)
    const { data: embeddings, error: embeddingsErr } = await supabaseAdmin
      .from("face_embeddings")
      .select("id, photo_id")
      .eq("event_id", eventId);

    if (embeddingsErr) {
      return NextResponse.json({ error: embeddingsErr.message }, { status: 500 });
    }

    // 6. Fetch all photo matches (to count matches per guest)
    const { data: matches, error: matchesErr } = await supabaseAdmin
      .from("photo_matches")
      .select("id, guest_id")
      .eq("event_id", eventId);

    if (matchesErr) {
      return NextResponse.json({ error: matchesErr.message }, { status: 500 });
    }

    // 7. Fetch processing queue jobs for this event
    let queueJobs: any[] = [];
    try {
      const { data: rawQueue } = await supabaseAdmin
        .from("processing_queue")
        .select("id, job_type, status, error_msg, attempts, claimed_at, created_at, completed_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      queueJobs = rawQueue || [];
    } catch {
      // Non-fatal if table doesn't exist
    }

    // Aggregate embeddings by photo
    const embeddingsByPhoto: Record<string, number> = {};
    embeddings?.forEach((emb) => {
      if (emb.photo_id) {
        embeddingsByPhoto[emb.photo_id] = (embeddingsByPhoto[emb.photo_id] || 0) + 1;
      }
    });

    // Aggregate matches by guest
    const matchesByGuest: Record<string, number> = {};
    matches?.forEach((match) => {
      if (match.guest_id) {
        matchesByGuest[match.guest_id] = (matchesByGuest[match.guest_id] || 0) + 1;
      }
    });

    // Aggregate selfies by guest
    const selfieByGuest: Record<string, typeof selfies[number]> = {};
    selfies?.forEach((selfie) => {
      if (selfie.guest_id) {
        selfieByGuest[selfie.guest_id] = selfie;
      }
    });

    // Compute Photos Summary
    const totalPhotos = photos.length;
    const indexedPhotos = photos.filter((p) => p.face_indexed).length;
    const pendingPhotos = totalPhotos - indexedPhotos;
    const totalFacesDetected = embeddings?.length || 0;
    const totalProcessingTime = photos.reduce((acc, p) => acc + (p.processing_time || 0), 0);
    const avgProcessingTime = indexedPhotos > 0 ? totalProcessingTime / indexedPhotos : 0;

    // Compute Guests Summary
    const totalGuests = guests.length;
    const guestsWithSelfies = selfies.length;
    const guestsIdentified = Object.keys(matchesByGuest).length;

    // Compute Queue Summary
    const queueSummary = {
      pending: queueJobs.filter((j) => j.status === "pending").length,
      processing: queueJobs.filter((j) => j.status === "processing").length,
      completed: queueJobs.filter((j) => j.status === "completed").length,
      failed: queueJobs.filter((j) => j.status === "failed").length,
      dead: queueJobs.filter((j) => j.status === "dead").length,
    };

    // Format individual lists
    const photoDetails = photos.map((p) => ({
      id: p.id,
      original_filename: p.original_filename,
      public_url: p.public_url,
      face_indexed: p.face_indexed,
      face_indexed_at: p.face_indexed_at,
      processing_time: p.processing_time,
      uploaded_at: p.uploaded_at,
      faces_count: embeddingsByPhoto[p.id] || 0,
    }));

    const guestDetails = guests.map((g) => {
      const selfie = selfieByGuest[g.id];
      return {
        id: g.id,
        display_name: g.display_name,
        email: g.email,
        phone: g.phone,
        created_at: g.created_at,
        selfie_status: selfie?.status || "none",
        selfie_url: selfie?.public_url || null,
        matches_count: matchesByGuest[g.id] || 0,
      };
    });

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        venue: event.venue,
        event_date: event.event_date,
        event_type: event.event_type,
        status: event.status,
        owner: event.owner,
      },
      stats: {
        photos: {
          total: totalPhotos,
          indexed: indexedPhotos,
          pending: pendingPhotos,
          totalFacesDetected,
          totalProcessingTime,
          avgProcessingTime,
        },
        guests: {
          total: totalGuests,
          withSelfies: guestsWithSelfies,
          identified: guestsIdentified,
        },
        queue: queueSummary,
      },
      queueJobs: queueJobs.slice(0, 50), // Send last 50 jobs
      photos: photoDetails.slice(0, 100), // Send last 100 photos
      guests: guestDetails.slice(0, 100), // Send last 100 guests
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[event-diagnostics API] Error:", msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
