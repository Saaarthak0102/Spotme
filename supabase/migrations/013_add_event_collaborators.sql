-- -------------------------------------------------------
-- Event Collaborators Table
-- -------------------------------------------------------
-- Clean up old obsolete/broken policies and functions if they exist
DROP POLICY IF EXISTS "Collaborators can upload event photos" ON public.event_photos;
DROP FUNCTION IF EXISTS public.is_event_collaborator(uuid, uuid);

CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_collaborators_event_id_email_key UNIQUE (event_id, email)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS event_collaborators_event_id_idx ON public.event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS event_collaborators_email_idx ON public.event_collaborators(email);

-- Enable RLS
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborator limit trigger
CREATE OR REPLACE FUNCTION public.check_collaborator_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.event_collaborators
  WHERE event_id = NEW.event_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'An event can have a maximum of 3 collaborators.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_collaborator_limit ON public.event_collaborators;
CREATE TRIGGER enforce_collaborator_limit
  BEFORE INSERT ON public.event_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.check_collaborator_limit();

-- SECURITY DEFINER helper to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.is_event_owner(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND owner_id = p_user_id
  );
END;
$$;

-- SECURITY DEFINER helper to prevent RLS recursion for collaborators
CREATE OR REPLACE FUNCTION public.is_event_collaborator(p_event_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_collaborators
    WHERE event_id = p_event_id AND email = p_email
  );
END;
$$;

-- -------------------------------------------------------
-- RLS Policies for event_collaborators
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.event_collaborators;
CREATE POLICY "Owners can manage collaborators"
  ON public.event_collaborators FOR ALL
  TO authenticated
  USING (
    public.is_event_owner(event_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    public.is_event_owner(event_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Collaborators can view their own sharing record" ON public.event_collaborators;
CREATE POLICY "Collaborators can view their own sharing record"
  ON public.event_collaborators FOR SELECT
  TO authenticated
  USING (
    email = coalesce(auth.jwt() ->> 'email', '')
  );

-- -------------------------------------------------------
-- Update Events RLS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Collaborators can view shared events" ON public.events;
DROP POLICY IF EXISTS "Collaborators can view events" ON public.events;
CREATE POLICY "Collaborators can view shared events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    public.is_event_collaborator(id, coalesce(auth.jwt() ->> 'email', ''))
  );

-- -------------------------------------------------------
-- Update Event Photos RLS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Collaborators can view event photos" ON public.event_photos;
CREATE POLICY "Collaborators can view event photos"
  ON public.event_photos FOR SELECT
  TO authenticated
  USING (
    public.is_event_collaborator(event_id, coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Collaborators can insert event photos" ON public.event_photos;
CREATE POLICY "Collaborators can insert event photos"
  ON public.event_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_event_collaborator(event_id, coalesce(auth.jwt() ->> 'email', ''))
  );

-- -------------------------------------------------------
-- Grants
-- -------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_collaborators TO authenticated;

