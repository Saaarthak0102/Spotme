import { redirect } from "next/navigation";
import { GalleryPageClient } from "./gallery-client";
import { fetchGuestGallery, getGuestEvent } from "@/lib/guest-data-server";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Privacy Mode check — server-side redirect before any photos are fetched
  const event = await getGuestEvent(eventId);
  if (event && (event as typeof event & { privacy_mode?: boolean }).privacy_mode) {
    redirect(`/event/${eventId}/find-me`);
  }

  const photos = await fetchGuestGallery(eventId);
  return <GalleryPageClient eventId={eventId} photos={photos} />;
}
