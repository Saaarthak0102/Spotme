import type { Metadata } from "next";
import Link from "next/link";
import { SessionInitializer } from "./session-initializer";
import { getGuestEvent } from "@/lib/guest-data-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getGuestEvent(eventId);

  if (!event) {
    return {
      title: "Event Not Found | Revela",
    };
  }

  const images = event.cover_url ? [event.cover_url] : ["/opengraph-image.png"];

  return {
    title: `${event.name} | Revela`,
    description: `Join ${event.name} on Revela. View photos and get instant access to digital keepsakes using AI face matching.`,
    openGraph: {
      title: `${event.name} | Revela`,
      description: `Join ${event.name} on Revela. View photos and get instant access to digital keepsakes using AI face matching.`,
      images: images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name} | Revela`,
      description: `Join ${event.name} on Revela. View photos and get instant access to digital keepsakes using AI face matching.`,
      images: images,
    },
  };
}

export default async function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <div className="min-h-screen bg-[#FEFCFB] font-sans text-[#2D2D2D]">
      {/* Session initializer runs on client load */}
      <SessionInitializer eventId={eventId} />

      {/* Minimal top branding bar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-center bg-white/70 backdrop-blur-xl border-b border-[#2D2D2D]/5 sm:h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D67D5C] to-[#C46A4A] text-white shadow-sm transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-[16px]">camera</span>
          </span>
          <span className="text-base font-semibold tracking-[-0.03em] text-[#2D2D2D]">Revela</span>
        </Link>
      </header>

      {/* Page content with top padding for fixed header */}
      <main className="pt-14 sm:pt-16">
        {children}
      </main>
    </div>
  );
}
