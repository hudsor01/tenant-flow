---
phase: 18-components-consolidation
plan: 06
subsystem: ui
tags: [react-compiler, memoization, useMemo, useCallback, React.memo, performance]

# Dependency graph
requires:
  - phase: 18-components-consolidation/05
    provides: React Compiler enabled globally via reactCompiler: true in next.config.ts
provides:
  - Zero manual memoization in project-owned source code
  - React Compiler as sole memoization strategy
  - 399 fewer lines of boilerplate (dependency arrays, wrapper functions)
affects: [all-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useLazyRef for stable single-initialization values (replacing useMemo for stores)"
    - "IIFE pattern for multi-statement computed values (replacing useMemo with block bodies)"
    - "Inline handler definitions inside useEffect for dependency correctness"

key-files:
  created: []
  modified:
    - src/components/ui/stepper.tsx
    - src/components/ui/file-upload/file-upload.tsx
    - src/components/shell/app-shell.tsx
    - src/components/shell/tenant-shell.tsx
    - src/components/ui/sidebar/context.tsx
    - src/components/ui/mobile-nav.tsx
    - src/hooks/use-data-table.ts

key-decisions:
  - "useLazyRef replaces useMemo for store initialization in stepper.tsx and file-upload.tsx (single-init semantics preserved)"
  - "IIFE pattern replaces multi-statement useMemo bodies (e.g., computed values with conditionals)"
  - "Handler functions moved inside useEffect where they are sole consumers (eliminates lint warnings)"
  - "Removed debounceMs from nuqs queryStateOptions (not a valid nuqs option, pre-existing type error exposed by memo removal)"
  - "Explicit type annotations added where useMemo generics provided type narrowing (DynamicField[], CustomClause[], SidebarContextProps)"

patterns-established:
  - "No manual useMemo/useCallback/React.memo in project-owned code -- React Compiler handles all memoization"
  - "useLazyRef for stable one-time initialization (not useMemo with empty deps)"
  - "Type annotations required when removing useMemo generics that provided narrowing"

requirements-completed: [MOD-01]

# Metrics
duration: 45min
completed: 2026-03-09
---

# Phase 18 Plan 06: Remove Manual Memoization Summary

**Removed 339 manual memoization calls (166 useMemo + 168 useCallback + 5 React.memo) from 93 source files, delegating all memoization to React Compiler**

## Performance

- **Duration:** 45 min
- **Started:** 2026-03-09T00:45:00Z
- **Completed:** 2026-03-09T01:20:00Z
- **Tasks:** 2
- **Files modified:** 96

## Accomplishments
- Removed all 166 useMemo calls from project-owned source code
- Removed all 168 useCallback calls from project-owned source code
- Removed all 5 React.memo wrappers (mobile-nav 2x, tenant-table-row, property-table-row, property-units-table-row)
- Cleaned unused imports from all 93 modified files
- All 1,412 unit tests pass with zero regressions
- Vendored tour.tsx preserved intact (opted out via 'use no memo')

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove all useMemo, useCallback, and React.memo from 93 source files** - `bcc15371c` (refactor)
2. **Task 2: Verify zero manual memos remain and full test suite passes** - verification only, no code changes

**Plan metadata:** (pending)

## Files Created/Modified

93 source files modified across the entire codebase. Key categories:

**UI primitives (18 files):**
- `src/components/ui/stepper*.tsx` (6 files) - useMemo/useCallback removed, store init via useLazyRef
- `src/components/ui/file-upload/*.tsx` (6 files) - useCallback removed, store init via useLazyRef
- `src/components/ui/mobile-nav.tsx` - 2 React.memo wrappers removed
- `src/components/ui/sidebar/context.tsx` - useMemo removed, type annotations added
- `src/components/ui/chart-tooltip.tsx`, `field.tsx`, `slider.tsx`, `grid-pattern.tsx`, `dropzone.tsx`, `global-loading-indicator.tsx`

**Shell components (2 files):**
- `src/components/shell/app-shell.tsx` - useMemo/useCallback removed, handler inlined in useEffect
- `src/components/shell/tenant-shell.tsx` - useCallback removed, handler inlined in useEffect

**Feature components (15 files):**
- Table row components (3 files) - React.memo removed
- Data table filters (5 files) - useMemo/useCallback removed
- Lease/maintenance/property components (7 files) - useMemo/useCallback removed

**Page components (32 files):**
- Dashboard, financials, analytics, document template pages

**Hooks and providers (12 files):**
- `src/hooks/use-data-table.ts` - useMemo/useCallback removed, fixed debounceMs in queryStateOptions
- `src/hooks/use-supabase-upload.ts` - useCallback removed, fixed stale dep array
- Various other hooks and providers

## Decisions Made

1. **useLazyRef for store initialization**: stepper.tsx and file-upload.tsx used `useMemo(() => createStore(), [])` for one-time store creation. Replaced with `useLazyRef` to preserve single-initialization semantics without memoization.

2. **IIFE pattern for computed blocks**: Multi-statement `useMemo(() => { ...; return value }, [deps])` converted to `(() => { ...; return value })()` (immediately-invoked function expression).

3. **Handler inlining in useEffect**: Where useCallback-wrapped handlers were sole consumers of useEffect deps, moved handler logic inside the effect to eliminate lint warnings without re-adding memoization.

4. **Type annotations for narrowing**: When `useMemo<SpecificType>(...)` generics provided type narrowing (e.g., `DynamicField[]`, `CustomClause[]`, `SidebarContextProps`), added explicit type annotations to variable declarations.

5. **Removed debounceMs from nuqs options**: `debounceMs` is not a valid nuqs `Options` property. This was a pre-existing type error masked by the `useMemo` generic that is now exposed. Removed it since debouncing is handled separately via `useDebouncedCallback`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale dependency array in use-supabase-upload.ts**
- **Found during:** Task 1
- **Issue:** Batch script left a stale `[files, path, bucketName, ...]` dependency array at the end of the `onUpload` arrow function AND stripped the dep array from the subsequent `useEffect`
- **Fix:** Removed stale dep array from function body, added correct `[files, maxFiles]` dep array to useEffect
- **Files modified:** src/hooks/use-supabase-upload.ts
- **Committed in:** bcc15371c

**2. [Rule 1 - Bug] Fixed type widening in 4 template files**
- **Found during:** Task 1
- **Issue:** Removing `useMemo<DynamicField[]>(...)` lost the generic type annotation, causing TypeScript to infer `string` instead of the DynamicField union type
- **Fix:** Added explicit `DynamicField[]` type annotation to `baseFields` declarations
- **Files modified:** maintenance-request-template.client.tsx, property-inspection-template.client.tsx, rental-application-template.client.tsx, tenant-notice-template.client.tsx
- **Committed in:** bcc15371c

**3. [Rule 1 - Bug] Fixed range converted to function in data-table-slider-filter.tsx**
- **Found during:** Task 1
- **Issue:** Batch script converted `useMemo((): RangeValue => {...}, [deps])` to a function declaration instead of evaluating the expression
- **Fix:** Converted to direct assignment `const range: RangeValue = columnFilterValue ?? [min, max]`
- **Files modified:** src/components/data-table/data-table-slider-filter.tsx
- **Committed in:** bcc15371c

**4. [Rule 1 - Bug] Fixed type widening in sidebar/context.tsx**
- **Found during:** Task 1
- **Issue:** `state` variable lost its `'expanded' | 'collapsed'` literal type when useMemo generic was removed
- **Fix:** Added explicit type annotation `const state: 'expanded' | 'collapsed'`
- **Files modified:** src/components/ui/sidebar/context.tsx
- **Committed in:** bcc15371c

**5. [Rule 1 - Bug] Fixed type widening in lease-template-builder.client.tsx**
- **Found during:** Task 1
- **Issue:** `customClauses = []` had implicit `any[]` type after useMemo removal
- **Fix:** Added `CustomClause[]` type annotation
- **Files modified:** src/components/leases/template/lease-template-builder.client.tsx
- **Committed in:** bcc15371c

**6. [Rule 1 - Bug] Fixed 6 react-hooks/exhaustive-deps lint warnings**
- **Found during:** Task 1
- **Issue:** Removing useCallback from handler functions used as useEffect dependencies caused lint warnings about recreated functions
- **Fix:** Moved handler logic inline into useEffect bodies (image-lightbox, app-shell, tenant-shell, tenant-detail-sheet, sidebar/context) or inlined the setInterval callback (testimonials-section)
- **Files modified:** 6 files
- **Committed in:** bcc15371c

**7. [Rule 3 - Blocking] Discovered and fixed testimonials-section.tsx (not in plan)**
- **Found during:** Task 1
- **Issue:** File contained 3 useCallback calls but was not in the plan's 88-file list
- **Fix:** Removed all 3 useCallback calls, cleaned import
- **Files modified:** src/components/sections/testimonials-section.tsx
- **Committed in:** bcc15371c

---

**Total deviations:** 7 auto-fixed (6 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness after mechanical memo removal. Type annotations restored narrowing lost from useMemo generics. No scope creep.

## Issues Encountered

- **Batch script edge cases**: A Node.js batch script processed 69 simpler files, but had 3 edge cases requiring manual correction (stale dep arrays, function-instead-of-value conversions, type widening). These were caught by typecheck and fixed.
- **5 additional files discovered**: grep revealed 5 files with useMemo/useCallback that were not in the plan's 88-file list (stepper-trigger.tsx, stepper-list.tsx, chart-tooltip.tsx, properties-filters.tsx, revenue-expense-chart.tsx, testimonials-section.tsx). All were processed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 18 (Components Consolidation) is now fully complete (6/6 plans)
- React Compiler is enabled and all manual memoization removed
- Ready for Phase 19 (UI Polish)
- No blockers or concerns

## Self-Check: PASSED

- All key files exist (stepper.tsx, file-upload.tsx, mobile-nav.tsx, app-shell.tsx, use-data-table.ts)
- Task 1 commit bcc15371c found in git log
- Zero useMemo/useCallback in source (5 grep matches are `useCallbackRef` -- a different function)
- Zero React.memo in source
- SUMMARY file exists

---
*Phase: 18-components-consolidation*
*Completed: 2026-03-09*
