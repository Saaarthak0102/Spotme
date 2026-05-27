-- ============================================================
-- Migration: Add subscription plans and limits to profiles
-- ============================================================

-- 1. Add plan columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan           text not null default 'free'
    check (plan in ('free', 'pro', 'unlimited')),
  ADD COLUMN IF NOT EXISTS max_events     integer not null default 1,
  ADD COLUMN IF NOT EXISTS max_storage_gb integer not null default 10;

-- 2. Update existing admin profile to have Unlimited tier by default
UPDATE public.profiles
SET plan = 'unlimited', max_events = 999999, max_storage_gb = 1000
WHERE role = 'admin';
