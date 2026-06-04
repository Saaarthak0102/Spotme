"use client";

import { useEffect } from "react";

export function SessionInitializer({ eventId }: { eventId: string }) {
  useEffect(() => {
    if (!eventId) return;

    fetch("/api/guest/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to initialize guest session cookie:", res.statusText);
        }
      })
      .catch((err) => {
        console.error("Error calling guest session API:", err);
      });
  }, [eventId]);

  return null;
}
