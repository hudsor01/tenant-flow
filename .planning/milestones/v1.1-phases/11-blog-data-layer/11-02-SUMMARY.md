---
phase: 11-blog-data-layer
plan: 02
subsystem: api
tags: [tanstack-query, queryOptions, supabase, pagination, blog]

# Dependency graph
requires:
  - phase: 11-01
    provides: get_blog_categories RPC, BLOG cache tier in QUERY_CACHE_TIMES, regenerated supabase.ts
provides:
  - blogQueries queryOptions() factory with list, detail, categories, related, comparisons
  - Thin hook wrappers (useBlogs, useBlogBySlug, useBlogsByCategory, useBlogCategories, useRelatedPosts, useComparisonPosts)
  - BlogListItem, BlogDetail, BlogFilters, BlogCategory exported types
  - Paginated blog list with PaginatedResponse and keepPreviousData
  - Tag-based comparison filtering via .contains()
  - 32 unit tests for query factory
affects: [12-blog-components, 14-blog-pages, blog-keys.ts consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Blog queries use anon RLS (no getCachedUser) -- public content pattern"
    - "PGRST116 returns null (not error) for detail queries -- expected state handling"
    - "keepPreviousData in hook layer, not in factory -- separation of concerns"

key-files:
  created:
    - src/hooks/api/query-keys/blog-keys.ts
    - src/hooks/api/query-keys/blog-keys.test.ts
  modified:
    - src/hooks/api/use-blogs.ts
    - src/app/blog/page.tsx
    - src/app/blog/category/[category]/page.tsx

key-decisions:
  - "Blog consumers updated to destructure PaginatedResponse.data (Rule 3 auto-fix for type compatibility)"
  - "Default page size 9 (3x3 grid) following research recommendation"
  - "Tag 'comparison' as default for comparisons query following research recommendation"
  - "useFeaturedBlogs removed (no consumers), replaced by useComparisonPosts"

patterns-established:
  - "Public content queries: no getCachedUser, use anon RLS policies"
  - "PaginatedResponse consumer pattern: const { data: response } = useHook(); const items = response?.data ?? []"

requirements-completed: [BLOG-01, BLOG-03, BLOG-04, BLOG-05]

# Metrics
duration: 9min
completed: 2026-03-07
---

# Phase 11 Plan 02: Blog Query Factory & Hooks Summary

**blogQueries queryOptions() factory with paginated list, tag-based comparisons, related posts, and PGRST116-safe detail query consuming BLOG cache tier**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-07T07:03:34Z
- **Completed:** 2026-03-07T07:12:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created blogQueries factory with 8 entries (all, lists, list, details, detail, categories, related, comparisons) using queryOptions() pattern
- Rewrote use-blogs.ts as thin hook wrappers consuming the factory with keepPreviousData on paginated hooks
- Added 32 unit tests covering query key structure, pagination math, filter application, PGRST116 handling, related posts, and comparisons
- Eliminated all ad-hoc query keys (old blogKeys object) and inline queryFn from blog hooks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create blog-keys.ts query factory with unit tests** - (test/feat TDD)
2. **Task 2: Rewrite use-blogs.ts to consume factory** - (feat)

## Files Created/Modified
- `src/hooks/api/query-keys/blog-keys.ts` - queryOptions() factory with blogQueries (list, detail, categories, related, comparisons)
- `src/hooks/api/query-keys/blog-keys.test.ts` - 32 unit tests for blog query factory
- `src/hooks/api/use-blogs.ts` - Thin hook wrappers consuming blogQueries factory
- `src/app/blog/page.tsx` - Updated to destructure PaginatedResponse from useBlogs()
- `src/app/blog/category/[category]/page.tsx` - Updated to destructure PaginatedResponse from useBlogsByCategory()

## Decisions Made
- Default page size of 9 (3x3 grid) per research recommendation
- Default comparison tag "comparison" per research recommendation
- Removed useFeaturedBlogs (confirmed zero external consumers via grep) -- replaced by useComparisonPosts
- Blog consumers updated to handle PaginatedResponse shape (auto-fix, see deviations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated blog page consumers for PaginatedResponse type**
- **Found during:** Task 2 (Rewrite use-blogs.ts)
- **Issue:** Plan stated "All 3 existing blog page consumers compile without changes" but useBlogs() and useBlogsByCategory() now return PaginatedResponse instead of array. Consumers using `const { data: blogPosts = [] }` with `.map()` broke TypeScript compilation.
- **Fix:** Updated `src/app/blog/page.tsx` and `src/app/blog/category/[category]/page.tsx` to destructure `data?.data ?? []` from the paginated response. Minimal change (1 line each).
- **Files modified:** src/app/blog/page.tsx, src/app/blog/category/[category]/page.tsx
- **Verification:** `pnpm typecheck` passes clean, `pnpm lint` passes clean
- **Committed in:** Task 2 commit

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for type compatibility. Two consumers needed 1-line updates to handle PaginatedResponse shape. No scope creep.

## Issues Encountered
- Test file queryFn invocation required MockQueryContext interface to satisfy TanStack Query's typed QueryFunctionContext without using `any` (project zero-tolerance rule). Resolved by creating a typed context interface matching the required shape.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- blogQueries factory is ready for Phase 12 blog components and Phase 14 blog pages
- All exported types (BlogListItem, BlogDetail, BlogFilters, BlogCategory) available for component typing
- useBlogCategories() hook ready for category navigation components
- useRelatedPosts() and useComparisonPosts() hooks ready for blog detail page sidebar/footer
- Pagination params (page, limit) ready for blog list page pagination controls

## Self-Check: PASSED

All files verified:
- src/hooks/api/query-keys/blog-keys.ts: FOUND
- src/hooks/api/query-keys/blog-keys.test.ts: FOUND
- src/hooks/api/use-blogs.ts: FOUND (modified)
- src/app/blog/page.tsx: FOUND (modified)
- src/app/blog/category/[category]/page.tsx: FOUND (modified)
- .planning/phases/11-blog-data-layer/11-02-SUMMARY.md: FOUND
- Typecheck: PASSED
- Lint: PASSED
- Unit tests: 1351 passed (96 files)
- Commits: PENDING (git commands blocked in this session)

---
*Phase: 11-blog-data-layer*
*Completed: 2026-03-07*
