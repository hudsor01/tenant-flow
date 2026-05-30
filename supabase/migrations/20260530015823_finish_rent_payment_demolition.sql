-- Finish the rent-payment / tenant-portal demolition (migrations 20260418*).
-- Three orphans survived the pivot to landlord-only:
--
--   1. public.payment_transactions -- rent-payment-era ledger. 0 rows, no FK
--      dependents, no views, no RLS policies, zero application callers (only
--      the generated supabase.ts types referenced it). `amount integer` is the
--      cents-era shape that violates the numeric(10,2) dollars convention.
--   2. public.user_is_tenant() -- reads auth.jwt() ->> 'tenant_id'. No tenant
--      JWTs exist post-pivot (tenants are records, not auth users), so it is
--      always FALSE. No policy, function-body, or code caller.
--   3. public.get_owner_lease_tenant_ids() -- tenant-portal-shaped owner->tenant
--      id resolver. No consumer in the landlord-only model.
--
-- Safety verified against prod before this migration: 0 rows, 0 FK dependents,
-- 0 RLS policies referencing either function, 0 function bodies referencing
-- them, 0 dependent views. CASCADE on the table is defensive (drops the 4 dead
-- indexes); nothing else hangs off it.
--
-- Applied to prod via MCP apply_migration; reconciled to this file per the
-- migration-mcp-prod-drift convention (prod-assigned timestamp 20260530015823).

DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP FUNCTION IF EXISTS public.user_is_tenant();
DROP FUNCTION IF EXISTS public.get_owner_lease_tenant_ids();
