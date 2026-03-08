---
phase: 12-blog-components-css
plan: 01
subsystem: ui
tags: [tailwind, typography, css, react, next-image, nuqs, pagination, blog]

# Dependency graph
requires:
  - phase: 11-blog-data-layer
    provides: BlogListItem type and blogQueries factory from blog-keys.ts
provides:
  - "@tailwindcss/typography plugin activated for prose rendering"
  - "scrollbar-hide utility for hidden-scrollbar horizontal scroll"
  - "BlogCard component for blog list/grid rendering"
  - "BlogPagination component for URL-driven page navigation"
affects: [14-blog-pages, blog-hub, blog-category, blog-detail]

# Tech tracking
tech-stack:
  added: ["@tailwindcss/typography (activated, already in devDeps)"]
  patterns: ["@utility directive for custom TailwindCSS v4 utilities", "nuqs useQueryState for URL-driven pagination"]

key-files:
  created:
    - src/components/blog/blog-card.tsx
    - src/components/blog/blog-card.test.tsx
    - src/components/blog/blog-pagination.tsx
    - src/components/blog/blog-pagination.test.tsx
  modified:
    - src/app/globals.css

key-decisions:
  - "BlogCard uses single Link wrapper with no nested interactive elements (per locked decision)"
  - "Category and reading time rendered as plain inline text, not pills/badges (per locked decision)"
  - "BlogPagination clears URL param when navigating to page 1 for clean URLs"
  - "scrollbar-hide uses @utility directive (TailwindCSS v4 pattern) not @layer utilities"

patterns-established:
  - "Blog component pattern: import BlogListItem from blog-keys.ts, use cn() for className composition"
  - "URL state pagination: useQueryState with parseAsInteger.withDefault(1), null to clear param"

requirements-completed: [INFRA-01, INFRA-02, COMP-01, COMP-02]

# Metrics
duration: 7min
completed: 2026-03-07
---

# Phase 12 Plan 01: Blog Components & CSS Summary

**Typography plugin + scrollbar-hide utility activated in globals.css, BlogCard and BlogPagination components with 19 unit tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-07T19:43:18Z
- **Completed:** 2026-03-07T19:51:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Activated @tailwindcss/typography plugin for prose class rendering on blog content
- Added scrollbar-hide utility using TailwindCSS v4 @utility directive
- Created BlogCard component rendering post with featured image (or muted placeholder), category, reading time, title, and excerpt
- Created BlogPagination component with URL-driven page control via nuqs, boundary button disabling, and null return for single-page results

## Task Commits

Each task was committed atomically:

1. **Task 1: Activate typography plugin and scrollbar-hide utility** - `240f107` (chore)
2. **Task 2: Create BlogCard component with unit tests** - `dffe43c` (test/RED), `dec5ca8` (feat/GREEN)
3. **Task 3: Create BlogPagination component with unit tests** - `7e7de22` (test/RED), `13c3d02` (feat/GREEN)

_Note: TDD tasks have RED (failing test) and GREEN (implementation) commits_

## Files Created/Modified
- `src/app/globals.css` - Added @plugin "@tailwindcss/typography" and @utility scrollbar-hide
- `src/components/blog/blog-card.tsx` - Reusable blog card with image/placeholder, category, reading time, title, excerpt
- `src/components/blog/blog-card.test.tsx` - 9 unit tests covering all rendering paths
- `src/components/blog/blog-pagination.tsx` - URL-driven pagination with nuqs useQueryState
- `src/components/blog/blog-pagination.test.tsx` - 10 unit tests covering states, clicks, edge cases

## Decisions Made
- BlogCard uses single Link wrapper with no nested interactive elements (per locked decision from CONTEXT.md)
- Category and reading time rendered as plain inline text spans, not pills/badges (per locked decision)
- BlogPagination uses setPage(null) when navigating back to page 1 to keep URLs clean
- scrollbar-hide uses TailwindCSS v4 @utility directive pattern (not @layer utilities)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing TS2532 in blog-empty-state.test.tsx**
- **Found during:** Task 2 (BlogCard implementation)
- **Issue:** Pre-existing test file from planning phase had `srElements[0].textContent` without null check, blocking typecheck in pre-commit hook
- **Fix:** Added `?.` optional chaining and explicit `expect(firstElement).toBeDefined()` assertion
- **Files modified:** src/components/shared/blog-empty-state.test.tsx
- **Verification:** pnpm typecheck passes clean
- **Committed in:** dec5ca860 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix necessary to unblock pre-commit hook. No scope creep.

## Issues Encountered
- Lefthook auto-backup stash/unstash from prior session restored staged files into working tree, causing planning-phase commits to pick up execution-phase changes. All files are correctly committed despite non-standard commit message prefixes on some commits.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BlogCard and BlogPagination are ready for composition in Phase 14 blog pages
- CSS infrastructure (prose, scrollbar-hide) active for all blog content rendering
- Phase 12 Plan 02 (BlogEmptyState, BlogLoadingSkeleton) already completed via planning-phase commits

## Self-Check: PASSED

- All 5 files exist on filesystem
- All 5 commit hashes found in git log
- @plugin "@tailwindcss/typography" present in globals.css
- @utility scrollbar-hide present in globals.css
- BlogCard export present in blog-card.tsx
- BlogPagination export present in blog-pagination.tsx
- 100 test files pass (1383 tests)
- pnpm typecheck clean
- pnpm lint clean

---
*Phase: 12-blog-components-css*
*Completed: 2026-03-07*
