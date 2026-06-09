"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Event as EventRecord, EventPhoto, Guest } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getOptimizedStorageUrl } from "@/lib/image-optimizer";
import { PlanLimitModal } from "./plan-limit-modal";

/* ── Reusable Mini Stat Card ────────────────────── */
function MiniStat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2D2D2D]/6 bg-white/60 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(214,125,92,0.06)] sm:p-5">
      <div className="mb-4 flex justify-between text-[#9A9087] sm:mb-5">
        <p className="text-xs">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDF8F1]">
          <span className="material-symbols-outlined text-[18px] text-[#D67D5C]">{icon}</span>
        </span>
      </div>
      <p className="text-xl font-semibold tracking-[-0.05em] sm:text-2xl">{value}</p>
      <p className="mt-2 text-xs text-[#827970]">{note}</p>
    </div>
  );
}

/* ── formatBytes Utility ─────────────────────────── */
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};


/* ═══════════════════════════════════════════════════
   Event Overview Panel
   ═══════════════════════════════════════════════════ */
export function EventOverviewPanel({
  event,
  photos,
  guests,
  photoCount,
}: {
  event: EventRecord;
  photos: EventPhoto[];
  guests: Guest[];
  photoCount: number;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [localPhotos, setLocalPhotos] = useState<EventPhoto[]>(photos);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(photos.length === 50);

  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    const getSession = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("plan, disabled_features")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUserPlan(profile.plan || "free");
        }

        const { data: systemSettings } = await (supabase as any)
          .from("system_settings")
          .select("value")
          .eq("key", "disabled_features")
          .maybeSingle();

        const userDisabled = profile?.disabled_features || [];
        const globalDisabled = systemSettings?.value || [];
        setDisabledFeatures([...new Set([...userDisabled, ...globalDisabled])]);
      }
    };
    getSession();
  }, []);

  const isOwner = currentUser && event.owner_id === currentUser.id;

  const fetchCollaborators = async () => {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from("event_collaborators")
      .select("*")
      .eq("event_id", event.id);
    if (!error && data) {
      setCollaborators(data);
      window.dispatchEvent(new CustomEvent("collab-count-update", { detail: { count: data.length } }));
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchCollaborators();
    }
  }, [isOwner]);

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    if (collaborators.length >= 3) {
      setInviteError("You can add a maximum of 3 collaborators.");
      return;
    }

    if (collaborators.some(c => c.email === email)) {
      setInviteError("This email already has access.");
      return;
    }

    setInviteLoading(true);
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("event_collaborators")
      .insert({ event_id: event.id, email })
      .select()
      .single();

    setInviteLoading(false);
    if (error) {
      setInviteError(error.message);
    } else {
      setInviteEmail("");
      fetchCollaborators();
    }
  };

  const handleRemoveCollaborator = async (id: string) => {
    if (!confirm("Are you sure you want to remove access for this photographer?")) return;
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("event_collaborators")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to remove collaborator: " + error.message);
    } else {
      fetchCollaborators();
    }
  };

  useEffect(() => {
    setLocalPhotos(photos);
    setHasMore(photos.length === 50);
  }, [photos]);

  useEffect(() => {
    const handler = () => setIsCollabModalOpen(true);
    window.addEventListener("open-collab-modal", handler);
    return () => window.removeEventListener("open-collab-modal", handler);
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("event_photos")
        .select("*")
        .eq("event_id", event.id)
        .order("uploaded_at", { ascending: false })
        .range(localPhotos.length, localPhotos.length + 49);

      if (!error && data) {
        setLocalPhotos((prev) => [...prev, ...(data as EventPhoto[])]);
        setHasMore(data.length === 50);
      }
    } catch (err) {
      console.error("Failed to load more photos:", err);
    } finally {
      setLoadingMore(false);
    }
  };




  const totalSizeBytes = localPhotos.reduce((acc, p) => acc + (p.file_size_bytes ?? 0), 0);
  const totalSizeFormatted = formatBytes(totalSizeBytes);
  const rootHref = `/dashboard/events/${event.id}`;

  const filteredPhotos = localPhotos.filter((photo) =>
    (photo.original_filename ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeletePhoto = async (photo: EventPhoto) => {
    if (!confirm("Are you sure you want to permanently delete this photo?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/photos?id=${photo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete photo");
      }
      setLocalPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setSelectedPhoto(null);
      router.refresh();
    } catch (err: any) {
      alert("Failed to delete photo: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
        <MiniStat label="Total uploads" value={photoCount.toLocaleString()} note="Photos in this event" icon="photo_camera" />
        <MiniStat label="Guest joins" value={guests.length.toLocaleString()} note="Registered guests" icon="groups" />
        <MiniStat label="QR Status" value={event.qr_active ? "Active" : "Paused"} note={event.qr_active ? "Guests can scan" : "QR paused"} icon="qr_code_2" />
      </div>

      {/* Event Storage utilization */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D67D5C]/10 text-[#D67D5C]">
            <span className="material-symbols-outlined text-[20px]">cloud</span>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#2D2D2D]">Event Storage Allocation</h3>
            <p className="mt-0.5 text-xs text-[#827970]">{totalSizeFormatted} utilized by {photoCount} photos</p>
          </div>
        </div>
        <div className="w-full sm:max-w-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Progress (Max 10 GB)</span>
            <span>{((totalSizeBytes / (10 * 1024 * 1024 * 1024)) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F0EBE4]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261] transition-all"
              style={{ width: `${Math.min(100, (totalSizeBytes / (10 * 1024 * 1024 * 1024)) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Dynamic Folders Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#766D66]">Workspace Folders</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Event Photos", icon: "folder", count: `${photoCount} items`, size: totalSizeFormatted, color: "text-[#D67D5C] bg-[#D67D5C]/8", href: `${rootHref}/gallery` },
            { name: "Guest Database", icon: "folder_shared", count: `${guests.length} registered`, size: "WhatsApp active", color: "text-[#F4A261] bg-[#F4A261]/8", href: `${rootHref}/attendees` },
            { name: "QR Access Code", icon: "qr_code_2", count: event.qr_active ? "Active" : "Paused", size: "Print material", color: "text-green-600 bg-green-50", href: `${rootHref}/qr` },
            { name: "Workspace Settings", icon: "folder_open", count: "Branding & Privacy", size: "Config files", color: "text-slate-600 bg-slate-100", href: `${rootHref}/settings` },
          ].map((folder) => (
            <Link
              key={folder.name}
              href={folder.href}
              className="group flex flex-col justify-between rounded-2xl border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#D67D5C]/35 hover:shadow-[0_12px_32px_rgba(214,125,92,0.08)]"
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${folder.color} transition-transform duration-300 group-hover:scale-105`}>
                  <span className="material-symbols-outlined text-[24px]">{folder.icon}</span>
                </span>
                <span className="material-symbols-outlined text-[18px] text-[#A69C93] opacity-0 transition-opacity duration-300 group-hover:opacity-100">arrow_forward</span>
              </div>
              <div className="mt-5">
                <h4 className="text-sm font-semibold tracking-tight text-[#2D2D2D]">{folder.name}</h4>
                <p className="mt-1 text-[11px] text-[#827970]">{folder.count} · {folder.size}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dynamic File Explorer */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#2D2D2D]/5 pb-4 mb-5">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#2D2D2D]">Files Explorer</h3>
            <p className="mt-0.5 text-xs text-[#827970]">Interactive workspace for photo uploads and client delivery details.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <label className="flex h-9 w-full sm:w-48 items-center gap-2 rounded-lg border border-[#2D2D2D]/8 bg-white/70 px-2.5 text-[#8E877F] focus-within:border-[#D67D5C]/40 focus-within:shadow-[0_0_0_3px_rgba(214,125,92,0.04)] transition-all">
              <span className="material-symbols-outlined text-[16px]">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="bg-transparent text-xs text-[#2D2D2D] outline-none placeholder:text-[#8E877F] w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#8E877F] hover:text-[#2D2D2D]">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </label>

            {/* List / Grid View Toggles */}
            <div className="flex items-center gap-0.5 rounded-lg bg-[#F0EBE4] p-0.5 border border-[#2D2D2D]/5">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${viewMode === "grid" ? "bg-white text-[#D67D5C] shadow-xs" : "text-[#827970] hover:bg-white/40"}`}
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${viewMode === "list" ? "bg-white text-[#D67D5C] shadow-xs" : "text-[#827970] hover:bg-white/40"}`}
              >
                <span className="material-symbols-outlined text-[18px]">list</span>
              </button>
            </div>
          </div>
        </div>

        {/* File display */}
        {filteredPhotos.length === 0 ? (
          <div className="py-12 text-center text-[#827970] text-sm">
            <span className="material-symbols-outlined text-3xl text-[#D67D5C]/30 block mb-2">image</span>
            No matching files found.
          </div>
        ) : (
          <div className="relative">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-[#2D2D2D]/5 transition-all hover:-translate-y-0.5 hover:shadow-md ${selectedPhoto?.id === photo.id ? "ring-2 ring-[#D67D5C]" : ""}`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url("${getOptimizedStorageUrl(photo.thumb_url || photo.public_url, { quality: 75 })}")` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="truncate text-[10px] font-medium text-white">{photo.original_filename}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#2D2D2D]">
                  <thead className="bg-gradient-to-r from-[#FCF9F5] to-[#FDF8F3] text-[10px] uppercase tracking-wider text-[#92877F]">
                    <tr>
                      <th className="px-4 py-3">File Name</th>
                      <th className="px-4 py-3">File Size</th>
                      <th className="px-4 py-3">Mime Type</th>
                      <th className="px-4 py-3">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPhotos.map((photo) => (
                      <tr
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        className={`border-b border-[#2D2D2D]/5 transition-colors cursor-pointer hover:bg-[#FDF8F1]/60 ${selectedPhoto?.id === photo.id ? "bg-[#FDF8F1] font-semibold" : ""}`}
                      >
                        <td className="px-4 py-3 font-medium flex items-center gap-2 truncate max-w-[200px]">
                          <span className="material-symbols-outlined text-[16px] text-[#827970]">image</span>
                          <span>{photo.original_filename}</span>
                        </td>
                        <td className="px-4 py-3 text-[#766D66]">{formatBytes(photo.file_size_bytes ?? 0)}</td>
                        <td className="px-4 py-3 text-[#766D66]">{photo.mime_type ?? "image/jpeg"}</td>
                        <td className="px-4 py-3 text-[#827970]">
                          {new Date(photo.uploaded_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Load More button */}
        {!searchQuery && hasMore && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-xl border border-[#2D2D2D]/8 bg-white px-6 py-2.5 text-xs font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] hover:border-[#D67D5C]/30 active:scale-[0.98] disabled:opacity-50"
            >
              {loadingMore ? (
                <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Loading...</>
              ) : (
                <><span className="material-symbols-outlined text-[16px]">add</span> Load 50 More Photos</>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Main info card */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-7">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Event workspace details</h2>
        <p className="mt-1 text-xs text-[#827970]">Monitor your photo archives and deliver photos to guests via QR code.</p>
        <div className="mt-5 space-y-2 border-t border-[#2D2D2D]/5 pt-5">
          {event.venue && (
            <div className="flex items-center gap-2 text-xs text-[#827970]">
              <span className="material-symbols-outlined text-[15px]">location_on</span>
              <span>{event.venue}</span>
            </div>
          )}
          {event.event_date && (
            <div className="flex items-center gap-2 text-xs text-[#827970]">
              <span className="material-symbols-outlined text-[15px]">calendar_today</span>
              <span>{new Date(event.event_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          )}
          {event.admin_name && (
            <div className="flex items-center gap-2 text-xs text-[#827970]">
              <span className="material-symbols-outlined text-[15px]">person</span>
              <span>Managed by {event.admin_name}</span>
            </div>
          )}
        </div>
      </section>

      {/* File Detail Sidebar (Slide-out panel) */}
      {selectedPhoto && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm border-l border-[#2D2D2D]/8 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl flex-col animate-slide-in">
          <div className="flex items-center justify-between border-b border-[#2D2D2D]/5 pb-4">
            <h3 className="text-sm font-semibold text-[#2D2D2D] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">info</span>
              File Details
            </h3>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#FDF8F1] text-[#625D58] border border-[#2D2D2D]/5 transition"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Image Preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#2D2D2D]/5 bg-[#FDF8F1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOptimizedStorageUrl(selectedPhoto.medium_url || selectedPhoto.public_url, { quality: 80 })}
                alt={selectedPhoto.original_filename || "Preview"}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Properties List */}
            <div className="space-y-3.5 text-xs">
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">File name</p>
                <p className="mt-1 font-medium text-[#2D2D2D] break-all">{selectedPhoto.original_filename}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Size</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">{formatBytes(selectedPhoto.file_size_bytes ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Mime type</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">{selectedPhoto.mime_type || "image/jpeg"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Uploaded</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">
                  {new Date(selectedPhoto.uploaded_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Storage Path</p>
                <p className="mt-1 text-[11px] font-mono text-[#827970] break-all">{selectedPhoto.storage_path}</p>
              </div>
            </div>

            {/* Face matching metadata */}
            <div className="rounded-xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF6F1] p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#B36144]">
                <span className="material-symbols-outlined text-[16px]">face</span>
                AI Face Matching Status
              </div>
              <p className="mt-1.5 text-[#827970] leading-relaxed">
                This image has been indexed and is ready for facial recognition. Guests scanning the event QR can match and receive it instantly on WhatsApp.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-2 border-t border-[#2D2D2D]/5 pt-4 font-sans">
            <a
              href={selectedPhoto.public_url || ""}
              download={selectedPhoto.original_filename || "download"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center rounded-xl border border-[#DED5CC] py-3 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download
            </a>
            <button
              onClick={() => handleDeletePhoto(selectedPhoto)}
              disabled={deleteLoading}
              className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 py-3 text-xs font-semibold text-red-600 active:scale-[0.98] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {deleteLoading ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Plan Limit Modal */}
      {isLimitModalOpen && (
        <PlanLimitModal
          isOpen={isLimitModalOpen}
          onClose={() => setIsLimitModalOpen(false)}
          description="The Free Starter plan does not include event collaborators. Upgrade to the Pro plan to invite other photographers."
        />
      )}

      {/* Collaborators Modal */}
      {isCollabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-md transition-opacity"
            onClick={() => setIsCollabModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg transform overflow-hidden rounded-[28px] border border-[#2D2D2D]/6 bg-white/95 p-6 shadow-2xl backdrop-blur-xl transition-all sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#2D2D2D]/5 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF3EB] text-[#B36144]">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-[#2D2D2D]">Photographer Access</h3>
                  <p className="text-xs text-[#827970] mt-0.5">Manage collaboration for {event.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCollabModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2D2D2D]/8 bg-white text-[#827970] hover:text-[#2D2D2D] transition"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6">
              <p className="text-xs leading-5 text-[#827970]">
                Share this event workspace with other photographers. They can upload photos and view the gallery, but cannot modify settings, access code, or view guests.
              </p>

              {/* Invite Form */}
              <form onSubmit={handleAddCollaborator} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-grow">
                  <input
                    type="email"
                    placeholder="photographer@example.com"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setInviteError(null);
                    }}
                    disabled={inviteLoading || collaborators.length >= 3}
                    className="h-10 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)] disabled:opacity-50"
                  />
                  {inviteError && (
                    <p className="mt-1.5 text-[10px] font-semibold text-red-600">
                      {inviteError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim() || collaborators.length >= 3}
                  className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-5 text-xs font-semibold text-white shadow-md hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {inviteLoading ? (
                    <><span className="material-symbols-outlined text-[14px] animate-spin">sync</span> Adding...</>
                  ) : (
                    <>Add ({collaborators.length}/3)</>
                  )}
                </button>
              </form>

              {/* List of collaborators */}
              {collaborators.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-[#2D2D2D]/5 bg-white/40">
                  <table className="w-full text-left text-xs text-[#2D2D2D]">
                    <thead className="bg-[#FCF9F5] text-[10px] uppercase tracking-wider text-[#92877F] border-b border-[#2D2D2D]/5">
                      <tr>
                        <th className="px-4 py-2.5">Email address</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collaborators.map((collab) => (
                        <tr key={collab.id} className="border-b border-[#2D2D2D]/5 last:border-0 hover:bg-[#FDF8F1]/40 transition">
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-[#827970]">person</span>
                            <span>{collab.email}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600">
                              Access Granted
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCollaborator(collab.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                              title="Revoke access"
                            >
                              <span className="material-symbols-outlined text-[16px] block">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#2D2D2D]/8 bg-white/30 p-6 text-center text-[#827970] text-xs">
                  <span className="material-symbols-outlined text-2xl text-[#D67D5C]/40 block mb-1.5">group_add</span>
                  No other photographers have been given access to this event yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Uploads Panel — Real file upload to Supabase Storage
   ═══════════════════════════════════════════════════ */
/* ── Persistent Upload Store ────────────────────── */
interface PersistentQueueItem {
  id: string;
  file: File;
  name: string;
  progress: number;
  state: "Pending" | "Uploading" | "Processed" | "Paused" | "Error";
}

interface UploadStore {
  queue: PersistentQueueItem[];
  isPaused: boolean;
  isUploading: boolean;
  listeners: Set<() => void>;
  isUploadingWorkerRunning: boolean;
}

const globalUploadStores: Record<string, UploadStore> = {};

function getUploadStore(eventId: string): UploadStore {
  if (!globalUploadStores[eventId]) {
    globalUploadStores[eventId] = {
      queue: [],
      isPaused: false,
      isUploading: false,
      listeners: new Set(),
      isUploadingWorkerRunning: false,
    };
  }
  return globalUploadStores[eventId];
}

function updateStore(eventId: string, updates: Partial<Omit<UploadStore, "listeners" | "isUploadingWorkerRunning">>) {
  const store = getUploadStore(eventId);
  Object.assign(store, updates);
  store.listeners.forEach((listener) => listener());
}

async function runUploadWorker(eventId: string, routerRefresh: () => void) {
  const store = getUploadStore(eventId);
  if (store.isUploadingWorkerRunning) return;
  store.isUploadingWorkerRunning = true;
  updateStore(eventId, { isUploading: true });

  const supabase = createClient();

  while (true) {
    if (store.isPaused) {
      break;
    }

    const nextItem = store.queue.find((item) => item.state === "Pending");
    if (!nextItem) {
      break;
    }

    // Mark current item as Uploading
    store.queue = store.queue.map((item) =>
      item.id === nextItem.id ? { ...item, state: "Uploading" as const, progress: 0 } : item
    );
    updateStore(eventId, { queue: store.queue });

    const file = nextItem.file;
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + 15, 90);
      store.queue = store.queue.map((item) =>
        item.id === nextItem.id ? { ...item, progress: prog } : item
      );
      updateStore(eventId, { queue: store.queue });
    }, 150);

    try {
      const { error } = await supabase.storage
        .from("event-photos")
        .upload(storagePath, file, { upsert: true });

      clearInterval(interval);

      if (error) {
        store.queue = store.queue.map((item) =>
          item.id === nextItem.id ? { ...item, progress: 100, state: "Error" as const } : item
        );
        updateStore(eventId, { queue: store.queue });
        continue;
      }

      const { data: urlData } = supabase.storage.from("event-photos").getPublicUrl(storagePath);
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          original_filename: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to insert photo record");
      }

      store.queue = store.queue.map((item) =>
        item.id === nextItem.id ? { ...item, progress: 100, state: "Processed" as const } : item
      );
      updateStore(eventId, { queue: store.queue });
    } catch (err) {
      clearInterval(interval);
      console.error("Upload error:", err);
      store.queue = store.queue.map((item) =>
        item.id === nextItem.id ? { ...item, progress: 100, state: "Error" as const } : item
      );
      updateStore(eventId, { queue: store.queue });
    }
  }

  store.isUploadingWorkerRunning = false;
  updateStore(eventId, { isUploading: false });
  routerRefresh();
}

export function UploadsPanel({ event, photos }: { event: EventRecord; photos: EventPhoto[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const store = getUploadStore(event.id);
  const [uploadQueue, setUploadQueue] = useState<PersistentQueueItem[]>(store.queue);
  const [isPaused, setIsPaused] = useState(store.isPaused);
  const [isUploading, setIsUploading] = useState(store.isUploading);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<EventPhoto[]>(photos);

  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  useEffect(() => {
    const handleStoreChange = () => {
      setUploadQueue(store.queue);
      setIsPaused(store.isPaused);
      setIsUploading(store.isUploading);
    };

    store.listeners.add(handleStoreChange);
    handleStoreChange(); // Sync initial values on mount

    return () => {
      store.listeners.delete(handleStoreChange);
    };
  }, [store]);

  const handleDeletePhoto = async (photo: EventPhoto) => {
    if (!confirm("Are you sure you want to permanently delete this photo?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/photos?id=${photo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete photo");
      }
      setLocalPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setSelectedPhoto(null);
      router.refresh();
    } catch (err: any) {
      alert("Failed to delete photo: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const uploadFiles = (files: FileList) => {
    const fileArray = Array.from(files);

    const queueEntries = fileArray.map((f, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      file: f,
      name: f.name,
      progress: 0,
      state: "Pending" as const,
    }));

    const nextQueue = [...store.queue, ...queueEntries];
    updateStore(event.id, { queue: nextQueue });

    runUploadWorker(event.id, () => router.refresh());
  };

  const handlePause = () => {
    const nextQueue = store.queue.map((item) =>
      item.state === "Pending" ? { ...item, state: "Paused" as const } : item
    );
    updateStore(event.id, { isPaused: true, queue: nextQueue });
  };

  const handleResume = () => {
    const nextQueue = store.queue.map((item) =>
      item.state === "Paused" ? { ...item, state: "Pending" as const } : item
    );
    updateStore(event.id, { isPaused: false, queue: nextQueue });
    runUploadWorker(event.id, () => router.refresh());
  };

  const handleCancel = () => {
    const nextQueue = store.queue.filter(
      (item) => item.state === "Processed" || item.state === "Error"
    );
    updateStore(event.id, { queue: nextQueue, isPaused: false });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  const totalFiles = uploadQueue.length;
  const uploadedCount = uploadQueue.filter((item) => item.state === "Processed").length;
  const failedCount = uploadQueue.filter((item) => item.state === "Error").length;
  const uploadingCount = uploadQueue.filter((item) => item.state === "Uploading").length;
  const pendingCount = uploadQueue.filter((item) => item.state === "Pending").length;
  const pausedCount = uploadQueue.filter((item) => item.state === "Paused").length;

  const overallProgress = totalFiles > 0
    ? Math.round(
      (uploadQueue.reduce((acc, item) => acc + item.progress, 0) / (totalFiles * 100)) * 100
    )
    : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr] sm:gap-5">
      {/* Left Column: Drop zone and Progress Stats */}
      <div className="space-y-4 sm:space-y-5">
        {/* Drop zone */}
        <section
          className={`rounded-[28px] border-2 border-dashed bg-white/50 p-5 backdrop-blur-xl sm:p-8 transition-all ${isDragging ? "border-[#D67D5C] bg-[#D67D5C]/5" : "border-[#D67D5C]/30"
            }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[22px] bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] px-6 text-center sm:min-h-[240px] sm:px-8 cursor-pointer">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D67D5C]/10 text-[#B36144] sm:h-12 sm:w-12">
              <span className="material-symbols-outlined text-[24px] sm:text-[26px]">cloud_upload</span>
            </span>
            <h2 className="mt-4 text-base font-semibold tracking-[-0.04em] sm:mt-5 sm:text-lg">
              {isDragging ? "Drop to upload!" : "Drop original photos here"}
            </h2>
            <p className="mt-2 max-w-sm text-[11px] leading-4 text-[#827970] sm:text-xs sm:leading-5">
              Or click to browse. JPEG, PNG, HEIC files accepted.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(214,125,92,0.25)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:mt-5 sm:px-5 sm:py-2.5"
            >
              Browse Files
            </button>
          </div>
        </section>

        {/* Global Progress Statistics Banner */}
        {uploadQueue.length > 0 && (
          <div className="rounded-[26px] border border-[#D67D5C]/15 bg-gradient-to-br from-[#FFFDFB] to-[#FFF6F0] p-5 backdrop-blur-xl shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#B36144]">Upload Progress</h3>
                <p className="mt-1 text-lg font-semibold text-[#2D2D2D] sm:text-xl">
                  {uploadedCount} of {totalFiles} uploaded
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#827970]">
                  {uploadingCount > 0 && <span className="font-semibold text-[#D67D5C]">{uploadingCount} uploading</span>}
                  {pendingCount > 0 && <span>{pendingCount} pending</span>}
                  {pausedCount > 0 && <span className="font-semibold text-amber-600">{pausedCount} paused</span>}
                  {failedCount > 0 && <span className="font-semibold text-red-500">{failedCount} failed</span>}
                  {uploadedCount > 0 && <span className="text-green-600 font-semibold">{uploadedCount} completed</span>}
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex flex-wrap gap-2">
                {isUploading && !isPaused && (
                  <button
                    onClick={handlePause}
                    type="button"
                    className="flex items-center gap-1.5 rounded-xl border border-[#D67D5C]/30 bg-white px-3 py-2 text-xs font-semibold text-[#B36144] hover:bg-[#FFFDFB] active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">pause</span>
                    Pause Queue
                  </button>
                )}

                {isPaused && (
                  <button
                    onClick={handleResume}
                    type="button"
                    className="flex items-center gap-1.5 rounded-xl bg-[#D67D5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C46A4A] active:scale-[0.98] transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    Resume Queue
                  </button>
                )}

                {(uploadingCount > 0 || pendingCount > 0 || pausedCount > 0) && (
                  <button
                    onClick={handleCancel}
                    type="button"
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    Cancel Remaining
                  </button>
                )}
              </div>
            </div>

            {/* Global Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-medium text-[#766D66] mb-1.5">
                <span>Overall Completion</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EFE6DD]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261] transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Upload queue list */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Upload queue</h2>
        {uploadQueue.length === 0 ? (
          <p className="mt-4 text-xs text-[#827970]">No active uploads.</p>
        ) : (
          <div className="mt-5 max-h-[360px] overflow-y-auto pr-1 space-y-4 sm:mt-6 sm:space-y-5">
            {uploadQueue.map((upload) => (
              <div key={upload.id} className="border-b border-[#2D2D2D]/5 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between gap-2 sm:gap-3">
                  <p className="truncate text-xs font-medium text-[#2D2D2D]">{upload.name}</p>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${upload.state === "Processed" ? "bg-green-50 text-green-600" :
                    upload.state === "Error" ? "bg-red-50 text-red-500" :
                      upload.state === "Paused" ? "bg-amber-50 text-amber-600" :
                        upload.state === "Uploading" ? "bg-[#D67D5C]/10 text-[#B36144]" :
                          "bg-slate-50 text-slate-500"
                    }`}>
                    {upload.state}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 rounded-full bg-[#EFE6DD] sm:mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${upload.state === "Error"
                      ? "bg-red-400"
                      : upload.state === "Paused"
                        ? "bg-amber-400"
                        : "bg-gradient-to-r from-[#D67D5C] to-[#F4A261]"
                      }`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-[#92877F] sm:mt-2">
                  <span>{upload.progress}% complete</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Column: Event photos display */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl xl:col-span-2 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">
            Event photos <span className="ml-2 text-sm font-normal text-[#827970]">({localPhotos.length} total)</span>
          </h2>
          {localPhotos.length > 0 && (
            <Link
              href={`/dashboard/events/${event.id}/gallery`}
              className="flex items-center gap-1 text-xs font-semibold text-[#D67D5C] hover:text-[#C46A4A] transition"
            >
              View all in Gallery
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          )}
        </div>
        {localPhotos.length === 0 ? (
          <p className="mt-4 text-sm text-[#827970]">No photos uploaded yet. Drop files above to get started.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 sm:mt-5 sm:gap-4">
            {localPhotos.slice(0, 8).map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className={`group relative h-32 cursor-pointer overflow-hidden rounded-2xl sm:h-40 border border-[#2D2D2D]/5 transition-all hover:-translate-y-0.5 hover:shadow-md ${selectedPhoto?.id === photo.id ? "ring-2 ring-[#D67D5C]" : ""}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                  style={{ backgroundImage: `url("${getOptimizedStorageUrl(photo.thumb_url || photo.public_url, { quality: 75 })}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* File Detail Sidebar (Slide-out panel) */}
      {selectedPhoto && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm border-l border-[#2D2D2D]/8 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl flex-col animate-slide-in">
          <div className="flex items-center justify-between border-b border-[#2D2D2D]/5 pb-4">
            <h3 className="text-sm font-semibold text-[#2D2D2D] flex items-center gap-1.5 font-sans">
              <span className="material-symbols-outlined text-[18px]">info</span>
              File Details
            </h3>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#FDF8F1] text-[#625D58] border border-[#2D2D2D]/5 transition"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto space-y-5 pr-1 font-sans">
            {/* Image Preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#2D2D2D]/5 bg-[#FDF8F1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOptimizedStorageUrl(selectedPhoto.medium_url || selectedPhoto.public_url, { quality: 80 })}
                alt={selectedPhoto.original_filename || "Preview"}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Properties List */}
            <div className="space-y-3.5 text-xs">
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">File name</p>
                <p className="mt-1 font-medium text-[#2D2D2D] break-all">{selectedPhoto.original_filename}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Size</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">{formatBytes(selectedPhoto.file_size_bytes ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Mime type</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">{selectedPhoto.mime_type || "image/jpeg"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Uploaded</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">
                  {new Date(selectedPhoto.uploaded_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Storage Path</p>
                <p className="mt-1 text-[11px] font-mono text-[#827970] break-all">{selectedPhoto.storage_path}</p>
              </div>
            </div>

            {/* Face matching metadata */}
            <div className="rounded-xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF6F1] p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#B36144]">
                <span className="material-symbols-outlined text-[16px]">face</span>
                AI Face Matching Status
              </div>
              <p className="mt-1.5 text-[#827970] leading-relaxed">
                This image has been indexed and is ready for facial recognition. Guests scanning the event QR can match and receive it instantly on WhatsApp.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-2 border-t border-[#2D2D2D]/5 pt-4 font-sans">
            <a
              href={selectedPhoto.public_url || ""}
              download={selectedPhoto.original_filename || "download"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center rounded-xl border border-[#DED5CC] py-3 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download
            </a>
            <button
              onClick={() => handleDeletePhoto(selectedPhoto)}
              disabled={deleteLoading}
              className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 py-3 text-xs font-semibold text-red-600 active:scale-[0.98] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {deleteLoading ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Attendees Panel — Real guest data from Supabase
   ═══════════════════════════════════════════════════ */
export function AttendeesPanel({ guests }: { guests: Guest[] }) {
  const [search, setSearch] = useState("");

  const filteredGuests = guests.filter((guest) =>
    (guest.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    guest.phone.includes(search)
  );

  return (
    <section className="overflow-hidden rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-[#2D2D2D]/6 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Guest directory</h2>
          <p className="mt-1 text-xs text-[#827970]">{filteredGuests.length} of {guests.length} registered guests.</p>
        </div>

        {/* Search Bar */}
        <label className="flex h-9 w-full sm:w-48 items-center gap-2 rounded-lg border border-[#2D2D2D]/8 bg-white/70 px-2.5 text-[#8E877F] focus-within:border-[#D67D5C]/40 transition-all">
          <span className="material-symbols-outlined text-[16px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests..."
            className="bg-transparent text-xs text-[#2D2D2D] outline-none placeholder:text-[#8E877F] w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#8E877F] hover:text-[#2D2D2D]">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </label>
      </div>

      {filteredGuests.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#827970]">
          <span className="material-symbols-outlined text-3xl text-[#D67D5C]/40 mb-2 block">groups</span>
          {guests.length === 0 ? "No guests have registered yet. Share the QR code to get started." : "No guests match your search query."}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="divide-y divide-[#2D2D2D]/5 sm:hidden">
            {filteredGuests.map((guest) => (
              <div key={guest.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#F7EAE4] to-[#FFF3EB] text-xs font-semibold text-[#B36144]">
                      {(guest.display_name ?? guest.phone).slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{guest.display_name ?? "Guest"}</p>
                      <p className="text-xs text-[#766D66]">{guest.phone}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-gradient-to-r from-[#F3EDE7] to-[#F7F1EC] px-3 py-1.5 text-[11px] font-medium text-[#625D58]">Registered</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gradient-to-r from-[#FCF9F5] to-[#FDF8F3] text-[11px] uppercase tracking-wider text-[#92877F]">
                <tr>
                  {["Guest name", "WhatsApp number", "Joined"].map((column) => (
                    <th className="px-6 py-4 font-medium" key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr className="border-t border-[#2D2D2D]/5 transition-colors hover:bg-[#FDF8F1]/60" key={guest.id}>
                    <td className="px-6 py-4 sm:py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F7EAE4] to-[#FFF3EB] text-[10px] font-semibold text-[#B36144]">
                          {(guest.display_name ?? guest.phone).slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-medium">{guest.display_name ?? "Guest"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#766D66] sm:py-5">{guest.phone}</td>
                    <td className="px-6 py-4 text-[#827970] sm:py-5">
                      {new Date(guest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   QR Panel
   ═══════════════════════════════════════════════════ */
export function QrPanel({ event, guestCount }: { event: EventRecord; guestCount: number }) {
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const eventUrl = `${origin || "https://spotme.app"}/event/${event.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl);
  };

  const handleDownloadQr = async () => {
    try {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(eventUrl)}`;
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code", err);
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(eventUrl)}`, "_blank");
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(eventUrl)}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr] sm:gap-5 xl:grid-cols-[390px_1fr]">
      {/* QR Code display */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-6 text-center backdrop-blur-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B36144]">Guest entry</p>
        <div className="mx-auto mt-5 flex h-[220px] w-[220px] items-center justify-center rounded-3xl border border-[#EEE5DB] bg-white p-5 sm:mt-6 sm:h-[252px] sm:w-[252px] sm:p-6 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt="Event Entry QR Code"
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        <p className="mt-4 text-sm font-medium sm:mt-5">{event.name}</p>
        <p className="mt-1 text-xs text-[#827970] break-all">/event/{event.id}</p>
      </section>

      {/* QR Controls */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <span className={`h-2.5 w-2.5 rounded-full ${event.qr_active ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          </span>
          <h2 className="text-lg font-semibold tracking-[-0.045em] sm:text-xl">
            QR Access is {event.qr_active ? "active" : "paused"}
          </h2>
        </div>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#827970]">
          Guests can scan the code, enter their WhatsApp number and submit a selfie to discover matching photos.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
          <button
            onClick={handleCopyLink}
            className="rounded-xl bg-[#D67D5C] hover:bg-[#C76F50] px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:px-5 sm:py-3 sm:text-sm"
          >
            Copy event link
          </button>
          <button
            onClick={handleDownloadQr}
            className="rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(214,125,92,0.25)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:px-5 sm:py-3 sm:text-sm"
          >
            Download QR Code
          </button>
          <Link
            href={`/event/${event.id}`}
            target="_blank"
            className="rounded-xl border border-[#DED5CC] px-4 py-2.5 text-xs font-semibold text-[#574F49] hover:bg-[#FDF8F1] active:scale-[0.98] transition-all duration-200 sm:px-5 sm:py-3 sm:text-sm"
          >
            Preview guest view
          </Link>
        </div>
        <div className="mt-8 space-y-3 rounded-2xl bg-gradient-to-br from-[#FBF7F2] to-[#FFF6F1] p-4 sm:mt-10 sm:p-5">
          <div className="flex justify-between text-sm">
            <span className="text-[#827970]">Verified guests</span>
            <span className="font-semibold">{guestCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#827970]">Event status</span>
            <span className="font-semibold capitalize">{event.status}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Gallery Panel — Real photos from Supabase Storage
   ═══════════════════════════════════════════════════ */
export function GalleryPanel({ eventId, photos }: { eventId: string; photos: EventPhoto[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [localPhotos, setLocalPhotos] = useState<EventPhoto[]>(photos);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(photos.length === 10000);

  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setLocalPhotos(photos);
    setHasMore(photos.length === 10000);
  }, [photos]);

  const handleDeletePhoto = async (photo: EventPhoto) => {
    if (!confirm("Are you sure you want to permanently delete this photo?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/photos?id=${photo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete photo");
      }
      setLocalPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setSelectedPhoto(null);
      router.refresh();
    } catch (err: any) {
      alert("Failed to delete photo: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("event_photos")
        .select("*")
        .eq("event_id", eventId)
        .order("uploaded_at", { ascending: false })
        .range(localPhotos.length, localPhotos.length + 9999);

      if (!error && data) {
        setLocalPhotos((prev) => [...prev, ...(data as EventPhoto[])]);
        setHasMore(data.length === 10000);
      }
    } catch (err) {
      console.error("Failed to load more photos:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredPhotos = localPhotos.filter((photo) =>
    (photo.original_filename ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5 sm:gap-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#DED5CC] bg-white/80 px-3 text-[#827970] backdrop-blur-sm sm:h-11 sm:min-w-56 sm:flex-initial sm:px-4">
          <span className="material-symbols-outlined text-[18px] sm:text-[19px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search gallery"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#8E877F] hover:text-[#2D2D2D]">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </label>
        <span className="text-xs text-[#827970]">{filteredPhotos.length} of {localPhotos.length} photos</span>
      </div>

      {/* Masonry grid */}
      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[#827970]">
          <span className="material-symbols-outlined text-4xl text-[#D67D5C]/40 mb-3">photo_library</span>
          <p className="text-sm">No photos match your search.</p>
        </div>
      ) : (
        <>
          <div className="columns-1 gap-3 sm:columns-2 sm:gap-4 xl:columns-3">
            {filteredPhotos.map((photo, index) => (
              <article
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className={`group relative mb-3 overflow-hidden rounded-2xl sm:mb-4 cursor-pointer hover:shadow-lg transition-all ${selectedPhoto?.id === photo.id ? "ring-2 ring-[#D67D5C]" : ""} ${index % 3 === 0 ? "h-[260px] sm:h-[330px]" : "h-[190px] sm:h-[235px]"}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                  style={{ backgroundImage: `url("${getOptimizedStorageUrl(photo.thumb_url || photo.public_url, { quality: 75 })}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[10px] font-medium truncate max-w-[140px]">{photo.original_filename}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Load More button */}
          {!search && hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-xl border border-[#2D2D2D]/8 bg-white px-6 py-2.5 text-xs font-semibold text-[#574F49] transition hover:bg-[#FDF8F1] hover:border-[#D67D5C]/30 active:scale-[0.98] disabled:opacity-50"
              >
                {loadingMore ? (
                  <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Loading...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">add</span> Load More Photos</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* File Detail Sidebar (Slide-out panel) */}
      {selectedPhoto && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm border-l border-[#2D2D2D]/8 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl flex-col animate-slide-in">
          <div className="flex items-center justify-between border-b border-[#2D2D2D]/5 pb-4">
            <h3 className="text-sm font-semibold text-[#2D2D2D] flex items-center gap-1.5 font-sans">
              <span className="material-symbols-outlined text-[18px]">info</span>
              File Details
            </h3>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#FDF8F1] text-[#625D58] border border-[#2D2D2D]/5 transition"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto space-y-5 pr-1 font-sans">
            {/* Image Preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#2D2D2D]/5 bg-[#FDF8F1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOptimizedStorageUrl(selectedPhoto.medium_url || selectedPhoto.public_url, { quality: 80 })}
                alt={selectedPhoto.original_filename || "Preview"}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Properties List */}
            <div className="space-y-3.5 text-xs">
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">File name</p>
                <p className="mt-1 font-medium text-[#2D2D2D] break-all">{selectedPhoto.original_filename}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Size</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">{formatBytes(selectedPhoto.file_size_bytes ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Mime type</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">{selectedPhoto.mime_type || "image/jpeg"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Uploaded</p>
                <p className="mt-1 font-medium text-[#2D2D2D]">
                  {new Date(selectedPhoto.uploaded_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#9A9087]">Storage Path</p>
                <p className="mt-1 text-[11px] font-mono text-[#827970] break-all">{selectedPhoto.storage_path}</p>
              </div>
            </div>

            {/* Face matching metadata */}
            <div className="rounded-xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF6F1] p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#B36144]">
                <span className="material-symbols-outlined text-[16px]">face</span>
                AI Face Matching Status
              </div>
              <p className="mt-1.5 text-[#827970] leading-relaxed">
                This image has been indexed and is ready for facial recognition. Guests scanning the event QR can match and receive it instantly on WhatsApp.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-2 border-t border-[#2D2D2D]/5 pt-4 font-sans">
            <a
              href={selectedPhoto.public_url || ""}
              download={selectedPhoto.original_filename || "download"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center rounded-xl border border-[#DED5CC] py-3 text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download
            </a>
            <button
              onClick={() => handleDeletePhoto(selectedPhoto)}
              disabled={deleteLoading}
              className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 py-3 text-xs font-semibold text-red-600 active:scale-[0.98] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {deleteLoading ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Settings Panel
   ═══════════════════════════════════════════════════ */
export function SettingsPanel({ event }: { event: EventRecord }) {
  const router = useRouter();
  const [privacyMode, setPrivacyMode] = useState(
    (event as EventRecord & { privacy_mode?: boolean }).privacy_mode ?? false
  );
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    const checkFeatures = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("disabled_features")
          .eq("id", user.id)
          .single();

        const { data: systemSettings } = await (supabase as any)
          .from("system_settings")
          .select("value")
          .eq("key", "disabled_features")
          .maybeSingle();

        const userDisabled = profile?.disabled_features || [];
        const globalDisabled = systemSettings?.value || [];
        setDisabledFeatures([...new Set([...userDisabled, ...globalDisabled])]);
      } catch (err) {
        console.error("Error loading features:", err);
      }
    };
    checkFeatures();
  }, []);

  const handleTogglePrivacy = async () => {
    const newMode = !privacyMode;
    setPrivacyLoading(true);
    setPrivacyMode(newMode); // optimistic update
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("events")
      .update({ privacy_mode: newMode })
      .eq("id", event.id);
    setPrivacyLoading(false);
    if (error) {
      setPrivacyMode(!newMode); // revert on failure
      alert("Failed to update Privacy Mode. Please try again.");
    } else {
      router.refresh();
    }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this event? Guests will no longer be able to access it.")) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("events").update({ status: "archived", qr_active: false }).eq("id", event.id);
    router.push("/dashboard");
    router.refresh();
  };

  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this event? This will delete all event settings, photos, guest details, and matching data. This action is irreversible.")) return;

    // Double confirmation to make sure
    const confirmName = prompt(`To confirm deletion, please type the event name: "${event.name}"`);
    if (confirmName !== event.name) {
      alert("Event name confirmation did not match. Deletion canceled.");
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete event");
      }
      alert("Event successfully deleted.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete event");
    } finally {
      setDeleteLoading(false);
    }
  };

  const settings = [
    { title: "Event visibility", description: "Allow guests with QR access to view matching images.", action: "Public to guests", icon: "visibility" },
    { title: "Gallery expiration", description: "Automatically archive delivered galleries after the event.", action: "30 days", icon: "schedule" },
    { title: "Branding settings", description: "Logo, accent and delivery message shown to guests.", action: "Customize", icon: "palette" },
    { title: "Reset QR access", description: "Issue a new QR code and expire all previous entry links.", action: "Reset code", icon: "qr_code_2" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_330px] sm:gap-5">
      <div className="flex flex-col gap-4 sm:gap-5">
        {/* ── Privacy Mode — featured toggle ───────────── */}
        <section className={`overflow-hidden rounded-[26px] border transition-all duration-500 ${privacyMode
          ? "border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/60 shadow-[0_8px_30px_rgba(139,92,246,0.08)]"
          : "border-[#2D2D2D]/6 bg-white/60"
          } backdrop-blur-xl p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${privacyMode
                ? "bg-violet-100 text-violet-600"
                : "bg-gradient-to-br from-[#FDF8F1] to-[#FFF3EB] text-[#B36144]"
                }`}>
                <span className="material-symbols-outlined text-[20px]">
                  {privacyMode ? "lock" : "lock_open"}
                </span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Privacy Mode</h2>
                  {privacyMode && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-[#827970]">
                  {disabledFeatures.includes("privacy_mode") ? (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      This feature is disabled by system administrator.
                    </span>
                  ) : privacyMode ? (
                    "Guests are redirected directly to Find Me. No one can browse the general gallery — photos are only revealed after selfie matching."
                  ) : (
                    "When enabled, guests skip the gallery entirely. They must upload a selfie to see only the photos they appear in, protecting everyone's privacy."
                  )}
                </p>
                {privacyMode && !disabledFeatures.includes("privacy_mode") && (
                  <div className="mt-3 space-y-1.5">
                    {[
                      "Gallery page hidden — redirect to Find Me",
                      "Photos only visible via AI face match",
                      "No face detected = no photos shown",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-1.5 text-[11px] text-violet-700">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleTogglePrivacy}
              disabled={privacyLoading || disabledFeatures.includes("privacy_mode")}
              aria-label="Toggle Privacy Mode"
              className={`relative mt-0.5 h-7 w-13 shrink-0 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:opacity-60 ${privacyMode && !disabledFeatures.includes("privacy_mode") ? "bg-violet-500" : "bg-[#DED5CC]"
                }`}
              style={{ minWidth: "52px" }}
            >
              <span
                className={`absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-md transition-transform duration-300 ${privacyMode && !disabledFeatures.includes("privacy_mode") ? "translate-x-[25px]" : "translate-x-0"
                  }`}
              />
              {privacyLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </span>
              )}
            </button>
          </div>
        </section>

        {/* ── Other settings ───────────────────────────── */}
        <section className="overflow-hidden rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 backdrop-blur-xl">
          {[
            { title: "Event visibility", description: "Allow guests with QR access to view matching images.", action: "Public to guests", icon: "visibility", disabled: false },
            { title: "Gallery expiration", description: "Automatically archive delivered galleries after the event.", action: "30 days", icon: "schedule", disabled: false },
            {
              title: "Branding settings",
              description: disabledFeatures.includes("custom_branding")
                ? "This feature is disabled by system administrator."
                : "Logo, accent and delivery message shown to guests.",
              action: disabledFeatures.includes("custom_branding") ? "Locked" : "Customize",
              icon: "palette",
              disabled: disabledFeatures.includes("custom_branding")
            },
            { title: "Reset QR access", description: "Issue a new QR code and expire all previous entry links.", action: "Reset code", icon: "qr_code_2", disabled: false },
          ].map((setting) => (
            <div className="flex flex-col gap-3 border-b border-[#2D2D2D]/6 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={setting.title}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF3EB] text-[#B36144]">
                  <span className="material-symbols-outlined text-[18px]">{setting.icon}</span>
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{setting.title}</h2>
                  <p className={`mt-1 text-xs leading-5 ${setting.disabled ? "text-red-500 font-semibold" : "text-[#827970]"}`}>
                    {setting.disabled && (
                      <span className="inline-flex items-center gap-1.5 mr-1 align-middle text-red-500">
                        <span className="material-symbols-outlined text-[13px]">info</span>
                      </span>
                    )}
                    {setting.description}
                  </p>
                </div>
              </div>
              <button
                disabled={setting.disabled}
                className={`w-fit shrink-0 rounded-xl border border-[#DED5CC] px-4 py-2.5 text-xs font-semibold text-[#625D58] transition ${setting.disabled ? "opacity-50 cursor-not-allowed bg-stone-100" : "hover:bg-[#FDF8F1]"}`}
              >
                {setting.action}
              </button>
            </div>
          ))}
        </section>
      </div>

      {/* Danger zone */}
      <section className="h-fit rounded-[26px] border border-[#D67D5C]/18 bg-gradient-to-br from-[#FFF5F0] to-[#FFF9F5] p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Danger zone</h2>
        <p className="mt-3 text-xs leading-5 text-[#766D66]">
          Archiving hides the event from guests. Deleting permanently removes photos.
        </p>
        <button
          onClick={handleArchive}
          className="mt-5 w-full rounded-xl border border-[#D67D5C]/25 bg-white py-2.5 text-xs font-semibold text-[#B36144] transition hover:bg-[#FFF5F0] active:scale-[0.98] sm:mt-6 sm:py-3"
        >
          Archive event
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteLoading}
          className="mt-3 w-full rounded-xl bg-red-50 border border-red-200 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-[0.98] sm:py-3 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {deleteLoading ? (
            <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete event permanently
            </>
          )}
        </button>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Matching Panel (placeholder — AI paused)
   ═══════════════════════════════════════════════════ */
export function MatchingPanel({ guests }: { guests: Guest[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] sm:gap-5">
      {/* Pipeline status */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-7">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.045em] sm:text-xl">Face matching</h2>
          <p className="mt-2 text-sm text-[#827970]">AI-powered photo matching — coming soon.</p>
        </div>
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#FBF7F2] to-[#FFF6F1] p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-[#D67D5C]/50">face_retouching_natural</span>
          <p className="mt-3 text-sm font-medium text-[#2D2D2D]">Face matching is paused</p>
          <p className="mt-1 text-xs text-[#827970]">Guest selfies are being collected. Matching will be activated soon.</p>
        </div>
      </section>

      {/* Recently active guests */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-7">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Recently joined guests</h2>
        {guests.length === 0 ? (
          <p className="mt-4 text-xs text-[#827970]">No guests yet.</p>
        ) : (
          <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
            {guests.slice(0, 5).map((guest) => (
              <div key={guest.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#FBF7F2]/80">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#F7EAE4] to-[#FFF3EB] text-xs font-semibold text-[#B36144]">
                  {(guest.display_name ?? guest.phone).slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{guest.display_name ?? "Guest"}</p>
                  <p className="text-xs text-[#827970]">{guest.phone}</p>
                </div>
                <span className="ml-auto shrink-0 text-xs text-[#827970]">
                  {new Date(guest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
