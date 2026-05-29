import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, fetchAdminStats, fetchAllEvents, fetchAllChartData } from "@/lib/admin-data";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [stats, events, chartData] = await Promise.all([
    fetchAdminStats(),
    fetchAllEvents(500),
    fetchAllChartData(),
  ]);

  return NextResponse.json({ stats, events, chartData });
}
