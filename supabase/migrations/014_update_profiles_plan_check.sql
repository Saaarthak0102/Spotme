-- ============================================================
-- Migration: Update Profiles Plan Check Constraint
-- Adds support for starter, studio_basic, studio_pro, custom
-- ============================================================

-- 1. Drop existing constraint if it exists
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 2. Add the updated check constraint that supports all active and legacy plan values
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN (
    'free', 'pro', 'unlimited', 
    'solo', 'studio', 'agency', 'enterprise',
    'starter', 'studio_basic', 'studio_pro', 'custom'
  ));
