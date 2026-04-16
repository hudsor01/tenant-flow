-- Fix: stripe_sync_queue_depth view was using default SECURITY DEFINER behavior
-- (runs as view owner 'postgres', bypassing RLS). Switch to SECURITY INVOKER
-- so queries execute with the calling user's permissions.
-- note: applied directly via Supabase dashboard 2026-04-03 18:27 UTC; this file
-- captures the production state for migration-history parity.
ALTER VIEW public.stripe_sync_queue_depth SET (security_invoker = true);
