---
phase: 55-rent-ledger
plan: 08
subsystem: frontend
tags: [kpi, query-keys, typed-mappers, revenue-honesty, accessibility, tanstack-query]

# Dependency graph
requires:
  - phase: 55-rent-ledger (plan 02)
    provides: get_collection_rate + the ledger-filled collections field on get_revenue_trends_optimized
  - phase: 55-rent-ledger (plan 04)
    provides: migrations live in prod + src/types/supabase.ts regenerated (get_collection_rate is typed)
provides:
  - src/components/ledger/collection-rate-kpi.tsx - CollectionRateKpi Stat tile fed by get_collection_rate
  - src/hooks/api/use-owner-dashboard-financial.ts - dashboardFinancialQueries.collectionRate / useCollectionRate / mapCollectionRateRow / FinancialChartDatum.collected
  - src/hooks/api/query-keys/owner-dashboard-keys.ts - ownerDashboardKeys.financial.collectionRate month leaf
  - src/types/analytics.ts - FinancialMetricSummary.totalCollected
affects: [phase 55 verification, any future revenue surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A shipped helper's placeholder ASCII icon field is never read; the status WORD selects a lucide component, and a unit test asserts none of the placeholder markers reach the DOM"
    - "Vivid semantic token applied to the icon glyph only, with the status word duplicated into the tile aria-label so the grade is never conveyed by colour alone"
    - "No-data state routes around the grading helper entirely so an owner who has not started tracking is not scored 'Poor'"

key-files:
  created:
    - src/components/ledger/collection-rate-kpi.tsx
    - src/components/ledger/__tests__/collection-rate-kpi.test.tsx
    - src/hooks/api/__tests__/collection-rate-mapper.test.ts
    - src/app/(owner)/analytics/financial/_components/__tests__/financial-overview-stats.test.tsx
  modified:
    - src/hooks/api/query-keys/owner-dashboard-keys.ts
    - src/hooks/api/use-owner-dashboard-financial.ts
    - src/components/dashboard/dashboard.tsx
    - src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx
    - src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx
    - src/app/(owner)/analytics/financial/page.tsx
    - src/hooks/api/query-keys/analytics-mappers.ts
    - src/hooks/api/query-keys/analytics-mappers.test.ts
    - src/types/analytics.ts
    - .planning/phases/55-rent-ledger/deferred-items.md

key-decisions:
  - "The no-data KPI is neutral, not 'Poor'. getCollectionRateStatus(0) grades Poor with a red down-arrow; showing that to an owner who simply has not started tracking is a fabricated judgement, so scheduled=0 renders a muted CircleDashed and skips the helper entirely."
  - "Collected on the financial overview is summed across the same trailing-12-month revenue-trend window the page's charts already fetch, so Scheduled and Collected sit on comparable (annual) spans without a second round-trip."
  - "The dashboard bento's 'Revenue' tile was deliberately NOT relabeled 'Scheduled' - it is MRR-derived, a different basis from the ledger scheduled behind the new KPI. Logged as D3."
  - "getCollectionRateStatus's `color` is applied to the icon glyph only (vivid-token-on-icon is the AA-safe use); the status WORD goes into aria-label so the grade is never colour-only."

requirements-completed: [LEDGER-07, LEDGER-08]

# Metrics
duration: 40min
completed: 2026-07-25
---

# Phase 55 Plan 08: Collection-Rate KPI + Scheduled/Collected Relabel Summary

**The collection-rate KPI returns to the dashboard as a ratio of ledger actuals that reads an honest 0% with no data, and the financial-overview revenue card splits into two explicitly labeled, tooltipped, never-summed figures: lease-derived Scheduled and ledger-derived Collected.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-07-25T08:20:00Z
- **Completed:** 2026-07-25T08:40:00Z
- **Tasks:** 2
- **Files created:** 4 · **modified:** 10

## Accomplishments

- **`ownerDashboardKeys.financial.collectionRate(month)`.** A month-bucketed leaf under the existing `financial` branch, so every ledger mutation's `ownerDashboardKeys.all` fanout (shipped in 55-05) already flushes the KPI with no extra wiring. Bucketing by `YYYY-MM` means a month rollover cannot serve last month's rate from cache.
- **`dashboardFinancialQueries.collectionRate()` + `useCollectionRate()`.** Calls `get_collection_rate` with only `p_user_id` so SQL resolves the month itself, routes errors through `handlePostgrestError`, and narrows the row with `jsonObject` before a typed `mapCollectionRateRow`. The mapper coerces with `Number()` and nothing else, throws on a missing field instead of silently reading it as `0`, and never rescales `rate` (SQL already returns 0-100).
- **`CollectionRateKpi` (155 lines).** A `Stat` tile mirroring `KpiTile`: `StatLabel` "Collection rate", value through the reduced-motion `NumberTicker` path (static `formatPercentage` when motion is off), `StatIndicator` carrying a **lucide** status icon, and the UI-SPEC helper line. With `scheduled = 0` it renders a real **0%** plus "Start tracking rent to see your collection rate" — the tile is present and honest rather than hidden or invented (D-08). Loading is a skeleton tile; a failed fetch says "Unavailable" instead of showing a number.
- **The known `currency.ts` defect is contained.** `getCollectionRateStatus` still ships placeholder ASCII strings in its `icon` field. The card never reads that field: the returned `status` word maps to `TrendingUp` / `CircleCheck` / `TriangleAlert` / `TrendingDown`, and four parameterised tests assert that none of the four placeholder markers reaches the DOM in any band.
- **Scheduled vs Collected on the financial overview.** "Total Revenue" is now **Scheduled** (tooltip: *Rent expected from active lease terms this period.*) with a sibling **Collected** card (tooltip: *Payments you've recorded against charges this period.*), each tooltip reachable from a real focusable button. `FinancialMetricSummary.totalCollected` sums `collections` across the trailing-12-month revenue rows the page already fetches; the grid widens to 5 tiles.
- **Nothing is summed and no derivation moved.** `netIncome`, `cashFlow` and `profitMargin` still come from `totalRevenue` (scheduled) minus expenses — RESEARCH Pitfall 5. `FinancialChartDatum` gained a `collected` field beside `revenue` with `profit` untouched. A mapper test iterates every metric value asserting none equals `scheduled + collected`, and a component test asserts the summed string never appears in the rendered output.
- **13 new unit cases** across the KPI card, the RPC mapper, the key leaf, the overview mapper and the overview component.

## Task Commits

1. **Task 1: collection-rate KPI card, query, key leaf, dashboard mount** - `1089a4fb4` (feat)
2. **Task 2: Scheduled vs Collected relabel on the revenue surfaces** - `3ad3ad236` (feat)

## Files Created/Modified

- `src/components/ledger/collection-rate-kpi.tsx` — the KPI tile, its reduced-motion value, its skeleton and its honest no-data/error branches.
- `src/hooks/api/use-owner-dashboard-financial.ts` — `CollectionRateSummary`, `mapCollectionRateRow`, `collectionRate` queryOptions, `useCollectionRate`, and `FinancialChartDatum.collected`.
- `src/hooks/api/query-keys/owner-dashboard-keys.ts` — the `financial.collectionRate` leaf.
- `src/components/dashboard/dashboard.tsx` — mounts `<CollectionRateKpi />` under the KPI bento.
- `src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx` — Scheduled/Collected relabel, `LabelWithTooltip`, 5-column grid, provenance descriptions.
- `src/hooks/api/query-keys/analytics-mappers.ts` — `totalCollected` summed from `revenueRows.collections`.
- `src/types/analytics.ts` — `FinancialMetricSummary.totalCollected` with the D-07 contract documented on both money fields.
- `src/app/(owner)/analytics/financial/page.tsx` — zero default for the new field.
- `src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx` — stubs the new self-fetching tile (see deviation 1).
- Four test files created/extended (see `key-files`).
- `.planning/phases/55-rent-ledger/deferred-items.md` — logged D3.

## Decisions Made

- **The no-data KPI is neutral, not graded.** `getCollectionRateStatus(0)` returns `Poor` / `text-destructive` / a down-arrow. Rendering that at an owner whose ledger is empty invents a judgement about performance that the data does not support — the same class of dishonesty D-08 exists to prevent. When `scheduled = 0` the card skips the helper entirely and shows a muted `CircleDashed` with the start-tracking line. A test asserts no `text-destructive` node exists in that state.
- **Collected is trailing-12-month, and says so.** `get_financial_overview.total_revenue` is annualized active-lease MRR (`sum(rent_amount) * 12`), a forward projection. The closest honest ledger counterpart on the same page is the sum of `collections` over the 12 revenue-trend rows the page already fetches. Both cards carry a provenance `StatDescription` ("Annualized from active leases" / "Receipts recorded in your rent ledger, last 12 months") so the difference in basis is visible rather than implied.
- **`getCollectionRateStatus.color` lands on the icon, not on text.** The vivid tokens it returns (`text-success`, `text-warning`, ...) fail WCAG AA as text in one theme or the other. They are AA-safe on an icon glyph, so the colour goes there and the status word is duplicated into the tile's `aria-label`, keeping the grade available without colour.
- **The dashboard bento's "Revenue" tile keeps its label.** It renders MRR from `get_dashboard_stats`, a different scheduled basis from the `rent_charges` sum behind the new KPI. Printing "Scheduled" on both would assert an equivalence that does not hold for any partially-tracked portfolio. Logged as D3 with the two test sites it would touch.
- **`FinancialChartDatum.collected` shipped in the Task 1 commit.** The field edit sat in the same file as the Task 1 query work; separating it would have meant an artificial partial-file stage. Task 2's contract is unchanged — it is called out here for commit-to-task traceability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `dashboard-portfolio-swap.test.tsx` broke on the new tile's own query**

- **Found during:** Task 1
- **Issue:** Mounting `<CollectionRateKpi />` inside `Dashboard` gave that component a `useQuery` call. `dashboard-portfolio-swap.test.tsx` renders `Dashboard` without a `QueryClientProvider`, so 6 of its 9 cases died with "No QueryClient set" — directly caused by this task's change.
- **Fix:** Stubbed `#components/ledger/collection-rate-kpi` in that suite alongside its existing `next/dynamic` stub, with a comment pointing at the KPI's own test file. The portfolio-swap suite stays focused on the portfolio swap.
- **Files modified:** `src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx`
- **Commit:** `1089a4fb4`

**2. [Rule 2 - Missing critical functionality] The financial overview had no Collected source**

- **Found during:** Task 2
- **Issue:** The plan lists only `financial-overview-stats.tsx` for the relabel, but that component is presentational — it receives `metrics: FinancialMetricSummary`, which carried no collected figure. Sourcing Collected from `useCollectionRate()` inside the component would have put a **current-month** number next to an **annualized** Scheduled, which is exactly the misleading comparison D-07 forbids.
- **Fix:** Added `totalCollected` to `FinancialMetricSummary` and computed it in `mapFinancialOverview` from the `revenueRows` the page already fetches, so both figures span a comparable window. Three extra files (`src/types/analytics.ts`, `analytics-mappers.ts`, the page's default object) beyond the plan's list.
- **Files modified:** `src/types/analytics.ts`, `src/hooks/api/query-keys/analytics-mappers.ts`, `src/app/(owner)/analytics/financial/page.tsx`
- **Commit:** `3ad3ad236`

**3. [Rule 2 - Missing critical functionality] Grading an empty ledger as "Poor"**

- **Found during:** Task 1
- **Issue:** A literal reading of the plan ("`StatIndicator` colored by `getCollectionRateStatus(rate).color`") produces a red `TrendingDown` "Poor" indicator for every owner with no ledger data, since `rate = 0 < 70`. That is a fabricated performance judgement layered on top of the honest 0%.
- **Fix:** The helper is only consulted when `scheduled > 0`; otherwise the tile renders a muted `CircleDashed` and the aria-label says "No rent tracked yet." Pinned by a test.
- **Files modified:** `src/components/ledger/collection-rate-kpi.tsx`
- **Commit:** `1089a4fb4`

### Out-of-scope discovery (logged, NOT fixed)

The dashboard KPI bento still labels its lease-derived tile "Revenue" rather than "Scheduled", which 55-UI-SPEC § Surface Layouts 6 nominally covers. Not changed — the bento figure is MRR-derived (a different scheduled basis from the ledger figure behind the new KPI), and the label is asserted by both `kpi-bento-row.test.tsx` and the required-CI `dashboard-smoke.e2e.spec.ts`. No double-count exists today: nothing sums the tile with any ledger figure. Logged as **D3** in `deferred-items.md` with the full rationale and the two test sites a follow-up would touch.

## Issues Encountered

- **The plan's own money-guard grep flagged a comment.** Task 1's `<verify>` block greps for `"TARGET:"` / `[OK]` in the KPI source; the doc comment explaining *why* those placeholder strings are never rendered quoted them verbatim and tripped it. Unlike `rent-ledger-money.test.ts`, that grep does not strip comments. Reworded the comment to describe the markers without quoting them — the assertion that they never reach the DOM now lives in the test, which is the stronger guarantee anyway.

## Verification

- `bun run validate:quick` -> **green: 299 files / 107,517 tests, typecheck clean across all three projects, biome clean (1,328 files).**
- Task 1 automated verify -> `KPI_OK`. Task 2 automated verify -> `RELABEL_OK`.
- `bun run test:unit -- src/hooks/api/__tests__/rent-ledger-money.test.ts` -> **15/15 pass**, now scanning `collection-rate-kpi.tsx` (it lives under `src/components/ledger`, already inside `LEDGER_PATHS`).
- `grep -nE '\*\s*100|/\s*100|formatCents\('` across both new/edited UI files -> clean.
- No `as unknown as`, no `any`, no string-literal query keys, no barrel files, no inline styles in any new or edited file.
- Both commits passed the full lefthook chain (gitleaks, lockfile-verify, lint, typecheck, unit tests with the 80% coverage threshold) and commitlint. No `--no-verify` at any point.

## Known Stubs

None. The KPI reads a live prod RPC and the overview's Collected figure reads live ledger receipts through `get_revenue_trends_optimized`. The 0% no-data state and the `EMPTY_COLLECTION_RATE` object are the honest empty state mandated by D-08, not placeholders.

## Threat Flags

None. This plan adds no endpoint, auth path, file access pattern or schema change — it binds to `get_collection_rate`, which shipped in 55-02 and went live in 55-04. All four assigned mitigations are implemented: T-55-09 (two labeled, tooltipped, never-summed figures with profit still on the scheduled basis — asserted by tests), T-55-21 (honest 0% plus the start-tracking helper, and no fabricated status grade), T-55-05 (dollars/percent only, `rate` never rescaled, guard test scans the card), T-55-07 (the query passes the cached user id and the RPC re-checks `p_user_id = auth.uid()` server-side).

## User Setup Required

None.

## Next Phase Readiness

- **Phase verification** should run the two manual checks in `55-VALIDATION.md`: the honest-0% render for an owner with no ledger data, and Scheduled/Collected reading as visually distinct, never-summed figures.
- **55-06 / 55-07** are unaffected by this plan; `src/components/ledger/` now exists with one file and the money guard already covers the whole directory recursively.
- **D3** in `deferred-items.md` is the one open D-07 labeling question, with its rationale and blast radius recorded.

## Self-Check: PASSED

- FOUND: src/components/ledger/collection-rate-kpi.tsx
- FOUND: src/components/ledger/__tests__/collection-rate-kpi.test.tsx
- FOUND: src/hooks/api/__tests__/collection-rate-mapper.test.ts
- FOUND: src/app/(owner)/analytics/financial/_components/__tests__/financial-overview-stats.test.tsx
- FOUND commit: 1089a4fb4
- FOUND commit: 3ad3ad236

---
*Phase: 55-rent-ledger*
*Completed: 2026-07-25*
