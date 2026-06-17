"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Generates or reuses an anonymous session ID stored in sessionStorage.
 * Not tied to any user PII — purely for grouping page visits within a browser tab session.
 */
function getSessionId(): string {
  const key = "spotme_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

/**
 * Fires a single POST to /api/track-visit with the current page info.
 * Fails silently — never throws or blocks rendering.
 */
async function trackVisit(pathname: string, searchParams: URLSearchParams) {
  try {
    const payload: Record<string, string | null> = {
      page_path: pathname,
      utm_source: searchParams.get("utm_source"),
      utm_medium: searchParams.get("utm_medium"),
      utm_campaign: searchParams.get("utm_campaign"),
      utm_content: searchParams.get("utm_content"),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      session_id: getSessionId(),
    };

    // Fire-and-forget — don't await in a way that blocks UI
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Use keepalive so the request completes even if the page navigates away
      keepalive: true,
    }).catch(() => {
      // Silently swallow network errors
    });
  } catch {
    // Silently swallow any errors (e.g. sessionStorage blocked)
  }
}

/**
 * Client component that tracks page visits.
 * Renders nothing — only fires the tracking call on pathname changes.
 * Excludes admin and dashboard paths from tracking.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    // Don't track admin or dashboard pages
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return;
    }

    // Don't double-track the same path (e.g. on re-renders)
    const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (fullPath === lastTrackedPath.current) {
      return;
    }
    lastTrackedPath.current = fullPath;

    trackVisit(pathname, searchParams);
  }, [pathname, searchParams]);

  return null;
}
