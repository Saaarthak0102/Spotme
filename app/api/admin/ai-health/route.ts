import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";
import { aiServiceHeaders, resolveAiServiceUrls } from "@/lib/ai-service";

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

  const urls = resolveAiServiceUrls();
  if (urls.length === 0) {
    return NextResponse.json(
      { status: "misconfigured", error: "No valid AI_SERVICE_URL configured." },
      { status: 500 }
    );
  }

  // Poll all servers in parallel
  const serverResults = await Promise.all(
    urls.map(async (url) => {
      try {
        const [healthRes, statusRes] = await Promise.all([
          fetch(`${url}/health`, {
            method: "GET",
            headers: aiServiceHeaders(),
            signal: AbortSignal.timeout(3000), // 3s timeout
          }).then((r) => (r.ok ? r.json() : Promise.reject(`Status ${r.status}`))),
          
          fetch(`${url}/status`, {
            method: "GET",
            headers: aiServiceHeaders(),
            signal: AbortSignal.timeout(3000), // 3s timeout
          }).then((r) => (r.ok ? r.json() : Promise.reject(`Status ${r.status}`)))
        ]);

        return {
          url,
          status: "ok",
          worker_id: healthRes.worker_id,
          model: healthRes.model,
          model_loaded: healthRes.model_loaded,
          hires_model_loaded: healthRes.hires_model_loaded,
          ram_total_mb: healthRes.ram_total_mb,
          ram_free_mb: healthRes.ram_free_mb,
          ram_used_pct: healthRes.ram_used_pct,
          max_concurrent: healthRes.max_concurrent,
          gpu_available: statusRes.gpu_available ?? false,
          active_jobs: statusRes.active_workers?.length ?? 0,
          max_queue_size: healthRes.max_queue_size || 10,
          database_connected: healthRes.database_connected,
          queue_stats: statusRes.queue,
        };
      } catch (err) {
        return {
          url,
          status: "offline",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  const onlineServers = serverResults.filter((s) => s.status === "ok");
  const overallStatus = onlineServers.length > 0 ? "ok" : "offline";

  // Use the first online server or first server as fallback for top-level backward compatibility
  const primary = onlineServers[0] || serverResults[0];

  return NextResponse.json({
    status: overallStatus,
    servers: serverResults,
    // Aggregated/fallback fields for backwards compatibility:
    model: primary.model,
    model_loaded: primary.model_loaded,
    ram_total_mb: primary.ram_total_mb,
    ram_free_mb: primary.ram_free_mb,
    ram_used_pct: primary.ram_used_pct,
    active_jobs: primary.active_jobs,
    max_queue_size: primary.max_queue_size,
    gpu_available: primary.gpu_available,
    database_connected: primary.database_connected,
  });
}
