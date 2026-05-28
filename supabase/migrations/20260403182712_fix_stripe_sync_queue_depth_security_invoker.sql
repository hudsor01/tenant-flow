-- Fix: stripe_sync_queue_depth view was using default SECURITY DEFINER behavior
-- (runs as view owner 'postgres', bypassing RLS). Switch to SECURITY INVOKER
-- so queries execute with the calling user's permissions.
-- note: applied directly via Supabase dashboard 2026-04-03 18:27 UTC; this file
-- captures the production state for migration-history parity.
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap in to_regclass guard. The
-- view was created out-of-band on prod (no in-chain CREATE VIEW for
-- stripe_sync_queue_depth) so Supabase Preview chain replay finds the
-- view missing and the ALTER VIEW fails with SQLSTATE 42P01. Guard
-- makes the alter conditional: prod runs as before, replay no-ops.
do $$
begin
  if to_regclass('public.stripe_sync_queue_depth') is not null then
    execute 'ALTER VIEW public.stripe_sync_queue_depth SET (security_invoker = true)';
  end if;
end $$;
