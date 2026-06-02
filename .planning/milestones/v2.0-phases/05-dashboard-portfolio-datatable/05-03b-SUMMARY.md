---
phase: 05-dashboard-portfolio-datatable
plan: 03b
subsystem: ui
tags: [zustand, nuqs, tanstack-table, presets, atomic-swap, dashboard]

# Dependency graph
requires:
  - phase: 05-02
    provides: PortfolioDataTable controlled shell (consumes columnVisibility prop)
  - phase: 05-03a
    provides: useDashboardPresetsStore (named full-snapshot presets + live columnVisibility)
provides:
  - "Dashboard portfolio section driven entirely by the vendored DataTable stack (DT-01 complete)"
  - "Trimmed dashboard-store (viewMode only) + useDashboardViewMode (DT-07 home, DT-09 store trim)"
  - "PortfolioPresetMenu — save/apply/delete view presets via nuqs round-trip + persist store (DT-08)"
affects: []

# Tech tracking
tech-stack:
  added: []  # no new packages — nuqs, zustand, @tanstack/* all pre-installed
  patterns:
    - "useShallow on object-returning Zustand selectors (first use in src/stores) to keep the selector reference stable under a heavy table render"
    - "Preset snapshot collect/apply reads/writes the SAME nuqs keys useClientDataTable owns (page/sort/status/property) via useQueryStates — the store stays URL-free, the menu owns the nuqs read/write"

key-files:
  created:
    - src/components/dashboard/components/portfolio-preset-menu.tsx
    - src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx
  modified:
    - src/stores/dashboard-store.ts
    - src/components/dashboard/dashboard.tsx
    - src/components/dashboard/components/portfolio-data-table-toolbar.tsx
  deleted:
    - src/components/dashboard/components/portfolio-table.tsx
    - src/components/dashboard/components/portfolio-toolbar.tsx
    - src/components/dashboard/components/portfolio-pagination.tsx

key-decisions:
  - "useShallow on useDashboardViewMode — the object-returning selector caused a Maximum-update-depth loop once combined with the useClientDataTable render; useShallow gives a stable reference (canonical zustand v5 fix)"
  - "Single narrowing cast toPortfolioSort(SortingState -> ExtendedColumnSort<PortfolioRow>[]) at the nuqs apply boundary — mirrors the cast useClientDataTable already performs on its own sort setter; NOT as-unknown-as"
  - "OnChangeFn adapter in dashboard.tsx resolves the TanStack updater function against the live presets-store value before calling the plain setColumnVisibility setter"

patterns-established:
  - "Pattern: the URL is the source of truth for filter/sort/page; the preset snapshot READS from nuqs (never a stale store) and applyPreset WRITES back to nuqs + setColumnVisibility"

requirements-completed: [DT-01, DT-07, DT-08, DT-09]

# Metrics
duration: 13min
completed: 2026-05-31
---

# Phase 05 Plan 03b: Dashboard Portfolio Atomic Swap Summary

**The atomic swap — dashboard.tsx now mounts the vendored PortfolioDataTable + a new PortfolioPresetMenu, the dashboard-store is trimmed to `viewMode` only, and the three hand-rolled portfolio files are deleted in the same wave, with the full unit suite, typecheck, lint, and `next build` all green.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-31T01:47:52Z
- **Completed:** 2026-05-31T02:01:38Z
- **Tasks:** 3 (store trim, dashboard rewrite + preset menu [TDD], delete trio)
- **Files:** 2 created, 3 modified, 3 deleted

## Accomplishments

### Task 1 — `dashboard-store.ts` trimmed to `viewMode` only

Final shape (30 lines, down from 91):

```typescript
export type DashboardViewMode = "table" | "grid";
interface DashboardState { viewMode: DashboardViewMode; }
interface DashboardActions { setViewMode: (mode: DashboardViewMode) => void; }

export const useDashboardStore = create<DashboardState & DashboardActions>(
  (set) => ({ viewMode: "table", setViewMode: (mode) => set({ viewMode: mode }) }),
);

export const useDashboardViewMode = () =>
  useDashboardStore(useShallow((state) => ({
    viewMode: state.viewMode,
    setViewMode: state.setViewMode,
  })));
```

Deleted: `searchQuery`/`statusFilter`/`sortField`/`sortDirection`/`currentPage`/`itemsPerPage` state; `setSearchQuery`/`setStatusFilter`/`clearFilters`/`handleSort`/`setCurrentPage` actions; the `DashboardStatusFilter`/`DashboardSortField`/`DashboardSortDirection` type exports (zero importers after Task 2); and the 3 dead selector hooks `useDashboardFilters`/`useDashboardSorting`/`useDashboardPagination`.

### Task 2 — `dashboard.tsx` rewrite + `PortfolioPresetMenu`

The portfolio render block after the swap:

```tsx
<div className="flex flex-col gap-3" data-tour="portfolio-section">
  <div className="flex items-center justify-end">
    <PortfolioPresetMenu />
  </div>
  <PortfolioDataTable
    data={portfolioData}
    viewMode={viewMode}
    onViewModeChange={setViewMode}
    columnVisibility={columnVisibility}
    onColumnVisibilityChange={handleColumnVisibilityChange}
  />
</div>
```

- `viewMode` from the trimmed `useDashboardViewMode()`; `columnVisibility` from `useDashboardPresetsStore` (D-3), forwarded controlled (B-2). The D-10 inline `PortfolioRow` transform is PRESERVED; the inline filter/sort/slice block + the old `<PortfolioToolbar>`/`<PortfolioTable>`/`<PortfolioPagination>` + inline no-results are gone (the toolbar, pagination, and empty-state now live inside `PortfolioDataTable`).
- `PortfolioPresetMenu` reads the live snapshot from the SAME nuqs keys `useClientDataTable` writes — **`page` / `sort` / `status` (faceted array) / `property` (the W-3 search key — NOT a separate `search`/`q` key)** — via one `useQueryStates(urlStateParsers)` call using identical parsers (`parseAsInteger`, `getSortingStateParser`, `parseAsArrayOf(parseAsString, ",")`, `parseAsString`). `columnVisibility` is pulled from the presets store, not the URL.
- `savePreset(name, snapshot)` persists the full snapshot; `applyPreset(name)` writes `page`/`sort`/`status`/`property` back to nuqs and calls `setColumnVisibility(snapshot.columnVisibility)` (D-1 round-trip). The store never touches the URL.

### Task 3 — deleted the hand-rolled trio (atomic completion)

`git rm` of `portfolio-table.tsx`, `portfolio-toolbar.tsx`, `portfolio-pagination.tsx`. `portfolio-grid.tsx` PRESERVED (reused inside `PortfolioDataTable` for the grid view). Zero dangling importers; the only prior non-self reference (a docstring in `portfolio-data-table-toolbar.tsx`) was reworded off the deleted path. `git status -s` confirmed `D` for all three; the deletions are in commit `c04760c60`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `useDashboardViewMode` object selector caused an infinite render loop**
- **Found during:** Task 2 GREEN (the 3 Dashboard-render tests hit "Maximum update depth exceeded").
- **Issue:** The selector returns a fresh `{ viewMode, setViewMode }` object every render. Harmless in the old dashboard, but once combined with the `useClientDataTable` table render + radix compose-refs it triggered an unbounded re-render under React 19.
- **Fix:** Wrapped the selector in `useShallow` (zustand v5 canonical fix) so it returns a stable reference. Also added the `OnChangeFn` updater-resolving adapter in `dashboard.tsx` so TanStack's functional-updater path is honored against the live store value.
- **Files modified:** src/stores/dashboard-store.ts, src/components/dashboard/dashboard.tsx
- **Commit:** 05e1d6ff9

**2. [Rule 3 - Blocking] `next/dynamic` suspended forever in the Dashboard swap test**
- **Found during:** Task 2 RED→GREEN (the full-`<Dashboard>` tests rendered only the KPI skeleton; the portfolio section never mounted).
- **Issue:** `dynamic(..., { ssr: false })` for the two charts suspends with no Suspense boundary in jsdom, aborting the render before the portfolio section. jsdom's virtualizer also reports a 0px scroll container, so table-mode row text is never rendered.
- **Fix:** Mocked `next/dynamic` in the test to resolve synchronously to the loading skeleton, and asserted on always-present chrome (columnheaders, search input, radiogroup, preset trigger) for table mode while asserting card text in grid mode (grid renders all rows). This matches the existing `portfolio-data-table.test.tsx` jsdom-virtualization workaround.
- **Files modified:** src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx
- **Commit:** 05e1d6ff9

**3. [Rule 3 - Blocking] stale docstring pointer to a deleted file**
- **Found during:** Task 3.
- **Issue:** `portfolio-data-table-toolbar.tsx` referenced `portfolio-toolbar.tsx` in a docstring; after deletion that pointer dangled.
- **Fix:** Reworded the comment to describe the preserved `aria-checked` semantics without naming the removed path.
- **Files modified:** src/components/dashboard/components/portfolio-data-table-toolbar.tsx
- **Commit:** 7522faf40

## Authentication Gates

None.

## Known Stubs

None — the swap wires real state end to end. Filter/sort/page round-trip through nuqs; presets + column visibility round-trip through the persist store.

## ROADMAP Phase 5 success-criteria mapping (for the perfect-PR reviewer)

| # | Criterion | Satisfied where |
|---|-----------|-----------------|
| 1 | Sortable headers expose `aria-sort` + keyboard sort | Wave 1 (`getAriaSort` in `data-table-column-header.tsx`, applied on `<th>` in `portfolio-data-table.tsx`) — unchanged, still mounted |
| 2 | Faceted filter + column-visibility persist in URL (nuqs) | filter/status/sort/page live in nuqs via `useClientDataTable` (now the only portfolio state path after the store trim) |
| 3 | Save preset → refresh → re-apply (localStorage) | `PortfolioPresetMenu` (this plan) + `useDashboardPresetsStore` persist slice (05-03a); round-trip pinned by the swap test |
| 4 | Grid/table toggle works + virtualized long lists | toggle via trimmed `useDashboardViewMode`; always-on virtualization in `portfolio-data-table.tsx` (Wave 2) |
| 5 | The 3 hand-rolled files no longer exist | Task 3 — `portfolio-table.tsx` / `portfolio-toolbar.tsx` / `portfolio-pagination.tsx` deleted (commit c04760c60) |

## Verification (swap-integrity gate)

- `bun run typecheck` — exits 0.
- `bun run lint` (biome) — clean (1227 files, 0 errors; was 1230 before the 3 deletions).
- `SKIP_ENV_VALIDATION=true bun run build` — succeeds (after clearing a stale `.next` rmdir-ENOTEMPTY cache, unrelated to code).
- `bun run test:unit` (FULL suite) — **181 files / 106,141 tests pass.**
- Swap suite `dashboard-portfolio-swap.test.tsx` — 5/5 pass (mount / viewMode toggle / save-preset snapshot / apply-preset restore / column-visibility persist).
- Dangling-import grep `PortfolioTable\b|PortfolioToolbar\b|PortfolioPagination\b|portfolio-table|portfolio-toolbar|portfolio-pagination` over `src` → 0.
- Full lefthook pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) green on every commit.

`git diff --stat` (across the 3 swap commits):
```
 .../__tests__/dashboard-portfolio-swap.test.tsx    | 302 +++++++++++++++++++++
 .../components/portfolio-data-table-toolbar.tsx    |   4 +-
 .../dashboard/components/portfolio-pagination.tsx  |  95 -------
 .../dashboard/components/portfolio-preset-menu.tsx | 192 +++++++++++++
 .../dashboard/components/portfolio-table.tsx       | 220 ---------------
 .../dashboard/components/portfolio-toolbar.tsx     | 111 --------
 src/components/dashboard/dashboard.tsx             | 158 +++--------
 src/stores/dashboard-store.ts                      |  85 +-----
 8 files changed, 553 insertions(+), 614 deletions(-)
```

## Human-visual checkpoint (NOT blocking)

The redesigned portfolio section is now live on `/dashboard`: dark-mode tokens, the 3-up trends/quick-actions row, the grid↔table toggle, the faceted status filter, column-visibility, the preset menu, and skeleton→data hydration. Flag for a human visual pass — not a blocker on this plan.

## Self-Check: PASSED

- FOUND: src/components/dashboard/components/portfolio-preset-menu.tsx
- FOUND: src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx
- FOUND (modified): src/stores/dashboard-store.ts, src/components/dashboard/dashboard.tsx
- DELETED (confirmed absent): portfolio-table.tsx, portfolio-toolbar.tsx, portfolio-pagination.tsx
- PRESERVED: src/components/dashboard/components/portfolio-grid.tsx
- FOUND: commit 05e1d6ff9 (Task 1+2), c04760c60 (Task 3 deletions), 7522faf40 (docstring fix)
