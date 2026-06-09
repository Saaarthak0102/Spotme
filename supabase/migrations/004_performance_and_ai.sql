-- ================================================================
-- Spotme — Performance & AI Migration (004)
-- Run this in your Supabase SQL Editor
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. event_photos — Add image variant columns + AI tracking
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS thumb_url        text,
  ADD COLUMN IF NOT EXISTS medium_url       text,
  ADD COLUMN IF NOT EXISTS blur_hash        text,
  ADD COLUMN IF NOT EXISTS face_indexed     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_indexed_at  timestamptz;

-- Index for quickly finding un-indexed photos (admin re-index feature)
CREATE INDEX IF NOT EXISTS event_photos_face_indexed_idx
  ON public.event_photos (event_id, face_indexed)
  WHERE face_indexed = false;

-- ────────────────────────────────────────────────────────────────
-- 2. guest_selfies — Add 'no_face' and 'processing' to status enum
--    (The enum already has: 'uploaded', 'processing', 'matched')
-- ────────────────────────────────────────────────────────────────

-- Add 'no_face' value to the existing selfie_status enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'no_face'
      AND enumtypid = 'public.selfie_status'::regtype
  ) THEN
    ALTER TYPE public.selfie_status ADD VALUE 'no_face';
  END IF;
END
$$;

-- ────────────────────────────────────────────────────────────────
-- 3. photo_matches — Upgrade the existing table
--    Existing columns: id, event_photo_id, guest_selfie_id, guest_id, matched_at
--    We need to add: photo_id (alias), event_id, similarity
-- ────────────────────────────────────────────────────────────────

-- Add photo_id as an alias pointing to event_photo_id (for new AI service compatibility)
ALTER TABLE public.photo_matches
  ADD COLUMN IF NOT EXISTS photo_id   uuid REFERENCES public.event_photos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_id   uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS similarity float NOT NULL DEFAULT 0.0;

-- Backfill photo_id from existing event_photo_id data
UPDATE public.photo_matches
  SET photo_id = event_photo_id
  WHERE photo_id IS NULL;

-- Backfill event_id from the event_photos table
UPDATE public.photo_matches pm
  SET event_id = ep.event_id
  FROM public.event_photos ep
  WHERE ep.id = pm.event_photo_id
    AND pm.event_id IS NULL;

-- Deduplicate photo_matches rows before adding unique constraint.
-- Keeps the row with the highest similarity (or latest id if tied).
DELETE FROM public.photo_matches
WHERE id NOT IN (
  SELECT DISTINCT ON (guest_id, photo_id)
    id
  FROM public.photo_matches
  WHERE photo_id IS NOT NULL
  ORDER BY guest_id, photo_id, similarity DESC, id DESC
);

-- Add unique constraint on (guest_id, photo_id) for ON CONFLICT upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photo_matches_guest_id_photo_id_key'
      AND conrelid = 'public.photo_matches'::regclass
  ) THEN
    ALTER TABLE public.photo_matches
      ADD CONSTRAINT photo_matches_guest_id_photo_id_key UNIQUE (guest_id, photo_id);
  END IF;
END
$$;

-- Efficient index for "all my matches in this event"
CREATE INDEX IF NOT EXISTS photo_matches_guest_event_idx
  ON public.photo_matches (guest_id, event_id);

-- ────────────────────────────────────────────────────────────────
-- 4. Grants — ensure anon can read photo_matches (already in schema)
-- ────────────────────────────────────────────────────────────────

GRANT SELECT ON public.photo_matches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photo_matches TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- Done! Summary of changes:
-- • event_photos: +thumb_url, +medium_url, +blur_hash
--                 +face_indexed, +face_indexed_at
-- • guest_selfies.selfie_status enum: +'no_face' value
-- • photo_matches: +photo_id, +event_id, +similarity
--                  +unique(guest_id, photo_id) constraint
--                  +guest_event index
-- ────────────────────────────────────────────────────────────────
