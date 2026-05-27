-- Fix: pg_stat_monitor installed in public schema exposes monitoring
-- objects to all users. Move to dedicated extensions schema.
-- note: applied directly via Supabase dashboard 2026-04-03 18:30 UTC; this file
-- captures the production state for migration-history parity.
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap in pg_extension guard. The
-- pg_stat_monitor extension is not installed by base_schema and no
-- in-chain CREATE EXTENSION exists for it, so Supabase Preview chain
-- replay finds the extension missing and the ALTER EXTENSION fails.
-- Guard makes the move conditional: prod runs as before, replay no-ops.
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_stat_monitor'
  ) then
    execute 'ALTER EXTENSION pg_stat_monitor SET SCHEMA extensions';
  end if;
end $$;
