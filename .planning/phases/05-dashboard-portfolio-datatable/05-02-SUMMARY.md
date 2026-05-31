---
phase: "05"
plan: 02
subsystem: dashboard-portfolio-datatable
tags: [data-table, virtualization, aria-sort, faceted-filter, column-visibility, grid-toggle, mobile]
requires:
  - "src/hooks/use-client-data-table.ts (05-01a — controlled columnVisibility)"
  - "src/components/dashboard/components/portfolio-columns.tsx (05-01b — portfolioColumns)"
  - "src/components/data-table/data-table-column-header.tsx (05-01b — getAriaSort)"
  - "src/components/data-table/data-table-faceted-filter.tsx (vendored)"
  - "src/components/data-table/data-table-view-options.tsx (vendored)"
  - "src/components/data-table/data-table-pagination.tsx (vendored)"
  - "src/components/dashboard/components/portfolio-grid.tsx (grid card layout)"
  - "src/hooks/use-media-query.ts (W-4)"
  - "@tanstack/react-virtual useVirtualizer (DT-06)"
provides:
  - "PortfolioDataTable — assembled controlled shell (aria-sort <th> + virtualized tbody + grid/table switch + mobile forced-grid)"
  - "PortfolioDataTableToolbar — search (property name||address) + faceted status + view-options + radiogroup grid/table toggle"
affects:
  - "Plan 05-03 (mount target — supplies data + viewMode + columnVisibility as controlled props; performs the atomic swap)"
  - "Plan 05-03b (preset snapshot reads/writes the SAME pinned 'property' search key)"
tech-stack:
  added: []
  patterns:
    - "aria-sort rendered on <TableHead aria-sort={getAriaSort(header.column)}> so it lands on the real <th role=columnheader> (B-1); inner header button carries none"
    - "always-on useVirtualizer over post-pagination page rows (D-2) — one code path, sticky thead + pagination footer (leases-table precedent)"
    - "controlled columnVisibility passed straight to useClientDataTable (B-2) — no Wave-1 hook edit"
    - "grid view (toggle OR <=375px mobile-forced via useMediaQuery) reads the SAME table.getRowModel().rows (D-5)"
    - "search filters the pinned 'property' column (name||address filterFn) — no separate search key (W-3)"
key-files:
  created:
    - src/components/dashboard/components/portfolio-data-table.tsx
    - src/components/dashboard/components/portfolio-data-table-toolbar.tsx
    - src/components/dashboard/components/__tests__/portfolio-data-table.test.tsx
  modified: []
decisions:
  - "estimateSize = 56px (portfolio rows are 2-line name+address; >= UI-SPEC h-12/48px floor)"
  - "scroll-container max-height = max-h-[calc(100vh-420px)] (mirrors leases-table)"
  - "virtualized tbody rendered as a raw <tbody data-slot=table-body> with flex rows (absolute + translateY) so virtual positioning works inside the vendored <Table>"
  - "view-options trigger queried by role=combobox (DataTableViewOptions uses role=combobox aria-label='Toggle columns')"
metrics:
  duration: "~8m"
  completed: "2026-05-30"
  tasks: 2
  files: 3
  tests: 11
requirements: [DT-01, DT-04, DT-05, DT-06, DT-07]
---

# Phase 05 Plan 02: Assembled Portfolio DataTable + Toolbar Summary

Shipped DT-01 (assembled shell) + DT-04 (faceted status filter) + DT-05 (column
visibility) + DT-06 (always-on row virtualization) + DT-07 (grid/table toggle)
as two self-contained, controlled components — `PortfolioDataTable` and
`PortfolioDataTableToolbar` — that consume the Wave-1 outputs (`useClientDataTable`,
`portfolioColumns`, `getAriaSort`) and compose the already-vendored faceted
filter / view-options / pagination. **NOT mounted on a route** (the mount + the
atomic swap of the hand-rolled files is Plan 05-03).

## PortfolioDataTable prop contract (what Plan 05-03 must pass)

```typescript
interface PortfolioDataTableProps {
  data: PortfolioRow[];                              // owner-scoped RPC rows
  viewMode: "table" | "grid";                        // from dashboard-store (DT-07)
  onViewModeChange: (mode: "table" | "grid") => void;
  columnVisibility: VisibilityState;                 // from presets-store (DT-05, controlled)
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
}
```

The component is a pure consumer: it does NOT import `dashboard-store` or
`dashboard-presets-store`. Plan 05-03 owns the state and wires those stores to
these props.

## Risk closures (pinned by tests)

- **B-2 controlled visibility (NO 05-01a hook edit):** `columnVisibility` +
  `onColumnVisibilityChange` are passed straight into
  `useClientDataTable({ data, columns: portfolioColumns, getRowId, columnVisibility,
  onColumnVisibilityChange })`. The Wave-1 hook already accepts them as controlled
  props — `use-client-data-table.ts` was NOT touched. Visibility is never routed
  through `initialState` (`grep -c initialState` == 0). Pinned by the "hides a
  column when columnVisibility is controlled and fires the parent spy" test:
  `{ maintenance: false }` removes the `<th>`, and toggling via the view-options
  menu fires the parent's `onColumnVisibilityChange` spy.

- **B-1 aria-sort on the `<th role="columnheader">`:** the thead renders
  `<TableHead aria-sort={getAriaSort(header.column)}>`. The `TableHead` UI primitive
  spreads `...props` onto the real `<th>`, so the WAI-ARIA sort token lands on the
  columnheader — never on the flexRendered `DataTableColumnHeader` button. Pinned by
  the jsdom test: `getByRole("columnheader", { name: /property/i })` carries an
  `aria-sort` in `{none, ascending, descending}`, and the inner sort
  `getByRole("button", { name: /property/i })` has `aria-sort === null`.

- **W-4 mobile forced-grid:** `const forceGridMobile = useMediaQuery("(max-width: 375px)")`
  → `const effectiveView = forceGridMobile ? "grid" : viewMode`. The table path is
  NEVER rendered at `<=375px` (no horizontal scroll). Pinned by the test that stubs
  `matchMedia("(max-width: 375px)") → matches:true`: with `viewMode="table"` the cards
  render and `queryByRole("columnheader")` is null; the no-match stub renders the
  table for `viewMode="table"`.

- **W-3 search parity:** the toolbar search Input wires to
  `table.getColumn("property")?.setFilterValue(value)` — the PINNED `"property"`
  nuqs key whose name||address `filterFn` (Plan 05-01b) matches NAME or ADDRESS.
  No separate `search`/`q` key. Pinned by the "address-only row survives" test:
  searching `"elm"` (matches only the address `"42 Elm Street"`, not the name
  `"Sunset Towers"`) keeps the row → filtered count = 1. **Plan 05-03b's preset
  snapshot must read/write this same `"property"` key.**

- **D-2 always-on virtualization:** the tbody is ALWAYS rendered through
  `useVirtualizer({ count: pageRows.length, getScrollElement, estimateSize: () => 56,
  overscan: 5 })` over the post-pagination page rows. One code path — no
  `if (rows.length > N)` threshold branch. Pinned by the "virtualizes both small (3)
  and large (50) datasets through one path" test plus the tbody carrying the
  `getTotalSize()` height style.

- **D-5 grid reads the same rows:** when `effectiveView === "grid"` (toggle OR
  mobile-forced) the component feeds `PortfolioGrid` with
  `pageRows.map((row) => row.original)` — the SAME filtered/sorted/paged
  `table.getRowModel().rows`, not the raw `data` prop. Pinned by the "grid view reads
  the SAME filtered rows" test: applying a `status=active` faceted filter narrows the
  grid to the active row only.

## Virtualizer parameters (DT-06)

- `estimateSize` = **56px** (portfolio rows are a 2-line name + address; chosen above
  the UI-SPEC `h-12`/48px touch-target floor).
- scroll-container = `<div className="overflow-auto max-h-[calc(100vh-420px)]">`
  (mirrors the leases-table precedent).
- The virtualized tbody is a raw `<tbody data-slot="table-body">` (height inline
  style) with flex rows positioned via per-row `transform: translateY(start)`. The
  ONLY two inline `style={{}}` uses are the tbody `height` and the per-row
  `transform` — the sanctioned `@tanstack/react-virtual` precedent from
  `leases-table.tsx`; no color/spacing tokens are inlined.

## Toolbar composition (DT-04 / DT-05 / DT-07)

`PortfolioDataTableToolbar<TData>({ table, viewMode, onViewModeChange, statusOptions? })`:
1. Search `Input` → `table.getColumn("property")?.setFilterValue(...)` (W-3).
2. `DataTableFacetedFilter column={table.getColumn("status")} multiple` — options
   default to the status column's `meta.options` (active/expiring/vacant) (DT-04).
3. `DataTableViewOptions table={table}` — reads `meta.label` (DT-05).
4. `role="radiogroup"` grid/table segmented toggle with `aria-checked` (DT-07),
   lifted from the hand-rolled `portfolio-toolbar.tsx`.
5. Reset control surfaced when `table.getState().columnFilters.length > 0`.

## Tests (11 total, all green)

`portfolio-data-table.test.tsx` (shared suite, `vi.unmock("nuqs")` scoped to the file
per the Wave-1 precedent, hosted under `NuqsTestingAdapter`):

- **PortfolioDataTableToolbar (4):** address-only-row survives search (W-3); faceted
  status lists options + narrows rows (DT-04); view-options lists hideable labels
  (DT-05); grid/table toggle radiogroup semantics + switches viewMode (DT-07).
- **PortfolioDataTable (7):** virtualizer tbody sized via `getTotalSize`;
  always-on for small + large datasets (D-2); aria-sort on `<th>` not the button
  (B-1); controlled visibility hides a column + fires the parent spy (B-2); grid
  view reads the same filtered rows (D-5); mobile `<=375px` forces grid (W-4);
  DataTablePagination footer present.

## Deviations from Plan

All deviations are mechanical (test-query disambiguation + acceptance-grep
literalism). No architectural or behavioral deviation — the contract matches the
plan exactly.

1. **[Rule 1 — Test correctness] view-options trigger is `role="combobox"`, not
   `role="button"`.** `DataTableViewOptions` renders its trigger with
   `role="combobox" aria-label="Toggle columns"` (and `hidden lg:flex`, so it is not
   reachable as a plain button in jsdom). The view-options + B-2 tests query
   `getByRole("combobox", { name: /toggle columns/i })`. No component change.

2. **[Rule 1 — Test correctness] popover-option disambiguation.** "Monthly Rent"
   renders both as a `<th>` and as a view-options popover row, and "Active" renders
   both as a faceted-filter option and a grid status badge. The tests target the
   popover/listbox `role="option"` to disambiguate (`findByRole("option", {...})`).
   No component change.

3. **[Verify-command syntax] `bun run test:unit -- --run <path>` double-passes
   `--run`.** The `test:unit` script already includes `--run`; ran
   `bun run test:unit -- <path>` (same effective command, the documented Wave-1
   workaround). No behavior change.

4. **[Acceptance-grep literalism] Three Task-2 greps are satisfied in intent, not by
   the literal count, because the patterns also match documentation comments:**
   - `grep -c "useVirtualizer"` returns `2` (plan expected `== 1`): the import line +
     the single call site. Virtualization is wired exactly once (`useVirtualizer({...})`
     in `PortfolioVirtualizedTable`). Same import-counting case as Wave-1 deviation #4.
   - `grep -Ec "length > [0-9]+.*virtual|threshold"` returns `1` (plan expected `0`):
     the sole match is the JSDoc line "no threshold branch" (describing the ABSENCE of
     a threshold). There is no threshold logic — the "always-on small + large" test is
     the real D-2 gate and passes.
   - `grep -Ec "dashboard-store|dashboard-presets-store"` returns `2` (controlled-component
     check): both matches are JSDoc text ("does NOT import `dashboard-store` or
     `dashboard-presets-store`"). `grep -nE "^import.*(dashboard-store|dashboard-presets-store)"`
     confirms ZERO actual store imports.

## Authentication gates

None. Pure UI component work; no auth boundary crossed.

## Known Stubs

None. Both components are fully wired against the real `useClientDataTable` table,
`portfolioColumns`, the vendored faceted filter / view-options / pagination, and the
`PortfolioGrid` card layout — no placeholder values, empty data sources, or
TODO/FIXME markers. The component is intentionally NOT mounted on a route in this
wave (mount is Plan 05-03's atomic swap), which is the only "not yet wired" surface
and is by design.

## Human-Visual Checkpoint (DEFERRED, non-blocking)

The phase's visual verification (sort-indicator color, sticky-header + virtualized
scroll behavior, hover-revealed Edit affordance, mobile forced-grid at `<=375px`,
faceted-filter popover chrome) requires the component to be rendered on a route.
Since this wave builds the component but does NOT mount it (mount is Plan 05-03's
atomic swap), the visual checkpoint is **deferred to post-Wave-3**. Not blocking
Wave 2.

## Note for Plan 05-03

`PortfolioDataTable` is the mount target. It is a controlled component, so Plan 05-03
must supply:
- `data: PortfolioRow[]` (the transformed RPC rows currently built inline in
  `dashboard.tsx`),
- `viewMode` + `onViewModeChange` from `dashboard-store` (DT-07),
- `columnVisibility` + `onColumnVisibilityChange` from `dashboard-presets-store`
  (DT-05, persisted),

then delete the three hand-rolled files (`portfolio-table.tsx`,
`portfolio-toolbar.tsx`, `portfolio-pagination.tsx`) in the same atomic swap. The
pinned search key is `"property"` — Plan 05-03b's preset snapshot reads/writes that
same key.

## Self-Check: PASSED

- `src/components/dashboard/components/portfolio-data-table.tsx` — FOUND (205 lines, exports `PortfolioDataTable`).
- `src/components/dashboard/components/portfolio-data-table-toolbar.tsx` — FOUND (132 lines, exports `PortfolioDataTableToolbar`).
- `src/components/dashboard/components/__tests__/portfolio-data-table.test.tsx` — FOUND (376 lines, 11 passing tests).
- Commit `3ad22f242` — FOUND in git log.
- Commit `0837c34e5` — FOUND in git log.
