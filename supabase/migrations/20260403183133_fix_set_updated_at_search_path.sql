-- Fix: set_updated_at had mutable search_path, which could allow
-- search_path hijacking. Pin to public schema.
-- note: applied directly via Supabase dashboard 2026-04-03 18:31 UTC; this file
-- captures the production state for migration-history parity.
ALTER FUNCTION public.set_updated_at() SET search_path = public;
