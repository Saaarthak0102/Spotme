-- ============================================================
-- Migration 005: Add privacy_mode to events table
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS privacy_mode boolean NOT NULL DEFAULT false;
