-- Pass 1 of the SECURITY DEFINER lockdown.
--
-- The Supabase Security Advisor flagged 23 SECURITY DEFINER functions in
-- `public` as "Public Can Execute SECURITY DEFINER Function". See
-- `.planning/anon-exec-audit/CYCLE-1.md` for the per-function classification.
--
-- This pass fixes the two REAL IDOR vectors. The 19 defense-in-depth revokes
-- land in the v2 migration that follows (`20260529225039`); they require
-- `REVOKE FROM PUBLIC` + re-`GRANT TO authenticated/service_role`, since
-- Postgres auto-grants EXECUTE to PUBLIC at function creation and the anon
-- role inherits from PUBLIC -- a bare `REVOKE FROM anon` is a no-op while
-- the PUBLIC grant exists. The IDOR pair below uses both forms (REVOKE FROM
-- PUBLIC + REVOKE FROM anon + REVOKE FROM authenticated) so the lockdown
-- holds regardless of how grants get re-introduced in the future.
--
-- IDOR fixes (revoke from PUBLIC + anon + authenticated; keep service_role):
--
--   * `confirm_lease_subscription(uuid, text)` -- write IDOR. Body has ZERO
--     `auth.uid()` check; any caller could flip any pending lease to
--     `active` with an attacker-controlled `stripe_subscription_id`,
--     corrupting billing state. The only legitimate caller path is a
--     service_role-owned webhook handler (source comment in
--     20260117024203_add_webhook_transaction_rpcs.sql references
--     `subscription-webhook.handler.ts`, no longer present in source).
--
--   * `get_user_plan_limits(uuid)` -- read IDOR. Body reads
--     `subscription_plan, is_admin FROM public.users WHERE id = p_user_id`
--     with no auth check; any caller could enumerate plan + admin flag for
--     any UUID. The existing test at `tests/integration/rls/rpc-auth.test.ts:202`
--     documents the INTENT as "REVOKE'd from authenticated entirely" --
--     that comment was an unfinished TODO. Plan-limit reads now flow
--     through BEFORE-INSERT triggers (enforce_property_plan_limit,
--     enforce_unit_plan_limit) that key off `NEW.owner_user_id`, not
--     caller-supplied input, so removing the authenticated grant breaks
--     no live caller.

REVOKE EXECUTE ON FUNCTION public.confirm_lease_subscription(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_lease_subscription(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_lease_subscription(uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_lease_subscription(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) TO service_role;
