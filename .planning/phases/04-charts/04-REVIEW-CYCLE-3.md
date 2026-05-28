---
phase: 04-charts
reviewed: 2026-05-27T19:30:00Z
depth: deep
cycle: 3
files_reviewed: 25
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/app/(owner)/reports/generate/components/report-types.ts
  - src/app/(owner)/reports/generate/page.tsx
  - src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx
  - src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
  - src/components/dashboard/components/occupancy-donut-chart-skeleton.tsx
  - src/components/dashboard/components/occupancy-donut-chart.tsx
  - src/components/dashboard/components/revenue-area-chart-skeleton.tsx
  - src/components/dashboard/components/revenue-area-chart.tsx
  - src/components/dashboard/dashboard-data.test.ts
  - src/components/dashboard/dashboard-types.ts
  - src/components/dashboard/dashboard.tsx
  - src/components/ui/tabs.tsx
  - src/hooks/api/query-keys/owner-dashboard-keys.ts
  - src/hooks/api/use-dashboard-hooks.ts
  - src/hooks/api/use-owner-dashboard-financial.ts
  - src/hooks/api/use-owner-dashboard.ts
  - src/lib/reports/download-blob.ts
  - src/lib/reports/generate-excel.ts
  - src/lib/reports/generate-pdf.ts
  - src/lib/reports/report-data.ts
  - src/test/mocks/recharts.tsx
  - src/types/analytics.ts
  - src/types/sections/dashboard.ts
  - supabase/migrations/20260526203003_phase4_revenue_trend_6mo.sql
  - supabase/migrations/20260527150424_phase4_audit_for_all_policies_canonical_grants.sql
  - supabase/migrations/20260527151342_phase4_drop_redundant_deny_all_authenticated_policies.sql
  - tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts
  - package.json
  - bun.lock
  - .planning/phases/04-charts/04-UI-SPEC.md
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 4: Code Review Report (Cycle 3)

**Reviewed:** 2026-05-27T19:30:00Z
**Depth:** deep (full re-read of in-scope files + cycle-2 fix-site verification + cross-file dead-code trace)
**Files Reviewed:** 25 source + 3 migrations + 1 RLS test + package.json + bun.lock + UI-SPEC
**Status:** issues_found

## Summary

Cycle-2's six remediations all verified correct (verification matrix below).
Cycle-3 sweep surfaced **one INFO finding**: a 73-line dead export
(`ownerDashboardQueries`) that was carried forward verbatim through the
cycle-1 hook split and missed by cycle 2. This is pre-existing on `main`
(predates Phase 4) BUT the cycle-1 WR-02 fix specifically touched this file
to extract it, which made it Phase-4-owned by `git blame`. By the same
consistency rule cycle 2 applied to IN-03 (deferred as pre-existing), this
is INFO-tier and defer-acceptable for Phase 4. Flagging it here so the
fix-pass operator can make an explicit defer/fix call rather than missing
it silently.

### Cycle-2 fix verification matrix (6/6 verified correct)

| Cycle-2 finding | Verification | Status |
|-----------------|--------------|--------|
| CR-01 — xlsx CVEs | `package.json:150` + `bun.lock:57,2006` both show `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. CDN tarball replaces npm distribution. | ✓ |
| WR-01 — `as unknown as` in generate-pdf.ts | `generate-pdf.ts:14-16` declares `interface DocWithAutoTable extends jsPDF { lastAutoTable?: { finalY?: number }; }`. Line 124 uses single-cast `(doc as DocWithAutoTable).lastAutoTable`. The banned `as unknown as` tunnel is gone; the remaining cast is a single direct cast against a structurally-extended interface (permitted by CLAUDE.md Rule #8). | ✓ |
| WR-02 — code-split defeated by colocated skeleton | New files `revenue-area-chart-skeleton.tsx` (36 lines, pulls only `Card` + `Skeleton`) and `occupancy-donut-chart-skeleton.tsx` (37 lines, same imports). Neither imports `recharts` directly OR transitively (verified — both files import only `#components/ui/card` and `#components/ui/skeleton`). `dashboard.tsx:23,28` static-imports the skeleton files; line 35-49 `dynamic()`-imports the chart files. The Recharts ~200KB chunk is now genuinely deferred — `loading: () => <Skeleton />` will fire on cold load. Tests at `__tests__/revenue-area-chart.test.tsx:29` and `__tests__/occupancy-donut-chart.test.tsx:21` import from the new skeleton paths. | ✓ |
| WR-03 — `*Sections()` over 50-line cap | Re-measured: `financialPerformanceSections`=35 (455-489), `propertyPortfolioSections`=41 (546-586), `leasePortfolioSections`=30 (650-679), `maintenanceOperationsSections`=47 (705-751). All under 50. Per-table row mappers extracted as `financialMonthlyRows` / `financialExpenseRows` / `financialRentRollRows` / `propertyPerformanceRows` / `propertyOccupancyTrendRows` / `propertyVacancyTrendRows` / `leaseExpirationRows` / `leasePaymentRows` / `leaseTurnoverRows` — 9 new helpers, all under 15 lines each. | ✓ |
| WR-04 — UI-SPEC drift on Tabs styling | `04-UI-SPEC.md` § 4.3 line 433 now says `shadow-md`, line 436 says `font-semibold`. § 2.3 table rows 151-154 show active background `bg-primary`, active shadow `shadow-md`, active text `text-sm font-semibold` (600), inactive text `text-sm font-medium` (500). § 13 typography row 834 shows correct 600/500 active/inactive split. § 14 row 708 shows `bg-primary + text-primary-foreground + shadow-md`. All three sites match the vendored `src/components/ui/tabs.tsx:46` baseline (`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold`). | ✓ |
| IN-01 — `radix-ui` caret de-pin | `package.json:134` shows `"radix-ui": "^1.4.3"` (caret restored). `bun.lock:41` shows `^1.4.3`. | ✓ |

### Deferred from cycle 2 (still deferred — confirmed unchanged)

- IN-02 (donut "Vacant" includes maintenance units) — pre-existing migration arithmetic at `20260526203003_phase4_revenue_trend_6mo.sql:437` (`'vacant', ua.total_units - ua.occupied_units`). Phase 4 preserved verbatim. Deferred per cycle-2 rationale.
- IN-03 (`p_months: 12` over-fetch in `dashboardFinancialQueries.chartData`) — confirmed unchanged at `use-owner-dashboard-financial.ts:54`. Deferred per cycle-2 rationale.

### Cycle-3 sweep coverage

Scanned in-scope files for:
- `any` / `as any` / `as unknown as` in PR-diff (excluding pre-existing patterns in untouched files): 0 hits
- Hardcoded secrets / `eval` / `innerHTML` / `dangerouslySetInnerHTML`: 0 hits
- `@radix-ui/react-icons`: 0 hits
- `bg-white` / `text-muted` (bare, not `text-muted-foreground`): 0 hits in scope
- Inline `style=` attributes: 0 hits in scope
- Function-length cap violations (>50 lines): 0 hits in scope (all 30+ functions in `report-data.ts` re-counted; max is `buildExecutiveMonthly` at 38)
- File-length cap violations (>300 lines): `report-data.ts`=868 but it's a `src/lib/` data-shaping module not a component/hook (the CLAUDE.md cap targets components + hooks). All component/hook files in scope are under cap (`dashboard.tsx`=268, `use-owner-dashboard.ts`=261, `use-dashboard-hooks.ts`=132, `use-owner-dashboard-financial.ts`=76, `owner-dashboard-keys.ts`=60).
- `(select auth.uid())` wrapper pattern in migrations: present (`phase4_revenue_trend_6mo.sql:28`)
- `SECURITY DEFINER` + `search_path` pinning: present and correct on all 3 migrations
- RLS test owner-isolation + cross-role coverage: `dashboard-rpc-revenue-6mo.test.ts` covers happy path + A→B rejection + B→A symmetric rejection. Empty-data case implicitly covered (test acknowledges Owner A has zero active leases on prod; the shape assertion still passes because the server emits 6 buckets with `value: 0`).
- Mutation cache-invalidation gaps in report-generate flow: N/A — report generation is read-only (`fetchQuery` only, no mutations).

## Info

### IN-01: `ownerDashboardQueries` is a 73-line dead export, carried forward through the cycle-1 hook split

**File:** `src/hooks/api/use-owner-dashboard.ts:28-101`
**Issue:**
The exported `ownerDashboardQueries` factory (74 lines including the `_year` parameter dead branch) has **zero consumers** anywhere in `src/`. Verified via:

```bash
grep -rn "ownerDashboardQueries" /Users/richard/Developer/tenant-flow/src
```

Single hit: the export declaration itself. The factory defines five branches, all dead:

| Factory branch | Status | Notes |
|----------------|--------|-------|
| `analytics.pageData()` | dead | superseded by `DASHBOARD_BASE_QUERY_OPTIONS` (the only consumed pattern at use-dashboard-hooks.ts:17) |
| `financial.billingInsights()` | dead | no consumer |
| `financial.revenueTrends(_year)` | dead | no consumer; `_year` parameter is declared `_`-prefixed because TypeScript's `noUnusedParameters` would otherwise reject it — but the function discards the param entirely (line 65-66 returns `revenueTrendsQuery({ months: 12 })` without referencing `_year`). The whole signature is a stale contract. |
| `maintenance.analytics()` | dead | no consumer |
| `tenants.occupancyTrends()` | dead | no consumer |

This is **pre-existing on `main`** (verified via `git show main:src/hooks/api/use-owner-dashboard.ts` — `ownerDashboardQueries` appears at line 76 of the pre-PR version), so it is NOT a regression introduced by Phase 4. However:

1. The cycle-1 WR-02 fix split `use-owner-dashboard.ts` and mechanically copied this dead block into the new file. A genuine clean-up pass during the split would have removed it.
2. `git blame` will attribute these lines to the cycle-1 split commit, surfacing them as Phase-4-touched lines.
3. By the same consistency rule cycle 2 applied to IN-03 (pre-existing performance gap surfaced in a Phase-4-touched file), this should at least be acknowledged.

CLAUDE.md TypeScript strictness section: "Prefix unused callback params with `_` or remove." The `_year` parameter is half-compliant (prefixed) but the spirit is "remove if you can". Here you can — the whole factory branch is unreferenced.

**Fix:** Delete the entire `ownerDashboardQueries` export (lines 28-101 of `use-owner-dashboard.ts`). The remaining exports (`DashboardStatsData`, `DashboardChartsData`, `DashboardActivityData`, `OwnerDashboardData`, `DASHBOARD_BASE_QUERY_OPTIONS`, `mapPropertyPerformanceStatus`, `fetchOwnerDashboardData`) are all consumed and stay. Net change: drops `use-owner-dashboard.ts` from 261 lines → ~190 lines, plus removes the misleading `_year`-discard signature from any IDE auto-complete that surfaces it.

Alternative if the operator considers this out-of-scope for Phase 4: explicit `// TODO(#NNN): unused since the hook split — remove in a follow-up cleanup` comment + tracking issue link. The current state (dead but unannotated) is the worst of both worlds — it survives review-cycle scrutiny by virtue of nobody flagging it, then accumulates more orphan branches over time.

**Defer-acceptable** for this PR if the operator explicitly chooses to. If kept dead, the dead code is a maintainability tax for the next reviewer of this file (which will be Phase 5's hook touchpoints).

---

_Reviewed: 2026-05-27T19:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cycle 3 — full re-read + cycle-2 fix-site verification + cross-file dead-code trace)_
_Cycle-2 findings verified fixed: 6/6_
_New findings surfaced: 1 (0 P0, 0 P1, 1 INFO)_
_Out-of-scope items deferred per cycle-2 rationale: 2 (IN-02 donut semantic, IN-03 p_months over-fetch)_
