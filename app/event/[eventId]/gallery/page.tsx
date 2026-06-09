import { redirect } from "next/navigation";
import { GalleryPageClient } from "./gallery-client";
import { fetchGuestGallery, getGuestEvent } from "@/lib/guest-data-server";
import { hasEventSession } from "@/lib/guest-session";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Redirect unauthenticated guests to /verify so they get a session cookie first
  const hasSession = await hasEventSession(eventId);
  if (!hasSession) {
    redirect(`/event/${eventId}/verify`);
  }

  // Privacy Mode check — server-side redirect before any photos are fetched
  const event = await getGuestEvent(eventId);
  if (event && (event as typeof event & { privacy_mode?: boolean }).privacy_mode) {
    redirect(`/event/${eventId}/find-me`);
  }

  const photos = await fetchGuestGallery(eventId);
  return <GalleryPageClient eventId={eventId} photos={photos} />;
}
