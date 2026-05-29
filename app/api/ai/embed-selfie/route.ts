import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai/embed-selfie
 *
 * Triggers the Python AI service to embed a guest selfie and cache
 * the matching results in the photo_matches table. This is fire-and-forget —
 * the client polls guest_selfies.status to know when results are ready.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { guest_id, event_id, selfie_url, selfie_id } = body as {
    guest_id: string;
    event_id: string;
    selfie_url: string;
    selfie_id?: string;
  };

  if (!guest_id || !event_id || !selfie_url) {
    return NextResponse.json(
      { error: "Missing required fields: guest_id, event_id, selfie_url" },
      { status: 400 }
    );
  }

  let aiServiceUrl = (
    process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  if (aiServiceUrl.includes("://0.0.0.0")) {
    aiServiceUrl = aiServiceUrl.replace("://0.0.0.0", "://127.0.0.1");
  }

  try {
    // Fire and forget — we don't await the result
    // The Python service runs it as a BackgroundTask and stores results in photo_matches
    const res = await fetch(`${aiServiceUrl}/embed-selfie`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guest_id,
        event_id,
        selfie_url,
        selfie_id: selfie_id ?? null,
        threshold: 0.55,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout for the initial response only
    });

    if (res.status === 429) {
      return NextResponse.json(
        { status: "busy", message: "AI service is busy. Please try again shortly." },
        { status: 429 }
      );
    }

    if (res.status === 503) {
      return NextResponse.json(
        { status: "unavailable", message: "AI service unavailable. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: "processing" });
  } catch (err) {
    console.error("[embed-selfie route] AI service call failed:", err);
    // Don't fail the client — the selfie was already uploaded, just can't start AI yet
    return NextResponse.json(
      { status: "queued", message: "AI service will process your selfie when available." },
      { status: 202 }
    );
  }
}
