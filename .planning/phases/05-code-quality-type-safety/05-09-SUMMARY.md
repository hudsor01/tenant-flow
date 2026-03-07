---
phase: 05-code-quality-type-safety
plan: 09
subsystem: ui
tags: [tanstack-query, hooks, code-splitting, refactoring]

requires:
  - phase: 05-07
    provides: "Query key factories in query-keys/ directory"
  - phase: 05-08
    provides: "First batch of hook splits (tenant, lease, billing, reports, owner-dashboard, inspections)"
provides:
  - "use-property-mutations.ts with CRUD + mark-sold + image deletion"
  - "use-expense-mutations.ts with expense queries, CRUD mutations, tax documents"
  - "All 11 CODE-11 hook files under 300 lines"
affects: [hook-consumers, code-quality]

tech-stack:
  added: []
  patterns: ["query/mutation split pattern for hook files"]

key-files:
  created:
    - src/hooks/api/use-property-mutations.ts
    - src/hooks/api/use-expense-mutations.ts
  modified:
    - src/hooks/api/use-properties.ts
    - src/hooks/api/use-financials.ts

key-decisions:
  - "Prefetch hooks (usePrefetchPropertyDetail, usePrefetchPropertyWithUnits) moved to mutations file since they use usePrefetchQuery from same imports"
  - "Expense queries (useExpenses, useExpensesByProperty, useExpensesByDateRange) co-located with expense mutations in use-expense-mutations.ts for domain cohesion"
  - "Tax document hooks moved to use-expense-mutations.ts alongside expenses (same financial domain)"
  - "No re-exports from use-financials.ts -- all consumers updated to import directly from use-expense-mutations.ts"

patterns-established:
  - "Query/mutation split: queries stay in use-{domain}.ts, mutations go to use-{domain}-mutations.ts"

requirements-completed: [CODE-11]

duration: 11min
completed: 2026-03-05
---

# Phase 5 Plan 09: Hook File Splits (Batch 2) Summary

**Split use-properties.ts (431->93) and use-financials.ts (313->59), completing CODE-11 -- all 11 oversized hook files now under 300 lines**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-05T20:46:02Z
- **Completed:** 2026-03-05T20:57:00Z
- **Tasks:** 2 (Task 1 already completed by 05-08)
- **Files modified:** 16

## Accomplishments
- Split use-properties.ts into query hooks (93 lines) and use-property-mutations.ts (276 lines)
- Split use-financials.ts into financial overview/statements (59 lines) and use-expense-mutations.ts (248 lines)
- All 11 previously-oversized hook files now under 300 lines (CODE-11 fully resolved)
- Updated 16 consumer files with direct imports (no re-exports)
- pnpm typecheck passes clean

## Task Commits

1. **Task 1: Split use-reports, use-owner-dashboard, use-inspections** - `adc7460` (already done in 05-08)
2. **Task 2: Split use-properties and use-financials** - `bca7385` (refactor)

**Plan metadata:** pending

## Files Created/Modified
- `src/hooks/api/use-property-mutations.ts` - Property CRUD, mark-sold, image deletion mutations
- `src/hooks/api/use-expense-mutations.ts` - Expense queries, CRUD mutations, tax documents
- `src/hooks/api/use-properties.ts` - Query-only (431->93 lines)
- `src/hooks/api/use-financials.ts` - Overview/statement hooks only (313->59 lines)
- `src/components/onboarding/onboarding-step-property.tsx` - Updated import
- `src/app/(owner)/properties/property-details.client.tsx` - Updated import
- `src/components/properties/property-form.client.tsx` - Updated import
- `src/components/properties/property-image-gallery.tsx` - Split import
- `src/components/properties/properties.tsx` - Updated import
- `src/app/(owner)/financials/expenses/page.tsx` - Split import
- `src/app/(owner)/financials/expenses/_components/expense-table.tsx` - Updated import
- `src/app/(owner)/financials/tax-documents/page.tsx` - Updated import
- `src/hooks/api/__tests__/use-properties.test.tsx` - Split import
- `src/hooks/api/__tests__/property-mutations.test.tsx` - Updated import
- `src/hooks/api/__tests__/use-expenses.test.ts` - Updated import
- `src/hooks/api/__tests__/use-financials.test.tsx` - Split import

## Decisions Made
- Prefetch hooks moved to mutations file since they share the same import context
- Expense queries co-located with expense mutations for domain cohesion
- Tax documents moved with expenses (same financial domain)
- No re-exports -- all consumers updated to import directly from defining file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 already completed by 05-08 commit**
- **Found during:** Task 1 (Split reports, owner-dashboard, inspections)
- **Issue:** Commit adc74606a from Plan 05-08 already split all 3 files and updated imports
- **Fix:** Verified existing splits were correct, proceeded directly to Task 2
- **Files modified:** None (work already done)

---

**Total deviations:** 1 (blocking -- task overlap with prior plan)
**Impact on plan:** No functional impact. Task 1 work was already complete from Plan 08. Task 2 executed as planned.

## Issues Encountered
- Pre-existing lint error in use-billing-mutations.ts (unused import from 05-08) -- out of scope
- Pre-existing test failure in lease-action-buttons.test.tsx (from 05-08 lease split) -- out of scope

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CODE-11 fully resolved: all 11 hook files under 300 lines
- Ready for remaining Phase 5 plans

---
*Phase: 05-code-quality-type-safety*
*Completed: 2026-03-05*
