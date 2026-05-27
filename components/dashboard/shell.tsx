"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState, useEffect, useCallback } from "react";
import type { EventRecord } from "@/lib/dashboard-data";

type MainSection = "Dashboard" | "Events" | "Storage" | "Settings";

const mainNavigation: Array<{ label: MainSection; href: string; icon: string }> = [
  { label: "Dashboard", href: "/dashboard", icon: "space_dashboard" },
  { label: "Events", href: "/dashboard/events", icon: "photo_library" },
  { label: "Storage", href: "/dashboard/storage", icon: "cloud" },
  { label: "Settings", href: "/dashboard/account", icon: "tune" },
];

const workspaceNavigation = [
  { label: "Overview", href: "", icon: "space_dashboard" },
  { label: "Uploads", href: "/uploads", icon: "cloud_upload" },
  { label: "Attendees", href: "/attendees", icon: "groups" },
  { label: "QR Access", href: "/qr", icon: "qr_code_2" },
  { label: "Gallery", href: "/gallery", icon: "gallery_thumbnail" },
  { label: "Settings", href: "/settings", icon: "tune" },
];

/* ── Brand ──────────────────────────────────────── */
function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className={`flex items-center group ${collapsed ? "justify-center" : "gap-3"}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D67D5C] to-[#C46A4A] text-white shadow-[0_4px_12px_rgba(214,125,92,0.35)] transition-transform duration-300 group-hover:scale-105">
        <span className="material-symbols-outlined text-[21px]">camera</span>
      </span>
      {!collapsed && (
        <span className="text-xl font-semibold tracking-[-0.04em] text-white transition-opacity duration-200">
          Revela
        </span>
      )}
    </Link>
  );
}

/* ── Profile Block ──────────────────────────────── */
function ProfileBlock({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={`mt-8 flex items-center rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-sm transition-all duration-300 ${collapsed ? "justify-center p-2.5" : "gap-3 p-3 hover:bg-white/[0.07]"}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F4A261]/25 to-[#D67D5C]/15 text-sm font-semibold text-[#F4A261]">
        AV
      </div>
      {!collapsed && (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">Ari Vance</p>
            <p className="text-xs text-white/45">Photographer</p>
          </div>
          <span className="shrink-0 rounded-full bg-gradient-to-r from-[#D67D5C]/20 to-[#F4A261]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#F2B29A]">
            Pro
          </span>
        </>
      )}
    </div>
  );
}

/* ── Storage Footer ─────────────────────────────── */
function StorageFooter({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="mt-auto flex flex-col items-center gap-4 rounded-2xl bg-white/[0.04] p-3 border border-white/5">
        <Link
          href="/dashboard/storage"
          aria-label="Storage details (82% used)"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#F2B29A] hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-[20px]">cloud</span>
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D67D5C] text-[8px] font-bold text-white">
            82
          </span>
        </Link>
        <Link
          href="/dashboard/storage"
          aria-label="Upgrade storage"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2D2D2D] transition-all hover:bg-[#FDF8F1] active:scale-[0.95]"
        >
          <span className="material-symbols-outlined text-[18px]">trending_up</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-auto rounded-3xl bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-5 border border-white/5 transition-all duration-300">
      <div className="mb-3 flex items-center justify-between text-xs text-white/60">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">cloud</span>
          Storage
        </span>
        <span className="font-medium text-white/80">82%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261] transition-all duration-700" />
      </div>
      <p className="mt-3 text-xs text-white/44">410 GB of 500 GB used</p>
      <Link
        href="/dashboard/storage"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#2D2D2D] transition-all duration-200 hover:bg-[#FDF8F1] hover:shadow-md active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[16px]">trending_up</span>
        Upgrade Plan
      </Link>
    </div>
  );
}

/* ── Sidebar Overlay (Mobile) ───────────────────── */
function SidebarOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

/* ── Top Navbar ─────────────────────────────────── */
function TopNavbar({
  event,
  activePath,
  activeSection,
  onMenuToggle,
  onCreateEvent,
  onOpenNotifications,
}: {
  event?: EventRecord;
  activePath?: string;
  activeSection?: MainSection;
  onMenuToggle: () => void;
  onCreateEvent: () => void;
  onOpenNotifications: () => void;
}) {
  const activeSubNav = activePath !== undefined
    ? workspaceNavigation.find((item) => item.href === activePath)
    : null;

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-[#2D2D2D]/6 bg-white/70 px-4 backdrop-blur-xl sm:gap-5 sm:px-6 lg:h-[76px] lg:px-9">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2D2D2D]/8 bg-white text-[#625D58] transition hover:bg-[#FDF8F1] lg:hidden"
        aria-label="Toggle navigation"
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>

      {/* Breadcrumb */}
      <div className="hidden items-center gap-2 text-sm text-[#766D66] lg:flex">
        <Link href="/dashboard" className="transition hover:text-[#2D2D2D]">
          Dashboard
        </Link>
        {event && (
          <>
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            <Link
              href={`/dashboard/events/${event.id}`}
              className="transition hover:text-[#2D2D2D]"
            >
              {event.name}
            </Link>
            {activeSubNav && activeSubNav.href !== "" && (
              <>
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                <span className="font-medium text-[#2D2D2D]">{activeSubNav.label}</span>
              </>
            )}
          </>
        )}
        {!event && activeSection && activeSection !== "Dashboard" && (
          <>
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            <span className="font-medium text-[#2D2D2D]">{activeSection}</span>
          </>
        )}
      </div>

      {/* Search */}
      <label className="ml-auto flex h-10 w-full max-w-[280px] items-center gap-2.5 rounded-xl border border-[#2D2D2D]/8 bg-white/80 px-3.5 text-[#8E877F] transition focus-within:border-[#D67D5C]/45 focus-within:shadow-[0_0_0_3px_rgba(214,125,92,0.08)] sm:h-11 sm:max-w-[318px] sm:px-4">
        <span className="material-symbols-outlined text-[19px]">search</span>
        <input
          aria-label="Search events"
          className="w-full bg-transparent text-sm text-[#2D2D2D] outline-none placeholder:text-[#8E877F]"
          placeholder="Search events or guests"
        />
      </label>

      {/* Notifications Button */}
      <button
        onClick={onOpenNotifications}
        aria-label="Notifications"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2D2D2D]/8 bg-white text-[#625D58] transition hover:bg-[#FDF8F1] sm:h-11 sm:w-11"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#D67D5C] ring-2 ring-white animate-pulse" />
      </button>

      {/* Avatar */}
      <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2D2D2D] to-[#404040] text-xs font-semibold text-white sm:flex sm:h-11 sm:w-11">
        AV
      </div>

      {/* Create Event CTA */}
      <button
        onClick={onCreateEvent}
        className="hidden h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(214,125,92,0.28)] active:scale-[0.98] sm:flex sm:h-11"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span className="hidden md:block">Create Event</span>
      </button>
    </header>
  );
}

/* ── Main Navigation Item ───────────────────────── */
function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: (typeof mainNavigation)[number];
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-xl py-3.5 text-sm font-medium transition-all duration-200 ${
        collapsed ? "justify-center px-0 w-11 h-11 mx-auto" : "px-4"
      } ${
        active
          ? "bg-white text-[#2D2D2D] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          : "text-white/62 hover:bg-white/6 hover:text-white"
      }`}
    >
      <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

/* ═══════════════════════════════════════════════════
   Create Event Modal (Popup) Component
   ═══════════════════════════════════════════════════ */
export function CreateEventModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    date: "",
    type: "Marriage",
    adminName: "",
    adminPhone: "",
    adminEmail: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFakeUpload = () => {
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploadedFile("event_cover_preview.jpg");
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setUploadProgress(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
      alert(`Event "${formData.name}" (${formData.type}) Workspace Created Successfully!`);
      // Reset form states
      setFormData({ name: "", venue: "", date: "", type: "Marriage", adminName: "", adminPhone: "", adminEmail: "" });
      setUploadedFile(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glass backdrop blur */}
      <div className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-[#2D2D2D]/8 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-7 max-h-[92vh] overflow-y-auto dash-scroll animate-page-enter">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#625D58] border border-[#2D2D2D]/6 hover:bg-[#FDF8F1] transition"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B36144]">New Workspace</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[#2D2D2D] sm:text-2xl">Create event workspace</h2>
        <p className="mt-1 text-xs text-[#827970]">Configure your new event space. All entries will be styled to your brand guidelines.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          
          {/* Cover Image Uploader */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66] mb-2">Cover Image</label>
            <div 
              onClick={!uploadedFile && !uploading ? handleFakeUpload : undefined}
              className={`relative flex min-h-[110px] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                uploadedFile 
                  ? "border-green-300 bg-green-50/20" 
                  : uploading 
                    ? "border-[#D67D5C]/40 bg-[#D67D5C]/5" 
                    : "border-[#D9CEC5] bg-white hover:border-[#D67D5C]/55"
              }`}
            >
              {uploadedFile ? (
                <div className="flex w-full items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                      <span className="material-symbols-outlined text-[20px]">image</span>
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-[#2D2D2D]">{uploadedFile}</p>
                      <p className="text-[10px] text-green-600 font-medium">Ready to save</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleRemoveFile}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ) : uploading ? (
                <div className="w-full px-6 py-3 text-center">
                  <p className="text-xs font-semibold text-[#2D2D2D]">Uploading image...</p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EFE6DD]">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center p-4">
                  <span className="material-symbols-outlined text-[22px] text-[#B36144]">cloud_upload</span>
                  <p className="mt-1 text-xs font-semibold text-[#2D2D2D]">Click to upload cover image</p>
                  <p className="text-[10px] text-[#827970] mt-0.5">JPEG, PNG or HEIC up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Event Name</label>
              <input
                required
                placeholder="e.g. Villa d'Este Celebration"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Type of Event</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-3 text-xs outline-none transition focus:border-[#D67D5C]/50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%25232D2D2D%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_16px_center] bg-no-repeat"
              >
                <option value="Marriage">Marriage / Wedding</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Meetup">Meetup / Networking</option>
                <option value="Conference">Conference</option>
                <option value="Concert">Concert / Performance</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Venue / Location</label>
              <input
                required
                placeholder="e.g. Lake Como, Italy"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Event Date</label>
              <input
                required
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
            </div>
          </div>

          {/* Event Admin details section */}
          <div className="border-t border-[#2D2D2D]/6 pt-4 mt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#B36144] mb-3">Event Admin Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#766D66]">Admin Name</label>
                <input
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#766D66]">Admin Phone Number</label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. +1 (555) 019-2831"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#766D66]">Admin Email ID</label>
                  <input
                    required
                    type="email"
                    placeholder="e.g. sarah@events.com"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#2D2D2D]/8 bg-white py-3 text-xs font-semibold text-[#574F49] hover:bg-[#FDF8F1] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] py-3 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(214,125,92,0.2)] hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Notification Bar (Right Sidebar Drawer) Component
   ═══════════════════════════════════════════════════ */
export function NotificationDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const alerts = [
    { title: "248 files received", desc: "Camera 03 - Lake Como Celebration", time: "2 min ago", icon: "upload_file" },
    { title: "Amelia Stone registered", desc: "WhatsApp entry completed", time: "12 min ago", icon: "face" },
    { title: "Storage threshold alert", desc: "You have reached 82% of your Pro limits", time: "2 hours ago", icon: "cloud" },
    { title: "Settings configured", desc: "QR access has been refreshed", time: "1 day ago", icon: "tune" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#2D2D2D]/20 backdrop-blur-xs" onClick={onClose} />

      {/* Slide out card */}
      <div className="relative h-full w-[360px] max-w-full border-l border-[#2D2D2D]/6 bg-white/85 p-6 shadow-2xl backdrop-blur-2xl flex flex-col animate-slide-in">
        <div className="flex items-center justify-between border-b border-[#2D2D2D]/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#D67D5C]">notifications</span>
            <h3 className="text-base font-semibold text-[#2D2D2D]">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#FDF8F1] text-[#625D58] border border-[#2D2D2D]/5 transition"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable list */}
        <div className="mt-5 flex-1 overflow-y-auto space-y-4 pr-1">
          {alerts.map((item, idx) => (
            <div key={idx} className="flex gap-3.5 rounded-2xl bg-white/70 p-4 border border-[#2D2D2D]/4 hover:border-[#D67D5C]/15 transition hover:shadow-xs">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDF8F1] text-[#D67D5C]">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              </span>
              <div>
                <p className="text-sm font-semibold text-[#2D2D2D]">{item.title}</p>
                <p className="mt-1 text-xs text-[#827970]">{item.desc}</p>
                <p className="mt-2 text-[10px] text-[#A69C93]">{item.time}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl border border-[#2D2D2D]/8 bg-white text-xs font-semibold text-[#625D58] hover:bg-[#FDF8F1] transition"
        >
          Mark all as read
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DashboardShell — Main Dashboard Layout
   ═══════════════════════════════════════════════════ */
export function DashboardShell({
  active,
  children,
}: {
  active: MainSection;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const pathname = usePathname();
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar-collapsed", String(nextState));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF8F1] via-[#FEFCFB] to-[#FFF8F3] font-sans text-[#2D2D2D] lg:flex">
      <SidebarOverlay open={sidebarOpen} onClose={closeSidebar} />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col bg-gradient-to-b from-[#2D2D2D] to-[#252525] p-6 transition-all duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:translate-x-0 ${
          isCollapsed ? "lg:w-[92px] lg:px-4" : "lg:w-[272px]"
        } ${sidebarOpen ? "translate-x-0 w-[272px]" : "-translate-x-full"}`}
      >
        <button
          onClick={closeSidebar}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <Brand collapsed={isCollapsed && !sidebarOpen} />
        <ProfileBlock collapsed={isCollapsed && !sidebarOpen} />
        
        <nav className="mt-8 space-y-1.5">
          {mainNavigation.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              active={active === item.label}
              collapsed={isCollapsed && !sidebarOpen}
              onClick={closeSidebar}
            />
          ))}
        </nav>

        <StorageFooter collapsed={isCollapsed && !sidebarOpen} />

        <button
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-4 hidden items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] py-2.5 text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white lg:flex animate-fade-in"
        >
          <span className="material-symbols-outlined text-[19px] transition-transform duration-300">
            {isCollapsed ? "last_page" : "first_page"}
          </span>
          {!isCollapsed && <span className="text-xs font-semibold">Collapse Menu</span>}
        </button>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <TopNavbar
          activeSection={active}
          onMenuToggle={() => setSidebarOpen(true)}
          onCreateEvent={() => setIsCreateOpen(true)}
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
        {children}
      </div>

      {/* Pop-up Modals & Drawers */}
      <CreateEventModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EventWorkspaceShell — Event-specific Layout
   ═══════════════════════════════════════════════════ */
export function EventWorkspaceShell({
  event,
  activePath,
  children,
}: {
  event: EventRecord;
  activePath: string;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const rootHref = `/dashboard/events/${event.id}`;

  const pathname = usePathname();
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar-collapsed", String(nextState));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF8F1] via-[#FEFCFB] to-[#FFF8F3] font-sans text-[#2D2D2D] lg:flex">
      <SidebarOverlay open={sidebarOpen} onClose={closeSidebar} />

      {/* Workspace sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col bg-gradient-to-b from-[#2D2D2D] to-[#252525] p-6 transition-all duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:translate-x-0 ${
          isCollapsed ? "lg:w-[92px] lg:px-4" : "lg:w-[284px]"
        } ${sidebarOpen ? "translate-x-0 w-[284px]" : "-translate-x-full"}`}
      >
        <button
          onClick={closeSidebar}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <Brand collapsed={isCollapsed && !sidebarOpen} />
        
        <Link
          href="/dashboard/events"
          onClick={closeSidebar}
          title="Back to all events"
          className={`mt-7 flex items-center gap-2 text-xs font-medium text-white/48 transition hover:text-white ${isCollapsed && !sidebarOpen ? "justify-center" : ""}`}
        >
          <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          {!isCollapsed || sidebarOpen ? <span>All events</span> : null}
        </Link>

        {/* Event preview card */}
        {isCollapsed && !sidebarOpen ? (
          <Link
            href={`/dashboard/events/${event.id}`}
            title={event.name}
            className="mt-5 mx-auto block h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/8 bg-cover bg-center transition-transform hover:scale-105"
            style={{ backgroundImage: `url("${event.cover}")` }}
          />
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
            <div
              className="h-24 bg-cover bg-center"
              style={{ backgroundImage: `url("${event.cover}")` }}
            />
            <div className="p-4">
              <p className="truncate text-sm font-medium text-white">{event.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/48">
                <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                {event.date}
              </p>
            </div>
          </div>
        )}

        {/* Workspace navigation */}
        <nav className="mt-6 space-y-1">
          {workspaceNavigation.map((item) => {
            const href = `${rootHref}${item.href}`;
            const selected = activePath === item.href;

            return (
              <Link
                key={item.label}
                href={href}
                onClick={closeSidebar}
                title={isCollapsed && !sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-all duration-200 ${
                  isCollapsed && !sidebarOpen ? "justify-center px-0 w-11 h-11 mx-auto" : "px-4"
                } ${
                  selected
                    ? "bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-white shadow-[0_4px_12px_rgba(214,125,92,0.3)]"
                    : "text-white/62 hover:bg-white/6 hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                {!isCollapsed || sidebarOpen ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <StorageFooter collapsed={isCollapsed && !sidebarOpen} />

        <button
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-4 hidden items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] py-2.5 text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white lg:flex"
        >
          <span className="material-symbols-outlined text-[19px] transition-transform duration-300">
            {isCollapsed ? "last_page" : "first_page"}
          </span>
          {!isCollapsed && <span className="text-xs font-semibold">Collapse Menu</span>}
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <TopNavbar
          event={event}
          activePath={activePath}
          onMenuToggle={() => setSidebarOpen(true)}
          onCreateEvent={() => setIsCreateOpen(true)}
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
        {children}
      </div>

      {/* Pop-up Modals & Drawers */}
      <CreateEventModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}

/* ── Page Heading ───────────────────────────────── */
export function PageHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#B36144]">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-[-0.055em] text-[#2D2D2D] sm:text-3xl lg:text-[38px]">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#766D66]">{detail}</p>
      </div>
      {action}
    </div>
  );
}
