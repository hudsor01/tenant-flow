---
phase: "05"
plan: 03b
type: execute
wave: 3
depends_on: ["05-02", "05-03a"]
files_modified:
  - src/stores/dashboard-store.ts
  - src/components/dashboard/dashboard.tsx
  - src/components/dashboard/components/portfolio-preset-menu.tsx
  - src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx
  - src/components/dashboard/components/portfolio-table.tsx
  - src/components/dashboard/components/portfolio-toolbar.tsx
  - src/components/dashboard/components/portfolio-pagination.tsx
autonomous: true
requirements: [DT-01, DT-07, DT-08, DT-09]

must_haves:
  truths:
    - "dashboard-store.ts is trimmed to viewMode ONLY: state { viewMode } + action setViewMode + the single useDashboardViewMode selector; the 3 dead selector hooks (useDashboardFilters, useDashboardSorting, useDashboardPagination) and all filter/sort/pagination state+actions are deleted"
    - "dashboard.tsx mounts <PortfolioDataTable> (from Plan 05-02) and the <PortfolioPresetMenu>, deleting the inline filter/sort/slice logic (old lines ~114-155) and the old <PortfolioToolbar>/<PortfolioTable>/<PortfolioPagination>/inline no-results block"
    - "filter/sort/page live in nuqs (via useClientDataTable inside PortfolioDataTable); dashboard.tsx no longer reads searchQuery/statusFilter/sortField/sortDirection/currentPage/itemsPerPage from the store"
    - "the preset menu calls savePreset with the current snapshot (collected from nuqs + table) and applyPreset writes the snapshot back to nuqs (filters/sort/page) + presets-store columnVisibility (D-1 + D-8)"
    - "the preset snapshot reads/writes the SAME nuqs keys useClientDataTable writes: page, perPage, sort, and the per-column filter keys 'status' (faceted) + 'property' (search, name||address per Plan 05-01b W-3) — the search key is 'property', NOT a separate search/q key"
    - "column visibility is sourced from dashboard-presets-store (D-3) and passed to PortfolioDataTable as the controlled columnVisibility prop (Plan 05-02 forwards it straight to useClientDataTable, which Plan 05-01a accepts as a controlled prop — B-2)"
    - "the 3 hand-rolled files (portfolio-table.tsx, portfolio-toolbar.tsx, portfolio-pagination.tsx) are DELETED in this same change (atomic swap) and no longer imported anywhere"
    - "portfolio-grid.tsx is PRESERVED (it is reused inside PortfolioDataTable for the grid view) and remains imported only transitively"
  artifacts:
    - path: "src/stores/dashboard-store.ts"
      provides: "Trimmed store: viewMode only + useDashboardViewMode"
      contains: "viewMode"
    - path: "src/components/dashboard/dashboard.tsx"
      provides: "Dashboard mounting PortfolioDataTable + preset menu, no inline portfolio logic"
      contains: "PortfolioDataTable"
    - path: "src/components/dashboard/components/portfolio-preset-menu.tsx"
      provides: "Save/apply/delete preset UI bound to dashboard-presets-store + nuqs"
      exports: ["PortfolioPresetMenu"]
  key_links:
    - from: "src/components/dashboard/dashboard.tsx"
      to: "src/components/dashboard/components/portfolio-data-table.tsx"
      via: "mounts <PortfolioDataTable data viewMode onViewModeChange columnVisibility onColumnVisibilityChange/>"
      pattern: "PortfolioDataTable"
    - from: "src/components/dashboard/components/portfolio-preset-menu.tsx"
      to: "src/stores/dashboard-presets-store.ts + nuqs"
      via: "savePreset(snapshot from nuqs+table); applyPreset -> nuqs + columnVisibility"
      pattern: "useDashboardPresetsStore"
    - from: "src/components/dashboard/dashboard.tsx"
      to: "src/stores/dashboard-store.ts useDashboardViewMode"
      via: "viewMode is the ONLY store read remaining"
      pattern: "useDashboardViewMode|viewMode"
---

<objective>
The atomic swap — the only irreversible step in Phase 5 and the highest-stakes plan. In ONE change:

1. **Trim `dashboard-store.ts` to `viewMode` only** (DT-09 final half): delete `searchQuery`/`statusFilter`/`sortField`/`sortDirection`/`currentPage`/`itemsPerPage` state + their actions (`setSearchQuery`/`setStatusFilter`/`clearFilters`/`handleSort`/`setCurrentPage`), and delete the 3 now-dead selector hooks (`useDashboardFilters`, `useDashboardSorting`, `useDashboardPagination`). Keep `viewMode` + `setViewMode` + `useDashboardViewMode` (DT-07 home).
2. **Rewrite `dashboard.tsx`** to mount `<PortfolioDataTable>` (Plan 05-02) + a new `<PortfolioPresetMenu>` (DT-08 UI), deleting the inline portfolio filter/sort/slice block and the old `<PortfolioToolbar>`/`<PortfolioTable>`/`<PortfolioPagination>` + inline no-results. Filter/sort/page now live in nuqs (inside `useClientDataTable`); column visibility comes from `dashboard-presets-store` (D-3) and is passed as the controlled `columnVisibility` prop (Plan 05-02 forwards it to the hook, which accepts it controlled per B-2).
3. **Wire the preset menu** (DT-08): `savePreset(currentSnapshot)` collects the live snapshot from nuqs + the table; `applyPreset(name)` writes the snapshot back to nuqs (filters/sort/page) + the presets-store `columnVisibility` (D-1 round-trip).
4. **Delete the 3 hand-rolled files** (`portfolio-table.tsx`, `portfolio-toolbar.tsx`, `portfolio-pagination.tsx`) — ROADMAP Phase 5 success criterion #5 ("no longer exist") — in the SAME wave that mounts the replacement (05-CONTEXT.md "Atomic swap" risk: never leave a window where both exist or neither renders).

Purpose: this realizes DT-01 (the swap), DT-07 (toggle home), DT-08 (preset UI), and DT-09 (store trim + nuqs source-of-truth) and makes all five ROADMAP Phase 5 success criteria true. The risks it defuses (05-CONTEXT.md): the store-trim must rewrite `dashboard.tsx`'s inline reads in the SAME change (the destructure at old lines 68-82 references fields that cease to exist); the atomic swap deletes the hand-rolled trio in the wave that mounts the replacement so there is never a broken intermediate; `portfolio-grid.tsx` is PRESERVED (reused by `PortfolioDataTable`).

Output:
- `src/stores/dashboard-store.ts` — trimmed.
- `src/components/dashboard/dashboard.tsx` — rewritten portfolio section.
- `src/components/dashboard/components/portfolio-preset-menu.tsx` — new preset UI.
- `src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx` — preset round-trip + URL-state + swap-integrity tests.
- DELETED: `portfolio-table.tsx`, `portfolio-toolbar.tsx`, `portfolio-pagination.tsx`.

This is the final plan; after it, the perfect-PR review gate runs (two consecutive zero-finding cycles).
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
@src/components/dashboard/dashboard.tsx
@src/stores/dashboard-store.ts
@src/components/dashboard/components/portfolio-data-table.tsx
@src/components/dashboard/components/portfolio-columns.tsx
@src/stores/dashboard-presets-store.ts
@src/components/dashboard/dashboard-types.ts
@src/components/ui/dropdown-menu.tsx
@src/components/ui/input.tsx

<interfaces>
<!-- Plan 05-02 PortfolioDataTable prop contract (read 05-02-SUMMARY for exact final shape): -->
```typescript
<PortfolioDataTable
  data={portfolioRows}               // PortfolioRow[] (the inline transform survives — D-10, see dashboard.tsx note)
  viewMode={viewMode}                // from useDashboardViewMode (dashboard-store, trimmed)
  onViewModeChange={setViewMode}
  columnVisibility={columnVisibility}        // from dashboard-presets-store (D-3); controlled, forwarded to useClientDataTable (B-2)
  onColumnVisibilityChange={setColumnVisibility}
/>
```
<!-- Plan 05-03a presets-store contract (read 05-03a-SUMMARY): -->
```typescript
const { presets, savePreset, applyPreset, deletePreset, columnVisibility, setColumnVisibility } = useDashboardPresetsStore();
// snapshot: { filters: Record<string,string|string[]>, sort: SortingState, columnVisibility: VisibilityState, page: number }
```
<!-- nuqs keys (must match useClientDataTable / D-4 / Plan 05-01b): -->
<!--   page, perPage, sort, and per-column filter keys: "status" (faceted, array) + "property" (search, name||address per W-3). -->
<!--   The SEARCH key is "property" (search filters the Property column via its name||address filterFn) — NOT a separate "search"/"q" key. -->
<!-- Collect the snapshot for savePreset by reading these nuqs params + presets-store columnVisibility. -->
<!-- Apply by setting these nuqs params + setColumnVisibility(snapshot.columnVisibility). -->

From dashboard.tsx (PRESERVE): the inline PortfolioRow transform at old lines 84-112 (D-10 LOCKED — survives this phase). Keep it; only the filter/sort/slice block (old lines 114-155) and the render block (old lines 217-265) change.
From dashboard-store.ts (trim target): keep only viewMode/setViewMode + useDashboardViewMode; delete the rest.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Trim dashboard-store.ts to viewMode only (delete dead state + 3 selector hooks)</name>
  <files>src/stores/dashboard-store.ts</files>
  <read_first>
    - src/stores/dashboard-store.ts (FULL — the 5 selector hooks at lines 63-90; the state/actions to trim)
    - src/components/dashboard/dashboard.tsx (confirm — per 05-CONTEXT.md — that dashboard.tsx is the ONLY consumer; Task 2 rewrites its reads in the same change)
    - .planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md (DT-09 net store layout; "Trimming dashboard-store.ts without breaking consumers" risk)
    - CLAUDE.md (Zero Tolerance: no any, no barrel files; Zustand for UI state)
  </read_first>
  <action>
    Rewrite `src/stores/dashboard-store.ts` to hold `viewMode` ONLY:

    - **State**: `{ viewMode: DashboardViewMode }`. Keep `export type DashboardViewMode = "table" | "grid"`.
    - **Actions**: `setViewMode(mode)`.
    - **Selector**: keep `useDashboardViewMode` (returns `{ viewMode, setViewMode }`).
    - **DELETE**: `searchQuery`, `statusFilter`, `sortField`, `sortDirection`, `currentPage`, `itemsPerPage` state; `setSearchQuery`, `setStatusFilter`, `clearFilters`, `handleSort`, `setCurrentPage` actions; the `DashboardStatusFilter` / `DashboardSortField` / `DashboardSortDirection` type exports IF nothing outside this phase imports them (grep first — if `portfolio-grid.tsx` or any preserved file imports them, keep the needed ones; otherwise delete). Delete the 3 dead selector hooks `useDashboardFilters`, `useDashboardSorting`, `useDashboardPagination`.

    Before deleting the type exports, `grep -rn "DashboardStatusFilter\|DashboardSortField\|DashboardSortDirection" src` — delete only the ones with zero remaining importers after Task 2's rewrite. (dashboard.tsx currently imports `DashboardSortField` + `DashboardStatusFilter`; Task 2 drops those imports, so they become deletable.)

    Zero-Tolerance: no `any`, no barrel file. This task pairs with Task 2 — the store will not typecheck against the OLD dashboard.tsx, which is expected; do Task 2 in the same plan run so the repo is green at plan end (NOT necessarily green between Task 1 and Task 2).
  </action>
  <verify>
    <automated>grep -Ec "searchQuery|statusFilter|sortField|currentPage|itemsPerPage|useDashboardFilters|useDashboardSorting|useDashboardPagination" src/stores/dashboard-store.ts</automated>
  </verify>
  <acceptance_criteria>
    - The verify grep returns 0 (all trimmed state/hooks gone).
    - `grep -c "viewMode" src/stores/dashboard-store.ts` >= 1 and `grep -c "useDashboardViewMode" ...` == 1.
    - `grep -Ec "useDashboardFilters|useDashboardSorting|useDashboardPagination" ...` == 0 (3 dead hooks deleted).
    - No `any`: `grep -E ":\s*any[^a-z]|<any>" src/stores/dashboard-store.ts` returns zero matches.
    - `wc -l src/stores/dashboard-store.ts` substantially smaller than the original 91 (sanity: < 40).
  </acceptance_criteria>
  <done>dashboard-store.ts holds viewMode only (state + setViewMode + useDashboardViewMode); all filter/sort/pagination state, actions, and the 3 dead selector hooks are deleted; no any.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Rewrite dashboard.tsx to mount PortfolioDataTable + PortfolioPresetMenu; build the preset menu</name>
  <files>src/components/dashboard/dashboard.tsx, src/components/dashboard/components/portfolio-preset-menu.tsx</files>
  <read_first>
    - src/components/dashboard/dashboard.tsx (FULL — preserve the inline PortfolioRow transform old-lines 84-112 / D-10; replace the filter/sort/slice block old-lines 114-155 and the render block old-lines 217-265)
    - src/components/dashboard/components/portfolio-data-table.tsx (Plan 05-02 — the mount target + its exact prop contract; read 05-02-SUMMARY)
    - src/stores/dashboard-presets-store.ts (Plan 05-03a — savePreset/applyPreset/columnVisibility; read 05-03a-SUMMARY for the snapshot shape + apply contract)
    - src/stores/dashboard-store.ts (trimmed in Task 1 — useDashboardViewMode is the only store read)
    - src/components/dashboard/components/portfolio-columns.tsx (Plan 05-01b — confirm the nuqs filter keys: "status" + "property"; the search key is "property")
    - src/components/ui/dropdown-menu.tsx (for the preset menu trigger/items) and src/components/ui/input.tsx (for the save-preset name input)
    - .planning/phases/05-dashboard-portfolio-datatable/05-01b-SUMMARY.md (pinned "property" search key + "status" faceted key)
    - .planning/phases/05-dashboard-portfolio-datatable/05-02-SUMMARY.md (PortfolioDataTable prop contract; controlled columnVisibility is forwarded to the hook — B-2)
    - .planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md (D-1 snapshot, D-3 visibility source, D-4 nuqs keys, D-5 grid parity; "Atomic swap" + "nuqs<->Zustand ordering" risks)
    - .planning/phases/01-foundation-dedup/01-UI-SPEC.md (tokens, motion budget ≤1 BlurFade for the table region; popover --shadow-lg)
    - CLAUDE.md (Zero Tolerance: no any, no inline styles, tokens, lucide icons, 300-line component / 50-line function caps; nuqs param patterns; "use client" needed for hooks)
  </read_first>
  <behavior>
    - Test "dashboard mounts the new table": rendering Dashboard with propertyPerformance renders <PortfolioDataTable> (a row from data appears) and does NOT render the old PortfolioToolbar/PortfolioTable/PortfolioPagination (those imports are gone).
    - Test "viewMode toggle still works via trimmed store": toggling to grid renders the grid card view (the toggle is the only store-backed control).
    - Test "save preset writes to store + localStorage": opening the preset menu, entering a name, saving → useDashboardPresetsStore has the preset with the current snapshot (filters incl. status + property/search, sort, page from nuqs + columnVisibility).
    - Test "apply preset restores nuqs + visibility": with a saved preset, applying it sets the nuqs sort/filter (status + property)/page params to the snapshot values and updates the presets-store columnVisibility (round-trip).
    - Test "column visibility is sourced from presets-store": hiding a column via the table's view-options updates dashboard-presets-store.columnVisibility (D-3) and the change survives a remount (persist).
  </behavior>
  <action>
    **A. Rewrite `dashboard.tsx`** (the portfolio section only — leave KPI/charts/quick-actions untouched):
    - PRESERVE the inline `PortfolioRow` transform (old lines 84-112, D-10 LOCKED). Keep producing `portfolioData: PortfolioRow[]`.
    - DELETE the inline filter/sort/slice block (old lines 114-155) and `totalPages`/`paginatedData` — TanStack + nuqs own this now inside `PortfolioDataTable`.
    - Replace the store destructure (old lines 68-82) with `const { viewMode, setViewMode } = useDashboardViewMode();` and `const { columnVisibility, setColumnVisibility } = useDashboardPresetsStore();` (D-3 visibility source). Drop the `DashboardSortField` / `DashboardStatusFilter` imports.
    - Replace the render block (old lines 217-265: `<PortfolioToolbar>`/`<PortfolioTable>`/`<PortfolioGrid>`/`<PortfolioPagination>` + inline no-results) with:
      `<PortfolioPresetMenu />` (the new menu) + `<PortfolioDataTable data={portfolioData} viewMode={viewMode} onViewModeChange={setViewMode} columnVisibility={columnVisibility} onColumnVisibilityChange={setColumnVisibility} />`. (The toolbar, no-results, and pagination now live inside PortfolioDataTable.)
    - Remove imports of the 3 deleted files (`portfolio-table`, `portfolio-toolbar`, `portfolio-pagination`). Keep NOT importing `portfolio-grid` directly (PortfolioDataTable imports it). Keep `dynamic` chart imports + KpiBentoRow untouched.

    **B. Build `portfolio-preset-menu.tsx`** exporting `PortfolioPresetMenu`:
    - Read `{ presets, savePreset, applyPreset, deletePreset, columnVisibility }` from `useDashboardPresetsStore`.
    - Read the live nuqs params (page/sort/per-column-filter — use the SAME nuqs keys `useClientDataTable` writes: `page`, `sort`, the faceted `status` key, and the search `property` key per W-3 — via `useQueryState`/`useQueryStates` with the same parsers, OR a small shared `useDashboardUrlState()` helper if cleaner) to build the current `DashboardViewSnapshot` for `savePreset`. Resolve the "nuqs↔Zustand ordering" risk: the URL is the source of truth for filter/sort/page; the snapshot READS from nuqs (not from a stale store). Do NOT invent a separate search/q key — the search filter lives under the `property` column key.
    - A DropdownMenu (or Popover) listing saved presets (apply on click, delete affordance) + a "Save current view" item that opens a small name `Input` and calls `savePreset(name, snapshot)`.
    - `applyPreset(name)` → set the nuqs params (sort/filters incl. status + property/page) from the returned snapshot AND `setColumnVisibility(snapshot.columnVisibility)` (D-1 full restore).
    - Tokens only, lucide icons (e.g. `Bookmark`/`Save`), Tailwind only, no inline styles, no `any`. Icon-only buttons get `aria-label`. Keep under 300 lines / functions < 50 lines.

    Zero-Tolerance throughout: no `any`, no `as unknown as`, no inline styles, no `bg-white`, tokens-only, lucide-only. `"use client"` on both files (hooks + nuqs).

    Do NOT delete the inline transform (D-10). Do NOT import the 3 deleted files. Do NOT touch the KPI/chart sections. Do NOT use a separate search nuqs key — search is the `property` column filter (W-3).
  </action>
  <verify>
    <automated>bun run test:unit -- --run src/components/dashboard/components/__tests__/dashboard-portfolio-swap.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `dashboard.tsx`: `grep -c "PortfolioDataTable" src/components/dashboard/dashboard.tsx` >= 1; `grep -Ec "PortfolioToolbar|PortfolioTable|PortfolioPagination" ...` == 0 (old imports/usages gone); `grep -c "useDashboardViewMode" ...` >= 1.
    - Inline transform preserved: `grep -c "portfolioData" src/components/dashboard/dashboard.tsx` >= 1 (the D-10 transform survives).
    - No filter/sort/slice logic left: `grep -Ec "\.filter\(|\.sort\(|\.slice\(" src/components/dashboard/dashboard.tsx` == 0 in the portfolio section (the inline block is removed).
    - `portfolio-preset-menu.tsx`: `export function PortfolioPresetMenu` present; `grep -c "useDashboardPresetsStore" ...` >= 1; `grep -Ec "savePreset|applyPreset" ...` >= 2; `grep -c "useQueryState\|useQueryStates" ...` >= 1 (reads nuqs for the snapshot); the snapshot uses the `property` + `status` keys (no separate search/q key): `grep -Ec "\"property\"|'property'" ...` >= 1.
    - No `any` / `as unknown as` / inline styles in both files: `grep -E ":\s*any[^a-z]|<any>|as unknown as|style={{" {both files}` returns zero matches.
    - Both files under 300 lines.
    - The 5 swap tests pass.
    - `bun run typecheck` exits 0; `bun run lint` clean.
  </acceptance_criteria>
  <done>dashboard.tsx mounts PortfolioDataTable + PortfolioPresetMenu, drops all inline portfolio filter/sort/slice logic and the 3 old component usages, sources viewMode from the trimmed store + columnVisibility from presets-store (controlled, forwarded per B-2); the preset menu round-trips snapshots through nuqs (status + property keys, W-3) + the persist store; 5 tests pass; no any / inline styles; under 300 lines.</done>
</task>

<task type="auto">
  <name>Task 3: Delete the 3 hand-rolled portfolio files (atomic completion of the swap)</name>
  <files>src/components/dashboard/components/portfolio-table.tsx, src/components/dashboard/components/portfolio-toolbar.tsx, src/components/dashboard/components/portfolio-pagination.tsx</files>
  <read_first>
    - src/components/dashboard/dashboard.tsx (Task 2 output — confirm NONE of the 3 files are imported anymore)
    - .planning/phases/05-dashboard-portfolio-datatable/05-CONTEXT.md ("Atomic swap" risk; success criterion 5 — the 3 files must not exist)
    - CLAUDE.md (No commented-out code, no dead files; delete, do not comment)
  </read_first>
  <action>
    Verify no remaining importer, then DELETE the three hand-rolled files:
    - `git rm src/components/dashboard/components/portfolio-table.tsx`
    - `git rm src/components/dashboard/components/portfolio-toolbar.tsx`
    - `git rm src/components/dashboard/components/portfolio-pagination.tsx`

    Before deleting, run `grep -rn "portfolio-table\|portfolio-toolbar\|portfolio-pagination\|PortfolioTable\|PortfolioToolbar\|PortfolioPagination" src` and confirm the ONLY remaining hits are within these 3 files themselves (and their own tests, which should also be removed if they exist as dedicated test files — check `src/components/dashboard/components/__tests__/` for `portfolio-table.test.*` etc. and `git rm` any that tested ONLY the deleted components).

    PRESERVE `portfolio-grid.tsx` (reused by PortfolioDataTable for the grid view — D-5). Do NOT delete it.

    This task completes the atomic swap: the replacement (Plan 05-02 + Task 2 mount) is live, and the originals are now gone in the same wave (05-CONTEXT.md "Atomic swap" — never leave a window where both exist or neither renders). If `bun run typecheck` or `bun run build` fails after deletion, it means a stray import survived — fix the import (it should already be gone from Task 2), do NOT restore the files.
  </action>
  <verify>
    <automated>ls src/components/dashboard/components/portfolio-table.tsx src/components/dashboard/components/portfolio-toolbar.tsx src/components/dashboard/components/portfolio-pagination.tsx 2>/dev/null | wc -l | tr -d ' '</automated>
  </verify>
  <acceptance_criteria>
    - The verify command returns `0` (none of the 3 files exist).
    - `portfolio-grid.tsx` STILL exists: `ls src/components/dashboard/components/portfolio-grid.tsx` succeeds.
    - No dangling imports: `grep -rn "PortfolioTable\b\|PortfolioToolbar\b\|PortfolioPagination\b" src` returns zero matches.
    - `git status -s` shows the 3 files as deleted (`D`).
    - `bun run typecheck` exits 0; `bun run build` (or `next build` with SKIP_ENV_VALIDATION=true) succeeds; `bun run test:unit` passes (no test references a deleted component).
    - `bun run lint` clean.
  </acceptance_criteria>
  <done>portfolio-table.tsx, portfolio-toolbar.tsx, portfolio-pagination.tsx are deleted; portfolio-grid.tsx preserved; no dangling imports; typecheck + build + tests green — ROADMAP Phase 5 success criterion #5 met.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| nuqs URL params ↔ presets-store snapshot | The preset menu reads filter/sort/page from the URL (keys: page, sort, status, property) and writes them back; both sides go through the same typed parsers (getSortingStateParser, parseAsInteger, parseAsArrayOf/parseAsString). |
| presets-store columnVisibility → table | Controlled visibility flows from the persist store into PortfolioDataTable → useClientDataTable (B-2); TanStack ignores unknown column ids. |
| Deletion of hand-rolled files → render path | After deletion, the only render path is PortfolioDataTable; a stray import would break the build (caught by typecheck/build gate), never a silent half-swap. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-03b-01 | Tampering | applyPreset writing tampered snapshot to nuqs | mitigate | applyPreset's snapshot flows back through the SAME nuqs parsers the URL uses (getSortingStateParser rejects unknown column ids / malformed JSON; parseAsInteger coerces page; the property/status filters are client-side string compares). A tampered persisted preset degrades to defaults, never a crash or cross-owner read. |
| T-05-03b-02 | Tampering / Availability | half-completed swap (both file sets or neither renders) | mitigate | Atomic completion in one wave: Task 2 mounts the replacement, Task 3 deletes the originals, and Task 3's acceptance gate requires `bun run build` + typecheck + tests green — a stray import fails the build rather than shipping a broken dashboard. |
| T-05-03b-03 | Information Disclosure | trimmed store leaving a dangling consumer | mitigate | 05-CONTEXT.md verified dashboard.tsx is the sole consumer; Task 1 + Task 2 rewrite its reads in the same plan; the grep gate confirms zero remaining references to the trimmed state/hooks. |
| T-05-03b-04 | Information Disclosure | portfolio data rendered after swap | accept | Data is the same already-owner-scoped `owner_dashboard` RPC output; the swap changes only the rendering layer, not the data source or its RLS scoping. |
| T-05-03b-SC | Tampering | Supply chain — package installs | accept | No new packages — nuqs, zustand, @tanstack/* and the vendored data-table suite are all already installed. No RESEARCH.md Package Legitimacy Audit required (no install step). |

</threat_model>

<verification>
- `dashboard-store.ts` is trimmed to `viewMode` only (+ `setViewMode` + `useDashboardViewMode`); the 3 dead selector hooks and all filter/sort/pagination state+actions are deleted.
- `dashboard.tsx` mounts `<PortfolioDataTable>` + `<PortfolioPresetMenu>`, preserves the D-10 inline transform, and contains no inline filter/sort/slice logic or old portfolio-component usages.
- The preset menu round-trips a full snapshot (filters incl. status + property/search, sort, columnVisibility, page) through nuqs + the persist store (DT-08, D-1, W-3).
- Column visibility is sourced from `dashboard-presets-store` (D-3) and passed to `PortfolioDataTable` as a controlled prop (forwarded to the hook per B-2).
- `portfolio-table.tsx`, `portfolio-toolbar.tsx`, `portfolio-pagination.tsx` are DELETED; `portfolio-grid.tsx` preserved.
- `bun run typecheck`, `bun run lint`, `bun run build`, `bun run test:unit` all pass.
- No `any`, no `as unknown as`, no inline styles, tokens-only, lucide-only, under 300 lines per file.

## Phase-end perfect-PR gate
After this plan lands, the Phase 5 PR runs the perfect-PR review discipline: two consecutive zero-finding review cycles before merge (CLAUDE.md § Workflow / merge gate). All five ROADMAP Phase 5 success criteria must be demonstrably true on the PR branch.
</verification>

<success_criteria>
- DT-01 fulfilled (completed): the hand-rolled trio is gone; the dashboard portfolio section is driven entirely by the vendored DataTable stack (ROADMAP success criterion #5).
- DT-07 fulfilled: grid/table toggle works; `dashboard-store.ts` is trimmed to `viewMode` only (ROADMAP success criterion #4).
- DT-08 fulfilled: save preset → refresh → re-apply works via the persist store + nuqs round-trip on the status + property keys (ROADMAP success criterion #3).
- DT-09 fulfilled: filter/sort/page live in nuqs URL params; the store is trimmed; refresh restores state (ROADMAP success criterion #2).
- All five ROADMAP Phase 5 success criteria are true: aria-sort + keyboard sort (Wave 1), faceted filter + column-visibility + URL persistence (Waves 1-2), preset round-trip (this plan), grid/table toggle + virtualization (Wave 2 + this plan), and the 3 files deleted (this plan).
- Zero-Tolerance compliance across all touched files.
</success_criteria>

<output>
Create `.planning/phases/05-dashboard-portfolio-datatable/05-03b-SUMMARY.md` when done. Record:
- The final trimmed `dashboard-store.ts` shape.
- The exact `dashboard.tsx` render block after the swap (PortfolioPresetMenu + PortfolioDataTable props).
- The preset menu's snapshot-collection approach (which nuqs keys it reads — page/perPage/sort/status/property — and how it applies back; confirm the search key is `property`, W-3).
- Confirmation the 3 files are deleted (`git status -s` showing `D`) and `portfolio-grid.tsx` preserved.
- Build + typecheck + lint + unit-test results (the swap-integrity gate).
- A mapping of each of the 5 ROADMAP Phase 5 success criteria → where it is now satisfied (for the perfect-PR reviewer).
- Test counts + pass status; `git diff --stat`.
</output>
</output>
