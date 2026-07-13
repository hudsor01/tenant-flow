---
phase: 27-maintenance-inspections
plan: 01
subsystem: ui
tags: [maintenance, kanban, dnd-kit, droppable, status, search, tanstack-query]

# Dependency graph
requires: []
provides:
  - "MaintenanceStatus union covers all 7 valid DB statuses (adds assigned + needs_reassignment)"
  - "kanban columns are real drop targets; drag resolves the column status (not a card UUID) and persists"
  - "kanban board derives from the filtered prop so search filters live; drag optimism via an override map"
affects: [MAINT-01, MAINT-02, MAINT-06, maintenance kanban, status-select, STATUS_CONFIG]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "dnd-kit useDroppable per column carrying { type: 'column', status }; drop target resolved from over.data.current via a typed guard, never over.id"
    - "Prop-derived board + optimistic status-override map (Record<string, MaintenanceStatus>) applied on top of the prop and cleared on refetch/error — replaces the stale useState list copy"
    - "isMaintenanceStatus type guard backed by a ReadonlySet of column ids (no as-unknown-as, no any)"

key-files:
  created: []
  modified:
    - src/types/core.ts
    - src/components/maintenance/detail/maintenance-utils.ts
    - src/components/maintenance/detail/status-select.tsx
    - src/components/maintenance/kanban/maintenance-kanban.client.tsx
    - src/lib/validation/maintenance.ts

key-decisions:
  - "Widened MaintenanceStatus to the full DB CHECK set (open, assigned, in_progress, needs_reassignment, completed, cancelled, on_hold); post-widen typecheck surfaced the Zod maintenanceStatusSchema as a 5th lockstep site beyond the plan's listed files"
  - "assigned/needs_reassignment columns fall into the count>0 branch — visible when populated, never hidden, but not cluttering the default board"
  - "Drop target resolved via a ReadonlySet-backed type guard so only valid statuses reach the DB; DB CHECK + RLS remain the backstop"
  - "Optimistic override map keyed by request id (not a full list copy) preserves drag feedback while the board stays prop-driven for live search"

requirements-completed: [MAINT-01, MAINT-02, MAINT-06]

# Metrics
duration: ~45min
completed: 2026-07-06
---

# Phase 27 Plan 01: Maintenance Kanban (droppable columns, live search, all 7 statuses)

**Dragging a maintenance card onto another column now changes its status and persists (no CHECK violation, no rollback toast); typing in the search box filters the board live; and requests in `assigned` / `needs_reassignment` render with correct badges, StatusSelect items, and columns.**

## Accomplishments

### Task 1 — cover all 7 statuses (MAINT-06)
- `core.ts`: widened `MaintenanceStatus` to all 7 DB CHECK values (added `assigned`, `needs_reassignment`).
- `maintenance-utils.ts`: added exhaustive `STATUS_CONFIG` entries — `assigned` (UserCheck, `bg-primary/10 text-primary`), `needs_reassignment` (RotateCcw, `bg-orange-500/10 text-orange-600 dark:text-orange-400`).
- `status-select.tsx`: added "Assigned" + "Needs Reassignment" SelectItems, ordered open → assigned → in_progress → needs_reassignment → on_hold → completed → cancelled.
- `maintenance-kanban.client.tsx`: added the two columns (UserCheck / RotateCcw icons); they render via the `count > 0` branch so no request in those statuses is ever hidden.
- `maintenance.ts` (Zod): widened `maintenanceStatusSchema` to all 7 values — **surfaced by the post-widen typecheck** (the mutation's `data` type is the Zod-inferred `MaintenanceRequestUpdate`, not the generated one; vendor assign/unassign already write these two statuses, so they must validate).

### Task 2 — droppable columns + drop-target resolution (MAINT-01)
- Each `KanbanColumn` now registers `useDroppable({ id: column.id, data: { type: "column", status: column.id } })` with `setNodeRef` on the whole cards container (empty-state area included).
- `handleDragEnd` resolves the target via `resolveDropStatus(over.data.current)`: a column droppable → its `status`; a card (`type: "maintenance-request"`) → its `columnId`. A `ReadonlySet`-backed `isMaintenanceStatus` type guard keeps it type-safe (no `any`, no `as unknown as`). The raw `over.id as MaintenanceStatus` UUID bug is gone.
- On success it invalidates `maintenanceQueries.lists()` (prefix array) + `ownerDashboardKeys.all`.

### Task 3 — prop-driven board + live search (MAINT-02)
- Removed the stale `useState<MaintenanceDisplayRequest[]>(initialRequests)` copy that never synced. `requests` is now derived each render from the filtered `initialRequests` prop, so grouping, both drag handlers, and the overlay all read live data.
- Optimistic drag feedback preserved via a `Record<string, MaintenanceStatus>` override map applied on top of the prop and cleared by `clearStatusOverride` on refetch success (or on error — which reverts to the prop status).

## Task Commits

1. **Task 1: Cover all 7 statuses (MAINT-06)** — `390be968a` (fix)
2. **Task 2: Droppable columns + resolve drop target (MAINT-01)** — `f1445cca0` (fix)
3. **Task 3: Drive the board from the filtered prop (MAINT-02)** — `9bfd665cc` (fix)

## Verification

- `bun run typecheck` — clean (confirms the widened union + exhaustive STATUS_CONFIG Record; caught the Zod lockstep site).
- `grep 'over.id as MaintenanceStatus'` — gone; `grep -c 'useDroppable'` — 2; `grep -c 'ownerDashboardKeys'` — 2.
- `grep 'useState<MaintenanceDisplayRequest[]>('` — gone; `grep -c 'setRequests'` — 0; `grep -c 'initialRequests'` — 4.
- All three commits passed the full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit+coverage, commitlint). One biome JSX-wrap format fix was applied to the RotateCcw icon line before the Task 1 commit landed.

## Deviations

- **Widened `src/lib/validation/maintenance.ts`** (the Zod `maintenanceStatusSchema`) beyond the plan's `files_modified` list. This was the missed lockstep site the plan's "run typecheck after the union widening" directive was designed to surface — the update mutation's `data` type resolves to the Zod-inferred `MaintenanceRequestUpdate`, so the 5-value enum blocked `assigned`/`needs_reassignment` at compile time.

## Self-Check: PASSED
- `MaintenanceStatus` lists all 7 statuses; STATUS_CONFIG, status-select items, kanban COLUMNS, and the Zod enum all cover them.
- Columns are droppable; the target status resolves from the column/card data (not a UUID); success invalidates lists + dashboard keys.
- Board grouping + both drag handlers derive from the filtered prop; search is live; drag optimism preserved via the override map, not a stale copy.

---
*Phase: 27-maintenance-inspections*
*Completed: 2026-07-06*
