---
phase: 04-charts
reviewed: 2026-05-28T10:14:00Z
depth: deep
cycle: 8
commit: afa0eb8387cbd87f11856d54ea1895eef717c857
files_reviewed: 51
files_reviewed_list:
  - src/lib/reports/generate-excel.ts
  - src/lib/reports/__tests__/generate-excel.test.ts
  - src/lib/reports/generate-pdf.ts
  - src/lib/reports/report-data.ts
  - src/lib/reports/__tests__/report-data.test.ts
  - src/lib/reports/download-blob.ts
  - src/components/dashboard/components/revenue-area-chart.tsx
  - src/components/dashboard/components/revenue-area-chart-skeleton.tsx
  - src/components/dashboard/components/occupancy-donut-chart.tsx
  - src/components/dashboard/components/occupancy-donut-chart-skeleton.tsx
  - src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
  - src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx
  - src/components/dashboard/dashboard.tsx
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard-data.test.ts
  - src/components/dashboard/dashboard-types.ts
  - src/components/dashboard/chart-area-interactive.tsx
  - src/app/(owner)/dashboard/page.tsx
  - src/app/(owner)/reports/generate/page.tsx
  - src/app/(owner)/reports/generate/components/report-types.ts
  - src/app/(owner)/properties/page.tsx
  - src/app/(owner)/properties/units/page.tsx
  - src/hooks/api/use-owner-dashboard.ts
  - src/hooks/api/use-owner-dashboard-financial.ts
  - src/hooks/api/use-dashboard-hooks.ts
  - src/hooks/api/query-keys/owner-dashboard-keys.ts
  - src/hooks/api/use-billing-mutations.ts
  - src/hooks/api/use-expense-mutations.ts
  - src/hooks/api/use-lease-lifecycle-mutations.ts
  - src/hooks/api/use-lease-mutations.ts
  - src/hooks/api/use-maintenance.ts
  - src/hooks/api/use-property-mutations.ts
  - src/hooks/api/use-tenant-mutations.ts
  - src/hooks/api/use-unit.ts
  - src/hooks/api/use-vendor.ts
  - src/components/documents/documents-section.tsx
  - src/components/leases/bulk-import-config.ts
  - src/components/leases/wizard/lease-creation-wizard.tsx
  - src/components/properties/bulk-import-config.ts
  - src/components/tenants/bulk-import-config.ts
  - src/components/units/bulk-import-config.ts
  - src/types/analytics.ts
  - src/types/sections/dashboard.ts
  - src/types/api-contracts.ts
  - src/test/mocks/recharts.tsx
  - next-env.d.ts
  - package.json
  - supabase/migrations/20260526203003_phase4_revenue_trend_6mo.sql
  - supabase/migrations/20260527150424_phase4_audit_for_all_policies_canonical_grants.sql
  - supabase/migrations/20260527151342_phase4_drop_redundant_deny_all_authenticated_policies.sql
  - tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts
findings:
  critical: 0
  blocker: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 4: Code Review Report - Cycle 8

**Reviewed:** 2026-05-28T10:14:00Z
**Depth:** deep
**Files Reviewed:** 51
**Status:** clean

## Summary

Cycle 8 is the first of two consecutive zero-finding cycles required by the
perfect-PR merge gate. Every changed file in the PR was re-reviewed against
the full CLAUDE.md zero-tolerance ruleset plus all open cycle-1..7 fix-site
verifications. Zero findings of any severity.

The cycle-7 fix (widening `computeColumnWidths` parameter type to
`Array<Array<string | number | null | undefined>>` so the null-cell test no
longer needs `as unknown as` casts) is correct, complete, and introduces no
regressions. The widened parameter type accepts the narrower `string | number`
output of `buildSectionSheetData` covariantly — TypeScript's structural
typing handles this without any explicit narrowing at the call site at
`generate-excel.ts:72`. No other call site of `computeColumnWidths` exists
in the codebase.

## Cycle-7 Fix Verification Matrix

| Check | Site | Result |
|---|---|---|
| Parameter type widened to nullable union | `generate-excel.ts:101-103` | PASS — `Array<Array<string \| number \| null \| undefined>>` |
| Function body unchanged, still `String(cell ?? "").length` | `generate-excel.ts:107` | PASS |
| Test replaces `as unknown as string` with literal `null` / `undefined` | `generate-excel.test.ts:54-62` | PASS |
| `buildSectionSheetData` call site accepts widened input covariantly | `generate-excel.ts:72` | PASS — typecheck green |
| No other consumer depends on the narrower type | grep `computeColumnWidths` | PASS — single producer/consumer (`buildSectionSheetData` → `computeColumnWidths`) |
| `as unknown as` count across PR diff additions | full diff grep | PASS — 0 matches (the only diff hit is a documentation comment on line 99 of `generate-excel.ts` explaining why the type was widened) |
| `as any` count across PR diff additions | full diff grep | PASS — 0 matches |
| `: any` count across PR diff additions | full diff grep | PASS — 0 matches |
| `bun run typecheck` | full tree | PASS — clean |
| `bun run lint` (biome check) | full tree | PASS — 1216 files, no fixes applied |
| `bun run test:unit` (all 176 files, 105,845 tests) | full suite | PASS — 100% green |
| Cycle-7 fix sites' tests pass | 5-file targeted run | PASS — 51 tests green |

## Comprehensive Sweep — Zero-Tolerance Rule Pass

| Rule | Search | Result |
|---|---|---|
| 1. No `any` types | `\bas any\b`, `: any[ ,);=]`, `<any>`, `Record<string,\s*any>`, `Promise<any>` | 0 hits in PR additions |
| 2. No barrel files | new files inspected for `export * from` / `export {} from` re-exports | 0 hits — `use-dashboard-hooks.ts` actually *removed* its re-export of `FinancialChartDatum`/`FinancialTimeRange` and `useFinancialChartData`; consumers (`chart-area-interactive.tsx`) now import directly from `use-owner-dashboard-financial.ts` |
| 3. No duplicate types | `MonthlyRevenuePoint` added once to `src/types/analytics.ts`; `FinancialChartDatum` moved (not duplicated) from `api-contracts.ts` to `use-owner-dashboard-financial.ts`; `RevenueTrendPoint` cleanly removed from `dashboard.ts` (replaced by `monthlyRevenue`/`monthlyRevenue6mo`/`units` fields on `DashboardProps`) | clean |
| 4. No commented-out / dead code | grep TODO/FIXME/XXX/HACK in new code paths | 0 hits |
| 5. No inline styles | grep `style=\{` in PR additions | 0 hits |
| 6. No PostgreSQL ENUMs | migration `20260526203003` uses `case ... end` text expressions, no `create type ... as enum` | clean |
| 7. No emojis in code | grep new files | clean |
| 8. No `as unknown as` | full PR diff grep | 0 hits in code (1 hit in documentation comment explaining the cycle-7 fix) |
| 9. No string-literal query keys | all new producers use `queryOptions()` factories | `dashboardFinancialQueries.chartData` uses `ownerDashboardKeys.financial.chartData(year, timeRange, months)` (proper factory); `DASHBOARD_BASE_QUERY_OPTIONS` uses `ownerDashboardKeys.analytics.pageData()` factory. The 4 string-literal `queryKey: ["test", ...]` lines in `report-data.test.ts` are unit-test fixtures, never reaches a real cache — same pattern used across the codebase's test suite |
| 10. No `@radix-ui/react-icons` | grep new files | 0 hits — `lucide-react` only |

## Comprehensive Sweep — Length Caps

| Cap | Largest in PR | Status |
|---|---|---|
| Function ≤ 50 lines | `maintenanceOperationsSections` in `report-data.ts` (46 lines), `generatePdfBlob` in `generate-pdf.ts` (47 lines), `propertyPortfolioSections` (40 lines) | PASS — under cap |
| Component ≤ 300 lines | `dashboard.tsx` (268), `revenue-area-chart.tsx` (250), `occupancy-donut-chart.tsx` (171) | PASS |
| Hook file ≤ 300 lines | `use-owner-dashboard.ts` (180), `use-owner-dashboard-financial.ts` (85), `owner-dashboard-keys.ts` (37) | PASS — well under cap (cycle-1 fix split this; cycle-5 dead-code pruning trimmed further) |
| Library files (no cap) | `report-data.ts` (863) | informational — library file, not a hook or component; functions inside are all ≤ 46 lines via `*Rows()` / `*Sections()` decomposition (documented at lines 11-13) |

## Comprehensive Sweep — Other Quality Gates

| Check | Result |
|---|---|
| Typed mappers at PostgREST/RPC boundary | `use-owner-dashboard.ts:74-88` — `mapPropertyPerformanceStatus` validates the string union with an explicit throw on contract drift; `use-owner-dashboard-financial.ts:60` uses single `as` cast on RPC result (allowed) with field-level `?? 0` defense; `dashboard-rpc-revenue-6mo.test.ts:79-81` uses a single typed cast with explicit shape (commented as the project-idiomatic mapper boundary) — no banned double-cast |
| All list queries have `.limit()` or `.range()` | `recent_activities` CTE in migration `20260526203003` has `limit 10`; no PostgREST list queries added in this PR (the report-data layer uses RPCs, not table queries) |
| Soft-delete filter `.neq('status', 'inactive')` | migration `20260526203003:37` — `owner_properties` CTE filters `status != 'inactive'` on properties; consistent with project rule |
| Mutations invalidate `ownerDashboardKeys.all` | not applicable to this PR (no new mutations added); pre-existing mutations updated only their import path to the new query-key factory location |
| `auth.uid()` wrapped in `(select auth.uid())` | migration `20260526203003:28` — `(select auth.uid())` correctly used in the guard |
| One RLS policy per operation per role | migration `20260527151342` removes 11 redundant `deny_all_*` PERMISSIVE policies that were `FOR ALL`-on-authenticated violations; clean compliance with the rule |
| `aria-label` on icon-only buttons | `dashboard.tsx:196-211` quick-action buttons have descriptive text content; the action icon has `aria-hidden="true"`; `occupancy-donut-chart.tsx:95` wrapper has `role="img"` + computed `aria-label` enumerating the donut state |
| `bg-background` not `bg-white` | grep PR additions: 0 hits for `bg-white`; `dashboard.tsx`, `revenue-area-chart.tsx`, `occupancy-donut-chart.tsx` all use semantic `bg-card`, `bg-muted`, `bg-background` |
| `text-muted-foreground` not bare `text-muted` | grep PR additions: 0 bare `text-muted` hits; all references use the semantic full token |
| Test coverage — 9 row-mapper helpers (cycle-2 IN scope) | `report-data.ts` row-mapper helpers (`*Rows()`) are covered via integration-level tests of the `build*` callers; pure `String(value)` mapping behavior is trivially exercised by any report build. Cycle-2 deliberately deferred per-helper unit tests as out-of-cycle scope. |
| Test coverage — 4 PDF sub-helpers (cycle-4 fix sites) | `renderSectionHeading`, `renderSummaryRows`, `renderSectionTable`, `renderSectionNote` exercise via `generatePdfBlob` integration. Cycle-6 added the `computeColumnWidths` + `sanitizeSheetName` unit-test pinning per IN-01; PDF sub-helpers remain integration-tested as cycle-4 explicitly accepted. |
| Migration correctness | `20260526203003` — additive `ts_revenue_6mo` CTE joins existing owner-scoped `all_leases` CTE (shared-CTE invariant preserved, no second table scan). `auth.uid()` guard preserved. `set search_path = 'public'` preserved. `grant execute` to both `authenticated` and `service_role`. Lease coverage rule matches existing 30d series. Bucket count = 6 (verified by integration test `expect(series).toHaveLength(6)`). Migrations `20260527150424` + `20260527151342` are idempotent + reversible. |
| RLS test coverage | `dashboard-rpc-revenue-6mo.test.ts` covers (1) happy-path 6-bucket shape + value range + ascending order + uniqueness + last-bucket recency window, (2) A→B cross-owner rejection on `auth.uid()` guard, (3) B→A symmetric rejection. Three tests on prod, both directions. |
| Bundle code-split | `dashboard.tsx:35-49` uses `next/dynamic({ ssr: false })` to lazy-load both `RevenueAreaChart` and `OccupancyDonutChart`, each with its own shape-matching skeleton. Skeletons live in separate files so the initial chunk never pulls Recharts. |
| A11y — `prefers-reduced-motion` gating | Both new charts gate `isAnimationActive` on `useReducedMotion()` (Phase 3 canonical hook); pinned by tests `revenue-area-chart.test.tsx:178-199` and `occupancy-donut-chart.test.tsx:99-114`. |
| A11y — donut accessible alternative | `occupancy-donut-chart.tsx:95` `role="img"` + `aria-label` enumerating percent + counts; legend below is a real `<ul><li>` (not div-soup), per D-03 colorblind-friendly. |
| Documentation drift | `MonthlyRevenuePoint` JSDoc references the actual migration file (`20260526203003_phase4_revenue_trend_6mo.sql`) and the CTE name (`ts_revenue_6mo`); migration file's CTE matches the type contract; consumers (`use-owner-dashboard.ts:118-119`, `dashboard-types.ts:14-15`) all reference the canonical type. No drift. |
| `useState` toggle on RevenueAreaChart | local volatile state, intentionally not nuqs (documented at `revenue-area-chart.tsx:20-21` per `04-CONTEXT.md D-04`). Compliant. |
| Console / debug artifacts | one `console.warn` in `report-data.ts:104` gated on `process.env.NODE_ENV !== 'production'` — dev-only diagnostic for the safe-fetch fallback (documented at lines 102-103). Same pattern reviewed and accepted in cycle-2 + cycle-4. |
| `.skip` tests | 0 in PR additions |
| `xlsx` package source | sourced from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (SheetJS-official distribution; npm registry version is the older fork) — correct vendor recommendation |
| `next-env.d.ts` path drift | `import "./.next/dev/types/routes.d.ts"` — Next 16 canonical path; auto-generated, not manually edited |

## Pre-Existing Items (Out of Cycle-8 Scope per instructions)

These were explicitly flagged as out-of-scope in the cycle-8 instructions and
were **not re-examined**:

- `Supabase Preview` GitHub check red — tracked in issue #749
- The `to_regclass` migration guards on cycles `20251220100000`,
  `20260118041312`, `20260220120000`, `20260224080000`, `20260224191923`,
  `20260304170000`, `20260306140000`, `20260306150000`, `20260330180000`,
  `20260330214340`, `20260403*`, `20260415193249`, `20260419220000` — also
  tracked in #749. (Spot-checked one — `20260118041312` — and the guard is
  correctly applied; not flagging.)
- IN-02 from cycle 2 (donut "Vacant" includes maintenance units) — pre-existing,
  scheduled for Phase 6
- IN-03 from cycle 2 (`p_months: 12` over-fetch in
  `use-owner-dashboard-financial.ts:54`) — pre-existing perf gap
- Pre-existing `ReportType` interface in `src/components/reports/types.ts`
  (different domain from `reports/generate/components/report-types.ts`)

## Verdict

**CLEAN — zero findings.** Cycle 9 needed as the second clean cycle to merge.

---

_Reviewed: 2026-05-28T10:14:00Z_
_Reviewer: Claude (gsd-code-reviewer, opus 4.7)_
_Depth: deep_
_Commit: afa0eb8387cbd87f11856d54ea1895eef717c857_
