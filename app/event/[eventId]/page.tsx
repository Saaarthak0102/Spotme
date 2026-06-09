import { notFound } from "next/navigation";
import Link from "next/link";
import { getGuestEvent, getPublicPhotoCount } from "@/lib/guest-data-server";
import type { Event } from "@/types/database";
import { GuestRedirector } from "./guest-redirector";

export const dynamic = "force-dynamic";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getGuestEvent(eventId);

  if (!event) notFound();

  const privacyMode = (event as Event & { privacy_mode?: boolean }).privacy_mode ?? false;

  // Fetch photo count for the badge (no session required — public info for non-private events)
  const photoCount = privacyMode ? 0 : await getPublicPhotoCount(eventId);

  // Steps change depending on privacy mode
  const steps = privacyMode
    ? [
        { step: "1", text: "Enter your WhatsApp number", icon: "forum" },
        { step: "2", text: "Upload a selfie", icon: "add_a_photo" },
        { step: "3", text: "AI finds only YOUR photos — privately", icon: "face_retouching_natural" },
      ]
    : [
        { step: "1", text: "Enter your WhatsApp number", icon: "forum" },
        { step: "2", text: "Browse all event photos", icon: "photo_library" },
        { step: "3", text: "Upload a selfie to find your photos", icon: "face" },
      ];

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <GuestRedirector eventId={eventId} />
      {/* ── Hero Cover ─────────────────────────────── */}
      <div className="relative h-[55vh] min-h-[340px] sm:h-[60vh] sm:min-h-[420px]">
        {event.cover_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${event.cover_url}")` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#D67D5C]/30 to-[#F4A261]/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1714] via-[#1A1714]/40 to-transparent" />

        {/* Event info overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <div className="mx-auto max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4A261]">
              You&apos;re invited
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              {event.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/70">
              {event.event_date && (
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  {new Date(event.event_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {event.venue}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Card ────────────────────────────── */}
      <div className="relative -mt-8 px-5 sm:px-8">
        <div className="mx-auto max-w-lg rounded-[28px] border border-[#2D2D2D]/6 bg-white/80 p-6 shadow-[0_20px_60px_rgba(45,45,45,0.08)] backdrop-blur-2xl sm:p-8">

          {/* Privacy Mode badge OR photo count badge */}
          {privacyMode ? (
            <div className="mb-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 px-4 py-3">
              <span className="material-symbols-outlined text-[18px] text-violet-500">lock</span>
              <p className="text-sm text-violet-800">
                <span className="font-semibold">Privacy Mode is on.</span> Your photos are shared only with you.
              </p>
            </div>
          ) : photoCount > 0 ? (
            <div className="mb-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FDF8F1] to-[#FFF3EB] px-4 py-3">
              <span className="material-symbols-outlined text-[18px] text-[#D67D5C]">photo_library</span>
              <p className="text-sm text-[#574F49]">
                <span className="font-semibold text-[#2D2D2D]">{photoCount}</span> photos available to discover
              </p>
            </div>
          ) : null}

          {/* How it works */}
          <div className="mb-6 space-y-3">
            {steps.map((item) => (
              <div key={item.step} className="flex items-center gap-3.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  privacyMode
                    ? "bg-gradient-to-br from-violet-50 to-purple-100 text-violet-600"
                    : "bg-gradient-to-br from-[#FDF8F1] to-[#FFF3EB] text-[#D67D5C]"
                }`}>
                  {item.step}
                </span>
                <p className="text-sm text-[#4D4945]">{item.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={`/event/${eventId}/verify`}
            className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-base font-semibold text-white shadow-[0_12px_28px_rgba(214,125,92,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(214,125,92,0.3)] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">login</span>
            Join This Event
          </Link>

          <p className="mt-4 text-center text-[11px] text-[#A69C93]">
            Powered by Spotme · Your photos are private and secure
          </p>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-12" />
    </div>
  );
}
