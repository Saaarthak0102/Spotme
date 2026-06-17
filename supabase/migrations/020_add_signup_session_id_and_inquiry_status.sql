-- ============================================================
-- Migration 020: Add signup_session_id to profiles, and status/profile_id to inquiries
-- ============================================================

-- 1. Add signup_session_id to profiles (for first-touch attribution)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_session_id text;

-- 2. Create enum for inquiry status
DO $$ BEGIN
  CREATE TYPE public.inquiry_status AS ENUM (
    'new', 'qualified', 'demo_booked', 'closed_won', 'closed_lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add status and profile_id to inquiries
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS status public.inquiry_status NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Create an index on profile_id in inquiries for faster lookups
CREATE INDEX IF NOT EXISTS inquiries_profile_id_idx ON public.inquiries(profile_id);
