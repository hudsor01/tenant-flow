---
phase: 06-database-schema-migrations
plan: 02
subsystem: database
tags: [postgres, rls, migration, schema, owner-user-id, documents, leases]

# Dependency graph
requires:
  - phase: 06-00
    provides: "Wave 0 research and migration ordering"
  - phase: 06-01
    provides: "Trigger consolidation (set_updated_at canonical)"
provides:
  - "documents.owner_user_id column with backfilled ownership from 4 entity types"
  - "Direct owner_user_id RLS on documents (no more JOIN-based get_current_property_owner_id)"
  - "3 broken RPCs rewritten to use owner_user_id instead of dropped property_owner_id"
  - "get_current_property_owner_id() function removed"
affects: [06-04, type-regeneration, documents-rls, financial-rpcs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct owner_user_id column on polymorphic tables for fast RLS"
    - "Backfill from parent entities for polymorphic relationships"

key-files:
  created:
    - "supabase/migrations/20260306140000_documents_owner_column.sql"
    - "supabase/migrations/20260306150000_leases_drop_property_owner_id.sql"
  modified:
    - "supabase/migrations/20260304170000_onboarding_backfill.sql"

key-decisions:
  - "documents.owner_user_id ON DELETE SET NULL (GDPR anonymization handles cleanup)"
  - "Tenant document access limited to lease-type documents only (by design)"
  - "get_current_property_owner_id() dropped (no remaining references)"
  - "3 RPCs rewritten to use p_user_id directly (no property_owners lookup)"

patterns-established:
  - "Polymorphic ownership: add direct owner_user_id + backfill from parent entities"
  - "RLS rewrite: direct column check over helper function JOINs"

requirements-completed: [DB-02, DB-03]

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 6 Plan 2: Documents Owner Column + Leases Column Cleanup Summary

**documents.owner_user_id with 4-entity backfill + RLS rewrite, plus 3 broken RPCs fixed from dropped property_owner_id**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-06T01:03:49Z
- **Completed:** 2026-03-06T01:11:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added owner_user_id to documents table with backfill from leases, properties, maintenance_requests, and inspections
- Rewrote all 4 documents RLS policies to use direct owner_user_id check (eliminates slow JOIN through stripe_connected_accounts)
- Dropped get_current_property_owner_id() function (no remaining dependencies)
- Fixed 3 broken RPCs (calculate_monthly_metrics, get_expense_summary, get_invoice_statistics) that referenced non-existent property_owner_id column and property_owners table

## Task Commits

Each task was committed atomically:

1. **Task 1: Add owner_user_id to documents with backfill and RLS rewrite** - `34ba458` (feat)
2. **Task 2: Drop leases.property_owner_id and rewrite referencing RPCs** - `08a1f4a` (fix)

## Files Created/Modified
- `supabase/migrations/20260306140000_documents_owner_column.sql` - Add owner_user_id, backfill, index, RLS rewrite, drop helper function
- `supabase/migrations/20260306150000_leases_drop_property_owner_id.sql` - Rewrite 3 RPCs to use owner_user_id directly
- `supabase/migrations/20260304170000_onboarding_backfill.sql` - Fix property_owners -> stripe_connected_accounts reference

## Decisions Made
- **documents.owner_user_id ON DELETE SET NULL:** Documents survive owner deletion; GDPR anonymization (DB-04) handles cleanup separately
- **Tenant SELECT limited to lease-type documents:** Tenants access inspection/maintenance/property documents through their lease relationship, not directly. This is by design per the plan.
- **Dropped get_current_property_owner_id():** After documents RLS rewrite, no policies or functions reference it. It was a slow JOIN through stripe_connected_accounts.
- **RPCs use p_user_id directly:** The 3 rewritten functions no longer look up v_property_owner_id from property_owners table (which no longer exists). They filter via l.owner_user_id and mr.owner_user_id directly.
- **leases.property_owner_id already dropped:** The column, FK, and index were already gone from the DB. Task 2 focused on fixing the 3 functions that still referenced it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed onboarding_backfill migration referencing non-existent property_owners table**
- **Found during:** Task 1 (migration push)
- **Issue:** Migration 20260304170000_onboarding_backfill.sql referenced public.property_owners which no longer exists, blocking all migration pushes
- **Fix:** Changed property_owners to stripe_connected_accounts (same schema, renamed table)
- **Files modified:** supabase/migrations/20260304170000_onboarding_backfill.sql
- **Verification:** supabase db push succeeded
- **Committed in:** 34ba458 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to unblock migration pipeline. No scope creep.

## Issues Encountered
- **leases.property_owner_id already gone:** The plan expected to drop this column, but it was already dropped by a prior migration. Task 2 adapted to focus on the 3 RPCs that still referenced it (which were broken in production).
- **Pre-existing RLS test failures:** 2 test failures in properties.rls.test.ts caused by set_updated_at() trigger using `new._updated_at` instead of `new.updated_at` (from 06-01 trigger consolidation). Not caused by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- documents.owner_user_id is available for all future RLS and query use
- All RPCs now use canonical owner_user_id pattern
- Type regeneration (pnpm db:types) should be run after all phase 6 migrations complete
- Pre-existing trigger bug (set_updated_at using _updated_at) needs fix in a subsequent plan

---
*Phase: 06-database-schema-migrations*
*Completed: 2026-03-05*
