---
phase: 18-components-consolidation
plan: 01
subsystem: ui
tags: [stepper, chart, file-upload, dialog, component-splitting, recharts]

# Dependency graph
requires:
  - phase: 17-hooks-consolidation
    provides: "Clean hook layer with shared query-key/mutation-options factories"
provides:
  - "6 UI primitive files all under 300 lines"
  - "Stepper group refactored with shared types/utils in dedicated files"
  - "Chart tooltip/legend extracted to chart-tooltip.tsx"
  - "File upload validation extracted to file-upload-validation.ts"
  - "AlertDialog deduplicated -- single source in alert-dialog.tsx"
affects: [18-components-consolidation, component-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-export pattern for backward-compatible chart imports"
    - "Validation extraction pattern for compound components"

key-files:
  created:
    - src/components/ui/stepper-types.ts
    - src/components/ui/stepper-utils.ts
    - src/components/ui/stepper-header.tsx
    - src/components/ui/stepper-list.tsx
    - src/components/ui/stepper-trigger.tsx
    - src/components/ui/chart-tooltip.tsx
    - src/components/ui/file-upload/file-upload-validation.ts
  modified:
    - src/components/ui/stepper.tsx
    - src/components/ui/stepper-item.tsx
    - src/components/ui/stepper-context.tsx
    - src/components/ui/chart.tsx
    - src/components/ui/file-upload/file-upload.tsx
    - src/components/ui/dialog.tsx

key-decisions:
  - "Stepper re-exports all sub-components from stepper.tsx for consumer backward compatibility"
  - "Chart uses re-export from chart.tsx so 12 consumers need zero import changes"
  - "AlertDialog duplicate removed from dialog.tsx -- 19 consumers updated to import from alert-dialog.tsx"
  - "File-upload validation extracted as pure functions for testability"

patterns-established:
  - "Re-export pattern: keep public API in original file, extract internals to sibling files"
  - "Validation extraction: compound component validation logic in dedicated *-validation.ts file"

requirements-completed: [CLEAN-02]

# Metrics
duration: 35min
completed: 2026-03-08
---

# Phase 18 Plan 01: UI Primitives Splitting Summary

**Split 6 oversized UI primitives under 300 lines: stepper group (3 files, 1342->621 lines), chart (430->160), file-upload (363->296), dialog (308->169), with 19 consumer import updates**

## Performance

- **Duration:** 35 min
- **Tasks:** 2
- **Files modified:** 41

## Accomplishments
- Stepper group (stepper.tsx + stepper-item.tsx + stepper-context.tsx) refactored from 1,342 combined lines to 421 combined lines across 8 files, all under 300 lines
- Chart tooltip/legend components extracted to chart-tooltip.tsx, reducing chart.tsx from 430 to 160 lines
- File upload validation logic extracted to pure functions in file-upload-validation.ts, reducing file-upload.tsx from 363 to 296 lines
- Duplicate AlertDialog components removed from dialog.tsx (169 lines, down from 308), 19 consumer files updated to import from the canonical alert-dialog.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor stepper group** - `70ecb704` (refactor) -- committed as part of 18-02 in previous session
2. **Task 2: Split chart.tsx, file-upload.tsx, dialog.tsx** - `d9ecaf31` (refactor)

## Files Created/Modified

### Created
- `src/components/ui/stepper-types.ts` - Shared types, interfaces, constants for stepper group (130 lines)
- `src/components/ui/stepper-utils.ts` - Pure utility functions: getId, getFocusIntent, focusFirst, wrapArray (85 lines)
- `src/components/ui/stepper-header.tsx` - StepperIndicator, StepperSeparator, StepperTitle, StepperDescription, StepperContent (218 lines)
- `src/components/ui/stepper-list.tsx` - StepperList with focus management context (142 lines)
- `src/components/ui/stepper-trigger.tsx` - StepperTrigger with keyboard/focus/click handling (220 lines)
- `src/components/ui/chart-tooltip.tsx` - ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent (289 lines)
- `src/components/ui/file-upload/file-upload-validation.ts` - validateFiles, validateFile, applyMaxFilesLimit (134 lines)

### Modified
- `src/components/ui/stepper.tsx` - 416 -> 200 lines (orchestration only)
- `src/components/ui/stepper-item.tsx` - 607 -> 85 lines (StepperItem + re-export)
- `src/components/ui/stepper-context.tsx` - 319 -> 136 lines (context providers + hooks only)
- `src/components/ui/chart.tsx` - 430 -> 160 lines (container + style + helper)
- `src/components/ui/file-upload/file-upload.tsx` - 363 -> 296 lines (compound component)
- `src/components/ui/dialog.tsx` - 308 -> 169 lines (Dialog only, AlertDialog removed)
- 19 consumer files updated: AlertDialog imports moved from `#components/ui/dialog` to `#components/ui/alert-dialog`

## Decisions Made
- Stepper uses re-export pattern: all public exports remain in stepper.tsx so consumers need zero import changes
- Chart re-exports ChartTooltip/ChartLegend from chart.tsx for backward compatibility (12 consumers untouched)
- AlertDialog was fully duplicated in dialog.tsx vs alert-dialog.tsx -- removed the inferior copy (lacked data-slot attributes)
- File-upload validation extracted as pure functions (no React imports) for potential future unit testing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed barrel re-export in financial-charts.tsx**
- **Found during:** Task 2 (lint verification)
- **Issue:** Pre-existing `export { RevenueExpenseChart } from './revenue-expense-chart'` violated no-barrel-files lint rule (introduced by 18-02 commit)
- **Fix:** Updated `page.tsx` to import directly from `./revenue-expense-chart`, removed re-export from `financial-charts.tsx`
- **Files modified:** `src/app/(owner)/analytics/financial/page.tsx`, `src/app/(owner)/analytics/financial/financial-charts.tsx`
- **Verification:** `pnpm lint` passes clean
- **Committed in:** d9ecaf31 (Task 2 commit)

**2. [Rule 3 - Blocking] Task 1 stepper commit combined with 18-02**
- **Found during:** Session continuation
- **Issue:** Previous session committed Task 1 stepper work inside the 18-02 commit (`70ecb704`) instead of a separate 18-01 commit
- **Fix:** Accepted as-is -- work is committed and verified, re-splitting commits would be destructive
- **Impact:** Task 1 has commit hash `70ecb704` shared with 18-02 work

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing typecheck errors from other plans' uncommitted work were blocking the pre-commit hook in the previous session; resolved by the 18-02 commit
- ESLint cache was hiding the barrel file violation; only surfaced after cache invalidation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 6 UI primitive files are under 300 lines
- Pattern established for remaining component splits in plans 18-03 through 18-06
- No new dependencies introduced

## Self-Check: PASSED

All 7 created files verified on disk. Commits 70ecb704 (Task 1) and d9ecaf31 (Task 2) verified in git history.

---
*Phase: 18-components-consolidation*
*Plan: 01*
*Completed: 2026-03-08*
