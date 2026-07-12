# Phase 27: Maintenance & Inspections - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning
**Source:** 2026-07-02 whole-codebase bug hunt (MAINT-01..08, INSP-01..02), file:line-verified; DB facts re-verified live 2026-07-05.

<domain>
## Phase Boundary
Restore the maintenance board + list + the inspection photo flow. Scope is exactly MAINT-01..08 + INSP-01..02 — almost all frontend, with ONE small migration (MAINT-08 adds an `expenses.description` column). Builds on Phases 25-26; do not regress the dollars money model or the soft-delete filters. **Out of scope:** phases 28-35; the two `@modal` dead trees; any maintenance/inspection redesign.
</domain>

<decisions>
## Implementation Decisions (each verified against source + live DB)

### MAINT-01 — kanban drag never works (P1)
`maintenance-kanban.client.tsx:202` `handleDragEnd` uses `over.id` as the new status, but the only registered droppables are the sortable CARDS (`useSortable({id: request.id})`) — no `useDroppable` on columns — so `over.id` is always another request's UUID → the optimistic update sets `status=<uuid>` → the DB CHECK rejects it → toast + rollback on every drag.
**LOCKED:** register each column as a droppable (`useDroppable({id: column.id})` where `column.id` is a valid status), and in `handleDragEnd` resolve the drop target to the column's status (via `over.data`/the column droppable id), not the card UUID. Handle drop-on-a-card (resolve to that card's column) and drop-on-empty-column. Valid statuses (live CHECK): `open, assigned, in_progress, needs_reassignment, completed, cancelled, on_hold`.
**Verify:** dragging a card to another column changes its status and persists (no CHECK violation).

### MAINT-02 — kanban search inert (P1)
`maintenance-kanban.client.tsx:165` copies `initialRequests` into `useState` ONCE; the parent recomputes `filteredRequests` and re-renders the board with a new prop, but the state never syncs → typing in search does nothing.
**LOCKED:** drive the board from the (filtered) prop directly, or sync state to the prop (keyed remount or an effect). Prefer deriving from the prop so search + status grouping stay live. Do NOT reintroduce a stale local copy.

### MAINT-03 — duplicate actions column (P1)
`maintenance-table.client.tsx:78` appends a second `{id:'actions'}` column while `columns.tsx:196` already ships one → two Edit/Delete per row + duplicate React keys.
**LOCKED:** keep ONE actions column. Remove the client-appended duplicate; keep the `columns.tsx` `MaintenanceActionsCell` (which has proper query invalidation) OR consolidate — but exactly one actions column with a working delete (see MAINT-04). Reconcile with MAINT-04 so the surviving delete invalidates the query.

### MAINT-04 — optimistic delete reverts (P1)
`maintenance-table.client.tsx:47` deletes via `useOptimistic(initialRequests)` but never invalidates/refetches the source query, so when the transition ends the optimistic state reverts to the unchanged `initialRequests` prop → the deleted row reappears (until a later window-focus refetch).
**LOCKED:** after the delete, invalidate the maintenance list query (+ `ownerDashboardKeys.all` per project rule) so the source data refetches and the row stays gone. If the surviving actions column (MAINT-03) uses the `columns.tsx` delete (which already invalidates), prefer that and drop the broken optimistic path.

### MAINT-05 — pageCount:-1 (P1)
`maintenance-table.client.tsx:137` passes `pageCount:-1` to a client-paginated table → react-table treats page count as unknown → "Page 1 of -1", Next enabled forever, last-page jumps to page 1.
**LOCKED:** pass a real `pageCount` (`Math.ceil(rowCount / pageSize)`) so the footer + controls work. (Note: `use-data-table`'s inert-filter issue is UIX-01/Phase 32 — do NOT fix that here; just the pageCount.)

### MAINT-06 — assigned / needs_reassignment invisible (P2)
The kanban `COLUMNS` has only open/in_progress/completed/on_hold/cancelled (5), but the DB CHECK allows `assigned` + `needs_reassignment` too (written by `vendorMutations.assign`/`unassign`). Requests in those statuses group under a key no column renders → they vanish from the board + the stat counts; the detail `StatusSelect` offers no `assigned` item and the header badge falls back to "Open".
**LOCKED:** add `assigned` + `needs_reassignment` columns to the kanban `COLUMNS`, add them to `status-select.tsx`, and add their badge config to `STATUS_CONFIG` (kanban + `maintenance-header-card.tsx`). Cover all 7 valid statuses so no request is invisible or mis-badged.

### MAINT-07 — "Completed" stat mislabeled (P2)
`maintenance-view.client.tsx:67` `completedCount = requests.filter(r => r.status==='completed').length` counts all-time, but the caption says "this month".
**LOCKED:** either scope the count to this month (filter `completed_at >= start-of-month`, local-zone via the codebase date helpers) OR change the caption to match the all-time count. Pick the one that matches the tile's intent (likely: keep the caption "this month" and scope the count).

### MAINT-08 — add-expense discards Description (P2) — the one migration
`add-expense-dialog.tsx:57` collects a Description textarea but the insert payload is `{maintenance_request_id, vendor_name, amount, expense_date}` and `expenses` has NO `description` column (verified live: id, maintenance_request_id, vendor_name, amount, expense_date, created_at, updated_at, status).
**LOCKED:** add a nullable `description text` column to `public.expenses` (migration via Supabase MCP + reconcile filename), include it in the insert payload, and (if expenses are displayed) render it. Migration is additive/backward-compatible. Verify RLS still covers the column (column-level RLS not used — table RLS applies). Run `bun run db:types` after (a new column DOES change generated types).

### INSP-01 — inspection photos broken end-to-end (P1)
`inspection-room-card.tsx:209` renders `<img src={/api/v1/inspections/photos/${photo.id}/url}>` — a route that does not exist (only `/api/og/*`; no rewrites). AND the query layer `inspection-keys.ts:126` resolves `publicUrl` via `getPublicUrl()` on the `inspection-photos` bucket, which is PRIVATE (verified live `public=false`) → 403 URLs.
**LOCKED:** (a) resolve inspection photo URLs via SIGNED urls (`createSignedUrls(paths, 3600)`), mirroring the maintenance-photos pattern (`maintenance-keys.ts` `createSignedUrls`); (b) render the resolved signed URL in `inspection-room-card.tsx` (drop the nonexistent `/api/v1/...` route). Use `<img>` (not next/image) for the signed cross-origin URL — matching the CSP note that private-route storage images use `<img>` (and Phase 33/SEC-02 will fix the CSP `img-src`; for now the render path must be correct).
**Verify:** an inspection with uploaded photos shows the images (signed URLs resolve, no 404/403).

### INSP-02 — inspection photo upload broken (P1)
`inspection-photo-upload.tsx:68` maps `pendingFiles` (a filtered subset) with the index from that filtered array but writes status to `files[idx]` (the FULL array) → wrong tiles get the status; failed uploads never set `status:'error'` (stuck spinner, no retry); an already-uploaded file can be re-uploaded (duplicate storage object + duplicate `recordPhoto` DB row).
**LOCKED:** index each file by a stable id (not the filtered-array index) so status lands on the right tile; set `status:'error'` on the `Promise.allSettled` rejection path (with a remove/retry affordance); guard against re-uploading a file already in `success` status (skip succeeded files). Mirror the corrected `use-supabase-upload` semantics where sensible (UIX-02/Phase 32 fixes the shared hook; here fix the inspection-specific component).
**Verify:** batch upload with one failure → the failed tile shows error + retry, the succeeded tile shows success; re-clicking upload does not duplicate a succeeded photo.

### Claude's Discretion
- Exact dnd-kit droppable wiring for MAINT-01 (column `useDroppable` + `over.data.current`).
- MAINT-07 direction (scope count vs relabel) — pick to match the tile intent.
- Whether MAINT-03/04 consolidate into the `columns.tsx` actions cell or keep the client one (must end with one column + a delete that invalidates).
</decisions>

<canonical_refs>
## Canonical References (read before planning/implementing)
- `src/components/maintenance/kanban/maintenance-kanban.client.tsx` — MAINT-01 (drag), MAINT-02 (search sync), MAINT-06 (columns/STATUS_CONFIG).
- `src/components/maintenance/table/maintenance-table.client.tsx` + `table/columns.tsx` — MAINT-03 (dup column), MAINT-04 (optimistic delete), MAINT-05 (pageCount).
- `src/components/maintenance/detail/status-select.tsx` + `maintenance-header-card.tsx` — MAINT-06 (status items + badges).
- `src/components/maintenance/maintenance-view.client.tsx` — MAINT-07 (Completed stat).
- `src/components/maintenance/detail/add-expense-dialog.tsx` + `supabase/migrations/` (new) — MAINT-08 (description column).
- `src/components/inspections/inspection-room-card.tsx` + `src/hooks/api/query-keys/inspection-keys.ts` — INSP-01; `src/hooks/api/query-keys/maintenance-keys.ts` `createSignedUrls` is the CORRECT signed-URL reference.
- `src/components/inspections/inspection-photo-upload.tsx` — INSP-02.
- CLAUDE.md — status is text+CHECK; migrations MCP+reconcile + `db:types` on column change; `next/image` doesn't support cross-origin signed storage URLs → use `<img>`; mutations invalidate related keys + `ownerDashboardKeys.all`.

### Live DB facts (verified 2026-07-05)
- `maintenance_requests_status_check` = `open, assigned, in_progress, needs_reassignment, completed, cancelled, on_hold` (7).
- `expenses` columns: id, maintenance_request_id, vendor_name, amount, expense_date, created_at, updated_at, status — NO `description`.
- `inspection-photos` bucket: `public = false` (private → signed URLs required). `maintenance-photos`: also private (its hook already uses `createSignedUrls`).
</canonical_refs>

<specifics>
## Specific Ideas
- MAINT-01 + MAINT-06 interact: the kanban must have a droppable column for every status a card can hold (all 7), else a drag to a missing column silently fails.
- MAINT-03 + MAINT-04 must be resolved together (one actions column whose delete invalidates the query).
- INSP-01's fix mirrors the maintenance-photos signed-URL pattern (same private-bucket class).
- MAINT-08 is the only DB change — additive column + `db:types` regen; verify with a rolled-back insert incl. description.
</specifics>

<deferred>
## Deferred (tracked elsewhere)
- `use-data-table` inert filters + `use-supabase-upload` double-upload → UIX-01/UIX-02 (Phase 32).
- CSP `img-src` for storage images → SEC-02 (Phase 33) — INSP-01 fixes the render path; the CSP allowance is separate.
- Anything not in MAINT-01..08 / INSP-01..02.
</deferred>

---
*Phase: 27-maintenance-inspections*
*Context gathered 2026-07-05 from the whole-codebase bug hunt.*
