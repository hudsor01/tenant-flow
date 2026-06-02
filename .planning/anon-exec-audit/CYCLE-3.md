# RLS-No-Policy Resolution Audit — Cycle 3

**Continues:** [CYCLE-1.md](CYCLE-1.md) (anon SECURITY DEFINER) + [CYCLE-2.md](CYCLE-2.md) (authenticated SECURITY DEFINER classification). This cycle resolves the **`rls_enabled_no_policy`** advisor surface — the 10 infra tables with RLS enabled but zero policies.

**Source:** Supabase Security Advisor `rls_enabled_no_policy` (lint 0008, 10 INFO) + `pg_graphql_authenticated_table_exposed` (lint 0027) on prod `bshjmbshupiibfiewpxb`. **Phase:** v3.0 Security Hardening, Phase 2. **Requirements:** RLSNP-01/02/03, SECTEST-02. **Migration:** `supabase/migrations/20260602230717_rls_no_policy_resolution_phase2.sql`.

## Headline

All 10 tables had **RLS enabled with 0 policies** (verified live, the A1 gate) → already fail-closed, but the lint flagged the ambiguity and 5 carried a vestigial `authenticated` table-grant that exposed schema via `pg_graphql` `/graphql/v1` introspection (lint 0027). Resolution: an explicit canonical `service_role_only` FOR ALL policy on all 10 (clears lint 0008, documents intent) + revoke the 5 vestigial `authenticated` grants (clears lint 0027). **Advisor `rls_enabled_no_policy`: 10 → 0** (confirmed post-apply). No RESTRICTIVE/deny-all (the `20260527151342`-removed rule was NOT re-introduced).

## A1 live-introspection gate (2026-06-02, BEFORE the migration)

| Table | RLS | Live policies | anon grant | authn grant | svc grant | Tier |
|-------|-----|---------------|------------|-------------|-----------|------|
| app_config | on | (none) | ✗ | **✓** | ✓ | A |
| email_suppressions | on | (none) | ✗ | **✓** | ✓ | A |
| processed_internal_events | on | (none) | ✗ | **✓** | ✓ | A |
| security_events | on | (none) | ✗ | **✓** | ✓ | A |
| stripe_webhook_events | on | (none) | ✗ | **✓** | ✓ | A |
| security_audit_log | on | (none) | ✗ | ✗ | ✓ | B |
| user_access_log | on | (none) | ✗ | ✗ | ✓ | B |
| webhook_attempts | on | (none) | ✗ | ✗ | ✓ | B |
| webhook_events | on | (none) | ✗ | ✗ | ✓ | B |
| webhook_metrics | on | (none) | ✗ | ✗ | ✓ | B |

The repo migrations had suggested some tables (e.g. `email_suppressions`) carried service_role policies — the live gate disproved that (0 policies on all 10), so the migration was authored against the **actual** live state. `DROP POLICY IF EXISTS "service_role_only"` kept each CREATE idempotent regardless.

## RLSNP-01 — per-table intent verdicts (all 10: service-role-only, lock down)

| Table | Evidence | Verdict |
|-------|----------|---------|
| `app_config` | No client `.from()`; read/written by SECURITY DEFINER `notify_n8n_*` triggers (BYPASSRLS). The prior `service_role_only` policy was dropped in `20260504164842` ONLY because the old `for-all-audit` test flagged any service_role FOR ALL policy — Phase 1 rewrote that test to anticipate these. | Lock down |
| `email_suppressions` | No client/edge `.from()`; managed by service-role/edge functions. | Lock down |
| `processed_internal_events` | Infra idempotency ledger; in the `rls-policies` skill's documented service-role-only list. | Lock down |
| `security_events` | Security audit log. The only historical authenticated policy gated on the removed `user_type='ADMIN'` check (dead post-`is_admin` migration); no admin-log-viewer is in v3.0 scope. | Lock down |
| `stripe_webhook_events` | Written only by the `stripe-webhooks` edge function (service-role); no authenticated read path. | Lock down |
| `security_audit_log`, `user_access_log`, `webhook_attempts`, `webhook_events`, `webhook_metrics` | Infra audit/webhook tables; already had no authenticated grant (Tier-B); in the skill's documented service-role-only set. | Lock down |

None needed a scoped authenticated policy. If a future milestone needs e.g. an admin security-log viewer, it adds a scoped `is_admin()` SELECT policy then — out of v3.0 scope.

## Migration record (`20260602230717`)

- **RLSNP-02:** 10× `create policy "service_role_only" on public.<table> for all to service_role using (true) with check (true)` (idempotent via `drop policy if exists`) + a `comment on table` per table documenting the deliberate lockdown.
- **RLSNP-03:** `revoke all … from authenticated` (+ defensive anon/public) on the 5 Tier-A tables.
- Applied via MCP `apply_migration`; prod timestamp `20260602230717` reconciled.

## Verification (post-apply, confirmed live)

| Signal | Result |
|--------|--------|
| Each of 10 tables has exactly 1 policy named `service_role_only` | ✅ |
| `authenticated` grant on all 10 | ✗ (Tier-A revoked; Tier-B already none) ✅ |
| `anon` grant on all 10 | ✗ ✅ |
| `service_role` SELECT on all 10 | ✓ (retained) ✅ |
| Advisor `rls_enabled_no_policy` | **10 → 0** ✅ |
| Advisor lint 0027 (pg_graphql) for the 5 Tier-A tables | absent ✅ |

**Deny side (SECTEST-02)** pinned in CI by `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` (authenticated + anon → permission error / empty on all 10). **Allow side** is out-of-band: the `rls-security` harness has no service-role key, so service_role access is verified via the advisor (lint 0008 = 0 proves a policy exists) + the live `has_table_privilege` grid above. `for-all-audit.test.ts` stays green (it pins `is_admin()`-gated behavior, not "zero FOR ALL service_role policies").
