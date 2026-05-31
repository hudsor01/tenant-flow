---
phase: "05"
plan: 01b
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/data-table/data-table-column-header.tsx
  - src/components/dashboard/components/portfolio-columns.tsx
  - src/components/dashboard/components/__tests__/portfolio-columns.test.tsx
  - src/components/data-table/__tests__/data-table-column-header.test.tsx
autonomous: true
requirements: [DT-03, DT-04, DT-05]

must_haves:
  truths:
    - "DataTableColumnHeader exposes the column's sort state as a reusable helper `getAriaSort(column): \"none\"|\"ascending\"|\"descending\"` (derived from column.getIsSorted()) so the consuming <th> can set aria-sort — aria-sort is NOT set inside the flexRendered <button>, because aria-sort is only valid on the element with role=columnheader (the <th>/<TableHead>)"
    - "DataTableColumnHeader's sort trigger is a <button>-semantics control with focus-visible:outline-2 outline-offset-2 outline-ring and toggles sort via keyboard (Tab + Enter/Space); keyboard sort stays on the header button, NOT on the <th>"
    - "portfolio-columns.tsx exports portfolioColumns: ColumnDef<PortfolioRow>[] with the 7 portfolio columns (Property, Units, Tenants, Lease Status, Monthly Rent, Maintenance, Actions)"
    - "Property/Units/Lease Status/Monthly Rent are enableSorting:true; Tenants/Maintenance/Actions are enableSorting:false"
    - "the Property column declares a custom filterFn that matches the search string against property NAME OR ADDRESS (case-insensitive substring), preserving the existing dashboard.tsx search parity (name||address) — a default substring filter on the property accessor alone would drop address matches and is a regression"
    - "the Lease Status column declares meta.variant:'select' (or 'multiSelect') + meta.options for the faceted filter (active/expiring/vacant) and enableColumnFilter:true (DT-04 source)"
    - "every column declares meta.label so DataTableViewOptions (DT-05) shows a human label; Actions/selection columns set enableHiding:false where appropriate"
    - "Monthly Rent + Maintenance + Units cells are tabular-nums right-aligned; Monthly Rent uses formatCurrency with 0 fraction digits"
    - "the extension to DataTableColumnHeader is ADDITIVE: the existing second consumer src/app/(owner)/properties/units/columns.tsx (7 headers) still renders + sorts with no console error after the change"
  artifacts:
    - path: "src/components/data-table/data-table-column-header.tsx"
      provides: "Vendored column header EXTENDED: keyboard-sortable focus-ringed button + exported getAriaSort(column) helper for the <th> to consume"
      contains: "getAriaSort"
    - path: "src/components/dashboard/components/portfolio-columns.tsx"
      provides: "ColumnDef<PortfolioRow>[] portfolio column model"
      exports: ["portfolioColumns"]
      min_lines: 120
    - path: "src/components/dashboard/components/__tests__/portfolio-columns.test.tsx"
      provides: "Column-model unit tests incl. aria-sort-on-<th> assertion + sortable/filterable flags + name||address filterFn"
      contains: "aria-sort"
  key_links:
    - from: "src/components/dashboard/components/portfolio-columns.tsx"
      to: "src/components/data-table/data-table-column-header.tsx"
      via: "header render-fn renders <DataTableColumnHeader column={...} label={...}/>"
      pattern: "DataTableColumnHeader"
    - from: "src/components/dashboard/components/portfolio-columns.tsx"
      to: "#lib/utils/currency formatCurrency"
      via: "Monthly Rent cell formats dollars"
      pattern: "formatCurrency"
    - from: "src/components/data-table/data-table-column-header.tsx"
      to: "src/app/(owner)/properties/units/columns.tsx (existing 2nd consumer)"
      via: "additive extension must not regress the 7 units-table headers"
      pattern: "getAriaSort|aria-sort"
---

<objective>
Ship DT-03 (column model + the aria-sort regression fix) plus the DT-04/DT-05 metadata hooks. Two artifacts:

1. **Extend the vendored `DataTableColumnHeader`** so sorting is keyboard-operable AND it EXPOSES the column's sort state as a reusable `getAriaSort(column)` helper. The critical accessibility correctness here (B-1 from plan-check): `aria-sort` is only valid on the element carrying `role="columnheader"` — that is the `<th>` / `<TableHead>`. The vendored `DataTableColumnHeader` renders a `<button>` that `data-table.tsx` `flexRender`s INSIDE the `<th>`; that button can NEVER be the `<th>`, so `aria-sort` must NOT live on the button. Instead this plan exports a small `getAriaSort(column)` helper (and/or forwards the sort state) so Plan 05-02's `<TableHead aria-sort={getAriaSort(column)}>` sets the attribute on the actual `<th>`. Keyboard sort (Tab to the header button + Enter/Space) stays on the header button.
2. **Create `portfolio-columns.tsx`** — a typed `ColumnDef<PortfolioRow>[]` reproducing the 7 portfolio columns, with sortable headers (via the extended column-header), the Property column carrying a custom `filterFn` that matches name||address (search-parity, W-3), the Lease Status column carrying `meta.options` for the DT-04 faceted filter, and `meta.label` on every column for the DT-05 view-options menu.

Purpose: DT-03 is the accessibility-critical heart of the phase. The success criterion is literally "clicking a sortable column header sorts the rows and exposes `aria-sort` on that header; keyboard users can sort via Tab + Enter/Space." Because the button cannot be the header element, the only correct way to land `aria-sort` on `role="columnheader"` is to surface the sort state to the `<th>` — this plan provides the `getAriaSort` helper that does exactly that, and Plan 05-02 renders `<TableHead aria-sort={getAriaSort(column)}>`. The column model is also the single source of truth that the faceted filter (DT-04, reads `columnMeta.options`) and the view-options menu (DT-05, reads `columnMeta.label`) drive off — so getting the metadata right here unblocks both downstream reuses with zero extra wiring.

Output:
- `src/components/data-table/data-table-column-header.tsx` — extended to render a focus-visible keyboard-sortable button while preserving the existing dropdown (asc/desc/reset/hide) affordance, AND exporting `getAriaSort(column)`.
- `src/components/dashboard/components/portfolio-columns.tsx` — `portfolioColumns: ColumnDef<PortfolioRow>[]`.
- Two test files: a column-header keyboard + getAriaSort test, and a column-model test (sortable/filterable/hideable flags + cell rendering + name||address filterFn + aria-sort-on-<th> through a real flexRendered table).

NO `useClientDataTable` here (that is Plan 05-01a). NO assembled table component (Plan 05-02). NO mount (Plan 05-03). This is the column layer only.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md
@.planning/phases/01-foundation-dedup/01-UI-SPEC.md
@CLAUDE.md
@src/components/data-table/data-table-column-header.tsx
@src/app/(owner)/properties/units/columns.tsx
@src/components/dashboard/components/portfolio-table.tsx
@src/components/dashboard/dashboard-types.ts
@src/lib/utils/currency.ts
@src/types/data-table.ts

<interfaces>
<!-- aria-sort pattern to PRESERVE — currently in portfolio-table.tsx:SortableHead (being deleted in Plan 05-03). -->
<!-- Reproduce its semantics but on the CORRECT element: -->
<!--   - <th aria-sort="ascending"|"descending"|"none"> (role=columnheader) — set by Plan 05-02 via getAriaSort(column) -->
<!--   - inner focusable <button> with focus-visible:outline-2 outline-offset-2 outline-ring (keyboard sort lives here, NOT aria-sort) -->

From src/components/data-table/data-table-column-header.tsx (CURRENT — to extend):
- Props: `{ column: Column<TData, TValue>; label: string }` + DropdownMenuTrigger props.
- Early return `<div>{label}</div>` when `!getCanSort() && !getCanHide()`.
- The sort affordance is rendered INSIDE the <th> (the parent data-table.tsx flexRenders the header into a <th>) — so this component's root cannot be the <th> and must not carry aria-sort.

EXISTING SECOND CONSUMER (W-1) — src/app/(owner)/properties/units/columns.tsx:
- Uses `<DataTableColumnHeader column={...} title=.../>` (or `label`) for 7 headers (confirmed: 7 usages).
- The extension MUST be additive: adding the `getAriaSort` export + onKeyDown keyboard-sort + focus classes must not break this file. It is fine if units/columns.tsx does not yet set aria-sort on its own <th> (that table predates this phase) — but it MUST still render + sort with no console error after the change.

From src/components/dashboard/dashboard-types.ts:
```typescript
export type PortfolioRow = {
  id: string; property: string; address: string;
  units: { occupied: number; total: number };
  tenant: string | null;
  leaseStatus: "active" | "expiring" | "vacant";
  leaseEnd: string | null; rent: number; maintenanceOpen: number;
};
```

From src/lib/utils/currency.ts:
```typescript
export const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) => string
// Portfolio rent uses { minimumFractionDigits: 0, maximumFractionDigits: 0 }
```

From src/types/data-table.ts (ColumnMeta augmentation — already declared, just populate it):
```typescript
interface ColumnMeta<TData, TValue> { label?; placeholder?; variant?: FilterVariant; options?: Option[]; ... }
export interface Option { label: string; value: string; count?: number; icon?: FC<...> }
```

EXISTING SEARCH BEHAVIOR to preserve (W-3) — from dashboard.tsx lines 117-125:
```typescript
// search matches property NAME or ADDRESS, case-insensitive substring
if (searchQuery) {
  const query = searchQuery.toLowerCase();
  if (!(row.property ?? "").toLowerCase().includes(query) &&
      !(row.address ?? "").toLowerCase().includes(query)) return false;
}
```
The Property column's custom filterFn must reproduce this OR-match (name||address). A default substring filterFn on the `property` accessor alone drops address matches = regression.

Column render notes (from 05-CONTEXT.md "Columns" table):
| Property: name + address subtitle, filterFn matches name||address | Units: occupied/total tabular, sort by occupied | Tenants: tenant or "--", not sortable |
| Lease Status: active/expiring/vacant, amber-600 for expiring, faceted-filterable | Monthly Rent: right-aligned formatCurrency 0-frac tabular | Maintenance: red if >0, "{n} open" or "--", not sortable | Actions: hover-revealed Edit → /properties/{id}/edit, not sortable/hideable |
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend DataTableColumnHeader — keyboard-sortable button + exported getAriaSort(column) helper (no aria-sort on the button)</name>
  <files>src/components/data-table/data-table-column-header.tsx, src/components/data-table/__tests__/data-table-column-header.test.tsx</files>
  <read_first>
    - src/components/data-table/data-table-column-header.tsx (CURRENT — the dropdown header to extend; preserve the asc/desc/reset/hide dropdown items)
    - src/components/dashboard/components/portfolio-table.tsx (lines 37-92 — SortableHead/sortState: the EXACT aria-sort mapping + focus-visible classes to reproduce)
    - src/app/(owner)/properties/units/columns.tsx (FULL — the existing 2nd consumer; confirm the extension does not break its 7 headers)
    - .planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md ("aria-sort regression" risk; UI-SPEC § Accessibility — aria-sort + focus-visible:outline-2 outline-offset-2 outline-ring required)
    - .planning/phases/01-foundation-dedup/01-UI-SPEC.md (active sort indicator uses --color-primary; tokens only; no inline styles)
    - CLAUDE.md (Zero Tolerance: no any, lucide icons only, Tailwind only, no inline styles; icon-only buttons need aria-label)
  </read_first>
  <behavior>
    - Test "getAriaSort maps sort state": `getAriaSort` returns `"none"` when the column is unsorted, `"ascending"` when `column.getIsSorted() === "asc"`, `"descending"` when `=== "desc"`. (Drive a real minimal TanStack column or a typed Column-shaped stub.)
    - Test "keyboard sort": the sort control is a focusable button reachable by Tab; a `keydown` Enter (and Space) on it toggles sorting (fires `column.toggleSorting`).
    - Test "focus ring classes present": the sort control carries `focus-visible:outline-2`, `outline-offset-2`, `outline-ring` (or the project's token equivalent from UI-SPEC).
    - Test "button does NOT carry aria-sort": the rendered sort button has NO `aria-sort` attribute (aria-sort belongs on the <th>, not the button). Assert `screen.getByRole("button").getAttribute("aria-sort") === null`.
    - Test "non-sortable, non-hideable still renders label": a column with neither capability renders a plain label with no button and no aria-sort.
    - Test "units-table consumer still works (W-1 smoke)": render `unitColumns` (from `src/app/(owner)/properties/units/columns.tsx`) through a minimal real TanStack table + flexRender; assert the 7 headers render and a sortable one toggles sort with NO thrown error / NO React console.error (spy on console.error and assert not called).
  </behavior>
  <action>
    Extend `src/components/data-table/data-table-column-header.tsx`. Two additive changes (preserve the existing dropdown for mouse users verbatim):

    1. **Export a `getAriaSort(column)` helper** (B-1 fix). Add and export `export function getAriaSort<TData, TValue>(column: Column<TData, TValue>): "none" | "ascending" | "descending"` deriving from `column.getIsSorted()`: `"asc" → "ascending"`, `"desc" → "descending"`, otherwise `"none"` (the mapping from `portfolio-table.tsx:sortState` lines 39-46). Do NOT set `aria-sort` anywhere inside this component's returned JSX — the component renders a `<button>` that `data-table.tsx` flexRenders INSIDE a `<th>`, and a button can never be the element with `role="columnheader"`. Plan 05-02 calls `getAriaSort(column)` and sets it on `<TableHead aria-sort={...}>`. (The header component MAY also forward the raw sort state, but the helper is the contract Plan 05-02 consumes.)

    2. **Make the sort trigger keyboard-operable with a visible focus ring.** Keep the existing DropdownMenu (asc/desc/reset/hide) for mouse users, but ensure the trigger is a real `<button>` with the UI-SPEC focus classes: `focus-visible:outline-2 outline-offset-2 outline-ring`. Add Enter/Space `onKeyDown` handling that toggles sort direction when `column.getCanSort()` (so keyboard users get a fast sort without opening the dropdown), matching the hand-rolled `<button onClick={() => onSort(field)}>` affordance. The active sort indicator icon (ChevronUp/Down) stays lucide-only; color the active state with `--color-primary` (token, no hex) per UI-SPEC.

    KEEP THE EXTENSION ADDITIVE (W-1). The existing second consumer `src/app/(owner)/properties/units/columns.tsx` passes `<DataTableColumnHeader column={...} title/label=.../>` for 7 headers. The new `getAriaSort` export + onKeyDown + focus classes must not change the existing call signature or break those headers — exported helper is opt-in; the button changes are internal. After the edit, the units table must still render + sort with no console error (pinned by the W-1 smoke test).

    Tokens only, Tailwind only, no inline styles (Zero Tolerance). Preserve the existing dropdown items verbatim (asc/desc/reset/hide) — additive. No `any`. Keep the file's existing single-component shape (no barrel; the `getAriaSort` named export lives in this same file).

    Also create `src/components/data-table/__tests__/data-table-column-header.test.tsx` implementing the 6 <behavior> tests (render with a real minimal TanStack table via `useReactTable` so `column.getIsSorted()` / `toggleSorting` are genuine; for the W-1 smoke, import the real `unitColumns`). Prefer a real table instance to avoid `as unknown as` on a hand-built column.
  </action>
  <verify>
    <automated>bun run test:unit -- --run src/components/data-table/__tests__/data-table-column-header.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "getAriaSort" src/components/data-table/data-table-column-header.tsx` >= 1 AND it is exported (`grep -Ec "export (function|const) getAriaSort" ...` >= 1).
    - `grep -Ec "ascending|descending" src/components/data-table/data-table-column-header.tsx` >= 1 (the sort-state mapping exists, inside getAriaSort).
    - `grep -c "aria-sort" src/components/data-table/data-table-column-header.tsx` == 0 (aria-sort is NOT set inside this component — it belongs on the <th> rendered by Plan 05-02; the button must not carry it).
    - `grep -c "focus-visible:outline-2" src/components/data-table/data-table-column-header.tsx` >= 1.
    - `grep -c "onKeyDown" src/components/data-table/data-table-column-header.tsx` >= 1 (keyboard sort).
    - The 6 header tests pass — including the "button does NOT carry aria-sort" test and the W-1 units-table smoke (no console.error).
    - No `any` / `as unknown as`: `grep -E ":\s*any[^a-z]|<any>|as unknown as" src/components/data-table/data-table-column-header.tsx` returns zero matches.
    - No inline styles: `grep -c "style={{" src/components/data-table/data-table-column-header.tsx` returns 0.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>Column header now exports getAriaSort(column) for the <th> to consume (aria-sort NOT on the button) + a keyboard-operable, focus-ringed sort control; existing dropdown + the units-table 2nd consumer preserved (W-1 smoke green); 6 tests pass; tokens-only, no any.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Author portfolio-columns.tsx (7-column ColumnDef<PortfolioRow>[] with name||address filterFn + filter/visibility metadata)</name>
  <files>src/components/dashboard/components/portfolio-columns.tsx, src/components/dashboard/components/__tests__/portfolio-columns.test.tsx</files>
  <read_first>
    - src/components/dashboard/components/portfolio-table.tsx (FULL — the exact cell rendering to reproduce per column: name+address, occupied/total, "--" empties, amber-600 expiring, formatCurrency rent, red maintenance, hover Edit link)
    - src/components/dashboard/dashboard.tsx (lines 114-148 — the EXACT name||address search filter + the occupied-sort behavior to reproduce as a column filterFn / sortingFn)
    - src/components/data-table/data-table-column-header.tsx (extended in Task 1 — the header render fn uses <DataTableColumnHeader column label/>; getAriaSort is for Plan 05-02's <th>)
    - src/components/dashboard/dashboard-types.ts (PortfolioRow shape + the leaseStatus union)
    - src/lib/utils/currency.ts (formatCurrency, 0-fraction options object)
    - src/types/data-table.ts (ColumnMeta.label/variant/options; Option shape)
    - .planning/phases/01-foundation-dedup/01-UI-SPEC.md (row height h-12 min; tabular-nums; status badge text-xs; tokens only; amber via token not hex if a token exists, else preserve existing amber-600/dark:amber-500 as the established dashboard pattern)
    - CLAUDE.md (Zero Tolerance: no any, lucide icons, Tailwind only, tokens; 300-line component / 50-line function caps; Link from next/link for Actions; no string-literal query keys — N/A here)
  </read_first>
  <behavior>
    - Test "exports 7 columns": `portfolioColumns.length === 7` with ids/accessors property, units, tenant, status, rent, maintenance, actions (or the agreed id set).
    - Test "sortable flags": property/units/status/rent have `enableSorting !== false`; tenant/maintenance/actions have `enableSorting === false`.
    - Test "Property filterFn matches name OR address (W-3)": construct two rows — one whose ADDRESS (not name) contains the query, one matching neither. Run the Property column's `filterFn` with the query; assert the address-only row PASSES and the no-match row FAILS. (This pins the search-parity regression guard.)
    - Test "status column is faceted-filterable": the status column has `enableColumnFilter === true`, `meta.variant` in {"select","multiSelect"}, and `meta.options` listing active/expiring/vacant.
    - Test "view-options metadata": every column has a `meta.label` string; the actions column has `enableHiding === false`.
    - Test "cell rendering + aria-sort lands on the <th> through a real table": mount a minimal `<table>` flexRendering these columns' headers into real `<th>` elements with `aria-sort={getAriaSort(column)}` (the Plan-05-02 pattern, exercised here in the test harness) + one PortfolioRow body; assert the rent cell is the formatCurrency 0-frac string, the units cell is "occupied/total", "--" for null tenant, and the sortable header's `<th>` (role=columnheader) carries `aria-sort` (NOT the inner button). Query the th: `screen.getByRole("columnheader", { name: /property/i }).getAttribute("aria-sort")` is one of none/ascending/descending.
  </behavior>
  <action>
    Create `src/components/dashboard/components/portfolio-columns.tsx` exporting `portfolioColumns: ColumnDef<PortfolioRow>[]`. Reproduce the 7 columns from `portfolio-table.tsx` exactly, but as column defs:

    - **Property** (`id: "property"`, accessor `property`): `enableSorting: true`, `enableColumnFilter: true`, `meta.label: "Property"`. Cell: name (`font-medium`) over address subtitle (`text-xs text-muted-foreground`). Header: `<DataTableColumnHeader column label="Property"/>`. **Custom `filterFn` (W-3):** `filterFn: (row, _columnId, value: string) => { const q = String(value).toLowerCase(); const name = (row.original.property ?? "").toLowerCase(); const addr = (row.original.address ?? "").toLowerCase(); return name.includes(q) || addr.includes(q); }` — reproducing dashboard.tsx's name||address OR-match so the search input does not drop address matches. (This is the column that the search Input in Plan 05-02 filters; the nuqs key is the column id `"property"` — see the pinned-key note below.)
    - **Units** (`id: "units"`): `enableSorting: true` with a `sortingFn` comparing `units.occupied` (the hand-rolled sort sorts by occupied). `meta.label: "Units"`. Cell: `occupied/total` in `tabular-nums` + "occupied" muted suffix.
    - **Tenants** (`id: "tenant"`, accessor `tenant`): `enableSorting: false`, `meta.label: "Tenants"`. Cell: tenant text or muted `--` with `aria-label="No tenants"`.
    - **Lease Status** (`id: "status"`, accessor `leaseStatus`): `enableSorting: true`, `enableColumnFilter: true`, `meta: { label: "Lease Status", variant: "multiSelect", options: [{label:"Active",value:"active"},{label:"Expiring Soon",value:"expiring"},{label:"Vacant",value:"vacant"}] }`. Cell: status text with the amber-600/dark:amber-500 expiring treatment from the source. Provide a `filterFn` that includes the row when the selected-values array contains `row.original.leaseStatus` (array-membership), so the faceted filter (array param) works client-side.
    - **Monthly Rent** (`id: "rent"`, accessor `rent`): `enableSorting: true`, `meta.label: "Monthly Rent"`. Header + cell right-aligned, `tabular-nums`; cell = `formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })`.
    - **Maintenance** (`id: "maintenance"`, accessor `maintenanceOpen`): `enableSorting: false`, `meta.label: "Maintenance"`. Cell right-aligned: red `{n} open` when `>0` (text-red-600/dark:text-red-500 per source), else muted `--` with `aria-label="No open requests"`.
    - **Actions** (`id: "actions"`): `enableSorting: false`, `enableHiding: false`, `meta.label: "Actions"`. Cell: hover-revealed `<Link href={\`/properties/${row.original.id}/edit\`} aria-label={\`Edit ${row.original.property}\`}>Edit</Link>` (next/link), `opacity-0 group-hover:opacity-100` like the source.

    **PIN THE SEARCH NUQS KEY (W-3).** The search Input filters the Property column, so the nuqs key that carries search is the Property column id: **`"property"`** (the per-column flat key `useClientDataTable` writes for a filterable column). Document this exact key in the SUMMARY so Plan 05-02's toolbar sets `table.getColumn("property")?.setFilterValue(value)` and Plan 05-03b's preset snapshot reads/writes the SAME `"property"` key. Do not invent a separate `"search"` or `"q"` key — search IS the Property column filter.

    Use `createColumnHelper<PortfolioRow>()` or plain `ColumnDef<PortfolioRow>[]` — no `any`, no `as unknown as`. Sortable headers render `<DataTableColumnHeader column={column} label="…"/>` (the Task-1 extended header). Right-aligned columns pass alignment via Tailwind classes on the cell/header, not inline styles. Keep each cell render fn short (< 50 lines); if a cell is complex (status/maintenance), extract a tiny local presentational helper component in the same file (still under the 300-line cap; split into a sibling file only if it exceeds the cap).

    Also create `src/components/dashboard/components/__tests__/portfolio-columns.test.tsx` implementing the 6 <behavior> tests. For the render-through-table test, build a real `useReactTable({ data: [oneRow], columns: portfolioColumns, getCoreRowModel })` inside a `render()` of a minimal inline `<table>` whose `<thead>` flexRenders each header into a `<th role="columnheader" aria-sort={getAriaSort(column)}>` (this exercises the Plan-05-02 wiring so the aria-sort-on-<th> guard is real), and whose `<tbody>` flexRenders the cells.

    Do NOT add row-selection checkbox column (the portfolio has no bulk actions in v2.0). Do NOT hardcode currency formatting (must use `formatCurrency`). Do NOT use `bg-white` or hex colors (tokens / established dashboard amber+red utility classes only). Do NOT let the Property column fall back to a default substring filter (that would drop address matches — the custom name||address filterFn is mandatory).
  </action>
  <verify>
    <automated>bun run test:unit -- --run src/components/dashboard/components/__tests__/portfolio-columns.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - File exists; `export const portfolioColumns` present exactly once; `portfolioColumns.length === 7` asserted by a passing test.
    - Property column has a custom name||address filterFn: `grep -Ec "filterFn" src/components/dashboard/components/portfolio-columns.tsx` >= 2 (Property + Status) AND the W-3 test (address-only row passes, no-match fails) passes.
    - Status column metadata: `grep -c "multiSelect\|variant: \"select\"" src/components/dashboard/components/portfolio-columns.tsx` >= 1 AND options contain active/expiring/vacant (`grep -Ec "active|expiring|vacant" ...` >= 3).
    - `grep -c "formatCurrency" src/components/dashboard/components/portfolio-columns.tsx` >= 1.
    - `grep -c "DataTableColumnHeader" src/components/dashboard/components/portfolio-columns.tsx` >= 1 (sortable headers wire to the extended header).
    - `grep -c "enableHiding: false" ...` >= 1 (actions column).
    - aria-sort lands on the <th> in the test harness: the column-model test queries `getByRole("columnheader")` and asserts its `aria-sort` attribute (NOT a `grep -c "aria-sort"` on the component) — this jsdom assertion is the B-1 acceptance gate.
    - The 6 column tests pass.
    - No `any` / `as unknown as` / inline styles: `grep -E ":\s*any[^a-z]|<any>|as unknown as|style={{" src/components/dashboard/components/portfolio-columns.tsx` returns zero matches.
    - File under 300 lines: `wc -l src/components/dashboard/components/portfolio-columns.tsx` < 300.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>portfolio-columns.tsx exports a 7-column typed ColumnDef<PortfolioRow>[] with correct sortable flags, a custom Property filterFn matching name||address (W-3 search parity, nuqs key "property"), faceted status metadata (DT-04), per-column labels (DT-05), formatCurrency rent, and aria-sort proven on the <th> via getAriaSort in a real flexRendered harness (DT-03/B-1); 6 tests pass; no any / inline styles; under 300 lines.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| PortfolioRow data → rendered cells | Data is the already-owner-scoped dashboard RPC output. Cells render strings/numbers; the Actions `Link` interpolates `row.original.id` into a same-origin route. |
| Column `id` → URL filter/sort keys | Column ids become nuqs param keys (Plan 05-01a). Ids are static literals authored here (incl. the pinned `"property"` search key), not user input. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05b-01 | Information Disclosure | aria-sort regression (a11y, not data) | mitigate | `getAriaSort(column)` exported from the extended header so Plan 05-02 sets `aria-sort` on the actual `<th role="columnheader">`; the column-test pins `aria-sort` presence on the `<th>` (jsdom getByRole assertion, not a grep) so the regression cannot silently re-appear. This is the ROADMAP Phase 5 success-criterion-1 guard. |
| T-05b-02 | Tampering | Actions `Link` href interpolation (`/properties/${id}/edit`) | mitigate | `row.original.id` is a server-issued UUID from the owner-scoped RPC; the route is same-origin and itself RLS-guarded server-side. No user-controlled string reaches the href. `next/link` encodes the path segment. |
| T-05b-03 | Tampering | faceted filter `filterFn` + Property name||address `filterFn` against in-memory rows | accept | Both `filterFn`s do string compare / array-membership over in-memory rows — no query/DB path. Unknown URL filter values simply match nothing. The name||address filter prevents an availability/UX regression (dropped address matches), not a security issue. |
| T-05b-SC | Tampering | Supply chain — package installs | accept | No new packages — @tanstack/react-table, lucide-react, next/link all already present. No RESEARCH.md Package Legitimacy Audit required (no install step). |

</threat_model>

<verification>
- `data-table-column-header.tsx` exports `getAriaSort(column)` (none/ascending/descending) and renders a keyboard-operable focus-ringed sort button (NO aria-sort on the button); dropdown preserved; the existing units-table 2nd consumer still renders + sorts (W-1 smoke).
- `portfolio-columns.tsx` exports a 7-column `ColumnDef<PortfolioRow>[]` with: correct sortable flags, a custom Property filterFn matching name||address (W-3), status column faceted metadata (DT-04), per-column `meta.label` (DT-05), formatCurrency rent, hover Edit Link.
- Both test files pass (6 + 6); the column-model test asserts aria-sort on the `<th role="columnheader">` via getByRole (B-1), not via grep.
- `bun run typecheck` exits 0; `bun run lint` clean.
- No `any`, no `as unknown as`, no inline styles, no hex; lucide-only icons; under 300 lines per file.
</verification>

<success_criteria>
- DT-03 fulfilled: typed column model + `getAriaSort` so every sortable header's `<th>` exposes `aria-sort` (advances ROADMAP Phase 5 success criterion #1 — keyboard + aria-sort), placed on the correct role=columnheader element (B-1).
- DT-04 metadata ready: status column carries `meta.options` so `DataTableFacetedFilter` works in Plan 05-02 with zero extra wiring.
- DT-05 metadata ready: every column has `meta.label` so `DataTableViewOptions` shows human labels in Plan 05-02.
- W-3 search parity preserved: the Property column's name||address filterFn keeps the existing dashboard search behavior; the search nuqs key is pinned to `"property"` for Plans 05-02 + 05-03b.
- W-1 second-consumer safety: the additive header extension does not regress `units/columns.tsx`.
- The "aria-sort regression" risk (05-CONTEXT.md) is closed and pinned by a jsdom `<th>` test.
- Zero-Tolerance compliance: no `any`, no `as unknown as`, no inline styles, tokens-only, lucide-only.
</success_criteria>

<output>
Create `.planning/phases/05-dashboard-portfolio-datatable/05-01b-SUMMARY.md` when done. Record:
- The final column id list + which are sortable / filterable / hideable.
- The exact `getAriaSort` signature and the instruction for Plan 05-02: render `<TableHead aria-sort={getAriaSort(column)}>` so aria-sort lands on the `<th role="columnheader">` (aria-sort is NOT on the header button).
- The pinned search nuqs key: **`"property"`** (search filters the Property column via its name||address filterFn) — Plan 05-02's toolbar and Plan 05-03b's preset snapshot MUST use this same key.
- The status `meta.options` array (for the Plan 05-02 faceted filter) and the `meta.label` list (for view options).
- Confirmation the units-table 2nd consumer still renders + sorts after the extension (W-1).
- Test counts + pass status; `git diff --stat`.
- A note for Plan 05-02: `portfolioColumns` is the column source; the table is built via `useClientDataTable({ data, columns: portfolioColumns, getRowId })`; render the thead with `<TableHead aria-sort={getAriaSort(column)}>`.
</output>
</output>
