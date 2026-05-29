import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { event_id, storage_path, public_url, original_filename, file_size_bytes, mime_type } = body as {
    event_id: string;
    storage_path: string;
    public_url: string | null;
    original_filename: string | null;
    file_size_bytes: number | null;
    mime_type: string | null;
  };

  if (!event_id || !storage_path) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the user owns this event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event } = await (supabase as any)
    .from("events")
    .select("id")
    .eq("id", event_id)
    .eq("owner_id", user.id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("event_photos")
    .insert({ event_id, storage_path, public_url, original_filename, file_size_bytes, mime_type })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  }

  // Trigger background face indexing call to the Python AI service
  let aiServiceUrl = (process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  if (aiServiceUrl.includes("://0.0.0.0")) {
    aiServiceUrl = aiServiceUrl.replace("://0.0.0.0", "://127.0.0.1");
  }

  if (data && data.public_url) {
    fetch(`${aiServiceUrl}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photo_id: data.id,
        event_id: data.event_id,
        image_url: data.public_url
      })
    }).catch(err => {
      console.error("Failed to notify AI service for indexing:", err);
    });
  }

  return NextResponse.json(data);
}
