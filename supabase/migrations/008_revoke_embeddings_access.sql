-- Revoke public access to face_embeddings to prevent biometric data leakage
DROP POLICY IF EXISTS "Anyone can view face embeddings from active events" ON public.face_embeddings;
REVOKE SELECT ON public.face_embeddings FROM anon;
