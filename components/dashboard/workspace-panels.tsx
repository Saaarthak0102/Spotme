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
  photoCount,
  guestCount,
}: {
  event: EventRecord;
  photoCount: number;
  guestCount: number;
}) {
  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
        <MiniStat label="Total uploads" value={photoCount.toLocaleString()} note="Photos in this event" icon="photo_camera" />
        <MiniStat label="Guest joins" value={guestCount.toLocaleString()} note="Registered guests" icon="groups" />
        <MiniStat label="QR Status" value={event.qr_active ? "Active" : "Paused"} note={event.qr_active ? "Guests can scan" : "QR paused"} icon="qr_code_2" />
      </div>

      {/* Main info card */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-7">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Event workspace</h2>
        <p className="mt-1 text-xs text-[#827970]">Monitor your photo archives and deliver photos to guests via QR code.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3">
          {[
            { label: "Files uploaded", value: photoCount.toLocaleString() },
            { label: "Guests joined", value: guestCount.toLocaleString() },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-gradient-to-br from-[#FBF7F2] to-[#FFF6F1] p-4">
              <p className="text-[10px] text-[#827970] sm:text-[11px]">{item.label}</p>
              <p className="mt-1.5 text-base font-semibold sm:mt-2 sm:text-lg">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Event details */}
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
  return (
    <section className="overflow-hidden rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-[#2D2D2D]/6 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Guest directory</h2>
          <p className="mt-1 text-xs text-[#827970]">{guests.length} registered guests.</p>
        </div>
      </div>

      {guests.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#827970]">
          <span className="material-symbols-outlined text-3xl text-[#D67D5C]/40 mb-2 block">groups</span>
          No guests have registered yet. Share the QR code to get started.
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="divide-y divide-[#2D2D2D]/5 sm:hidden">
            {guests.map((guest) => (
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
                {guests.map((guest) => (
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
  return (
    <section>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5 sm:gap-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#DED5CC] bg-white/80 px-3 text-[#827970] backdrop-blur-sm sm:h-11 sm:min-w-56 sm:flex-initial sm:px-4">
          <span className="material-symbols-outlined text-[18px] sm:text-[19px]">search</span>
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Search gallery" />
        </label>
        <span className="text-xs text-[#827970]">{photos.length} photos</span>
      </div>

      {/* Masonry grid */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[#827970]">
          <span className="material-symbols-outlined text-4xl text-[#D67D5C]/40 mb-3">photo_library</span>
          <p className="text-sm">No photos uploaded yet.</p>
          <p className="text-xs mt-1">Go to the Uploads tab to add photos.</p>
        </div>
      ) : (
        <div className="columns-1 gap-3 sm:columns-2 sm:gap-4 xl:columns-3">
          {photos.map((photo, index) => (
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
