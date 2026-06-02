---
phase: "05"
plan: 01a
type: execute
wave: 1
depends_on: []
files_modified:
  - src/hooks/use-client-data-table.ts
  - src/hooks/__tests__/use-client-data-table.test.tsx
autonomous: true
requirements: [DT-02, DT-09]

must_haves:
  truths:
    - "useClientDataTable accepts a single in-memory data array and returns a TanStack table where manualPagination/Sorting/Filtering are all false (TanStack owns row math)"
    - "page/perPage are mirrored OUT to nuqs via parseAsInteger (page key 'page' default 1, perPage key 'perPage' default 10) — URL-compatible with the server useDataTable"
    - "sort is mirrored OUT to nuqs via getSortingStateParser(columnIds) under the 'sort' key — identical wire format to useDataTable"
    - "each filterable column (column.enableColumnFilter) gets a flat per-column nuqs key: ARRAY-typed (parseAsArrayOf(parseAsString, ',')) when columnMeta.options exists, else parseAsString"
    - "table.getPageCount() is TanStack-computed from the in-memory filtered array (NOT a frozen pageCount prop); changing a filter recomputes page count"
    - "on mount, table state initializes FROM the URL params, not from stale defaults (URL is the source of truth for page/sort/filter)"
    - "setting a filter resets page to 1 (debounced), matching the server hook's debouncedSetFilterValues behavior"
    - "columnVisibility is CONTROLLABLE: the hook accepts optional columnVisibility + onColumnVisibilityChange props, wires them into useReactTable state.columnVisibility + onColumnVisibilityChange, and FALLS BACK to internal useState when the props are absent (uncontrolled default) — this is what lets Plan 05-03b source visibility from the persisted dashboard-presets-store (D-3) and flow it through PortfolioDataTable as a controlled prop with NO off-plan edits to this frozen Wave-1 file"
  artifacts:
    - path: "src/hooks/use-client-data-table.ts"
      provides: "useClientDataTable<TData> — client-side variant of useDataTable with nuqs mirror + optional controlled columnVisibility"
      min_lines: 120
      exports: ["useClientDataTable"]
    - path: "src/hooks/__tests__/use-client-data-table.test.tsx"
      provides: "Unit tests for client hook: manual flags false, nuqs round-trip, page-count recompute, filter-resets-page, controlled-columnVisibility round-trip"
      contains: "manualPagination"
  key_links:
    - from: "src/hooks/use-client-data-table.ts"
      to: "nuqs (useQueryState/useQueryStates)"
      via: "page/perPage/sort/per-column-filter parsers mirrored out"
      pattern: "useQueryState|useQueryStates"
    - from: "src/hooks/use-client-data-table.ts"
      to: "#lib/parsers getSortingStateParser"
      via: "sort param parser shared with server useDataTable"
      pattern: "getSortingStateParser"
    - from: "src/hooks/use-client-data-table.ts"
      to: "useReactTable state.columnVisibility + onColumnVisibilityChange"
      via: "optional controlled columnVisibility prop, internal useState fallback"
      pattern: "columnVisibility|onColumnVisibilityChange"
---

<objective>
Ship DT-02: a new `useClientDataTable<TData>` hook — the client-side (one in-memory array) sibling of the server `src/hooks/use-data-table.ts:useDataTable`. This is the foundation the whole phase mounts on: it must let TanStack Table compute pagination/sorting/filtering over the in-memory portfolio array (all `manual*` flags `false`) while STILL mirroring the resulting `page` / `perPage` / `sort` / per-column-filter state OUT to nuqs URL params using the EXACT same wire format as the server hook (D-4). Getting this contract right is what makes DT-09 (URL state) and D-5 (grid + mobile read the same nuqs state) fall out for free downstream.

The hook ALSO exposes `columnVisibility` as an OPTIONAL controlled prop (with internal `useState` fallback), because D-3 + Plan 05-03b need column visibility sourced from the persisted `dashboard-presets-store` and flowed through `PortfolioDataTable` as a CONTROLLED prop. Building that controllability into the hook HERE (Wave 1) is what lets Plan 05-02 consume it with NO off-plan edits to this frozen file.

Purpose: `useDataTable` is server-coupled (`manualPagination/Sorting/Filtering: true`, requires a `pageCount` prop, expects the data to be a server page). The portfolio has the whole dataset in memory, so TanStack should own the row math — but the URL must remain the single source of truth for filter/sort/page so refresh restores the view and presets (DT-08) can round-trip. The risk this plan defuses (per 05-CONTEXT.md "Client vs. server pagination reconciliation"): flip all manual flags to `false` and DROP the `pageCount` prop so TanStack computes it, while keeping the nuqs write-back. Get it wrong → double-pagination or a frozen page count. A second contract this plan freezes: controlled `columnVisibility` so the persisted-store visibility (D-3) round-trips without a later off-plan hook edit.

Output:
- `src/hooks/use-client-data-table.ts` — `useClientDataTable<TData>` returning `{ table, shallow, debounceMs, throttleMs }` (same return shape as `useDataTable` so downstream components are drop-in), accepting optional `columnVisibility` + `onColumnVisibilityChange`.
- `src/hooks/__tests__/use-client-data-table.test.tsx` — unit tests pinning the contract (6 tests, incl. the controlled-visibility round-trip).

NO portfolio wiring in this plan. NO column model (that is Plan 05-01b). NO aria-sort header (also 05-01b). This plan is the pure hook + its tests so it gets its own context window — the URL/TanStack reconciliation is the single highest-risk piece of mechanical logic in the phase.
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
@src/hooks/use-data-table.ts
@src/lib/parsers.ts
@src/types/data-table.ts

<interfaces>
<!-- Executor: build useClientDataTable by FORKING useDataTable. Reuse these verbatim. -->

From src/hooks/use-data-table.ts (the server variant to fork):
- `DEFAULTS = { page, perPage, sort, filters, joinOperator }`, `ARRAY_SEPARATOR = ","`, `DEBOUNCE_MS = 300`, `THROTTLE_MS = 50`.
- nuqs page/perPage: `parseAsInteger.withOptions(queryStateOptions).withDefault(1)` and `.withDefault(initialState?.pagination?.pageSize ?? 10)`.
- sort: `getSortingStateParser<TData>(columnIds).withOptions(queryStateOptions).withDefault(initialState?.sorting ?? [])`.
- filterParsers: per filterable column, `column.meta?.options` present → `parseAsArrayOf(parseAsString, ARRAY_SEPARATOR)`, else `parseAsString`.
- The columnFilters↔nuqs sync: `onColumnFiltersChange` → `debouncedSetFilterValues` which calls `setPage(1)` then `setFilterValues(values)`.
- The internal `columnVisibility` useState + `onColumnVisibilityChange` wiring that the server hook already has (the fork makes this overridable by an optional prop — see below).
- The KEY DIFFERENCES to make in the fork (do NOT keep these from the server hook):
    - REMOVE `Required<Pick<TableOptions<TData>, "pageCount">>` from props and the `pageCount` plumbing — TanStack computes it.
    - Set `manualPagination: false`, `manualSorting: false`, `manualFiltering: false`.
    - Drop `pageCount` from the `useReactTable` call (let it default so getPaginationRowModel computes pages).
    - KEEP getCoreRowModel/getFilteredRowModel/getPaginationRowModel/getSortedRowModel/getFacetedRowModel/getFacetedUniqueValues/getFacetedMinMaxValues so client-side faceting + paging works.
    - KEEP the nuqs mirror (page/perPage/sort/filter write-back) so URL stays source-of-truth.
    - ADD optional controlled `columnVisibility` + `onColumnVisibilityChange` props; when present, drive `state.columnVisibility` / `onColumnVisibilityChange` from the props, else from the internal useState.

From src/lib/parsers.ts:
```typescript
export const getSortingStateParser = <TData>(columnIds?: string[] | Set<string>) => CreateParser<ExtendedColumnSort<TData>[]>
```

From src/types/data-table.ts:
```typescript
export interface QueryKeys { page; perPage; sort; filters; joinOperator }
export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, "id"> { id: Extract<keyof TData, string> }
// ColumnMeta augmentation already declares label/placeholder/variant/options/range/unit/icon
```

From @tanstack/react-table (for the controlled-visibility props):
```typescript
import type { VisibilityState, OnChangeFn } from "@tanstack/react-table";
// columnVisibility?: VisibilityState; onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author useClientDataTable hook (fork of useDataTable, manual flags off, nuqs mirror kept, optional controlled columnVisibility)</name>
  <files>src/hooks/use-client-data-table.ts</files>
  <read_first>
    - src/hooks/use-data-table.ts (FULL — this is the fork source; copy structure, change the items listed in <interfaces>, incl. the columnVisibility wiring)
    - src/lib/parsers.ts (getSortingStateParser — reuse unchanged)
    - src/types/data-table.ts (QueryKeys, ExtendedColumnSort, ColumnMeta augmentation)
    - src/hooks/use-debounced-callback.ts (useDebouncedCallback — reuse for filter debounce; confirm signature)
    - .planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md (D-4 nuqs strategy; D-3 columnVisibility persistence; "Client vs. server pagination reconciliation" risk)
    - CLAUDE.md (Zero Tolerance: no any, no as-unknown-as; "use client" directive needed)
  </read_first>
  <behavior>
    - Test: returned table has `options.manualPagination === false`, `manualSorting === false`, `manualFiltering === false`.
    - Test: with a 25-row data array and default perPage 10, `table.getPageCount()` returns 3 (TanStack-computed, not a prop).
    - Test: changing the sort via `table.getColumn(id).toggleSorting()` writes a JSON `sort` param to the URL in the same shape getSortingStateParser serializes.
    - Test: setting a column filter pushes the per-column key to the URL (array key when the column has `meta.options`, scalar string otherwise) and resets `page` to 1.
    - Test: initializing the hook with a URL that already has `?page=2&sort=[{"id":"rent","desc":true}]` starts the table on pageIndex 1 with that sort applied (URL is source of truth on mount).
    - Test (controlled visibility): when `columnVisibility` + `onColumnVisibilityChange` are passed, the table reflects the parent-supplied visibility and `table.getColumn(id).toggleVisibility()` fires the parent `onColumnVisibilityChange` (not internal state); when the props are absent, visibility toggles work via internal useState (uncontrolled fallback).
  </behavior>
  <action>
    Create `src/hooks/use-client-data-table.ts` with a leading `"use client";` directive. Fork `src/hooks/use-data-table.ts` and apply exactly these changes — everything else is copied verbatim so the nuqs wire format stays identical to the server hook (D-4):

    1. **Props interface** — name it `UseClientDataTableProps<TData>`. Take `Omit<TableOptions<TData>, "state" | "pageCount" | "getCoreRowModel" | "manualFiltering" | "manualPagination" | "manualSorting">` but do NOT add the `Required<Pick<..., "pageCount">>` intersection that the server hook has. Keep `initialState`, `queryKeys`, `history`, `debounceMs`, `throttleMs`, `clearOnDefault`, `scroll`, `shallow`, `startTransition`. ADD two optional props: `columnVisibility?: VisibilityState` and `onColumnVisibilityChange?: OnChangeFn<VisibilityState>` (imported from `@tanstack/react-table`). DROP `enableAdvancedFilter` (the portfolio uses only simple faceted filters) — hardcode the simple-filter branch.

    2. **Remove all `pageCount` plumbing.** No `pageCount` destructure, no `pageCount` passed to `useReactTable`. TanStack computes page count from `getPaginationRowModel()` over the in-memory array.

    3. **Manual flags** — pass `manualPagination: false`, `manualSorting: false`, `manualFiltering: false` to `useReactTable`. (The server hook passes `true` for all three — this is the core inversion.)

    4. **Keep the nuqs mirror verbatim**: the `page`/`perPage` `useQueryState(parseAsInteger...)`, the `sort` `useQueryState(getSortingStateParser(columnIds)...)`, the `filterParsers` reduction over `columns.filter((c) => c.enableColumnFilter)` (array parser when `column.meta?.options`, scalar `parseAsString` otherwise), `useQueryStates(filterParsers)`, `initialColumnFilters` derivation, `onColumnFiltersChange` + `debouncedSetFilterValues` (which calls `setPage(1)` then `setFilterValues`). This is what keeps the URL the source of truth.

    5. **Controlled columnVisibility (B-2 fix).** Keep the internal `const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>(initialState?.columnVisibility ?? {})`. Then resolve the EFFECTIVE visibility + change handler from props with a fallback:
       - `const columnVisibility = props.columnVisibility ?? internalColumnVisibility;`
       - `const onColumnVisibilityChange = props.onColumnVisibilityChange ?? setInternalColumnVisibility;`
       Pass `columnVisibility` into `useReactTable`'s `state.columnVisibility` and pass `onColumnVisibilityChange` as `useReactTable`'s `onColumnVisibilityChange`. This makes the hook controlled when the props are supplied (the parent owns visibility, e.g. from the persisted store per D-3) and uncontrolled otherwise. Do NOT keep two competing sources of truth in the table state — exactly one effective `columnVisibility` flows into `state`.

    6. **Keep all row models**: getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues. Faceted models drive the DT-04 status filter counts client-side.

    7. **Return shape**: `{ table, shallow, debounceMs, throttleMs }` — identical to `useDataTable` so the Plan 05-02 component is a drop-in consumer.

    Zero-Tolerance: no `any` (use the typed `Updater<...>` / `SortingState` / `ColumnFiltersState` / `VisibilityState` / `OnChangeFn` imports from `@tanstack/react-table`). No `as unknown as`. No barrel file — export `useClientDataTable` directly from this file. Keep the hook under the function-length spirit by extracting the filter-parser reduction into a small local helper if it pushes the main function past readability (the source hook inlines it; matching that is acceptable).

    Do NOT mirror `joinOperator` behavior (advanced filter only). Do NOT add a `pageCount` fallback of `-1` (that is the server manual-mode sentinel and would freeze the count).
  </action>
  <verify>
    <automated>grep -v '^#' src/hooks/use-client-data-table.ts | grep -Ec "manualPagination: false|manualSorting: false|manualFiltering: false"</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `src/hooks/use-client-data-table.ts` and begins with `"use client";`.
    - `export function useClientDataTable` present exactly once.
    - All three manual flags set false: the verify grep returns 3.
    - No `pageCount` passed to useReactTable: `grep -c "pageCount" src/hooks/use-client-data-table.ts` returns 0 (or only inside a comment, which the grep filter excludes).
    - nuqs mirror intact: `grep -Ec "useQueryState|useQueryStates" src/hooks/use-client-data-table.ts` >= 2; `grep -c "getSortingStateParser" ...` == 1.
    - Controlled visibility wired: `grep -c "onColumnVisibilityChange" src/hooks/use-client-data-table.ts` >= 1 AND `grep -c "columnVisibility" ...` >= 2 (prop fallback resolution + state pass-through).
    - No `any`: `grep -E ":\s*any[^a-z]|<any>|as any" src/hooks/use-client-data-table.ts` returns zero matches.
    - No `as unknown as`: `grep -c "as unknown as" src/hooks/use-client-data-table.ts` returns 0.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>useClientDataTable forked from useDataTable with manual flags off, no pageCount prop, nuqs mirror preserved, and optional controlled columnVisibility (prop with internal useState fallback); typecheck passes; no any / as-unknown-as.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Unit-test useClientDataTable contract (manual flags, page-count recompute, nuqs round-trip, controlled columnVisibility)</name>
  <files>src/hooks/__tests__/use-client-data-table.test.tsx</files>
  <read_first>
    - src/hooks/use-client-data-table.ts (the hook under test, from Task 1)
    - src/hooks/__tests__ (browse for an existing nuqs-hook test to copy the render harness + NuqsTestingAdapter / withNuqsTestingAdapter pattern; if none exists, use `nuqs/adapters/testing`'s `NuqsTestingAdapter` as the renderHook wrapper)
    - CLAUDE.md (Vitest 4 + chai 6 bug: use .rejects.toMatchObject not .rejects.toThrow; vi.hoisted for mock vars referenced in vi.mock)
    - src/test (browse for a shared renderHook/test-utils helper to reuse)
  </read_first>
  <behavior>
    - Test "manual flags are all false": render the hook with a tiny `ColumnDef<{id:string;n:number}>[]` and a 3-row array; assert `result.current.table.options.manualPagination`, `manualSorting`, `manualFiltering` are each `false`.
    - Test "page count is TanStack-computed": render with 25 rows + default perPage 10; assert `result.current.table.getPageCount() === 3`. Then act: set a filter that narrows to 5 rows; assert `getPageCount()` recomputes to 1 (proves NOT frozen).
    - Test "sort mirrors to URL in getSortingStateParser format": act `table.getColumn("n")!.toggleSorting(true)`; read the testing adapter's URL/searchParams; assert the `sort` param deserializes (via getSortingStateParser) to `[{ id: "n", desc: true }]`.
    - Test "setting a faceted filter writes an array param AND resets page to 1": start on page 2; act set the filter column's value to `["active"]`; flush the debounce timer (vi.useFakeTimers + advanceTimersByTime(300)); assert the per-column URL key is the `,`-joined array and the `page` param is `1`.
    - Test "hydrates from URL on mount": seed the testing adapter with `?page=2&sort=[{"id":"n","desc":true}]`; assert on first render `table.getState().pagination.pageIndex === 1` and `table.getState().sorting` equals `[{id:"n",desc:true}]`.
    - Test "controlled columnVisibility round-trips" (B-2 pin): render the hook with `columnVisibility={{ n: false }}` + an `onColumnVisibilityChange` spy; assert `table.getState().columnVisibility` reflects the parent-supplied `{ n: false }`; act `table.getColumn("n")!.toggleVisibility()` and assert the parent spy fired (parent owns the change, not internal state). A second render WITHOUT the props proves the uncontrolled fallback: `toggleVisibility()` flips internal state with no parent spy.
  </behavior>
  <action>
    Create `src/hooks/__tests__/use-client-data-table.test.tsx`. Use `renderHook` from `@testing-library/react` wrapped in nuqs's `NuqsTestingAdapter` (from `nuqs/adapters/testing`) so URL reads/writes are observable in tests without a real router. Seed initial search params via the adapter's `searchParams` prop for the hydration test.

    Implement the six tests in <behavior>. For the debounce-dependent test, use `vi.useFakeTimers()` and `vi.advanceTimersByTime(300)` (DEBOUNCE_MS) inside `act()`, then `vi.useRealTimers()` in cleanup. Build the test column model inline with `columnHelper`/`ColumnDef` — a 2-column shape `{ id: string; n: number }` where the filterable column declares `meta: { options: [{label:'Active',value:'active'}] }` so the array-parser branch is exercised, and `enableColumnFilter: true`.

    For the controlled-visibility test, pass `columnVisibility` + a `vi.fn()` `onColumnVisibilityChange`; assert the controlled read AND that the spy fires on `toggleVisibility`. Then render a second instance without the props and assert internal-state toggling works and the spy is NOT called (uncontrolled fallback).

    Zero-Tolerance: no `any` in the test (type the test row as `{ id: string; n: number }`; type the columns as `ColumnDef<{ id: string; n: number }>[]`). Use `.rejects.toMatchObject` not `.rejects.toThrow` if any rejection is asserted (chai 6 bug per CLAUDE.md). Use `vi.hoisted()` for any variable referenced inside a `vi.mock()` factory.

    Do NOT mock `useReactTable` — exercise the real TanStack instance so the page-count-recompute and visibility assertions are meaningful. Do NOT assert against a frozen pageCount.
  </action>
  <verify>
    <automated>bun run test:unit -- --run src/hooks/__tests__/use-client-data-table.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - The test file runs and all six tests pass.
    - `grep -c "manualPagination" src/hooks/__tests__/use-client-data-table.test.tsx` >= 1 (the manual-flags assertion exists).
    - `grep -c "getPageCount" ...` >= 2 (both the initial-count and the recompute-after-filter assertions exist).
    - `grep -c "NuqsTestingAdapter" ...` >= 1.
    - Controlled-visibility test present: `grep -c "onColumnVisibilityChange" ...` >= 1 AND `grep -c "toggleVisibility" ...` >= 1.
    - No `any`: `grep -E ":\s*any[^a-z]|<any>|as any" src/hooks/__tests__/use-client-data-table.test.tsx` returns zero matches.
    - `bun run typecheck` exits 0.
  </acceptance_criteria>
  <done>Six unit tests pin the client-hook contract (manual flags off, page-count recompute, sort+filter nuqs round-trip, URL hydration, controlled+uncontrolled columnVisibility) and pass; no any.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL query params → table state | nuqs params are user-editable (typed into the address bar). Parsers must validate/coerce; getSortingStateParser already rejects unknown column ids and malformed JSON. |
| In-memory data array → rendered rows | Data originates from the already-owner-scoped `owner_dashboard` RPC upstream (no new trust boundary introduced by this hook; the hook only re-shapes client state). |
| Parent-supplied columnVisibility → table state | Optional controlled prop sourced (downstream) from the persisted dashboard-presets-store; keys are TanStack-validated column ids — unknown ids are ignored by TanStack. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05a-01 | Tampering | `sort` URL param (user-editable JSON) | mitigate | Reuse `getSortingStateParser(columnIds)` unchanged — it `safeParse`s the JSON and returns `null` (falls back to default) when the array shape is wrong OR any `id` is not in the column-id set. No code change needed; the parser is the mitigation. |
| T-05a-02 | Tampering | per-column filter URL params | mitigate | Parsers are `parseAsArrayOf(parseAsString,",")` / `parseAsString` — values are coerced to strings/string-arrays; they feed TanStack's client-side filter (string compare against in-memory rows), never a query/DB. No injection surface. |
| T-05a-03 | Denial of Service | unbounded `page`/`perPage` from URL | accept | `parseAsInteger` coerces non-numerics to the default; an absurd `perPage` only slices a client array already capped by the RPC's row count. No server cost. Page-size selector in Plan 05-02 constrains the UI path. |
| T-05a-04 | Tampering | controlled columnVisibility from parent (persisted store) | accept | `columnVisibility` is a typed `VisibilityState` (Record<string, boolean>); TanStack ignores keys that do not match a column id, so a tampered persisted blob degrades to defaults, never a crash or privilege change. |
| T-05a-SC | Tampering | Supply chain — package installs | accept | This plan installs NO new packages — nuqs, @tanstack/react-table, @testing-library/react are all already in package.json (per 05-CONTEXT.md "Infra already in place"). No RESEARCH.md Package Legitimacy Audit required (no install step). |

</threat_model>

<verification>
- `src/hooks/use-client-data-table.ts` exists, `"use client"`, exports `useClientDataTable`.
- All three `manual*` flags are `false`; no `pageCount` reaches `useReactTable`.
- nuqs mirror (page/perPage/sort/per-column-filter) preserved in the EXACT wire format of `useDataTable` (shared `getSortingStateParser`, `parseAsInteger`, `parseAsArrayOf(parseAsString, ",")`).
- columnVisibility is controllable via optional props with internal useState fallback (B-2).
- `bun run test:unit -- --run src/hooks/__tests__/use-client-data-table.test.tsx` passes (6 tests).
- `bun run typecheck` exits 0; `bun run lint` clean.
- No `any`, no `as unknown as`, no barrel file, no new package installed.
</verification>

<success_criteria>
- DT-02 fulfilled: `useClientDataTable` exists as a client-side variant of `useDataTable` with `manualPagination/Sorting/Filtering: false` over a single in-memory array.
- DT-09 foundation: the hook mirrors page/sort/filter OUT to nuqs in a URL format compatible with the server hook (advances ROADMAP Phase 5 success criterion #2 — "selected filters and sort persist in the URL via nuqs").
- DT-05/D-3 foundation: the hook accepts controlled columnVisibility so Plan 05-03b's persisted-store visibility flows through Plan 05-02 with no off-plan hook edits.
- The "Client vs. server pagination reconciliation" risk (05-CONTEXT.md) is closed by test: page count recomputes after a filter change (not frozen), and there is no double-pagination (manual flags off + nuqs write-back coexist).
- Zero-Tolerance compliance: no `any`, no `as unknown as`, no barrel file, lucide untouched (no UI here).
</success_criteria>

<output>
Create `.planning/phases/05-dashboard-portfolio-datatable/05-01a-SUMMARY.md` when done. Record:
- The exported signature of `useClientDataTable` (props + return shape), explicitly including the optional `columnVisibility` / `onColumnVisibilityChange` props.
- The list of the changes made vs. the forked `useDataTable` (for the reviewer to diff intent), including the controlled-visibility fallback wiring.
- Confirmation that page count recomputes after a filter narrows the array (the un-frozen proof) AND that controlled visibility round-trips (parent spy fires).
- Test count + pass status; `git diff --stat` for the two files.
- A note for Plan 05-02: this hook is the table source; the component passes `data`, `columns`, `getRowId`, `columnVisibility`, `onColumnVisibilityChange`, and reads `{ table }` — NO further hook edit is needed for controlled visibility.
</output>
</output>
