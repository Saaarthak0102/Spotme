"use client";

import { useGuestRedirect } from "@/lib/use-guest-redirect";

export function GuestRedirector({ eventId }: { eventId: string }) {
  useGuestRedirect(eventId);
  return null;
}
