"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminStats, PhotographerRow, AdminEventRow, AdminChartData, InquiryRow, ExtendedKPIData } from "@/lib/admin-data";
import { DonutChart, AreaLineChart, HorizontalBarChart } from "@/components/admin/charts";

/* ── Sidebar nav items ── */
const nav = [
  { label: "Overview", href: "/admin", icon: "space_dashboard" },
  { label: "Photographers", href: "/admin/photographers", icon: "photo_camera" },
  { label: "Events", href: "/admin/events", icon: "photo_library" },
  { label: "Inquiries", href: "/admin/inquiries", icon: "mail" },
  { label: "KPIs", href: "/admin/kpis", icon: "monitoring" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];

/* ── Reusable warm stat card ── */
function StatCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string | number; sub?: string; icon: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)] hover:shadow-[0_8px_30px_rgba(148,73,44,0.06)] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-[#827970] uppercase tracking-widest leading-none">{label}</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${accent ?? "text-[#2D2D2D]"}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="mt-1 text-xs text-[#827970] font-medium">{sub}</p>}
        </div>
        <span className={`material-symbols-outlined text-[28px] ${accent ?? "text-[#D67D5C]/60"}`}>{icon}</span>
      </div>
    </div>
  );
}

/* ── Warm Sidebar ── */
function AdminSidebar({ active, isOpen, onClose }: { active: string; isOpen?: boolean; onClose?: () => void }) {
  const router = useRouter();
  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-stone-900/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed inset-y-0 left-0 w-60 border-r border-[#EFE6DD] bg-[#FAF5EF] flex flex-col z-30 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-[#EFE6DD]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D67D5C] to-[#B36144] text-white shadow-md shadow-primary/10">
              <span className="material-symbols-outlined text-[16px]">shield</span>
            </span>
            <div>
              <span className="text-sm font-bold text-[#2D2D2D] tracking-tight">Spotme Admin</span>
              <p className="text-[10px] text-[#827970] font-medium leading-none mt-0.5">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const isActive = active === item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                    ? "bg-[#D67D5C]/10 text-[#94492c]"
                    : "text-[#827970] hover:text-[#2D2D2D] hover:bg-stone-200/40"
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#EFE6DD] space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#827970] hover:text-[#2D2D2D] hover:bg-stone-200/40 transition"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#827970] hover:text-red-600 hover:bg-red-500/10 transition"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Live AI Resource Health Estimator Card ── */
interface AIServerHealth {
  url: string;
  status: string;
  worker_id?: string;
  model?: string;
  model_loaded?: boolean;
  hires_model_loaded?: boolean;
  ram_total_mb?: number;
  ram_free_mb?: number;
  ram_used_pct?: number;
  max_concurrent?: number;
  gpu_available?: boolean;
  active_jobs?: number;
  max_queue_size?: number;
  database_connected?: boolean;
  error?: string;
}

interface AIHealthData {
  status: string;
  servers?: AIServerHealth[];
  model?: string;
  model_loaded?: boolean;
  active_jobs?: number;
  max_concurrent?: number;
  max_queue_size?: number;
  ram_total_mb?: number;
  ram_free_mb?: number;
  ram_used_pct?: number;
  database_connected?: boolean;
}

function AIResourceEstimator({ todayPhotos, todaySelfies }: { todayPhotos: number; todaySelfies: number }) {
  const [health, setHealth] = useState<AIHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(() => {
    fetch("/api/admin/ai-health")
      .then((res) => {
        if (!res.ok) throw new Error("Offline");
        return res.json();
      })
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: "offline" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const isOnline = health && health.status === "ok";
  const estimatedCPUSeconds = (todayPhotos * 1.5) + (todaySelfies * 0.8);
  const totalAIJobsToday = todayPhotos + todaySelfies;

  return (
    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE6DD] pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#2D2D2D]">Inference & System Health</h3>
          <p className="text-xs text-[#827970] mt-0.5">Live status and resource estimation of the local AI core</p>
        </div>
        <div>
          {loading ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              Polling AI...
            </span>
          ) : isOnline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
              Engine Online ({health.servers?.filter(s => s.status === 'ok').length || 1} Active)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Engine Offline
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Active Servers & Hardware status */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#827970]">dns</span>
            <span className="text-xs font-bold text-[#827970] uppercase tracking-wider">Active AI Server Nodes</span>
          </div>

          <div className="space-y-3">
            {health?.servers && health.servers.length > 0 ? (
              health.servers.map((server, idx) => {
                const sOnline = server.status === "ok";
                const cleanUrl = server.url.replace("http://", "").replace("https://", "");
                return (
                  <div key={idx} className="rounded-xl border border-[#EFE6DD] bg-stone-50/50 p-4 transition duration-300 hover:border-[#D67D5C]/35">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-2 mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#2D2D2D]">{cleanUrl}</span>
                        {server.gpu_available && (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                            GPU Accelerated
                          </span>
                        )}
                      </div>
                      <div>
                        {sOnline ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Offline
                          </span>
                        )}
                      </div>
                    </div>

                    {sOnline ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Memory stats */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#827970]">
                            <span>RAM Usage</span>
                            <span className="font-bold text-[#2D2D2D]">{server.ram_used_pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${(server.ram_used_pct ?? 0) > 85 ? "bg-red-500" : (server.ram_used_pct ?? 0) > 70 ? "bg-amber-500" : "bg-[#60D9A0]"
                                }`}
                              style={{ width: `${server.ram_used_pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-[#827970]">
                            {(server.ram_total_mb && server.ram_free_mb)
                              ? `${(server.ram_total_mb - server.ram_free_mb).toLocaleString()}MB / ${server.ram_total_mb.toLocaleString()}MB used`
                              : "—"}
                          </p>
                        </div>

                        {/* Semaphore & Worker Details */}
                        <div className="text-[11px] space-y-1 text-[#827970]">
                          <div className="flex justify-between">
                            <span>Worker ID:</span>
                            <span className="font-semibold text-[#2D2D2D] truncate max-w-[140px]">{server.worker_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Concurrency:</span>
                            <span className="font-semibold text-[#2D2D2D]">{server.active_jobs ?? 0} / {server.max_queue_size ?? 10} active</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-red-600 font-semibold">{server.error || "Connection timed out."}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl bg-stone-50 border border-dashed border-[#EFE6DD] p-8 text-center text-xs text-[#827970]">
                No active AI server instances detected. Please ensure uvicorn core is running.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Today's cumulative workloads and CPU time */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#EFE6DD] pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[18px] text-[#827970]">analytics</span>
              <span className="text-xs font-bold text-[#827970] uppercase tracking-wider">Today's Workload Estimates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
              <div className="rounded-xl bg-stone-50 p-3 border border-[#EFE6DD]">
                <p className="text-[10px] text-[#827970] font-semibold uppercase tracking-wider leading-none">AI Inference Jobs</p>
                <p className="text-xl font-bold text-[#2D2D2D] mt-2">{totalAIJobsToday.toLocaleString()}</p>
                <p className="text-[10px] text-[#827970] mt-1">
                  {todayPhotos} photos + {todaySelfies} selfies
                </p>
              </div>

              <div className="rounded-xl bg-stone-50 p-3 border border-[#EFE6DD]">
                <p className="text-[10px] text-[#827970] font-semibold uppercase tracking-wider leading-none">Est. CPU Core Time</p>
                <p className="text-xl font-bold text-[#94492c] mt-2">
                  {estimatedCPUSeconds >= 60
                    ? `${(estimatedCPUSeconds / 60).toFixed(1)} mins`
                    : `${estimatedCPUSeconds.toFixed(1)}s`}
                </p>
                <p className="text-[10px] text-[#827970] mt-1">Raw processor capacity</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#827970] italic leading-tight mt-6 pt-2 border-t border-[#EFE6DD]/80">
            * Estimates are calculated on 1.5s per photographer photo indexing (SCRFD face detection + embeddings mapping) and 0.8s per guest selfie search match.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   OVERVIEW PAGE
   ═══════════════════════════════════════════════ */
export function AdminOverview() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [chartData, setChartData] = useState<AdminChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(({ stats, events, chartData }) => {
        setStats(stats);
        setEvents(events.slice(0, 5)); // show top 5 on overview page
        setChartData(chartData);
      })
      .finally(() => setLoading(false));
  }, []);

  // Color palettes
  const eventTypeColors: Record<string, string> = {
    marriage: "#D67D5C", hackathon: "#5B8DEF", meetup: "#60D9A0",
    corporate: "#A78BFA", other: "#E06C8E",
  };
  const planColors: Record<string, string> = {
    free: "#827970",
    starter: "#F59E0B",
    pro: "#D67D5C",
    studio_basic: "#5B8DEF",
    studio_pro: "#60D9A0",
    custom: "#A78BFA",
    unlimited: "#60D9A0", // legacy
  };
  const statusColors: Record<string, string> = {
    draft: "#827970", active: "#60D9A0", archived: "#A78BFA",
  };

  const activityIcons: Record<string, string> = {
    event: "photo_library", photographer: "photo_camera", guest: "person",
  };
  const activityAccent: Record<string, string> = {
    event: "text-[#5B8DEF]", photographer: "text-[#D67D5C]", guest: "text-[#60D9A0]",
  };

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  return (
    <div className="flex min-h-screen bg-[#FCF9F8]">
      <AdminSidebar active="Overview" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1280px]">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 lg:mb-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EFE6DD] bg-white text-[#827970] transition hover:bg-stone-50"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">Platform Overview</h1>
              <p className="mt-1 text-xs sm:text-sm text-[#827970] hidden sm:block">Platform aggregates, operational growth, and inference system diagnostics.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-[#827970] py-20 justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
              <span className="text-sm">Loading platform stats...</span>
            </div>
          ) : stats ? (
            <div className="space-y-8">
              {/* ─── CUMULATIVE STAT CARDS ROW ─── */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#827970]/80 mb-4">All Time</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard label="Photographers" value={stats.totalPhotographers} icon="photo_camera" accent="text-[#D67D5C]"
                    sub={stats.thisMonthGuests > 0 ? `+${stats.thisMonthGuests} this month` : undefined} />
                  <StatCard label="Total Events" value={stats.totalEvents} icon="photo_library"
                    sub={stats.thisMonthEvents > 0 ? `+${stats.thisMonthEvents} this month` : undefined} />
                  <StatCard label="Photos Uploaded" value={stats.totalPhotos} icon="image" accent="text-[#5B8DEF]"
                    sub={stats.thisMonthPhotos > 0 ? `+${stats.thisMonthPhotos} this month` : undefined} />
                  <StatCard label="Guests Served" value={stats.totalGuests} icon="people" accent="text-[#60D9A0]"
                    sub={`${stats.activeEvents} active events now`} />
                </div>
              </section>

              {/* ─── LIVE AI RESOURCE ESTIMATOR CARD ─── */}
              <section>
                <AIResourceEstimator todayPhotos={stats.todayPhotos} todaySelfies={stats.todaySelfies} />
              </section>

              {/* ─── THIS MONTH QUICK STATS ─── */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#827970]/80 mb-4">This Month</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard label="Active Events" value={stats.activeEvents} icon="event_available" accent="text-[#60D9A0]" />
                  <StatCard label="New Events" value={stats.thisMonthEvents} icon="add_circle" />
                  <StatCard label="Photos This Month" value={stats.thisMonthPhotos} icon="photo" accent="text-[#5B8DEF]" />
                  <StatCard label="New Guests" value={stats.thisMonthGuests} icon="person_add" accent="text-[#D67D5C]" />
                </div>
              </section>

              {chartData && (
                <>
                  {/* ─── MONTHLY GROWTH CHART ─── */}
                  <section>
                    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <h2 className="text-sm font-bold text-[#2D2D2D]">Platform Growth</h2>
                          <p className="text-xs text-[#827970] mt-0.5">Events, photos, and guests over the last 6 months</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-xs text-[#827970] font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#D67D5C]" /> Events
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-[#827970] font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#5B8DEF]" /> Photos
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-[#827970] font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#60D9A0]" /> Guests
                          </span>
                        </div>
                      </div>
                      <AreaLineChart data={chartData.monthlyGrowth} height={260} />
                    </div>
                  </section>

                  {/* ─── DONUT CHARTS ROW ─── */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Event Types */}
                    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                      <h2 className="text-sm font-bold text-[#2D2D2D] mb-4">Event Types</h2>
                      <DonutChart
                        title="Events"
                        data={chartData.eventTypeBreakdown.map((d) => ({
                          label: d.type.charAt(0).toUpperCase() + d.type.slice(1),
                          value: d.count,
                          color: eventTypeColors[d.type] ?? "#827970",
                        }))}
                        size={160}
                      />
                    </div>

                    {/* Plan Distribution */}
                    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                      <h2 className="text-sm font-bold text-[#2D2D2D] mb-4">Subscription Plans</h2>
                      <DonutChart
                        title="Users"
                        data={chartData.planDistribution.map((d) => {
                          const planLabels: Record<string, string> = {
                            free: "Free",
                            starter: "Starter",
                            pro: "Pro",
                            studio_basic: "Studio Basic",
                            studio_pro: "Studio Pro",
                            custom: "Custom",
                          };
                          return {
                            label: planLabels[d.plan] ?? d.plan,
                            value: d.count,
                            color: planColors[d.plan] ?? "#827970",
                          };
                        })}
                        size={160}
                      />
                    </div>

                    {/* Event Status */}
                    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                      <h2 className="text-sm font-bold text-[#2D2D2D] mb-4">Event Status</h2>
                      <DonutChart
                        title="Events"
                        data={chartData.eventStatusBreakdown.map((d) => ({
                          label: d.status.charAt(0).toUpperCase() + d.status.slice(1),
                          value: d.count,
                          color: statusColors[d.status] ?? "#827970",
                        }))}
                        size={160}
                      />
                    </div>
                  </section>

                  {/* ─── TOP PHOTOGRAPHERS + ACTIVITY FEED ─── */}
                  <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Top Photographers */}
                    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                      <h2 className="text-sm font-bold text-[#2D2D2D] mb-4">Top Photographers</h2>
                      {chartData.topPhotographers.length > 0 ? (
                        <HorizontalBarChart
                          data={chartData.topPhotographers.map((p) => ({
                            name: p.name,
                            value: p.photos,
                            secondary: `${p.events} event${p.events !== 1 ? "s" : ""}`,
                          }))}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-stone-300">
                          <span className="material-symbols-outlined text-[32px] mb-2">photo_camera</span>
                          <p className="text-sm text-[#827970]">No photographers yet</p>
                        </div>
                      )}
                    </div>

                    {/* Activity Feed */}
                    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                      <h2 className="text-sm font-bold text-[#2D2D2D] mb-4">Recent Activity</h2>
                      {chartData.recentActivity.length > 0 ? (
                        <div className="space-y-1">
                          {chartData.recentActivity.map((a, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-stone-50 transition">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 flex-shrink-0 ${activityAccent[a.type] ?? "text-stone-400"}`}>
                                <span className="material-symbols-outlined text-[16px]">{activityIcons[a.type] ?? "info"}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#2D2D2D]/90 font-medium truncate">{a.description}</p>
                                <p className="text-xs text-[#827970] mt-0.5">{timeAgo(a.time)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-stone-300">
                          <span className="material-symbols-outlined text-[32px] mb-2">history</span>
                          <p className="text-sm text-[#827970]">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* ─── RECENT EVENTS TABLE ─── */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#827970]/80 mb-4">Recent Events</h2>
                <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Event</th>
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Photographer</th>
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Type</th>
                          <th className="text-right px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Photos</th>
                          <th className="text-right px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Guests</th>
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE6DD]">
                        {events.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-[#827970] text-sm">No events yet.</td>
                          </tr>
                        )}
                        {events.map((ev) => (
                          <tr key={ev.id} className="hover:bg-stone-50/50 transition">
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-[#2D2D2D]">{ev.name}</p>
                              <p className="text-xs text-[#827970]">{ev.venue ?? "—"}</p>
                            </td>
                            <td className="px-5 py-3.5 text-[#2D2D2D] font-medium">{ev.ownerName ?? "—"}</td>
                            <td className="px-5 py-3.5">
                              <span className="capitalize text-[#827970] font-medium">{ev.event_type}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right text-[#2D2D2D] font-bold">{ev.photoCount}</td>
                            <td className="px-5 py-3.5 text-right text-[#2D2D2D] font-bold">{ev.guestCount}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ev.status === "active"
                                  ? "bg-[#60D9A0]/15 text-[#2E7D32]"
                                  : ev.status === "draft"
                                    ? "bg-stone-100 text-stone-600"
                                    : "bg-stone-50 text-stone-400"
                                }`}>
                                {ev.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PHOTOGRAPHERS PAGE
   ═══════════════════════════════════════════════ */
function PhotographerModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: () => void;
  initial?: PhotographerRow | null;
}) {
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? "",
    email: initial?.email ?? "",
    password: "",
    phone: initial?.phone ?? "",
    bio: initial?.bio ?? "",
    plan: initial?.plan ?? "free",
    disabled_features: initial?.disabled_features ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (initial) {
      // Update
      const res = await fetch("/api/admin/photographers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial.id,
          full_name: form.full_name,
          phone: form.phone,
          bio: form.bio,
          plan: form.plan,
          disabled_features: form.disabled_features
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update"); setSaving(false); return; }
    } else {
      // Create
      const res = await fetch("/api/admin/photographers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); setSaving(false); return; }
    }

    onSave();
    onClose();
  };

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90dvh] flex flex-col rounded-2xl border border-[#EFE6DD] bg-white shadow-2xl overflow-hidden">
        <div className="p-6 overflow-y-auto">
          <h2 className="text-lg font-bold text-[#2D2D2D]">{isEdit ? "Edit Photographer" : "Add Photographer"}</h2>
          <p className="mt-1 text-sm text-[#827970]">{isEdit ? "Update their profile details." : "Create a new photographer account."}</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#827970] uppercase tracking-wider">Full Name</label>
              <input
                required
                maxLength={200}
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="mt-1.5 w-full rounded-xl bg-stone-50/50 border border-[#EFE6DD] px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-stone-400 focus:outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C]"
                placeholder="Jane Doe"
              />
            </div>

            {!isEdit && (
              <>
                <div>
                  <label className="text-xs font-semibold text-[#827970] uppercase tracking-wider">Email</label>
                  <input
                    required
                    type="email"
                    maxLength={320}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl bg-stone-50/50 border border-[#EFE6DD] px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-stone-400 focus:outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C]"
                    placeholder="photographer@email.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#827970] uppercase tracking-wider">Password</label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={128}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl bg-stone-50/50 border border-[#EFE6DD] px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-stone-400 focus:outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C]"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-[#827970] uppercase tracking-wider">Phone <span className="text-stone-400">(optional)</span></label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={12}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
                className="mt-1.5 w-full rounded-xl bg-stone-50/50 border border-[#EFE6DD] px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-stone-400 focus:outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C]"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#827970] uppercase tracking-wider">Subscription Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as any }))}
                className="mt-1.5 w-full rounded-xl bg-stone-50/50 border border-[#EFE6DD] px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C] bg-white"
              >
                <option value="free">Free Plan (₹0 - 1 Event, 5GB)</option>
                <option value="starter">Starter (₹499/mo - 1 Event, 20GB)</option>
                <option value="pro">Personal Pro (₹999/mo - 4 Events, 60GB)</option>
                <option value="studio_basic">Studio Basic (₹699/mo - 5 Events, 40GB)</option>
                <option value="studio_pro">Studio Pro (₹1,599/mo - Unlimited, 100GB)</option>
                <option value="custom">Custom Plan (Contact Sales to set up)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#827970] uppercase tracking-wider">Bio <span className="text-stone-400">(optional)</span></label>
              <textarea
                rows={2}
                maxLength={500}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="mt-1.5 w-full rounded-xl bg-stone-50/50 border border-[#EFE6DD] px-4 py-2 text-sm text-[#2D2D2D] placeholder:text-stone-400 focus:outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C] resize-none"
                placeholder="Short bio or specialization..."
              />
            </div>

            <div className="border-t border-[#EFE6DD] pt-4 mt-2">
              <label className="text-xs font-bold text-[#827970] uppercase tracking-wider block mb-2.5">Enabled Features</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "face_matching", label: "AI Face Matching" },
                  { id: "privacy_mode", label: "Privacy Mode" },
                  { id: "collaborators", label: "Collaborators" },
                  { id: "custom_branding", label: "Custom Branding" },
                ].map((feat) => {
                  const isEnabled = !form.disabled_features.includes(feat.id);
                  return (
                    <label key={feat.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-[#EFE6DD] hover:bg-stone-100/50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          const nextDisabled = e.target.checked
                            ? form.disabled_features.filter((x) => x !== feat.id)
                            : [...form.disabled_features, feat.id];
                          setForm((f) => ({ ...f, disabled_features: nextDisabled }));
                        }}
                        className="accent-[#D67D5C] h-4.5 w-4.5 rounded"
                      />
                      <span className="text-xs font-semibold text-[#2D2D2D]">{feat.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-[#EFE6DD] px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#B36144] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/10 hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminPhotographers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [photographers, setPhotographers] = useState<PhotographerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PhotographerRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/photographers")
      .then((r) => r.json())
      .then(setPhotographers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this photographer? All their events will also be removed.")) return;
    setDeleting(id);
    await fetch(`/api/admin/photographers?id=${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  };

  const handleEdit = (p: PhotographerRow) => { setEditTarget(p); setModalOpen(true); };
  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };

  return (
    <div className="flex min-h-screen bg-[#FCF9F8]">
      <AdminSidebar active="Photographers" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EFE6DD] bg-white text-[#827970] transition hover:bg-stone-50"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">Photographers</h1>
                <p className="mt-1 text-xs sm:text-sm text-[#827970] hidden sm:block">Manage photographer accounts on the platform.</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex self-start sm:self-auto items-center gap-2 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#B36144] px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Add Photographer</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-[#827970]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
              Loading...
            </div>
          ) : (
            <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Photographer</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Contact</th>
                      <th className="text-right px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Events</th>
                      <th className="text-right px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Photos</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Plan</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Last Active</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {photographers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center">
                          <span className="material-symbols-outlined text-[40px] text-stone-300 block mb-2">photo_camera</span>
                          <p className="text-[#827970] text-sm">No photographers yet. Add one to get started.</p>
                        </td>
                      </tr>
                    )}
                    {photographers.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-50/50 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#D67D5C]/30 to-[#B36144]/20 text-[#94492c] text-sm font-bold flex-shrink-0">
                              {(p.full_name ?? "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#2D2D2D]">{p.full_name ?? "—"}</p>
                              {p.bio && <p className="text-xs text-[#827970] truncate max-w-[180px]">{p.bio}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[#2D2D2D] text-sm font-medium">{p.email}</p>
                          {p.phone && <p className="text-xs text-[#827970]">{p.phone}</p>}
                        </td>
                        <td className="px-5 py-4 text-right text-[#2D2D2D] font-bold">{p.eventCount}</td>
                        <td className="px-5 py-4 text-right text-[#2D2D2D] font-bold">{p.photoCount}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.plan === "studio_pro" || (p.plan as string) === "unlimited"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : p.plan === "pro"
                                ? "bg-[#D67D5C]/10 text-[#94492c] border border-[#D67D5C]/20"
                                : p.plan === "studio_basic"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : p.plan === "starter"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : p.plan === "custom"
                                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                                      : "bg-stone-100 text-stone-600 border border-stone-200"
                            }`}>
                            {
                              p.plan === "free" ? "Free Plan" :
                                p.plan === "starter" ? "Starter" :
                                  p.plan === "pro" ? "Personal Pro" :
                                    p.plan === "studio_basic" ? "Studio Basic" :
                                      p.plan === "studio_pro" ? "Studio Pro" :
                                        p.plan === "custom" ? "Custom Plan" :
                                          p.plan === "unlimited" ? "Unlimited Plan" : p.plan
                            }
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#827970] text-xs">
                          {p.lastActive
                            ? new Date(p.lastActive).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "Never"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#827970] hover:text-[#2D2D2D] hover:bg-stone-200/50 transition"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#827970] hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                              title="Delete"
                            >
                              {deleting === p.id
                                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-stone-300 border-t-[#D67D5C]" />
                                : <span className="material-symbols-outlined text-[16px]">delete</span>
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <PhotographerModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={load}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   EVENTS PAGE
   ═══════════════════════════════════════════════ */
export function AdminEvents() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [selectedEvent, setSelectedEvent] = useState<AdminEventRow | null>(null);

  // Date Filtering state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadEvents = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(({ events: fetchedEvents }) => {
        setEvents(fetchedEvents || []);
        // Also update selectedEvent if it's open, so that stats reload live in the modal
        if (selectedEvent) {
          const updated = (fetchedEvents || []).find((e: AdminEventRow) => e.id === selectedEvent.id);
          if (updated) {
            setSelectedEvent(updated);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [selectedEvent]);

  useEffect(() => {
    loadEvents();
  }, []);


  const getEventDateString = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  // Group events by local date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, AdminEventRow[]> = {};
    events.forEach((ev) => {
      const dateStr = getEventDateString(ev.event_date);
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(ev);
      }
    });
    return map;
  }, [events]);

  // Calendar calculations
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay(); // 0 is Sun
    return day === 0 ? 6 : day - 1; // Map to 0=Mon, 6=Sun
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarDays = useMemo(() => {
    const totalDays = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const arr: (number | null)[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      arr.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      arr.push(d);
    }
    return arr;
  }, [year, month]);

  // Filter events by date if selected
  const filteredEvents = useMemo(() => {
    if (!selectedDateStr) return events;
    return events.filter((ev) => getEventDateString(ev.event_date) === selectedDateStr);
  }, [events, selectedDateStr]);

  const selectedFormattedDate = useMemo(() => {
    if (!selectedDateStr) return "";
    const parts = selectedDateStr.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }, [selectedDateStr]);

  return (
    <div className="flex min-h-screen bg-[#FCF9F8]">
      <AdminSidebar active="Events" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          {/* Top Panel Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EFE6DD] bg-white text-[#827970] transition hover:bg-stone-50"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">Platform Events</h1>
                <p className="mt-1 text-xs sm:text-sm text-[#827970] hidden sm:block">Browse events using a standard list or daily event density calendar.</p>
              </div>
            </div>

            {/* Toggle Table/Calendar View */}
            <div className="flex items-center gap-2 bg-stone-100 rounded-xl p-1 self-start md:self-auto border border-[#EFE6DD]">
              <button
                onClick={() => { setViewMode("calendar"); setSelectedDateStr(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${viewMode === "calendar"
                    ? "bg-white text-[#94492c] shadow-[0_2px_8px_rgba(148,73,44,0.08)]"
                    : "text-[#827970] hover:text-[#2D2D2D]"
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                Calendar View
              </button>
              <button
                onClick={() => { setViewMode("list"); setSelectedDateStr(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${viewMode === "list"
                    ? "bg-white text-[#94492c] shadow-[0_2px_8px_rgba(148,73,44,0.08)]"
                    : "text-[#827970] hover:text-[#2D2D2D]"
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">view_list</span>
                List View
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-[#827970]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
              Loading...
            </div>
          ) : (
            <div className="space-y-6">
              {/* ─── CALENDAR CONTAINER VIEW ─── */}
              {viewMode === "calendar" && (
                <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)] animate-page-enter">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-base font-bold text-[#2D2D2D]">{monthNames[month]} {year}</h2>
                      <p className="text-xs text-[#827970] mt-0.5">Click any day to filter events listed below</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-50 border border-[#EFE6DD] text-[#827970] hover:text-[#2D2D2D] hover:bg-stone-100 transition"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-50 border border-[#EFE6DD] text-[#827970] hover:text-[#2D2D2D] hover:bg-stone-100 transition"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  {/* Calendar Weekday Names */}
                  <div className="grid grid-cols-7 text-center text-xs font-bold text-[#827970] uppercase border-b border-[#EFE6DD]/80 pb-2 mb-3">
                    <div><span className="hidden sm:inline">Mon</span><span className="sm:hidden">M</span></div>
                    <div><span className="hidden sm:inline">Tue</span><span className="sm:hidden">T</span></div>
                    <div><span className="hidden sm:inline">Wed</span><span className="sm:hidden">W</span></div>
                    <div><span className="hidden sm:inline">Thu</span><span className="sm:hidden">T</span></div>
                    <div><span className="hidden sm:inline">Fri</span><span className="sm:hidden">F</span></div>
                    <div><span className="hidden sm:inline">Sat</span><span className="sm:hidden">S</span></div>
                    <div><span className="hidden sm:inline">Sun</span><span className="sm:hidden">S</span></div>
                  </div>

                  {/* Calendar Day Grid cells */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((d, index) => {
                      if (d === null) return <div key={`empty-${index}`} className="h-14 sm:h-20 bg-stone-50/30 rounded-xl border border-transparent" />;

                      const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const dayEvents = eventsByDate[dayStr] || [];
                      const isSelected = selectedDateStr === dayStr;

                      return (
                        <div
                          key={`day-${d}`}
                          onClick={() => {
                            if (dayEvents.length > 0) {
                              setSelectedDateStr(isSelected ? null : dayStr);
                            }
                          }}
                          className={`h-14 sm:h-20 rounded-xl border p-1 sm:p-2 flex flex-col justify-between transition-all duration-200 select-none ${dayEvents.length > 0
                              ? "cursor-pointer hover:bg-[#D67D5C]/5"
                              : "opacity-60"
                            } ${isSelected
                              ? "border-[#D67D5C] ring-2 ring-[#D67D5C]/20 bg-[#D67D5C]/5"
                              : "border-stone-100 bg-white"
                            }`}
                        >
                          <span className={`text-xs font-bold ${isSelected ? "text-[#94492c]" : "text-[#2D2D2D]"}`}>
                            {d}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="inline-flex self-start items-center rounded-full bg-[#D67D5C]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#94492c]">
                              <span className="hidden sm:inline">{dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}</span>
                              <span className="sm:hidden">{dayEvents.length}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── EVENTS DATA TABLE ─── */}
              <div className="space-y-4">
                {/* Active Filters Bar */}
                {selectedDateStr && (
                  <div className="flex items-center justify-between bg-[#D67D5C]/10 border border-[#D67D5C]/25 rounded-2xl px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#94492c]">filter_alt</span>
                      <p className="text-xs text-[#94492c] font-semibold">
                        Showing {filteredEvents.length} events occurring on <span className="underline font-bold">{selectedFormattedDate}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDateStr(null)}
                      className="flex items-center gap-1 text-xs font-bold text-[#94492c] bg-white border border-[#D67D5C]/30 px-3 py-1 rounded-xl shadow-sm hover:bg-[#D67D5C]/5 transition"
                    >
                      Clear Filter
                    </button>
                  </div>
                )}

                <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Event</th>
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Photographer</th>
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Date</th>
                          <th className="text-right px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Photos</th>
                          <th className="text-right px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Guests</th>
                          <th className="text-right px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Identified</th>
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE6DD]">
                        {filteredEvents.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-[#827970] text-sm font-semibold">
                              No events found for this selection.
                            </td>
                          </tr>
                        )}
                        {filteredEvents.map((ev) => (
                          <tr
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="hover:bg-stone-50/50 transition cursor-pointer"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold text-[#2D2D2D]">{ev.name}</p>
                              <p className="text-xs text-[#827970] capitalize font-medium">{ev.event_type} {ev.venue ? `· ${ev.venue}` : ""}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-[#2D2D2D] font-semibold">{ev.ownerName ?? "—"}</p>
                              <p className="text-xs text-[#827970]">{ev.ownerEmail ?? ""}</p>
                            </td>
                            <td className="px-5 py-4 text-[#827970] text-xs font-medium">
                              {ev.event_date
                                ? new Date(ev.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                : "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-[#2D2D2D] font-bold">{ev.photoCount}</td>
                            <td className="px-5 py-4 text-right text-[#2D2D2D] font-bold">{ev.guestCount}</td>
                            <td className="px-5 py-4 text-right">
                              <span className="font-bold text-[#2D2D2D]">{ev.identifiedCount}</span>
                              <span className="text-xs text-[#827970]"> / {ev.guestCount}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ev.status === "active"
                                  ? "bg-[#60D9A0]/15 text-[#2E7D32]"
                                  : ev.status === "draft"
                                    ? "bg-stone-100 text-stone-600"
                                    : "bg-stone-50 text-stone-400"
                                }`}>
                                {ev.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <EventStatsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onRestartSuccess={loadEvents} />
    </div>
  );
}

/* ── Event Statistics Modal ────────────────────────── */
interface EventStatsModalProps {
  event: AdminEventRow | null;
  onClose: () => void;
  onRestartSuccess?: () => void;
}

function EventStatsModal({ event, onClose, onRestartSuccess }: EventStatsModalProps) {
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!event) return null;

  const handleRestartDetection = async () => {
    if (!confirm("Are you sure you want to restart face detection for this event? This will clear all existing matches and face embeddings, and queue all event photos for re-indexing.")) {
      return;
    }
    setRestarting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/restart-detection`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to restart face detection.");
      }
      setSuccessMsg("Face detection restarted successfully! Photos are being queued for re-indexing.");
      if (onRestartSuccess) {
        onRestartSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setRestarting(false);
    }
  };

  const matchRate = event.guestCount > 0
    ? ((event.identifiedCount / event.guestCount) * 100).toFixed(1)
    : "0.0";

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processPercentage = event.photoCount > 0
    ? ((event.indexedPhotoCount / event.photoCount) * 100).toFixed(1)
    : "100.0";

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0s";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />


      {/* Modal Card */}
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-[28px] border border-[#EFE6DD] bg-white/95 p-6 shadow-2xl backdrop-blur-xl transition-all sm:p-8 animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EFE6DD] pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${event.status === "active" ? "bg-[#60D9A0]/15 text-[#2E7D32]" : "bg-stone-100 text-stone-600"
                }`}>
                {event.status}
              </span>
              <span className="text-xs text-[#827970] capitalize font-medium">{event.event_type}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#2D2D2D] mt-1.5">{event.name}</h3>
            <p className="text-xs text-[#827970] mt-0.5">
              Venue: <span className="font-semibold text-stone-700">{event.venue || "—"}</span> ·
              Date: <span className="font-semibold text-stone-700">{event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN") : "—"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EFE6DD] bg-white text-[#827970] hover:text-[#2D2D2D] transition shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Bento Grid Stats */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Card 1: Guests & Matching */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-gradient-to-br from-white to-[#FAF6F4] p-5">
            <div className="flex items-center justify-between text-[#827970] mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider">Guests & Face Matching</h4>
              <span className="material-symbols-outlined text-[#D67D5C]">groups</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Total Registered:</span>
                <span className="font-bold text-[#2D2D2D]">{event.guestCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Selfies Uploaded:</span>
                <span className="font-bold text-[#2D2D2D]">{event.selfieCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Unique Identified:</span>
                <span className="font-bold text-[#D67D5C]">{event.identifiedCount}</span>
              </div>
              <div className="pt-2 border-t border-[#EFE6DD]/80 flex justify-between items-center">
                <span className="text-xs font-semibold text-[#827970]">Match Rate:</span>
                <span className="text-sm font-extrabold text-[#94492c]">{matchRate}%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Photos & Face Extraction */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-gradient-to-br from-white to-[#FAF6F4] p-5">
            <div className="flex items-center justify-between text-[#827970] mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider">Photos & Detection</h4>
              <span className="material-symbols-outlined text-[#D67D5C]">photo_library</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Total Uploaded:</span>
                <span className="font-bold text-[#2D2D2D]">{event.photoCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Photos Indexed:</span>
                <span className="font-bold text-[#2D2D2D]">{event.indexedPhotoCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Faces Detected:</span>
                <span className="font-bold text-[#D67D5C]">{event.totalFaces}</span>
              </div>
              <div className="pt-2 border-t border-[#EFE6DD]/80 flex justify-between items-center">
                <span className="text-xs font-semibold text-[#827970]">Indexing Progress:</span>
                <span className="text-sm font-extrabold text-[#94492c]">{processPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Storage Size */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-gradient-to-br from-white to-[#FAF6F4] p-5">
            <div className="flex items-center justify-between text-[#827970] mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider">Storage Capacity</h4>
              <span className="material-symbols-outlined text-[#D67D5C]">cloud_queue</span>
            </div>
            <div className="space-y-2 mt-2">
              <p className="text-2xl font-bold tracking-tight text-[#2D2D2D]">
                {formatBytes(event.totalStorageBytes)}
              </p>
              <p className="text-xs text-[#827970] leading-relaxed">
                Utilized by original high-resolution uploads and optimized CDN thumbnails and previews.
              </p>
            </div>
          </div>

          {/* Card 4: AI Compute & Processing Power */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-gradient-to-br from-white to-[#FAF6F4] p-5">
            <div className="flex items-center justify-between text-[#827970] mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider">AI Compute Performance</h4>
              <span className="material-symbols-outlined text-[#D67D5C]">memory</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Processed:</span>
                <span className="font-bold text-[#2D2D2D]">
                  {event.indexedPhotoCount} photos · {event.totalFaces} {event.totalFaces === 1 ? "face" : "faces"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Total Processing Time:</span>
                <span className="font-bold text-[#2D2D2D]">{formatDuration(event.totalProcessingTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#625D58]">Avg Time / Photo:</span>
                <span className="font-bold text-[#2D2D2D]">
                  {event.indexedPhotoCount > 0
                    ? `${(event.totalProcessingTime / event.indexedPhotoCount).toFixed(2)}s`
                    : "0.00s"}
                </span>
              </div>
              <div className="pt-2 border-t border-[#EFE6DD]/80 flex justify-between items-center text-xs">
                <span className="font-semibold text-[#827970]">Active AI Model:</span>
                <span className="font-bold text-stone-700">SCRFD + ArcFace</span>
              </div>
            </div>
          </div>

        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700 font-semibold animate-fade-in">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-xs text-green-700 font-semibold animate-fade-in">
            {successMsg}
          </div>
        )}

        {/* Footer / Photographer Details */}
        <div className="mt-6 border-t border-[#EFE6DD] pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#827970]">Managed By</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-stone-400 text-[18px]">person</span>
              <p className="text-sm font-semibold text-[#2D2D2D]">{event.ownerName || "—"} <span className="font-normal text-xs text-[#827970]">({event.ownerEmail || ""})</span></p>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <Link
              href={`/admin/events/${event.id}/diagnostics`}
              className="rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#B36144] hover:opacity-90 px-4 py-2.5 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[15px]">analytics</span>
              View Diagnostics
            </Link>
            <button
              onClick={handleRestartDetection}
              disabled={restarting}
              className="rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 text-xs font-semibold text-amber-700 active:scale-[0.98] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {restarting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
                  Restarting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">sync</span>
                  Restart Face Detection
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-[#DED5CC] bg-white px-5 py-2.5 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] transition shadow-xs"
            >
              Close Statistics
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   INQUIRIES PAGE
   ═══════════════════════════════════════════════ */
export function AdminInquiries() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/inquiries")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInquiries(data);
        } else {
          setInquiries([]);
        }
      })
      .catch((err) => {
        console.error("Error loading inquiries:", err);
        setInquiries([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inquiry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/inquiries?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(null);
      }
      load();
    } catch (err) {
      alert("Error deleting inquiry. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const query = search.toLowerCase();
      return (
        inq.name.toLowerCase().includes(query) ||
        inq.email.toLowerCase().includes(query) ||
        (inq.phone || "").toLowerCase().includes(query) ||
        (inq.location || "").toLowerCase().includes(query) ||
        (inq.event_type || "").toLowerCase().includes(query)
      );
    });
  }, [inquiries, search]);

  const getEventTypeColor = (type: string | null) => {
    if (!type) return "bg-stone-100 text-stone-600 border-stone-200";
    const t = type.toLowerCase();
    if (t === "wedding") return "bg-[#D67D5C]/10 text-[#94492c] border-[#D67D5C]/20";
    if (t === "reunion") return "bg-green-50 text-green-700 border-green-200";
    if (t === "gala") return "bg-blue-50 text-blue-700 border-blue-200";
    if (t === "baptism") return "bg-purple-50 text-purple-700 border-purple-200";
    if (t === "corporate") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-stone-50 text-stone-600 border-stone-200";
  };

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex min-h-screen bg-[#FCF9F8]">
      <AdminSidebar active="Inquiries" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EFE6DD] bg-white text-[#827970] transition hover:bg-stone-50"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">Event Inquiries</h1>
                <p className="mt-1 text-xs sm:text-sm text-[#827970] hidden sm:block">Review and manage potential event inquiries submitted via the public portal.</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#827970]">search</span>
              <input
                type="text"
                placeholder="Search inquiries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl bg-white border border-[#EFE6DD] pl-10 pr-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#827970] focus:outline-none focus:border-[#D67D5C] focus:ring-1 focus:ring-[#D67D5C]"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-[#827970] py-20 justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
              <span className="text-sm">Loading inquiries...</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)] animate-page-enter">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Inquirer</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Contact</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Event Details</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Type</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-[#827970] uppercase tracking-wider">Submitted</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {filteredInquiries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <span className="material-symbols-outlined text-[40px] text-stone-300 block mb-2">mail</span>
                          <p className="text-[#827970] text-sm">No inquiries found.</p>
                        </td>
                      </tr>
                    )}
                    {filteredInquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-stone-50/50 transition duration-150">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#D67D5C]/20 to-[#B36144]/15 text-[#94492c] text-sm font-bold flex-shrink-0">
                              {inq.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#2D2D2D]">{inq.name}</p>
                              {inq.guest_count && (
                                <p className="text-xs text-[#827970]">{inq.guest_count.replace("-", " to ").replace("+", "+ guests").replace("under", "Under ")}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[#2D2D2D] text-sm font-medium">{inq.email}</p>
                          {inq.phone && <p className="text-xs text-[#827970]">{inq.phone}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[#2D2D2D] text-sm font-medium">{inq.event_date || "—"}</p>
                          {inq.location && <p className="text-xs text-[#827970]">{inq.location}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border capitalize ${getEventTypeColor(inq.event_type)}`}>
                            {inq.event_type || "Other"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#827970] text-xs font-medium">
                          {timeAgo(inq.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedInquiry(inq)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#827970] hover:text-[#2D2D2D] hover:bg-stone-200/50 transition"
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>
                            <button
                              onClick={() => handleDelete(inq.id)}
                              disabled={deletingId === inq.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#827970] hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                              title="Delete"
                            >
                              {deletingId === inq.id ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-stone-300 border-t-[#D67D5C]" />
                              ) : (
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Slide-over Panel for Inquiry details */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setSelectedInquiry(null)}
          />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl border-l border-[#EFE6DD] flex flex-col p-6 overflow-y-auto z-10 transition-transform duration-300 ease-out">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EFE6DD] pb-4 mb-6">
              <div>
                <span className="text-[10px] font-bold text-[#D67D5C] uppercase tracking-wider">Inquiry Details</span>
                <h2 className="text-xl font-bold text-[#2D2D2D] tracking-tight">{selectedInquiry.name}</h2>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Info Grid */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-stone-50/50 p-4 border border-[#EFE6DD]">
                  <span className="text-[10px] font-bold text-[#827970] uppercase tracking-wider block">Email Address</span>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-sm font-semibold text-[#2D2D2D] hover:underline mt-1 block truncate">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div className="rounded-xl bg-stone-50/50 p-4 border border-[#EFE6DD]">
                  <span className="text-[10px] font-bold text-[#827970] uppercase tracking-wider block">Phone Number</span>
                  <p className="text-sm font-semibold text-[#2D2D2D] mt-1">
                    {selectedInquiry.phone || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-stone-50/50 p-4 border border-[#EFE6DD]">
                  <span className="text-[10px] font-bold text-[#827970] uppercase tracking-wider block">Event Date</span>
                  <p className="text-sm font-semibold text-[#2D2D2D] mt-1">
                    {selectedInquiry.event_date || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50/50 p-4 border border-[#EFE6DD]">
                  <span className="text-[10px] font-bold text-[#827970] uppercase tracking-wider block">Location</span>
                  <p className="text-sm font-semibold text-[#2D2D2D] mt-1">
                    {selectedInquiry.location || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-stone-50/50 p-4 border border-[#EFE6DD]">
                  <span className="text-[10px] font-bold text-[#827970] uppercase tracking-wider block">Event Type</span>
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border capitalize mt-2 ${getEventTypeColor(selectedInquiry.event_type)}`}>
                      {selectedInquiry.event_type || "Other"}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-stone-50/50 p-4 border border-[#EFE6DD]">
                  <span className="text-[10px] font-bold text-[#827970] uppercase tracking-wider block">Guest Count</span>
                  <p className="text-sm font-semibold text-[#2D2D2D] mt-1">
                    {selectedInquiry.guest_count
                      ? selectedInquiry.guest_count.replace("-", " to ").replace("+", "+ guests").replace("under", "Under ")
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Story/Message block */}
              <div className="rounded-xl bg-[#FAF5EF]/50 p-5 border border-[#D67D5C]/15">
                <span className="text-[10px] font-bold text-[#94492c] uppercase tracking-wider block mb-2">Event Story & Description</span>
                {selectedInquiry.story ? (
                  <p className="text-sm text-[#2D2D2D] leading-relaxed whitespace-pre-wrap font-serif italic bg-white p-4 rounded-lg border border-[#EFE6DD]/60 shadow-[0_2px_10px_rgba(148,73,44,0.02)]">
                    "{selectedInquiry.story}"
                  </p>
                ) : (
                  <p className="text-sm text-stone-400 italic">No description provided.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#EFE6DD]">
                <a
                  href={`mailto:${selectedInquiry.email}?subject=Inquiry regarding your ${selectedInquiry.event_type || "event"}`}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#B36144] px-4 py-3 text-sm font-semibold text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">reply</span>
                  Reply via Email
                </a>
                <button
                  onClick={() => handleDelete(selectedInquiry.id)}
                  disabled={deletingId === selectedInquiry.id}
                  className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50 px-4 py-3 text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   GLOBAL SETTINGS PAGE
   ═══════════════════════════════════════════════ */
export function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.disabled_features) {
          setDisabledFeatures(data.disabled_features);
        }
      })
      .catch((err) => console.error("Error loading settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled_features: disabledFeatures }),
      });
      if (res.ok) {
        setMessage("Global system settings saved successfully!");
      } else {
        const d = await res.json();
        setMessage("Error: " + (d.error ?? "Failed to save"));
      }
    } catch (err) {
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featId: string, enabled: boolean) => {
    setDisabledFeatures((prev) =>
      enabled ? prev.filter((x) => x !== featId) : [...prev.filter((x) => x !== featId), featId]
    );
  };

  return (
    <div className="flex min-h-screen bg-[#FCF9F8]">
      <AdminSidebar active="Settings" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl animate-page-enter">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 lg:mb-8 border-b border-[#EFE6DD] pb-5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EFE6DD] bg-white text-[#827970] transition hover:bg-stone-50"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">System Settings</h1>
              <p className="mt-1 text-xs sm:text-sm text-[#827970]">Configure system-wide parameters and global feature gates.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-[#827970] py-6">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
              Loading settings...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Global Feature Toggles Card */}
              <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                <h2 className="text-sm font-bold text-[#2D2D2D] mb-1">Global Feature Toggles</h2>
                <p className="text-xs text-[#827970] mb-5">Disable features globally for all photographers, regardless of their plan tier.</p>

                <div className="space-y-4">
                  {[
                    { id: "face_matching", name: "AI Face Matching", desc: "Allows guests to upload a selfie and search for matching photos using ArcFace embeddings." },
                    { id: "privacy_mode", name: "Privacy Mode (Selfie-Only)", desc: "Enables event organizers to hide general galleries and enforce guest-specific face matching access." },
                    { id: "collaborators", name: "Event Collaborators", desc: "Enables inviting team members or other photographers to manage specific event folders." },
                    { id: "custom_branding", name: "Custom Event Branding", desc: "Allows uploading custom logos and applying branded assets to event gallery page designs." },
                  ].map((feat) => {
                    const isEnabled = !disabledFeatures.includes(feat.id);
                    return (
                      <div key={feat.id} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-stone-50/50 border border-stone-100 hover:bg-stone-50 transition">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#2D2D2D]">{feat.name}</p>
                          <p className="text-xs text-[#827970] mt-0.5 leading-relaxed">{feat.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleFeature(feat.id, !isEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? "bg-[#D67D5C]" : "bg-stone-200"}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {message && (
                <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${message.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                  {message}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#B36144] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "Saving Settings…" : "Save Global Settings"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════
   KPIs PAGE
   ═══════════════════════════════════════════════ */

function PlaceholderCard({ title, icon, reason }: { title: string; icon: string; reason: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#EFE6DD] bg-[#FAF5EF]/30 p-5 shadow-sm flex flex-col items-center text-center justify-center min-h-[160px]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400 mb-3">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <h3 className="text-xs font-bold text-[#2D2D2D] mb-1">{title}</h3>
      <p className="text-[10px] text-[#827970] leading-relaxed max-w-[200px]">{reason}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function MetricCard({ title, value, icon, accent, sub }: { title: string; value: string | number; icon: string; accent?: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)] hover:shadow-md transition-shadow duration-300 flex flex-col justify-between min-h-[160px]">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent || 'from-[#D67D5C] to-[#B36144] text-white'}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        {sub && <span className="text-[10px] font-semibold uppercase tracking-wider text-[#827970] bg-stone-100 px-2 py-1 rounded-md">{sub}</span>}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-bold text-[#827970] uppercase tracking-widest">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-[#2D2D2D]">{value}</p>
      </div>
    </div>
  );
}

export function AdminKPIs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<ExtendedKPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/kpis")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-[#FCF9F8]">
      <AdminSidebar active="KPIs" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 lg:mb-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EFE6DD] bg-white text-[#827970] transition hover:bg-stone-50"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">System KPIs & Dashboard</h1>
              <p className="mt-1 text-xs sm:text-sm text-[#827970] hidden sm:block">Comprehensive breakdown of business metrics, traffic, and platform success.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-[#827970] py-20 justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
              <span className="text-sm">Loading KPI data...</span>
            </div>
          ) : data ? (
            <div className="space-y-10 animate-page-enter">

              {/* ─── 1. BUSINESS METRICS ─── */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2D2D2D] mb-4 flex items-center gap-2 border-b border-[#EFE6DD] pb-2">
                  <span className="material-symbols-outlined text-[#D67D5C] text-[18px]">payments</span>
                  Business & Revenue
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Monthly Recurring Revenue" value={`₹${(data.mrr / 100).toLocaleString()}`} icon="account_balance_wallet" accent="from-green-500 to-emerald-600 text-white" />
                  <MetricCard title="Paying Customers" value={data.payingCustomers.toLocaleString()} icon="loyalty" accent="from-blue-500 to-indigo-600 text-white" />
                  <MetricCard title="Avg Revenue / Customer" value={`₹${(data.avgRevenuePerCustomer / 100).toLocaleString()}`} icon="query_stats" accent="from-amber-500 to-orange-600 text-white" />
                  <MetricCard title="Total Inquiries" value={data.totalInquiries.toLocaleString()} icon="inbox" accent="from-stone-500 to-stone-600 text-white" />
                  <PlaceholderCard title="Churn Rate" icon="person_remove" reason="Feature to add: historical subscription tracking with start/cancel dates to compute monthly churn." />
                  <PlaceholderCard title="Lifetime Value (LTV)" icon="diamond" reason="Feature to add: a payments/transactions table recording each payment with timestamp and amount, so customer lifetime and revenue can be computed." />
                </div>
              </section>

              {/* ─── 2. TRAFFIC & MARKETING ─── */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2D2D2D] mb-4 flex items-center gap-2 border-b border-[#EFE6DD] pb-2">
                  <span className="material-symbols-outlined text-[#D67D5C] text-[18px]">campaign</span>
                  Traffic & Marketing
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Total Unique Visitors" value={data.totalVisitors.toLocaleString()} icon="group" />
                  <MetricCard title="Visitor Growth Rate" value={data.visitorGrowthRate !== null ? `${data.visitorGrowthRate.toFixed(1)}%` : "N/A"} icon="trending_up" sub="vs Last Week" />
                  <PlaceholderCard title="Customer Acquisition Cost" icon="attach_money" reason="Feature to add: a marketing spend input in Admin Settings, entered manually per period, to enable this calculation." />
                  <PlaceholderCard title="Cost per Inquiry" icon="request_quote" reason="Feature to add: a marketing spend input in Admin Settings, entered manually per period, to enable this calculation." />
                </div>
              </section>

              {/* ─── 3. SALES & CONVERSION ─── */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2D2D2D] mb-4 flex items-center gap-2 border-b border-[#EFE6DD] pb-2">
                  <span className="material-symbols-outlined text-[#D67D5C] text-[18px]">storefront</span>
                  Sales & Conversion
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Home → Pricing" value={`${data.homepageToPricingRate.toFixed(1)}%`} icon="ads_click" />
                  <MetricCard title="Pricing → Inquiry" value={`${data.pricingToInquiryRate.toFixed(1)}%`} icon="shopping_cart_checkout" />
                  <MetricCard title="Visitor → Customer" value={`${data.visitorToCustomerRate.toFixed(2)}%`} icon="workspace_premium" />
                </div>
              </section>

              {/* ─── 4. PHOTOGRAPHER SUCCESS ─── */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2D2D2D] mb-4 flex items-center gap-2 border-b border-[#EFE6DD] pb-2">
                  <span className="material-symbols-outlined text-[#D67D5C] text-[18px]">photo_camera</span>
                  Photographer Success
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Active Photographers" value={data.activePhotographers.toLocaleString()} icon="linked_camera" sub="Last 30 Days" />
                  <MetricCard title="New Photographers" value={data.newPhotographersOnboarded.toLocaleString()} icon="person_add" sub="Last 30 Days" />
                  <MetricCard title="Repeat Event Rate" value={`${data.repeatPhotographerRate.toFixed(1)}%`} icon="replay" />
                  <MetricCard title="Avg Events / Photographer" value={data.avgEventsPerPhotographer.toFixed(1)} icon="library_add" />
                  <PlaceholderCard title="Photographer CSAT" icon="sentiment_satisfied" reason="Feature to add: a periodic satisfaction survey sent to photographers, with responses stored against their profile." />
                  <PlaceholderCard title="Photographer Churn" icon="person_remove" reason="Feature to add: define an inactivity threshold (e.g. no events in N days) — awaiting confirmation of churn period." />
                </div>
              </section>

              {/* ─── 5. USER ENGAGEMENT & EXPERIENCE ─── */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2D2D2D] mb-4 flex items-center gap-2 border-b border-[#EFE6DD] pb-2">
                  <span className="material-symbols-outlined text-[#D67D5C] text-[18px]">touch_app</span>
                  Engagement & Analytics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Returning Visitors" value={`${data.returningVisitorRate.toFixed(1)}%`} icon="assignment_return" />
                  <MetricCard title="Avg Pages / Session" value={data.avgPagesPerSession.toFixed(1)} icon="layers" />
                  <MetricCard title="Session Duration" value={data.avgSessionDurationSec != null ? formatDuration(data.avgSessionDurationSec) : "N/A"} icon="timer" sub="Approximate" />
                  <MetricCard title="CTA Click Rate" value={data.ctaClickRate != null ? `${data.ctaClickRate.toFixed(1)}%` : "N/A"} icon="ads_click" sub="Visitors who clicked" />
                  <MetricCard title="Photo Search Rate" value={data.photoSearchRate != null ? `${data.photoSearchRate.toFixed(1)}%` : "N/A"} icon="search" sub={`${data.photoSearchCount || 0} searches`} />
                  <MetricCard title="Photo Download Rate" value={data.photoDownloadRate != null ? `${data.photoDownloadRate.toFixed(1)}%` : "N/A"} icon="download" sub={`${data.photoDownloadCount || 0} downloads`} />
                  <PlaceholderCard title="Photo Sharing Rate" icon="share" reason="Feature to add: a share button on gallery/my-photos pages using Web Share API or copy-link, with events tracked." />
                  <MetricCard title="User Retention Rate" value={data.userRetentionRate != null ? `${data.userRetentionRate.toFixed(1)}%` : "N/A"} icon="event_repeat" sub={data.userRetentionRate == null ? "Need 2+ weeks data" : "Week over week"} />
                </div>
              </section>
              
              {/* ─── 6. CUSTOMER FEEDBACK ─── */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2D2D2D] mb-4 flex items-center gap-2 border-b border-[#EFE6DD] pb-2">
                  <span className="material-symbols-outlined text-[#D67D5C] text-[18px]">support_agent</span>
                  Customer Feedback
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <PlaceholderCard title="Net Promoter Score" icon="speed" reason="Feature to add: an NPS survey sent to customers asking the standard 0–10 'how likely to recommend' question, with responses stored and scored." />
                  <PlaceholderCard title="CSAT Score" icon="sentiment_satisfied" reason="Feature to add: a post-interaction satisfaction survey (e.g. after a completed event) with a 1–5 rating captured and stored." />
                  <PlaceholderCard title="Most Common Complaint" icon="feedback" reason="Feature to add: a complaint/feedback categorization system, likely tied to a support ticketing flow." />
                  <PlaceholderCard title="Support Ticket Volume" icon="headset_mic" reason="Feature to add: a support ticketing system (or integration with one) to log when a user raises an issue." />
                  <PlaceholderCard title="Support Resolution Time" icon="timer" reason="Feature to add: a support ticketing system with timestamps for ticket open and resolution to compute duration." />
                  <PlaceholderCard title="Feature Requests" icon="add_box" reason="Feature to add: a feature request submission form or board where users can submit and upvote requests, covering both request count and most-requested tracking." />
                </div>
              </section>

              {/* ─── 7. FEATURE DECISION METRICS ─── */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2D2D2D] mb-4 flex items-center gap-2 border-b border-[#EFE6DD] pb-2">
                  <span className="material-symbols-outlined text-[#D67D5C] text-[18px]">model_training</span>
                  Feature Decision Metrics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Highest Drop-off Page" value={data.highestDropOffPage || "N/A"} icon="block" accent="from-red-500 to-rose-600 text-white" />
                  <MetricCard title="Funnel Drop-off Step" value={data.funnelDropOffStep || "N/A"} icon="filter_alt_off" accent="from-red-500 to-rose-600 text-white" />
                  <MetricCard title="Most Clicked Button" value={data.mostClickedButton || "N/A"} icon="touch_app" sub={data.mostClickedButtonCount > 0 ? `${data.mostClickedButtonCount} clicks` : undefined} />
                  {data.mostUsedFeature != null ? (
                    <MetricCard title="Most Used Feature" value={data.mostUsedFeature} icon="star" sub={`${data.mostUsedFeatureCount} uses`} />
                  ) : (
                    <MetricCard title="Most Used Feature" value="No data" icon="star" sub="No feature usage data yet" />
                  )}
                  {data.leastUsedFeature != null ? (
                    <MetricCard title="Least Used Feature" value={data.leastUsedFeature} icon="visibility_off" sub={`${data.leastUsedFeatureCount} uses`} />
                  ) : (
                    <MetricCard title="Least Used Feature" value="No data" icon="visibility_off" sub="No feature usage data yet" />
                  )}
                  <PlaceholderCard title="Feature Adoption Rate" icon="trending_up" reason="Feature to add: define features and track first-use per user to compute adoption over time." />
                  <PlaceholderCard title="Feature Abandonment" icon="trending_down" reason="Feature to add: track multi-step feature funnels to detect drop-offs post-engagement." />
                  <MetricCard title="Zero-Result Searches" value={data.zeroResultSearches != null ? data.zeroResultSearches.toLocaleString() : "N/A"} icon="search_off" sub={data.photoSearchCount > 0 ? `of ${data.photoSearchCount} total searches` : undefined} />
                </div>
              </section>

              {/* ─── 7. DATA TABLES ─── */}
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-6 border-t border-[#EFE6DD]">
                {/* Traffic Sources */}
                <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                  <div className="px-6 pt-6 pb-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-bold text-[#2D2D2D]">Traffic & Signups by Source</h2>
                      <p className="text-xs text-[#827970] mt-0.5">Visits and Conversions by UTM</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-t border-[#EFE6DD] bg-[#FAF5EF]/50">
                          <th className="text-left px-6 py-3 text-xs font-bold text-[#827970] uppercase tracking-wider">Source</th>
                          <th className="text-right px-6 py-3 text-xs font-bold text-[#827970] uppercase tracking-wider">Visits</th>
                          <th className="text-right px-6 py-3 text-xs font-bold text-[#827970] uppercase tracking-wider">Signups</th>
                          <th className="text-right px-6 py-3 text-xs font-bold text-[#827970] uppercase tracking-wider">Conv Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE6DD]">
                        {data.topSources.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-[#827970] text-sm">No data available.</td>
                          </tr>
                        ) : (
                          data.topSources.map((s, i) => {
                            const signupData = data.signupsBySource.find(x => x.source === s.source);
                            const signups = signupData ? signupData.signups : 0;
                            const rateData = data.conversionRateBySource.find(x => x.source === s.source);
                            const rate = rateData ? rateData.rate : 0;
                            return (
                              <tr key={i} className="hover:bg-stone-50/50 transition">
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${s.source === "Direct" ? "bg-stone-100 text-stone-500" : "bg-[#D67D5C]/10 text-[#94492c]"}`}>
                                      {i + 1}
                                    </span>
                                    <span className="font-medium text-[#2D2D2D]">{s.source}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-right font-bold text-[#2D2D2D]">{s.visits.toLocaleString()}</td>
                                <td className="px-6 py-3.5 text-right font-bold text-[#5B8DEF]">{signups.toLocaleString()}</td>
                                <td className="px-6 py-3.5 text-right font-bold text-[#60D9A0]">{rate.toFixed(1)}%</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Page Visits */}
                <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)]">
                  <div className="px-6 pt-6 pb-4">
                    <h2 className="text-sm font-bold text-[#2D2D2D]">Page Visits Breakdown</h2>
                    <p className="text-xs text-[#827970] mt-0.5">Top performing URLs</p>
                  </div>
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-sm relative">
                      <thead className="sticky top-0 bg-[#FAF5EF]/95 backdrop-blur-sm shadow-sm z-10">
                        <tr className="border-b border-t border-[#EFE6DD]">
                          <th className="text-left px-6 py-3 text-xs font-bold text-[#827970] uppercase tracking-wider">Page Path</th>
                          <th className="text-right px-6 py-3 text-xs font-bold text-[#827970] uppercase tracking-wider">Visits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE6DD]">
                        {data.pageVisits.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-6 py-8 text-center text-[#827970] text-sm">No visits tracked yet.</td>
                          </tr>
                        ) : (
                          data.pageVisits.map((p, i) => (
                            <tr key={i} className="hover:bg-stone-50/50 transition">
                              <td className="px-6 py-3.5 font-medium text-[#2D2D2D] truncate max-w-[200px]">{p.page}</td>
                              <td className="px-6 py-3.5 text-right font-bold text-[#2D2D2D]">{p.visits.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
