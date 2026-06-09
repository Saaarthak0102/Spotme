-- Migration 016: Add embedding column to guest_selfies
ALTER TABLE public.guest_selfies
  ADD COLUMN IF NOT EXISTS embedding vector(512);

-- Create an index for faster similarity search on guest selfies
CREATE INDEX IF NOT EXISTS guest_selfies_embedding_cosine_idx
  ON public.guest_selfies USING hnsw (embedding vector_cosine_ops);
