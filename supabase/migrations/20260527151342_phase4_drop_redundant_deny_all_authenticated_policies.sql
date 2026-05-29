-- Phase 4 cycle-2 fix: drop the 11 redundant `deny_all_*` PERMISSIVE policies
-- on public tables. They flagged the rls-security audit (CLAUDE.md
-- "One policy per operation per role -- never FOR ALL on authenticated tables")
-- and are functionally redundant:
--
--   PostgreSQL permissive policies are OR'd together. A permissive policy
--   with `USING (false)` adds nothing to the access expression -- the table's
--   RLS-enabled-with-no-applicable-policy default deny already covers it.
--
-- Each of the 11 tables:
--   1. Has RLS ENABLED (verified pre-migration via pg_tables.rowsecurity)
--   2. Has NO other policies for anon/authenticated (the deny_all is the only
--      policy on the table for these roles; verified via pg_policies grouped)
--   3. Is written-to only by service_role (Stripe webhooks, security event
--      collectors, internal cron jobs), which bypasses RLS by default.
--
-- Net effect: identical access posture before and after, but no longer
-- violates the CLAUDE.md zero-tolerance rule against FOR ALL on
-- authenticated, and clears the rls-security CI audit.
--
-- Re-runnable via IF EXISTS.

DROP POLICY IF EXISTS deny_all_app_config ON public.app_config;
DROP POLICY IF EXISTS deny_all_email_suppressions ON public.email_suppressions;
DROP POLICY IF EXISTS deny_all_payment_transactions ON public.payment_transactions;
DROP POLICY IF EXISTS deny_all_processed_internal_events ON public.processed_internal_events;
DROP POLICY IF EXISTS deny_all_security_audit_log ON public.security_audit_log;
DROP POLICY IF EXISTS deny_all_security_events ON public.security_events;
DROP POLICY IF EXISTS deny_all_stripe_webhook_events ON public.stripe_webhook_events;
DROP POLICY IF EXISTS deny_all_user_access_log ON public.user_access_log;
DROP POLICY IF EXISTS deny_all_webhook_attempts ON public.webhook_attempts;
DROP POLICY IF EXISTS deny_all_webhook_events ON public.webhook_events;
DROP POLICY IF EXISTS deny_all_webhook_metrics ON public.webhook_metrics;
