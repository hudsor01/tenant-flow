---
phase: 27-maintenance-inspections
plan: 02
subsystem: ui
tags: [maintenance, data-table, delete, pagination, tanstack-query, actions-column]

# Dependency graph
requires: []
provides:
  - "maintenance list renders exactly one actions column (columns.tsx MaintenanceActionsCell)"
  - "delete persists — invalidates maintenanceQueries.lists() + stats() + ownerDashboardKeys.all"
  - "real client page count via Math.ceil(rowCount / PAGE_SIZE); Next/Last stop at the true last page"
affects: [MAINT-03, MAINT-04, MAINT-05, maintenance list view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single PAGE_SIZE constant shared by initialState.pagination.pageSize and pageCount so they cannot drift"
    - "Client-computed pageCount Math.max(1, Math.ceil(data.length / PAGE_SIZE)) for a fully client-side table"

key-files:
  created: []
  modified:
    - src/components/maintenance/table/maintenance-table.client.tsx
    - src/components/maintenance/table/columns.tsx

key-decisions:
  - "Consolidated on the columns.tsx actions cell (it already invalidates the source query) and deleted the client-appended duplicate + its broken useOptimistic path"
  - "useOptimistic delete reverted on transition end because it never invalidated the source query — removed entirely along with all now-dead imports (noUnusedLocals)"
  - "use-data-table.ts untouched (Phase 32 owns it) — passing a real pageCount at the call site is the whole MAINT-05 fix"

requirements-completed: [MAINT-03, MAINT-04, MAINT-05]

# Metrics
duration: ~15min
completed: 2026-07-06
---

# Phase 27 Plan 02: Maintenance List View (single actions column, durable delete, real pagination)

**The maintenance list now shows exactly one actions column, a deleted request stays gone (the surviving delete invalidates the source query plus the owner dashboard), and the pagination footer shows a real "Page X of N" with Next/Last stopping at the true last page.**

## Accomplishments

- `maintenance-table.client.tsx`: removed the entire `columnsWithActions` array (the client-appended second `{ id: "actions" }` column) and the broken `useOptimistic`/`removeOptimistic`/`handleDelete`/`deletingId`/`isPending`+`startTransition` delete machinery. The incoming `columns` prop is passed straight to `useDataTable`, and `initialRequests` is fed directly as `data`. Pruned all now-dead imports (`useOptimistic`, `useState`, `useTransition`, `toast`, `Trash2`, the AlertDialog cluster, `createClient`, `createLogger`) — only `Link`/`Button`/`Plus` for the "New Request" header remain.
- `columns.tsx`: `MaintenanceActionsCell.handleDelete` now invalidates `ownerDashboardKeys.all` alongside `maintenanceQueries.lists()` + `maintenanceQueries.stats().queryKey` (CLAUDE.md mutation-invalidation rule). Imported `ownerDashboardKeys` from `#hooks/api/query-keys/owner-dashboard-keys`.
- `maintenance-table.client.tsx`: `pageCount: -1` replaced with `Math.max(1, Math.ceil(initialRequests.length / PAGE_SIZE))`; page size is a single `PAGE_SIZE = 10` constant used in both `initialState.pagination.pageSize` and the count.

## Task Commits

1. **Task 1: One durable actions column (MAINT-03 + MAINT-04)** — `cc24dc873` (fix)
2. **Task 2: Real client page count (MAINT-05)** — `57c852454` (fix)

## Verification

- `bun run typecheck` — clean (dead code + unused imports removed with no residue).
- `grep 'useOptimistic' maintenance-table.client.tsx` — none.
- `grep -c 'id: "actions"' maintenance-table.client.tsx` — 0.
- `grep -c 'ownerDashboardKeys' columns.tsx` — 2 (import + invalidation).
- `grep 'pageCount: -1'` — gone; `grep -c 'Math.ceil'` — 1.
- Both commits passed the full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit+coverage, commitlint).

## Deviations

- None. Both files were in the plan's `files_modified`. Split into two atomic commits (Task 1 kept `pageCount: -1` transiently; Task 2 introduced the real count) so each commit is a genuine working state.

## Self-Check: PASSED
- One actions column: the table passes the `columns` prop through; no second `{id:'actions'}` remains.
- Durable delete: the surviving `MaintenanceActionsCell` delete invalidates lists + stats + ownerDashboardKeys.all.
- Real pageCount: `Math.ceil(rowCount / PAGE_SIZE)` with a shared PAGE_SIZE constant; use-data-table.ts unchanged.

---
*Phase: 27-maintenance-inspections*
*Completed: 2026-07-06*
