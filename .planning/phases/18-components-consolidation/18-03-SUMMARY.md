---
phase: 18-components-consolidation
plan: 03
subsystem: ui
tags: [component-splitting, cleanup, code-quality, cash-flow, testimonials, pricing, stepper, forms]

# Dependency graph
requires:
  - phase: 18-components-consolidation
    provides: "Plan 01-02 established splitting patterns for UI primitives and large components"
provides:
  - "All 8 medium feature components (337-368 lines) under 300 lines via sub-component extraction"
  - "All 11 borderline components (301-329 lines) under 300 lines via cleanup"
  - "Borderline hook (use-tenant-payments.ts) under 300 lines via cleanup"
  - "FlowList helper extracted from cash-flow.tsx to deduplicate inflows/outflows rendering"
  - "CARD_BRANDS lookup object in payment-methods-list.tsx replacing switch statement"
  - "Data-driven steps array in bulk-import-stepper.tsx replacing repetitive JSX"
affects: [18-components-consolidation, 18-04, 18-05, 18-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cleanup-first strategy for borderline files: remove comments, tighten JSX, consolidate imports before splitting"
    - "Data-driven rendering: replace repetitive JSX blocks with config arrays + .map()"
    - "Lookup objects replacing switch statements for brand/type mapping"

key-files:
  created:
    - src/components/properties/property-form-fields.tsx
    - src/components/tenants/tenant-detail-sheet-tabs.tsx
    - src/components/financials/balance-sheet-sections.tsx
    - src/components/connect/connect-account-steps.tsx
    - src/components/leases/dialogs/renew-lease-form-fields.tsx
    - src/components/properties/properties-filters.tsx
    - src/components/pricing/owner-subscribe-plan-selector.tsx
    - src/components/leases/table/leases-table-columns.tsx
  modified:
    - src/components/properties/property-form.client.tsx
    - src/components/tenants/tenant-detail-sheet.tsx
    - src/components/financials/balance-sheet.tsx
    - src/components/connect/connect-account-status.tsx
    - src/components/leases/dialogs/renew-lease-dialog.tsx
    - src/components/properties/properties.tsx
    - src/components/pricing/owner-subscribe-dialog.tsx
    - src/components/leases/table/leases-table.tsx
    - src/components/financials/cash-flow.tsx
    - src/components/sections/testimonials-section.tsx
    - src/components/sections/hero-dashboard-mockup.tsx
    - src/components/properties/bulk-import-stepper.tsx
    - src/components/pricing/kibo-style-pricing.tsx
    - src/components/properties/edit-unit-panel.tsx
    - src/components/leases/wizard/details-step.tsx
    - src/components/billing/payment-methods-list.tsx
    - src/components/financials/tax-documents.tsx
    - src/components/dashboard/chart-area-interactive.tsx
    - src/hooks/api/use-tenant-payments.ts

key-decisions:
  - "Cleanup-first strategy: 11 borderline files all resolved via cleanup alone without needing splits"
  - "FlowList component extracted in cash-flow.tsx to deduplicate identical inflows/outflows rendering"
  - "TanStack Form type extraction uses { Field: React.ComponentType<any> } pattern (full 12-param generic too complex)"
  - "Unused default export removed from testimonials-section.tsx (all consumers use named import)"

patterns-established:
  - "Cleanup-first for borderline files: remove JSDoc blocks, section dividers, JSX comments, tighten single-line returns"
  - "Data-driven JSX: replace N repetitive blocks with config array + .map() (bulk-import-stepper pattern)"
  - "Lookup objects: replace switch/case with Record<string, T> for type/brand mapping (payment-methods-list pattern)"

requirements-completed: [CLEAN-02]

# Metrics
duration: 45min
completed: 2026-03-08
---

# Phase 18 Plan 03: Medium Component Splits & Borderline Cleanup Summary

**Split 8 medium feature components via sub-component extraction and cleaned 11 borderline components + 1 hook under 300 lines using comment removal, JSX tightening, and data-driven rendering patterns**

## Performance

- **Duration:** 45 min
- **Tasks:** 2
- **Files modified:** 27 (8 split into 16 files + 11 cleaned in-place + 1 hook cleaned)

## Accomplishments
- Split 8 medium feature components (337-368 lines) into parent + sibling sub-component files, all under 300 lines
- Cleaned 11 borderline components (301-329 lines) under 300 lines without any needing a split -- cleanup alone was sufficient for all
- Cleaned the borderline hook file (use-tenant-payments.ts, 301 lines) to 285 lines via comment removal
- Extracted FlowList helper in cash-flow.tsx, eliminating ~60 lines of duplicated inflows/outflows rendering
- Replaced repetitive StepperItem blocks in bulk-import-stepper.tsx with data-driven steps array + .map()
- Replaced getCardBrandIcon switch statement in payment-methods-list.tsx with CARD_BRANDS lookup object

## Task Commits

Each task was committed atomically:

1. **Task 1: Split 8 medium feature components (337-368 lines)** - `70ecb704` (refactor) -- bundled with 18-02 commit
2. **Task 2: Clean up 11 borderline components and 1 hook** - `70ecb704` (refactor) -- bundled with Task 1

**Note:** Both tasks were committed together in the same session that processed 18-02 splits. The commit hash `70ecb704` contains Plan 02 large component splits, Plan 03 Task 1 medium splits, and Plan 03 Task 2 borderline cleanup.

## Files Created/Modified

### Created (Task 1 - extracted sub-components)
- `src/components/properties/property-form-fields.tsx` - Form field groups (address, unit, image)
- `src/components/tenants/tenant-detail-sheet-tabs.tsx` - Tab content panels (lease, payments, activity)
- `src/components/financials/balance-sheet-sections.tsx` - Report section renderers (assets, liabilities, totals)
- `src/components/connect/connect-account-steps.tsx` - Onboarding steps and verification status
- `src/components/leases/dialogs/renew-lease-form-fields.tsx` - Renewal form field groups
- `src/components/properties/properties-filters.tsx` - Filter/search controls with bulk handlers
- `src/components/pricing/owner-subscribe-plan-selector.tsx` - Plan selector UI and feature comparison
- `src/components/leases/table/leases-table-columns.tsx` - Column definitions and cell renderers

### Modified (Task 1 - parent components reduced)
- `src/components/properties/property-form.client.tsx` - 368 -> 295 lines
- `src/components/tenants/tenant-detail-sheet.tsx` - 359 -> 123 lines
- `src/components/financials/balance-sheet.tsx` - 350 -> 204 lines
- `src/components/connect/connect-account-status.tsx` - 346 -> 166 lines
- `src/components/leases/dialogs/renew-lease-dialog.tsx` - 342 -> 143 lines
- `src/components/properties/properties.tsx` - 341 -> 197 lines
- `src/components/pricing/owner-subscribe-dialog.tsx` - 341 -> 138 lines
- `src/components/leases/table/leases-table.tsx` - 337 -> 180 lines

### Modified (Task 2 - cleanup in-place)
- `src/components/financials/cash-flow.tsx` - 329 -> 277 lines (extracted FlowList helper, removed comments)
- `src/components/sections/testimonials-section.tsx` - 325 -> 268 lines (tightened testimonials array, removed default export)
- `src/components/sections/hero-dashboard-mockup.tsx` - 325 -> 281 lines (removed JSDoc, tightened type annotations)
- `src/components/properties/bulk-import-stepper.tsx` - 319 -> 257 lines (data-driven steps array replacing 3 repetitive blocks)
- `src/components/pricing/kibo-style-pricing.tsx` - 319 -> 289 lines (tightened functions, removed comments)
- `src/components/properties/edit-unit-panel.tsx` - 316 -> 278 lines (removed JSDoc, single-line validation)
- `src/components/leases/wizard/details-step.tsx` - 314 -> 299 lines (removed JSDoc, tightened expressions)
- `src/components/billing/payment-methods-list.tsx` - 314 -> 287 lines (CARD_BRANDS lookup, simplified getMethodDisplay)
- `src/components/financials/tax-documents.tsx` - 305 -> 296 lines (removed 9 comment lines)
- `src/components/dashboard/chart-area-interactive.tsx` - 301 -> 298 lines (removed 3 comment lines)
- `src/hooks/api/use-tenant-payments.ts` - 301 -> 285 lines (removed JSDoc, section dividers)

## Decisions Made
- All 11 borderline files resolved via cleanup alone; no splits needed for any file under 329 lines
- FlowList helper extracted in cash-flow.tsx because inflows/outflows sections were structurally identical (same JSX, different data/colors)
- Used `{ Field: React.ComponentType<any> }` pattern for TanStack Form type in extracted components (12-param generic is impractical)
- Removed unused `export default TestimonialsSection` since all 2 consumers use the named import
- Used PropertyStatus from `#types/core` and PropertyType from `./types` in properties-filters.tsx to match store typing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useBulkHandlers type signature in properties-filters.tsx**
- **Found during:** Task 1 (properties.tsx split)
- **Issue:** Extracted `useBulkHandlers` used generic `string` types for status/type parameters, but the Zustand store's `openBulkEdit` expects `PropertyStatus` and `PropertyType` union types
- **Fix:** Imported `PropertyStatus` from `#types/core` and `PropertyType` from `./types`, used proper types in function signature
- **Files modified:** `src/components/properties/properties-filters.tsx`
- **Verification:** `pnpm typecheck` passes clean

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for type correctness. No scope creep.

## Issues Encountered
- TanStack Form `useForm` has 12 generic parameters, making `ReturnType<typeof useForm<T>>` impossible with a single type argument -- resolved with pragmatic `{ Field: React.ComponentType<any> }` typing
- Linter auto-formatting reverted some manual edits; required re-verification of line counts after each batch
- `exactOptionalPropertyTypes` in tsconfig requires `?: T | undefined` pattern (not just `?: T`) for optional props

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All medium and borderline component/hook files are under 300 lines
- Ready for Plan 04 (18 oversized page file splits)
- Cleanup-first pattern documented for borderline files in future plans

---
*Phase: 18-components-consolidation*
*Plan: 03*
*Completed: 2026-03-08*
