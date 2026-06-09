"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Hook to automatically redirect authenticated guests to the correct page
 * (e.g. Gallery, Selfie Upload, or My Photos) depending on their session
 * and selfie upload status.
 */
export function useGuestRedirect(eventId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const guestId = localStorage.getItem(`guest_id_${eventId}`);
    if (!guestId) {
      setLoading(false);
      return;
    }

    // Call status API to see if they have a valid session and check status
    fetch(`/api/guest/${eventId}/status?guestId=${guestId}`)
      .then((res) => {
        if (res.status === 401) {
          // Unauthorized session (cookie expired or missing)
          localStorage.removeItem(`guest_id_${eventId}`);
          localStorage.removeItem(`guest_name_${eventId}`);
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch status");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;

        const { selfieId, eventType, privacyMode } = data;
        const isHackathon = eventType === "hackathon";
        const isPrivate = privacyMode === true;

        // Determine correct destination page
        let destination = `/event/${eventId}/gallery`;
        if (selfieId) {
          destination = `/event/${eventId}/my-photos`;
        } else if (isHackathon || isPrivate) {
          destination = `/event/${eventId}/find-me`;
        }

        // Only redirect if they are currently on the landing page or verification page,
        // and we aren't already at the destination.
        const isLanding = pathname === `/event/${eventId}`;
        const isVerify = pathname === `/event/${eventId}/verify`;

        if ((isLanding || isVerify) && pathname !== destination) {
          router.replace(destination);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("useGuestRedirect error:", err);
        setLoading(false);
      });
  }, [eventId, pathname, router]);

  return { loading };
}
