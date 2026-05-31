---
phase: "05"
plan: 01a
subsystem: dashboard-portfolio-datatable
tags: [data-table, nuqs, tanstack-table, hook, column-visibility]
requires: [src/hooks/use-data-table.ts, src/lib/parsers.ts, src/types/data-table.ts]
provides:
  - "useClientDataTable<TData> — client-side TanStack table with nuqs URL mirror + optional controlled columnVisibility"
affects:
  - "Plan 05-02 (PortfolioDataTable component — drop-in consumer)"
  - "Plan 05-03b (persisted-store columnVisibility flows through as a controlled prop)"
tech-stack:
  added: []
  patterns:
    - "Forked server useDataTable into a client variant with manual* flags off"
    - "Controlled-with-internal-fallback prop pattern for columnVisibility"
key-files:
  created:
    - src/hooks/use-client-data-table.ts
    - src/hooks/__tests__/use-client-data-table.test.tsx
  modified: []
decisions:
  - "Restored real nuqs in the test file via vi.unmock (global unit-setup mocks nuqs to null)"
  - "Real-timer flush instead of fake-timer advance for the debounced filter test"
metrics:
  duration: "~45m"
  completed: "2026-05-30"
requirements: [DT-02, DT-09]
---

# Phase 5 Plan 01a: useClientDataTable Hook Summary

A client-side fork of the server `useDataTable` hook: TanStack Table owns
pagination/sorting/filtering over a single in-memory array (`manual*` flags all
`false`, no `pageCount` prop) while the resulting page/perPage/sort/per-column
filter state is still mirrored OUT to nuqs URL params in the EXACT same wire
format as the server hook. Also exposes `columnVisibility` as an optional
controlled prop (with internal `useState` fallback) so a later plan's
persisted-store visibility round-trips with no off-plan edit to this file.

## Exported signature

```typescript
export function useClientDataTable<TData>(props: UseClientDataTableProps<TData>): {
  table: Table<TData>;
  shallow: boolean;
  debounceMs: number;
  throttleMs: number;
};

interface UseClientDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "state" | "pageCount" | "getCoreRowModel"
    | "manualFiltering" | "manualPagination" | "manualSorting"
  > {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  queryKeys?: Partial<QueryKeys>;
  history?: "push" | "replace";
  debounceMs?: number;
  throttleMs?: number;
  clearOnDefault?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  startTransition?: TransitionStartFunction;
  // Optional controlled column visibility (internal useState fallback):
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}
```

Return shape is identical to `useDataTable`, so Plan 05-02's component is a
drop-in consumer.

## Changes vs. the forked `useDataTable` (reviewer diff intent)

1. **Props interface renamed** `UseDataTableProps` → `UseClientDataTableProps`.
   Dropped the `Required<Pick<TableOptions<TData>, "pageCount">>` intersection
   (the `"pageCount"` key stays in the `Omit` list so it cannot be passed in).
2. **Removed all `pageCount` plumbing** — no `pageCount` destructure, no
   `pageCount` argument to `useReactTable`. `getPaginationRowModel()` computes
   the count from the in-memory filtered array.
3. **Manual flags inverted** — `manualPagination: false`, `manualSorting: false`,
   `manualFiltering: false` (the server hook passes `true` for all three).
4. **Dropped `enableAdvancedFilter` / `joinOperator`** — the simple-filter
   branch is hardcoded (the portfolio uses only faceted filters). The
   `filterParsers` reduction, `useQueryStates(filterParsers)`,
   `initialColumnFilters` derivation, and the `onColumnFiltersChange` ->
   `debouncedSetFilterValues` (which calls `setPage(1)` then `setFilterValues`)
   are kept verbatim.
5. **nuqs mirror kept verbatim** — `page`/`perPage` via `parseAsInteger`, `sort`
   via `getSortingStateParser(columnIds)`, per-column filter keys (array parser
   `parseAsArrayOf(parseAsString, ",")` when `meta.options`, scalar
   `parseAsString` otherwise). URL wire format is identical to the server hook.
6. **Controlled columnVisibility fallback (B-2 fix)** — kept the internal
   `useState(initialState?.columnVisibility ?? {})`, then resolved the EFFECTIVE
   visibility + change handler:
   - `columnVisibility = props.columnVisibility ?? internalColumnVisibility`
   - `onColumnVisibilityChange = props.onColumnVisibilityChange ?? setInternalColumnVisibility`
   Exactly one effective `columnVisibility` flows into `state.columnVisibility`;
   the resolved handler is passed to `useReactTable.onColumnVisibilityChange`.
7. **All row models kept** — core/filtered/pagination/sorted/faceted/
   faceted-unique/faceted-min-max (faceted models drive DT-04 status counts).

## Verification

- **Page count un-frozen (proof):** 25 rows / perPage 10 -> `getPageCount() === 3`;
  after a faceted filter narrows to 1 matching row, `getPageCount()` recomputes
  to `1` (test "computes page count from the in-memory array and recomputes
  after a filter"). No double-pagination — manual flags off and nuqs write-back
  coexist.
- **Controlled visibility round-trips (proof):** with `columnVisibility={{n:false}}`
  + a spy, `table.getState().columnVisibility` reflects `{n:false}` and
  `toggleVisibility()` fires the parent spy (parent owns the change). The
  uncontrolled instance flips internal state with the spy NEVER called.
- **nuqs round-trip:** sort toggle writes the `sort` param in
  `getSortingStateParser` wire format; faceted filter writes a comma-joined
  array param and resets `page` to 1; mount hydrates page + sort from the URL.
- 6/6 unit tests pass. `bun run typecheck` exits 0. `bun run lint` clean.
- No `any`, no `as unknown as`, no barrel file, no new package installed.

## Commits

| Commit | Type | Message |
|--------|------|---------|
| `723ba1d03` | feat | feat(05-01a): add useClientDataTable hook (client-side useDataTable fork) |
| `fb51eae4e` | test | test(05-01a): pin useClientDataTable contract (6 cases) |

```
 src/hooks/__tests__/use-client-data-table.test.tsx | 232 +++++++++++++++++
 src/hooks/use-client-data-table.ts                 | 284 +++++++++++++++++++++
 2 files changed, 516 insertions(+)
```

## Deviations from Plan

All deviations are mechanical test-harness / verify-command issues; the hook's
behavioral contract matches the plan exactly. No architectural deviation.

1. **[Rule 3 - Blocking] Global `nuqs` mock blocked the nuqs round-trip tests.**
   - **Found during:** Task 2.
   - **Issue:** `src/test/unit-setup.ts` globally `vi.mock("nuqs")`s
     `useQueryState` -> `[null, vi.fn()]` and `useQueryStates` -> all-null state
     with a no-op setter (to avoid a Next.js app-router dependency elsewhere).
     Under that mock every nuqs read is null and every write is swallowed, so the
     entire DT-09 contract (page/sort/filter URL mirror) was untestable.
   - **Fix:** Added `vi.unmock("nuqs")` at the top of THIS test file only, so it
     exercises the real nuqs hooks against nuqs's own `NuqsTestingAdapter`
     (`hasMemory` + `onUrlUpdate` spy). No change to the global mock — other
     suites keep the stub.
   - **Files modified:** test file only.
   - **Commit:** `fb51eae4e`.

2. **[Rule 1 - Test correctness] Real timers + settle-flush instead of fake-timer
   advance for the debounced-filter test.**
   - **Found during:** Task 2.
   - **Issue:** The plan's <action> suggests `vi.useFakeTimers()` +
     `vi.advanceTimersByTime(300)`. nuqs's URL-write queue resolves on its own
     real `setTimeout`-based throttle that does not flush cleanly when both the
     hook's 300ms debounce AND the nuqs throttle are faked simultaneously.
   - **Fix:** Drive the write through TanStack `setFilterValue`, then flush with a
     real-timer `await setTimeout(400)` (past the 300ms debounce + the nuqs
     throttle). Still proves the exact behavior the plan requires: array param is
     comma-joined and `page` resets to 1 after the debounce. The faceted column
     uses an explicit `filterFn` (string-array membership) because the TanStack
     default does substring matching that would not match a numeric cell against
     a selected string array.
   - **Files modified:** test file only.
   - **Commit:** `fb51eae4e`.

3. **[Verify-command syntax] `bun run test:unit -- --run <path>` double-passes
   `--run`.** The `test:unit` script already includes `--run`; the plan's verify
   command appends another `--run`, which crashes Vitest 4
   ("Expected a single value for option --run"). Ran
   `bun run test:unit -- <path>` (same effective command). No behavior change.

4. **[Acceptance-grep literalism] Two Task-1 acceptance greps are satisfied in
   intent, not by the literal count, because the plan told me to fork the source
   hook verbatim:**
   - `grep -c "pageCount"` returns `1` (plan expected 0). The single match is the
     `Omit<TableOptions<TData>, ... | "pageCount" | ...>` type-exclusion key —
     the deliberate REMOVAL of the prop, which the plan's <action> step 1
     explicitly instructs me to keep. No `pageCount` reaches `useReactTable`
     (the real intent: zero residual plumbing) — confirmed.
   - `grep -c "getSortingStateParser"` returns `2` (plan expected `== 1`). The
     matches are the import line + the call site — identical to the source
     `useDataTable` (also 2). The `== 1` criterion did not account for the import.

## Known Stubs

None. No placeholder values, hardcoded empties, or TODO/FIXME markers; the hook
is fully wired and exercised by real TanStack + real nuqs in the tests.

## Note for Plan 05-02

This hook is the table source. The `PortfolioDataTable` component passes `data`,
`columns`, `getRowId`, `columnVisibility`, and `onColumnVisibilityChange`, then
reads `{ table }`. Controlled visibility is already wired here — NO further edit
to `use-client-data-table.ts` is needed for Plan 05-03b's persisted-store
visibility to flow through.

## Human-Visual Checkpoint

None in this plan (pure hook + tests, no UI). Wave-1 has no blocking visual
checkpoint to defer.

## Self-Check: PASSED

- `src/hooks/use-client-data-table.ts` — FOUND (284 lines, `"use client"`, exports `useClientDataTable`).
- `src/hooks/__tests__/use-client-data-table.test.tsx` — FOUND (232 lines, 6 passing tests).
- Commit `723ba1d03` — FOUND in git log.
- Commit `fb51eae4e` — FOUND in git log.
