---
phase: 05-code-quality-type-safety
plan: 08
subsystem: hooks
tags: [tanstack-query, react, code-quality, file-splitting]

# Dependency graph
requires:
  - phase: 05-07
    provides: "Query key factories in query-keys/ directory"
provides:
  - "6 mutation files (use-tenant-mutations, use-lease-mutations, use-billing-mutations, use-payment-mutations, use-profile-mutations, use-auth-mutations)"
  - "2 query-keys files (billing-keys.ts, payment-keys.ts)"
  - "All 6 oversized hook files now under 300 lines"
affects: [05-09, 05-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Query/mutation split pattern: queries stay in base file, mutations move to -mutations file"
    - "Query key extraction: inline keys move to query-keys/ directory files"

key-files:
  created:
    - src/hooks/api/use-tenant-mutations.ts
    - src/hooks/api/use-lease-mutations.ts
    - src/hooks/api/use-billing-mutations.ts
    - src/hooks/api/use-payment-mutations.ts
    - src/hooks/api/use-profile-mutations.ts
    - src/hooks/api/use-auth-mutations.ts
    - src/hooks/api/query-keys/billing-keys.ts
    - src/hooks/api/query-keys/payment-keys.ts
  modified:
    - src/hooks/api/use-tenant.ts
    - src/hooks/api/use-lease.ts
    - src/hooks/api/use-billing.ts
    - src/hooks/api/use-payments.ts
    - src/hooks/api/use-profile.ts
    - src/hooks/api/use-auth.ts

key-decisions:
  - "authKeys stays in use-auth.ts per CLAUDE.md rule (single auth query key factory)"
  - "billingKeys/billingQueries extracted to query-keys/billing-keys.ts following established convention"
  - "payment keys/queries extracted to query-keys/payment-keys.ts for consistency"
  - "PROFILE_SELECT and mapUserProfile exported from use-profile.ts for reuse by mutations file"
  - "use-billing.ts re-exports billingKeys and billingQueries for backward-compatible import paths"
  - "callDocuSealEdgeFunction moved to use-lease-mutations.ts (only used by mutations)"
  - "callBillingEdgeFunction duplicated in use-billing-mutations.ts (mutations need it, not queries)"

patterns-established:
  - "Hook split pattern: base file keeps queries/types/keys, -mutations file gets all useMutation hooks"
  - "Shared helpers (mappers, select constants) exported from base file for mutation file reuse"

requirements-completed: [CODE-11]

# Metrics
duration: 14min
completed: 2026-03-05
---

# Phase 5 Plan 8: Hook File Splitting Summary

**Split 6 oversized hook files (506-839 lines) into query/mutation pairs, each under 300 lines, with 2 new query-keys files**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-05T20:45:58Z
- **Completed:** 2026-03-05T21:00:00Z
- **Tasks:** 2
- **Files modified:** 26 source files + 5 test files

## Accomplishments
- All 6 oversized hook files now under 300 lines (from 506-839 lines each)
- Created 6 new mutation files with proper imports and no re-exports
- Extracted billing and payment query keys to query-keys/ directory
- Updated all 26 consumer files with correct import paths
- All 84 test files pass (974 tests), typecheck clean, lint clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Split use-tenant, use-lease, use-billing** - `adc74606a` (refactor)
2. **Task 2: Split use-payments, use-profile, use-auth** - `2af930ce4` (refactor)
3. **Fix: Update test mocks for split imports** - `798f74269` (fix)

## Files Created/Modified

**Created (8 files):**
- `src/hooks/api/use-tenant-mutations.ts` - Tenant CRUD, invitation, batch, notification mutations
- `src/hooks/api/use-lease-mutations.ts` - Lease CRUD, terminate, renew, DocuSeal signature mutations
- `src/hooks/api/use-billing-mutations.ts` - Subscription CRUD, billing portal mutations
- `src/hooks/api/use-payment-mutations.ts` - Manual payment, CSV export, payment reminder mutations
- `src/hooks/api/use-profile-mutations.ts` - Profile update, avatar, phone, emergency contact mutations
- `src/hooks/api/use-auth-mutations.ts` - Sign in, sign up, sign out, password reset/change mutations
- `src/hooks/api/query-keys/billing-keys.ts` - billingKeys, subscriptionsKeys, billingQueries
- `src/hooks/api/query-keys/payment-keys.ts` - rentCollectionKeys, rentPaymentKeys, paymentVerificationKeys, query factories

**Modified (6 base files, line count reduction):**
- `use-tenant.ts`: 839 -> 234 lines
- `use-lease.ts`: 665 -> 170 lines
- `use-billing.ts`: 600 -> 231 lines
- `use-payments.ts`: 587 -> 193 lines
- `use-profile.ts`: 580 -> 116 lines
- `use-auth.ts`: 507 -> 280 lines

## Decisions Made
- authKeys stays in use-auth.ts per CLAUDE.md rule
- use-billing.ts re-exports keys/queries from billing-keys.ts for backward compatibility
- use-payments.ts re-exports keys/queries from payment-keys.ts for backward compatibility
- PROFILE_SELECT and mapUserProfile exported as shared utilities from use-profile.ts
- callDocuSealEdgeFunction co-located with lease mutations (only consumer)
- callBillingEdgeFunction co-located with billing mutations (only consumer)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused import lint error in use-billing-mutations.ts**
- **Found during:** Task 1 verification (pnpm lint)
- **Issue:** handlePostgrestError imported but unused after extracting mutations
- **Fix:** Removed unused import
- **Files modified:** src/hooks/api/use-billing-mutations.ts
- **Committed in:** 798f74269

**2. [Rule 1 - Bug] Updated test mock paths for 4 component test files**
- **Found during:** Task 2 verification (pnpm test:unit)
- **Issue:** Tests mocked old import paths (use-auth, use-lease, use-profile) for mutation functions
- **Fix:** Split mocks to point at new -mutations files
- **Files modified:** app-shell.test.tsx, tenant-shell.test.tsx, lease-action-buttons.test.tsx, profile-page.test.tsx
- **Committed in:** 798f74269

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor test/lint fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CODE-11 first batch (6 of 11 oversized files) complete
- Remaining 5 oversized files can be addressed in plan 05-09 or 05-10
- All query key factories now in query-keys/ directory

## Self-Check: PASSED

All 8 created files verified on disk. All 3 commits (adc74606a, 2af930ce4, 798f74269) verified in git log.

---
*Phase: 05-code-quality-type-safety*
*Completed: 2026-03-05*
