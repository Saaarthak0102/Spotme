import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuestEvent, getGuestEventIds } from "@/lib/guest-data";

export function generateStaticParams() {
  return getGuestEventIds().map((eventId) => ({ eventId }));
}

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getGuestEvent(eventId);
  if (!event) notFound();

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* ── Hero Cover ─────────────────────────────── */}
      <div className="relative h-[55vh] min-h-[340px] sm:h-[60vh] sm:min-h-[420px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${event.cover}")` }}
        />
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
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                {event.date}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {event.venue}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Card ────────────────────────────── */}
      <div className="relative -mt-8 px-5 sm:px-8">
        <div className="mx-auto max-w-lg rounded-[28px] border border-[#2D2D2D]/6 bg-white/80 p-6 shadow-[0_20px_60px_rgba(45,45,45,0.08)] backdrop-blur-2xl sm:p-8">
          {/* Guest count */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["A", "T", "M"].map((letter, i) => (
                <span
                  key={letter}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
                  style={{
                    background: ["#D67D5C", "#F4A261", "#C46A4A"][i],
                    zIndex: 3 - i,
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-sm text-[#766D66]">
              <span className="font-semibold text-[#2D2D2D]">{event.guests}</span> guests have joined
            </p>
          </div>

          {/* How it works */}
          <div className="mb-6 space-y-3">
            {[
              { step: "1", text: "Verify with WhatsApp", icon: "forum" },
              { step: "2", text: "Browse all event photos", icon: "photo_library" },
              { step: "3", text: "Upload a selfie to find your photos", icon: "face" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FDF8F1] to-[#FFF3EB] text-xs font-bold text-[#D67D5C]">
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
            Powered by Revela · Your photos are private and secure
          </p>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-12" />
    </div>
  );
}
