-- Fix: set_updated_at had mutable search_path, which could allow
-- search_path hijacking. Pin to public schema.
-- note: applied directly via Supabase dashboard 2026-04-03 18:31 UTC; this file
-- captures the production state for migration-history parity.
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap in pg_proc guard. Function
-- may not exist in chain replay (created out-of-band on prod).
do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'set_updated_at'
      and pronamespace = 'public'::regnamespace
      and pronargs = 0
  ) then
    execute 'ALTER FUNCTION public.set_updated_at() SET search_path = public';
  end if;
end $$;
