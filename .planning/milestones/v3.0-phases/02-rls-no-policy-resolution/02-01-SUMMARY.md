---
phase: 02-rls-no-policy-resolution
plan: 01
completed: 2026-06-02
requirements: [RLSNP-01, RLSNP-02, RLSNP-03]
status: complete
---

# Plan 02-01 Summary — RLS-no-policy lockdown migration

**One-liner:** Ran the A1 live-introspection gate, then shipped one atomic prod migration (`20260602230717`) adding a canonical `service_role_only` FOR ALL policy to all 10 `rls_enabled_no_policy` tables + revoking the 5 vestigial Tier-A `authenticated` grants — advisor `rls_enabled_no_policy` confirmed **10 → 0** — and wrote the CYCLE-3 audit doc.

## What was done

- **A1 gate (live introspection BEFORE any DDL):** all 10 tables verified RLS-on with **0 policies** (disproving the repo-migration suggestion that some carried service_role policies); anon grant absent on all; the 5 Tier-A tables (`app_config`, `email_suppressions`, `processed_internal_events`, `security_events`, `stripe_webhook_events`) carry the vestigial `authenticated` grant; the 5 Tier-B already service-role-only. Recorded in CYCLE-3.md.
- **Migration `supabase/migrations/20260602230717_rls_no_policy_resolution_phase2.sql`** applied via MCP `apply_migration`; prod timestamp reconciled via `list_migrations`.
  - RLSNP-02: 10× `service_role_only FOR ALL TO service_role USING(true) WITH CHECK(true)` (idempotent `DROP POLICY IF EXISTS`) + per-table intent `COMMENT ON TABLE`.
  - RLSNP-03: `REVOKE ALL FROM authenticated` (+ defensive anon/public) on the 5 Tier-A tables.
- **Verified live (post-apply):** each of the 10 tables has exactly 1 `service_role_only` policy; `authenticated`/`anon` grant = false on all 10; `service_role` SELECT = true on all 10. Advisor `rls_enabled_no_policy` **10 → 0**; the 5 Tier-A tables absent from `pg_graphql_authenticated_table_exposed` (lint 0027).
- **CYCLE-3.md** written (RLSNP-01 per-table intent verdicts + A1 gate table + migration record + verification grid).

## Notes / deviations

- **Types unaffected:** RLS policies + role grants do NOT appear in the Supabase-generated `Row`/`Insert`/`Update`/`Functions` types (column/relationship-based), so `src/types/supabase.ts` is correctly unchanged. `bun run db:types` hit the known intermittent Supabase CLI 401 (`supabase-cli-functions-deploy-401-pattern`) and left the file unmodified — which is the correct end state here regardless. No regen needed.
- **No deny-all re-introduced:** positive `service_role_only` policies only; no RESTRICTIVE / `USING(false)`. The `20260527151342`-removed rule stays removed.
- **Live state was cleaner than the repo suggested** — the A1 gate confirmed 0 stale policies on all 10, so the idempotent `DROP POLICY IF EXISTS` had nothing to remove and there were no collisions.

## Hands off to Plan 02-02

- New `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts`: pin authenticated (ownerA) + anon DENY on all 10 tables (permission error / empty `[]`).
- Regression: `for-all-audit.test.ts` stays green (the new service_role FOR ALL policies must not re-trip it — Phase 1 rewrote it to anticipate them).
- Allow side (service_role) is verified out-of-band (advisor lint 0008 = 0 + the live `has_table_privilege` grid above) — the harness has no service-role client.

## Requirement closure

- RLSNP-01 ✓ (intent verdicts) · RLSNP-02 ✓ (10 policies) · RLSNP-03 ✓ (5 revokes). Advisor 10→0 confirmed.
