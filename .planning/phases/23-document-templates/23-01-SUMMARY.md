---
phase: 23-document-templates
plan: 01
subsystem: database
tags: [postgres, rls, tanstack-query, postgrest, supabase, hooks]

requires:
  - phase: none
    provides: existing template pages with stub useTemplateDefinition hook
provides:
  - document_template_definitions table with RLS
  - templateDefinitionQueries query key factory
  - Working useTemplateDefinition hook with PostgREST load/save
affects: [23-document-templates]

tech-stack:
  added: []
  patterns: [PostgREST upsert with onConflict for owner-scoped definitions, useEffect-based data loading with getCachedUser]

key-files:
  created:
    - supabase/migrations/20260311200000_document_template_definitions.sql
    - src/hooks/api/query-keys/template-definition-keys.ts
    - src/app/(owner)/documents/templates/components/template-definition.test.ts
  modified:
    - src/app/(owner)/documents/templates/components/template-definition.ts

key-decisions:
  - "useEffect load pattern instead of useQuery for hook simplicity (avoids double-render with query + state sync)"
  - "PostgREST upsert with onConflict for idempotent save (owner_user_id + template_key unique constraint)"

patterns-established:
  - "Template definition persistence: jsonb custom_fields column with DynamicField[] shape"
  - "Owner-scoped table pattern: owner_user_id FK + RLS + unique constraint per entity key"

requirements-completed: [DOC-03]

duration: 7min
completed: 2026-03-11
---

# Phase 23 Plan 01: Template Definition Persistence Summary

**PostgREST-backed custom field persistence for document template definitions with RLS, query key factory, and 10 unit tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-11T22:10:20Z
- **Completed:** 2026-03-11T22:17:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created document_template_definitions table with RLS policies, UNIQUE constraint, CHECK constraint, and set_updated_at() trigger
- Built templateDefinitionQueries query key factory following project queryOptions() pattern
- Replaced stub toast in useTemplateDefinition with real PostgREST load/save cycle
- 10 passing tests covering load, save, toasts, isSaving state, form defaults, and cache invalidation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration and query key factory** - `0166b85` (feat)
2. **Task 2 RED: Add failing tests** - `f0371c4` (test)
3. **Task 2 GREEN: Wire useTemplateDefinition to PostgREST** - `b1d5607` (feat)

**Plan metadata:** (pending final commit)

_Note: Task 2 followed TDD flow (RED -> GREEN)_

## Files Created/Modified
- `supabase/migrations/20260311200000_document_template_definitions.sql` - Table, RLS policies, index, trigger
- `src/hooks/api/query-keys/template-definition-keys.ts` - Query key factory with byTemplateKey queryOptions
- `src/app/(owner)/documents/templates/components/template-definition.ts` - Hook wired to PostgREST load/save
- `src/app/(owner)/documents/templates/components/template-definition.test.ts` - 10 unit tests

## Decisions Made
- Used useEffect-based loading (getCachedUser + direct PostgREST) instead of useQuery to keep the hook interface simple and avoid double-render from query-to-state sync
- PostgREST upsert with onConflict clause for idempotent save behavior (one definition per owner per template type)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed pre-existing broken files blocking commits**
- **Found during:** Task 1 (commit phase)
- **Issue:** Untracked build-template-html.test.ts and build-template-html.ts files (from plan 23-02 planning phase) had lint errors (hex colors) and typecheck errors (missing module) that blocked all pre-commit hooks
- **Fix:** Removed files from working directory to unblock commits. Files are preserved in git stash and belong to plan 23-02 scope.
- **Files affected:** src/app/(owner)/documents/templates/components/build-template-html.test.ts, build-template-html.ts
- **Verification:** Lint and typecheck pass clean after removal
- **Committed in:** n/a (removal only, files restored via stash pop in subsequent commits)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary to unblock commits. No scope creep. 23-02 files preserved for their plan executor.

## Issues Encountered
None beyond the pre-existing blocking files documented above.

## User Setup Required
None - no external service configuration required. Migration needs to be applied to live database (`supabase db push` or deploy pipeline).

## Next Phase Readiness
- Template definition persistence is complete and ready for use by all 4 template types
- Plan 23-02 (PDF preview/export) can proceed independently
- The build-template-html files for 23-02 exist in untracked state for that plan's executor

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 23-document-templates*
*Completed: 2026-03-11*
