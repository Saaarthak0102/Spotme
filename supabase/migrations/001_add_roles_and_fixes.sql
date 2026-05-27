-- ============================================================
-- Migration: Add role, phone, bio to profiles
-- Run this in Supabase SQL Editor if you already applied schema.sql
-- ============================================================

-- 1. Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role  text not null default 'photographer'
    check (role in ('admin', 'photographer')),
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS bio   text;

-- 2. Add public_url to guest_selfies (if not already added)
ALTER TABLE public.guest_selfies
  ADD COLUMN IF NOT EXISTS public_url text;

-- 3. Fix storage policy syntax error (split update/delete)
-- Drop the old combined policy if it exists
DROP POLICY IF EXISTS "event-covers: owners can update/delete" ON storage.objects;

-- Recreate as two separate policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'event-covers: owners can update'
      AND tablename  = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "event-covers: owners can update"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'event-covers'
          AND (select auth.uid())::text = (storage.foldername(name))[1]
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'event-covers: owners can delete'
      AND tablename  = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "event-covers: owners can delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'event-covers'
          AND (select auth.uid())::text = (storage.foldername(name))[1]
        )
    $policy$;
  END IF;
END $$;

-- 4. Create is_admin helper function to prevent infinite RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'admin'
  );
END;
$$;

-- Allow admin to read all profiles (needed for admin dashboard)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Either viewing your own profile OR you are an admin
    (select auth.uid()) = id
    OR public.is_admin()
  );

-- 5. Allow admin to update any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = id
    OR public.is_admin()
  )
  WITH CHECK (
    (select auth.uid()) = id
    OR public.is_admin()
  );

-- 6. Update handle_new_user trigger function to be SECURITY DEFINER to avoid permission issues during signup
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
  );
  RETURN new;
END;
$$;

