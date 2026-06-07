-- ============================================================
-- Spotme — Consolidated Database Schema v2
-- Single-file, idempotent setup for a brand-new Supabase project.
-- Run this entirely in SQL Editor → New Query.
--
-- Incorporates all migrations 001–009:
--   001 role/phone/bio + storage fix + is_admin + handle_new_user
--   002 plans & pricing
--   003 pgvector + face_embeddings
--   004 event_photos variants + photo_matches upgrade + AI tracking
--   005 privacy_mode
--   006 inquiries table
--   007 security fixes: selfie_status 'no_face', RLS tightening
--   008 revoke face_embeddings anon access
--   009 plan constraint + default fix
-- ============================================================

-- -------------------------------------------------------
-- Extensions
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- -------------------------------------------------------
-- Custom Enum Types
-- -------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.event_type AS ENUM (
    'marriage', 'hackathon', 'meetup', 'corporate', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM (
    'draft', 'active', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.selfie_status AS ENUM (
    'uploaded', 'processing', 'matched', 'no_face'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -------------------------------------------------------
-- Profiles Table
-- Mirrors auth.users; auto-populated by handle_new_user trigger.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id             uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text,
  avatar_url     text,
  role           text        NOT NULL DEFAULT 'photographer'
                             CHECK (role IN ('admin', 'photographer')),
  phone          text,
  bio            text,
  plan           text        NOT NULL DEFAULT 'free'
                             CHECK (plan IN ('free', 'pro', 'unlimited')),
  max_events     integer     NOT NULL DEFAULT 1,
  max_storage_gb integer     NOT NULL DEFAULT 10,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- Helper Functions
-- -------------------------------------------------------

-- Admin guard — avoids RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
END;
$$;

-- Auto-create profile row when a new auth.users record is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING; -- idempotent: skip if profile already exists
  RETURN new;
END;
$$;

-- Re-create trigger (DROP first for idempotency on re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -------------------------------------------------------
-- Events Table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id           uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         text              NOT NULL,
  venue        text,
  event_date   date,
  event_type   public.event_type NOT NULL DEFAULT 'other',
  cover_url    text,
  admin_name   text,
  admin_phone  text,
  admin_email  text,
  qr_active    boolean           NOT NULL DEFAULT true,
  privacy_mode boolean           NOT NULL DEFAULT false,
  status       public.event_status NOT NULL DEFAULT 'active',
  created_at   timestamptz       NOT NULL DEFAULT now(),
  updated_at   timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_owner_id_idx ON public.events(owner_id);

-- -------------------------------------------------------
-- Event Photos Table
-- Includes image variant columns added in migration 004.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_photos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path      text        NOT NULL,
  public_url        text,
  original_filename text,
  file_size_bytes   bigint,
  mime_type         text,
  -- AI/variant columns (migration 004)
  thumb_url         text,
  medium_url        text,
  blur_hash         text,
  face_indexed      boolean     NOT NULL DEFAULT false,
  face_indexed_at   timestamptz,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_photos_event_id_idx         ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS event_photos_face_indexed_idx     ON public.event_photos(event_id, face_indexed)
  WHERE face_indexed = false;

-- -------------------------------------------------------
-- Guests Table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  phone        text        NOT NULL,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guests_event_id_idx    ON public.guests(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS guests_event_phone_idx ON public.guests(event_id, phone);

-- -------------------------------------------------------
-- Guest Selfies Table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_selfies (
  id           uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id     uuid                  NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  event_id     uuid                  NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path text                  NOT NULL,
  public_url   text,
  status       public.selfie_status  NOT NULL DEFAULT 'uploaded',
  uploaded_at  timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_selfies_guest_id_idx ON public.guest_selfies(guest_id);
CREATE INDEX IF NOT EXISTS guest_selfies_event_id_idx ON public.guest_selfies(event_id);

-- -------------------------------------------------------
-- Photo Matches Table
-- Upgraded in migration 004: +photo_id, +event_id, +similarity.
-- Uses photo_id (= event_photo_id) for AI service compatibility.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photo_matches (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_photo_id  uuid        NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  photo_id        uuid        REFERENCES public.event_photos(id) ON DELETE CASCADE,
  guest_selfie_id uuid        REFERENCES public.guest_selfies(id) ON DELETE CASCADE,
  guest_id        uuid        NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  event_id        uuid        REFERENCES public.events(id) ON DELETE CASCADE,
  similarity      float       NOT NULL DEFAULT 0.0,
  matched_at      timestamptz NOT NULL DEFAULT now(),
  -- Unique constraint: one match record per (guest, photo)
  CONSTRAINT photo_matches_guest_id_photo_id_key UNIQUE (guest_id, photo_id)
);

CREATE INDEX IF NOT EXISTS photo_matches_guest_id_idx       ON public.photo_matches(guest_id);
CREATE INDEX IF NOT EXISTS photo_matches_event_photo_id_idx ON public.photo_matches(event_photo_id);
CREATE INDEX IF NOT EXISTS photo_matches_guest_event_idx    ON public.photo_matches(guest_id, event_id);

-- -------------------------------------------------------
-- Face Embeddings Table (ArcFace 512-dim via pgvector)
-- Anon access revoked (migration 008) — biometric data protection.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.face_embeddings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id     uuid        NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  event_id     uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  embedding    vector(512) NOT NULL,
  bounding_box jsonb,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS face_embeddings_cosine_idx
  ON public.face_embeddings USING hnsw (embedding vector_cosine_ops);

-- -------------------------------------------------------
-- Inquiries Table (migration 006)
-- Public contact form submissions.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  phone       text,
  event_date  text,
  location    text,
  event_type  text,
  guest_count text,
  story       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_selfies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries       ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- Profiles RLS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Profiles: users or admins can view"   ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users or admins can update" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"         ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles"       ON public.profiles;

CREATE POLICY "Profiles: users or admins can view"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ( (SELECT auth.uid()) = id OR public.is_admin() );

CREATE POLICY "Profiles: users or admins can update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ( (SELECT auth.uid()) = id OR public.is_admin() )
  WITH CHECK ( (SELECT auth.uid()) = id OR public.is_admin() );

-- -------------------------------------------------------
-- Events RLS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can manage their events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view active events"  ON public.events;

CREATE POLICY "Owners can manage their events"
  ON public.events FOR ALL
  TO authenticated
  USING ( (SELECT auth.uid()) = owner_id )
  WITH CHECK ( (SELECT auth.uid()) = owner_id );

CREATE POLICY "Anyone can view active events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING ( status = 'active' AND qr_active = true );

-- -------------------------------------------------------
-- Event Photos RLS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can manage their event photos"       ON public.event_photos;
DROP POLICY IF EXISTS "Anyone can view photos from active events"  ON public.event_photos;

CREATE POLICY "Owners can manage their event photos"
  ON public.event_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.owner_id = (SELECT auth.uid())
    )
  );


-- -------------------------------------------------------
-- Guests RLS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can register as a guest"     ON public.guests;
DROP POLICY IF EXISTS "Guests can view their own record"   ON public.guests;
DROP POLICY IF EXISTS "Owners can view guests in their events" ON public.guests;


CREATE POLICY "Owners can view guests in their events"
  ON public.guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.owner_id = (SELECT auth.uid())
    )
  );

-- -------------------------------------------------------
-- Guest Selfies RLS
-- Anon read removed (S-06 fix, migration 007).
-- Guests access their selfies via authenticated server API routes.
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can upload a selfie"                ON public.guest_selfies;
DROP POLICY IF EXISTS "Guests can view their own selfies"         ON public.guest_selfies;
DROP POLICY IF EXISTS "Owners can view selfies in their events"   ON public.guest_selfies;
DROP POLICY IF EXISTS "Photographers can view selfies in their events" ON public.guest_selfies;

CREATE POLICY "Anyone can upload a selfie"
  ON public.guest_selfies FOR INSERT
  TO anon, authenticated
  WITH CHECK ( true );

CREATE POLICY "Photographers can view selfies in their events"
  ON public.guest_selfies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.owner_id = (SELECT auth.uid())
    )
  );

-- -------------------------------------------------------
-- Photo Matches RLS
-- Anon read removed (S-06 fix, migration 007).
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can manage matches in their events" ON public.photo_matches;
DROP POLICY IF EXISTS "Guests can view their own matches"          ON public.photo_matches;

CREATE POLICY "Owners can manage matches in their events"
  ON public.photo_matches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_photos ep
      JOIN public.events e ON e.id = ep.event_id
      WHERE ep.id = event_photo_id AND e.owner_id = (SELECT auth.uid())
    )
  );

-- -------------------------------------------------------
-- Face Embeddings RLS
-- Anon access fully revoked (migration 008) — biometric privacy.
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can manage face embeddings in their events"   ON public.face_embeddings;
DROP POLICY IF EXISTS "Anyone can view face embeddings from active events"  ON public.face_embeddings;

CREATE POLICY "Owners can manage face embeddings in their events"
  ON public.face_embeddings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.owner_id = (SELECT auth.uid())
    )
  );

-- -------------------------------------------------------
-- Inquiries RLS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Admins can view inquiries"   ON public.inquiries;
DROP POLICY IF EXISTS "Admins can delete inquiries" ON public.inquiries;

CREATE POLICY "Anyone can insert inquiries"
  ON public.inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK ( true );

CREATE POLICY "Admins can view inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING ( public.is_admin() );

CREATE POLICY "Admins can delete inquiries"
  ON public.inquiries FOR DELETE
  TO authenticated
  USING ( public.is_admin() );


-- ============================================================
-- Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('event-covers',  'event-covers',  true,  10485760,  ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('event-photos',  'event-photos',  true,  52428800,  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/tiff']),
  ('guest-selfies', 'guest-selfies', true,  10485760,  ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- -------------------------------------------------------
-- Storage RLS Policies
-- -------------------------------------------------------

-- event-covers
DROP POLICY IF EXISTS "event-covers: public read"            ON storage.objects;
DROP POLICY IF EXISTS "event-covers: authenticated upload"   ON storage.objects;
DROP POLICY IF EXISTS "event-covers: owners can update"      ON storage.objects;
DROP POLICY IF EXISTS "event-covers: owners can delete"      ON storage.objects;

CREATE POLICY "event-covers: public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING ( bucket_id = 'event-covers' );

CREATE POLICY "event-covers: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'event-covers' AND (SELECT auth.uid()) IS NOT NULL );

CREATE POLICY "event-covers: owners can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "event-covers: owners can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- event-photos
DROP POLICY IF EXISTS "event-photos: authenticated upload"    ON storage.objects;
DROP POLICY IF EXISTS "event-photos: read active event photos" ON storage.objects;
DROP POLICY IF EXISTS "event-photos: owners can delete"       ON storage.objects;

CREATE POLICY "event-photos: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'event-photos' AND (SELECT auth.uid()) IS NOT NULL );

CREATE POLICY "event-photos: read active event photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING ( bucket_id = 'event-photos' );

CREATE POLICY "event-photos: owners can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'event-photos' AND (SELECT auth.uid()) IS NOT NULL );

-- guest-selfies
DROP POLICY IF EXISTS "guest-selfies: anyone can upload" ON storage.objects;
DROP POLICY IF EXISTS "guest-selfies: anyone can read"   ON storage.objects;

CREATE POLICY "guest-selfies: anyone can upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK ( bucket_id = 'guest-selfies' );

CREATE POLICY "guest-selfies: anyone can read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING ( bucket_id = 'guest-selfies' );


-- ============================================================
-- Grants — Supabase REST API Access
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- profiles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- events
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;

-- event_photos
GRANT SELECT, INSERT, DELETE ON public.event_photos TO authenticated;

-- guests
GRANT SELECT, INSERT ON public.guests TO authenticated;

-- guest_selfies (no anon SELECT — access via server API)
GRANT INSERT ON public.guest_selfies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_selfies TO authenticated;

-- photo_matches (no anon SELECT — access via server API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_matches TO authenticated;

-- face_embeddings (authenticated only; anon REVOKED — biometric data)
GRANT ALL ON public.face_embeddings TO authenticated;
REVOKE ALL ON public.face_embeddings FROM anon;

-- inquiries
GRANT SELECT, INSERT ON public.inquiries TO anon, authenticated;
GRANT ALL ON public.inquiries TO service_role;
GRANT ALL ON public.inquiries TO postgres;


-- ============================================================
-- Seed: Admin tier defaults
-- Ensure any profile with role='admin' gets the Unlimited plan.
-- ============================================================
UPDATE public.profiles
SET
  plan           = 'unlimited',
  max_events     = 999999,
  max_storage_gb = 1000
WHERE role = 'admin';


-- ============================================================
-- Event Limit Enforcement Trigger (Migration 012)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_event_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan text;
  v_current_events integer;
BEGIN
  -- Get plan details of owner
  SELECT plan INTO v_plan
  FROM public.profiles
  WHERE id = NEW.owner_id;

  -- Count current events
  SELECT COUNT(*) INTO v_current_events
  FROM public.events
  WHERE owner_id = NEW.owner_id;

  -- If free plan, limit is 1 event
  IF (v_plan = 'free' OR v_plan = 'solo') AND v_current_events >= 1 THEN
    RAISE EXCEPTION 'Free plan users are restricted to creating only one event. Please upgrade your plan.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS enforce_event_limit ON public.events;

-- Create trigger BEFORE INSERT on public.events
CREATE TRIGGER enforce_event_limit
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_event_limit();
