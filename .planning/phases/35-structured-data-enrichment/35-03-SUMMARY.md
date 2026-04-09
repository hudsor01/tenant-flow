---
phase: 35-structured-data-enrichment
plan: 03
subsystem: testing
tags: [testing, blog, imports, gap-closure]
dependency_graph:
  requires: [src/app/blog/[slug]/blog-post-page.tsx, src/app/blog/category/[category]/blog-category-client.tsx]
  provides: [Fixed blog test imports targeting client components instead of async server wrappers]
  affects: []
tech_stack:
  added: []
  patterns: [Test files import client components directly, not async server page wrappers]
key_files:
  created: []
  modified:
    - src/app/blog/[slug]/page.test.tsx
    - src/app/blog/category/[category]/page.test.tsx
decisions:
  - "Import client components (blog-post-page, blog-category-client) directly in tests — server page.tsx wrappers are async and return Promise, not renderable by jsdom"
metrics:
  duration: 2m
  completed: 2026-04-09
  tasks: 1/1
  tests_fixed: 17
  total_tests: 1581
requirements-completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08]
---

# Phase 35 Plan 03: Fix Blog Test Imports — Gap Closure Summary

**Blog post and category test files updated to import client components instead of async server wrappers, fixing 17 test failures and 4 typecheck errors.**

## What Was Fixed

### Root Cause
Phase 35 plan 01 converted `blog/[slug]/page.tsx` and `blog/category/[category]/page.tsx` from sync to async server components (for `generateMetadata` and JSON-LD rendering). The test files still imported `page.tsx` directly, which returns a Promise (not a React element) and requires server-only `params`/`searchParams` props.

### Changes
1. `src/app/blog/[slug]/page.test.tsx` line 120: `import BlogArticlePage from './page'` changed to `import BlogArticlePage from './blog-post-page'`
2. `src/app/blog/category/[category]/page.test.tsx` line 100: `import BlogCategoryPage from './page'` changed to `import BlogCategoryPage from './blog-category-client'`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c7f320595 | fix(35-03): update blog test imports to client components |

## Verification

- `pnpm typecheck` exits 0 (4 TS errors resolved)
- All 9 blog post tests pass
- All 8 blog category tests pass
- Full suite: 1,581 tests pass across 122 files

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

---
*Phase: 35-structured-data-enrichment*
*Completed: 2026-04-09*
