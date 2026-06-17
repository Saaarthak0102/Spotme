-- ============================================================
-- Migration 021: Add user_events table for discrete action tracking
-- Supports KPIs: Most Clicked Button, CTA Click Rate, Photo Search/Download Rate, Zero-Result Searches
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,   -- e.g. "button_click", "photo_search", "photo_download"
  event_label text,                   -- e.g. button name, photo_id, search type
  session_id  text        NOT NULL,   -- reuse same session_id convention from page_visits
  user_id     uuid,                   -- link to profiles if logged in (nullable)
  page_path   text,                   -- where the event happened
  metadata    jsonb,                  -- flexible field for event-specific extras
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Primary query indexes: group-by event_type, filter by created_at
CREATE INDEX IF NOT EXISTS user_events_event_type_idx  ON public.user_events(event_type);
CREATE INDEX IF NOT EXISTS user_events_created_at_idx  ON public.user_events(created_at);
CREATE INDEX IF NOT EXISTS user_events_session_id_idx  ON public.user_events(session_id);

-- -------------------------------------------------------
-- RLS: Same pattern as page_visits
-- Inserts go through API route using service-role key.
-- Only admins can read.
-- -------------------------------------------------------
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view user_events" ON public.user_events;
CREATE POLICY "Admins can view user_events"
  ON public.user_events FOR SELECT
  TO authenticated
  USING ( public.is_admin() );

-- Service role gets full access (used by the API route)
GRANT ALL ON public.user_events TO service_role;
GRANT ALL ON public.user_events TO postgres;
-- Admins can read via RLS
GRANT SELECT ON public.user_events TO authenticated;
