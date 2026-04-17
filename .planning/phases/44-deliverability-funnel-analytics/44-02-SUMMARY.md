---
phase: 44-deliverability-funnel-analytics
plan: 02
subsystem: analytics
tags: [funnel, cohort-analysis, onboarding, admin-rpc, triggers, backfill, rls]
dependency_graph:
  requires:
    - "getAdminTestCredentials() helper from Plan 1"
    - "public.is_admin() helper from launch_readiness_instrumentation"
  provides:
    - "public.onboarding_funnel_events (table + 2 indexes + RLS admin-select)"
    - "4 SECURITY DEFINER trigger functions + 5 triggers (signup, first_property, first_tenant, first_rent insert + update)"
    - "public.get_funnel_stats(timestamptz, timestamptz) admin RPC"
    - "public.backfill_funnel_events() idempotent backfill function"
  affects:
    - "public.users (AFTER INSERT trigger)"
    - "public.properties (AFTER INSERT trigger)"
    - "public.tenant_invitations (AFTER INSERT trigger)"
    - "public.rent_payments (AFTER INSERT + AFTER UPDATE OF status triggers)"
tech_stack:
  added: []
  patterns:
    - "Composite UNIQUE (owner_user_id, step_name) + ON CONFLICT DO NOTHING for trigger idempotency"
    - "BEGIN/EXCEPTION WHEN others THEN RAISE WARNING wrapping inside SECURITY DEFINER triggers (Pitfall 3 source-write never-fails)"
    - "Single SELECT against leases for owner lookup (never SELECT source table in same-txn trigger)"
    - "Signup-cohort jsonb return shape with cohort_label (Pitfall 5 UI clarity)"
    - "nullif(denominator, 0) + percentile_cont FILTER(WHERE is not null) for div-by-zero + non-completer exclusion"
    - "D8 UNION (tenants + tenant_invitations) with tenants->lease_tenants->leases owner walk"
key_files:
  created:
    - "supabase/migrations/20260415193247_onboarding_funnel_events_schema.sql"
    - "supabase/migrations/20260415193248_get_funnel_stats_rpc.sql"
    - "supabase/migrations/20260415193249_backfill_funnel_events.sql"
    - "tests/integration/rls/funnel-admin-rpc.test.ts"
  modified: []
decisions:
  - "D2: Signup-cohort semantics — cohort defined by signup in window; downstream steps counted at ANY time"
  - "D8: Backfill unions tenants + tenant_invitations; tenants branch joins through lease_tenants -> leases.owner_user_id (no direct owner_user_id on tenants)"
  - "Migration timestamps 20260415193247/48/49 — strictly greater than Plan 1's 20260415193245/46, internally ordered schema < rpc < backfill so triggers exist before backfill runs"
  - "Test seeding uses real FK-valid E2E_OWNER user id via auth.getUser() (not synthetic crypto.randomUUID) to satisfy users(id) FK — matches project RLS test convention"
  - "Unit-test flake recovered by retrying commit (signal: killed on first attempt for Task 5 was transient)"
  - "Task 7 (pnpm db:types) deferred to Wave 0 operator action — Supabase CLI returns Unauthorized in execution environment (same gate as Plan 1)"
metrics:
  duration_minutes: ~6
  completed_date: "2026-04-15"
  commits: 6
  tasks_completed: 6
  tasks_total: 7
  task_7_status: "Wave 0 operator action (auth-gated)"
requirements:
  - "ANALYTICS-03 (onboarding funnel event tracking shipped; types regen deferred to Wave 0)"
  - "ANALYTICS-04 (get_funnel_stats admin RPC shipped; types regen deferred to Wave 0)"
---

# Phase 44 Plan 02: Onboarding Funnel + Admin RPC Summary

Ship the onboarding funnel event log, admin-only funnel stats RPC, and
idempotent backfill. Trigger-driven capture guarantees atomicity with
source writes; signup-cohort semantics per D2 prevent misreading the
funnel during slow-conversion periods; UNION backfill per D8 captures
legacy direct-tenant cohorts that pre-date the invitation flow.

## What Shipped

6 of 7 atomic commits landed. Task 7 (types regen) is deferred to Wave 0
operator actions for the same reason as Plan 1 — `supabase gen types`
returns "Unauthorized" in the execution environment; CLI auth + live-DB
migration-push is naturally the operator's responsibility.

| # | Task | Commit | Files |
| - | ---- | ------ | ----- |
| 1 | onboarding_funnel_events table + admin RLS policy | `63f346dde` | `supabase/migrations/20260415193247_onboarding_funnel_events_schema.sql` |
| 2 | signup + first_property trigger functions + triggers | `1c633d8e5` | `supabase/migrations/20260415193247_onboarding_funnel_events_schema.sql` (appended) |
| 3 | first_tenant + first_rent triggers (INSERT + UPDATE OF status) | `615c8858b` | `supabase/migrations/20260415193247_onboarding_funnel_events_schema.sql` (appended) |
| 4 | get_funnel_stats RPC with signup-cohort semantics | `90c264ef6` | `supabase/migrations/20260415193248_get_funnel_stats_rpc.sql` |
| 5 | backfill_funnel_events() idempotent D8-union backfill | `c3a30b2e3` | `supabase/migrations/20260415193249_backfill_funnel_events.sql` |
| 6 | RLS integration test for get_funnel_stats admin gate | `8737626c0` | `tests/integration/rls/funnel-admin-rpc.test.ts` |
| 7 | DEFERRED — Regenerate `src/types/supabase.ts` | pending | `src/types/supabase.ts` |

## Decisions Honored

- **D2 (signup-cohort):** `get_funnel_stats` cohort CTE selects owners with `signup` event in `[p_from, p_to]`; `step_times` CTE then looks up each downstream step ANY time (not windowed). Return shape includes `cohort_label` so UI (Plan 3) can display "owners who signed up between ... and ..." next to the funnel chart.
- **D8 (tenant backfill union):** `backfill_funnel_events()` Step 3 unions (a) `tenant_invitations.owner_user_id + created_at` and (b) `tenants -> lease_tenants -> leases.owner_user_id + tenants.created_at` with `GROUP BY owner_user_id, MIN(created_at)`. Verified `public.tenants` has no direct `owner_user_id` column from base_schema; join walks through `lease_tenants.tenant_id = tenants.id AND lease_tenants.lease_id = leases.id`.
- **Migration timestamp ordering:** Plan 2's three migrations use `20260415193247/48/49` — strictly greater than Plan 1's last timestamp (`20260415193246_get_deliverability_stats_rpc.sql`). Internal order ensures schema+triggers exist before backfill runs.

## Threat Mitigations Verified

- **T-44-02-01 (trigger deadlock on rent_payments, Pitfall 3):** First_rent trigger body reads only `NEW.*` plus ONE read-only SELECT against `leases`. Never SELECTs `rent_payments`. ON CONFLICT DO NOTHING on the funnel unique index releases without waiting on other writers. FK to `users(id)` acquires benign shared lock.
- **T-44-02-02 (SECURITY DEFINER privilege escalation):** Every function sets `search_path = public` and fully qualifies table/function references. 4 trigger fns + RPC + backfill = 6 functions, all verified.
- **T-44-02-03 (backfill double-insert):** Composite UNIQUE (owner_user_id, step_name) + ON CONFLICT DO NOTHING on every backfill INSERT. `backfill_funnel_events()` is not granted to authenticated role — only service_role can re-invoke.
- **T-44-02-04 (cohort-window bypass):** RPC raises `Invalid window` for `p_from > p_to` or `p_to > now()`.
- **T-44-02-05 (RLS policy misapplication):** Only SELECT policy on funnel table is admin-only via `is_admin()`. No authenticated INSERT/UPDATE/DELETE policies — all writes go through SECURITY DEFINER triggers. Integration test in Task 6 includes non-admin OWNER + anon rejection coverage.
- **T-44-02-06 (silent event drop via exception-swallow):** Accepted residual risk — source writes must never fail because of funnel infra. `RAISE WARNING` emits with function name + row id + SQLSTATE for operator visibility via Supabase logs.
- **T-44-02-07 (D8 orphan tenant exclusion):** Accepted — tenants without a lease linkage are intentionally excluded from first_tenant backfill; an orphaned tenant is itself incomplete onboarding.

## Plan-Check Flags Resolved

1. **Migration timestamp ordering:** Used `20260415193247/48/49` (Plan 1 used `...245/246`). Ordering satisfied.
2. **Task 6 FK seeding:** Replaced plan skeleton's `crypto.randomUUID()` with real FK-valid E2E_OWNER user id resolved via `auth.getUser()`. Matches `properties.rls.test.ts` seeding pattern. Pre-cleanup + post-cleanup delete by (owner_user_id, step_name) pairs leaves only our seed rows gone.

## Deviations from Plan

**None of Rules 1-3 triggered.** All 6 executed tasks followed the plan verbatim with the two resolution points documented above (which were called out explicitly in the plan-check verdict as "flags to resolve during execution").

## Authentication Gates

**Task 7 (`pnpm db:types`):** Supabase CLI returns `failed to retrieve generated types: {"message":"Unauthorized"}`. Same gate hit by Plan 1. The empty file written by the failed `>` redirect was reverted via `git checkout HEAD -- src/types/supabase.ts` — the committed 3,089-line file is intact.

## Wave 0 Operator Actions

1. **Authenticate Supabase CLI** (`supabase login`) and push migrations:
   ```bash
   supabase migration up --linked
   # or: supabase db push
   ```
   This applies `20260415193247_onboarding_funnel_events_schema.sql`,
   `20260415193248_get_funnel_stats_rpc.sql`, and
   `20260415193249_backfill_funnel_events.sql` to the live DB, at which
   point the one-time `select public.backfill_funnel_events();` runs
   automatically from the third migration.
2. **Regenerate types** after migrations land:
   ```bash
   pnpm db:types
   pnpm typecheck
   ```
   Commit as `chore(phase-44): regenerate supabase types for funnel events + RPC`.
3. **Confirm `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`** provisioned in
   test env (prerequisite from Plan 1 / D6). Without these, Task 6's
   admin-path tests skip with a clear reason; non-admin rejection tests
   run always.
4. **Confirm `SUPABASE_SERVICE_ROLE_KEY`** available in integration test
   env — required for seeding funnel events in the admin happy-path test.
5. **Optional manual re-run** of `select public.backfill_funnel_events()`
   from SQL editor if OWNER cohort gaps are observed post-deploy — re-run
   is idempotent (ON CONFLICT DO NOTHING) and safe.
6. **Plan 3 (admin UI) readiness:** After types regen lands, Plan 3 can
   consume `get_funnel_stats` via a new `use-funnel-stats.ts` hook
   against `Database['public']['Functions']['get_funnel_stats']`.

## Verification Evidence

- **pnpm typecheck:** PASS (0 errors, 3089-line `src/types/supabase.ts` intact)
- **pnpm lint:** PASS (0 errors)
- **pnpm test:unit:** 1632 tests passed in 129 files
- **pnpm test:integration** for the new funnel test: NOT run in this
  executor session (requires the migrations to have been applied to the
  live DB + the Supabase CLI auth gate cleared + admin/owner/service-role
  test env vars provisioned — all Wave 0 concerns). The non-admin
  rejection tests would run against whatever is currently deployed; the
  admin-path block skips without creds.

## Commit List

```
63f346dde feat(phase-44): create onboarding_funnel_events table + admin RLS policy
1c633d8e5 feat(phase-44): add signup + first_property funnel triggers
615c8858b feat(phase-44): add first_tenant + first_rent funnel triggers (insert + update)
90c264ef6 feat(phase-44): add get_funnel_stats RPC with signup-cohort semantics
c3a30b2e3 feat(phase-44): add idempotent backfill_funnel_events function with D8 union
8737626c0 test(phase-44): add RLS integration test for get_funnel_stats admin RPC
```

## Self-Check: PASSED

- `supabase/migrations/20260415193247_onboarding_funnel_events_schema.sql` FOUND
- `supabase/migrations/20260415193248_get_funnel_stats_rpc.sql` FOUND
- `supabase/migrations/20260415193249_backfill_funnel_events.sql` FOUND
- `tests/integration/rls/funnel-admin-rpc.test.ts` FOUND
- Commit `63f346dde` FOUND
- Commit `1c633d8e5` FOUND
- Commit `615c8858b` FOUND
- Commit `90c264ef6` FOUND
- Commit `c3a30b2e3` FOUND
- Commit `8737626c0` FOUND
