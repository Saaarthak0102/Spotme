-- ============================================================
-- Migration: Enable pgvector and create face_embeddings schema
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create face embeddings table
CREATE TABLE IF NOT EXISTS public.face_embeddings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id       uuid NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  embedding      vector(512) NOT NULL, -- ArcFace outputs 512-dimension vectors
  bounding_box   jsonb, -- Facial region coordinates: {x, y, w, h}
  created_at     timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies
-- Owners/photographers can manage face embeddings for their own events
CREATE POLICY "Owners can manage face embeddings in their events"
  ON public.face_embeddings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.owner_id = (select auth.uid())
    )
  );

-- Guests (anon) can read face embeddings to do similarity searches within active events
CREATE POLICY "Anyone can view face embeddings from active events"
  ON public.face_embeddings FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.status = 'active'
        AND e.qr_active = true
    )
  );

-- 5. Create HNSW high-performance index for cosine similarity search
CREATE INDEX IF NOT EXISTS face_embeddings_cosine_idx 
  ON public.face_embeddings USING hnsw (embedding vector_cosine_ops);

-- 6. Grant API access (Data API)
GRANT ALL ON public.face_embeddings TO authenticated;
GRANT SELECT ON public.face_embeddings TO anon;
