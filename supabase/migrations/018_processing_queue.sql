-- ============================================================
-- SpotMe AI Service — Migration 010: Processing Queue
-- Run this in Supabase SQL Editor → New Query
--
-- Creates:
--   1. processing_queue table (multi-worker safe job queue)
--   2. claim_jobs() function (atomic SKIP LOCKED claiming)
--   3. reclaim_stale_jobs() function (crash recovery)
--   4. Auto-enqueue triggers on event_photos and guest_selfies
--   5. confidence_tier column on photo_matches
--   6. check_selfie_limit trigger (max 5 selfies per guest/event)
--   7. embedding column on guest_selfies (if not already present)
-- ============================================================


-- -------------------------------------------------------
-- 1. Ensure embedding column exists on guest_selfies
-- -------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.guest_selfies ADD COLUMN embedding vector(512);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS guest_selfies_embedding_idx
  ON public.guest_selfies USING hnsw (embedding vector_cosine_ops);


-- -------------------------------------------------------
-- 2. Processing Queue Table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processing_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type     text        NOT NULL CHECK (job_type IN ('index_photo', 'embed_selfie', 'rematch_event')),
  payload      jsonb       NOT NULL,
  event_id     uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  priority     integer     NOT NULL DEFAULT 10,   -- 1=selfie (urgent), 10=photo, 20=rematch
  attempts     integer     NOT NULL DEFAULT 0,
  max_attempts integer     NOT NULL DEFAULT 3,
  error_msg    text,
  worker_id    text,         -- which instance claimed this
  claimed_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Indexes for fast claim queries
CREATE INDEX IF NOT EXISTS idx_queue_claimable
  ON public.processing_queue(priority, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_queue_event
  ON public.processing_queue(event_id, status);

CREATE INDEX IF NOT EXISTS idx_queue_stale
  ON public.processing_queue(claimed_at)
  WHERE status = 'processing';


-- -------------------------------------------------------
-- 3. Atomic Claim Function
-- Multiple workers can call this safely — SKIP LOCKED
-- prevents double-processing.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_jobs(p_worker_id text, p_batch_size integer DEFAULT 1)
RETURNS SETOF public.processing_queue AS $$
  UPDATE public.processing_queue
  SET status = 'processing',
      worker_id = p_worker_id,
      claimed_at = now(),
      attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM public.processing_queue
    WHERE status = 'pending'
    ORDER BY priority ASC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED          -- KEY: safe concurrent access
  )
  RETURNING *;
$$ LANGUAGE sql;


-- -------------------------------------------------------
-- 4. Reclaim Stale Jobs (worker crashed / OOM / no heartbeat)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reclaim_stale_jobs(p_stale_minutes integer DEFAULT 5)
RETURNS integer AS $$
DECLARE reclaimed integer;
BEGIN
  UPDATE public.processing_queue
  SET status = CASE
        WHEN attempts >= max_attempts THEN 'dead'
        ELSE 'pending'
      END,
      worker_id = NULL,
      claimed_at = NULL,
      error_msg = COALESCE(error_msg, '') || ' [reclaimed: worker timeout]'
  WHERE status = 'processing'
    AND claimed_at < now() - (p_stale_minutes || ' minutes')::interval;
  GET DIAGNOSTICS reclaimed = ROW_COUNT;
  RETURN reclaimed;
END;
$$ LANGUAGE plpgsql;


-- -------------------------------------------------------
-- 5. Auto-Enqueue Triggers
-- -------------------------------------------------------

-- Auto-enqueue on photo insert (priority 10)
CREATE OR REPLACE FUNCTION public.enqueue_photo_indexing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.processing_queue (job_type, payload, event_id, priority)
  VALUES ('index_photo', pg_catalog.jsonb_build_object(
    'photo_id', NEW.id, 'event_id', NEW.event_id, 'public_url', NEW.public_url
  ), NEW.event_id, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS auto_enqueue_photo ON public.event_photos;
CREATE TRIGGER auto_enqueue_photo
  AFTER INSERT ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_photo_indexing();


-- Auto-enqueue on selfie insert (priority 1 — highest, guests first)
CREATE OR REPLACE FUNCTION public.enqueue_selfie_embedding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.processing_queue (job_type, payload, event_id, priority)
  VALUES ('embed_selfie', pg_catalog.jsonb_build_object(
    'selfie_id', NEW.id, 'guest_id', NEW.guest_id,
    'event_id', NEW.event_id, 'public_url', NEW.public_url
  ), NEW.event_id, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS auto_enqueue_selfie ON public.guest_selfies;
CREATE TRIGGER auto_enqueue_selfie
  AFTER INSERT ON public.guest_selfies
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_selfie_embedding();


-- -------------------------------------------------------
-- 6. Confidence Tier Column on photo_matches
-- -------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.photo_matches ADD COLUMN confidence_tier text
    DEFAULT 'high' CHECK (confidence_tier IN ('high', 'medium', 'low'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;


-- -------------------------------------------------------
-- 7. Selfie Limit Trigger (Security — max 5 per guest per event)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_selfie_limit()
RETURNS TRIGGER AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.guest_selfies
  WHERE guest_id = NEW.guest_id AND event_id = NEW.event_id;
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 selfies per guest per event';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS enforce_selfie_limit ON public.guest_selfies;
CREATE TRIGGER enforce_selfie_limit
  BEFORE INSERT ON public.guest_selfies
  FOR EACH ROW EXECUTE FUNCTION public.check_selfie_limit();


-- -------------------------------------------------------
-- 8. Grants for the new table
-- -------------------------------------------------------
GRANT ALL ON public.processing_queue TO authenticated;
GRANT ALL ON public.processing_queue TO service_role;
GRANT ALL ON public.processing_queue TO postgres;

-- RLS on processing_queue (service-level access only)
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (the AI worker uses the database URL directly)
CREATE POLICY "Service role full access on processing_queue"
  ON public.processing_queue FOR ALL
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);


-- -------------------------------------------------------
-- Done!
-- -------------------------------------------------------
-- After running this migration:
-- 1. Existing un-indexed photos will NOT be auto-enqueued (they predate the trigger).
--    The legacy worker handles these via direct polling.
-- 2. New photos/selfies will be auto-enqueued by the triggers.
-- 3. The AI worker auto-detects this table and switches to queue mode.
