"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
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
    phone: string | null;
    created_at: string;
    selfie_status: string;
    selfie_url: string | null;
    selfie_error: string | null;
    matches_count: number;
    selfies: Array<{
      id: string;
      status: string;
      public_url: string;
      error: string | null;
      matches_count: number;
      matched_photos: Array<{
        photo_id: string;
        public_url: string;
        filename: string;
        similarity: number;
        confidence_tier: string;
      }>;
    }>;
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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "matched" | "processing" | "none">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Photo search & filter state
  const [photoSearchQuery, setPhotoSearchQuery] = useState("");
  const [photoFilter, setPhotoFilter] = useState<"all" | "processing" | "indexed" | "zero" | "has_faces" | "custom">("all");
  const [photoFacesCount, setPhotoFacesCount] = useState<string>("");
  const [photoPage, setPhotoPage] = useState(1);

  // Reset photo page when filter/search changes
  useEffect(() => {
    setPhotoPage(1);
  }, [photoSearchQuery, photoFilter, photoFacesCount]);

  // Guest rematch state
  const [rematchingGuestId, setRematchingGuestId] = useState<string | null>(null);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);

  const handleRematchGuest = async (guestId: string) => {
    if (!eventId) return;
    setRematchingGuestId(guestId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/rematch-guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ guestId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to rematch guest");
      fetchDiagnostics();
    } catch (err: any) {
      alert(`Error rematching guest: ${err.message}`);
    } finally {
      setRematchingGuestId(null);
    }
  };

  // Rematch everyone state
  const [rematchingEveryone, setRematchingEveryone] = useState(false);

  const handleRematchEveryone = async () => {
    if (!confirm("Are you sure you want to rematch all guests for this event? This clears all current guest matches and re-queues all selfies for high-priority processing.")) {
      return;
    }
    setRematchingEveryone(true);
    setRestartMsg(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/rematch-everyone`, {
        method: "POST"
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to rematch everyone");
      setRestartMsg("Successfully re-queued all guest selfies for rematching!");
      fetchDiagnostics();
    } catch (err: any) {
      alert(`Error rematching everyone: ${err.message}`);
    } finally {
      setRematchingEveryone(false);
    }
  };

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

  const filteredGuests = guests.filter((g) => {
    // Search query match
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = g.display_name?.toLowerCase().includes(searchLower) || false;
    const phoneMatch = g.phone?.toLowerCase().includes(searchLower) || false;
    const matchesSearch = nameMatch || phoneMatch;

    if (!matchesSearch) return false;

    // Status filter match
    if (statusFilter === "all") return true;
    if (statusFilter === "none") return g.selfie_status === "none";
    if (statusFilter === "processing") {
      return g.selfie_status === "processing" || g.selfie_status === "uploaded";
    }
    if (statusFilter === "matched") {
      return g.selfie_status === "matched" && g.matches_count > 0;
    }
    if (statusFilter === "failed") {
      return (
        g.selfie_status === "no_face" ||
        (g.selfie_status === "matched" && g.matches_count === 0) ||
        !!g.selfie_error
      );
    }
    return true;
  });

  const totalItems = filteredGuests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filter and Paginate Photos
  const filteredPhotos = photos.filter((photo) => {
    // Search query match
    if (photoSearchQuery) {
      const searchLower = photoSearchQuery.toLowerCase();
      if (!photo.original_filename?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status / faces filter match
    if (photoFilter === "all") return true;
    if (photoFilter === "processing") return !photo.face_indexed;
    if (photoFilter === "indexed") return photo.face_indexed;
    if (photoFilter === "zero") return photo.face_indexed && photo.faces_count === 0;
    if (photoFilter === "has_faces") return photo.face_indexed && photo.faces_count > 0;
    if (photoFilter === "custom") {
      if (!photo.face_indexed) return false;
      const targetCount = parseInt(photoFacesCount, 10);
      if (isNaN(targetCount)) return true; // Show all if no valid number entered
      return photo.faces_count === targetCount;
    }
    return true;
  });

  const totalPhotosItems = filteredPhotos.length;
  const totalPhotosPages = Math.ceil(totalPhotosItems / itemsPerPage);
  const paginatedPhotos = filteredPhotos.slice(
    (photoPage - 1) * itemsPerPage,
    photoPage * itemsPerPage
  );

  // Simple pagination window helper
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

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
              onClick={handleRematchEveryone}
              disabled={rematchingEveryone}
              className="rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-2.5 text-xs font-semibold text-purple-700 active:scale-[0.98] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {rematchingEveryone ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-700" />
                  Refinding Everyone...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">sync</span>
                  Refind Everyone
                </>
              )}
            </button>
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
              { id: "photos", label: `Uploaded Photos (${stats.photos.total})`, icon: "image" },
              { id: "guests", label: `Event Guests (${stats.guests.total})`, icon: "people" },
              { id: "queue", label: `Queue Logs (${queueJobs.length})`, icon: "analytics" },
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
                <div className="space-y-0">
                  {/* Search and Filters Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#FAF5EF]/50 p-4 border-b border-[#EFE6DD]">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#827970]">
                        <span className="material-symbols-outlined text-[18px]">search</span>
                      </span>
                      <input
                        type="text"
                        placeholder="Search filename..."
                        id="photo-search-input"
                        value={photoSearchQuery}
                        onChange={(e) => setPhotoSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DED5CC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D67D5C] focus:border-[#D67D5C] placeholder-[#A0968C] text-[#2D2D2D]"
                      />
                      {photoSearchQuery && (
                        <button
                          onClick={() => setPhotoSearchQuery("")}
                          id="clear-photo-search"
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#827970] hover:text-[#2D2D2D]"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>

                    {/* Filter Chips */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                      {[
                        { id: "all", label: "All", count: photos.length },
                        {
                          id: "processing",
                          label: "Processing",
                          count: photos.filter((p) => !p.face_indexed).length,
                          color: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200",
                        },
                        {
                          id: "indexed",
                          label: "Indexed",
                          count: photos.filter((p) => p.face_indexed).length,
                          color: "text-green-700 bg-green-50 hover:bg-green-100 border-green-200",
                        },
                        {
                          id: "zero",
                          label: "0 Faces",
                          count: photos.filter((p) => p.face_indexed && p.faces_count === 0).length,
                          color: "text-red-700 bg-red-50 hover:bg-red-100 border-red-200",
                        },
                        {
                          id: "has_faces",
                          label: "Has Faces",
                          count: photos.filter((p) => p.face_indexed && p.faces_count > 0).length,
                          color: "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200",
                        },
                        {
                          id: "custom",
                          label: "Custom Faces",
                          count: photos.filter((p) => p.face_indexed && p.faces_count === parseInt(photoFacesCount, 10)).length,
                          color: "text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200",
                        },
                      ].map((chip) => {
                        const active = photoFilter === chip.id;
                        const countText = (chip.id === "custom" && photoFacesCount === "") ? "—" : chip.count;
                        return (
                          <button
                            key={chip.id}
                            id={`photo-filter-btn-${chip.id}`}
                            onClick={() => setPhotoFilter(chip.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                              active
                                ? chip.id === "zero"
                                  ? "bg-red-600 border-red-600 text-white"
                                  : chip.id === "indexed"
                                  ? "bg-green-600 border-green-600 text-white"
                                  : chip.id === "processing"
                                  ? "bg-amber-600 border-amber-600 text-white"
                                  : chip.id === "has_faces"
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : chip.id === "custom"
                                  ? "bg-purple-600 border-purple-600 text-white"
                                  : "bg-[#D67D5C] border-[#D67D5C] text-white"
                                : chip.color || "bg-white border-[#DED5CC] text-[#625D58] hover:bg-[#FDF8F1]"
                            }`}
                          >
                            <span>{chip.label}</span>
                            <span
                              className={`inline-block rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {countText}
                            </span>
                          </button>
                        );
                      })}

                      {/* Custom Faces Number Input */}
                      {photoFilter === "custom" && (
                        <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 animate-fade-in">
                          <span className="text-[11px] font-semibold text-purple-800">Count:</span>
                          <input
                            type="number"
                            min="0"
                            id="photo-custom-faces-input"
                            value={photoFacesCount}
                            onChange={(e) => setPhotoFacesCount(e.target.value)}
                            placeholder="e.g. 3"
                            className="w-12 text-center text-xs font-bold bg-white border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-purple-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>

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
                      {paginatedPhotos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-[#827970]">No photos match your criteria.</td>
                        </tr>
                      ) : (
                        paginatedPhotos.map((photo) => (
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

                  {/* Photo Pagination Controls */}
                  {totalPhotosPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[#EFE6DD] bg-[#FAF5EF]/30 px-5 py-4">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => setPhotoPage((p) => Math.max(p - 1, 1))}
                          disabled={photoPage === 1}
                          id="photo-pagination-prev-mobile"
                          className="relative inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-4 py-2 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] transition disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPhotoPage((p) => Math.min(p + 1, totalPhotosPages))}
                          disabled={photoPage === totalPhotosPages}
                          id="photo-pagination-next-mobile"
                          className="relative ml-3 inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-4 py-2 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] transition disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-[#827970]">
                            Showing <span className="font-semibold text-[#2D2D2D]">{((photoPage - 1) * itemsPerPage) + 1}</span> to{" "}
                            <span className="font-semibold text-[#2D2D2D]">
                              {Math.min(photoPage * itemsPerPage, totalPhotosItems)}
                            </span>{" "}
                            of <span className="font-semibold text-[#2D2D2D]">{totalPhotosItems}</span> photos
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                            <button
                              onClick={() => setPhotoPage((p) => Math.max(p - 1, 1))}
                              disabled={photoPage === 1}
                              id="photo-pagination-prev"
                              className="relative inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-3 py-2 text-[#827970] hover:bg-stone-50 transition disabled:opacity-40"
                            >
                              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                            </button>
                            {(() => {
                              const pages = [];
                              const maxVisible = 5;
                              let start = Math.max(1, photoPage - 2);
                              let end = Math.min(totalPhotosPages, start + maxVisible - 1);
                              if (end - start + 1 < maxVisible) {
                                start = Math.max(1, end - maxVisible + 1);
                              }
                              for (let i = start; i <= end; i++) {
                                pages.push(i);
                              }
                              return pages;
                            })().map((pageNum) => {
                              const active = pageNum === photoPage;
                              return (
                                <button
                                  key={pageNum}
                                  id={`photo-pagination-page-${pageNum}`}
                                  onClick={() => setPhotoPage(pageNum)}
                                  className={`relative inline-flex items-center rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                                    active
                                      ? "bg-[#D67D5C] text-white focus:outline-none"
                                      : "border border-[#DED5CC] bg-white text-[#625D58] hover:bg-stone-50"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setPhotoPage((p) => Math.min(p + 1, totalPhotosPages))}
                              disabled={photoPage === totalPhotosPages}
                              id="photo-pagination-next"
                              className="relative inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-3 py-2 text-[#827970] hover:bg-stone-50 transition disabled:opacity-40"
                            >
                              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "guests" && (
                <div className="space-y-0">
                  {/* Search and Filters Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#FAF5EF]/50 p-4 border-b border-[#EFE6DD]">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#827970]">
                        <span className="material-symbols-outlined text-[18px]">search</span>
                      </span>
                      <input
                        type="text"
                        placeholder="Search name or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DED5CC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D67D5C] focus:border-[#D67D5C] placeholder-[#A0968C] text-[#2D2D2D]"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#827970] hover:text-[#2D2D2D]"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>

                    {/* Filter Chips */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {[
                        { id: "all", label: "All", count: guests.length },
                        {
                          id: "failed",
                          label: "Failed Matching",
                          count: guests.filter(
                            (g) =>
                              g.selfie_status === "no_face" ||
                              (g.selfie_status === "matched" && g.matches_count === 0) ||
                              !!g.selfie_error
                          ).length,
                          color: "text-red-700 bg-red-50 hover:bg-red-100 border-red-200 active:border-red-400",
                        },
                        {
                          id: "matched",
                          label: "Matched",
                          count: guests.filter((g) => g.selfie_status === "matched" && g.matches_count > 0).length,
                          color: "text-green-700 bg-green-50 hover:bg-green-100 border-green-200 active:border-green-400",
                        },
                        {
                          id: "processing",
                          label: "Processing",
                          count: guests.filter((g) => g.selfie_status === "processing" || g.selfie_status === "uploaded").length,
                          color: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 active:border-amber-400",
                        },
                        {
                          id: "none",
                          label: "No Selfie",
                          count: guests.filter((g) => g.selfie_status === "none").length,
                          color: "text-stone-700 bg-stone-50 hover:bg-stone-100 border-stone-200 active:border-stone-400",
                        },
                      ].map((chip) => {
                        const active = statusFilter === chip.id;
                        return (
                          <button
                            key={chip.id}
                            onClick={() => setStatusFilter(chip.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                              active
                                ? chip.id === "failed"
                                  ? "bg-red-600 border-red-600 text-white"
                                  : chip.id === "matched"
                                  ? "bg-green-600 border-green-600 text-white"
                                  : chip.id === "processing"
                                  ? "bg-amber-600 border-amber-600 text-white"
                                  : "bg-[#D67D5C] border-[#D67D5C] text-white"
                                : chip.color || "bg-white border-[#DED5CC] text-[#625D58] hover:bg-[#FDF8F1]"
                            }`}
                          >
                            <span>{chip.label}</span>
                            <span
                              className={`inline-block rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {chip.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                      <tr className="text-xs font-bold text-[#827970] uppercase">
                        <th className="px-5 py-3.5">Guest</th>
                        <th className="px-5 py-3.5">Selfie status</th>
                        <th className="px-5 py-3.5 text-right">Matches</th>
                        <th className="px-5 py-3.5">Registered</th>
                        <th className="px-5 py-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE6DD]">
                      {paginatedGuests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-[#827970]">No guests match your criteria.</td>
                        </tr>
                      ) : (
                        paginatedGuests.map((g) => (
                          <Fragment key={g.id}>
                            <tr className="hover:bg-stone-50/50 transition border-b border-[#EFE6DD]">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  {/* Toggle Collapse Button */}
                                  <button
                                    onClick={() => setExpandedGuestId(expandedGuestId === g.id ? null : g.id)}
                                    className="text-[#827970] hover:text-[#2D2D2D] transition flex items-center justify-center h-6 w-6 rounded-md hover:bg-stone-100"
                                    id={`toggle-guest-details-${g.id}`}
                                    title="Toggle Details"
                                  >
                                    <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedGuestId === g.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                      chevron_right
                                    </span>
                                  </button>
                                  {g.selfie_url ? (
                                    <a
                                      href={g.selfie_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="group relative cursor-pointer shrink-0"
                                      title="Click to view full selfie"
                                    >
                                      <img
                                        src={g.selfie_url}
                                        alt="Selfie"
                                        className="h-10 w-10 rounded-full object-cover border border-[#EFE6DD] shadow-xs group-hover:scale-110 transition duration-200"
                                      />
                                      <span className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-[12px] font-bold">zoom_in</span>
                                      </span>
                                    </a>
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-stone-100 border border-[#EFE6DD] flex items-center justify-center text-[#827970] shrink-0">
                                      <span className="material-symbols-outlined text-[18px]">person</span>
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-[#2D2D2D]">{g.display_name}</p>
                                    <p className="text-xs text-[#827970]">{g.phone || "No phone number"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      g.selfie_status === "matched"
                                        ? g.matches_count > 0
                                          ? "bg-green-50 text-green-700 border border-green-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                        : g.selfie_status === "processing" || g.selfie_status === "uploaded"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                        : g.selfie_status === "no_face"
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : "bg-stone-100 text-stone-600 border border-stone-200"
                                    }`}>
                                      {g.selfie_status === "matched" && g.matches_count === 0 ? "no_matches" : g.selfie_status}
                                    </span>
                                  </div>
                                  {g.selfie_status === "no_face" && (
                                    <p className="text-[11px] text-red-500 font-medium">
                                      Failed: No face detected or low quality.
                                    </p>
                                  )}
                                  {g.selfie_status === "matched" && g.matches_count === 0 && (
                                    <p className="text-[11px] text-amber-600 font-medium">
                                      0 matches: Selfie OK but 0 photos matched.
                                    </p>
                                  )}
                                  {g.selfie_error && (
                                    <p className="text-[11px] text-red-500 font-mono mt-0.5 bg-red-50/50 p-1 rounded border border-red-100 max-w-[250px] truncate" title={g.selfie_error}>
                                      Error: {g.selfie_error}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right font-extrabold text-[#D67D5C]">{g.matches_count}</td>
                              <td className="px-5 py-4 text-[#827970] text-xs">
                                {new Date(g.created_at).toLocaleString("en-IN")}
                              </td>
                              <td className="px-5 py-4 text-center">
                                {g.selfie_url ? (
                                  <button
                                    onClick={() => handleRematchGuest(g.id)}
                                    disabled={rematchingGuestId === g.id}
                                    id={`rematch-btn-${g.id}`}
                                    className="inline-flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition active:scale-[0.98]"
                                    title="Rematch Selfie"
                                  >
                                    {rematchingGuestId === g.id ? (
                                      <>
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-700" />
                                        Refinding...
                                      </>
                                    ) : (
                                      <>
                                        <span className="material-symbols-outlined text-[14px]">sync</span>
                                        Refind
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-[#827970]">—</span>
                                )}
                              </td>
                            </tr>
                            {expandedGuestId === g.id && (
                              <tr key={`expanded-${g.id}`} className="bg-[#FAF5EF]/40 border-t border-[#EFE6DD]">
                                <td colSpan={5} className="px-8 py-5">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-[#EFE6DD] pb-2">
                                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#94492c] flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">photo_library</span>
                                        Guest Selfies & Biometric Matches ({g.selfies?.length || 0} upload{(g.selfies?.length || 0) === 1 ? '' : 's'})
                                      </h4>
                                    </div>

                                    {(!g.selfies || g.selfies.length === 0) ? (
                                      <p className="text-xs text-[#827970] italic">No selfies uploaded by this guest yet.</p>
                                    ) : (
                                      <div className="divide-y divide-[#EFE6DD]/80 space-y-4">
                                        {g.selfies.map((selfie, sIdx) => (
                                          <div key={selfie.id} className="flex flex-col lg:flex-row gap-6 pt-4 first:pt-0">
                                            {/* Selfie column */}
                                            <div className="flex items-start gap-3 w-full lg:w-72 shrink-0">
                                              <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-[#EFE6DD] shadow-xs group shrink-0">
                                                <img
                                                  src={selfie.public_url}
                                                  alt={`Selfie #${sIdx + 1}`}
                                                  className="h-full w-full object-cover group-hover:scale-110 transition duration-200"
                                                />
                                                <a
                                                  href={selfie.public_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                                  title="View original selfie"
                                                >
                                                  <span className="material-symbols-outlined text-white text-[14px] font-bold">zoom_in</span>
                                                </a>
                                              </div>
                                              <div className="space-y-1">
                                                <p className="text-xs font-bold text-[#2D2D2D]">Selfie Photo #{sIdx + 1}</p>
                                                <div className="flex items-center gap-1.5">
                                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    selfie.status === "matched"
                                                      ? selfie.matches_count > 0
                                                        ? "bg-green-50 text-green-700 border border-green-200"
                                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                                      : selfie.status === "processing" || selfie.status === "uploaded"
                                                      ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                                      : selfie.status === "no_face"
                                                      ? "bg-red-50 text-red-700 border border-red-200"
                                                      : "bg-stone-100 text-stone-600 border border-stone-200"
                                                  }`}>
                                                    {selfie.status === "matched" && selfie.matches_count === 0 ? "no_matches" : selfie.status}
                                                  </span>
                                                </div>
                                                <p className="text-[11px] text-[#827970] font-medium">
                                                  {selfie.matches_count} photo{(selfie.matches_count === 1 ? '' : 's')} matched
                                                </p>
                                                {selfie.error && (
                                                  <p className="text-[10px] text-red-500 font-mono mt-0.5 max-w-[200px] truncate" title={selfie.error}>
                                                    Error: {selfie.error}
                                                  </p>
                                                )}
                                              </div>
                                            </div>

                                            {/* Matches column */}
                                            <div className="flex-1">
                                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#827970] mb-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">face</span>
                                                Matched Event Photos
                                              </p>
                                              {(!selfie.matched_photos || selfie.matched_photos.length === 0) ? (
                                                <p className="text-xs text-[#827970] italic">No event photos matched to this selfie yet.</p>
                                              ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                                  {selfie.matched_photos.map((mPhoto) => (
                                                    <div key={mPhoto.photo_id} className="flex items-center gap-2.5 bg-white rounded-xl border border-[#EFE6DD] p-2 shadow-2xs hover:shadow-xs transition">
                                                      <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-[#EFE6DD] shrink-0 group">
                                                        <img
                                                          src={mPhoto.public_url}
                                                          alt="Matched Photo"
                                                          className="h-full w-full object-cover group-hover:scale-105 transition"
                                                        />
                                                        <a
                                                          href={mPhoto.public_url}
                                                          target="_blank"
                                                          rel="noreferrer"
                                                          className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                                          title="View matched photo"
                                                        >
                                                          <span className="material-symbols-outlined text-white text-[12px] font-bold">zoom_in</span>
                                                        </a>
                                                      </div>
                                                      <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-[#2D2D2D] truncate" title={mPhoto.filename}>
                                                          {mPhoto.filename}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                          <p className="text-[10px] font-bold text-[#D67D5C]">
                                                            {Math.round(mPhoto.similarity * 100)}% Match
                                                          </p>
                                                          <span className={`inline-block rounded-full px-1.5 py-0.1 text-[9px] font-bold uppercase tracking-wider ${
                                                            mPhoto.confidence_tier === 'high'
                                                              ? 'bg-green-50 text-green-700 border border-green-200'
                                                              : mPhoto.confidence_tier === 'medium'
                                                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                              : 'bg-red-50 text-red-700 border border-red-200'
                                                          }`}>
                                                            {mPhoto.confidence_tier}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[#EFE6DD] bg-[#FAF5EF]/30 px-5 py-4">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-4 py-2 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] transition disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative ml-3 inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-4 py-2 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] transition disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-[#827970]">
                            Showing <span className="font-semibold text-[#2D2D2D]">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                            <span className="font-semibold text-[#2D2D2D]">
                              {Math.min(currentPage * itemsPerPage, totalItems)}
                            </span>{" "}
                            of <span className="font-semibold text-[#2D2D2D]">{totalItems}</span> guests
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-3 py-2 text-[#827970] hover:bg-stone-50 transition disabled:opacity-40"
                            >
                              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                            </button>
                            {getPageNumbers().map((pageNum) => {
                              const active = pageNum === currentPage;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`relative inline-flex items-center rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                                    active
                                      ? "bg-[#D67D5C] text-white focus:outline-none"
                                      : "border border-[#DED5CC] bg-white text-[#625D58] hover:bg-stone-50"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center rounded-xl border border-[#DED5CC] bg-white px-3 py-2 text-[#827970] hover:bg-stone-50 transition disabled:opacity-40"
                            >
                              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
