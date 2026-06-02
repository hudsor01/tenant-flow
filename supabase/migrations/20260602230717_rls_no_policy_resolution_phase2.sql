-- v3.0 Security Hardening, Phase 2 -- resolve the 10 rls_enabled_no_policy tables.
-- Applied via Supabase MCP apply_migration; prod-assigned timestamp 20260602230717
-- reconciled into this filename (migration-mcp-prod-drift).
--
-- LIVE STATE (verified 2026-06-02 via pg_policy + has_table_privilege, the A1
-- gate): all 10 tables have RLS ENABLED with ZERO policies (already fail-closed);
-- anon has no grant on any. Tier-A (5) carry a vestigial `authenticated` table
-- grant that exposes schema via pg_graphql /graphql/v1 introspection (advisor
-- lint 0027) even though RLS denies the rows; Tier-B (5) are already
-- service-role-only.
--
-- RLSNP-02: add an explicit canonical `service_role_only` FOR ALL policy to all
--   10 -> clears advisor lint 0008 (rls_enabled_no_policy) and documents the
--   deliberate service-role-only lockdown. service_role has BYPASSRLS so the
--   policy is INERT for enforcement -- it exists to clear the lint + state intent.
--   RLS stays ON; authenticated/anon have no policy -> zero rows.
-- RLSNP-03: revoke the vestigial `authenticated` grant on the 5 Tier-A tables
--   (+ defensive anon/PUBLIC) -> closes the pg_graphql introspection leak (lint
--   0027). These are TABLE grants, not function grants: 3 independent REVOKEs, no
--   re-grant -- service_role's access comes from its role/BYPASSRLS, not a table
--   grant (verified: service_role SELECT stays true post-revoke).
--
-- NO RESTRICTIVE / USING(false) / deny-all policy (would re-introduce the rule
-- removed in 20260527151342). NO `FOR ALL TO authenticated` (would re-trip
-- for-all-audit + CLAUDE.md). `DROP POLICY IF EXISTS` makes each CREATE idempotent.

-- ===== RLSNP-02: explicit service_role_only policy on all 10 (lint 0008) =====

drop policy if exists "service_role_only" on public.app_config;
create policy "service_role_only" on public.app_config for all to service_role using (true) with check (true);
comment on table public.app_config is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. authenticated/anon have no grant + no policy -> zero rows + no /graphql/v1 exposure. Read/written by SECURITY DEFINER notify_n8n_* functions (BYPASSRLS).';

drop policy if exists "service_role_only" on public.email_suppressions;
create policy "service_role_only" on public.email_suppressions for all to service_role using (true) with check (true);
comment on table public.email_suppressions is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Managed by edge functions / service-role; no authenticated read path.';

drop policy if exists "service_role_only" on public.processed_internal_events;
create policy "service_role_only" on public.processed_internal_events for all to service_role using (true) with check (true);
comment on table public.processed_internal_events is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Infra idempotency ledger; service-role writers only.';

drop policy if exists "service_role_only" on public.security_events;
create policy "service_role_only" on public.security_events for all to service_role using (true) with check (true);
comment on table public.security_events is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Security audit log; the historical authenticated admin policy gated on the removed user_type=ADMIN check (dead) and no admin-log-viewer is in v3.0 scope.';

drop policy if exists "service_role_only" on public.stripe_webhook_events;
create policy "service_role_only" on public.stripe_webhook_events for all to service_role using (true) with check (true);
comment on table public.stripe_webhook_events is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Written by the stripe-webhooks edge function (service-role); no authenticated read path.';

drop policy if exists "service_role_only" on public.security_audit_log;
create policy "service_role_only" on public.security_audit_log for all to service_role using (true) with check (true);
comment on table public.security_audit_log is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Infra audit log; service-role only (already had no authenticated grant).';

drop policy if exists "service_role_only" on public.user_access_log;
create policy "service_role_only" on public.user_access_log for all to service_role using (true) with check (true);
comment on table public.user_access_log is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Infra access log; service-role only.';

drop policy if exists "service_role_only" on public.webhook_attempts;
create policy "service_role_only" on public.webhook_attempts for all to service_role using (true) with check (true);
comment on table public.webhook_attempts is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Webhook infra; service-role only.';

drop policy if exists "service_role_only" on public.webhook_events;
create policy "service_role_only" on public.webhook_events for all to service_role using (true) with check (true);
comment on table public.webhook_events is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Webhook infra; service-role only.';

drop policy if exists "service_role_only" on public.webhook_metrics;
create policy "service_role_only" on public.webhook_metrics for all to service_role using (true) with check (true);
comment on table public.webhook_metrics is 'Service-role-only (v3.0 Phase 2). RLS enabled; only policy is service_role_only. Webhook infra; service-role only.';

-- ===== RLSNP-03: revoke vestigial authenticated grant on the 5 Tier-A tables (lint 0027) =====

revoke all on public.app_config from authenticated;
revoke all on public.app_config from anon;
revoke all on public.app_config from public;

revoke all on public.email_suppressions from authenticated;
revoke all on public.email_suppressions from anon;
revoke all on public.email_suppressions from public;

revoke all on public.processed_internal_events from authenticated;
revoke all on public.processed_internal_events from anon;
revoke all on public.processed_internal_events from public;

revoke all on public.security_events from authenticated;
revoke all on public.security_events from anon;
revoke all on public.security_events from public;

revoke all on public.stripe_webhook_events from authenticated;
revoke all on public.stripe_webhook_events from anon;
revoke all on public.stripe_webhook_events from public;
