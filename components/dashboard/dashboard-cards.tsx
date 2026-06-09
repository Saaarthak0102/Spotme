"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Event as EventRecord } from "@/types/database";

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

/* ═══════════════════════════════════════════════════
   Hero Summary — Dashboard Welcome Banner
   ═══════════════════════════════════════════════════ */
export function HeroSummary({
  userName,
  totalEvents,
  totalPhotos,
}: {
  userName?: string;
  totalEvents: number;
  totalPhotos: number;
}) {
  const firstName = userName?.split(" ")[0] ?? "there";
  const stats = [
    { label: "Active events", value: formatCount(totalEvents), change: `${totalEvents} total events`, icon: "calendar_today" },
    { label: "Photos uploaded", value: formatCount(totalPhotos), change: "Across all events", icon: "photo_camera" },
  ];

  return (
    <section className="relative mb-9 overflow-hidden rounded-[30px] border border-[#D67D5C]/10 bg-white/50 p-6 shadow-[0_20px_55px_rgba(72,57,48,0.04)] backdrop-blur-xl sm:p-8 lg:p-9">
      {/* Decorative ambient blurs */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#F4A261]/20 to-[#D67D5C]/10 blur-3xl sm:h-72 sm:w-72" />
      <div className="pointer-events-none absolute -bottom-12 left-[30%] h-40 w-56 rounded-full bg-gradient-to-r from-[#D67D5C]/8 to-[#F4A261]/5 blur-3xl" />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B36144]">Good day, {firstName}</p>
        <h1 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.06em] text-[#2D2D2D] sm:text-3xl lg:text-[40px]">
          Your events are finding their people.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#766D66]">
          {totalEvents > 0
            ? `You have ${totalEvents} event${totalEvents > 1 ? "s" : ""} and ${formatCount(totalPhotos)} photos in your gallery.`
            : "Create your first event to get started."}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-2 sm:mt-9">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#2D2D2D]/5 bg-white/60 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(214,125,92,0.06)] sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between text-[#A69C93] sm:mb-6">
                <p className="text-xs font-medium">{stat.label}</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDF8F1] sm:h-9 sm:w-9">
                  <span className="material-symbols-outlined text-[18px] text-[#D67D5C]">{stat.icon}</span>
                </span>
              </div>
              <p className="text-2xl font-semibold tracking-[-0.05em] sm:text-3xl">{stat.value}</p>
              <p className="mt-2 text-xs font-medium text-[#B36144]">{stat.change}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Event Card — Individual Event Tile
   ═══════════════════════════════════════════════════ */
export function EventCard({ event, photoCount, guestCount, isCollaborator = false }: { event: EventRecord; photoCount?: number; guestCount?: number; isCollaborator?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 shadow-[0_10px_28px_rgba(45,45,45,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(214,125,92,0.08)]">
      {/* Cover image */}
      <div className="relative h-40 overflow-hidden sm:h-48">
        {event.cover_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 will-change-transform group-hover:scale-105"
            style={{ backgroundImage: `url("${event.cover_url}")` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#D67D5C]/20 to-[#F4A261]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-[#D67D5C]/30">image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2D2D2D]/50 via-[#2D2D2D]/10 to-transparent" />
        
        {isCollaborator && (
          <span className="absolute top-3 left-3 rounded-full bg-[#D67D5C] px-2.5 py-1 text-[10px] font-semibold text-white shadow-md flex items-center gap-1.5 backdrop-blur-md">
            <span className="material-symbols-outlined text-[13px]">handshake</span>
            Shared
          </span>
        )}
        
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[#625D58] backdrop-blur-md sm:bottom-4 sm:right-4 sm:px-3 sm:py-1.5 sm:text-[11px]">
          QR {event.qr_active ? "Active" : "Draft"}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        <h3 className="text-base font-semibold tracking-[-0.035em] sm:text-lg">{event.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#827970]">
          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
          {event.event_date
            ? new Date(event.event_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : "Date TBD"}
          {event.venue && ` · ${event.venue}`}
        </p>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-gradient-to-r from-[#FBF7F2] to-[#FDF9F6] p-3 sm:mt-5">
          {[
            { label: "Photos", value: formatCount(photoCount ?? 0) },
            { label: "Guests", value: formatCount(guestCount ?? 0) },
          ].map((metric) => (
            <div key={metric.label}>
              <p className="text-[10px] uppercase tracking-wider text-[#958A81]">{metric.label}</p>
              <p className="mt-1 text-sm font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2 sm:mt-5">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="flex-1 rounded-xl bg-[#2D2D2D] px-3 py-2.5 text-center text-xs font-semibold text-white transition-all duration-200 hover:bg-black active:scale-[0.98] sm:px-4 sm:py-3"
          >
            Open Event
          </Link>
          <Link
            href={`/dashboard/events/${event.id}/uploads`}
            className="flex-1 rounded-xl border border-[#D9CEC5] px-3 py-2.5 text-center text-xs font-semibold text-[#574F49] transition-all duration-200 hover:border-[#D67D5C]/50 hover:bg-[#D67D5C]/5 active:scale-[0.98] sm:px-4 sm:py-3"
          >
            Upload Photos
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════
   Events Grid — Event Cards Container
   ═══════════════════════════════════════════════════ */
function EventsGridContent({
  events,
  compact = false,
}: {
  events: Array<EventRecord & { photo_count?: number; guest_count?: number }>;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams ? searchParams.get("search") || "" : "";
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const handleSearch = (val: string) => {
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set("search", val);
    } else {
      params.delete("search");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredEvents = events.filter((event) => {
    const term = search.toLowerCase();
    return (
      event.name.toLowerCase().includes(term) ||
      (event.venue ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.045em] sm:text-xl">Events</h2>
          {!compact && <p className="mt-1 text-sm text-[#827970]">Active event workspaces and gallery delivery.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!compact && (
            <Link href="/dashboard/events" className="text-sm font-medium text-[#B36144] transition hover:text-[#D67D5C]">
              View all events
            </Link>
          )}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-[#D67D5C]/30 bg-white/40 py-16 text-center">
          <span className="material-symbols-outlined text-4xl text-[#D67D5C]/40 mb-3">photo_library</span>
          <p className="text-sm font-medium text-[#2D2D2D]">
            {events.length === 0 ? "No events yet" : "No matching events found"}
          </p>
          <p className="mt-1 text-xs text-[#827970]">
            {events.length === 0 ? "Click 'Create Event' to get started." : "Try adjusting your search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3 transition-all duration-300">
          {filteredEvents.map((event) => (
            <EventCard
              event={event}
              key={event.id}
              photoCount={event.photo_count}
              guestCount={event.guest_count}
              isCollaborator={currentUserId ? event.owner_id !== currentUserId : false}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function EventsGrid(props: {
  events: Array<EventRecord & { photo_count?: number; guest_count?: number }>;
  compact?: boolean;
}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#2D2D2D]/10 border-t-[#D67D5C]" />
      </div>
    }>
      <EventsGridContent {...props} />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════
   Storage Card — Storage Usage Overview
   ═══════════════════════════════════════════════════ */
export function StorageCard({ usedBytes, maxGB }: { usedBytes: number; maxGB: number }) {
  const usedGB = Number((usedBytes / (1024 * 1024 * 1024)).toFixed(3));
  const availableGB = Math.max(0, maxGB - usedGB);
  const pct = maxGB > 0 ? Math.min(100, Math.round((usedGB / maxGB) * 100)) : 0;

  return (
    <section id="storage" className="rounded-[26px] border border-[#2D2D2D]/6 bg-white/65 p-5 backdrop-blur-xl sm:p-6">
      <h2 className="text-base font-semibold tracking-[-0.035em] sm:text-lg">Storage</h2>
      <div className="mt-5 flex items-center gap-5 sm:mt-6 sm:gap-6">
        {/* Circular indicator */}
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
          style={{
            background: `conic-gradient(#D67D5C 0% ${pct}%, #EFE6DD ${pct}% 100%)`
          }}
        >
          <div className="flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full bg-white sm:h-[74px] sm:w-[74px]">
            <p className="text-lg font-semibold sm:text-xl">{pct}%</p>
            <p className="text-[9px] text-[#827970] sm:text-[10px]">Used</p>
          </div>
        </div>
        <div className="space-y-2.5 text-sm sm:space-y-3">
          <div>
            <p className="text-xs text-[#827970]">Used storage</p>
            <p className="mt-0.5 font-semibold sm:mt-1">{usedGB.toFixed(2)} GB</p>
          </div>
          <div>
            <p className="text-xs text-[#827970]">Available</p>
            <p className="mt-0.5 font-semibold sm:mt-1">{availableGB.toFixed(2)} GB</p>
          </div>
        </div>
      </div>
      <div className="mt-5 h-1.5 rounded-full bg-[#EFE6DD] sm:mt-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-[#827970]">Max storage limit is {maxGB} GB.</p>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Plan Card — Current Subscription Plan
   ═══════════════════════════════════════════════════ */
export function PlanCard({
  plan,
  eventsUsed,
  maxEvents,
  usedBytes,
  maxGB,
}: {
  plan: string;
  eventsUsed: number;
  maxEvents: number;
  usedBytes: number;
  maxGB: number;
}) {
  const planLabels: Record<string, string> = {
    free: "Starter Pack",
    pro: "Pro Plan",
    unlimited: "Unlimited Plan",
  };

  const usedGB = Number((usedBytes / (1024 * 1024 * 1024)).toFixed(3));
  const availableGB = Math.max(0, maxGB - usedGB);

  return (
    <section id="plan" className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2D2D2D] to-[#1F1F1F] p-5 text-white sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium tracking-[-0.035em] sm:text-lg">
          {planLabels[plan] || "Subscription"}
        </h2>
        <span className="rounded-full bg-gradient-to-r from-[#D67D5C]/20 to-[#F4A261]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#F2B29A]">
          Current
        </span>
      </div>
      <div className="mt-5 space-y-2.5 text-sm sm:mt-6 sm:space-y-3">
        <div className="flex justify-between text-white/58">
          <span>Events</span>
          <span className="font-medium text-white">
            {eventsUsed} of {maxEvents > 10000 ? "∞" : maxEvents}
          </span>
        </div>
        <div className="flex justify-between text-white/58">
          <span>Storage remaining</span>
          <span className="font-medium text-white">
            {availableGB.toFixed(2)} GB
          </span>
        </div>
        <div className="flex justify-between text-white/58">
          <span>Renews</span>
          <span className="font-medium text-white">Monthly</span>
        </div>
      </div>
      <Link
        href="/dashboard/account"
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] py-3 text-xs font-semibold text-white transition-all duration-200 hover:shadow-[0_6px_16px_rgba(214,125,92,0.35)] active:scale-[0.98] sm:mt-7"
      >
        Upgrade / Change Plan
      </Link>
    </section>
  );
}
