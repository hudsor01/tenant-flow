---
phase: 52-operations-crud-migration-maintenance-vendors-inspections
plan: 02
subsystem: api
tags: [supabase, postgrest, tanstack-query, storage, inspections]

requires:
  - phase: 51-01
    provides: handlePostgrestError utility + PostgREST pattern established in property-keys.ts and use-properties.ts

provides:
  - inspection-keys.ts rewritten to use supabase.from('inspections') PostgREST direct calls
  - use-inspections.ts mutations rewritten to use supabase.from('inspections'), supabase.from('inspection_rooms'), supabase.from('inspection_photos'), supabase.storage.from('inspection-photos')
  - useCompleteInspection validates all rooms have condition_rating before completion
  - useTenantReview migrated as pure DB operation (no DocuSeal — that is for leases, not inspection reviews)
  - Photo storage cleanup uses non-blocking try/catch (matches useDeletePropertyImageMutation pattern)

affects: [52-03, 53, inspections-ui]

tech-stack:
  added: []
  patterns:
    - PostgREST joins with .select() embedding for inspections list (properties, units, inspection_rooms)
    - Nested photo URL transformation in detailQuery (supabase.storage.getPublicUrl on each photo)
    - Non-blocking Storage cleanup with try/catch after DB delete (matches property-images pattern)
    - useCompleteInspection pre-validates room assessments before status update
    - inspection-photos Storage bucket for all inspection photo CRUD

key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/api/query-keys/inspection-keys.ts
    - apps/frontend/src/hooks/api/use-inspections.ts

key-decisions:
  - "useTenantReview migrated to PostgREST (not deferred): DocuSeal is used for lease e-signatures, not inspection reviews — inspection tenant review is purely a DB record update"
  - "INSPECTION_SELECT_COLUMNS excludes tenant_signature_data and tenant_notes (detail-only fields) to reduce list query payload"
  - "inspection-photos Storage bucket chosen (dedicated bucket per domain, matching property-images pattern)"
  - "useCompleteInspection fetches inspection_rooms to validate condition_rating before marking complete — throws descriptive Error if unassessed rooms remain"
  - "Storage cleanup in useDeleteInspectionRoom is non-blocking (try/catch) — DB delete is the authoritative action"
  - "Type cast fix needed: PostgREST join to properties returns array shape; used 'as unknown as' to remap to singular object for InspectionListItem mapping"

patterns-established:
  - "PostgREST join mapping pattern: cast row.relation as unknown as SingleObject | null when PostgREST inference gives array type for foreign key joins"
  - "Photo storage cleanup: always delete DB record first (authoritative), then Storage (non-blocking try/catch)"
  - "Pre-validation before status transition: fetch related records, throw descriptive Error if preconditions not met"

requirements-completed: [CRUD-04]

duration: 15min
completed: 2026-02-21
---

# Phase 52-02: Inspection Hooks PostgREST Migration Summary

**inspection-keys.ts and use-inspections.ts migrated to Supabase PostgREST direct calls with inspection-photos Storage bucket integration and room-validation guard on completion**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-21
- **Completed:** 2026-02-21
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced all `apiRequest` calls in `inspection-keys.ts` with `supabase.from('inspections')` PostgREST queries — list query joins properties, units, and inspection_rooms; detail query fetches nested rooms with photos and transforms storage_path to publicUrl
- Rewrote all mutations in `use-inspections.ts` — 7 inspection mutations (create, update, complete, submitForTenantReview, tenantReview, delete) + 3 room mutations (create, update, delete) + 2 photo mutations (record, delete) — all using PostgREST
- `useCompleteInspection` validates all rooms have `condition_rating` set before updating status to `completed`, throwing a descriptive error listing the count of unassessed rooms
- Photo mutations use `supabase.storage.from('inspection-photos')` for Storage operations with non-blocking cleanup on failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate inspection-keys.ts to PostgREST** - feat(52-02)
2. **Task 2: Migrate use-inspections.ts mutations to PostgREST + Storage** - feat(52-02)

## Files Created/Modified
- `apps/frontend/src/hooks/api/query-keys/inspection-keys.ts` - Rewrote from apiRequest to supabase.from('inspections') PostgREST with INSPECTION_SELECT_COLUMNS and INSPECTION_DETAIL_SELECT constants; list() maps joined relations to InspectionListItem; detailQuery() transforms photo storage_path to publicUrl
- `apps/frontend/src/hooks/api/use-inspections.ts` - Rewrote all mutations (inspection CRUD, room CRUD, photo record/delete) to use supabase.from() and supabase.storage.from('inspection-photos')

## Decisions Made
- `useTenantReview` was migrated to PostgREST (not deferred to Phase 55 as originally considered): the plan confirmed that DocuSeal is for lease e-signatures only — inspection tenant review is a pure DB operation storing tenant_notes, tenant_signature_data, and setting status='finalized'
- `inspection-photos` chosen as the Storage bucket name — dedicated bucket per domain, matches `property-images` pattern from Phase 51-01
- Type cast pattern: PostgREST TypeScript inference for joined relations (properties, units) returns array types; used `as unknown as T | null` to remap to singular object type for InspectionListItem construction

## Deviations from Plan

### Auto-fixed Issues

**1. TypeScript type cast for PostgREST join inference**
- **Found during:** Task 1 (inspection-keys.ts typecheck)
- **Issue:** TypeScript inferred `row.properties` as `{ name: any; address_line1: any; }[]` (array) when cast to `{ name: string; address_line1: string; }` (singular) — type overlap error TS2352
- **Fix:** Changed cast to `as unknown as { name: string; address_line1: string; } | null` which correctly forces the type while remaining safe given the DB schema FK constraint guarantees at most one match
- **Files modified:** `apps/frontend/src/hooks/api/query-keys/inspection-keys.ts`
- **Verification:** `pnpm --filter @repo/frontend typecheck` passes with zero errors
- **Committed in:** Task 1 commit

---

**Total deviations:** 1 auto-fixed (type cast for PostgREST join inference)
**Impact on plan:** Necessary correction for correctness. No scope creep.

## Issues Encountered
None beyond the type cast fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- inspection-keys.ts and use-inspections.ts are fully PostgREST-migrated
- Ready for Phase 52-03: Delete NestJS maintenance and inspections modules + RLS integration tests for 3 domains
- The `inspection-photos` Storage bucket needs to exist in Supabase before photo mutations work in production (bucket creation may need a migration or manual step)

---
*Phase: 52-operations-crud-migration-maintenance-vendors-inspections*
*Completed: 2026-02-21*
