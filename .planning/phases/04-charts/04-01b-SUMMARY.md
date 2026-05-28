---
phase: 04-charts
plan: 01b
subsystem: ui-data-layer
tags: [analytics, dashboard, rpc, postgrest, rls, integration-test, typescript]

# Dependency graph
requires:
  - phase: 04-01a
    provides: "Database migration 20260526203003 adds time_series.monthly_revenue_6mo JSONB key to get_dashboard_data_v2 RPC. Smoke-tested to return 6-bucket YYYY-MM array against prod."
  - phase: 02-data-layer-rpc
    provides: "SHIPPED auth-guard contract (auth.uid() != p_user_id raises 'Access denied: cannot request data for another user') from cycle-10 migration 20260524012602. Phase 4 RLS test asserts the same /access denied/i regex."
provides:
  - "MonthlyRevenuePoint { month, value } type exported from #types/analytics"
  - "Boundary mapper at src/hooks/api/use-owner-dashboard.ts emits timeSeries.monthlyRevenue6mo on DashboardChartsData AND OwnerDashboardData"
  - "Dual-client RLS integration test at tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts (3 it() blocks: own-owner happy, cross-owner A→B, cross-owner B→A)"
affects: [04-02, 04-03, dashboard-revenue-chart, dashboard-6mo-toggle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intersection-type narrowing at RPC boundary — Record<string, TimeSeriesDataPoint[]> & { monthly_revenue_6mo?: MonthlyRevenuePoint[] }. Project-idiomatic mapper-boundary pattern per CLAUDE.md RPC/PostgREST; replaces banned `as unknown as`."
    - "MonthlyRevenuePoint is intentionally distinct from TimeSeriesDataPoint — 6mo buckets key by `month` (YYYY-MM), 30d points key by `date`. Two distinct shapes via two distinct types rather than overloading one."
    - "Dual-client RLS test pattern reuses createTestClient/getTestCredentials harness (no fixtures created when the system under test is a pure aggregate over existing data)."

key-files:
  created:
    - "tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts (200 lines, 3 it() blocks)"
  modified:
    - "src/types/analytics.ts (+10 lines, +1 export — MonthlyRevenuePoint)"
    - "src/hooks/api/use-owner-dashboard.ts (+13/-2 lines — import, two type extensions, intersection-type narrowing, one return-statement line)"
    - "src/components/dashboard/dashboard-data.test.ts (+1 line — basePayload fixture extension)"

key-decisions:
  - "MonthlyRevenuePoint defined as a new exported interface (not added to TimeSeriesDataPoint as an optional `month` field) — 6mo buckets and 30d points have semantically distinct keys (month vs date) and forcing one type to support both would invite drift"
  - "Boundary-mapper widens result.time_series via intersection type (Record<string, TimeSeriesDataPoint[]> & { monthly_revenue_6mo?: MonthlyRevenuePoint[] }) — the heterogeneous JSONB shape can't fit into a homogeneous Record"
  - "RLS test asserts /access denied/i regex AND literal 'cannot request data for another user' substring — regex is forward-compatible to wording changes; literal flags semantic drift"
  - "Last-bucket assertion bounded to [previous, current] calendar month — midnight-UTC boundary tolerance (RESEARCH.md Q1)"

patterns-established:
  - "Phase 4 frontend boundary-mapper edits are 4 lines total (one import line update, two type extensions, one return-statement line). Future plans should hold to this discipline (D-10 cap)."
  - "Fixture-free RLS tests work when the SUT is a pure aggregate over existing data. Shape-only assertions per RESEARCH.md Q5 avoid the dollar-value-fixturing fragility trap."

requirements-completed: [CHART-01]

# Metrics
duration: 25min
completed: 2026-05-26
---

# Phase 04 Plan 01b: Frontend type + RLS test for monthly_revenue_6mo

**MonthlyRevenuePoint type exported, boundary mapper emits monthlyRevenue6mo on both selector seams, dual-client RLS test pins SHIPPED cycle-10 `/access denied/i` contract with symmetric coverage.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-26T16:18:00Z
- **Completed:** 2026-05-26T16:43:00Z
- **Tasks:** 2 (both `type="auto"`, one with `tdd="true"`)
- **Files modified:** 3
- **Files created:** 1
- **Net diff:** +222 lines, -2 lines (4 files)

## Accomplishments

- `MonthlyRevenuePoint` type live in `src/types/analytics.ts` — single source of truth, no duplicate, no `any`.
- Boundary mapper at `src/hooks/api/use-owner-dashboard.ts` emits `timeSeries.monthlyRevenue6mo: MonthlyRevenuePoint[]` on both `DashboardChartsData` AND `OwnerDashboardData` (selector seam coherent for `use-dashboard-hooks.ts` and the page composition).
- RLS isolation test pins the SHIPPED Phase-2 cycle-10 contract (`/access denied/i` regex), with symmetric A→B and B→A coverage. Defense-in-depth literal match for `'cannot request data for another user'` flags semantic drift even if a future cycle reworses the auth-guard message.
- Zero new query-key factories, zero new `useQuery` call sites, zero `as unknown as`, zero `any`. D-10 cap honored.

## Task Commits

1. **Task 1: Add MonthlyRevenuePoint + extend boundary mapper** — `2998c8a68` (feat)
2. **Task 2: Dual-client RLS integration test for monthly_revenue_6mo** — `5d53d82ed` (test)

**Plan metadata:** Pending (this SUMMARY + orchestrator-owned state files committed by execute-plan.md final step).

## Files Created/Modified

- `src/types/analytics.ts` — Added `MonthlyRevenuePoint { month: string; value: number }` after `TimeSeriesDataPoint`. Comment references migration `20260526203003_phase4_revenue_trend_6mo.sql` as the server contract.
- `src/hooks/api/use-owner-dashboard.ts` — Extended `import type` group to include `MonthlyRevenuePoint`. Added `monthlyRevenue6mo: MonthlyRevenuePoint[]` field to both `DashboardChartsData.timeSeries` (the selector seam) and `OwnerDashboardData.timeSeries` (the raw fetcher payload). Widened the `result.time_series` narrowing via intersection type `Record<string, TimeSeriesDataPoint[]> & { monthly_revenue_6mo?: MonthlyRevenuePoint[] }`. Added one line to the return statement: `monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? []`.
- `src/components/dashboard/dashboard-data.test.ts` — Extended `basePayload.timeSeries` fixture with `monthlyRevenue6mo: []` (Rule 1 fixup; the strict OwnerDashboardData type broke this fixture until the new field was present).
- `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` — New 200-line file. Mirrors `dashboard-rpc-open-maintenance.test.ts` (Phase 2 canonical). Three `it()` blocks: own-owner happy path with rich shape assertions (length===6, YYYY-MM regex, ascending sort, unique months, last bucket within [previous, current] calendar month), cross-owner A→B rejection with `/access denied/i` regex + literal contract phrase, symmetric cross-owner B→A rejection.

## Decisions Made

- **Two distinct types over one overloaded type.** `MonthlyRevenuePoint { month, value }` is intentionally NOT a variant of `TimeSeriesDataPoint { date, value, label? }`. The 30d series keys by `date`, the 6mo series keys by `month`. Forcing both into one type would invite drift between server JSONB shape and TS definition. Cost: one extra interface; benefit: type system enforces the right key per use site.
- **Intersection-type narrowing over single-shape Record.** The RPC's `time_series` JSONB carries both homogeneous arrays (occupancy_rate, monthly_revenue — both `TimeSeriesDataPoint[]`) and a heterogeneous array (monthly_revenue_6mo — `MonthlyRevenuePoint[]`). A single `Record<string, TimeSeriesDataPoint[]>` would falsely narrow the new key. The intersection `Record<...> & { monthly_revenue_6mo?: MonthlyRevenuePoint[] }` is the project-idiomatic mapper-boundary pattern per CLAUDE.md.
- **Shape-only assertions in the RLS test.** Per RESEARCH.md Q5 — Owner A's actual revenue against prod is non-deterministic (and currently 0 across all 6 buckets per 04-01a smoke output). Asserting specific dollar values would either require fixtures (Phase 4 D-10 says no fixtures for read-only tests) or be brittle. Shape-only assertions pin everything the chart actually depends on without coupling to test-data state.
- **Defense-in-depth literal match alongside the regex.** `expect(error.message).toMatch(/access denied/i)` matches the SHIPPED contract. The followup `expect(error.message).toContain('cannot request data for another user')` is the canary — if a future cycle changes the rejection wording to a different /access denied/i variant, the regex still passes but the literal flags semantic drift. Two-layer guard.
- **Last-bucket assertion is bounded, not pinned.** `expect([currentYearMonth, previousYearMonth]).toContain(lastBucket)` tolerates the midnight-UTC boundary — if the test fires just after the server rolled over but the client clock hasn't, last bucket lags by one month. Tighter pin would create midnight flakes; looser pin would miss real regressions to e.g. -2 months.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixture in dashboard-data.test.ts broke typecheck**
- **Found during:** Task 1 (post-edit `bun run typecheck`)
- **Issue:** `OwnerDashboardData.timeSeries.monthlyRevenue6mo: MonthlyRevenuePoint[]` is non-optional (correct per plan), so the strict `basePayload: OwnerDashboardData = { ..., timeSeries: { occupancyRate: [], monthlyRevenue: [] } }` literal at `src/components/dashboard/dashboard-data.test.ts:50` failed `TS2741: Property 'monthlyRevenue6mo' is missing`.
- **Fix:** Added `monthlyRevenue6mo: []` to the fixture. The test exercises `transformDashboardData` which doesn't touch this field, so an empty array is the minimal-correct value.
- **Files modified:** `src/components/dashboard/dashboard-data.test.ts`
- **Verification:** `bun run typecheck` exits 0 after the fix.
- **Committed in:** `2998c8a68` (Task 1 commit, single atomic change with the type extension)

---

**Total deviations:** 1 auto-fixed (1 bug — Rule 1 fixture sync)
**Impact on plan:** The deviation is a one-line fixup that the plan didn't preempt because the plan's `<read_first>` block didn't reference the basePayload fixture. No scope creep; the new line is structurally identical to the existing `occupancyRate: []` and `monthlyRevenue: []` siblings.

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| MonthlyRevenuePoint exported | `grep -c "export interface MonthlyRevenuePoint" src/types/analytics.ts` | 1 ✓ |
| Both type fields extended | `grep -c "MonthlyRevenuePoint\[\]" src/hooks/api/use-owner-dashboard.ts` | 3 ✓ (DashboardChartsData + OwnerDashboardData + import group references) |
| Three monthlyRevenue6mo: lines | `grep -c "monthlyRevenue6mo:" src/hooks/api/use-owner-dashboard.ts` | 3 ✓ (two type fields + return statement) |
| One boundary-mapper line | `grep -c "result.time_series?.monthly_revenue_6mo ?? \[\]" src/hooks/api/use-owner-dashboard.ts` | 1 ✓ |
| No new useQuery | `grep -c "useQuery" src/hooks/api/use-owner-dashboard.ts` | 0 ✓ (unchanged from pre-edit baseline) |
| No `as unknown as` | `grep -c "as unknown as" src/hooks/api/use-owner-dashboard.ts tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | 0 ✓ |
| No `any` | `grep -E ":\s*any[^a-z]|<any>" src/hooks/api/use-owner-dashboard.ts src/types/analytics.ts tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | 0 ✓ |
| RLS test 3 it() blocks | `grep -cE "^\s*it\(" tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | 3 ✓ |
| /access denied/i twice | `grep -c "toMatch(/access denied/i)" tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | 2 ✓ (A→B + B→A) |
| length 6 assertion | `grep -cE "toHaveLength\(6\)" tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | 1 ✓ |
| YYYY-MM regex assertion | `grep -cE 'toMatch\(/\^\\d\{4\}-\\d\{2\}\$/\)' tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | 1 ✓ |
| No `.skip` | `grep -cE "(it\|describe\|test)\.skip" tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | 0 ✓ |
| typecheck | `bun run typecheck` | exit 0 ✓ |
| lint (modified files) | `bun run lint src/types/analytics.ts src/hooks/api/use-owner-dashboard.ts src/components/dashboard/dashboard-data.test.ts tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` | "No fixes applied" ✓ |
| Full unit suite (lefthook ran twice — pre-commit on each task) | `CI=true bun run test:unit -- --coverage` | 172 files passed (172), 104,854 tests passed (104,854) ✓ |

## Issues Encountered

**1. Integration test cannot run locally — Owner B credentials live only in GitHub Secrets.**

The plan acceptance criterion `bun run test:integration -- --run tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts exits 0 against prod with all 3 tests passing` cannot be satisfied from this worktree. Verified inventory:

- `/Users/richard/Developer/tenant-flow/.env.local` (the dev shell file): has `NEXT_PUBLIC_SUPABASE_URL` + publishable key but does NOT have `E2E_OWNER_*` or `E2E_OWNER_B_*` credentials.
- `/Users/richard/Developer/tenant-flow/.vercel/.env.production.local`: has `E2E_OWNER_EMAIL=rhudson42@yahoo.com` + `E2E_OWNER_PASSWORD` but NOT `E2E_OWNER_B_*`.
- `/Users/richard/Developer/tenant-flow/.vercel/.env.preview.local`: has `E2E_OWNER_EMAIL=rhudsontspr+46@gmail.com` + `E2E_OWNER_PASSWORD` but NOT `E2E_OWNER_B_*`.
- `.env.example`: placeholder only.

Per CLAUDE.md "Testing — RLS integration: dual-client (ownerA/ownerB) authenticated against prod" and project memory `github-secrets.md`, the dual-owner credentials live exclusively in GitHub repo secrets (`E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`, `E2E_OWNER_B_EMAIL`, `E2E_OWNER_B_PASSWORD`). The `rls-security-tests.yml` workflow injects them on every PR (per CLAUDE.md "CI Pipeline: PRs — rls-security fail hard if required secrets are missing").

`globalSetup` in `tests/integration/setup/global-auth-setup.ts:77` throws hard when those vars are missing — there is no graceful skip path for the canonical RLS suite. The test file IS picked up by the existing project `include: tests/integration/**/*.test.ts` glob (no new vitest config needed); the contract assertions are validated by typecheck + lint + the structural grep checks above; the live three-test run will execute on the PR via `rls-security-tests.yml`.

Mitigation: every quality dimension of the test that's verifiable offline (structure, naming, assertion phrasing, no `as unknown as`, no `.skip`, lint, typecheck, regex shapes) is verified. The PR CI gate will provide the final 3/3-pass verification when this work is opened.

## Next Phase Readiness

For **Plan 04-02** (chart visual half):
- Consumer reads `useDashboardCharts().timeSeries.monthlyRevenue6mo` — array of `{ month: string; value: number }`, guaranteed-defined (server emits exactly 6, mapper defaults to `[]` on miss).
- `MonthlyRevenuePoint` is importable from `#types/analytics`.
- The selector seam at `use-dashboard-hooks.ts` reads `DashboardChartsData.timeSeries.monthlyRevenue6mo`; the page composition reads `OwnerDashboardData.timeSeries.monthlyRevenue6mo`. Both shapes match.

For **Plan 04-03** (donut chart):
- `Label` mock landed in Plan 04-01a; no Phase 4 follow-up needed for recharts test infrastructure.

No blockers for downstream plans. Phase 4 D-10 cap (no new query keys, no new hooks, one boundary-mapper line, one new type) honored.

---
*Phase: 04-charts*
*Plan: 01b*
*Completed: 2026-05-26*

## Self-Check: PASSED

- `src/types/analytics.ts` exists with `MonthlyRevenuePoint` export: verified by grep above.
- `src/hooks/api/use-owner-dashboard.ts` carries 3 occurrences of `monthlyRevenue6mo:` and 1 `result.time_series?.monthly_revenue_6mo ?? []`: verified by grep above.
- `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` exists with 3 `it()` blocks + 2 `/access denied/i` matches: verified by grep above.
- Commit `2998c8a68` (Task 1) present in `git log --oneline -3`: verified.
- Commit `5d53d82ed` (Task 2) present in `git log --oneline -3`: verified.
