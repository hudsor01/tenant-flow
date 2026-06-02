---
phase: "05"
plan: 01b
subsystem: dashboard-portfolio-datatable
tags: [data-table, accessibility, aria-sort, column-model, tanstack-table]
requires:
  - "src/hooks/use-client-data-table.ts (05-01a, already shipped)"
  - "src/components/data-table/data-table-column-header.tsx (vendored DiceUI header)"
  - "src/components/dashboard/dashboard-types.ts (PortfolioRow)"
  - "src/lib/utils/currency.ts (formatCurrency)"
  - "src/types/data-table.ts (ColumnMeta augmentation)"
provides:
  - "getAriaSort(column): \"none\"|\"ascending\"|\"descending\" — for Plan 05-02's <TableHead aria-sort={...}>"
  - "portfolioColumns: ColumnDef<PortfolioRow>[] — the 7-column portfolio table model"
  - "pinned search nuqs key: \"property\" (the Property column id)"
affects:
  - "Plan 05-02 (assembled table + toolbar): consumes portfolioColumns + getAriaSort + status meta.options + meta.labels"
  - "Plan 05-03b (preset snapshot): reads/writes the SAME \"property\" search key"
tech-stack:
  added: []
  patterns:
    - "aria-sort lives on <th role=columnheader>, never on the flexRendered header button (B-1)"
    - "custom name||address filterFn preserves search parity vs a default substring filter"
    - "faceted status filter driven off columnMeta.options + array-membership filterFn"
key-files:
  created:
    - "src/components/dashboard/components/portfolio-columns.tsx"
    - "src/components/dashboard/components/__tests__/portfolio-columns.test.tsx"
    - "src/components/data-table/__tests__/data-table-column-header.test.tsx"
  modified:
    - "src/components/data-table/data-table-column-header.tsx"
decisions:
  - "Enter/Space on the header trigger does a fast direct sort toggle (does NOT open the dropdown); mouse users keep the full asc/desc/reset/hide dropdown"
  - "Status faceted filter uses meta.variant: \"multiSelect\" (multi-status URL arrays) over single \"select\""
  - "Active sort indicator tinted via the --color-primary token (text-primary), no hex"
metrics:
  duration: "~12m"
  completed: "2026-05-30"
  tasks: 2
  files: 4
  tests: 13
---

# Phase 05 Plan 01b: Portfolio Column Model + aria-sort Helper Summary

Shipped DT-03 (typed `ColumnDef<PortfolioRow>[]` column model + the aria-sort regression fix) plus the DT-04/DT-05 metadata hooks. The vendored `DataTableColumnHeader` now exports a reusable `getAriaSort(column)` helper so a consuming `<th role="columnheader">` carries `aria-sort` (B-1: never on the flexRendered button), and is keyboard-operable with a token focus ring. `portfolio-columns.tsx` reproduces the 7 hand-rolled portfolio columns as a typed column model with a name||address search filterFn, faceted status metadata, and per-column labels.

## What was built

### Task 1 — Extend `DataTableColumnHeader` (commit `18a155a31`)
Additive, two changes; the existing asc/desc/reset/hide dropdown is preserved verbatim for mouse users:

1. **Exported `getAriaSort<TData, TValue>(column): "none" | "ascending" | "descending"`** deriving from `column.getIsSorted()` (`"asc" → "ascending"`, `"desc" → "descending"`, else `"none"`). The helper is the contract Plan 05-02 consumes. **No `aria-sort` is set anywhere inside this component's JSX** — the button can never be the `role="columnheader"` element (`grep -c "aria-sort"` on the file == 0).
2. **Keyboard-operable focus-ringed sort trigger.** `onKeyDown` handles Enter/Space → `column.toggleSorting(...)` (fast sort without opening the dropdown). The trigger carries `focus-visible:outline-2 outline-offset-2 outline-ring`; the active sort indicator is tinted via `--color-primary` (`[&_svg]:text-primary` when sorted), no hex.

### Task 2 — `portfolio-columns.tsx` (commit `e5aedabd0`)
`portfolioColumns: ColumnDef<PortfolioRow>[]`, 201 lines (< 300 cap). Two tiny presentational helpers (`LeaseStatusCell`, `MaintenanceCell`) keep each cell render under the 50-line cap.

## Column model

| id | accessor | sortable | filterable | hideable | notes |
|----|----------|----------|------------|----------|-------|
| `property` | `property` | yes | yes (custom name\|\|address filterFn) | yes | name (font-medium) + address subtitle |
| `units` | `units` | yes (sortingFn by `units.occupied`) | no | yes | `occupied/total` tabular-nums |
| `tenant` | `tenant` | **no** | no | yes | tenant text or muted `--` (aria-label "No tenants") |
| `status` | `leaseStatus` | yes | yes (faceted, array-membership) | yes | amber-600/dark:amber-500 for "expiring" |
| `rent` | `rent` | yes | no | yes | right-aligned tabular-nums `formatCurrency(v, {min/max:0})` |
| `maintenance` | `maintenanceOpen` | **no** | no | yes | right-aligned red `{n} open` (>0) or muted `--` |
| `actions` | — | **no** | no | **no (enableHiding:false)** | hover-revealed Edit `<Link>` → `/properties/{id}/edit` |

### Pinned search nuqs key: **`"property"`**
Search filters the Property column via its name||address `filterFn`, so the per-column flat nuqs key is the column id **`"property"`**. **Plan 05-02's toolbar MUST do `table.getColumn("property")?.setFilterValue(value)`** and **Plan 05-03b's preset snapshot MUST read/write the SAME `"property"` key.** Do not invent a separate `"search"`/`"q"` key — search IS the Property column filter.

### Status `meta.options` (Plan 05-02 faceted filter)
```ts
[
  { label: "Active",        value: "active"   },
  { label: "Expiring Soon", value: "expiring" },
  { label: "Vacant",        value: "vacant"   },
]
```
`meta.variant: "multiSelect"`, `enableColumnFilter: true`. The status `filterFn` includes a row when the selected-values array (or empty = no filter) contains `row.original.leaseStatus`.

### `meta.label` list (Plan 05-02 view options)
`Property`, `Units`, `Tenants`, `Lease Status`, `Monthly Rent`, `Maintenance`, `Actions`.

## getAriaSort signature + Plan 05-02 instruction
```ts
export function getAriaSort<TData, TValue>(
  column: Column<TData, TValue>,
): "none" | "ascending" | "descending"
```
**Plan 05-02 renders the thead as `<TableHead aria-sort={getAriaSort(column)}>`** so `aria-sort` lands on the `<th role="columnheader">`. The header button (rendered by `DataTableColumnHeader`) must NOT carry `aria-sort`. The table is built via `useClientDataTable({ data, columns: portfolioColumns, getRowId })`.

## W-1 second-consumer safety
The existing `src/app/(owner)/properties/units/columns.tsx` (7 `DataTableColumnHeader` usages) is unchanged and still renders + sorts with **no console.error** after the extension — pinned by the "W-1 units-table 2nd consumer" smoke test (spies on `console.error`, asserts not called, asserts 7 columnheaders render and a sortable Rent header toggles via keyboard).

## Tests (13 total, all green)
- `data-table-column-header.test.tsx` — **6 tests**: getAriaSort mapping (read off a real `<th>` across re-renders), keyboard Enter/Space sort, focus-ring classes present, **button has no aria-sort (B-1)**, plain-label fallback for non-sortable/non-hideable, **W-1 units-table smoke (no console.error)**.
- `portfolio-columns.test.tsx` — **7 tests**: exports 7 columns w/ expected ids, sortable flags, **Property filterFn matches name OR address (W-3)** incl. address-only-passes + no-match-fails, status faceted metadata (DT-04), status array-membership filterFn, every-column meta.label + actions not hideable (DT-05), **cell rendering + aria-sort on the `<th>` via getByRole (B-1)** through a real flexRendered table harness.

## Acceptance gates (all met)
- `grep -c "getAriaSort"` ≥ 1 + exported; `grep -Ec "ascending|descending"` ≥ 1; **`grep -c "aria-sort"` == 0** in the header file; `focus-visible:outline-2` ≥ 1; `onKeyDown` ≥ 1.
- `portfolio-columns.tsx`: `export const portfolioColumns` ×1; `filterFn` ≥ 2 (Property + Status); `multiSelect` ≥ 1; active/expiring/vacant ≥ 3; `formatCurrency` ≥ 1; `DataTableColumnHeader` ≥ 1; `enableHiding: false` ×1; **201 lines < 300**.
- No `any`, no `as unknown as`, no inline `style={{`, no hex; lucide-only; tokens-only — verified by grep on both source files.
- B-1 jsdom gate: the column-model test asserts `getByRole("columnheader", { name: /property/i }).getAttribute("aria-sort")` ∈ {none, ascending, descending} AND the inner button's `aria-sort` is null.
- `bun run typecheck` exits 0; `biome` clean; full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) green on both commits.

## Deviations from Plan
**None material.** The only delta: the plan specified "6 behavior tests" per file; `portfolio-columns.test.tsx` ships **7** because the Lease-Status filterFn array-membership assertion was split into its own `it()` (rather than folded into the faceted-metadata test) for a sharper failure signal. This is a strict superset of the required behaviors — no required test was dropped or weakened.

## Notes for Plan 05-02
- `portfolioColumns` is the column source; build the table via `useClientDataTable({ data, columns: portfolioColumns, getRowId })`.
- Render the thead with `<TableHead aria-sort={getAriaSort(column)}>` — this is the only correct place for `aria-sort`.
- Toolbar search → `table.getColumn("property")?.setFilterValue(value)` (the pinned `"property"` key).
- Faceted status filter reads `columnMeta.options` off the `status` column (zero extra wiring).
- View-options menu reads `columnMeta.label` off every column.

## Human-visual checkpoint
The phase's visual verification (sort indicator color, hover-revealed Edit affordance, focus-ring appearance) is a Wave-2/05-02 concern once the table is assembled and mounted — **non-blocking for Wave 1**. Wave 1 ships only the column model + getAriaSort helper; nothing is rendered on a route yet.

## Self-Check: PASSED
- `src/components/data-table/data-table-column-header.tsx` — FOUND (modified)
- `src/components/dashboard/components/portfolio-columns.tsx` — FOUND
- `src/components/dashboard/components/__tests__/portfolio-columns.test.tsx` — FOUND
- `src/components/data-table/__tests__/data-table-column-header.test.tsx` — FOUND
- Commit `18a155a31` — FOUND
- Commit `e5aedabd0` — FOUND
