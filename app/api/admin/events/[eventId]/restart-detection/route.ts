import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, restartEventFaceDetection } from "@/lib/admin-data";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createClient();
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

    const result = await restartEventFaceDetection(eventId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to restart detection" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Face detection restarted successfully." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[restart-detection route] Error:", msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
