-- Fix: stripe.check_rate_limit had mutable search_path.
-- Pin to stripe, public to prevent search_path hijacking.
-- Note: extension-managed function — may be overwritten on extension update.
-- applied directly via Supabase dashboard 2026-04-03 18:34 UTC; this file
-- captures the production state for migration-history parity.
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap in pg_proc + schema guard.
-- The stripe schema is extension-provided; in Supabase Preview chain
-- replay the extension is also installed so the function should exist,
-- but the existence guard keeps the migration replay-safe across all
-- environments (e.g. local dev without the stripe extension).
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'check_rate_limit'
      and n.nspname = 'stripe'
      and pg_get_function_identity_arguments(p.oid) = 'text, integer, integer'
  ) then
    execute 'ALTER FUNCTION stripe.check_rate_limit(text, integer, integer) SET search_path = stripe, public';
  end if;
end $$;
