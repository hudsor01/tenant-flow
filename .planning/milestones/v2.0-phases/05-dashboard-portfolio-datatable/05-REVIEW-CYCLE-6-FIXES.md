# Phase 5 — Perfect-PR Review Cycle 6 Fixes

Branch: `gsd/phase-5-dashboard-portfolio-datatable`. These are the cycle-6
confirmed P2 + the cheap/real P3 gaps. Each fix is its own atomic commit; the
full pre-commit gate (gitleaks, lockfile, lint, typecheck, unit) ran on every
commit. Final state: `bun run typecheck` + `bun run lint` clean, full unit
suite **106,178 tests passing (183 files)** — up from 106,172 at cycle start
(+6 tests net across the three changed/covered test files).

| # | Severity | Finding | Fix | Commit |
|---|----------|---------|-----|--------|
| FIX 1 | P2 (MUST) | Property column sort lost case-insensitive parity for ≤10-row portfolios. The `property` column declared only `filterFn`, no `sortingFn`, so TanStack's `auto` sorting fn inspected `flatRows.slice(10)`; with ≤10 filtered rows it fell back to the case-SENSITIVE `basic` fn (`"Zebra"` before `"abby"`), diverging from the deleted table's case-insensitive `a.property.localeCompare(b.property)`. `property` is ALSO the default-sorted column (`initialState` sorting `property` asc), so users hit it immediately. | Added an explicit `sortingFn: (rowA, rowB) => rowA.original.property.localeCompare(rowB.original.property)` (locale-aware + case-insensitive + row-count independent) to the `property` column. Added a regression test (`portfolio-columns.test.tsx`) pinning Property ascending order with MIXED-CASE names and a SMALL (≤10) row set — `['Zebra Towers','abby Court','Maple']` → `['abby Court','Maple','Zebra Towers']`. Confirmed the test FAILS without the `sortingFn` (stripped the fn, ran, saw the failure) and passes with it. | `694cbae57` |
| FIX 2 | P3 a11y | (a) The virtualized `<table>` had no accessible name, so screen readers announced it anonymously. (b) The Actions "Edit" `<Link>` was `opacity-0` until row hover with no keyboard-focus restore — keyboard users tabbing to it never saw it. | (a) Added `aria-label="Property portfolio"` to the `<table>` element in `portfolio-data-table.tsx`. (b) Added `group-focus-within:opacity-100 focus-within:opacity-100` to the Actions cell wrapper in `portfolio-columns.tsx` so the link surfaces on keyboard focus while KEEPING the hover behavior. Two tests pin both (table accessible name + the wrapper's focus-within classes alongside the preserved `group-hover` class). | `5810c0794` |
| FIX 3a | P3 test gap | The three exported `use-client-data-table.helpers.ts` helpers — `toFilterUpdates`, `filtersEqual`, `buildFilterParsers` — lacked direct unit coverage. | Added tests to `use-client-data-table.helpers.test.ts`: `filtersEqual` true/value-differs/set-differs cases; `toFilterUpdates` emits the `null` removal branch when a filter clears since `prev` (plus a known-column and an unknown-column case); `buildFilterParsers` returns an array parser for faceted (`meta.options`) columns and a string parser otherwise — asserted behaviorally via `parser.parse("a,b")` (array splits, string stays one value). | `fb9745030` |
| FIX 3b | P3 test gap | The no-match `Clear filters` button was asserted to RENDER but never that clicking it actually clears filters (filtered rows return to the full set). | Added a Clear/Reset round-trip test to `portfolio-data-table.test.tsx`: filter to the no-match state, click `Clear filters` (`PortfolioNoMatchState.onClear` → `table.resetColumnFilters()`), then assert both rows return AND the search input clears (the reset round-trips through nuqs). Rendered in grid mode so the row text is observable (jsdom's 0px virtualizer renders 0 table rows). | `74cd46b46` |
| FIX 3c | P3 test gap | The preset menu's per-row `Trash2` delete button (store `deletePreset` wired through the UI) had no test. | Added a preset-DELETE UI test to `dashboard-portfolio-swap.test.tsx`: seed two presets, open the menu, click the `Delete preset {name}` trash button for one, assert it leaves BOTH the store and the rendered list while the sibling preset survives. | `2dbcc76c2` |

## Source files changed
- `src/components/dashboard/components/portfolio-columns.tsx` — FIX 1 (`property` `sortingFn` localeCompare) + FIX 2b (Actions cell `focus-within`/`group-focus-within` opacity overrides).
- `src/components/dashboard/components/portfolio-data-table.tsx` — FIX 2a (`aria-label="Property portfolio"` on the `<table>`).

## Test files changed
- `src/components/dashboard/components/__tests__/portfolio-columns.test.tsx` — FIX 1 small-row-set sort regression test + FIX 2b focus-visible test (9 tests total).
- `src/components/dashboard/components/__tests__/portfolio-data-table.test.tsx` — FIX 2a table accessible-name test + FIX 3b clear-filters round-trip test (22 tests total).
- `src/hooks/__tests__/use-client-data-table.helpers.test.ts` — FIX 3a `buildFilterParsers`/`toFilterUpdates`/`filtersEqual` tests (15 tests total).
- `src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx` — FIX 3c preset-delete trash-button test (9 tests total).

## Accepted — no change

**P3 `aria-rowcount` reports current-PAGE count**: **ACCEPTED**. Defensible — the
paginated `<table>` shows exactly one page of rows, so `aria-rowcount = page
rows + 1` (the header) is the honest count for what is rendered. No fix applied.

**P3 function-length advisory on the hook + virtualized-table**: **ACCEPTED**.
`useClientDataTable` composes ~7 `useQueryState`/`useQueryStates` calls +
`useReactTable`, matching the upstream `use-data-table.ts` source it is vendored
from; the `PortfolioVirtualizedTable` function composes the canonical
react-virtual `<table display:grid>` render. These are advisory exceptions to
the 50-line function cap, explicitly out of scope for this cycle. No refactor.

## Notes
- `subject-case` commitlint rule forces lowercase commit subjects, so the finding
  identifiers appear as a lowercase `cr-6 pN` tag rather than an uppercase prefix.
- No `--no-verify` / `LEFTHOOK_EXCLUDE` used; every commit ran the full
  pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit-tests) plus
  commitlint on commit-msg.
