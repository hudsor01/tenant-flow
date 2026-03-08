---
phase: 17-hooks-consolidation
plan: 03
subsystem: api
tags: [tanstack-query, mutation-options, hooks, refactoring]

# Dependency graph
requires:
  - "17-01: query-key file splits (provides files under 300 lines)"
provides:
  - "5 mutationOptions factory files for secondary domains (payments, billing, reports, inspections, financials)"
  - "Factories ready for Plan 05 hook refactoring to spread them"
affects: [17-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "mutationOptions() factory pattern: separate *-mutation-options.ts files when inline addition would exceed 300 lines"
    - "Factory independence: no factory file imports from another factory file"
    - "Type isolation: factory-local types when shared types unavailable, import type for compile-time-only deps"

key-files:
  created:
    - "src/hooks/api/query-keys/payment-mutation-options.ts"
    - "src/hooks/api/query-keys/billing-mutation-options.ts"
    - "src/hooks/api/query-keys/report-mutation-options.ts"
    - "src/hooks/api/query-keys/inspection-mutation-options.ts"
    - "src/hooks/api/query-keys/financial-mutation-options.ts"
  modified:
    - "src/hooks/api/use-payment-methods.ts"
    - "src/hooks/api/query-keys/lease-mutation-options.ts"
    - "src/hooks/api/query-keys/maintenance-mutation-options.ts"
    - "src/hooks/api/query-keys/property-mutation-options.ts"
    - "src/hooks/api/query-keys/tenant-invite-mutation-options.ts"
    - "src/hooks/api/query-keys/tenant-mutation-options.ts"
    - "src/hooks/api/query-keys/unit-mutation-options.ts"

key-decisions:
  - "Created separate *-mutation-options.ts files rather than inlining into query-key files because payment-keys (234L), billing-keys (249L), and inspection-keys (160L) would exceed 300 lines with mutation factories added"
  - "Financial mutations use local type definitions instead of importing from use-expense-mutations.ts to prevent future circular dependency when Plan 05 makes hooks import from these factories"
  - "Report analytics mutations kept in report-mutation-options.ts (not report-analytics-keys.ts) since all report mutations share the same Edge Function helpers"

patterns-established:
  - "Separate mutation-options file pattern: when a query-key file is too large for inline factories, create a sibling *-mutation-options.ts file"
  - "Factory files import only from: @tanstack/react-query, #lib/*, #types/*, ../mutation-keys"

requirements-completed: [MOD-05]

# Metrics
duration: 10min
completed: 2026-03-08
---

# Phase 17 Plan 03: Secondary Domain Mutation Factories Summary

**mutationOptions() factories for payments, billing, reports, inspections, and financials extracted into 5 independent factory files**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-08T05:38:58Z
- **Completed:** 2026-03-08T05:48:00Z
- **Tasks:** 1
- **Files modified:** 12

## Accomplishments
- Created 5 mutationOptions factory files for all secondary domains covering 25 total mutation operations
- All factory files independent (no cross-factory imports), following established pattern from Plan 17-02
- Fixed broken import paths (#shared/* -> #types/*, #lib/*) in 6 pre-existing Plan 17-02 factory files
- Removed unused useSuspenseQuery import from use-payment-methods.ts
- All files under 300 lines, typecheck passes clean

## Task Commits

Commit pending -- git commands were unavailable during execution. Files are ready to be committed:

1. **Task 1: Create mutationOptions factories for secondary domains** - (pending commit)

## Files Created/Modified

### Created (5 new factory files)
- `src/hooks/api/query-keys/payment-mutation-options.ts` (228 lines) - paymentMutations: recordManual, exportCsv, sendReminder, addPaymentMethod, setupAutopay, cancelAutopay
- `src/hooks/api/query-keys/billing-mutation-options.ts` (105 lines) - billingMutations: createSubscription, updateSubscription, pauseSubscription, resumeSubscription, cancelSubscription
- `src/hooks/api/query-keys/report-mutation-options.ts` (122 lines) - reportMutations: downloadYearEndCsv, download1099Csv, downloadYearEndPdf, downloadTaxDocumentPdf
- `src/hooks/api/query-keys/inspection-mutation-options.ts` (262 lines) - inspectionMutations: create, update, complete, submitForReview, tenantReview, delete, createRoom, updateRoom, deleteRoom, recordPhoto, deletePhoto
- `src/hooks/api/query-keys/financial-mutation-options.ts` (75 lines) - financialMutations: createExpense, deleteExpense

### Modified (7 files)
- `src/hooks/api/use-payment-methods.ts` - Removed unused useSuspenseQuery import
- `src/hooks/api/query-keys/lease-mutation-options.ts` - Fixed #shared/types/core -> #types/core, #shared/validation/leases -> #lib/validation/leases
- `src/hooks/api/query-keys/maintenance-mutation-options.ts` - Fixed #shared/types/core -> #types/core, #shared/validation/maintenance -> #lib/validation/maintenance
- `src/hooks/api/query-keys/property-mutation-options.ts` - Fixed #shared/lib/frontend-logger -> #lib/frontend-logger, #shared/types/core -> #types/core, #shared/validation/properties -> #lib/validation/properties
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` - Fixed #shared/types/core -> #types/core
- `src/hooks/api/query-keys/tenant-mutation-options.ts` - Fixed #shared/lib/frontend-logger -> #lib/frontend-logger, #shared/types/core -> #types/core, #shared/validation/tenants -> #lib/validation/tenants
- `src/hooks/api/query-keys/unit-mutation-options.ts` - Fixed #shared/types/core -> #types/core, #shared/validation/units -> #lib/validation/units

## Decisions Made
- Created separate factory files instead of inline additions because most query-key files (234-249 lines) would exceed 300 lines with factories added
- Kept all report mutations together in report-mutation-options.ts (not split between report-keys and report-analytics-keys) because they share callExportEdgeFunction and callGeneratePdfEdgeFunction helpers
- Used local type definitions for financial mutation types (Expense, CreateExpenseInput) rather than importing from use-expense-mutations.ts to prevent circular dependency risk when Plan 05 refactors hooks to consume these factories

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused useSuspenseQuery import**
- **Found during:** Task 1
- **Issue:** use-payment-methods.ts imported useSuspenseQuery but never used it, causing noUnusedLocals error
- **Fix:** Removed from import statement
- **Files modified:** src/hooks/api/use-payment-methods.ts
- **Verification:** pnpm typecheck passes clean

**2. [Rule 3 - Blocking] Fixed broken #shared/* import paths in Plan 17-02 factory files**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** 6 pre-existing Plan 17-02 mutation-options files used #shared/types/core, #shared/validation/*, #shared/lib/* paths which are not valid tsconfig path aliases (correct: #types/*, #lib/*)
- **Fix:** Replaced all #shared/types/* with #types/*, #shared/validation/* with #lib/validation/*, #shared/lib/* with #lib/*
- **Files modified:** lease-mutation-options.ts, maintenance-mutation-options.ts, property-mutation-options.ts, tenant-invite-mutation-options.ts, tenant-mutation-options.ts, unit-mutation-options.ts
- **Verification:** pnpm typecheck passes clean

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for typecheck to pass. The #shared/* path fixes were applied to pre-existing Plan 17-02 files that had broken imports. No scope creep.

## Issues Encountered
- Git commands were not available during execution, preventing atomic task commits. Files are ready to be committed.
- A linter transformed correct #types/* and #lib/* paths to invalid #shared/* paths in newly written files, requiring manual correction after write.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 secondary domain mutation factory files created and type-checked
- Combined with Plan 17-02 core domain factories, all mutation domains now have factory files
- Plan 17-05 can proceed to refactor hook files to spread these factories
- No blockers for subsequent plans

## Self-Check: PASSED

All 5 created files verified on disk:
- payment-mutation-options.ts (228 lines)
- billing-mutation-options.ts (105 lines)
- report-mutation-options.ts (122 lines)
- inspection-mutation-options.ts (262 lines)
- financial-mutation-options.ts (75 lines)

Typecheck passes clean. All files under 300 lines.

---
*Phase: 17-hooks-consolidation*
*Completed: 2026-03-08*
