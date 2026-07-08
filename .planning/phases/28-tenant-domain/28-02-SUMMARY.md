---
phase: 28-tenant-domain
plan: 02
subsystem: ui
tags: [tenants, delete, mutation, alert-dialog, bulk, tanstack-query, toast]

# Dependency graph
requires: []
provides:
  - "TenantsProps gains required onDeleteTenant + onBulkDelete callbacks"
  - "row/grid/bulk delete controls invoke useDeleteTenantMutation behind destructive confirms"
  - "the Phase-26 active-lease delete guard surfaces via the mutation's error toast (not swallowed)"
affects: [TEN-01, tenant list, tenant delete, bulk delete]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop-thread a destructive action from the page (owns the confirm dialog + mutation) down through a presentational section into row/grid/bulk controls"
    - "Bulk delete = sequential mutate() per id; each mutation invalidates lists on success and toasts the server guard on failure, so partial failure surfaces per-item without swallowing"

key-files:
  created: []
  modified:
    - src/types/sections/tenants.ts
    - src/components/tenants/tenants.tsx
    - src/app/(owner)/tenants/page.tsx

key-decisions:
  - "Reused the existing single-tenant AlertDialog + confirmDeleteTenant for row/grid delete (onDeleteTenant -> setTenantToDelete); added a SECOND AlertDialog for bulk"
  - "Bulk deletes sequentially via bulkDeleteIds.forEach((id) => deleteTenant(id)) — the mutation already invalidates per success and toasts the active-lease block per failure, so no try/catch swallow"
  - "handleBulkDelete now delegates to onBulkDelete(Array.from(selectedIds)) then clearSelection(); the logger import stays because handleBulkExport still uses it"

patterns-established:
  - "New required props on a shared section interface are landed with their consumer in the same working-tree state; commits split per task but the pre-commit typecheck sees the whole consistent tree"

requirements-completed: [TEN-01]

# Metrics
duration: ~20min
completed: 2026-07-07
---

# Phase 28 Plan 02: Wire tenant delete controls to the real mutation

**Row, grid, and bulk-action-bar tenant deletes now invoke `useDeleteTenantMutation` behind destructive AlertDialog confirms instead of `logger.info` no-ops; the Phase-26 active-lease guard surfaces via the mutation's error toast, and bulk delete removes the whole selected set (skipping active-lease tenants with an error).**

## Accomplishments

### Task 1 — declare + consume delete callbacks (TEN-01)
- `src/types/sections/tenants.ts`: added required `onDeleteTenant: (tenantId: string) => void` and `onBulkDelete: (tenantIds: string[]) => void` to `TenantsProps`.
- `src/components/tenants/tenants.tsx`: destructured the two props; replaced the table and grid `onDelete={(id) => logger.info("Delete tenant requested", ...)}` no-ops with `onDelete={onDeleteTenant}`; rewrote `handleBulkDelete` to `onBulkDelete(Array.from(selectedIds))` then `clearSelection()` (dropped the `logger.info("Bulk delete initiated", ...)` line). The `createLogger`/`logger` import stays — `handleBulkExport` still logs.

### Task 2 — page-level single + bulk confirm wiring (TEN-01)
- `src/app/(owner)/tenants/page.tsx`: passed `onDeleteTenant={(id) => setTenantToDelete(id)}` (reuses the existing single-tenant dialog + `confirmDeleteTenant`) and `onBulkDelete={(ids) => setBulkDeleteIds(ids)}` to `<Tenants>`.
- Added `bulkDeleteIds` state + `confirmBulkDelete` (fires `deleteTenant(id)` per selected id, then clears).
- Rendered a second destructive `AlertDialog` bound to `bulkDeleteIds !== null` with a count-aware title ("Delete N tenant(s)"), a soft-delete + retention + active-lease-skip description, and a destructive-styled action calling `confirmBulkDelete`. The existing single-tenant dialog is untouched.

## Task Commits

1. **Task 1: Thread delete callbacks through Tenants (TEN-01)** — `230a2446f` (fix)
2. **Task 2: Wire single + bulk delete to useDeleteTenantMutation (TEN-01)** — `07a1d56fc` (fix)

## Verification

- `bun run typecheck` — clean (confirms the new required props are supplied by the sole consumer, page.tsx; no test renders `<Tenants>`).
- `bun run lint` — exit 0.
- `grep` confirms no `logger.info("Delete tenant requested"` / `logger.info("Bulk delete initiated"` remains in tenants.tsx.
- Full pre-commit gate passed on both commits.

## Deviations from Plan

None in substance. Ordering note: adding required interface props (Task 1) and satisfying them in page.tsx (Task 2) is one indivisible compile unit, so both edits were applied to the working tree before committing. The pre-commit `tsc --noEmit` checks the on-disk working tree (not the index), so each per-task commit still passed the gate with the tree fully consistent — the same pattern used in Plan 28-04.

## Issues Encountered

None.

## Next Phase Readiness

- All three tenant delete controls are live behind destructive confirms with the active-lease guard surfaced. Manual verify (delete from row / grid / bulk; active-lease tenant shows the block toast) is covered by Plan 06.
- Plan 28-05 (a separate agent) owns tenant-table-row.tsx / tenant-grid.tsx / tenant-table-helpers.tsx (TEN-02 View-lease id + TEN-03 status dropdown) — untouched here.

---
*Phase: 28-tenant-domain*
*Completed: 2026-07-07*
