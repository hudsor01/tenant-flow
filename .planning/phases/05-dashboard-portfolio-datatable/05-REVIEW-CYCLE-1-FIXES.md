# Phase 5 — Perfect-PR Review Cycle 1 Fixes

Branch: `gsd/phase-5-dashboard-portfolio-datatable`. Each finding fixed in its own
atomic commit; full pre-commit gate (gitleaks, lockfile, lint, typecheck, unit)
ran on every commit. Final state: `bun run typecheck` + `bun run lint` clean,
full unit suite **106,153 tests passing (182 files)**.

| # | Finding | Fix | Commit |
|---|---------|-----|--------|
| FIX 1 (P1) | Preset/URL filters never re-applied; multi-word search split to an array | Made nuqs the single source of truth: derive `columnFilters` from live `filterValues` each render (dropped the `useState` seed); `onColumnFiltersChange` only writes back to nuqs (debounced); array-split keyed off the FACETED-column set (`meta.options`), not value characters | `3b9620e60` |
| FIX 2 (P1) | Virtualized header/body columns misaligned; flex broke `tr`/`td` semantics | Reconciled to ONE width model: `table-fixed` + native `<TableRow>`/`<TableCell>` body rows (no flex/flex-1/absolute), keeping only the sanctioned per-row `translateY` transform | `20a33aded` |
| FIX 3 (P2) | Toolbar `as string` cast on `getFilterValue()` unsound; empty state mislabeled zero-portfolio as no-match | Normalize search value (array→join, string passthrough, else ""); split empty state on unfiltered `data.length` — true no-portfolio (no Clear filters) vs filtered-empty (Clear filters) | `8ef41fee6` |
| FIX 4 (P3) | Table loaded unsorted; footer showed misleading "0 of N row(s) selected" | Seeded `initialState.sorting = [{ id: "property", desc: false }]`; added `showSelectedCount` prop on `DataTablePagination` (default true) + `enableRowSelection` passthrough on `useClientDataTable` (default true); portfolio passes false for both | `d1fbc6532` |
| FIX 5 (tests) | Apply-preset test only asserted URL; sortable-flag asserts used `.not.toBe(false)` | Added two end-to-end Dashboard tests asserting FILTERED ROWS change after apply (incl. multi-word property + status + sort + page remount round-trip); changed four sortable asserts to `.toBe(true)` | `6dea22399` |

## Source files changed
- `src/hooks/use-client-data-table.ts` — nuqs single source of truth for filters; faceted-keyed array-split; `enableRowSelection` passthrough.
- `src/components/dashboard/components/portfolio-data-table.tsx` — `table-fixed` + native virtualized rows; split empty states; default sort + `showSelectedCount={false}`.
- `src/components/dashboard/components/portfolio-data-table-toolbar.tsx` — sound search-value normalization.
- `src/components/data-table/data-table-pagination.tsx` — opt-in `showSelectedCount` (default true; existing consumers unchanged).

## Test files changed / added
- `src/hooks/__tests__/use-client-data-table.test.tsx` — +2 tests (external-write re-filter; multi-word single-string hydration); existing page-count test now flushes the debounced URL write. (8 tests total.)
- `src/components/dashboard/components/__tests__/portfolio-data-table.test.tsx` — +5 tests (real table-mode row render via virtualizer mock; array→string normalization; zero-properties vs filtered-empty states; default property sort; footer selection-summary suppression); UI filter tests now `waitFor` the debounced result. (17 tests total.)
- `src/components/data-table/__tests__/data-table-pagination.test.tsx` — NEW file, 2 tests (default shows summary; `showSelectedCount={false}` hides it).
- `src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx` — +2 end-to-end re-filter tests. (7 tests total.)
- `src/components/dashboard/components/__tests__/portfolio-columns.test.tsx` — four sortable asserts tightened to `.toBe(true)`. (7 tests total.)

## Notable test-behavior deltas (consequence of FIX 1, not regressions)
Filter writes now round-trip through the debounced nuqs URL as the single source
of truth, so UI-driven filter tests await the result (`waitFor` / `flushUrlWrites`)
instead of asserting synchronously. This is the intended architecture: the URL is
authoritative, and external writes (preset apply, refresh, shared URL,
back/forward) re-flow into the table automatically.

## Deviations
None. No new source files created beyond the one new test file
(`data-table-pagination.test.tsx`). No `--no-verify` / `LEFTHOOK_EXCLUDE` /
sandbox bypass used; every commit passed the full gate on the first try.
