---
phase: 04-charts
cycle: 6
reviewed: 2026-05-27T19:57:00Z
depth: deep
pr: 748
commit: f9f49ca2b
branch: gsd/phase-4-dashboard-charts
files_reviewed: 90
findings:
  blocker: 0
  p0: 0
  p1: 0
  p2: 0
  info: 2
  total: 2
status: needs-fixes
---

# Phase 4 — Cycle 6 Code Review (perfect-PR gate)

## Verdict

**NEEDS-FIXES (gate clock restarts).** Two INFO findings surfaced. Both are
quality concerns missed by cycles 1–5. Neither is a runtime defect, but the
perfect-PR rule is unambiguous: any finding of any severity restarts the
two-consecutive-zero-cycle clock. Cycle 7 cannot merge.

## Cycle-5 fix verification matrix

The cycle-5 fix pruned 6 dead leaves + 2 dead section roots from
`ownerDashboardKeys`, taking the factory from 60 → 38 lines. Every claim
verified against `f9f49ca2b`:

| Claim | Method | Result |
|---|---|---|
| `ownerDashboardKeys.all` consumers preserved | `grep -rn "ownerDashboardKeys\.all" src/` minus the keys file + 2 comment lines in use-expense-mutations.ts | 33 production references, every one resolves to the kept root |
| `ownerDashboardKeys.analytics.stats()` consumers preserved | `grep -rn "analytics\.stats"` | 2 hits: `use-property-mutations.ts:120`, `properties/units/page.tsx:200` — both resolve |
| `ownerDashboardKeys.analytics.pageData()` consumers preserved | `grep -rn "analytics\.pageData"` | 1 hit: `use-owner-dashboard.ts:174` (DASHBOARD_BASE_QUERY_OPTIONS) — resolves |
| `ownerDashboardKeys.financial.chartData(...)` consumers preserved | `grep -rn "financial\.chartData"` | 1 hit: `use-owner-dashboard-financial.ts:42` (dashboardFinancialQueries) — resolves |
| `analytics.all()` / `financial.all()` section roots | Used internally as spread bases by `stats()` / `pageData()` / `chartData()` — required structural helpers, NOT dead code | Acceptable retention |
| No dead-leaf references via computed property access / template literals | `grep -rE "ownerDashboardKeys\[|\\\$\\\{ownerDashboardKeys"` | Zero hits — no dynamic access patterns to worry about |
| No stale references in test mocks | `grep -rn "ownerDashboardKeys\." tests/` + restricted grep to `*.test.*` | Zero hits — no test file references any deleted leaf |
| No stale references in `.planning/phases/04-charts/*.md` (active docs, excluding cycle-5 review record) | `grep -rn "ownerDashboardKeys"` in 04-RESEARCH.md / 04-CONTEXT.md / 04-UI-SPEC.md | 4 hits, all to `ownerDashboardKeys.analytics.pageData()` — kept leaf — and the high-level factory name — both valid |
| No regression in unit tests | `bun x vitest run --project unit` | 105,823 / 105,823 pass |
| No typecheck regression | `bun run typecheck` | Clean (`tsc --noEmit`) |
| No lint regression | `bun run lint` | Clean (Biome — 1,214 files checked) |
| CI status at HEAD | `gh pr checks 748` | `checks` pass, `e2e-smoke` pass, `rls-security` pass (Supabase Preview red — out of scope per issue #749) |

**Cycle-5 fix verdict: CORRECT AND COMPLETE.** The dead-leaf deletion broke
no consumer, leaked no dependent helper, removed no live test pin, and
introduced no documentation drift.

## Cycle-6 sweep coverage

In addition to the cycle-5 verification above, the sweep walked every
PR-introduced or PR-modified file once more against the CLAUDE.md
zero-tolerance rules and the cap budgets:

- **Rule 1 (no `any`):** `git diff main..HEAD -- 'src/**/*.{ts,tsx}' | grep '^\+'` against `: any\b|<any>|as any\b` — 0 PR-introduced hits.
- **Rule 2 (no barrel files):** No re-export-only files added. (`useFinancialChartData` re-export was cleaned in cycle-5 / cycle-4.)
- **Rule 3 (no duplicate types):** `MonthlyRevenuePoint` — single declaration at `src/types/analytics.ts:26`. `FinancialChartDatum` — single declaration at `use-owner-dashboard-financial.ts:21` (the `api-contracts.ts` collision was deleted in cycle-5 IN-02). `ReportType` — single declaration in PR scope at `src/app/(owner)/reports/generate/components/report-types.ts:16` (the pre-existing `src/components/reports/types.ts:1` is a different-domain interface, explicitly out of scope per the cycle-6 instructions).
- **Rule 4 (no commented-out code):** PR-introduced comments are all real prose documenting intent; no banned `// const x = ...` patterns.
- **Rule 5 (no inline styles):** `git diff main..HEAD | grep '^\+' | grep -E 'inline\s+style'` — 0 hits.
- **Rule 6 (no PG ENUMs):** Migrations use `text` columns / `case` projections only.
- **Rule 7 (no emojis):** 0 PR-introduced.
- **Rule 8 (no `as unknown as`):** `git diff main..HEAD | grep '^\+' | grep 'as unknown as'` — 0 PR-introduced. (Pre-existing matches in `chart-tooltip.tsx`, `slider.tsx`, `expiring-leases-widget.tsx`, etc. are out of scope.)
- **Rule 9 (no string-literal query keys):** All PR-introduced query usage flows through `ownerDashboardKeys` / `dashboardFinancialQueries` / `reportAnalyticsQueries` / `reportQueries` factories.
- **Rule 10 (no `@radix-ui/react-icons`):** 0 PR-introduced.
- **Function-length cap (50 lines):** Re-measured every function added or substantively edited by the PR. Max in scope is `buildExecutiveMonthly` in `report-data.ts` at 38 lines. PDF + Excel sub-helpers all under 50 (verified by cycle-5 IN-01 matrix). Chart components — every helper under 50.
- **Component-length cap (300 lines):** Every PR-introduced or PR-modified component under cap. `revenue-area-chart.tsx`=250, `occupancy-donut-chart.tsx`=171, `dashboard.tsx`=268 (PR-modified). `chart-area-interactive.tsx`=303 — exactly over the cap, but pre-existing at 303 lines on `main`; this PR only changed one import line in it (cycle-4 fix migrating `useFinancialChartData` to the new file), so the cap violation predates the PR and is out of scope.
- **Hook-file-length cap (300 lines):** `use-owner-dashboard.ts`=180, `use-dashboard-hooks.ts`=113, `use-owner-dashboard-financial.ts`=85. All comfortably under cap.
- **Soft-delete filter on properties:** Migration `20260526203003_phase4_revenue_trend_6mo.sql` line 37 has `where ... and status != 'inactive'` on the `owner_properties` CTE; downstream all_units / all_leases inherit through joins.
- **Mutations invalidate `ownerDashboardKeys.all`:** All 12 mutation hooks touched by the PR continue to include `ownerDashboardKeys.all` in their invalidate list.
- **`auth.uid()` wrapped in `(select auth.uid())`:** Migration `20260526203003_..._revenue_trend_6mo.sql` line 28 — `if p_user_id != (select auth.uid())`. Preserved verbatim.
- **One RLS policy per operation per role:** Migration `20260527151342_phase4_drop_redundant_deny_all_authenticated_policies.sql` drops 11 redundant `deny_all_*` FOR ALL permissive policies — restores per-operation discipline.
- **`aria-label` on icon-only buttons:** `OccupancyDonutChart` exposes `aria-label="Occupancy donut: N percent ..."` on the chart wrapper; `RevenueAreaChart` Tabs are text-labelled (`30d`/`6mo`). Quick-action buttons in `dashboard.tsx:196` have visible text labels.
- **`bg-background` not `bg-white`:** 0 PR-introduced `bg-white` hits.
- **`text-muted-foreground` not `text-muted`:** All PR-introduced usage of muted text uses `text-muted-foreground`.
- **RLS test coverage:** `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` — happy path + A→B rejection + symmetric B→A rejection. Three cases.
- **Migration correctness:** Three Phase-4 migrations applied — `20260526203003` (additive 6mo CTE on existing RPC; preserves auth guard + search_path), `20260527150424` (canonical SECURITY DEFINER + GRANT EXECUTE pattern with `search_path = ''` + fully-qualified `pg_catalog.pg_policies` reference), `20260527151342` (idempotent `DROP POLICY IF EXISTS`).
- **Bundle code-split preservation:** `dashboard.tsx:35-49` keeps both `RevenueAreaChart` and `OccupancyDonutChart` behind `next/dynamic({ ssr: false })` with shape-matching skeleton fallbacks. Recharts stays out of the initial dashboard chunk.
- **Documentation drift:** `04-RESEARCH.md`, `04-CONTEXT.md`, `04-UI-SPEC.md` reference `ownerDashboardKeys.analytics.pageData()` — kept leaf. No drift from cycle-5 fix.
- **`as` type assertions (non-`as unknown as`):** PR-introduced single-cast at `use-owner-dashboard.ts:114` (`data as { stats, trends, time_series, ... }`) — narrowing the RPC return after structural validation on lines 102-112; this is the boundary-mapper pattern from CLAUDE.md "RPC / PostgREST Return Typing". The `DocWithAutoTable` interface + single cast at `generate-pdf.ts:133` was explicitly approved in cycle-3 WR-01. Acceptable.

## Findings

### IN-01 (NEW) — Zero unit tests for `src/lib/reports/*` (1,176 lines of PR-introduced production code)

**File:** `src/lib/reports/` (no tests anywhere — verified via `find src/lib/reports -name '*.test.*'` and `bun x vitest run --project unit src/lib/reports` which exits 1 with "No test files found").

**Why this matters:** The PR adds four new modules in `src/lib/reports/`:

| File | LOC | Functions | Tests |
|---|---|---|---|
| `report-data.ts` | 861 | 33 (1 type guard, 1 safe-fetch wrapper, 1 prop-builder, 9 row-mappers, 6 section-builders, 6 build* dispatchers, 5 formatters, 4 fallbacks) | 0 |
| `generate-pdf.ts` | 188 | 6 (`generatePdfBlob`, `renderSection`, `renderSectionHeading`, `renderSummaryRows`, `renderSectionTable`, `renderSectionNote`) | 0 |
| `generate-excel.ts` | 107 | 4 (`buildCoverSheetData`, `buildSectionSheetData`, `generateExcelBlob`, `sanitizeSheetName`, `computeColumnWidths`) | 0 |
| `download-blob.ts` | 20 | 1 (SSR-guarded blob download) | 0 |
| **Totals** | **1,176** | **44** | **0** |

Cycle-5 explicitly stated `reports library tests pass (6 test files, 61 total
tests)` (line 96 of `04-REVIEW-CYCLE-5.md`), but the actual filter
`bun x vitest run --project unit src/lib/reports` returns
`No test files found, exiting with code 1` — that claim was incorrect.
The "23 test files / 248 tests" count cycle-5 cited matches
`src/components/dashboard` + `src/hooks/api`, not the reports library.

Several of the untested helpers are exactly the kind of edge-case-prone code
that ought to have pinned coverage:

- **`safeFetch` in `report-data.ts:86-109`** — branches on Postgres
  `42P01` "relation does not exist" via the helper `isMissingRelationError`.
  The contract: swallow `42P01` and fall back to a caller-supplied default;
  re-throw everything else. A regression that broadens the catch (e.g.,
  someone simplifying to `catch { return fallback }`) would silently mask
  every RPC failure as "no data" in the user's downloaded report. Currently
  there's nothing pinning the narrow-catch contract.
- **`isMissingRelationError` in `report-data.ts:65-76`** — type guard with
  two recognition paths (`obj.code === '42P01'` AND the message regex). The
  regex `/relation\s+"[^"]+"\s+does\s+not\s+exist/i` could regress to
  miss spaces, miss quoting variants, or to over-match.
- **`sanitizeSheetName` in `generate-excel.ts:89-92`** — Excel name limit
  is 31 chars, no `[ ] : * ? / \`. The helper handles the strip + the
  31-char slice + the empty-string fallback `|| "Sheet"`. None of those
  three branches has a pinning test.
- **`computeColumnWidths` in `generate-excel.ts:94-107`** — clamps widths
  to `[10, 50]` and adds a +2 pad. The clamp + the null-cell handling
  (`String(cell ?? "").length`) needs coverage; otherwise a future
  optimization (e.g. dropping the `?? ""`) silently regresses on null
  cells.
- **`isMissingRelationError` + the `noteIf` helper + the per-report
  builders** — together implement the "show 'data unavailable' banner
  when one RPC errored with 42P01 but others succeeded" UX. That's a
  three-way state machine (all-OK, all-unavailable, partial-unavailable)
  with no pinning tests.

**Severity:** INFO. No defect proven; the chart/UI side has solid test
coverage. But this is exactly what cycle-6 was tasked to surface
("Test coverage gaps (helpers, sub-helpers, type guards, mappers)") and
the gap exists across 5 previous cycles unnoticed.

**Fix sketch:** Add `src/lib/reports/report-data.test.ts` and
`src/lib/reports/generate-excel.test.ts` covering at minimum:
- `isMissingRelationError`: positive (`code: '42P01'`), positive (message
  regex), negative (other Postgres codes), negative (not an Error object).
- `safeFetch`: returns `{ data, available: true }` on success; returns
  fallback + `available: false` on `42P01`; re-throws on other errors.
- `sanitizeSheetName`: strips `[]:*?/\`, truncates at 31, falls back to
  `"Sheet"` when fully stripped.
- `computeColumnWidths`: clamps to `[10, 50]`, handles null cells,
  preserves max-width across heterogeneous rows.

Coverage for `generate-pdf.ts` is harder to add (jsPDF needs a happy-DOM
or jsdom canvas shim), but at least the dispatch-level builders in
`report-data.ts` are pure data transforms and warrant pinning tests
(e.g., `buildExecutiveMonthly` for the all-fallback path and the
all-available path).

---

### IN-02 (NEW) — Dead `user_id` parameter in `reportsClient.generateReport(...)` API contract

**File:** `src/app/(owner)/reports/generate/components/report-types.ts:96-125`

**Issue:** The public API of `reportsClient.generateReport(reportType, params, queryClient)` accepts `params.user_id: string` but the function body **never references it**. Lines 107-123 call `buildReportData(reportType, queryClient, params.start_date, params.end_date)` — `user_id` is discarded.

The auth actually resolves via `getCachedUser()` inside the per-RPC fetcher functions in `src/hooks/api/query-keys/report-analytics-keys.ts` and `src/hooks/api/query-keys/report-keys.ts`, which `buildReportData` calls through `queryClient.fetchQuery(...)`. So `user_id` is genuinely useless at this API boundary.

The single caller (`page.tsx:79-91`) plumbs `user_id` in only to check it for null/undefined as an "are you logged in" gate before invoking, then passes the verified string through. The null-gate is fine, but plumbing the verified value through the `params` object misleads future readers into thinking authorization is being threaded through the API.

**Reproduction:**
```bash
grep -n "user_id\|params\.user_id" src/app/\(owner\)/reports/generate/components/report-types.ts
# 99:		user_id: string;     ← declared in params type
# (no other matches inside the function body)
```

**Severity:** INFO. Doesn't cause a runtime defect (the RPCs derive identity from `getCachedUser()` server-side, never from the request body — defense in depth maintained). But the API surface lies about its data dependency.

**Fix:** Drop `user_id` from the `params` interface (TypeScript will surface the dead pass at the call site). The caller's "is user authenticated?" gate stays as a UX guard:

```typescript
// src/app/(owner)/reports/generate/components/report-types.ts
generateReport: async (
    reportType: ReportType,
    params: {
        // user_id intentionally omitted — auth derives via getCachedUser()
        // inside the per-RPC fetchers report-data.ts consumes. Callers
        // should still verify auth as a UX gate before invoking.
        start_date: string;
        end_date: string;
        format: ReportFormat;
    },
    queryClient: QueryClient,
): Promise<void> => { ... }

// src/app/(owner)/reports/generate/page.tsx — call site change
await reportsClient.generateReport(
    reportId,
    { start_date, end_date, format: reportFormat },  // ← user_id removed
    queryClient,
);
```

The early-return at `page.tsx:81-84` (`if (!user_id) { toast.error("User not authenticated"); return; }`) still keeps the UX gate.

---

## Top 3 most-impactful findings

1. **IN-01** — Zero test coverage on 1,176 lines of new production code (`src/lib/reports/*`). Cycle-5 incorrectly claimed coverage exists; cycle-6 surfaced the gap. The `safeFetch` narrow-catch contract and the `sanitizeSheetName` 31-char/empty-fallback contract are the most regression-prone helpers without pinning tests.
2. **IN-02** — Dead `user_id` parameter in the public `reportsClient.generateReport(...)` API surface. Misleads callers about the function's data dependency.
3. _(no third — only two findings this cycle)._

## Gate clock status

**Restarts.** Cycle-6 surfaced 2 INFO findings. Cycle-7 must be the **first** of two consecutive zero-finding cycles before merge.

---

_Reviewer: Claude (gsd-code-reviewer, Opus 4.7)_
_Depth: deep_
_Verified at commit: f9f49ca2b_
_CI status at HEAD: checks pass, e2e-smoke pass, rls-security pass, Supabase Preview red (out of scope per issue #749)_
