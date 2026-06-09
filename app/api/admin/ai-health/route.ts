import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";
import { aiServiceHeaders, resolveAiServiceUrl } from "@/lib/ai-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aiServiceUrl = resolveAiServiceUrl();
  if (!aiServiceUrl) {
    return NextResponse.json(
      { status: "misconfigured", error: "AI_SERVICE_URL is not a valid private address." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${aiServiceUrl}/health`, {
      method: "GET",
      headers: aiServiceHeaders(),
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!res.ok) {
      throw new Error(`AI service responded with ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorName = err instanceof Error ? err.name : "UnknownError";
    console.warn(`[ai-health route] AI service health check failed (${errorName}: ${errorMsg})`);
    return NextResponse.json({
      status: "offline",
      error: "AI service is offline or unreachable."
    }, { status: 503 });
  }
}

