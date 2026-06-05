-- ============================================================
-- Spotme — Database Schema
-- Run this in your Supabase project: SQL Editor → New Query
-- ============================================================

-- -------------------------------------------------------
-- Custom Enum Types
-- -------------------------------------------------------
create type public.event_type as enum (
  'marriage', 'hackathon', 'meetup', 'corporate', 'other'
);

create type public.event_status as enum (
  'draft', 'active', 'archived'
);

create type public.selfie_status as enum (
  'uploaded', 'processing', 'matched'
);

-- -------------------------------------------------------
-- Profiles Table (mirrors auth.users)
-- -------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  avatar_url     text,
  role           text not null default 'photographer' check (role in ('admin', 'photographer')),
  phone          text,
  bio            text,
  plan           text not null default 'free' check (plan in ('free', 'pro', 'unlimited')),
  max_events     integer not null default 1,
  max_storage_gb integer not null default 10,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------
-- Events Table
-- -------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  venue       text,
  event_date  date,
  event_type  public.event_type not null default 'other',
  cover_url   text,
  admin_name  text,
  admin_phone text,
  admin_email text,
  qr_active   boolean not null default true,
  status      public.event_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_owner_id_idx on public.events(owner_id);

-- -------------------------------------------------------
-- Event Photos Table
-- -------------------------------------------------------
create table public.event_photos (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  storage_path      text not null,
  public_url        text,
  original_filename text,
  file_size_bytes   bigint,
  mime_type         text,
  uploaded_at       timestamptz not null default now()
);

create index event_photos_event_id_idx on public.event_photos(event_id);

-- -------------------------------------------------------
-- Guests Table
-- -------------------------------------------------------
create table public.guests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  phone        text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

create index guests_event_id_idx on public.guests(event_id);
-- Ensure one guest per phone per event
create unique index guests_event_phone_idx on public.guests(event_id, phone);

-- -------------------------------------------------------
-- Guest Selfies Table
-- -------------------------------------------------------
create table public.guest_selfies (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references public.guests(id) on delete cascade,
  event_id     uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  public_url   text,
  status       public.selfie_status not null default 'uploaded',
  uploaded_at  timestamptz not null default now()
);

create index guest_selfies_guest_id_idx on public.guest_selfies(guest_id);
create index guest_selfies_event_id_idx on public.guest_selfies(event_id);

-- -------------------------------------------------------
-- Photo Matches Table (async matching placeholder)
-- -------------------------------------------------------
create table public.photo_matches (
  id              uuid primary key default gen_random_uuid(),
  event_photo_id  uuid not null references public.event_photos(id) on delete cascade,
  guest_selfie_id uuid not null references public.guest_selfies(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  matched_at      timestamptz not null default now()
);

create index photo_matches_guest_id_idx on public.photo_matches(guest_id);
create index photo_matches_event_photo_id_idx on public.photo_matches(event_photo_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.event_photos  enable row level security;
alter table public.guests        enable row level security;
alter table public.guest_selfies enable row level security;
alter table public.photo_matches enable row level security;

-- -------------------------------------------------------
-- Profiles Policies
-- -------------------------------------------------------
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- -------------------------------------------------------
-- Events Policies
-- -------------------------------------------------------
create policy "Owners can manage their events"
  on public.events for all
  to authenticated
  using ( (select auth.uid()) = owner_id )
  with check ( (select auth.uid()) = owner_id );

-- Guests (anon) can view active events by ID
create policy "Anyone can view active events"
  on public.events for select
  to anon, authenticated
  using ( status = 'active' and qr_active = true );

-- -------------------------------------------------------
-- Event Photos Policies
-- -------------------------------------------------------
create policy "Owners can manage their event photos"
  on public.event_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.owner_id = (select auth.uid())
    )
  );


-- -------------------------------------------------------
-- Guests Policies
-- -------------------------------------------------------
-- Owners can view all guests in their events
create policy "Owners can view guests in their events"
  on public.guests for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.owner_id = (select auth.uid())
    )
  );

-- -------------------------------------------------------
-- Guest Selfies Policies
-- -------------------------------------------------------
create policy "Anyone can upload a selfie"
  on public.guest_selfies for insert
  to anon, authenticated
  with check ( true );

-- F-06 Fix: Remove the blanket anon SELECT — selfie status is served exclusively
-- through the Next.js API layer which validates the guest session cookie.
-- Direct Supabase Data API reads by anon are no longer permitted.

create policy "Owners can view selfies in their events"
  on public.guest_selfies for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.owner_id = (select auth.uid())
    )
  );

-- -------------------------------------------------------
-- Photo Matches Policies
-- -------------------------------------------------------
create policy "Owners can manage matches in their events"
  on public.photo_matches for all
  to authenticated
  using (
    exists (
      select 1 from public.event_photos ep
      join public.events e on e.id = ep.event_id
      where ep.id = event_photo_id
        and e.owner_id = (select auth.uid())
    )
  );

-- F-04 Fix: Replace the blanket using(true) policy that exposed ALL matches to
-- every anonymous caller. Match results are now served exclusively through the
-- Next.js API (which checks the guest session cookie). Only event owners can
-- query photo_matches directly through the Data API.
create policy "Only owners can view photo matches directly"
  on public.photo_matches for select
  to authenticated
  using (
    exists (
      select 1 from public.event_photos ep
      join public.events e on e.id = ep.event_id
      where ep.id = event_photo_id
        and e.owner_id = (select auth.uid())
    )
  );

-- ============================================================
-- Storage Buckets
-- (Run separately or via Supabase Dashboard → Storage)
-- ============================================================

-- Create the 3 storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-covers',  'event-covers',  true,  10485760,  array['image/jpeg','image/png','image/webp','image/heic']),
  ('event-photos',  'event-photos',  true,  52428800,  array['image/jpeg','image/png','image/webp','image/heic','image/tiff']),
  ('guest-selfies', 'guest-selfies', true,  10485760,  array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = excluded.public;

-- -------------------------------------------------------
-- Storage RLS Policies
-- -------------------------------------------------------

-- event-covers: public read, authenticated write for their own events
create policy "event-covers: public read"
  on storage.objects for select
  to anon, authenticated
  using ( bucket_id = 'event-covers' );

-- F-08 Fix: Require the path's first folder segment to match the uploader's uid.
-- Storage path convention: {user_id}/{event_id}/cover.{ext}
create policy "event-covers: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "event-covers: owners can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "event-covers: owners can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- event-photos: authenticated write, anyone read from active events
create policy "event-photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-photos'
    and (select auth.uid()) is not null
  );

create policy "event-photos: read active event photos"
  on storage.objects for select
  to anon, authenticated
  using ( bucket_id = 'event-photos' );

-- F-07 Fix: Only the event owner may delete photos from the event-photos bucket.
-- Storage path convention: {event_id}/{filename}
create policy "event-photos: owners can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-photos'
    and exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and e.owner_id = (select auth.uid())
    )
  );

-- guest-selfies: anyone can upload, owners can read
create policy "guest-selfies: anyone can upload"
  on storage.objects for insert
  to anon, authenticated
  with check ( bucket_id = 'guest-selfies' );

create policy "guest-selfies: anyone can read"
  on storage.objects for select
  to anon, authenticated
  using ( bucket_id = 'guest-selfies' );

-- ============================================================
-- Grant API access (Data API)
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.events to authenticated;
grant update, delete on public.events to authenticated;
grant select, insert, delete on public.event_photos to authenticated;
grant select, insert on public.guests to authenticated;
grant select, insert on public.guest_selfies to authenticated;
grant select on public.photo_matches to authenticated;
grant insert, update, delete on public.photo_matches to authenticated;

-- ============================================================
-- pgvector Face Embeddings Schema (DeepFace ArcFace 512-dim)
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

-- F-05 Fix: ArcFace embeddings are biometric data and must NEVER be readable by
-- anonymous users. The face-matching query runs entirely server-side via the
-- Python AI service using the service-role key. Owners can inspect embeddings
-- for debugging; no anon access is granted.
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

-- 5. Create HNSW cosine vector index for scale
CREATE INDEX IF NOT EXISTS face_embeddings_cosine_idx 
  ON public.face_embeddings USING hnsw (embedding vector_cosine_ops);

-- 6. Grant API access
GRANT ALL ON public.face_embeddings TO authenticated;
GRANT SELECT ON public.face_embeddings TO anon;

