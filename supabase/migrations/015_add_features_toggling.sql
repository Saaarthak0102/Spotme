-- ============================================================
-- Migration: Add Features Toggling System
-- Adds disabled_features to profiles and creates system_settings
-- ============================================================

-- 1. Add disabled_features to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_features text[] NOT NULL DEFAULT '{}';

-- 2. Create system_settings table to support global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Enable RLS and configure policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.system_settings;
CREATE POLICY "Allow read access to authenticated users"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Seed default settings for globally disabled features
INSERT INTO public.system_settings (key, value)
VALUES ('disabled_features', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

