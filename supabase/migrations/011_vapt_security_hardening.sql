-- ============================================================
-- Migration 011: VAPT Security Hardening
-- Fixes: F-04, F-05, F-06, F-07, F-08
--
-- F-04 — photo_matches: replace using(true) anon SELECT with
--         owner-only access. Guest results served via API only.
-- F-05 — face_embeddings: remove anon SELECT on biometric data.
--         Only event owners can query embeddings directly.
-- F-06 — guest_selfies: ensure no blanket anon SELECT exists.
--         (Belt-and-suspenders on top of migration 007.)
-- F-07 — event-photos storage: scope DELETE to event owner,
--         not just "any authenticated user".
-- F-08 — event-covers storage: scope INSERT to the uploader's
--         own folder (uid must match first path segment).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- F-04: photo_matches — remove blanket anon/auth SELECT
-- ────────────────────────────────────────────────────────────

-- Drop the old permissive policy (may already be gone from 007,
-- but IF EXISTS makes this safe to re-run).
DROP POLICY IF EXISTS "Guests can view their own matches"      ON public.photo_matches;
DROP POLICY IF EXISTS "Only owners can view photo matches directly" ON public.photo_matches;

-- Only authenticated event owners can SELECT matches directly
-- through the Data API. Guest match results are served via the
-- Next.js API route that validates the spotme_guest_session cookie.
CREATE POLICY "Only owners can view photo matches directly"
  ON public.photo_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_photos ep
      JOIN  public.events e ON e.id = ep.event_id
      WHERE ep.id = event_photo_id
        AND e.owner_id = (SELECT auth.uid())
    )
  );


-- ────────────────────────────────────────────────────────────
-- F-05: face_embeddings — remove anon biometric data access
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view face embeddings from active events" ON public.face_embeddings;
DROP POLICY IF EXISTS "Only event owners can view face embeddings"         ON public.face_embeddings;

-- ArcFace 512-dim vectors are biometric data (GDPR / DPDP sensitive).
-- Face-matching runs server-side via the Python AI service using the
-- service-role key. No client or anon role needs direct access.
CREATE POLICY "Only event owners can view face embeddings"
  ON public.face_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.owner_id = (SELECT auth.uid())
    )
  );

-- Explicitly revoke anon SELECT on face_embeddings (defence in depth)
REVOKE SELECT ON public.face_embeddings FROM anon;


-- ────────────────────────────────────────────────────────────
-- F-06: guest_selfies — belt-and-suspenders anon lockdown
-- ────────────────────────────────────────────────────────────

-- Migration 007 already dropped "Guests can view their own selfies".
-- Drop defensively in case it was re-added or named differently.
DROP POLICY IF EXISTS "Guests can view their own selfies" ON public.guest_selfies;

-- Confirm anon cannot SELECT selfie rows directly
REVOKE SELECT ON public.guest_selfies FROM anon;


-- ────────────────────────────────────────────────────────────
-- F-07: event-photos storage — scope DELETE to event owner
-- ────────────────────────────────────────────────────────────

-- Old policy only checked auth.uid() IS NOT NULL — any photographer
-- could delete another photographer's photos.
DROP POLICY IF EXISTS "event-photos: owners can delete" ON storage.objects;

-- New policy joins storage path's first folder segment (the event_id)
-- back to the events table to confirm ownership.
-- Storage path convention used by the app: {event_id}/{filename}
CREATE POLICY "event-photos: owners can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND e.owner_id = (SELECT auth.uid())
    )
  );


-- ────────────────────────────────────────────────────────────
-- F-08: event-covers storage — scope INSERT to own folder
-- ────────────────────────────────────────────────────────────

-- Old policy only checked auth.uid() IS NOT NULL — any authenticated
-- user could upload to any event's cover folder.
DROP POLICY IF EXISTS "event-covers: authenticated upload" ON storage.objects;

-- New policy requires the first path segment to match the uploader's uid.
-- Storage path convention: {user_id}/{event_id}/cover.{ext}
CREATE POLICY "event-covers: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-covers'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );
