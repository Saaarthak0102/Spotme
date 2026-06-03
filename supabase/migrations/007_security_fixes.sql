-- ============================================================
-- Migration: Security Fixes & Pricing Updates
-- Fixes S-06 (Overly permissive RLS), O-02 (Enum missing no_face)
-- Also updates the pricing plans for the new redesign.
-- ============================================================

-- 1. Add 'no_face' to selfie_status enum (O-02 fix)
-- PostgreSQL doesn't allow IF NOT EXISTS for ALTER TYPE ADD VALUE directly in older versions,
-- but since Supabase is Postgres 15+, we can use a DO block to be safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.selfie_status'::regtype
      AND enumlabel = 'no_face'
  ) THEN
    ALTER TYPE public.selfie_status ADD VALUE 'no_face';
  END IF;
END $$;

-- 2. Update profiles.plan to support new pricing tiers
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('solo', 'pro', 'studio', 'agency', 'free', 'unlimited'));

-- Migrate old plans to new tracks
UPDATE public.profiles SET plan = 'solo' WHERE plan = 'free';
UPDATE public.profiles SET plan = 'studio' WHERE plan = 'unlimited';

-- Update admin to highest tier
UPDATE public.profiles SET plan = 'agency' WHERE role = 'admin';

-- Drop the old constraint and restrict to only the new ones
ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('solo', 'pro', 'studio', 'agency'));

-- 3. Fix S-06: Overly Permissive RLS on guest_selfies and photo_matches
-- We remove anon read access. Guests will read their data via a secure server route
-- that validates their identity, preventing full table enumeration.

DROP POLICY IF EXISTS "Guests can view their own selfies" ON public.guest_selfies;
CREATE POLICY "Photographers can view selfies in their events"
  ON public.guest_selfies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Guests can view their own matches" ON public.photo_matches;
-- The photo_matches table already has "Owners can manage matches in their events"
-- which covers authenticated selects. So we just drop the anon policy.
