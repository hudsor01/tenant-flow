---
phase: 26-database-stabilization
plan: 01
subsystem: database
tags: [postgres, rls, migration, unique-index, column-default, backfill]

# Dependency graph
requires: []
provides:
  - "Atomic migration fixing 4 data integrity issues on tenant_invitations table"
  - "Corrected RLS policies referencing owner_user_id instead of stale property_owner_id"
  - "Partial unique index preventing duplicate active invitations per (email, owner_user_id)"
  - "Server-side expires_at default (NOW() + 7 days) eliminating client clock skew"
  - "Renamed stale index idx_tenant_invitations_property_owner_id to idx_tenant_invitations_owner_user_id"
affects: [26-02, tenant-invitations, invitation-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backfill-before-constraint: always fix data before adding unique indexes"
    - "Duplicate cleanup with RAISE NOTICE logging for audit trail"
    - "Consolidated SELECT RLS policy for owner+invitee access via OR clause"

key-files:
  created:
    - "supabase/migrations/20260330180000_stabilize_tenant_invitations.sql"
  modified: []

key-decisions:
  - "Used (select auth.uid()) directly instead of get_current_owner_user_id() because owner_user_id stores UUID directly (FK to users.id)"
  - "Consolidated SELECT policy supports both owner (by owner_user_id) and invitee (by email) access patterns"
  - "Partial unique index scoped to pending/sent status only -- historical records not constrained"

patterns-established:
  - "Backfill-before-constraint: fix data compliance before adding unique indexes"
  - "DO block with FOR loop for logging individual cancelled rows via RAISE NOTICE"

requirements-completed: [DB-01, DB-02, DB-03, DB-04]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 26 Plan 01: Stabilize Tenant Invitations Migration Summary

**Atomic SQL migration fixing RLS policies (property_owner_id to owner_user_id), backfilling type CHECK violation, adding partial unique index on active invitations, and setting server-side expires_at default**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T20:32:25Z
- **Completed:** 2026-03-30T20:35:02Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Single atomic migration file addressing all 4 DB requirements (DB-01 through DB-04) in correct dependency order
- All 5 stale RLS policies dropped and 4 new policies created with correct owner_user_id column reference
- Duplicate active invitation cleanup with RAISE NOTICE audit logging, followed by partial unique index creation
- Server-side DEFAULT on expires_at eliminates three client-side expiry calculation code paths
- Stale index renamed from idx_tenant_invitations_property_owner_id to idx_tenant_invitations_owner_user_id

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the stabilize_tenant_invitations migration** - `76d9eff23` (feat)

## Files Created/Modified
- `supabase/migrations/20260330180000_stabilize_tenant_invitations.sql` - Atomic migration with 5 steps: backfill type values, fix RLS policies, cancel duplicates + add unique index, add expires_at default, rename stale index

## Decisions Made
- Used `(select auth.uid())` directly rather than `get_current_owner_user_id()` -- owner_user_id stores the user's UUID (FK to users.id), no lookup through stripe_connected_accounts needed
- SELECT policy consolidated with OR clause to support both owner access (by owner_user_id) and invitee access (by email) for the invitation accept flow
- Partial unique index scoped to `WHERE status IN ('pending', 'sent')` -- cancelled/accepted/expired rows excluded so historical records are not constrained
- Used `IF EXISTS` on all DROP POLICY and DROP INDEX statements for idempotency safety

## Deviations from Plan

None -- plan executed exactly as written. The migration file existed from the planning phase and was verified against all 15 acceptance criteria.

## Issues Encountered
None

## User Setup Required
None -- no external service configuration required. The migration is ready for `supabase db push`.

## Known Stubs
None -- this plan produces a migration file only, no application code with potential stubs.

## Next Phase Readiness
- Migration file ready for `supabase db push` against the live database
- After migration runs, `pnpm db:types` will change `expires_at` from required to optional in the Insert type
- Plan 26-02 (code fixes) depends on this migration being applied first -- it will remove client-side expires_at calculation and fix the portal_access typo in 3 TypeScript files

## Self-Check: PASSED

- [x] `supabase/migrations/20260330180000_stabilize_tenant_invitations.sql` -- FOUND
- [x] Commit `76d9eff23` -- FOUND in git log

---
*Phase: 26-database-stabilization*
*Completed: 2026-03-30*
