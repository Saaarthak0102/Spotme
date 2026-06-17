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

    // 1. Fetch Event and Owner Info (exclude email column as it does not exist in profiles table)
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .select(`
        *,
        owner:profiles!events_owner_id_fkey (
          full_name
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: eventErr?.message || "Event not found" }, { status: 404 });
    }

    // Resolve owner's email from Auth service using admin client
    let ownerEmail = null;
    try {
      if (event.owner_id) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(event.owner_id);
        ownerEmail = authUser?.user?.email || null;
      }
    } catch (authErr) {
      console.warn("Failed to retrieve owner email from Auth service:", authErr);
    }

    // 2. Fetch all photos for this event (including face embeddings count directly)
    const { data: photos, error: photosErr } = await supabaseAdmin
      .from("event_photos")
      .select(`
        id, original_filename, public_url, face_indexed, face_indexed_at, processing_time, uploaded_at,
        face_embeddings (count)
      `)
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false });

    if (photosErr) {
      return NextResponse.json({ error: photosErr.message }, { status: 500 });
    }

    // 3. Fetch all guests for this event
    const { data: guests, error: guestsErr } = await supabaseAdmin
      .from("guests")
      .select("id, display_name, phone, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (guestsErr) {
      return NextResponse.json({ error: guestsErr.message }, { status: 500 });
    }

    // 4. Fetch all guest selfies for this event
    const { data: selfies, error: selfiesErr } = await supabaseAdmin
      .from("guest_selfies")
      .select("id, guest_id, status, public_url")
      .eq("event_id", eventId);

    if (selfiesErr) {
      return NextResponse.json({ error: selfiesErr.message }, { status: 500 });
    }

    // 5. Standalone face_embeddings query removed to bypass PostgREST limit.
    // Count is fetched inline with event_photos.

    // 6. Fetch all photo matches (to count matches per guest)
    const { data: matches, error: matchesErr } = await supabaseAdmin
      .from("photo_matches")
      .select("id, guest_id, photo_id, guest_selfie_id, similarity, confidence_tier")
      .eq("event_id", eventId);

    if (matchesErr) {
      return NextResponse.json({ error: matchesErr.message }, { status: 500 });
    }

    // 7. Fetch processing queue jobs for this event
    let queueJobs: any[] = [];
    try {
      const { data: rawQueue } = await supabaseAdmin
        .from("processing_queue")
        .select("id, job_type, payload, status, error_msg, attempts, claimed_at, created_at, completed_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      queueJobs = rawQueue || [];
    } catch (code) {
      // Non-fatal if table doesn't exist
    }

    // Aggregation of embeddingsByPhoto removed since count is fetched nested.

    // Aggregate failed queue job errors by selfie_id
    const selfieErrors: Record<string, string> = {};
    queueJobs.forEach((job) => {
      if (job.job_type === "embed_selfie" && job.status === "failed" && job.error_msg) {
        try {
          const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
          const selfieId = payload?.selfie_id;
          if (selfieId) {
            selfieErrors[selfieId] = job.error_msg;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    // Compute Photos Summary
    const totalPhotos = photos.length;
    const indexedPhotos = photos.filter((p) => p.face_indexed).length;
    const pendingPhotos = totalPhotos - indexedPhotos;
    const totalFacesDetected = photos?.reduce((acc, p: any) => acc + (p.face_embeddings?.[0]?.count || 0), 0) || 0;
    const totalProcessingTime = photos.reduce((acc, p) => acc + (p.processing_time || 0), 0);
    const avgProcessingTime = indexedPhotos > 0 ? totalProcessingTime / indexedPhotos : 0;

    // Compute Guests Summary
    const totalGuests = guests.length;
    const guestsWithSelfies = selfies.length;

    // Compute Queue Summary
    const queueSummary = {
      pending: queueJobs.filter((j) => j.status === "pending").length,
      processing: queueJobs.filter((j) => j.status === "processing").length,
      completed: queueJobs.filter((j) => j.status === "completed").length,
      failed: queueJobs.filter((j) => j.status === "failed").length,
      dead: queueJobs.filter((j) => j.status === "dead").length,
    };

    // Format individual lists
    const photoDetails = photos.map((p: any) => ({
      id: p.id,
      original_filename: p.original_filename,
      public_url: p.public_url,
      face_indexed: p.face_indexed,
      face_indexed_at: p.face_indexed_at,
      processing_time: p.processing_time,
      faces_count: p.face_embeddings?.[0]?.count || 0,
      uploaded_at: p.uploaded_at,
    }));

    const guestDetails = guests.map((g) => {
      const guestSelfies = (selfies || [])
        .filter((s) => s.guest_id === g.id)
        .map((s) => {
          const matchedPhotosForSelfie = (matches || [])
            .filter((m) => m.guest_selfie_id === s.id)
            .map((m) => {
              const photo = photos.find((p) => p.id === m.photo_id);
              return {
                photo_id: m.photo_id,
                public_url: photo?.public_url || "",
                filename: photo?.original_filename || "Unknown",
                similarity: m.similarity,
                confidence_tier: m.confidence_tier,
              };
            });

          return {
            id: s.id,
            status: s.status,
            public_url: s.public_url,
            error: selfieErrors[s.id] || null,
            matches_count: matchedPhotosForSelfie.length,
            matched_photos: matchedPhotosForSelfie,
          };
        });

      let aggregatedStatus = "none";
      if (guestSelfies.length > 0) {
        if (guestSelfies.some((s) => s.status === "matched")) {
          aggregatedStatus = "matched";
        } else if (guestSelfies.some((s) => s.status === "processing" || s.status === "uploaded")) {
          aggregatedStatus = "processing";
        } else if (guestSelfies.some((s) => s.status === "no_face")) {
          aggregatedStatus = "no_face";
        } else {
          aggregatedStatus = guestSelfies[0].status;
        }
      }

      const guestMatchesCount = (matches || []).filter((m) => m.guest_id === g.id).length;

      return {
        id: g.id,
        display_name: g.display_name,
        phone: g.phone,
        created_at: g.created_at,
        selfie_status: aggregatedStatus,
        selfie_url: guestSelfies[0]?.public_url || null,
        selfie_error: guestSelfies.find((s) => s.error)?.error || null,
        selfies: guestSelfies,
        matches_count: guestMatchesCount,
      };
    });

    const guestsIdentified = guestDetails.filter((g) => g.matches_count > 0).length;

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        venue: event.venue,
        event_date: event.event_date,
        event_type: event.event_type,
        status: event.status,
        owner: event.owner ? {
          ...event.owner,
          email: ownerEmail
        } : null,
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
      guests: guestDetails, // Send all guests (no slice)
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[event-diagnostics API] Error:", msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
