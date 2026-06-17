-- ============================================================
-- Migration 019: Add page_visits table for website analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_visits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path   text        NOT NULL,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  utm_content text,
  referrer    text,
  session_id  text        NOT NULL,
  visited_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the columns we'll filter/group by
CREATE INDEX IF NOT EXISTS page_visits_page_path_idx  ON public.page_visits(page_path);
CREATE INDEX IF NOT EXISTS page_visits_utm_source_idx ON public.page_visits(utm_source);
CREATE INDEX IF NOT EXISTS page_visits_visited_at_idx ON public.page_visits(visited_at);

-- -------------------------------------------------------
-- RLS: Only admins can read; inserts go through API route
-- using service-role key, so we allow service_role full access.
-- We do NOT allow anon/authenticated direct inserts.
-- -------------------------------------------------------
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view page_visits" ON public.page_visits;
CREATE POLICY "Admins can view page_visits"
  ON public.page_visits FOR SELECT
  TO authenticated
  USING ( public.is_admin() );

-- Service role gets full access (used by the API route)
GRANT ALL ON public.page_visits TO service_role;
GRANT ALL ON public.page_visits TO postgres;
-- Admins can read via RLS
GRANT SELECT ON public.page_visits TO authenticated;
