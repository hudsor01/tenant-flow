-- Two related cleanups in one migration:
--
-- 1. Drop the legacy `sign_lease_and_check_activation(..., signature_method)`
--    overload — superseded by the text-typed version. Same root cause + fix
--    as 20251110151620_drop_duplicate_check_user_feature_access.sql and
--    20260505230821_drop_legacy_get_user_plan_limits_text_overload.sql:
--    PostgREST raises PGRST203 "Could not choose the best candidate function"
--    when called with a JSON arg that fits both, breaking
--    tests/integration/rls/lease-rpcs.test.ts:114-138 on every PR.
--
--    The enum-typed `signature_method` overload is dead code — no production
--    caller in src/ or supabase/functions/, only the integration test which
--    is updated alongside this migration.
--
-- 2. Drop `activate_lease_with_pending_subscription(uuid)` — dead code
--    referencing columns that no longer exist (`stripe_subscription_status`,
--    `subscription_last_attempt_at`, `subscription_retry_count`,
--    `subscription_failure_reason` were removed in
--    20260418203032_drop_dead_lease_subscription_cols when the tenant-rent
--    flow was demolished per CLAUDE.md "no rent payment facilitation, no
--    tenant portal"). The function's RLS auth-guard test in
--    lease-rpcs.test.ts:67-86 still calls it — that test is removed in the
--    same PR. No production callers in src/ or supabase/functions/.
--
-- 3. Drop the now-orphaned `signature_method` enum type — last column using
--    it (`leases.tenant_signature_method`) was migrated to text in an
--    earlier migration. Verified zero remaining table-column users via
--    information_schema.columns.

DROP FUNCTION IF EXISTS public.sign_lease_and_check_activation(
  uuid, text, text, timestamptz, signature_method
);

DROP FUNCTION IF EXISTS public.activate_lease_with_pending_subscription(uuid);

DROP TYPE IF EXISTS public.signature_method;
