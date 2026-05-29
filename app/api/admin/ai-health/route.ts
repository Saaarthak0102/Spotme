import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let aiServiceUrl = (
    process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  if (aiServiceUrl.includes("://0.0.0.0")) {
    aiServiceUrl = aiServiceUrl.replace("://0.0.0.0", "://127.0.0.1");
  }

  try {
    const res = await fetch(`${aiServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!res.ok) {
      throw new Error(`AI service responded with ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ai-health route] Failed to fetch live AI health:", err);
    return NextResponse.json({
      status: "offline",
      error: "AI service is offline or unreachable."
    }, { status: 503 });
  }
}
