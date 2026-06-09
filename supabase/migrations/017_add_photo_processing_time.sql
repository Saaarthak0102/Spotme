-- Migration 017: Add processing_time column to event_photos
ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS processing_time float DEFAULT 0.0;
