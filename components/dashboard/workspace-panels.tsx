"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Event as EventRecord, EventPhoto, Guest } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

/* ═══════════════════════════════════════════════════
   Event Overview Panel
   ═══════════════════════════════════════════════════ */
export function EventOverviewPanel({
  event,
  photos,
  guests,
}: {
  event: EventRecord;
  photos: EventPhoto[];
  guests: Guest[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [localPhotos, setLocalPhotos] = useState<EventPhoto[]>(photos);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(photos.length === 50);

  useEffect(() => {
    setLocalPhotos(photos);
    setHasMore(photos.length === 50);
  }, [photos]);

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


  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
      const supabase = createClient();
      const { error: storageError } = await supabase.storage
        .from("event-photos")
        .remove([photo.storage_path]);
        
      if (storageError) {
        console.error("Storage delete warning:", storageError.message);
      }
      
      const { error: dbError } = await (supabase as any)
        .from("event_photos")
        .delete()
        .eq("id", photo.id);
        
      if (dbError) {
        throw new Error(dbError.message);
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
        <MiniStat label="Total uploads" value={localPhotos.length.toLocaleString()} note="Photos in this event" icon="photo_camera" />
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
            <p className="mt-0.5 text-xs text-[#827970]">{totalSizeFormatted} utilized by {localPhotos.length} photos</p>
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
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#766D66]">Workspace Folders</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Event Photos", icon: "folder", count: `${localPhotos.length} items`, size: totalSizeFormatted, color: "text-[#D67D5C] bg-[#D67D5C]/8", href: `${rootHref}/gallery` },
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
                      style={{ backgroundImage: `url("${photo.public_url}")` }}
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
                src={selectedPhoto.public_url || ""}
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
   Uploads Panel — Real file upload to Supabase Storage
   ═══════════════════════════════════════════════════ */
export function UploadsPanel({ event, photos }: { event: EventRecord; photos: EventPhoto[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<
    { name: string; progress: number; state: "Uploading" | "Processed" | "Error" }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = async (files: FileList) => {
    const supabase = createClient();
    const fileArray = Array.from(files);

    // Add to queue immediately
    const queueEntries = fileArray.map((f) => ({ name: f.name, progress: 0, state: "Uploading" as const }));
    setUploadQueue((prev) => [...prev, ...queueEntries]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `${event.id}/${Date.now()}-${i}.${ext}`;

      // Animate progress
      const updateProgress = (p: number) => {
        setUploadQueue((prev) =>
          prev.map((q, idx) =>
            idx === uploadQueue.length + i ? { ...q, progress: p } : q
          )
        );
      };

      let prog = 0;
      const interval = setInterval(() => {
        prog = Math.min(prog + 15, 90);
        updateProgress(prog);
      }, 100);

      const { error } = await supabase.storage
        .from("event-photos")
        .upload(storagePath, file, { upsert: true });

      clearInterval(interval);

      if (error) {
        setUploadQueue((prev) =>
          prev.map((q, idx) =>
            idx === uploadQueue.length + i ? { ...q, progress: 100, state: "Error" } : q
          )
        );
        continue;
      }

      // Get public URL and insert DB record via API route
      const { data: urlData } = supabase.storage.from("event-photos").getPublicUrl(storagePath);
      await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          original_filename: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
        }),
      });

      setUploadQueue((prev) =>
        prev.map((q, idx) =>
          idx === uploadQueue.length + i ? { ...q, progress: 100, state: "Processed" } : q
        )
      );
    }

    router.refresh();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr] sm:gap-5">
      {/* Drop zone */}
      <section
        className={`rounded-[28px] border-2 border-dashed bg-white/50 p-5 backdrop-blur-xl sm:p-8 transition-all ${
          isDragging ? "border-[#D67D5C] bg-[#D67D5C]/5" : "border-[#D67D5C]/30"
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
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[22px] bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] px-6 text-center sm:min-h-[290px] sm:px-8 cursor-pointer">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D67D5C]/10 text-[#B36144] sm:h-14 sm:w-14">
            <span className="material-symbols-outlined text-[26px] sm:text-[29px]">cloud_upload</span>
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-[-0.04em] sm:mt-5 sm:text-xl">
            {isDragging ? "Drop to upload!" : "Drop original photos here"}
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-[#827970] sm:text-sm sm:leading-6">
            Or click to browse. JPEG, PNG, HEIC files accepted.
          </p>
          <button
            type="button"
            className="mt-5 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(214,125,92,0.25)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:mt-6 sm:px-6 sm:py-3 sm:text-sm"
          >
            Browse Files
          </button>
        </div>
      </section>

      {/* Upload queue */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Upload queue</h2>
        {uploadQueue.length === 0 ? (
          <p className="mt-4 text-xs text-[#827970]">No active uploads.</p>
        ) : (
          <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
            {uploadQueue.map((upload, idx) => (
              <div key={`${upload.name}-${idx}`}>
                <div className="flex justify-between gap-2 sm:gap-3">
                  <p className="truncate text-xs font-medium">{upload.name}</p>
                  <p className={`shrink-0 text-[11px] ${upload.state === "Error" ? "text-red-500" : "text-[#827970]"}`}>
                    {upload.state}
                  </p>
                </div>
                <div className="mt-2.5 h-1.5 rounded-full bg-[#EFE6DD] sm:mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      upload.state === "Error"
                        ? "bg-red-400"
                        : "bg-gradient-to-r from-[#D67D5C] to-[#F4A261]"
                    }`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-[#92877F] sm:mt-2">
                  <span>{upload.progress}% complete</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently processed photos from Supabase */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl xl:col-span-2 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">
          Event photos <span className="ml-2 text-sm font-normal text-[#827970]">({photos.length} total)</span>
        </h2>
        {photos.length === 0 ? (
          <p className="mt-4 text-sm text-[#827970]">No photos uploaded yet. Drop files above to get started.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 sm:mt-5 sm:gap-4">
            {photos.slice(0, 8).map((photo) => (
              <div key={photo.id} className="group relative h-32 overflow-hidden rounded-2xl sm:h-40">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                  style={{ backgroundImage: `url("${photo.public_url}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        )}
      </section>
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

  const eventUrl = `${origin || "https://spotme.revela.com"}/event/${event.id}`;

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
export function GalleryPanel({ photos }: { photos: EventPhoto[] }) {
  const [search, setSearch] = useState("");

  const filteredPhotos = photos.filter((photo) =>
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
        <span className="text-xs text-[#827970]">{filteredPhotos.length} of {photos.length} photos</span>
      </div>

      {/* Masonry grid */}
      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[#827970]">
          <span className="material-symbols-outlined text-4xl text-[#D67D5C]/40 mb-3">photo_library</span>
          <p className="text-sm">No photos match your search.</p>
        </div>
      ) : (
        <div className="columns-1 gap-3 sm:columns-2 sm:gap-4 xl:columns-3">
          {filteredPhotos.map((photo, index) => (
            <article
              key={photo.id}
              className={`group relative mb-3 overflow-hidden rounded-2xl sm:mb-4 ${index % 3 === 0 ? "h-[260px] sm:h-[330px]" : "h-[190px] sm:h-[235px]"}`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                style={{ backgroundImage: `url("${photo.public_url}")` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] font-medium truncate max-w-[140px]">{photo.original_filename}</p>
              </div>
            </article>
          ))}
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
      alert("Event name confirmation did not match. Deletion cancelled.");
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
        <section className={`overflow-hidden rounded-[26px] border transition-all duration-500 ${
          privacyMode
            ? "border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/60 shadow-[0_8px_30px_rgba(139,92,246,0.08)]"
            : "border-[#2D2D2D]/6 bg-white/60"
        } backdrop-blur-xl p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                privacyMode
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
                  {privacyMode
                    ? "Guests are redirected directly to Find Me. No one can browse the general gallery — photos are only revealed after selfie matching."
                    : "When enabled, guests skip the gallery entirely. They must upload a selfie to see only the photos they appear in, protecting everyone's privacy."}
                </p>
                {privacyMode && (
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
              disabled={privacyLoading}
              aria-label="Toggle Privacy Mode"
              className={`relative mt-0.5 h-7 w-13 shrink-0 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:opacity-60 ${
                privacyMode ? "bg-violet-500" : "bg-[#DED5CC]"
              }`}
              style={{ minWidth: "52px" }}
            >
              <span
                className={`absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-md transition-transform duration-300 ${
                  privacyMode ? "translate-x-[25px]" : "translate-x-0"
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
          {settings.map((setting) => (
            <div className="flex flex-col gap-3 border-b border-[#2D2D2D]/6 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={setting.title}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF3EB] text-[#B36144]">
                  <span className="material-symbols-outlined text-[18px]">{setting.icon}</span>
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{setting.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#827970]">{setting.description}</p>
                </div>
              </div>
              <button className="w-fit shrink-0 rounded-xl border border-[#DED5CC] px-4 py-2.5 text-xs font-semibold text-[#625D58] transition hover:bg-[#FDF8F1]">{setting.action}</button>
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
