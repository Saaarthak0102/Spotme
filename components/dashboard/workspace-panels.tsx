import Link from "next/link";
import { attendeeRows, galleryImages, type EventRecord } from "@/lib/dashboard-data";

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
export function EventOverviewPanel({ event }: { event: EventRecord }) {
  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
        <MiniStat label="Total uploads" value={event.photos.toLocaleString()} note="+248 in the last hour" icon="photo_camera" />
        <MiniStat label="Guest joins" value={event.guests.toLocaleString()} note="12 joined today" icon="groups" />
        <MiniStat label="Deliveries" value="87" note="WhatsApp notifications sent" icon="forum" />
      </div>

      {/* Main info card */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-7">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Event workspace</h2>
        <p className="mt-1 text-xs text-[#827970]">Monitor your photo archives and deliver photos to guests via QR code.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3">
          {[
            { label: "Files uploaded", value: event.photos.toLocaleString() },
            { label: "Guests joined", value: event.guests.toLocaleString() },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-gradient-to-br from-[#FBF7F2] to-[#FFF6F1] p-4">
              <p className="text-[10px] text-[#827970] sm:text-[11px]">{item.label}</p>
              <p className="mt-1.5 text-base font-semibold sm:mt-2 sm:text-lg">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Uploads Panel
   ═══════════════════════════════════════════════════ */
export function UploadsPanel() {
  const uploads = [
    { name: "Reception_Cam03_0942.CR3", progress: 100, state: "Processed" },
    { name: "Ceremony_Cam02_1780.CR3", progress: 74, state: "Uploading" },
    { name: "Cocktails_Cam01_2241.CR3", progress: 32, state: "Uploading" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr] sm:gap-5">
      {/* Drop zone */}
      <section className="rounded-[28px] border border-dashed border-[#D67D5C]/30 bg-white/50 p-5 backdrop-blur-xl sm:p-8">
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[22px] bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] px-6 text-center sm:min-h-[290px] sm:px-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D67D5C]/10 text-[#B36144] sm:h-14 sm:w-14">
            <span className="material-symbols-outlined text-[26px] sm:text-[29px]">cloud_upload</span>
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-[-0.04em] sm:mt-5 sm:text-xl">Drop original photos here</h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-[#827970] sm:text-sm sm:leading-6">
            RAW, JPEG or HEIC up to 10 GB per upload.
          </p>
          <button className="mt-5 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(214,125,92,0.25)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:mt-6 sm:px-6 sm:py-3 sm:text-sm">
            Browse Files
          </button>
        </div>
      </section>

      {/* Upload queue */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Upload queue</h2>
        <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
          {uploads.map((upload) => (
            <div key={upload.name}>
              <div className="flex justify-between gap-2 sm:gap-3">
                <p className="truncate text-xs font-medium">{upload.name}</p>
                <p className="shrink-0 text-[11px] text-[#827970]">{upload.state}</p>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-[#EFE6DD] sm:mt-3">
                <div className="h-full rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261] transition-all duration-500" style={{ width: `${upload.progress}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-[#92877F] sm:mt-2">
                <span>{upload.progress}% complete</span>
                {upload.progress < 100 && <button className="text-[#B36144] transition hover:text-[#D67D5C]">Retry</button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently processed */}
      <section className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl xl:col-span-2 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Recently processed</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 sm:mt-5 sm:gap-4">
          {galleryImages.slice(0, 4).map((image) => (
            <div key={image} className="group relative h-32 overflow-hidden rounded-2xl sm:h-40">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105" style={{ backgroundImage: `url("${image}")` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Attendees Panel
   ═══════════════════════════════════════════════════ */
export function AttendeesPanel() {
  return (
    <section className="overflow-hidden rounded-[26px] border border-[#2D2D2D]/6 bg-white/60 backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-[#2D2D2D]/6 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Guest directory</h2>
          <p className="mt-1 text-xs text-[#827970]">Selfie submissions and photo delivery.</p>
        </div>
        <button className="w-fit rounded-xl border border-[#DED5CC] px-4 py-2.5 text-xs font-semibold transition hover:bg-[#FDF8F1]">Export list</button>
      </div>

      {/* Mobile card view */}
      <div className="divide-y divide-[#2D2D2D]/5 sm:hidden">
        {attendeeRows.map((attendee) => (
          <div key={attendee.phone} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#F7EAE4] to-[#FFF3EB] text-xs font-semibold text-[#B36144]">
                  {attendee.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <div>
                  <p className="text-sm font-medium">{attendee.name}</p>
                  <p className="text-xs text-[#766D66]">{attendee.phone}</p>
                </div>
              </div>
              <span className="rounded-full bg-gradient-to-r from-[#F3EDE7] to-[#F7F1EC] px-3 py-1.5 text-[11px] font-medium text-[#625D58]">{attendee.status}</span>
            </div>
            <div className="mt-3 flex justify-end text-xs text-[#827970]">
              <span>{attendee.lastActive}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gradient-to-r from-[#FCF9F5] to-[#FDF8F3] text-[11px] uppercase tracking-wider text-[#92877F]">
            <tr>
              {["Guest name", "WhatsApp number", "Status", "Last activity"].map((column) => (
                <th className="px-6 py-4 font-medium" key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attendeeRows.map((attendee) => (
              <tr className="border-t border-[#2D2D2D]/5 transition-colors hover:bg-[#FDF8F1]/60" key={attendee.phone}>
                <td className="px-6 py-4 sm:py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F7EAE4] to-[#FFF3EB] text-[10px] font-semibold text-[#B36144]">
                      {attendee.name.split(" ").map((p) => p[0]).join("")}
                    </span>
                    <span className="font-medium">{attendee.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#766D66] sm:py-5">{attendee.phone}</td>
                <td className="px-6 py-4 sm:py-5">
                  <span className="rounded-full bg-gradient-to-r from-[#F3EDE7] to-[#F7F1EC] px-3 py-1.5 text-xs text-[#625D58]">{attendee.status}</span>
                </td>
                <td className="px-6 py-4 text-[#827970] sm:py-5">{attendee.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   QR Panel
   ═══════════════════════════════════════════════════ */
export function QrPanel({ event }: { event: EventRecord }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr] sm:gap-5 xl:grid-cols-[390px_1fr]">
      {/* QR Code display */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-6 text-center backdrop-blur-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B36144]">Guest entry</p>
        <div className="mx-auto mt-5 grid h-[220px] w-[220px] grid-cols-6 gap-2 rounded-3xl border border-[#EEE5DB] bg-gradient-to-br from-[#FDF8F1] to-[#FFF6F1] p-5 sm:mt-6 sm:h-[252px] sm:w-[252px] sm:p-6">
          {Array.from({ length: 36 }).map((_, index) => (
            <span
              className={`rounded-[3px] ${
                [0, 1, 2, 6, 8, 12, 13, 14, 21, 23, 24, 28, 29, 30, 33, 35].includes(index)
                  ? "bg-[#2D2D2D]"
                  : index % 5 === 0
                    ? "bg-[#D67D5C]"
                    : "bg-transparent"
              }`}
              key={index}
            />
          ))}
        </div>
        <p className="mt-4 text-sm font-medium sm:mt-5">{event.name}</p>
        <p className="mt-1 text-xs text-[#827970]">revela.photos/e/{event.id}</p>
      </section>

      {/* QR Controls */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          </span>
          <h2 className="text-lg font-semibold tracking-[-0.045em] sm:text-xl">QR Access is active</h2>
        </div>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#827970]">
          Guests can scan the code, verify on WhatsApp and submit a selfie to discover matching photos.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
          {["Download QR", "Share QR", "Copy event link"].map((label, index) => (
            <button
              key={label}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98] sm:px-5 sm:py-3 sm:text-sm ${
                index === 0
                  ? "bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-white shadow-[0_6px_16px_rgba(214,125,92,0.25)] hover:-translate-y-0.5"
                  : "border border-[#DED5CC] text-[#574F49] hover:bg-[#FDF8F1]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-8 space-y-3 rounded-2xl bg-gradient-to-br from-[#FBF7F2] to-[#FFF6F1] p-4 sm:mt-10 sm:p-5">
          <div className="flex justify-between text-sm">
            <span className="text-[#827970]">QR scans today</span>
            <span className="font-semibold">146</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#827970]">Verified guests</span>
            <span className="font-semibold">87</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   AI Matching Panel (Now styled as general Media panel)
   ═══════════════════════════════════════════════════ */
export function MatchingPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] sm:gap-5">
      {/* Pipeline status */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-7">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.045em] sm:text-xl">Media manager</h2>
          <p className="mt-2 text-sm text-[#827970]">Continuous background sync with guest devices.</p>
        </div>
        <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3">
          {[
            { label: "Faces detected", value: "7,942" },
            { label: "Deliveries today", value: "87" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-gradient-to-br from-[#FBF7F2] to-[#FFF6F1] p-4 sm:p-5">
              <p className="text-xs text-[#827970]">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.05em] sm:mt-3 sm:text-2xl">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recently active guests */}
      <section className="rounded-[28px] border border-[#2D2D2D]/6 bg-white/60 p-5 backdrop-blur-xl sm:p-7">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Recently active guests</h2>
        <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
          {attendeeRows.slice(0, 4).map((guest) => (
            <div key={guest.name} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#FBF7F2]/80">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#F7EAE4] to-[#FFF3EB] text-xs font-semibold text-[#B36144]">
                {guest.name.split(" ").map((part) => part[0]).join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{guest.name}</p>
                <p className="text-xs text-[#827970]">{guest.status}</p>
              </div>
              <span className="ml-auto shrink-0 text-xs text-[#827970]">{guest.lastActive}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Gallery Panel
   ═══════════════════════════════════════════════════ */
export function GalleryPanel() {
  return (
    <section>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5 sm:gap-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#DED5CC] bg-white/80 px-3 text-[#827970] backdrop-blur-sm sm:h-11 sm:min-w-56 sm:flex-initial sm:px-4">
          <span className="material-symbols-outlined text-[18px] sm:text-[19px]">search</span>
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Search gallery" />
        </label>
        <div className="flex gap-2 overflow-x-auto sm:gap-3">
          {["All photos", "Favorites"].map((filter, index) => (
            <button
              key={filter}
              className={`h-10 shrink-0 rounded-xl px-3 text-xs font-semibold transition-all duration-200 active:scale-[0.97] sm:h-11 sm:px-4 ${
                index === 0 ? "bg-[#2D2D2D] text-white" : "border border-[#DED5CC] bg-white/80 text-[#625D58] hover:bg-[#FDF8F1]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry grid */}
      <div className="columns-1 gap-3 sm:columns-2 sm:gap-4 xl:columns-3">
        {galleryImages.map((image, index) => (
          <article
            key={image}
            className={`group relative mb-3 overflow-hidden rounded-2xl sm:mb-4 ${index % 3 === 0 ? "h-[260px] sm:h-[330px]" : "h-[190px] sm:h-[235px]"}`}
          >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 will-change-transform group-hover:scale-105" style={{ backgroundImage: `url("${image}")` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </article>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Settings Panel
   ═══════════════════════════════════════════════════ */
export function SettingsPanel() {
  const settings = [
    { title: "Event visibility", description: "Allow guests with QR access to view matching images.", action: "Public to guests", icon: "visibility" },
    { title: "Gallery expiration", description: "Automatically archive delivered galleries after the event.", action: "30 days", icon: "schedule" },
    { title: "Branding settings", description: "Logo, accent and delivery message shown to guests.", action: "Customize", icon: "palette" },
    { title: "Reset QR access", description: "Issue a new QR code and expire all previous entry links.", action: "Reset code", icon: "qr_code_2" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_330px] sm:gap-5">
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

      {/* Danger zone */}
      <section className="h-fit rounded-[26px] border border-[#D67D5C]/18 bg-gradient-to-br from-[#FFF5F0] to-[#FFF9F5] p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.04em] sm:text-lg">Danger zone</h2>
        <p className="mt-3 text-xs leading-5 text-[#766D66]">
          Archiving hides the event from guests. Deleting permanently removes photos.
        </p>
        <button className="mt-5 w-full rounded-xl border border-[#D67D5C]/25 bg-white py-2.5 text-xs font-semibold text-[#B36144] transition hover:bg-[#FFF5F0] active:scale-[0.98] sm:mt-6 sm:py-3">Archive event</button>
        <button className="mt-2.5 w-full rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] py-2.5 text-xs font-semibold text-white transition hover:shadow-[0_6px_16px_rgba(214,125,92,0.3)] active:scale-[0.98] sm:mt-3 sm:py-3">Delete event</button>
      </section>
    </div>
  );
}
