---
phase: 54-e-sign-storage-metering
plan: 01
subsystem: database
tags: [postgres, rls, supabase, plpgsql, advisory-lock, metering, e-sign]

# Dependency graph
requires:
  - phase: 53-renewal-reminder-delivery
    provides: append-only event table + service_role-only RPC discipline (lease_reminders / claim_lease_reminders)
provides:
  - esign_events append-only table (owner-scoped SELECT RLS, no authenticated write path)
  - meter_esign_send(uuid, uuid) advisory-lock count-and-insert RPC (25/calendar-month Growth cap, Max unlimited, service_role-only)
  - get_esign_usage_current_month() param-less owner-scoped read RPC (authenticated)
  - esign-metering.rls.test.ts dual-client integration coverage (cap/race/month/isolation/privilege)
affects: [54-02 lease-signature edge-fn hook, 54-05 Settings usage widget, METER-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Advisory-lock count-and-insert: pg_advisory_xact_lock(hashtextextended('esign:'||owner,0)) serializes same-owner check-then-insert (TOCTOU-safe under READ COMMITTED)"
    - "date_trunc('month', now()) calendar-month quota window"
    - "Append-only metering table: single owner-scoped SELECT policy, no authenticated write policy, writes only via service_role RPC (mirrors lease_reminders)"
    - "Param-less owner-scoped read RPC resolving (select auth.uid()) internally, granted to authenticated"

key-files:
  created:
    - supabase/migrations/20260724031533_esign_metering.sql
    - tests/integration/rls/esign-metering.rls.test.ts
  modified: []

key-decisions:
  - "Advisory lock (not INSERT...SELECT WHERE count<25) for race safety — the researcher-selected form; different owners hash to distinct lock keys and never contend"
  - "Max detection matches slugs 'max'/'tenantflow_max' + lowercased annual/monthly Max price ids, mirroring get_user_plan_limits + plan-tier.ts"
  - "Single uuid signatures only — no (text) overload (avoids PGRST203 ambiguity, Pitfall 6)"
  - "Test overrides synthetic ownerA subscription_plan to 'growth' for cap cases (synthetic owners are pinned 'max' = exempt), restored in afterAll"

patterns-established:
  - "Race-safe DB-layer quota metering via per-owner transaction advisory lock"
  - "Service-role + dual-owner RLS integration harness with plan override for tier-gated behavior"

requirements-completed: []  # METER-01 authored but NOT verified/complete — Task 2 (prod apply + RLS run) deferred to orchestrator

# Metrics
duration: 20min
completed: 2026-07-23
---

# Phase 54 Plan 01: E-sign Metering Data Layer Summary

**Race-safe append-only e-sign metering: advisory-lock `meter_esign_send` RPC enforcing the 25/calendar-month Growth cap (Max unlimited), owner-scoped `esign_events` table, and a param-less `get_esign_usage_current_month()` read RPC — authored with full dual-client RLS coverage.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 1 of 2 executed (Task 2 deferred to orchestrator — see below)
- **Files created:** 2

## Accomplishments
- Authored `20260724031533_esign_metering.sql` exactly per the plan's `<action>` and RESEARCH Pattern 2:
  - `esign_events` append-only table — `owner_user_id`/`lease_id` FKs (on delete cascade), `event_type text` + `CHECK (event_type in ('send'))` (no PG enum), `created_at timestamptz`, `idx_esign_events_owner_month` index, RLS enabled, single `esign_events_select` policy (`owner_user_id = (select auth.uid())`), NO authenticated insert/update/delete policy.
  - `meter_esign_send(p_owner uuid, p_lease uuid)` — `pg_advisory_xact_lock(hashtextextended('esign:'||p_owner::text, 0))` FIRST, then Max branch (insert + `unlimited=true`) / Growth branch (count over `date_trunc('month', now())`, block at `>=25` with no insert, else insert + `used=v_used+1`). SECURITY DEFINER, `set search_path = public`, revoked from public/anon/authenticated, granted to service_role only.
  - `get_esign_usage_current_month()` — param-less, resolves `(select auth.uid())` internally (raises on null), returns `{used, cap=25, unlimited}`, revoked from public/anon, granted to authenticated.
- Authored `esign-metering.rls.test.ts` — service-role + dual-owner harness (mirrors `blogs-status-workflow` + `notifications` tests) covering all six METER-01 behaviors: 25th allowed / 26th blocked (no insert), Max unbounded (`unlimited=true`), calendar-month exclusion of a back-dated row, advisory-lock concurrency (`Promise.all` at count=24 → exactly one 25th insert), owner-SELECT isolation, and the `meter_esign_send` service-role privilege boundary (chai-6 `.rejects` via `REVOKED_CODES`). Also asserts the param-less read RPC. Overrides ownerA's `subscription_plan` to `growth` for cap cases and restores it in `afterAll`.

## Task Commits

1. **Task 1: Author esign_metering migration + dual-client RLS test** — `8b42cff22` (feat)

**Plan metadata (SUMMARY):** committed separately (docs).

## Files Created/Modified
- `supabase/migrations/20260724031533_esign_metering.sql` — esign_events table + owner-SELECT RLS + advisory-lock `meter_esign_send` RPC + param-less `get_esign_usage_current_month` read RPC
- `tests/integration/rls/esign-metering.rls.test.ts` — dual-client (service_role + ownerA/ownerB) METER-01 coverage: cap, race, calendar-month, isolation, privilege

## Decisions Made
- Advisory lock over `INSERT...SELECT...WHERE count<25` for the race-safe form (researcher's pick; the subquery count does not lock rows under READ COMMITTED).
- Max detection uses lowercased slugs + price ids to mirror `get_user_plan_limits` / `plan-tier.ts` exactly.
- `get_esign_usage_current_month()` marked `stable` (read-only) vs `meter_esign_send` volatile (inserts).
- Test creates a property→unit→tenant→lease fixture via the service client (esign_events.lease_id is a NOT NULL FK to leases) while ownerA is still `max` (so plan-limit triggers never fire during setup), then overrides to `growth`.

## Deviations from Plan

None — Task 1 authored exactly as written. Only automated (grep) verification was run for Task 1 (`echo OK`), and biome auto-formatted the test file (whitespace only, no logic change).

## Deferred to Orchestrator (Task 2 — [BLOCKING], owner/orchestrator-run)

Task 2 is intentionally **NOT executed here** — this agent has no Supabase MCP tools, and the RLS integration test hits **prod**, which requires the migration applied there first. The orchestrator must, in order:

1. **Apply the migration via Supabase MCP `apply_migration`** (name `esign_metering`). Do NOT run `supabase db push` (CLAUDE.md forbids it; CLI PAT 401s).
2. **Reconcile the repo filename** to the prod-assigned version via MCP `list_migrations` (migration-mcp-prod-drift — the prod timestamp may differ from `20260723120000`; rename the local file to match).
3. **Regenerate types** — `bun run db:types` (owner-run; PAT may need refresh → MCP `generate_typescript_types` fallback written to `src/types/supabase.ts`). Confirm `esign_events`, `meter_esign_send`, and `get_esign_usage_current_month` appear.
4. **`bun run typecheck`** exits 0.
5. **Run the RLS test** — `bun run test:integration -- esign-metering.rls.test.ts` (green against live prod, incl. the concurrency case). Post-verify via MCP `execute_sql`: `select to_regprocedure('public.meter_esign_send(uuid,uuid)') is not null;` = true, and `select has_function_privilege('authenticated','public.meter_esign_send(uuid,uuid)','execute');` = **false** (service_role-only).

`src/types/supabase.ts` was intentionally **NOT modified** by this agent (the orchestrator regenerates it after applying the migration). METER-01 is therefore **authored, not yet verified/complete** — do not mark the requirement complete until Task 2's RLS test is green.

## Issues Encountered
None. The pre-commit hook's `tsc --noEmit` passed even before types were regenerated — the RLS test uses an untyped `SupabaseClient` (default `Database=any`), so `.from("esign_events")` / `.rpc("meter_esign_send")` typecheck against arbitrary names (established test-harness convention).

## Next Phase Readiness
- `meter_esign_send` ready for the Plan 02 `lease-signature` `send`-path hook (after `checkTierEntitlement`, `resend` never meters — D-02).
- `get_esign_usage_current_month` ready for the Plan 05 Settings usage widget.
- Blocker: the data layer is not live until the orchestrator completes Task 2 (apply + regen + RLS run).

## Self-Check: PASSED

- FOUND: supabase/migrations/20260724031533_esign_metering.sql
- FOUND: tests/integration/rls/esign-metering.rls.test.ts
- FOUND: .planning/phases/54-e-sign-storage-metering/54-01-SUMMARY.md
- FOUND commit: 8b42cff22 (feat(54-01): author esign metering migration + dual-client RLS test)

---
*Phase: 54-e-sign-storage-metering*
*Completed: 2026-07-23*
