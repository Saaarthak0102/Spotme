"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface DiagnosticData {
  event: {
    id: string;
    name: string;
    venue: string;
    event_date: string;
    event_type: string;
    status: string;
    owner: {
      full_name: string;
      email: string;
    } | null;
  };
  stats: {
    photos: {
      total: number;
      indexed: number;
      pending: number;
      totalFacesDetected: number;
      totalProcessingTime: number;
      avgProcessingTime: number;
    };
    guests: {
      total: number;
      withSelfies: number;
      identified: number;
    };
    queue: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      dead: number;
    };
  };
  queueJobs: Array<{
    id: string;
    job_type: string;
    status: string;
    error_msg: string | null;
    attempts: number;
    claimed_at: string | null;
    created_at: string;
    completed_at: string | null;
  }>;
  photos: Array<{
    id: string;
    original_filename: string;
    public_url: string;
    face_indexed: boolean;
    face_indexed_at: string | null;
    processing_time: number;
    uploaded_at: string;
    faces_count: number;
  }>;
  guests: Array<{
    id: string;
    display_name: string;
    email: string;
    phone: string | null;
    created_at: string;
    selfie_status: string;
    selfie_url: string | null;
    matches_count: number;
  }>;
}

export default function EventDiagnosticsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"photos" | "guests" | "queue">("photos");
  const [restarting, setRestarting] = useState(false);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(() => {
    if (!eventId) return;
    fetch(`/api/admin/events/${eventId}/diagnostics`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch diagnostics");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId]);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  const handleRestart = async () => {
    if (!confirm("Are you sure you want to restart face detection for this event? This clears all matches and face embeddings, and re-queues all photos.")) {
      return;
    }
    setRestarting(true);
    setRestartMsg(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/restart-detection`, {
        method: "POST"
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to restart");
      setRestartMsg("Face detection successfully restarted! Queuing fresh jobs...");
      fetchDiagnostics();
    } catch (err: any) {
      alert(`Error restarting detection: ${err.message}`);
    } finally {
      setRestarting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCF9F8] p-4 text-[#827970] gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
        <span className="text-sm font-semibold">Loading event diagnostics telemetry...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FCF9F8] p-6 text-center">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <h1 className="text-xl font-bold text-[#2D2D2D] mt-4">Diagnostics Load Failed</h1>
        <p className="text-[#827970] mt-2 max-w-md text-sm">{error || "Could not retrieve diagnostics database payload."}</p>
        <button
          onClick={() => router.push("/admin/events")}
          className="mt-6 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#B36144] px-5 py-2.5 text-sm font-semibold text-white shadow-md"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const { event, stats, queueJobs, photos, guests } = data;

  return (
    <div className="min-h-screen bg-[#FCF9F8]">
      {/* Top Banner / Navigation */}
      <header className="border-b border-[#EFE6DD] bg-[#FAF5EF] px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/events"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EFE6DD] bg-white text-[#827970] hover:text-[#2D2D2D] hover:bg-stone-50 transition shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Diagnostics Control Panel</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  event.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-stone-100 text-stone-600 border border-stone-200"
                }`}>
                  {event.status}
                </span>
              </div>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#2D2D2D]">{event.name}</h1>
            </div>
          </div>

          <div className="flex gap-2 self-end sm:self-auto">
            <button
              onClick={handleRestart}
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
              onClick={fetchDiagnostics}
              className="rounded-xl border border-[#DED5CC] bg-white px-4 py-2.5 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] transition shadow-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              Refresh Logs
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {restartMsg && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm font-semibold text-green-800 animate-fade-in flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600">check_circle</span>
            {restartMsg}
          </div>
        )}

        {/* Info Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-xs">
            <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider">Event Details</p>
            <div className="mt-3 space-y-2 text-xs text-[#625D58]">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-semibold text-[#2D2D2D]">{event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Venue:</span>
                <span className="font-semibold text-[#2D2D2D]">{event.venue || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Event Type:</span>
                <span className="font-semibold text-[#2D2D2D] capitalize">{event.event_type}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-xs">
            <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider">Photographer / Owner</p>
            <div className="mt-3 space-y-2 text-xs text-[#625D58]">
              <div className="flex justify-between">
                <span>Name:</span>
                <span className="font-semibold text-[#2D2D2D]">{event.owner?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-semibold text-[#2D2D2D]">{event.owner?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Event ID:</span>
                <span className="font-mono text-[#827970] truncate max-w-[150px]">{event.id}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-xs">
            <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider">Telemetry Heartbeat</p>
            <div className="mt-3 flex items-center justify-between text-xs text-[#625D58]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                Live Feed Active
              </span>
              <span className="text-[10px] text-[#827970]">Polling every 5s</span>
            </div>
            <p className="mt-3 text-[11px] text-[#827970] leading-relaxed">
              Queue stats automatically reload to track processing jobs and selfie mapping.
            </p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-xs">
            <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider leading-none">Photo Progress</p>
            <p className="mt-3 text-3xl font-extrabold text-[#2D2D2D]">
              {stats.photos.indexed} <span className="text-sm font-semibold text-[#827970]">/ {stats.photos.total}</span>
            </p>
            <p className="mt-1.5 text-xs text-[#827970]">
              {stats.photos.pending} photos pending processing
            </p>
          </div>

          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-xs">
            <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider leading-none">Faces & Embeds</p>
            <p className="mt-3 text-3xl font-extrabold text-[#D67D5C]">
              {stats.photos.totalFacesDetected}
            </p>
            <p className="mt-1.5 text-xs text-[#827970]">
              Total biometric embeddings extracted
            </p>
          </div>

          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-xs">
            <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider leading-none">Guests & Selfies</p>
            <p className="mt-3 text-3xl font-extrabold text-[#2D2D2D]">
              {stats.guests.withSelfies} <span className="text-sm font-semibold text-[#827970]">/ {stats.guests.total}</span>
            </p>
            <p className="mt-1.5 text-xs text-[#827970]">
              {stats.guests.identified} unique guests matched
            </p>
          </div>

          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-xs">
            <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider leading-none">Avg Compute Time</p>
            <p className="mt-3 text-3xl font-extrabold text-[#94492c]">
              {stats.photos.avgProcessingTime.toFixed(2)}s
            </p>
            <p className="mt-1.5 text-xs text-[#827970]">
              Per photo face detection & vector extraction
            </p>
          </div>
        </section>

        {/* Job Queue Status Card */}
        <section className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-[#2D2D2D] mb-4">Event Job Queue Depth</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Pending", val: stats.queue.pending, color: "bg-stone-100 text-stone-700 border-stone-200" },
              { label: "Processing", val: stats.queue.processing, color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "Completed", val: stats.queue.completed, color: "bg-green-50 text-green-700 border-green-200" },
              { label: "Failed", val: stats.queue.failed, color: "bg-red-50 text-red-700 border-red-200" },
              { label: "Dead/Cancelled", val: stats.queue.dead, color: "bg-stone-100 text-stone-400 border-stone-200" },
            ].map((col, idx) => (
              <div key={idx} className={`rounded-xl border p-4 text-center ${col.color}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider leading-none">{col.label}</p>
                <p className="text-2xl font-black mt-2">{col.val}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs section */}
        <section className="space-y-4">
          <div className="flex border-b border-[#EFE6DD] pb-0.5 gap-6 text-sm font-semibold">
            {[
              { id: "photos", label: "Uploaded Photos (100)", icon: "image" },
              { id: "guests", label: "Event Guests (100)", icon: "people" },
              { id: "queue", label: "Queue Logs (50)", icon: "analytics" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 pb-2.5 border-b-2 transition-all ${
                    active ? "border-[#D67D5C] text-[#94492c]" : "border-transparent text-[#827970] hover:text-[#2D2D2D]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              {activeTab === "photos" && (
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                    <tr className="text-xs font-bold text-[#827970] uppercase">
                      <th className="px-5 py-3.5">Filename</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Faces</th>
                      <th className="px-5 py-3.5 text-right">Inference Time</th>
                      <th className="px-5 py-3.5">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {photos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-[#827970]">No photos uploaded for this event.</td>
                      </tr>
                    ) : (
                      photos.map((photo) => (
                        <tr key={photo.id} className="hover:bg-stone-50/50 transition">
                          <td className="px-5 py-4 font-medium text-[#2D2D2D] max-w-[280px] truncate">
                            <a href={photo.public_url} target="_blank" rel="noreferrer" className="hover:text-[#D67D5C] underline">
                              {photo.original_filename}
                            </a>
                          </td>
                          <td className="px-5 py-4">
                            {photo.face_indexed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                Indexed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Processing
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-[#2D2D2D]">{photo.faces_count}</td>
                          <td className="px-5 py-4 text-right font-semibold text-[#94492c]">
                            {photo.face_indexed ? `${photo.processing_time.toFixed(2)}s` : "—"}
                          </td>
                          <td className="px-5 py-4 text-[#827970] text-xs">
                            {new Date(photo.uploaded_at).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === "guests" && (
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                    <tr className="text-xs font-bold text-[#827970] uppercase">
                      <th className="px-5 py-3.5">Guest</th>
                      <th className="px-5 py-3.5">Selfie status</th>
                      <th className="px-5 py-3.5 text-right">Matches</th>
                      <th className="px-5 py-3.5">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {guests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-[#827970]">No guests registered yet.</td>
                      </tr>
                    ) : (
                      guests.map((g) => (
                        <tr key={g.id} className="hover:bg-stone-50/50 transition">
                          <td className="px-5 py-4">
                            <p className="font-bold text-[#2D2D2D]">{g.display_name}</p>
                            <p className="text-xs text-[#827970]">{g.email} {g.phone ? `· ${g.phone}` : ""}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {g.selfie_url && (
                                <img
                                  src={g.selfie_url}
                                  alt="Selfie"
                                  className="h-6 w-6 rounded-full object-cover border border-[#EFE6DD]"
                                />
                              )}
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                g.selfie_status === "matched"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : g.selfie_status === "processing"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                  : g.selfie_status === "no_face"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : g.selfie_status === "uploaded"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-stone-100 text-stone-600 border border-stone-200"
                              }`}>
                                {g.selfie_status}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-extrabold text-[#D67D5C]">{g.matches_count}</td>
                          <td className="px-5 py-4 text-[#827970] text-xs">
                            {new Date(g.created_at).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === "queue" && (
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                    <tr className="text-xs font-bold text-[#827970] uppercase">
                      <th className="px-5 py-3.5">Job Type</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-center">Attempts</th>
                      <th className="px-5 py-3.5">Created At</th>
                      <th className="px-5 py-3.5">Logs / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {queueJobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-[#827970]">No recent job history found.</td>
                      </tr>
                    ) : (
                      queueJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-stone-50/50 transition">
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-[#2D2D2D]">{job.job_type}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              job.status === "completed"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : job.status === "processing"
                                ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                : job.status === "pending"
                                ? "bg-stone-100 text-stone-700 border-stone-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-[#2D2D2D]">{job.attempts}</td>
                          <td className="px-5 py-4 text-[#827970] text-xs">
                            {new Date(job.created_at).toLocaleTimeString("en-IN")}
                          </td>
                          <td className="px-5 py-4 max-w-[300px] truncate text-xs text-[#827970]">
                            {job.error_msg ? (
                              <span className="text-red-600 font-semibold">{job.error_msg}</span>
                            ) : job.completed_at ? (
                              `Completed in ${((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000).toFixed(1)}s`
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
