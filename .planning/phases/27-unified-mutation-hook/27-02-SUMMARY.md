---
phase: 27-unified-mutation-hook
plan: 02
subsystem: api
tags: [tanstack-query, hooks, mutations, invitations, duplicate-detection]

requires:
  - phase: 27-01
    provides: INVITATION_ACCEPT_PATH constant in routes.ts
provides:
  - useCreateInvitation() unified hook for all invitation creation
  - Exported sendInvitationEmail for reuse by multiple hooks
  - Cleaned up old invite() factory and useInviteTenantMutation
affects: [28-ui-migration, tenant-invitations, lease-wizard]

tech-stack:
  added: []
  patterns: [discriminated-union-result, duplicate-pre-check, 23505-race-condition-fallback]

key-files:
  created:
    - src/hooks/api/use-create-invitation.ts
    - src/hooks/api/__tests__/use-create-invitation.test.tsx
  modified:
    - src/hooks/api/query-keys/tenant-invite-mutation-options.ts
    - src/hooks/api/use-tenant-invite-mutations.ts
    - src/hooks/api/__tests__/use-tenant.test.tsx

key-decisions:
  - "Discriminated union result type: { status: 'created' | 'duplicate', ... } lets callers decide UI"
  - "Non-null assertions (!) used for array access after length > 0 check to satisfy noUncheckedIndexedAccess"
  - "expires_at included in insert payload despite plan note about DB DEFAULT (generated types require it)"

patterns-established:
  - "Duplicate pre-check pattern: query before insert, fallback on 23505 race condition"
  - "Discriminated result type for mutations that can return different outcomes"

requirements-completed: [INV-01, INV-02, INV-03, INV-04]

duration: 10min
completed: 2026-03-30
---

# Phase 27 Plan 02: Unified Mutation Hook Summary

**Unified useCreateInvitation() hook with type derivation, duplicate detection, 23505 race condition fallback, and 9-test TDD coverage**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-30T22:44:39Z
- **Completed:** 2026-03-30T22:54:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created useCreateInvitation() as the sole invitation creation entrypoint
- Implemented duplicate detection with pre-check query and 23505 race condition fallback
- Automated type derivation: lease_id present = lease_signing, else platform_access
- Standardized 3-key cache invalidation (tenants, invitations, dashboard)
- Removed old invite() factory and useInviteTenantMutation (zero references remain)
- 9 TDD test cases covering all behaviors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCreateInvitation hook with duplicate detection and type derivation** - `8cf050f47` (feat)
2. **Task 2: Remove old invite factory and useInviteTenantMutation, update existing tests** - `dd242cacc` (refactor)

## Files Created/Modified
- `src/hooks/api/use-create-invitation.ts` - Unified invitation creation hook with type derivation, duplicate detection, cache invalidation
- `src/hooks/api/__tests__/use-create-invitation.test.tsx` - 9 test cases covering type derivation, duplicates, 23505 race condition, cache invalidation, URL construction, error handling
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` - Removed invite() factory, kept resend/cancel/notification, removed unused TenantWithExtras and INVITATION_ACCEPT_PATH imports
- `src/hooks/api/use-tenant-invite-mutations.ts` - Removed useInviteTenantMutation and leaseQueries import, kept resend/cancel/notification hooks
- `src/hooks/api/__tests__/use-tenant.test.tsx` - Removed useInviteTenantMutation import and test block (replaced by new dedicated test file)

## Decisions Made
- Used discriminated union result type (`{ status: 'created' | 'duplicate', ... }`) so callers decide their own UI response to duplicates (no toast from hook for duplicate case)
- Included `expires_at` in insert payload (plan noted "DB DEFAULT handles it" but generated types require it as non-optional)
- Used non-null assertions (`!`) for array indexed access after explicit `length > 0` guard to satisfy `noUncheckedIndexedAccess` strictness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed expires_at omission in insert payload**
- **Found during:** Task 1 (hook creation)
- **Issue:** Plan said to omit expires_at (DB DEFAULT), but supabase.ts generated Insert type requires it as non-optional
- **Fix:** Included expires_at calculation (7-day expiry) in insert payload, matching the existing pattern from the old invite() factory
- **Files modified:** src/hooks/api/use-create-invitation.ts
- **Verification:** TypeScript compiles clean
- **Committed in:** 8cf050f47

**2. [Rule 1 - Bug] Fixed noUncheckedIndexedAccess type errors**
- **Found during:** Task 2 (typecheck verification)
- **Issue:** `existingInvitations[0]` has type `T | undefined` due to noUncheckedIndexedAccess, causing type errors
- **Fix:** Added non-null assertions after explicit `length > 0` guard
- **Files modified:** src/hooks/api/use-create-invitation.ts
- **Verification:** pnpm typecheck passes
- **Committed in:** dd242cacc

**3. [Rule 1 - Bug] Removed unused test variables**
- **Found during:** Task 2 (typecheck verification)
- **Issue:** mockSelectChain and mockInsertChain declared but unused (noUnusedLocals)
- **Fix:** Removed the two unused variable declarations
- **Files modified:** src/hooks/api/__tests__/use-create-invitation.test.tsx
- **Verification:** pnpm typecheck passes
- **Committed in:** dd242cacc

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All fixes were necessary for TypeScript strict mode compliance. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useCreateInvitation() is ready for Phase 28 UI migration
- Three component files (invite-tenant-form, onboarding-step-tenant, selection-step-filters) still use inline mutations that Phase 28 will migrate to use the new hook
- sendInvitationEmail is exported and available for any hook that needs email send capability

## Self-Check: PASSED

All 5 files verified present. Both commits (8cf050f47, dd242cacc) verified in git log.

---
*Phase: 27-unified-mutation-hook*
*Completed: 2026-03-30*
