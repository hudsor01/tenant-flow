---
phase: 04-charts
plan: 01b
type: execute
wave: 1
depends_on: ["04-01a"]
files_modified:
  - src/types/analytics.ts
  - src/hooks/api/use-owner-dashboard.ts
  - tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts
autonomous: true
requirements: [CHART-01]

must_haves:
  truths:
    - "src/types/analytics.ts exports a new MonthlyRevenuePoint interface shaped { month: string; value: number }"
    - "src/hooks/api/use-owner-dashboard.ts OwnerDashboardData.timeSeries gains monthlyRevenue6mo: MonthlyRevenuePoint[] with ?? [] fallback"
    - "src/hooks/api/use-owner-dashboard.ts DashboardChartsData.timeSeries gains monthlyRevenue6mo (keeps selector seam coherent)"
    - "tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts pins (1) own-owner returns array of 6 month buckets in YYYY-MM order, (2) cross-owner call rejected with /access denied/i (mirrors the SHIPPED Phase 2 contract, NOT the older empty-result contract)"
    - "bun run test:integration passes against prod with the new test included"
    - "No new query-key factories, no new useQuery call sites (D-10)"
  artifacts:
    - path: "src/types/analytics.ts"
      provides: "MonthlyRevenuePoint interface for the 6mo aggregate"
      contains: "MonthlyRevenuePoint"
    - path: "src/hooks/api/use-owner-dashboard.ts"
      provides: "Boundary mapper emits timeSeries.monthlyRevenue6mo; OwnerDashboardData + DashboardChartsData types extended"
      contains: "monthlyRevenue6mo"
    - path: "tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts"
      provides: "Dual-client RLS integration test for the 6mo series"
      contains: "monthly_revenue_6mo"
      min_lines: 100
  key_links:
    - from: "use-owner-dashboard.ts result narrowing block (line ~241)"
      to: "time_series.monthly_revenue_6mo JSONB key from RPC"
      via: "extend Record<string, TimeSeriesDataPoint[]> with optional monthly_revenue_6mo?: MonthlyRevenuePoint[]"
      pattern: "monthly_revenue_6mo"
    - from: "use-owner-dashboard.ts return statement timeSeries object"
      to: "OwnerDashboardData.timeSeries.monthlyRevenue6mo consumer"
      via: "monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? []"
      pattern: "monthlyRevenue6mo: result.time_series"
    - from: "tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts cross-owner test"
      to: "auth.uid() = p_user_id guard preserved by Phase 4 migration"
      via: "ownerA.rpc('get_dashboard_data_v2', { p_user_id: ownerBId }) → error.message matches /access denied/i"
      pattern: "toMatch(/access denied/i)"
---

<objective>
Ship the FRONTEND TYPE + TEST half of Phase 4 CHART-01, picking up where Plan 04-01a left off (migration applied, src/types/supabase.ts regenerated):

1. Frontend boundary-mapper line + new `MonthlyRevenuePoint` type. No new query keys, no new hooks (D-10).
2. Dual-client RLS integration test pinning the cross-owner rejection contract (the SHIPPED Phase 2 pattern: `expect(error?.message).toMatch(/access denied/i)`, NOT the older "empty result" contract from Phase 2's original plan).

This plan is split out from the original 04-01 because the migration copy in Plan 04-01a's Task 2 (~300 lines of SECURITY DEFINER SQL) deserved its own context window. 04-01b is the straightforward TS/test follow-on now that the migration is applied and the regenerated types are in place.

Purpose: complete the data layer for the Revenue chart's `6mo` toggle. The chart visual half lands in Plans 04-02 + 04-03.

Output:
- `src/types/analytics.ts` exports `MonthlyRevenuePoint`.
- `src/hooks/api/use-owner-dashboard.ts` emits `timeSeries.monthlyRevenue6mo` on `OwnerDashboardData` AND `DashboardChartsData`.
- New RLS test at `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts`.
- `bun run test:integration` passes against prod.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-charts/04-CONTEXT.md
@.planning/phases/04-charts/04-RESEARCH.md
@.planning/phases/04-charts/04-UI-SPEC.md
@.planning/phases/04-charts/04-VALIDATION.md
@.planning/phases/04-charts/04-01a-SUMMARY.md
@.planning/phases/02-data-layer-rpc/02-CONTEXT.md
@CLAUDE.md
@tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
@src/hooks/api/use-owner-dashboard.ts
@src/types/analytics.ts

<interfaces>
From src/types/analytics.ts (CURRENT lines 15-19):
```typescript
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}
```

ADD: a new interface AFTER `TimeSeriesDataPoint` (do NOT modify `TimeSeriesDataPoint`):
```typescript
export interface MonthlyRevenuePoint {
  month: string;   // "YYYY-MM"
  value: number;   // dollars
}
```

From src/hooks/api/use-owner-dashboard.ts (CURRENT lines 167-192):
```typescript
export interface DashboardChartsData {
  timeSeries: {
    occupancyRate: TimeSeriesDataPoint[];
    monthlyRevenue: TimeSeriesDataPoint[];
  };
}

export type OwnerDashboardData = {
  stats: DashboardStats;
  activity: ActivityItem[];
  metricTrends: { ... };
  timeSeries: {
    occupancyRate: TimeSeriesDataPoint[];
    monthlyRevenue: TimeSeriesDataPoint[];
  };
  propertyPerformance: PropertyPerformance[];
};
```

ADD `monthlyRevenue6mo: MonthlyRevenuePoint[]` to BOTH `DashboardChartsData.timeSeries` and `OwnerDashboardData.timeSeries` (Phase 4 D-10 — the selector seam at `use-dashboard-hooks.ts:13-57` reads from `DashboardChartsData.timeSeries` and the rest of the dashboard reads from `OwnerDashboardData.timeSeries`; both need the field or the type narrowing will drift).

From src/hooks/api/use-owner-dashboard.ts result narrowing (CURRENT line ~241):
```typescript
const result = data as {
  stats: DashboardStats;
  trends: Record<string, MetricTrend>;
  time_series: Record<string, TimeSeriesDataPoint[]>;
  property_performance: PropertyPerformanceRpcResponse[];
  activities: ActivityItem[];
};
```

EXTEND the `time_series` shape to allow the new key:
```typescript
time_series: Record<string, TimeSeriesDataPoint[]> & {
  monthly_revenue_6mo?: MonthlyRevenuePoint[];
};
```

In the return statement's `timeSeries` object (CURRENT lines ~282-294), ADD ONE LINE:
```typescript
timeSeries: {
  occupancyRate: result.time_series?.occupancy_rate ?? [],
  monthlyRevenue: result.time_series?.monthly_revenue ?? [],
  monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? [],   // NEW
},
```

From tests/integration/rls/dashboard-rpc-open-maintenance.test.ts (CANONICAL pattern — 242 lines).
Key elements to mirror in the new revenue-6mo test:
  - `import type { SupabaseClient } from "@supabase/supabase-js";`
  - `import { createTestClient, getTestCredentials } from "../setup/supabase-client";`
  - `beforeAll` signs in both clients, captures `ownerAId` + `ownerBId` via `auth.getUser()`.
  - Cross-owner assertion (verified pattern at line 240): `expect(error?.message).toMatch(/access denied/i);`.
  - This file does NOT need fresh property/unit/tenant/maintenance fixtures — the 6mo revenue series exists whenever ownerA has ANY active leases. Skip-or-assert: if `ownerA` happens to have zero leases in prod, the test still asserts the array shape (length === 6, each entry { month: matches /^\d{4}-\d{2}$/, value: number ≥ 0 }). RESEARCH.md Open Question Q5 recommendation: assert shape only, NOT specific dollar values.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add MonthlyRevenuePoint type + extend boundary mapper to emit monthlyRevenue6mo</name>
  <files>src/types/analytics.ts, src/hooks/api/use-owner-dashboard.ts</files>
  <read_first>
    - src/types/analytics.ts (CURRENT lines 1-30 — `TimeSeriesDataPoint` shape and the export style of adjacent interfaces; identify the insertion point right after `TimeSeriesDataPoint`)
    - src/hooks/api/use-owner-dashboard.ts (CURRENT lines 167-192 for `DashboardChartsData` + `OwnerDashboardData` shapes; lines 218-294 for the fetcher + result narrowing + return statement)
    - .planning/phases/04-charts/04-CONTEXT.md (D-01 — boundary-mapper line; D-10 — no new hooks, no new query keys)
    - .planning/phases/04-charts/04-RESEARCH.md (§ Code Examples — `Adding the new field to the boundary mapper`; § Don't Hand-Roll — `as unknown as` is banned; use intersection type narrowing)
    - CLAUDE.md (§ RPC / PostgREST Return Typing — typed mapper at every boundary; no `as unknown as`; § Zero Tolerance Rules — no `any`, no duplicate types, no string-literal query keys)
  </read_first>
  <behavior>
    - Test 1: `MonthlyRevenuePoint` is exported from `src/types/analytics.ts` with shape `{ month: string; value: number }` (verifiable by an import + type-only check).
    - Test 2: `OwnerDashboardData.timeSeries.monthlyRevenue6mo` is typed `MonthlyRevenuePoint[]` (not optional, not `unknown`).
    - Test 3: `DashboardChartsData.timeSeries.monthlyRevenue6mo` is typed `MonthlyRevenuePoint[]`.
    - Test 4: When the RPC response's `time_series.monthly_revenue_6mo` is absent (e.g., a hypothetical legacy server that hasn't been migrated yet), the boundary mapper emits `monthlyRevenue6mo: []` (defensive `?? []`).
    - Test 5: When the RPC response carries `time_series.monthly_revenue_6mo: [{ month: "2026-05", value: 12345.67 }, ...]`, the mapper passes the array through verbatim (no per-element rebuild — the JSONB shape already matches `MonthlyRevenuePoint`).
    - Test 6: No new `useQuery` call sites added (`grep -c "useQuery" src/hooks/api/use-owner-dashboard.ts` count unchanged from before the edit).
  </behavior>
  <action>
    Two file edits:

    **A. `src/types/analytics.ts`** — add `MonthlyRevenuePoint` AFTER `TimeSeriesDataPoint` (which is currently at lines 15-19). The new interface:
    ```typescript
    // 6-month aggregate revenue point — emitted by ts_revenue_6mo CTE in
    // supabase/migrations/{PROD_TIMESTAMP}_phase4_revenue_trend_6mo.sql.
    // `month` is "YYYY-MM" (first day of month); `value` is sum in dollars.
    export interface MonthlyRevenuePoint {
      month: string;   // "YYYY-MM"
      value: number;   // dollars
    }
    ```
    Do NOT modify `TimeSeriesDataPoint` — the 30d series keeps `{ date, value, label? }`. The new type is intentionally different: 6mo is monthly buckets keyed by `month`, 30d is daily points keyed by `date`. Two distinct shapes via two distinct types — no overload of one type.

    **B. `src/hooks/api/use-owner-dashboard.ts`** — three additive edits:

    1. Add `import type { ..., MonthlyRevenuePoint } from "#types/analytics"` (extend the existing analytics imports; do NOT create a new import group). Verify the existing import statement's punctuation, then append `, MonthlyRevenuePoint` to the existing type-import list.

    2. Extend BOTH `DashboardChartsData` (currently lines 167-172) AND `OwnerDashboardData.timeSeries` (currently lines 187-190). For each, add one new field:
       ```
       monthlyRevenue6mo: MonthlyRevenuePoint[];
       ```
       Both interfaces' `timeSeries` blocks now have THREE keys: `occupancyRate`, `monthlyRevenue`, `monthlyRevenue6mo`. The selector seam at `src/hooks/api/use-dashboard-hooks.ts` reads from `DashboardChartsData.timeSeries`; the page/dashboard composition reads from `OwnerDashboardData.timeSeries`. Both consumers need the field or type narrowing drifts.

    3. Inside `fetchOwnerDashboardData` (currently around lines 217-294):
       a. Extend the `result` narrowing block at line ~241 to widen the `time_series` shape:
          ```typescript
          const result = data as {
            stats: DashboardStats;
            trends: Record<string, MetricTrend>;
            time_series: Record<string, TimeSeriesDataPoint[]> & {
              monthly_revenue_6mo?: MonthlyRevenuePoint[];
            };
            property_performance: PropertyPerformanceRpcResponse[];
            activities: ActivityItem[];
          };
          ```
          The intersection type allows the new heterogeneous key without disturbing the existing `Record` for the daily/percentage series. This is the project-idiomatic narrowing per the `mapDocumentRow` precedent (CLAUDE.md § RPC / PostgREST Return Typing). NEVER `as unknown as`.

       b. In the return statement (currently around lines 280-294), add exactly ONE line to the `timeSeries` object literal:
          ```typescript
          monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? [],
          ```
          Place it after the existing `monthlyRevenue:` line. The `?? []` provides defensive zero-array fallback for the unmigrated-server edge case (matches the established pattern at line ~278 for `open_maintenance`).

    No new `useQuery` calls. No new query-key factories. No new hooks. D-10 cap: ONE new boundary-mapper line + the type extensions.

    File-size discipline: this task touches two files for a total of ~10 added lines. If you find yourself adding more, stop and re-read CONTEXT.md D-10.
  </action>
  <verify>
    <automated>grep -c "MonthlyRevenuePoint" src/types/analytics.ts src/hooks/api/use-owner-dashboard.ts | awk -F: '{ s += $2 } END { print s }'</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "export interface MonthlyRevenuePoint" src/types/analytics.ts` returns exactly 1.
    - `grep -c "MonthlyRevenuePoint\[\]" src/hooks/api/use-owner-dashboard.ts` returns at least 2 (one in `DashboardChartsData.timeSeries`, one in `OwnerDashboardData.timeSeries`).
    - `grep -c "monthlyRevenue6mo:" src/hooks/api/use-owner-dashboard.ts` returns at least 3 (the two type fields + the return-statement value).
    - `grep -c "result.time_series?.monthly_revenue_6mo ?? \[\]" src/hooks/api/use-owner-dashboard.ts` returns exactly 1.
    - No new `useQuery` introduced: `grep -c "useQuery" src/hooks/api/use-owner-dashboard.ts` matches the pre-edit count.
    - No `as unknown as` introduced: `grep -c "as unknown as" src/hooks/api/use-owner-dashboard.ts` is unchanged from before this task (or zero if it was already zero).
    - No `any` introduced: `grep -E ":\s*any[^a-z]|<any>" src/hooks/api/use-owner-dashboard.ts src/types/analytics.ts` returns zero matches.
    - `bun run typecheck` exits 0.
    - `bun run lint src/types/analytics.ts src/hooks/api/use-owner-dashboard.ts` exits 0.
    - `bun run test:unit -- --run src/hooks/api` passes any existing tests for the boundary mapper.
  </acceptance_criteria>
  <done>`MonthlyRevenuePoint` exported; both type blocks extended; one boundary-mapper line added; no new hooks, no new query keys, no `as unknown as`; typecheck + lint + existing unit tests green.</done>
</task>

<task type="auto">
  <name>Task 2: Write dual-client RLS integration test for monthly_revenue_6mo</name>
  <files>tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts</files>
  <read_first>
    - tests/integration/rls/dashboard-rpc-open-maintenance.test.ts (CANONICAL pattern — 242 lines; lines 28-100 for `beforeAll` client/credentials setup; lines 217-241 for the cross-owner rejection assertion `expect(error?.message).toMatch(/access denied/i)`; this is the SHIPPED contract, NOT the older empty-result contract that pre-cycle-10 Phase 2 plans documented)
    - tests/integration/setup/supabase-client.ts (the `createTestClient` + `getTestCredentials` harness)
    - .planning/phases/04-charts/04-CONTEXT.md (D-15 — synthetic test owners `'active'` not `'trialing'`; D-01 — RLS test mirrors Phase 2 D-04 pattern)
    - .planning/phases/04-charts/04-RESEARCH.md (§ Pitfall 1 — the SHIPPED Phase 2 test pattern, not the older 02-03-PLAN.md contract; § Open Question Q5 — assert shape only, not specific dollar values)
    - CLAUDE.md (§ Testing — `.rejects.toMatchObject` instead of `.rejects.toThrow`; chai 6 bug; integration tests hit prod; sequential; rate limit ~45 sign-ins/min — don't loop)
  </read_first>
  <action>
    Create a new file `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts`. Mirror the structure of `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` (the SHIPPED canonical pattern). The file MUST:

    1. **Header comment** (~15 lines) explaining: this pins Phase 4 CHART-01 / D-01 contract — (a) own-owner returns a 6-month array, (b) cross-owner rejected with the cycle-10 auth guard. Reference the Phase 2 cycle-10 message-align migration and note that the contract is `'access denied'`, not the older empty-result.

    2. **Imports** (mirror lines 25-27 of the open-maintenance test):
       - `import type { SupabaseClient } from "@supabase/supabase-js";`
       - `import { createTestClient, getTestCredentials } from "../setup/supabase-client";`
       - No fixture imports — this test does not create/destroy properties or leases. The 6mo series materializes against whatever leases owner A already has in prod.

    3. **`describe`** named `"get_dashboard_data_v2 — monthly_revenue_6mo (Phase 4 CHART-01) RLS isolation"`.

    4. **`beforeAll`** (mirror lines 40-55 of the open-maintenance test): sign in both clients via `getTestCredentials() + createTestClient`, capture `ownerAId` + `ownerBId` via `client.auth.getUser()`. Do NOT create test fixtures.

    5. **NO `afterAll`** — no fixtures to clean up.

    6. **Test 1 — own-owner happy path**:
       - Call `clientA.rpc("get_dashboard_data_v2", { p_user_id: ownerAId })`.
       - Assert `error` is null.
       - Narrow `data` to `{ time_series: { monthly_revenue_6mo: Array<{ month: string; value: number }> } }` via a typed intermediate (no `as unknown as`). The simplest correct narrowing: `const payload = data as { time_series?: { monthly_revenue_6mo?: Array<{ month: string; value: number }> } };`
       - Assert `payload.time_series?.monthly_revenue_6mo` is defined and is an array.
       - Assert `monthly_revenue_6mo.length === 6` (server always emits 6 buckets for the last 6 calendar months).
       - Assert every entry shape: `expect(entry.month).toMatch(/^\d{4}-\d{2}$/)` AND `expect(typeof entry.value).toBe("number")` AND `expect(entry.value).toBeGreaterThanOrEqual(0)`.
       - Assert the buckets are sorted ascending by `month`: write a small loop comparing consecutive `month` strings via lexicographic compare (works because the format is `YYYY-MM`).
       - Do NOT assert specific dollar values (RESEARCH.md Q5 — shape only; fixturing real revenue numbers is fragile).

    7. **Test 2 — cross-owner rejection**:
       - Call `clientA.rpc("get_dashboard_data_v2", { p_user_id: ownerBId })`.
       - Assert `data` is `null`.
       - Assert `error` is not `null`.
       - Assert `error?.message` matches `/access denied/i` (SHIPPED contract from Phase 2 cycle-10 message align; RESEARCH.md Pitfall 1 — do NOT use the older empty-array assertion).
       - Sanity assertion: `error?.message` includes the substring `cannot request data for another user` (the full cycle-10 message). This is defense-in-depth — if a future cycle re-words the error to a different "access denied" phrasing, the test still passes on the regex but flags via the second assertion that something semantic changed.

    8. **Test 3 — symmetric cross-owner rejection**:
       - Call `clientB.rpc("get_dashboard_data_v2", { p_user_id: ownerAId })`.
       - Assert same rejection pattern as Test 2. Symmetric coverage — proves the guard isn't accidentally one-directional.

    9. **No `vi.skip` / `it.skip`** — never permanently skipped tests (CLAUDE.md § Testing).

    Min file length: ~100 lines (header + imports + describe scaffolding + 3 tests + assertions; matches Phase 2's pattern at 242 lines but Phase 4 has no fixtures so the file is naturally shorter).

    Style: `.rejects.toMatchObject({ message: expect.stringContaining("...") })` if any `.rejects` chain is needed (chai 6 bug — never `.rejects.toThrow("string")`). For non-rejecting assertions use `expect(...).toMatch(/regex/i)`.
  </action>
  <verify>
    <automated>grep -c "monthly_revenue_6mo\|toMatch(/access denied/i)" tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts 2>/dev/null</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts`.
    - File has ≥ 100 non-comment lines (`grep -cv '^\s*\(//\|\*\|$\)' {file}` returns ≥ 100; loose floor — Phase 2's open-maintenance test is 242 lines as the canonical reference).
    - File has exactly 3 `it(` blocks: own-owner happy, cross-owner A→B rejection, cross-owner B→A rejection.
    - `grep -c "toMatch(/access denied/i)" {file}` returns at least 2 (one per cross-owner test).
    - `grep -c "monthly_revenue_6mo" {file}` returns at least 3 (type narrowing + length assertion + bucket-iteration assertion).
    - `grep -c "length === 6\|\\.length).toBe(6)" {file}` returns at least 1.
    - `grep -c "toMatch(/^\\\\d{4}-\\\\d{2}\\$/)\|/\\^\\\\d{4}-\\\\d{2}\\$/" {file}` returns at least 1 (the YYYY-MM bucket-key shape assertion).
    - No `as unknown as`: `grep -c "as unknown as" {file}` returns 0.
    - No `any`: `grep -E ":\s*any[^a-z]|<any>" {file}` returns 0.
    - No `.skip`: `grep -E "(it|describe|test)\.skip" {file}` returns 0.
    - `bun run test:integration -- --run tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` exits 0 against prod with all 3 tests passing.
    - Subsequent integration runs respect the ~45 sign-ins/min rate limit (RESEARCH.md A9 + CLAUDE.md § Testing) — if the local test run was within 60s of a prior `bun run test:integration`, executor adds a cooldown before re-running.
  </acceptance_criteria>
  <done>RLS test file written; 3 tests pass against prod; cross-owner rejection asserts the SHIPPED `/access denied/i` pattern; bucket shape pinned; no fragile dollar-value assertions.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Authenticated client → PostgREST RPC | Caller passes `p_user_id` parameter; server-side guard (enforced by Plan 04-01a's migration) rejects cross-owner calls. |
| RPC response → boundary mapper | `time_series.monthly_revenue_6mo` JSONB is narrowed via intersection type; never `as unknown as`. |
| Frontend type extension | `MonthlyRevenuePoint` is a new exported interface — must be the single source of truth (no duplicate in `src/types/`). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01b-RLS | Information Disclosure | Cross-owner RPC contract | mitigate | Task 2 RLS test pins symmetric (A→B AND B→A) rejection via `expect(error?.message).toMatch(/access denied/i)` — proves Plan 04-01a's migration preserved the cycle-10 guard. |
| T-04-07 | Information Disclosure | Boundary-mapper return shape leaking unmigrated-server data | mitigate | `monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? []` defensively coalesces to `[]`. If a future server temporarily drops the key (rollback scenario), the frontend gracefully degrades — no exception, no leak of undefined-typed data. Matches the established pattern at line ~278 for `open_maintenance`. |
| T-04-08-TYPE | Tampering | Loose type narrowing introducing `any` / `as unknown as` | mitigate | The intersection-type narrowing pattern (`Record<string, TimeSeriesDataPoint[]> & { monthly_revenue_6mo?: MonthlyRevenuePoint[] }`) is the project-idiomatic mapper boundary (CLAUDE.md § RPC / PostgREST Return Typing). Acceptance criteria pins `grep -c "as unknown as"` returns 0. |
| T-04-SC | Tampering | Supply chain — package installs | accept | This plan installs NO new packages. RESEARCH.md Package Legitimacy Audit not required (no `*install*` step in the plan). |

</threat_model>

<verification>
- `src/types/analytics.ts` exports `MonthlyRevenuePoint`.
- `src/hooks/api/use-owner-dashboard.ts` emits `timeSeries.monthlyRevenue6mo` on both `DashboardChartsData` and `OwnerDashboardData`; no new `useQuery` call sites; no `as unknown as`.
- `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` exists with 3 passing tests against prod.
- `bun run test:integration -- --run tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` exits 0.
- `bun run typecheck` exits 0. `bun run lint` exits 0 over modified files. `bun run test:unit` does not regress.
- No new packages installed: `git diff package.json bun.lock` returns nothing.
</verification>

<success_criteria>
- ROADMAP § Phase 4 success criterion #1 frontend-data half: `monthlyRevenue6mo` reaches the boundary mapper as `MonthlyRevenuePoint[]`. (Plan 04-01a delivered the database half; the chart visual half lands in Plans 04-02 + 04-03.)
- CHART-01 frontend-data half: the 6mo toggle's data flows from RPC → boundary mapper → typed prop interface; ready for Plan 04-02 to consume.
- Phase 4 D-10 fulfilled: zero new query-key factories; zero new `useQuery` call sites; one new boundary-mapper line; one new type.
- Phase 4 D-15 fulfilled: RLS test uses synthetic owner credentials (`e2e-owner-a@tenantflow.app` + `e2e-owner-b@tenantflow.app` at `subscription_status = 'active'`).
- Zero-Tolerance compliance: no `any`, no `as unknown as`, no barrel files, no duplicate types, no commented-out code, no new query keys created, no string-literal query keys.
</success_criteria>

<output>
Create `.planning/phases/04-charts/04-01b-SUMMARY.md` when done. Record:
- `git diff --stat src/types/analytics.ts src/hooks/api/use-owner-dashboard.ts` (line counts of frontend type edits).
- Output of `bun run test:integration -- --run tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` showing 3/3 passing tests.
- Confirmation that `bun run typecheck` + `bun run lint` exit 0.
- Note for Plan 04-02: confirms the boundary mapper emits `monthlyRevenue6mo` and the type is exported from `#types/analytics`.
</output>
</content>
</invoke>