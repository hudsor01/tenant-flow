---
phase: 07-ux-accessibility
plan: 04
subsystem: ui
tags: [error-boundary, not-found, next.js, react, sentry]

# Dependency graph
requires:
  - phase: 07-01
    provides: CSS class and design token fixes (text-muted-foreground, bg-background)
provides:
  - Shared NotFoundPage component for all dynamic [id] routes
  - Shared ErrorPage component with retry + dashboard link
  - Error boundaries for all missing route groups
affects: [07-06, future route additions]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-error-components, two-escape-action-error-boundary]

key-files:
  created:
    - src/components/shared/not-found-page.tsx
    - src/components/shared/error-page.tsx
    - src/app/(auth)/error.tsx
    - src/app/auth/error.tsx
    - src/app/blog/error.tsx
    - src/app/pricing/error.tsx
    - src/app/(owner)/leases/[id]/not-found.tsx
    - src/app/(owner)/tenants/[id]/not-found.tsx
    - src/app/(owner)/maintenance/[id]/not-found.tsx
    - src/app/(owner)/inspections/[id]/not-found.tsx
    - src/app/(owner)/units/[id]/not-found.tsx
    - src/app/(tenant)/tenant/inspections/[id]/not-found.tsx
    - src/app/(tenant)/tenant/maintenance/request/[id]/not-found.tsx
  modified:
    - src/app/(owner)/properties/[id]/not-found.tsx
    - src/app/(tenant)/tenant/not-found.tsx
    - src/app/not-found.tsx
    - src/app/(owner)/error.tsx
    - src/app/(tenant)/tenant/error.tsx
    - src/app/error.tsx
    - src/components/error-boundary/error-fallback.tsx

key-decisions:
  - "Generic 'Page not found' message for all not-found pages (no entity-specific messages)"
  - "ErrorPage uses Sentry.captureException, does not expose error.message to users"
  - "Two escape actions on all error boundaries: Try Again (retry) + Go to Dashboard (link)"
  - "NotFoundPage accepts dashboardHref prop: /dashboard for owner, /tenant for tenant, / for public"

patterns-established:
  - "Shared NotFoundPage: all dynamic route not-found.tsx files import from #components/shared/not-found-page"
  - "Shared ErrorPage: all error.tsx files import from #components/shared/error-page with dashboardHref prop"

requirements-completed: [UX-14, UX-15]

# Metrics
duration: 16min
completed: 2026-03-06
---

# Phase 7 Plan 4: 404 Pages and Error Boundaries Summary

**Shared NotFoundPage and ErrorPage components with 10 not-found.tsx and 7 error.tsx files covering all routes**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-06T16:15:47Z
- **Completed:** 2026-03-06T16:31:47Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments
- Created shared NotFoundPage component with generic "Page not found" message and configurable dashboard link
- Created shared ErrorPage component with Sentry capture, retry button, and dashboard link (two escape actions)
- Added not-found.tsx to 7 dynamic [id] routes (leases, tenants, maintenance, inspections, units, tenant inspections, tenant maintenance)
- Updated 3 existing not-found.tsx files (properties, tenant portal, root) to use shared component
- Added error.tsx for 4 missing route groups: (auth), auth/, blog/, pricing/
- Updated 3 existing error.tsx files + error-fallback.tsx to use shared ErrorPage with dashboard link

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared NotFoundPage and add not-found.tsx to all dynamic routes** - `b7b61d3` + `a1baf39` (feat)
2. **Task 2: Create shared ErrorPage and add/update error.tsx for all route groups** - `755d9b4` (feat)

## Files Created/Modified
- `src/components/shared/not-found-page.tsx` - Shared 404 component with Alert, dashboardHref prop
- `src/components/shared/error-page.tsx` - Shared error boundary component with Sentry, retry + dashboard link
- `src/app/(owner)/leases/[id]/not-found.tsx` - Lease 404 page (NEW)
- `src/app/(owner)/tenants/[id]/not-found.tsx` - Tenant 404 page (NEW)
- `src/app/(owner)/maintenance/[id]/not-found.tsx` - Maintenance 404 page (NEW)
- `src/app/(owner)/inspections/[id]/not-found.tsx` - Inspection 404 page (NEW)
- `src/app/(owner)/units/[id]/not-found.tsx` - Unit 404 page (NEW)
- `src/app/(tenant)/tenant/inspections/[id]/not-found.tsx` - Tenant inspection 404 (NEW)
- `src/app/(tenant)/tenant/maintenance/request/[id]/not-found.tsx` - Tenant maintenance 404 (NEW)
- `src/app/(owner)/properties/[id]/not-found.tsx` - Updated to use shared component
- `src/app/(tenant)/tenant/not-found.tsx` - Updated to use shared component
- `src/app/not-found.tsx` - Updated to use shared component
- `src/app/(auth)/error.tsx` - Auth error boundary (NEW)
- `src/app/auth/error.tsx` - Auth route error boundary (NEW)
- `src/app/blog/error.tsx` - Blog error boundary (NEW)
- `src/app/pricing/error.tsx` - Pricing error boundary (NEW)
- `src/app/(owner)/error.tsx` - Updated to use shared ErrorPage
- `src/app/(tenant)/tenant/error.tsx` - Updated to use shared ErrorPage
- `src/app/error.tsx` - Updated to use shared ErrorPage
- `src/components/error-boundary/error-fallback.tsx` - Updated with shadcn Button and dashboard link

## Decisions Made
- Generic "Page not found" message for all not-found pages (no entity-specific messages like "Property not found")
- ErrorPage uses Sentry.captureException and does NOT expose error.message to users (security practice from CLAUDE.md)
- Two escape actions on all error boundaries: "Try Again" (retry) + "Go to Dashboard" (link)
- NotFoundPage accepts dashboardHref prop: /dashboard for owner, /tenant for tenant, / for public/root
- Error boundaries for public routes ((auth), auth/, blog/, pricing/) link to "/" not "/dashboard"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing type errors in breadcrumb components**
- **Found during:** Task 1 (commit hook validation)
- **Issue:** app-shell.tsx and tenant-shell.tsx had `breadcrumbs[0]` access without TypeScript narrowing, causing TS2532 errors
- **Fix:** Extracted local constants with non-null assertions after length guard
- **Files modified:** src/components/shell/app-shell.tsx, src/components/shell/tenant-shell.tsx
- **Verification:** pnpm typecheck passes
- **Committed in:** Included in 07-02/07-03 commits by pre-commit hook

**2. [Rule 3 - Blocking] Fixed shell test assertions for dialog role change**
- **Found during:** Task 1 (commit hook validation)
- **Issue:** Shell tests queried role="complementary" but dirty app-shell changes set role="dialog" when sidebar is open
- **Fix:** Updated test to query role="dialog" when sidebar is toggled open
- **Files modified:** src/components/shell/__tests__/app-shell.test.tsx, src/components/shell/__tests__/tenant-shell.test.tsx
- **Verification:** All 975 unit tests pass
- **Committed in:** a1baf39 (part of pre-commit auto-staging)

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking)
**Impact on plan:** Both fixes were for pre-existing issues in dirty files on the branch. No scope creep.

## Issues Encountered
- Pre-commit hook auto-stages linter-modified files, causing Task 1 not-found files to be committed in other plan commits (b7b61d3, a1baf39). All files are correctly committed to the repository.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All routes now have proper 404 and error boundary coverage
- Shared components ready for any future route additions
- Error-fallback.tsx updated with shadcn Button (consistent design system)

---
*Phase: 07-ux-accessibility*
*Completed: 2026-03-06*
