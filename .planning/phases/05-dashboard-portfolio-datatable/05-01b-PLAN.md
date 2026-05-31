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
    - "DataTableColumnHeader renders the wrapping <th> (or the header element it controls) with aria-sort='none'|'ascending'|'descending' driven by column.getIsSorted()"
    - "DataTableColumnHeader's sort trigger is a <button>-semantics control with focus-visible:outline-2 outline-offset-2 outline-ring and toggles sort via keyboard (Enter/Space)"
    - "portfolio-columns.tsx exports columns: ColumnDef<PortfolioRow>[] with the 7 portfolio columns (Property, Units, Tenants, Lease Status, Monthly Rent, Maintenance, Actions)"
    - "Property/Units/Lease Status/Monthly Rent are enableSorting:true; Tenants/Maintenance/Actions are enableSorting:false"
    - "the Lease Status column declares meta.variant:'select' (or 'multiSelect') + meta.options for the faceted filter (active/expiring/vacant) and enableColumnFilter:true (DT-04 source)"
    - "every column declares meta.label so DataTableViewOptions (DT-05) shows a human label; Actions/selection columns set enableHiding:false where appropriate"
    - "Monthly Rent + Maintenance + Units cells are tabular-nums right-aligned; Monthly Rent uses formatCurrency with 0 fraction digits"
  artifacts:
    - path: "src/components/data-table/data-table-column-header.tsx"
      provides: "Vendored column header EXTENDED to emit aria-sort + keyboard-sortable button"
      contains: "aria-sort"
    - path: "src/components/dashboard/components/portfolio-columns.tsx"
      provides: "ColumnDef<PortfolioRow>[] portfolio column model"
      exports: ["portfolioColumns"]
      min_lines: 120
    - path: "src/components/dashboard/components/__tests__/portfolio-columns.test.tsx"
      provides: "Column-model unit tests incl. aria-sort assertion + sortable/filterable flags"
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
---

<objective>
Ship DT-03 (column model + the aria-sort regression fix) plus the DT-04/DT-05 metadata hooks. Two artifacts:

1. **Extend the vendored `DataTableColumnHeader`** so it emits `aria-sort` and is keyboard-sortable. Today (05-CONTEXT.md "aria-sort regression" risk) the vendored header is a dropdown that does NOT set `aria-sort` on the header element, while the hand-rolled `portfolio-table.tsx:SortableHead` DOES. Adopting the vendored header as-is would silently drop WCAG 2.1 AA sort semantics and fail ROADMAP Phase 5 success criterion #1. This plan closes that gap.
2. **Create `portfolio-columns.tsx`** — a typed `ColumnDef<PortfolioRow>[]` reproducing the 7 portfolio columns, with sortable headers (via the extended column-header), the Lease Status column carrying `meta.options` for the DT-04 faceted filter, and `meta.label` on every column for the DT-05 view-options menu.

Purpose: DT-03 is the accessibility-critical heart of the phase. The success criterion is literally "clicking a sortable column header sorts the rows and exposes `aria-sort` on that header; keyboard users can sort via Tab + Enter/Space." The column model is also the single source of truth that the faceted filter (DT-04, reads `columnMeta.options`) and the view-options menu (DT-05, reads `columnMeta.label`) drive off — so getting the metadata right here unblocks both downstream reuses with zero extra wiring.

Output:
- `src/components/data-table/data-table-column-header.tsx` — extended to render `aria-sort` + a focus-visible keyboard-sortable button while preserving the existing dropdown (asc/desc/reset/hide) affordance.
- `src/components/dashboard/components/portfolio-columns.tsx` — `portfolioColumns: ColumnDef<PortfolioRow>[]`.
- Two test files: a column-header `aria-sort` + keyboard test, and a column-model test (sortable/filterable/hideable flags + cell rendering + aria-sort through the header).

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
@src/components/dashboard/components/portfolio-table.tsx
@src/components/dashboard/dashboard-types.ts
@src/lib/utils/currency.ts
@src/types/data-table.ts

<interfaces>
<!-- aria-sort pattern to PRESERVE — currently in portfolio-table.tsx:SortableHead (being deleted in Plan 05-03). -->
<!-- Reproduce its semantics INSIDE the extended DataTableColumnHeader: -->
<!--   - <th aria-sort="ascending"|"descending"|"none"> driven by sort state -->
<!--   - inner focusable <button> with focus-visible:outline-2 outline-offset-2 outline-ring -->

From src/components/data-table/data-table-column-header.tsx (CURRENT — to extend):
- Props: `{ column: Column<TData, TValue>; label: string }` + DropdownMenuTrigger props.
- Early return `<div>{label}</div>` when `!getCanSort() && !getCanHide()`.
- Sort affordance is a DropdownMenuTrigger (asc/desc/reset items) — it does NOT set aria-sort anywhere.

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
Column render notes (from 05-CONTEXT.md "Columns" table):
| Property: name + address subtitle | Units: occupied/total tabular, sort by occupied | Tenants: tenant or "--", not sortable |
| Lease Status: active/expiring/vacant, amber-600 for expiring, faceted-filterable | Monthly Rent: right-aligned formatCurrency 0-frac tabular | Maintenance: red if >0, "{n} open" or "--", not sortable | Actions: hover-revealed Edit → /properties/{id}/edit, not sortable/hideable |
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend DataTableColumnHeader to emit aria-sort + keyboard-sortable button</name>
  <files>src/components/data-table/data-table-column-header.tsx, src/components/data-table/__tests__/data-table-column-header.test.tsx</files>
  <read_first>
    - src/components/data-table/data-table-column-header.tsx (CURRENT — the dropdown header to extend; preserve the asc/desc/reset/hide dropdown items)
    - src/components/dashboard/components/portfolio-table.tsx (lines 37-92 — SortableHead/sortState: the EXACT aria-sort mapping + focus-visible classes to reproduce)
    - .planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md ("aria-sort regression" risk; UI-SPEC § Accessibility — aria-sort + focus-visible:outline-2 outline-offset-2 outline-ring required)
    - .planning/phases/01-foundation-dedup/01-UI-SPEC.md (active sort indicator uses --color-primary; tokens only; no inline styles)
    - CLAUDE.md (Zero Tolerance: no any, lucide icons only, Tailwind only, no inline styles; icon-only buttons need aria-label)
  </read_first>
  <behavior>
    - Test "aria-sort none by default": render a sortable header for a column with no active sort; the header element exposes `aria-sort="none"`.
    - Test "aria-sort reflects asc/desc": with `column.getIsSorted()` mocked/driven to `"asc"` the header exposes `aria-sort="ascending"`; `"desc"` → `"descending"`.
    - Test "keyboard sort": the sort control is reachable by Tab and a `keydown` Enter (and Space) toggles sorting (fires `column.toggleSorting`).
    - Test "focus ring classes present": the sort control carries `focus-visible:outline-2`, `outline-offset-2`, `outline-ring` (or the project's token equivalent from UI-SPEC).
    - Test "non-sortable, non-hideable still renders label": a column with neither capability renders a plain label with no aria-sort attribute and no button.
  </behavior>
  <action>
    Extend `src/components/data-table/data-table-column-header.tsx` so the header it renders is accessible. Two changes, additive to the existing dropdown:

    1. **Emit `aria-sort` on the header-controlling element.** Add an `aria-sort` value derived from `column.getIsSorted()`: `"asc" → "ascending"`, `"desc" → "descending"`, otherwise `"none"`. Reproduce the mapping from `portfolio-table.tsx:sortState` (lines 39-46). Because the `<th>` itself is rendered by `data-table.tsx` (which calls `flexRender(header)`), set `aria-sort` on the wrapper this component returns AND ensure Plan 05-02's body renders headers such that the attribute lands on a `<th>` — the cleanest path: have this component return its root with `role` left to the `<th>`, and surface `aria-sort` as a prop the header cell can spread. SIMPLEST correct approach (choose this): change the component's outer element to accept and apply `aria-sort`, and document that Plan 05-02 renders `<TableHead aria-sort={...}>` by reading the sort state, OR (preferred, self-contained) make this component render its own wrapping element carrying `aria-sort` so it works regardless of the parent `<th>`. Pick the self-contained approach: the root element returned by `DataTableColumnHeader` carries `aria-sort`.

    2. **Make the sort trigger keyboard-operable with a visible focus ring.** Keep the existing DropdownMenu (asc/desc/reset/hide) for mouse users, but ensure the trigger is a real button with the UI-SPEC focus classes: `focus-visible:outline-2 outline-offset-2 outline-ring`. Add Enter/Space `onKeyDown` handling that toggles sort direction when the column `getCanSort()` (so keyboard users get a fast sort without opening the dropdown), matching the hand-rolled `<button onClick={() => onSort(field)}>` affordance. The active sort indicator icon (ChevronUp/Down) stays lucide-only; color the active state with `--color-primary` (token, no hex) per UI-SPEC.

    Tokens only, Tailwind only, no inline styles (Zero Tolerance). Preserve the existing dropdown items verbatim (asc/desc/reset/hide) — this is additive. Do NOT introduce `any`. Keep the file a single component (no barrel).

    Also create `src/components/data-table/__tests__/data-table-column-header.test.tsx` implementing the 5 <behavior> tests (render with a real minimal TanStack table via `useReactTable` so `column.getIsSorted()` / `toggleSorting` are genuine, or drive a controlled mock column that satisfies the `Column` shape the component reads). Prefer a real table instance to avoid `as unknown as` on a hand-built column.
  </action>
  <verify>
    <automated>bun run test:unit -- --run src/components/data-table/__tests__/data-table-column-header.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "aria-sort" src/components/data-table/data-table-column-header.tsx` >= 1.
    - `grep -Ec "ascending|descending" src/components/data-table/data-table-column-header.tsx` >= 1 (the sort-state mapping exists).
    - `grep -c "focus-visible:outline-2" src/components/data-table/data-table-column-header.tsx` >= 1.
    - `grep -c "onKeyDown" src/components/data-table/data-table-column-header.tsx` >= 1 (keyboard sort).
    - The 5 header tests pass.
    - No `any` / `as unknown as`: `grep -E ":\s*any[^a-z]|<any>|as unknown as" src/components/data-table/data-table-column-header.tsx` returns zero matches.
    - No inline styles: `grep -c "style={{" src/components/data-table/data-table-column-header.tsx` returns 0.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>Vendored column header now emits aria-sort (none/ascending/descending) + a keyboard-operable, focus-ringed sort control; dropdown affordance preserved; 5 tests pass; tokens-only, no any.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Author portfolio-columns.tsx (7-column ColumnDef<PortfolioRow>[] with filter/visibility metadata)</name>
  <files>src/components/dashboard/components/portfolio-columns.tsx, src/components/dashboard/components/__tests__/portfolio-columns.test.tsx</files>
  <read_first>
    - src/components/dashboard/components/portfolio-table.tsx (FULL — the exact cell rendering to reproduce per column: name+address, occupied/total, "--" empties, amber-600 expiring, formatCurrency rent, red maintenance, hover Edit link)
    - src/components/data-table/data-table-column-header.tsx (extended in Task 1 — the header render fn uses <DataTableColumnHeader column label/>)
    - src/components/dashboard/dashboard-types.ts (PortfolioRow shape + the leaseStatus union)
    - src/lib/utils/currency.ts (formatCurrency, 0-fraction options object)
    - src/types/data-table.ts (ColumnMeta.label/variant/options; Option shape)
    - .planning/phases/01-foundation-dedup/01-UI-SPEC.md (row height h-12 min; tabular-nums; status badge text-xs; tokens only; amber via token not hex if a token exists, else preserve existing amber-600/dark:amber-500 as the established dashboard pattern)
    - CLAUDE.md (Zero Tolerance: no any, lucide icons, Tailwind only, tokens; 300-line component / 50-line function caps; Link from next/link for Actions)
  </read_first>
  <behavior>
    - Test "exports 7 columns": `portfolioColumns.length === 7` with ids/accessors property, units, tenant, status, rent, maintenance, actions (or the agreed id set).
    - Test "sortable flags": property/units/status/rent have `enableSorting !== false`; tenant/maintenance/actions have `enableSorting === false`.
    - Test "status column is faceted-filterable": the status column has `enableColumnFilter === true`, `meta.variant` in {"select","multiSelect"}, and `meta.options` listing active/expiring/vacant.
    - Test "view-options metadata": every column has a `meta.label` string; the actions column has `enableHiding === false`.
    - Test "cell rendering through a real table": mounting a TanStack table with these columns + one PortfolioRow renders the rent cell as the formatCurrency 0-frac string, the units cell as "occupied/total", "--" for null tenant, and the status header exposes aria-sort (proves the column→header wiring from Task 1).
  </behavior>
  <action>
    Create `src/components/dashboard/components/portfolio-columns.tsx` exporting `portfolioColumns: ColumnDef<PortfolioRow>[]`. Reproduce the 7 columns from `portfolio-table.tsx` exactly, but as column defs:

    - **Property** (`id: "property"`, accessor `property`): `enableSorting: true`, `meta.label: "Property"`. Cell: name (`font-medium`) over address subtitle (`text-xs text-muted-foreground`). Header: `<DataTableColumnHeader column label="Property"/>`.
    - **Units** (`id: "units"`): `enableSorting: true` with a `sortingFn` comparing `units.occupied` (the hand-rolled sort sorts by occupied). `meta.label: "Units"`. Cell: `occupied/total` in `tabular-nums` + "occupied" muted suffix.
    - **Tenants** (`id: "tenant"`, accessor `tenant`): `enableSorting: false`, `meta.label: "Tenants"`. Cell: tenant text or muted `--` with `aria-label="No tenants"`.
    - **Lease Status** (`id: "status"`, accessor `leaseStatus`): `enableSorting: true`, `enableColumnFilter: true`, `meta: { label: "Lease Status", variant: "multiSelect", options: [{label:"Active",value:"active"},{label:"Expiring Soon",value:"expiring"},{label:"Vacant",value:"vacant"}] }`. Cell: status text with the amber-600/dark:amber-500 expiring treatment from the source. Provide a `filterFn` that includes the row when the selected-values array contains `row.leaseStatus` (array-membership), so the faceted filter (array param) works client-side.
    - **Monthly Rent** (`id: "rent"`, accessor `rent`): `enableSorting: true`, `meta.label: "Monthly Rent"`. Header + cell right-aligned, `tabular-nums`; cell = `formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })`.
    - **Maintenance** (`id: "maintenance"`, accessor `maintenanceOpen`): `enableSorting: false`, `meta.label: "Maintenance"`. Cell right-aligned: red `{n} open` when `>0` (text-red-600/dark:text-red-500 per source), else muted `--` with `aria-label="No open requests"`.
    - **Actions** (`id: "actions"`): `enableSorting: false`, `enableHiding: false`, `meta.label: "Actions"`. Cell: hover-revealed `<Link href={\`/properties/${row.original.id}/edit\`} aria-label={\`Edit ${row.original.property}\`}>Edit</Link>` (next/link), `opacity-0 group-hover:opacity-100` like the source.

    Use `createColumnHelper<PortfolioRow>()` or plain `ColumnDef<PortfolioRow>[]` — no `any`, no `as unknown as`. Sortable headers render `<DataTableColumnHeader column={column} label="…"/>` (the Task-1 extended header). Right-aligned columns pass alignment via Tailwind classes on the cell/header, not inline styles. Keep each cell render fn short (< 50 lines); if a cell is complex (status/maintenance), extract a tiny local presentational helper component in the same file (still under the 300-line cap; split into a sibling file only if it exceeds the cap).

    Also create `src/components/dashboard/components/__tests__/portfolio-columns.test.tsx` implementing the 5 <behavior> tests. For the render-through-table test, build a real `useReactTable({ data: [oneRow], columns: portfolioColumns, getCoreRowModel })` inside a `render()` and assert the DOM (use the `flexRender` of header/cell, or render via the Plan-05-02 not-yet-existing component — since that does not exist yet, render a minimal inline `<table>` that flexRenders the columns for the test only).

    Do NOT add row-selection checkbox column (the portfolio has no bulk actions in v2.0). Do NOT hardcode currency formatting (must use `formatCurrency`). Do NOT use `bg-white` or hex colors (tokens / established dashboard amber+red utility classes only).
  </action>
  <verify>
    <automated>bun run test:unit -- --run src/components/dashboard/components/__tests__/portfolio-columns.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - File exists; `export const portfolioColumns` present exactly once; `portfolioColumns.length === 7` asserted by a passing test.
    - Status column metadata: `grep -c "multiSelect\|variant: \"select\"" src/components/dashboard/components/portfolio-columns.tsx` >= 1 AND options contain active/expiring/vacant (`grep -Ec "active|expiring|vacant" ...` >= 3).
    - `grep -c "formatCurrency" src/components/dashboard/components/portfolio-columns.tsx` >= 1.
    - `grep -c "DataTableColumnHeader" src/components/dashboard/components/portfolio-columns.tsx` >= 1 (sortable headers wire to the extended header).
    - `grep -c "enableHiding: false" ...` >= 1 (actions column).
    - The 5 column tests pass.
    - No `any` / `as unknown as` / inline styles: `grep -E ":\s*any[^a-z]|<any>|as unknown as|style={{" src/components/dashboard/components/portfolio-columns.tsx` returns zero matches.
    - File under 300 lines: `wc -l src/components/dashboard/components/portfolio-columns.tsx` < 300.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>portfolio-columns.tsx exports a 7-column typed ColumnDef<PortfolioRow>[] with correct sortable/filterable/hideable flags, faceted status metadata (DT-04), per-column labels (DT-05), formatCurrency rent, and aria-sort via the extended header (DT-03); 5 tests pass; no any / inline styles; under 300 lines.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| PortfolioRow data → rendered cells | Data is the already-owner-scoped dashboard RPC output. Cells render strings/numbers; the Actions `Link` interpolates `row.original.id` into a same-origin route. |
| Column `id` → URL filter/sort keys | Column ids become nuqs param keys (Plan 05-01a). Ids are static literals authored here, not user input. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05b-01 | Information Disclosure | aria-sort regression (a11y, not data) | mitigate | Reproduce `portfolio-table.tsx:sortState` mapping inside the extended `DataTableColumnHeader`; the column-test pins `aria-sort` presence so the regression cannot silently re-appear. This is the ROADMAP Phase 5 success-criterion-1 guard. |
| T-05b-02 | Tampering | Actions `Link` href interpolation (`/properties/${id}/edit`) | mitigate | `row.original.id` is a server-issued UUID from the owner-scoped RPC; the route is same-origin and itself RLS-guarded server-side. No user-controlled string reaches the href. `next/link` encodes the path segment. |
| T-05b-03 | Tampering | faceted filter `filterFn` against `meta.options` | accept | The status enum is fixed (active/expiring/vacant) and the `filterFn` does array-membership over in-memory rows — no query/DB path. Unknown URL filter values simply match nothing. |
| T-05b-SC | Tampering | Supply chain — package installs | accept | No new packages — @tanstack/react-table, lucide-react, next/link all already present. No RESEARCH.md Package Legitimacy Audit required (no install step). |

</threat_model>

<verification>
- `data-table-column-header.tsx` emits `aria-sort` (none/ascending/descending) and a keyboard-operable focus-ringed sort control; dropdown preserved.
- `portfolio-columns.tsx` exports a 7-column `ColumnDef<PortfolioRow>[]` with: correct sortable flags, status column faceted metadata (DT-04), per-column `meta.label` (DT-05), formatCurrency rent, hover Edit Link.
- Both test files pass (5 + 5).
- `bun run typecheck` exits 0; `bun run lint` clean.
- No `any`, no `as unknown as`, no inline styles, no hex; lucide-only icons; under 300 lines per file.
</verification>

<success_criteria>
- DT-03 fulfilled: typed column model with `aria-sort` on every sortable header (advances ROADMAP Phase 5 success criterion #1 — keyboard + aria-sort).
- DT-04 metadata ready: status column carries `meta.options` so `DataTableFacetedFilter` works in Plan 05-02 with zero extra wiring.
- DT-05 metadata ready: every column has `meta.label` so `DataTableViewOptions` shows human labels in Plan 05-02.
- The "aria-sort regression" risk (05-CONTEXT.md) is closed and pinned by a test.
- Zero-Tolerance compliance: no `any`, no `as unknown as`, no inline styles, tokens-only, lucide-only.
</success_criteria>

<output>
Create `.planning/phases/05-dashboard-portfolio-datatable/05-01b-SUMMARY.md` when done. Record:
- The final column id list + which are sortable / filterable / hideable.
- The exact approach taken to land `aria-sort` on the header element (self-contained wrapper vs. prop spread) — Plan 05-02 needs to know whether it must render `<TableHead aria-sort>` itself.
- The status `meta.options` array (for the Plan 05-02 faceted filter) and the `meta.label` list (for view options).
- Test counts + pass status; `git diff --stat`.
- A note for Plan 05-02: `portfolioColumns` is the column source; the table is built via `useClientDataTable({ data, columns: portfolioColumns, getRowId })`.
</output>
