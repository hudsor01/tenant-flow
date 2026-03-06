---
phase: 07-ux-accessibility
plan: 02
subsystem: ui
tags: [a11y, wcag, aria, keyboard, focus-management, breadcrumbs, skip-to-content]

requires:
  - phase: 07-01
    provides: CSS class visibility and design token verification

provides:
  - Skip-to-content link in both application shells
  - ARIA labels on all icon buttons in shells
  - Breadcrumb nav with aria-label and mobile truncation
  - Keyboard-accessible mobile sidebar overlay with focus trap
  - Mobile-only bottom padding in owner shell

affects: [07-ux-accessibility]

tech-stack:
  added: []
  patterns:
    - "IIFE breadcrumb rendering for TypeScript non-null safety"
    - "Conditional role/aria-modal on sidebar (dialog when open, complementary when closed)"
    - "Focus trap via keydown Tab/Shift+Tab boundary wrapping"
    - "closeSidebar callback with triggerRef focus return"

key-files:
  created: []
  modified:
    - src/components/shell/app-shell.tsx
    - src/components/shell/tenant-shell.tsx
    - src/components/shell/__tests__/app-shell.test.tsx
    - src/components/shell/__tests__/tenant-shell.test.tsx

key-decisions:
  - "Non-null assertions (!) used for breadcrumbs[0] and breadcrumbs[length-1] inside length guard"
  - "Breadcrumbs wrapped in IIFE for TypeScript narrowing of first/last elements"
  - "Sidebar role conditionally set: dialog when open, undefined (native aside/complementary) when closed"
  - "Focus trap queries a, button, input, and tabindex elements within sidebar"

patterns-established:
  - "Skip-to-content: sr-only with focus:not-sr-only fixed positioning at z-[100]"
  - "Mobile breadcrumb truncation: first crumb + ... + last crumb below sm breakpoint"
  - "closeSidebar pattern: setSidebarOpen(false) + triggerRef.current?.focus()"

requirements-completed: [UX-05, UX-06, UX-07, UX-11, UX-19, UX-20, UX-23]

duration: 14min
completed: 2026-03-06
---

# Phase 7 Plan 2: Shell Accessibility and Mobile Responsiveness Summary

**Skip-to-content links, ARIA labels on icon buttons, mobile-visible breadcrumbs with truncation, and keyboard-accessible sidebar overlay with focus trap in both app-shell and tenant-shell**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-06T16:15:42Z
- **Completed:** 2026-03-06T16:29:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Both shells now have skip-to-content links that appear on Tab focus (WCAG 2.4.1)
- All icon buttons (hamburger, close, bell) have descriptive aria-labels (WCAG 4.1.2)
- Breadcrumbs visible on mobile with first/last truncation pattern (middle crumbs collapsed with "...")
- Mobile sidebar overlay closes with Escape key and returns focus to trigger button
- Focus trap prevents keyboard focus from escaping the sidebar dialog
- Owner shell pb-24 now mobile-only (sm:pb-6 on desktop)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add skip-to-content, aria-labels, and breadcrumb a11y to both shells** - `31672ab9c` (feat)
2. **Task 2: Add mobile sidebar keyboard accessibility with focus management** - `a1baf39cf` (feat)

## Files Created/Modified
- `src/components/shell/app-shell.tsx` - Skip-to-content, aria-labels, breadcrumb a11y, mobile padding, Escape key, focus trap, dialog role
- `src/components/shell/tenant-shell.tsx` - Same a11y improvements as app-shell
- `src/components/shell/__tests__/app-shell.test.tsx` - Updated tests for new aria-labels and dialog role
- `src/components/shell/__tests__/tenant-shell.test.tsx` - Updated tests for new aria-labels and dialog role

## Decisions Made
- Used non-null assertions (!) for breadcrumbs[0] and breadcrumbs[length-1] inside length > 0 guard -- safe because array bounds are checked
- Wrapped breadcrumb rendering in IIFE to extract first/last crumbs as local variables for TypeScript safety
- Sidebar role is conditionally set to "dialog" only when open (preserves native aside/complementary semantics when closed)
- Focus trap queries standard focusable selectors (a[href], button, input, [tabindex]) within the sidebar ref
- closeSidebar as useCallback for stable reference in useEffect dependency array

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict index access errors on breadcrumbs**
- **Found during:** Task 1
- **Issue:** `breadcrumbs[0]` and `breadcrumbs[breadcrumbs.length - 1]` flagged as possibly undefined by TypeScript noUncheckedIndexedAccess
- **Fix:** Used non-null assertion (!) and IIFE pattern to extract first/last crumbs as local variables
- **Files modified:** app-shell.tsx, tenant-shell.tsx
- **Verification:** pnpm typecheck passes clean
- **Committed in:** 31672ab9c (Task 1 commit)

**2. [Rule 1 - Bug] Tests using wrong aria-label and CSS class selectors after changes**
- **Found during:** Task 1 and Task 2
- **Issue:** Tests searched for "Close sidebar" (changed to "Close navigation menu"), CSS class selector `nav.hidden.sm\\:flex` (nav no longer hidden), empty name for notifications link (now has aria-label), and `role='complementary'` (now `role='dialog'` when open)
- **Fix:** Updated test selectors to match new aria-labels, use `getByRole('navigation', { name: 'Breadcrumb' })`, and `getByRole('dialog')` when sidebar is open
- **Files modified:** app-shell.test.tsx, tenant-shell.test.tsx
- **Verification:** All 84 test files pass (975 tests)
- **Committed in:** 31672ab9c, a1baf39cf

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for TypeScript compilation and test correctness. No scope creep.

## Issues Encountered
- Pre-commit hook linter auto-formatted some unrelated files alongside Task 2 changes, causing them to be committed together. The Task 2 work is correctly in commit a1baf39cf.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shell a11y complete, ready for remaining UX/accessibility plans (07-03 through 07-06)
- Both shells now provide proper WCAG landmarks and keyboard navigation

## Self-Check: PASSED

All files found, all commits verified.

---
*Phase: 07-ux-accessibility*
*Completed: 2026-03-06*
