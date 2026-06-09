"use client";

import { useEffect, useState } from "react";
import { DashboardShell, PageHeading } from "@/components/dashboard/shell";
import Link from "next/link";

interface FileBreakdown {
  label: string;
  sizeGB: number;
  color: string;
}

interface EventBreakdown {
  id: string;
  name: string;
  sizeGB: number;
  sizeBytes: number;
  photoCount: number;
  icon: string;
}

interface RecentFile {
  id: string;
  name: string;
  eventName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

interface PhotographerStatsPayload {
  profile: {
    plan: "free" | "starter" | "pro" | "studio_basic" | "studio_pro" | "custom";
    max_storage_gb: number;
  };
  stats: {
    usedStorageGB: number;
    usedStorageBytes: number;
    totalEvents: number;
    totalPhotos: number;
    fileTypesBreakdown: FileBreakdown[];
    eventsBreakdown: EventBreakdown[];
    recentFiles: RecentFile[];
  };
}

export default function StoragePage() {
  const [data, setData] = useState<PhotographerStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/photographer/stats")
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          console.error("STATS API ERROR RESPONSE:", text);
          throw new Error("Failed to load: " + text);
        }
        return r.json();
      })
      .then(setData)
      .catch((err) => console.error("Error loading storage stats:", err))
      .finally(() => setLoading(false));
  }, []);

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getPlanLabel = (plan: string) => {
    if (plan === "free") return "Free Plan";
    if (plan === "starter") return "Starter Plan";
    if (plan === "pro") return "Personal Pro Plan";
    if (plan === "studio_basic") return "Studio Basic Plan";
    if (plan === "studio_pro") return "Studio Pro Plan";
    if (plan === "custom") return "Custom Plan";
    return "Spotme Plan";
  };

  if (loading) {
    return (
      <DashboardShell active="Storage">
        <main className="p-5 sm:p-7 lg:p-9">
          <PageHeading
            eyebrow="Storage"
            title="Storage overview"
            detail="Monitor usage across events and manage your media archive."
          />
          <div className="flex flex-col items-center justify-center py-24 text-[#827970] gap-4">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#2D2D2D]/10 border-t-[#D67D5C]" />
            <p className="text-sm font-medium">Calculating storage allocation...</p>
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell active="Storage">
        <main className="p-5 sm:p-7 lg:p-9">
          <PageHeading
            eyebrow="Storage"
            title="Storage overview"
            detail="Monitor usage across events and manage your media archive."
          />
          <div className="rounded-[26px] border border-red-200 bg-red-50/30 p-8 text-center text-red-600">
            <span className="material-symbols-outlined text-4xl block mb-2 text-red-500/70">warning</span>
            <p className="text-sm font-semibold">Error loading storage statistics</p>
            <p className="text-xs mt-1 text-[#827970]">Please ensure your Supabase connection and database tables are ready.</p>
          </div>
        </main>
      </DashboardShell>
    );
  }

  const { profile, stats } = data;
  const usedGB = stats.usedStorageGB;
  const totalGB = profile.max_storage_gb;
  const pct = totalGB > 0 ? Math.min(100, Math.round((usedGB / totalGB) * 100)) : 0;

  return (
    <DashboardShell active="Storage">
      <main className="p-5 sm:p-7 lg:p-9">
        <PageHeading
          eyebrow="Storage"
          title="Storage overview"
          detail="Monitor usage across events and manage your media archive."
        />

        {/* ─── Top row: Overview + By‑event ─── */}
        <div className="grid gap-7 xl:grid-cols-[1fr_1fr]">
          {/* ── Storage Overview Card ── */}
          <div className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-7 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#D67D5C]">cloud</span>
              <h2 className="text-lg font-semibold tracking-tight text-[#2D2D2D]">Storage Usage</h2>
            </div>

            <div className="flex flex-col items-center gap-8 sm:flex-row">
              {/* Circular progress ring */}
              <div className="relative flex h-[156px] w-[156px] shrink-0 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#D67D5C 0% ${pct}%, #F0EBE4 ${pct}% 100%)`,
                    mask: "radial-gradient(farthest-side, transparent 68%, #000 69%)",
                    WebkitMask: "radial-gradient(farthest-side, transparent 68%, #000 69%)",
                  }}
                />
                <div className="text-center">
                  <p className="text-3xl font-bold tracking-tight text-[#2D2D2D]">{pct}%</p>
                  <p className="mt-0.5 text-xs text-[#827970]">used</p>
                </div>
              </div>

              {/* File‑type breakdown */}
              <div className="w-full space-y-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-[#2D2D2D]">
                    {usedGB.toFixed(3)} GB <span className="text-[#827970]">of {totalGB} GB</span>
                  </p>
                  <p className="text-xs text-[#827970]">{(totalGB - usedGB).toFixed(3)} GB free</p>
                </div>
                {stats.fileTypesBreakdown.map((ft) => {
                  const percent = totalGB > 0 ? (ft.sizeGB / totalGB) * 100 : 0;
                  return (
                    <div key={ft.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-[#2D2D2D]">{ft.label}</span>
                        <span className="text-[#827970]">{ft.sizeGB.toFixed(3)} GB</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#F0EBE4]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percent}%`,
                            background: `linear-gradient(90deg, ${ft.color}, ${ft.color}dd)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Storage by Event ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#D67D5C]">photo_library</span>
              <h2 className="text-lg font-semibold tracking-tight text-[#2D2D2D]">Storage by Event</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-1 max-h-[300px] overflow-y-auto pr-1">
              {stats.eventsBreakdown.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[#D67D5C]/30 bg-white/40 p-8 text-center text-[#827970] text-sm">
                  No events created yet.
                </div>
              ) : (
                stats.eventsBreakdown.map((ev) => {
                  const evPct = totalGB > 0 ? Math.round((ev.sizeGB / totalGB) * 100) : 0;
                  return (
                    <div
                      key={ev.id}
                      className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-5 backdrop-blur-xl transition hover:shadow-lg"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4A261]/15">
                          <span className="material-symbols-outlined text-[20px] text-[#F4A261]">{ev.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#2D2D2D]">{ev.name}</p>
                          <p className="text-xs text-[#827970]">
                            {ev.sizeGB.toFixed(3)} GB · {ev.photoCount} photos ({evPct}%)
                          </p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F0EBE4]">
                        <div
                          className="h-full rounded-full bg-[#D67D5C] transition-all"
                          style={{ width: `${evPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ─── Recent Files ─── */}
        <div className="mt-8 rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-7 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#D67D5C]">description</span>
            <h2 className="text-lg font-semibold tracking-tight text-[#2D2D2D]">Recent Files</h2>
          </div>

          {stats.recentFiles.length === 0 ? (
            <div className="py-12 text-center text-[#827970] text-sm">
              <span className="material-symbols-outlined text-4xl text-[#D67D5C]/30 block mb-2">image</span>
              No files uploaded yet.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2D2D2D]/6 text-left text-xs font-medium uppercase tracking-wider text-[#827970]">
                      <th className="pb-3 pr-4">File name</th>
                      <th className="pb-3 pr-4">Event</th>
                      <th className="pb-3 pr-4">Size</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentFiles.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b border-[#2D2D2D]/4 transition last:border-0 hover:bg-[#F4A261]/5"
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-[18px] text-[#827970]">image</span>
                            <span className="font-medium text-[#2D2D2D] truncate max-w-[240px] block" title={f.name}>
                              {f.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-[#827970]">{f.eventName}</td>
                        <td className="py-3.5 pr-4 text-[#827970]">{formatBytes(f.sizeBytes)}</td>
                        <td className="py-3.5 text-[#827970]">
                          {new Date(f.uploadedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {stats.recentFiles.map((f) => (
                  <div key={f.id} className="rounded-2xl border border-[#2D2D2D]/4 bg-white/50 p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-[#827970]">image</span>
                      <span className="text-sm font-medium text-[#2D2D2D] truncate block max-w-[200px]" title={f.name}>
                        {f.name}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#827970]">
                      <span>{f.eventName}</span>
                      <span>{formatBytes(f.sizeBytes)}</span>
                      <span>
                        {new Date(f.uploadedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── Upgrade Banner ─── */}
        <div className="mt-8 overflow-hidden rounded-[26px] bg-[#2D2D2D] p-7 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, #D67D5C, #F4A261)" }}
              >
                <span className="material-symbols-outlined text-[22px] text-white">workspace_premium</span>
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  {getPlanLabel(profile.plan)} · {totalGB} GB
                </p>
                <p className="mt-0.5 text-sm text-white/50">
                  You&apos;re using {pct}% of your storage limit. Upgrade your subscription for more space and premium tools.
                </p>
              </div>
            </div>
            {profile.plan !== "custom" && profile.plan !== "studio_pro" && (
              <Link
                href="/dashboard/account"
                className="shrink-0 text-center rounded-xl bg-[#D67D5C] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(214,125,92,0.22)] transition hover:-translate-y-0.5 hover:bg-[#C76F50]"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
