---
phase: "05"
slug: dashboard-portfolio-datatable
milestone: v2.0
status: discussed
requirements: [DT-01, DT-02, DT-03, DT-04, DT-05, DT-06, DT-07, DT-08, DT-09]
---

# Phase 05 — Portfolio DataTable (v2.0)

## Goal

Replace the three hand-rolled portfolio components on the owner dashboard (`portfolio-table.tsx`, `portfolio-toolbar.tsx`, `portfolio-pagination.tsx`) with the already-vendored DiceUI DataTable composition (`src/components/data-table/*`). The new portfolio table is a TanStack Table v8 instance with a typed column model exposing `aria-sort` on every sortable header, a faceted status filter, column-visibility controls, row virtualization for long lists, and a grid/table view toggle. Live filter/sort/page state moves to nuqs URL params; only the atomic `viewMode` remains in Zustand. Saved filter presets persist to localStorage. When this phase ships, the three hand-rolled files no longer exist and the dashboard portfolio section is driven entirely by the shared DataTable stack.

## Requirements

- **DT-01** — Replace `portfolio-table.tsx` + `portfolio-toolbar.tsx` + `portfolio-pagination.tsx` with the vendored DiceUI DataTable composition (`src/components/data-table/*`).
- **DT-02** — New `useClientDataTable` hook: a thin client-side variant of `src/hooks/use-data-table.ts` with `manualPagination/Sorting/Filtering: false` over a single in-memory data array.
- **DT-03** — New `portfolio-columns.tsx` column model with `aria-sort` on every sortable header.
- **DT-04** — Faceted status filter via `DataTableFacetedFilter` (vendored).
- **DT-05** — Column visibility via `DataTableViewOptions` (vendored).
- **DT-06** — Row virtualization via `@tanstack/react-virtual` `useVirtualizer` (installed).
- **DT-07** — Grid/table view toggle — atomic state in `dashboard-store.ts` `viewMode`.
- **DT-08** — Saved filter presets in localStorage via new `dashboard-presets-store.ts` (Zustand persist slice).
- **DT-09** — Live filter/sort/page state in nuqs URL params; trim `dashboard-store.ts` to `viewMode` only.

**Success criteria:** sortable headers expose `aria-sort` + keyboard sort; faceted filter + column-visibility work and persist in URL (nuqs); save preset → refresh → re-apply (localStorage); grid/table toggle works + virtualized long lists; the 3 hand-rolled files no longer exist.

## What exists today

### Components (to be deleted — DT-01)
- `src/components/dashboard/components/portfolio-table.tsx` (221 lines) — dumb component; props `{ data, sortField, sortDirection, onSort }`. Hand-rolled `SortableHead` already emits native `aria-sort="ascending"|"descending"|"none"` on the `<th>` and wraps the label in a focusable `<button>`. `SortIndicator` renders `ArrowUp`/`ArrowDown`. **This is the aria-sort pattern DT-03 must preserve** (the vendored `DataTableColumnHeader` does NOT emit `aria-sort` today).
- `src/components/dashboard/components/portfolio-toolbar.tsx` (112 lines) — `Search` `Input`, status `<Select>` (single-select all/active/expiring/vacant), `Clear` button, and a grid/table `role="radiogroup"` segmented toggle with `aria-checked`.
- `src/components/dashboard/components/portfolio-pagination.tsx` (96 lines) — custom prev/next + numbered page window (`buildPageWindow`, ellipsis past 7 pages). No page-size selector.
- `src/components/dashboard/components/portfolio-grid.tsx` — grid (card) view, rendered when `viewMode === 'grid'`. Independent of the table; coexists post-Phase-5.

### Columns (7 total — `PortfolioRow` from `src/components/dashboard/dashboard-types.ts`)
| # | Column | Type | Sortable | Render notes |
|---|--------|------|----------|--------------|
| 1 | Property | string | yes (`property`) | name + address subtitle |
| 2 | Units | number | yes (`units`, by occupied) | `occupied/total` tabular |
| 3 | Tenants | string | no | `tenant` or `--` |
| 4 | Lease Status | enum (active/expiring/vacant) | yes (`status`) | amber-600 for expiring |
| 5 | Monthly Rent | currency | yes (`rent`) | right-aligned, `formatCurrency(v, {min/maxFractionDigits:0})`, tabular-nums |
| 6 | Maintenance | number | no | red if `>0`, `${n} open` or `--`, right-aligned |
| 7 | Actions | link | no | hover-revealed `Edit` → `/properties/{id}/edit` |

`PortfolioRow = { id, property, address, units: {occupied,total}, tenant: string|null, leaseStatus, leaseEnd: string|null, rent: number, maintenanceOpen: number }`.

### Data flow
1. `dashboard.tsx` receives `PropertyPerformanceItem[]` (RPC `owner_dashboard`, via `usePropertyPerformance()` in `src/hooks/api/use-dashboard-hooks.ts`).
2. Inline transform → `PortfolioRow[]` inside `dashboard.tsx`.
3. Filter (search text on property+address, case-insensitive; single status filter) → sort (4 fields, toggle direction) → slice by `currentPage * itemsPerPage` — all client-side array ops in `dashboard.tsx`.
4. Renders `PortfolioToolbar`, then `PortfolioTable` or `PortfolioGrid` by `viewMode`, then `PortfolioPagination`.

### `dashboard-store.ts` (64 lines, Zustand, no persistence/URL sync)
- State: `viewMode, searchQuery, statusFilter, sortField, sortDirection, currentPage, itemsPerPage(10)`.
- Actions: `setViewMode, setSearchQuery, setStatusFilter, clearFilters, handleSort, setCurrentPage`.
- 4 selector hooks: `useDashboardViewMode`, `useDashboardFilters`, `useDashboardSorting`, `useDashboardPagination`.
- **Only consumer is `dashboard.tsx`** (verified — `useDashboardStore()` destructured once at lines 19/82). No other file reads the store, so trimming is low-blast-radius.

### Infra already in place
- nuqs `NuqsAdapter` is **already wired** in `src/components/providers.tsx` (no provider work needed for DT-09).
- `@tanstack/react-table` v8, `@tanstack/react-virtual` ^3.13, `nuqs` ^2.8 all installed.
- Vendored DataTable suite is fully functional (`data-table/` has 8 components incl. toolbar, faceted-filter, view-options, pagination, column-header).
- `getSortingStateParser(columnIds)` exists in `src/lib/parsers.ts` for the nuqs sort param.
- `preferences-store.ts` shows the hand-rolled localStorage pattern (`persistDataDensity`/`getStoredDataDensity`, key `tenantflow-data-density`, enum-validate-on-read).

## Reuse vs Replace map

| Requirement | Closest existing analog (file:symbol) | Action |
|---|---|---|
| DT-01 table shell | `src/components/data-table/data-table.tsx:DataTable` | **reuse** (extend for virtualization, DT-06) |
| DT-01 toolbar | `src/components/data-table/data-table-toolbar.tsx:DataTableToolbar` | **reuse** (or compose search + faceted-filter + view-options directly) |
| DT-01 pagination | `src/components/data-table/data-table-pagination.tsx:DataTablePagination` | **reuse** |
| DT-01 delete | `portfolio-table.tsx`, `portfolio-toolbar.tsx`, `portfolio-pagination.tsx` | **delete** |
| DT-02 client hook | `src/hooks/use-data-table.ts:useDataTable` (server variant) | **new** `useClientDataTable` (strip manual modes + nuqs server-pagination coupling) |
| DT-03 columns | `portfolio-table.tsx:SortableHead` (aria-sort pattern) + `data-table-column-header.tsx:DataTableColumnHeader` | **new** `portfolio-columns.tsx` `ColumnDef<PortfolioRow>[]`; **extend** column-header to emit `aria-sort` |
| DT-04 status filter | `src/components/data-table/data-table-faceted-filter.tsx:DataTableFacetedFilter` | **reuse** (drives off `columnMeta.options`) |
| DT-05 column visibility | `src/components/data-table/data-table-view-options.tsx:DataTableViewOptions` | **reuse** |
| DT-06 virtualization | `@tanstack/react-virtual:useVirtualizer` + `leases-table.tsx` pattern (estimateSize/overscan) | **new** integration into `DataTable` body |
| DT-07 view toggle | `dashboard-store.ts:viewMode` + `portfolio-toolbar.tsx` segmented control | **reuse** (keep `viewMode` in store; lift toggle UI into new toolbar) |
| DT-08 presets | `preferences-store.ts:persistDataDensity` pattern (or Zustand `persist` middleware) | **new** `dashboard-presets-store.ts` |
| DT-09 URL state | `src/lib/parsers.ts:getSortingStateParser`, documents vault nuqs pattern (`documents-vault.client.tsx`) | **new** nuqs wiring; **extend** `dashboard-store.ts` (trim to `viewMode`) |
| shared types | `src/types/data-table.ts:{Option,QueryKeys}`, `src/lib/data-table.ts:getCommonPinningStyles` | **reuse** |
| currency | `src/lib/utils/currency.ts:formatCurrency` | **reuse** |
| row type | `src/components/dashboard/dashboard-types.ts:PortfolioRow` | **reuse** |

## UI-SPEC constraints (milestone-wide DataTable rules — inherited from 01-UI-SPEC)

- **Row height:** hard minimum `h-12` (48px) for the 44×44 touch-target rule. Default band `h-12 py-2.5`. No user density toggle in v2.0 (deferred to Phase 6).
- **Tokens only:** active sort indicator `--color-primary` (reserved accent); container `--color-card`; header text `text-muted-foreground`; row hover `--shadow-md`; filter/toggle chrome `--color-muted`; visibility popover `--shadow-lg`. No hex, no inline styles.
- **Typography:** headers `text-sm`/`font-semibold`; cells `text-base`/`font-normal`; status badges `text-xs`.
- **Accessibility (DT-03):** every sortable header exposes `aria-sort="none|ascending|descending"` (WCAG 2.1 AA) and is a `<button>` with `focus-visible:outline-2 outline-offset-2 outline-ring`. View-toggle keeps `aria-checked`/radiogroup semantics.
- **Motion:** ≤ 1 `BlurFade` per page for the whole table (not per-row); hover transitions inherit the global `prefers-reduced-motion` guard in `globals.css`.
- **Numbers:** dollar cells use `formatCurrency` (canonical, no duplicate helper); all numeric cells `tabular-nums` + right-aligned. `formatNumber`/`formatPercent` siblings may need creation if referenced.
- **Mobile (≤375px, success criterion):** force grid view (card stack, 1 column, full-width tiles) — no horizontal-scroll fallback.

## Risks / gotchas

- **aria-sort regression.** The vendored `DataTableColumnHeader` uses a dropdown and does **not** emit `aria-sort` on the `<th>`. The hand-rolled `portfolio-table.tsx` does. DT-03 must extend the column-header (or render headers from the column model) so the success criterion holds; do not silently lose accessibility by adopting the vendored header as-is.
- **Client vs. server pagination reconciliation.** `useDataTable` is built for server-side (`manualPagination/Sorting/Filtering: true`, `pageCount` required, nuqs-driven). `useClientDataTable` (DT-02) must flip all manual flags to `false` and let TanStack compute `pageCount` from the in-memory array — but still mirror the resulting page/sort/filter state **out** to nuqs for DT-09. Getting this wrong yields double-pagination or a frozen page count.
- **Virtualization + sticky header + pagination.** DT-06 virtualizes rows; the vendored `DataTable` relies on pagination, not virtualization. Combining a virtualized `<tbody>` (absolute-positioned rows, `getTotalSize()` height) with a sticky `<thead>` and the existing pagination footer needs care — measure portfolio row height (leases use 72px, tenants 56px) and decide whether virtualization is always-on or threshold-gated.
- **nuqs ↔ Zustand state-ownership ordering.** DT-09 makes the URL the source of truth for filter/sort/page while `viewMode` stays in Zustand (DT-07). Two stores updating the same render must not fight: define one owner per field. Hydration order matters — nuqs reads from URL on mount; ensure the table initializes from URL, not from stale store defaults.
- **Trimming `dashboard-store.ts` without breaking consumers.** Only `dashboard.tsx` consumes the store, but it destructures `searchQuery/statusFilter/sortField/sortDirection/currentPage/itemsPerPage` inline. Removing them from the store means rewriting those reads in `dashboard.tsx` to read from nuqs/the table instance in the same change — the 4 selector hooks (`useDashboardFilters/Sorting/Pagination`) become dead and must be deleted, leaving only `useDashboardViewMode`.
- **Preset shape coupling.** If DT-08 presets store `columnVisibility` (a DT-05 concern) plus nuqs filters/sort (DT-09), the preset apply path crosses both the local table state and the URL. Decide the preset payload shape up front (open decision below) so save/restore round-trips cleanly across refresh.
- **Faceted-filter option source.** `DataTableFacetedFilter` reads `columnMeta.options`. The status enum is fixed (active/expiring/vacant); hard-coding is simpler than `getFacetedUniqueValues`, but counts then need wiring manually.

## Resolved decisions (discuss-phase, 2026-05-30)

| # | Decision | Resolution | Rationale |
|---|----------|-----------|-----------|
| D-1 | **Preset payload shape** (DT-08) | A preset is a **full view snapshot**: filters + sort + column visibility + page. | User chose "all". One named preset restores the entire view state on apply. |
| D-2 | **Virtualization activation** (DT-06) | **Always-on**, virtualize the visible (post-pagination) page — one code path. | User chose always-on. Single sticky-header + virtual-tbody integration; near-no-op at small row counts, scales cleanly. No threshold branch to test. |
| D-3 | **Column-visibility persistence** (DT-05) | **localStorage**, in the same Zustand `persist` slice as presets. | Since D-1 makes presets capture column visibility, persistence lives in one store (`dashboard-presets-store.ts`). Mirrors the existing `preferences-store.ts` localStorage pattern. Sticky per-user across sessions. |
| D-4 | **nuqs param strategy** (DT-09) | **Flat typed params**, mirroring `src/hooks/use-data-table.ts` exactly: `page`/`perPage` via `parseAsInteger`, `sort` via `getSortingStateParser`, per-column filter keys with `,`-separated arrays (`ARRAY_SEPARATOR`). | Canonical in-repo pattern (the server `useDataTable` already does this; `useClientDataTable` must be URL-compatible with it) AND the upstream DiceUI/nuqs idiom. Decided via canonical research, not a JSON blob. |
| D-5 | **Mobile / grid filter parity** (default, not contested) | Grid view (and the forced-grid mobile view ≤375px) reads the **same** nuqs filter/sort state as the table; only the render mode differs (`viewMode` in Zustand). | Keeps a single source of truth for filter/sort regardless of view; consistent with the UI-SPEC mobile rule (force grid, no horizontal scroll). |

### Net store layout after Phase 5
- `dashboard-store.ts` → trimmed to **`viewMode` only** (+ `useDashboardViewMode`); the 3 filter/sort/pagination selector hooks deleted.
- `dashboard-presets-store.ts` (**new**, Zustand `persist`) → named presets, each `{ name, filters, sort, columnVisibility, page }`, **plus** the live `columnVisibility` (D-3).
- nuqs URL → live `page`/`perPage`/`sort`/per-column-filter state (D-4); the source of truth for filter/sort/page.
