import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";
import { aiServiceHeaders, resolveAiServiceUrls } from "@/lib/ai-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const urls = resolveAiServiceUrls();
  if (urls.length === 0) {
    return NextResponse.json(
      { error: "AI_SERVICE_URL is not configured." },
      { status: 500 }
    );
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const [healthRes, statusRes] = await Promise.all([
          fetch(`${url}/health`, {
            headers: aiServiceHeaders(),
            signal: AbortSignal.timeout(3000),
          }).then((r) => (r.ok ? r.json() : Promise.reject(`Status ${r.status}`))),
          
          fetch(`${url}/status`, {
            headers: aiServiceHeaders(),
            signal: AbortSignal.timeout(3000),
          }).then((r) => (r.ok ? r.json() : Promise.reject(`Status ${r.status}`)))
        ]);
        return {
          url,
          online: true,
          health: healthRes,
          status: statusRes,
        };
      } catch (err) {
        return {
          url,
          online: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  const online = results.some((r) => r.online);

  return NextResponse.json({
    online,
    servers: results,
    // Backward compatibility for single server:
    url: urls[0],
    health: results[0]?.health || null,
    status: results[0]?.status || null,
  });
}
