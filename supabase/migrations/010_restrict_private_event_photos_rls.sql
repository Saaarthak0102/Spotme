-- Migration 010: Revoke public/anon access and enforce backend-only data access for photos/guests

-- 1. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view photos from active events" ON public.event_photos;
DROP POLICY IF EXISTS "Anyone can register as a guest" ON public.guests;
DROP POLICY IF EXISTS "Guests can view their own record" ON public.guests;

-- 2. Revoke public anon access from tables to prevent REST API leaks
REVOKE SELECT ON public.event_photos FROM anon;
REVOKE SELECT, INSERT ON public.guests FROM anon;
