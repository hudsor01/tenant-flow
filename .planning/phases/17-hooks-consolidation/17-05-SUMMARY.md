---
phase: 17-hooks-consolidation
plan: 05
subsystem: api
tags: [mutationOptions, tanstack-query, mutation-factories, hooks-refactor]
dependency_graph:
  requires: [17-02, 17-03]
  provides: [mutation-spread-pattern-all-hooks]
  affects: [audit-phase, all-mutation-hooks]
tech_stack:
  added: []
  patterns: [mutationOptions-spread-in-all-hooks, inline-mutation-factory-consts]
key_files:
  created: []
  modified:
    - src/hooks/api/use-billing-mutations.ts
    - src/hooks/api/use-expense-mutations.ts
    - src/hooks/api/use-inspection-mutations.ts
    - src/hooks/api/use-inspection-photo-mutations.ts
    - src/hooks/api/use-inspection-room-mutations.ts
    - src/hooks/api/use-payment-mutations.ts
    - src/hooks/api/use-payment-methods.ts
    - src/hooks/api/use-report-mutations.ts
    - src/hooks/api/use-auth-mutations.ts
    - src/hooks/api/use-profile-mutations.ts
    - src/hooks/api/use-profile-avatar-mutations.ts
    - src/hooks/api/use-profile-emergency-mutations.ts
    - src/hooks/api/use-emergency-contact.ts
    - src/hooks/api/use-notifications.ts
    - src/hooks/api/use-owner-notification-settings.ts
    - src/hooks/api/use-stripe-connect.ts
    - src/hooks/api/use-identity-verification.ts
    - src/hooks/api/use-mfa.ts
    - src/hooks/api/use-sessions.ts
    - src/hooks/api/use-tenant-payments.ts
    - src/hooks/api/use-tenant-autopay.ts
    - src/hooks/api/use-tenant-maintenance.ts
    - src/hooks/api/use-tenant-settings.ts
    - src/components/auth/two-factor-setup-dialog.tsx
decisions:
  - "use-tenant-dashboard.ts skipped -- no mutations, only composite query hook"
  - "use-reports.ts mutations kept inline -- tightly coupled with useState for optimistic undo UI"
  - "use-inspection-room-mutations.ts updateRoom kept inline -- factory signature mismatch (roomId at creation vs {roomId,dto} as variables)"
  - "use-mfa.ts module-level Supabase client fixed to per-function createClient() calls (CLAUDE.md rule)"
  - "Inline factory naming uses domain prefix (e.g. mfaMutationFactories, sessionMutationFactories) for disambiguation"

requirements-completed: [MOD-05]

metrics:
  duration: 50min
  completed: "2026-03-08"
---

# Phase 17 Plan 05: Secondary Mutation Hook Refactoring Summary

**All 23 secondary mutation hook files refactored to spread mutationOptions() factories -- 9 from dedicated factory files, 14 with inline factory consts**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2 of 2 completed
- **Files modified:** 24

## Accomplishments

- 9 hook files refactored to spread from existing Plan 02/03 factory files (billing, payment, inspection, report, financial)
- 14 hook files refactored with new inline mutationOptions factory consts (auth, profile, emergency-contact, notifications, MFA, sessions, stripe-connect, identity-verification, tenant-payments, tenant-autopay, tenant-maintenance, tenant-settings)
- All onSuccess/onError/onSettled/onMutate callbacks remain in hook files (not in factories)
- All ownerDashboardKeys.all invalidation preserved intact
- Module-level Supabase client violation fixed in use-mfa.ts

## Task Details

### Task 1: Refactor hooks with existing factory files (9 files)

Refactored 8 hook files to spread from factory files created in Plans 02/03:

1. **use-billing-mutations.ts** -- 5 mutations spread from billingMutations, useBillingPortalMutation kept inline (no factory)
2. **use-expense-mutations.ts** -- 2 mutations spread from financialMutations (createExpense, deleteExpense)
3. **use-inspection-mutations.ts** -- 6 mutations spread from inspectionMutations
4. **use-inspection-photo-mutations.ts** -- 2 mutations spread from inspectionMutations (recordPhoto, deletePhoto)
5. **use-inspection-room-mutations.ts** -- 2 mutations spread (createRoom, deleteRoom), updateRoom kept inline (signature mismatch)
6. **use-payment-mutations.ts** -- 3 mutations spread from paymentMutations (recordManual, exportCsv, sendReminder)
7. **use-payment-methods.ts** -- 1 mutation spread from paymentMutations (addPaymentMethod), delete/setDefault kept inline
8. **use-report-mutations.ts** -- 4 mutations spread from reportMutations

use-reports.ts analyzed but skipped -- delete/download mutations are tightly coupled with useState for optimistic undo.

### Task 2: Create inline factories and refactor remaining hooks (15 files)

Created inline `mutationOptions()` factory consts in 15 hook files:

1. **use-auth-mutations.ts** -- `authMutationFactories` (6 entries: logout, login, signup, resetPassword, updateProfile, changePassword)
2. **use-profile-mutations.ts** -- `profileMutationFactories` (2 entries: update, updatePhone)
3. **use-profile-avatar-mutations.ts** -- `avatarMutationFactories` (2 entries: upload, remove)
4. **use-profile-emergency-mutations.ts** -- `profileEmergencyMutationFactories` (2 entries: update, remove)
5. **use-emergency-contact.ts** -- `emergencyContactMutationFactories` (2 entries: update, delete)
6. **use-notifications.ts** -- `notificationMutationFactories` (5 entries: markRead, delete, markAllRead, markBulkRead, createMaintenance)
7. **use-owner-notification-settings.ts** -- `ownerNotificationSettingsMutationFactories` (1 entry: update)
8. **use-stripe-connect.ts** -- `stripeConnectMutationFactories` (2 entries: createAccount, refreshLink)
9. **use-identity-verification.ts** -- `identityVerificationMutationFactories` (1 entry: start)
10. **use-mfa.ts** -- `mfaMutationFactories` (3 entries: enroll, verify, unenroll)
11. **use-sessions.ts** -- `sessionMutationFactories` (1 entry: revoke)
12. **use-tenant-payments.ts** -- `tenantPaymentMutationFactories` (1 entry: rentCheckout)
13. **use-tenant-autopay.ts** -- `tenantAutopayMutationFactories` (1 entry: toggle)
14. **use-tenant-maintenance.ts** -- `tenantMaintenanceMutationFactories` (1 entry: create)
15. **use-tenant-settings.ts** -- `tenantSettingsMutationFactories` (1 entry: updateNotificationPreferences)

use-tenant-dashboard.ts skipped -- no mutations exist in this file (composite query hook only).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed module-level Supabase client in use-mfa.ts**
- **Found during:** Task 2 (use-mfa.ts refactoring)
- **Issue:** `const supabase = createClient()` at module level violates CLAUDE.md rule "No module-level Supabase client"
- **Fix:** Moved `createClient()` inside each query/mutation function body
- **Files modified:** src/hooks/api/use-mfa.ts

**2. [Rule 1 - Bug] Fixed unknown error type in two-factor-setup-dialog.tsx**
- **Found during:** TypeScript verification after Task 2
- **Issue:** `verifyMfa.error` changed from `Error` to `unknown` type (from factory's TError=unknown generic), causing TS2322 in JSX conditional `{verifyMfa.error && ...}`
- **Fix:** Changed to `{verifyMfa.error !== null && ...}` for explicit boolean narrowing
- **Files modified:** src/components/auth/two-factor-setup-dialog.tsx

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Verification Results

- `pnpm typecheck` -- passes clean (0 errors)
- `pnpm test:unit` -- 1412 tests pass
- `pnpm lint` -- no errors

## Decisions Made

1. **use-tenant-dashboard.ts skipped:** File contains no mutations -- only a composite hook composing other query hooks. No refactoring needed.
2. **use-reports.ts mutations kept inline:** The delete/download mutations have tightly coupled useState for optimistic undo patterns that don't cleanly separate into factories.
3. **updateRoom kept inline in use-inspection-room-mutations.ts:** Factory's `updateRoom(roomId)` takes roomId at creation time, but hook receives `{ roomId, dto }` as mutation variables -- signature mismatch prevents spread.
4. **Domain-prefixed factory names:** Each file uses a unique prefix (e.g., `mfaMutationFactories`, `sessionMutationFactories`) to avoid naming collisions if ever consolidated.

## Issues Encountered

- use-mfa.ts write initially failed due to linter auto-modifying the file between read and write -- resolved by re-reading and rewriting.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All secondary mutation hooks now use the mutationOptions() spread pattern
- Ready for Plan 17-06 (final audit/cleanup) to verify consistency across all mutation sites

## Self-Check: PASSED

- SUMMARY.md exists at expected path
- All 6 new factory files verified (mfaMutationFactories, sessionMutationFactories, tenantPaymentMutationFactories, tenantAutopayMutationFactories, tenantMaintenanceMutationFactories, tenantSettingsMutationFactories)
- All previously-modified files intact (notificationMutationFactories, emergencyContactMutationFactories, stripeConnectMutationFactories, identityVerificationMutationFactories, ownerNotificationSettingsMutationFactories)
- `pnpm typecheck` passes
- `pnpm test:unit` -- 1412 tests pass
- `pnpm lint` -- no errors

---
*Phase: 17-hooks-consolidation*
*Completed: 2026-03-08*
