-- ============================================================
-- Migration: Enforce Event Limits trigger
-- Enforces that users on the 'free' / 'solo' plan can only
-- create a maximum of 1 event workspace.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_event_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan text;
  v_current_events integer;
BEGIN
  -- Get plan details of owner
  SELECT plan INTO v_plan
  FROM public.profiles
  WHERE id = NEW.owner_id;

  -- Count current events
  SELECT COUNT(*) INTO v_current_events
  FROM public.events
  WHERE owner_id = NEW.owner_id;

  -- If free plan, limit is 1 event
  IF (v_plan = 'free' OR v_plan = 'solo') AND v_current_events >= 1 THEN
    RAISE EXCEPTION 'Free plan users are restricted to creating only one event. Please upgrade your plan.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS enforce_event_limit ON public.events;

-- Create trigger BEFORE INSERT on public.events
CREATE TRIGGER enforce_event_limit
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_event_limit();
