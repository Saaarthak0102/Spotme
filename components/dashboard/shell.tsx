"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useState, useEffect, useCallback, useRef, Suspense } from "react";
import type { Event as EventRecord } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanName = (name?: string | null) => {
  if (!name) return "";
  return name.includes("@") ? name.split("@")[0] : name;
};

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

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
          Spotme
        </span>
      )}
    </Link>
  );
}

/* ── Profile Block ──────────────────────────────── */
function ProfileBlock({ collapsed, userName }: { collapsed?: boolean; userName?: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    email: string;
    fullName: string;
    plan: string;
    storageUsedGB: number;
    storageMaxGB: number;
  } | null>(null);

  const rawAvatarName = userName || userProfile?.fullName || userProfile?.email;
  const avatarName = cleanName(rawAvatarName);
  const initials = avatarName
    ? (avatarName.split(/\s+/).filter(Boolean)[0]?.[0]?.toUpperCase() || "")
    : "";
  const displayName = cleanName(userName) || "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch profile details
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, plan, max_storage_gb")
            .eq("id", user.id)
            .single();

          // Calculate storage size based on actual photo sizes
          let totalBytes = 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: events } = await (supabase as any)
            .from("events")
            .select("id")
            .eq("owner_id", user.id);
          
          if (events && events.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: photos } = await (supabase as any)
              .from("event_photos")
              .select("file_size_bytes")
              .in("event_id", events.map((e: { id: string }) => e.id));
            if (photos) {
              totalBytes = photos.reduce((acc: number, p: { file_size_bytes: number | null }) => acc + (p.file_size_bytes ?? 0), 0);
            }
          }

          setUserProfile({
            email: user.email || "",
            fullName: profile?.full_name || userName || user.email || "",
            plan: profile?.plan || "free",
            storageUsedGB: parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2)),
            storageMaxGB: profile?.max_storage_gb || 10,
          });
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };
    fetchProfile();
  }, [userName]);

  return (
    <div ref={menuRef} className="relative mt-8">
      {/* Profile trigger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`w-full flex items-center rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-md transition-all duration-300 group text-left ${collapsed ? "justify-center p-2.5" : "gap-3 p-3"}`}
      >
        <div className="relative shrink-0">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#F4A261] to-[#D67D5C] text-sm font-semibold text-white border border-white/20 shadow-md transition-transform duration-300 group-hover:scale-105">
            {initials || <span className="material-symbols-outlined text-[19px]">person</span>}
          </span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 flex items-center justify-between">
            <div className="truncate">
              <p className="truncate text-sm font-semibold text-white tracking-wide">
                {cleanName(userProfile?.fullName) || displayName || "User"}
              </p>
              <p className="text-[10px] text-white/50 flex items-center gap-1.5 mt-0.5 uppercase tracking-wider font-medium">
                {userProfile?.plan === "unlimited" ? "Unlimited Plan" : userProfile?.plan === "pro" ? "Pro Member" : "Free Tier"}
              </p>
            </div>
            <span className="material-symbols-outlined text-[20px] text-white/40 transition-transform duration-300 group-hover:translate-y-0.5">unfold_more</span>
          </div>
        )}
      </button>

      {/* Popover Dropdown Menu (Rising up inside Sidebar) */}
      {menuOpen && (
        <div className={`absolute bottom-full z-50 mb-2 w-64 rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-2xl animate-page-enter ${collapsed ? "left-0" : "left-0 right-0"}`}>
          <div className="px-2 py-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D67D5C] text-xs font-semibold text-white border border-white/10">
                {initials || <span className="material-symbols-outlined text-[15px]">person</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white text-xs truncate">
                  {cleanName(userProfile?.fullName) || displayName || "User"}
                </p>
                <p className="text-[10px] text-white/50 truncate mt-0.5">{userProfile?.email || ""}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-0.5">
            <Link
              href="/dashboard/account"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition group"
            >
              <span className="material-symbols-outlined text-[16px] text-[#F4A261] transition group-hover:rotate-45">tune</span>
              Account Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Navbar Profile ─────────────────────────────── */
function NavbarProfile({ userName }: { userName?: string }) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    email: string;
    fullName: string;
    plan: string;
    storageUsedGB: number;
    storageMaxGB: number;
  } | null>(null);

  const rawAvatarName = userName || userProfile?.fullName || userProfile?.email;
  const avatarName = cleanName(rawAvatarName);
  const initials = avatarName
    ? (avatarName.split(/\s+/).filter(Boolean)[0]?.[0]?.toUpperCase() || "")
    : "";
  const displayName = cleanName(userName) || "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, plan, max_storage_gb")
            .eq("id", user.id)
            .single();

          setUserProfile({
            email: user.email || "",
            fullName: profile?.full_name || userName || user.email || "",
            plan: profile?.plan || "free",
            storageUsedGB: 0,
            storageMaxGB: profile?.max_storage_gb || 10,
          });

          // Fetch storage size asynchronously so it doesn't block page render/initial profile load
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: events } = await (supabase as any)
            .from("events")
            .select("id")
            .eq("owner_id", user.id);
          
          if (events && events.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: photos } = await (supabase as any)
              .from("event_photos")
              .select("file_size_bytes")
              .in("event_id", events.map((e: { id: string }) => e.id));
            if (photos) {
              const totalBytes = photos.reduce((acc: number, p: { file_size_bytes: number | null }) => acc + (p.file_size_bytes ?? 0), 0);
              setUserProfile((prev) => prev ? {
                ...prev,
                storageUsedGB: parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2)),
              } : null);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };
    fetchProfile();
  }, [userName]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!initials) {
    return <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 hidden sm:block" />;
  }

  return (
    <div ref={dropdownRef} className="relative hidden sm:block">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#D67D5C] to-amber-500 text-xs font-semibold text-white shadow-md border border-[#2D2D2D]/10 cursor-pointer transition hover:scale-105 hover:shadow-lg active:scale-95 duration-200"
      >
        {initials}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2.5 z-50 w-64 rounded-2xl border border-[#2D2D2D]/8 bg-white/95 p-3 shadow-xl backdrop-blur-2xl animate-page-enter">
          <div className="border-b border-[#2D2D2D]/6 pb-3 px-2 py-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D67D5C] text-xs font-semibold text-white border border-[#2D2D2D]/5">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#2D2D2D] text-xs truncate">
                  {cleanName(userProfile?.fullName) || displayName || "User"}
                </p>
                <p className="text-[10px] text-[#766D66] truncate mt-0.5">{userProfile?.email || ""}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600">
                {userProfile?.plan ? `${userProfile.plan.toUpperCase()} PLAN` : "FREE PLAN"}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Pro
              </span>
            </div>
          </div>

          {/* Premium Billing / Storage Overview */}
          <div className="mt-3 rounded-xl bg-[#FDF8F1] p-3 border border-[#2D2D2D]/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#766D66]">Cloud Usage</span>
              <span className="text-[9px] font-bold text-[#2D2D2D]">
                {userProfile ? `${Math.round((userProfile.storageUsedGB / userProfile.storageMaxGB) * 100)}%` : "0%"}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#EFE6DD]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] transition-all duration-500"
                style={{ width: userProfile ? `${(userProfile.storageUsedGB / userProfile.storageMaxGB) * 100}%` : "0%" }}
              />
            </div>
            <p className="mt-2 text-[9px] text-[#766D66] flex items-center justify-between">
              <span>{userProfile ? `${userProfile.storageUsedGB} GB` : "0 GB"} of {userProfile?.storageMaxGB || 10} GB</span>
              <Link href="/dashboard/storage" onClick={() => setDropdownOpen(false)} className="font-semibold text-[#D67D5C] hover:underline">Manage</Link>
            </p>
          </div>

          <div className="mt-2.5 space-y-0.5">
            <Link
              href="/dashboard/account"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-[#574F49] hover:bg-[#FDF8F1] transition group"
            >
              <span className="material-symbols-outlined text-[16px] text-[#766D66] transition group-hover:rotate-45">tune</span>
              Account Settings
            </Link>
            <Link
              href="/dashboard/storage"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-[#574F49] hover:bg-[#FDF8F1] transition group"
            >
              <span className="material-symbols-outlined text-[16px] text-[#766D66] transition group-hover:scale-110">cloud</span>
              Storage Overview
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 transition text-left group"
            >
              <span className="material-symbols-outlined text-[16px] transition group-hover:-translate-x-0.5">logout</span>
              Sign Out
            </button>
          </div>
        </div>
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

/* ── Search Input Component (Client Side URL parameter sync) ───── */
function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchValue(searchParams ? searchParams.get("search") || "" : "");
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleSearch = (val: string) => {
    setSearchValue(val);
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set("search", val);
    } else {
      params.delete("search");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <input
      aria-label="Search events"
      className="w-full bg-transparent text-sm text-[#2D2D2D] outline-none placeholder:text-[#8E877F]"
      placeholder="Search events or guests"
      value={searchValue}
      onChange={(e) => handleSearch(e.target.value)}
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
  userName,
}: {
  event?: EventRecord;
  activePath?: string;
  activeSection?: MainSection;
  onMenuToggle: () => void;
  onCreateEvent: () => void;
  onOpenNotifications: () => void;
  userName?: string;
}) {
  const activeSubNav = activePath !== undefined
    ? workspaceNavigation.find((item) => item.href === activePath)
    : null;

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch events owned by user
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: events } = await (supabase as any)
          .from("events")
          .select("id")
          .eq("owner_id", user.id);

        if (!events || events.length === 0) return;
        const eventIds = events.map((e: { id: string }) => e.id);

        // Fetch count of guests and photos created in last 24 hours (excluding dismissed ones)
        const dismissedUntilStr = localStorage.getItem("notifications_dismissed_until");
        const dismissedTime = dismissedUntilStr ? new Date(dismissedUntilStr).getTime() : 0;
        const oneDayAgoTime = Date.now() - 24 * 60 * 60 * 1000;
        const querySince = new Date(Math.max(dismissedTime, oneDayAgoTime)).toISOString();
        
        const [guestsCountRes, photosCountRes] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("guests")
            .select("id", { count: "exact", head: true })
            .in("event_id", eventIds)
            .gt("created_at", querySince),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("event_photos")
            .select("id", { count: "exact", head: true })
            .in("event_id", eventIds)
            .gt("uploaded_at", querySince),
        ]);

        const totalUnread = (guestsCountRes.count ?? 0) + (photosCountRes.count ?? 0);
        setUnreadCount(totalUnread);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();
    
    // Listen for custom notifications_updated event
    const handleDismissUpdate = () => {
      fetchUnreadCount();
    };
    window.addEventListener("notifications_updated", handleDismissUpdate);
    
    // Set up polling interval to check for new alerts every 20 seconds
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", handleDismissUpdate);
    };
  }, []);

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
      {!event && (
        <label className="ml-auto flex h-10 w-full max-w-[280px] items-center gap-2.5 rounded-xl border border-[#2D2D2D]/8 bg-white/80 px-3.5 text-[#8E877F] transition focus-within:border-[#D67D5C]/45 focus-within:shadow-[0_0_0_3px_rgba(214,125,92,0.08)] sm:h-11 sm:max-w-[318px] sm:px-4">
          <span className="material-symbols-outlined text-[19px]">search</span>
          <Suspense fallback={
            <input
              className="w-full bg-transparent text-sm text-[#2D2D2D] outline-none placeholder:text-[#8E877F]"
              placeholder="Search events or guests"
              disabled
            />
          }>
            <SearchInput />
          </Suspense>
        </label>
      )}

      {/* Notifications Button */}
      <button
        onClick={onOpenNotifications}
        aria-label="Notifications"
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2D2D2D]/8 bg-white text-[#625D58] transition-all hover:bg-[#FDF8F1] hover:scale-105 active:scale-95 duration-200 group sm:h-11 sm:w-11 ${event ? "ml-auto" : ""}`}
      >
        <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:rotate-12">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D67D5C] text-[9px] font-bold text-white border-2 border-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Avatar (Dropdown menu) */}
      <NavbarProfile userName={userName} />

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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const venueRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const adminNameRef = useRef<HTMLInputElement>(null);
  const adminPhoneRef = useRef<HTMLInputElement>(null);
  const adminEmailRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    date: "",
    type: "marriage" as "marriage" | "hackathon" | "meetup" | "corporate" | "other",
    adminName: "",
    adminPhone: "",
    adminEmail: "",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFileError, setCoverFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    venue?: string;
    date?: string;
    adminName?: string;
    adminPhone?: string;
    adminEmail?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      const searchName = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("search") || "" : "";
      const timer = setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          name: searchName,
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const focusFirstError = (errs: typeof errors) => {
    if (errs.name && nameRef.current) {
      nameRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      nameRef.current.focus();
    } else if (errs.venue && venueRef.current) {
      venueRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      venueRef.current.focus();
    } else if (errs.date && dateRef.current) {
      dateRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      dateRef.current.focus();
    } else if (errs.adminName && adminNameRef.current) {
      adminNameRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      adminNameRef.current.focus();
    } else if (errs.adminPhone && adminPhoneRef.current) {
      adminPhoneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      adminPhoneRef.current.focus();
    } else if (errs.adminEmail && adminEmailRef.current) {
      adminEmailRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      adminEmailRef.current.focus();
    }
  };

  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setCoverFileError("Image must be under 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!["image/jpeg","image/png","image/webp","image/heic"].includes(file.type)) {
      setCoverFileError("Please upload a JPEG, PNG, WebP, or HEIC image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setCoverFileError(null);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCoverFile(null);
    setCoverPreview(null);
    setCoverFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      newErrors.name = "Please enter an event name.";
    }

    const trimmedVenue = formData.venue.trim();
    if (!trimmedVenue || trimmedVenue.length < 2) {
      newErrors.venue = "Please enter a venue.";
    }

    if (!formData.date) {
      newErrors.date = "Please select a future date.";
    } else {
      const today = todayISODate();
      if (formData.date < today) {
        newErrors.date = "Please select a future date.";
      }
    }

    const trimmedAdminName = formData.adminName.trim();
    if (!trimmedAdminName || trimmedAdminName.length < 2) {
      newErrors.adminName = "Please enter a contact name.";
    }

    if (formData.adminPhone.replace(/\D/g, "").length !== 10) {
      newErrors.adminPhone = "Please enter a valid 10-digit phone number.";
    }

    const trimmedAdminEmail = formData.adminEmail.trim();
    if (!trimmedAdminEmail) {
      newErrors.adminEmail = "Email is required.";
    } else if (!EMAIL_RE.test(trimmedAdminEmail)) {
      newErrors.adminEmail = "Please enter a valid email address.";
    }

    setErrors(newErrors);
    setError(null);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in to create an event.");
      setLoading(false);
      return;
    }

    let coverUrl: string | null = null;

    // Upload cover image if provided
    if (coverFile) {
      setUploading(true);
      const ext = coverFile.name.split(".").pop() ?? "jpg";
      const storagePath = `${user.id}/${Date.now()}.${ext}`;

      // Simulate progress
      let prog = 0;
      const interval = setInterval(() => {
        prog = Math.min(prog + 20, 90);
        setUploadProgress(prog);
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from("event-covers")
        .upload(storagePath, coverFile, { upsert: true });

      clearInterval(interval);
      setUploadProgress(100);
      setUploading(false);

      if (uploadError) {
        setError(`Cover upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("event-covers")
        .getPublicUrl(storagePath);
      coverUrl = urlData.publicUrl;
    }

    // Insert event record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newEvent, error: insertError } = await (supabase as any)
      .from("events")
      .insert({
        owner_id: user.id,
        name: formData.name,
        venue: formData.venue || null,
        event_date: formData.date || null,
        event_type: formData.type,
        cover_url: coverUrl,
        admin_name: formData.adminName || null,
        admin_phone: formData.adminPhone || null,
        admin_email: formData.adminEmail || null,
        status: "active" as const,
        qr_active: true,
      })
      .select()
      .single();

    if (insertError) {
      setError(`Failed to create event: ${insertError.message}`);
      setLoading(false);
      return;
    }

    // Reset and close
    setFormData({ name: "", venue: "", date: "", type: "marriage", adminName: "", adminPhone: "", adminEmail: "" });
    setCoverFile(null);
    setCoverPreview(null);
    setLoading(false);
    onClose();

    // Navigate to the new event workspace
    router.push(`/dashboard/events/${newEvent.id}`);
    router.refresh();
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>

          {/* Cover Image Uploader */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66] mb-2">Cover Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleFileChange}
              className="hidden"
              id="cover-upload"
            />
            <label
              htmlFor="cover-upload"
              className={`relative flex min-h-[110px] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                coverPreview
                  ? "border-green-300 bg-green-50/20"
                  : uploading
                    ? "border-[#D67D5C]/40 bg-[#D67D5C]/5"
                    : "border-[#D9CEC5] bg-white hover:border-[#D67D5C]/55"
              }`}
            >
              {coverPreview ? (
                <div className="flex w-full items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPreview} alt="Cover preview" className="h-10 w-10 rounded-xl object-cover" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-[#2D2D2D]">{coverFile?.name}</p>
                      <p className="text-[10px] text-green-600 font-medium">Ready to upload</p>
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
                  <p className="text-xs font-semibold text-[#2D2D2D]">Uploading cover...</p>
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
            </label>
            {coverFileError && (
              <p className="mt-1.5 text-[10px] font-semibold text-red-600">
                {coverFileError}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Event Name</label>
              <input
                ref={nameRef}
                required
                maxLength={200}
                minLength={2}
                placeholder="e.g. Villa d'Este Celebration"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearError("name"); }}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
              {errors.name && (
                <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Type of Event</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-3 text-xs outline-none transition focus:border-[#D67D5C]/50 cursor-pointer"
              >
                <option value="marriage">Marriage / Wedding</option>
                <option value="hackathon">Hackathon</option>
                <option value="meetup">Meetup / Networking</option>
                <option value="corporate">Corporate / Conference</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Venue / Location</label>
              <input
                ref={venueRef}
                required
                maxLength={200}
                minLength={2}
                placeholder="e.g. Lake Como, Italy"
                value={formData.venue}
                onChange={(e) => { setFormData({ ...formData, venue: e.target.value }); clearError("venue"); }}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
              {errors.venue && (
                <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.venue}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#766D66]">Event Date</label>
              <input
                ref={dateRef}
                required
                type="date"
                value={formData.date}
                min={todayISODate()}
                onChange={(e) => { setFormData({ ...formData, date: e.target.value }); clearError("date"); }}
                className="mt-2 h-11 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50 focus:shadow-[0_0_0_3px_rgba(214,125,92,0.08)]"
              />
              {errors.date && (
                <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.date}</p>
              )}
            </div>
          </div>

          {/* Event Admin details section */}
          <div className="border-t border-[#2D2D2D]/6 pt-4 mt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#B36144] mb-3">Event Admin Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#766D66]">Admin Name</label>
                <input
                  ref={adminNameRef}
                  required
                  maxLength={200}
                  minLength={2}
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.adminName}
                  onChange={(e) => { setFormData({ ...formData, adminName: e.target.value }); clearError("adminName"); }}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50"
                />
                {errors.adminName && (
                  <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.adminName}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#766D66]">Admin Phone Number</label>
                <input
                  ref={adminPhoneRef}
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="e.g. +1 (555) 019-2831"
                  value={formData.adminPhone}
                  onChange={(e) => { setFormData({ ...formData, adminPhone: e.target.value.replace(/\D/g, "").slice(0, 12) }); clearError("adminPhone"); }}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50"
                />
                {errors.adminPhone && (
                  <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.adminPhone}</p>
                )}
              </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#766D66]">Admin Email ID</label>
                  <input
                    ref={adminEmailRef}
                    required
                    type="email"
                    maxLength={320}
                    placeholder="e.g. sarah@events.com"
                    value={formData.adminEmail}
                    onChange={(e) => { setFormData({ ...formData, adminEmail: e.target.value }); clearError("adminEmail"); }}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#2D2D2D]/8 bg-white px-4 text-xs outline-none transition focus:border-[#D67D5C]/50"
                  />
                  {errors.adminEmail && (
                    <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.adminEmail}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

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
              className="flex-1 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] py-3 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(214,125,92,0.2)] hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Creating...</>
              ) : "Create Workspace"}
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
interface NotificationItem {
  id: string;
  type: "guest" | "photo" | "system";
  eventId?: string;
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  icon: string;
  color: string;
  iconColor: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function NotificationDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const activeTab = "all";
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch user's events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: events, error: eventsErr } = await (supabase as any)
        .from("events")
        .select("id, name")
        .eq("owner_id", user.id);

      if (eventsErr || !events || events.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const eventIds = events.map((e: { id: string }) => e.id);
      const eventMap = new Map<string, string>(events.map((e: { id: string; name: string }) => [e.id, e.name]));

      // 2. Fetch recent guests (last 5)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: recentGuests } = await (supabase as any)
        .from("guests")
        .select("id, display_name, phone, created_at, event_id")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false })
        .limit(5);

      // 3. Fetch recent photos (last 5)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: recentPhotos } = await (supabase as any)
        .from("event_photos")
        .select("id, original_filename, uploaded_at, event_id")
        .in("event_id", eventIds)
        .order("uploaded_at", { ascending: false })
        .limit(5);

      const formatTimeAgo = (date: Date) => {
        const diffMs = new Date().getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      };

      const dismissedUntilStr = localStorage.getItem("notifications_dismissed_until");
      const dismissedUntil = dismissedUntilStr ? new Date(dismissedUntilStr).getTime() : 0;
      const items: NotificationItem[] = [];

      (recentGuests ?? []).forEach((g: { id: string; display_name: string | null; phone: string | null; created_at: string; event_id: string }) => {
        const timestamp = new Date(g.created_at).getTime();
        if (timestamp > dismissedUntil) {
          items.push({
            id: `guest-${g.id}`,
            type: "guest",
            eventId: g.event_id,
            title: `${g.display_name ?? "New Guest"} joined`,
            desc: `Registered for "${eventMap.get(g.event_id) ?? "Event"}" · ${g.phone}`,
            time: formatTimeAgo(new Date(g.created_at)),
            timestamp,
            icon: "person_add",
            color: "border-emerald-500/10 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] hover:border-emerald-500/20 text-[#2D2D2D]",
            iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
            actionUrl: `/dashboard/events/${g.event_id}/attendees`,
            actionLabel: "View Attendees",
          });
        }
      });

      (recentPhotos ?? []).forEach((p: { id: string; original_filename: string; uploaded_at: string; event_id: string }) => {
        const timestamp = new Date(p.uploaded_at).getTime();
        if (timestamp > dismissedUntil) {
          items.push({
            id: `photo-${p.id}`,
            type: "photo",
            eventId: p.event_id,
            title: "New Photo Ingested",
            desc: `Uploaded "${p.original_filename}" to "${eventMap.get(p.event_id) ?? "Event"}"`,
            time: formatTimeAgo(new Date(p.uploaded_at)),
            timestamp,
            icon: "photo_library",
            color: "border-[#D67D5C]/10 bg-[#D67D5C]/[0.02] hover:bg-[#D67D5C]/[0.05] hover:border-[#D67D5C]/20 text-[#2D2D2D]",
            iconColor: "text-[#D67D5C] bg-orange-50 border-orange-100",
            actionUrl: `/dashboard/events/${p.event_id}/gallery`,
            actionLabel: "Open Gallery",
          });
        }
      });

      // System notification
      const systemTimestamp = Date.now() - 3600000;
      if (systemTimestamp > dismissedUntil) {
        items.push({
          id: "system-storage",
          type: "system",
          title: "Cloud Engine Ready",
          desc: "Allocated storage limits are within thresholds. 10.0 GB available.",
          time: "1 hour ago",
          timestamp: systemTimestamp,
          icon: "cloud_done",
          color: "border-indigo-500/10 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05] hover:border-indigo-500/20 text-[#2D2D2D]",
          iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100",
          actionUrl: "/dashboard/storage",
          actionLabel: "Check Status",
        });
      }

      items.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(items);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        loadNotifications();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loadNotifications]);

  const handleRefresh = async () => {
    setSyncing(true);
    await loadNotifications();
    setTimeout(() => {
      setSyncing(false);
    }, 600);
  };

  const handleClearNotifications = () => {
    localStorage.setItem("notifications_dismissed_until", new Date().toISOString());
    setNotifications([]);
    window.dispatchEvent(new Event("notifications_updated"));
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "guests") return n.type === "guest";
    if (activeTab === "photos") return n.type === "photo";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#2D2D2D]/35 backdrop-blur-xs transition-opacity duration-300" onClick={onClose} />

      {/* Slide out drawer */}
      <div className="relative h-full w-[380px] max-w-full border-l border-[#2D2D2D]/6 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl flex flex-col animate-slide-in">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D2D]/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#D67D5C] font-semibold">notifications</span>
            <h3 className="text-base font-bold text-[#2D2D2D] tracking-tight">Activity Feed</h3>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Sync Refresh Button */}
            <button
              onClick={handleRefresh}
              title="Sync Feed"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#FDF8F1] text-[#625D58] border border-[#2D2D2D]/5 transition active:scale-95"
            >
              <span className={`material-symbols-outlined text-[18px] ${syncing ? "animate-spin text-[#D67D5C]" : ""}`}>
                sync
              </span>
            </button>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 text-red-500 border border-red-100 transition active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>



        {/* Scrollable list */}
        <div className="mt-5 flex-1 overflow-y-auto space-y-3.5 pr-1 dash-scroll">
          {loading && !syncing ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#827970] gap-3">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#2D2D2D]/10 border-t-[#D67D5C]" />
              <p className="text-xs font-medium tracking-wide">Syncing Workspace Feed...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#827970] text-center px-4">
              <span className="material-symbols-outlined text-4xl text-[#D9CEC5] mb-2">notifications_off</span>
              <p className="text-xs font-bold text-[#2D2D2D]">No alerts matches filter</p>
              <p className="text-[10px] text-[#827970] mt-1 max-w-[200px]">New guest signups or photo ingests will populate here automatically.</p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`group flex gap-3.5 rounded-2xl p-4 border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${item.color}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-medium ${item.iconColor}`}>
                  <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="text-xs font-bold text-[#2D2D2D] leading-tight group-hover:text-[#D67D5C] transition-colors">{item.title}</p>
                    <span className="text-[9px] text-[#A69C93] shrink-0 flex items-center gap-1 font-medium mt-0.5">
                      <span className="material-symbols-outlined text-[11px]">schedule</span>
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#574F49] leading-relaxed break-words">{item.desc}</p>
                  
                  {/* Contextual Action Button */}
                  {item.actionUrl && (
                    <button
                      onClick={() => {
                        if (item.actionUrl) {
                          router.push(item.actionUrl);
                          onClose();
                        }
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#D67D5C] bg-[#D67D5C]/5 hover:bg-[#D67D5C]/10 border border-[#D67D5C]/10 hover:border-[#D67D5C]/20 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <span className="material-symbols-outlined text-[12px] font-bold">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer actions */}
        <div className="mt-6 border-t border-[#2D2D2D]/6 pt-4 flex gap-2.5">
          <button
            onClick={handleClearNotifications}
            disabled={notifications.length === 0}
            className="flex-1 py-3 rounded-xl border border-[#2D2D2D]/8 bg-white text-xs font-bold text-[#625D58] hover:bg-[#FDF8F1] hover:text-[#2D2D2D] transition disabled:opacity-50"
          >
            Dismiss All
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-xs font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition"
          >
            Close Feed
          </button>
        </div>
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
  userName,
}: {
  active: MainSection;
  children: ReactNode;
  userName?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const pathname = usePathname();
  useEffect(() => {
    const timer = setTimeout(() => {
      setSidebarOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      const timer = setTimeout(() => {
        setIsCollapsed(saved === "true");
      }, 0);
      return () => clearTimeout(timer);
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
          userName={userName}
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
  userName,
}: {
  event: EventRecord;
  activePath: string;
  children: ReactNode;
  userName?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const rootHref = `/dashboard/events/${event.id}`;

  const pathname = usePathname();
  useEffect(() => {
    const timer = setTimeout(() => {
      setSidebarOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      const timer = setTimeout(() => {
        setIsCollapsed(saved === "true");
      }, 0);
      return () => clearTimeout(timer);
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
            style={{ backgroundImage: event.cover_url ? `url("${event.cover_url}")` : undefined }}
          />
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
            {event.cover_url ? (
              <div
                className="h-24 bg-cover bg-center"
                style={{ backgroundImage: `url("${event.cover_url}")` }}
              />
            ) : (
              <div className="h-24 bg-gradient-to-br from-[#D67D5C]/20 to-[#F4A261]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/30 text-3xl">image</span>
              </div>
            )}
            <div className="p-4">
              <p className="truncate text-sm font-medium text-white">{event.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/48">
                <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                {event.event_date ?? "Date TBD"}
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
          userName={userName}
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
