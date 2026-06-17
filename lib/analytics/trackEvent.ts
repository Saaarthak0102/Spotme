"use client";

/**
 * trackEvent — Reusable client-side helper for discrete action tracking.
 *
 * Writes to `user_events` via POST /api/track-event, using the same
 * session_id convention from page_visits (sessionStorage-based).
 * Fails silently — never throws or blocks rendering.
 *
 * Usage:
 *   trackEvent("button_click", "Create Event");
 *   trackEvent("photo_download", photoId, { page_path: "/event/123/gallery" });
 *   trackEvent("photo_search", "selfie", { results_count: 0 });
 */

function getSessionId(): string {
  try {
    const key = "spotme_session_id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    // sessionStorage might be blocked in some contexts
    return "unknown";
  }
}

export function trackEvent(
  eventType: string,
  eventLabel?: string,
  options?: {
    page_path?: string;
    user_id?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    const payload = {
      event_type: eventType,
      event_label: eventLabel ?? null,
      session_id: getSessionId(),
      user_id: options?.user_id ?? null,
      page_path: options?.page_path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      metadata: options?.metadata ?? null,
    };

    // Fire-and-forget — don't await in a way that blocks UI
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silently swallow network errors
    });
  } catch {
    // Silently swallow any errors
  }
}
