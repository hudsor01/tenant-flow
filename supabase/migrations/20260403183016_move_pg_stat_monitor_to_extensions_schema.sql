-- Fix: pg_stat_monitor installed in public schema exposes monitoring
-- objects to all users. Move to dedicated extensions schema.
-- note: applied directly via Supabase dashboard 2026-04-03 18:30 UTC; this file
-- captures the production state for migration-history parity.
ALTER EXTENSION pg_stat_monitor SET SCHEMA extensions;
