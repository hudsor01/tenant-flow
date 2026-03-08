---
phase: 11-blog-data-layer
plan: 01
subsystem: database
tags: [postgres, rpc, supabase, tanstack-query, cache-config]

# Dependency graph
requires: []
provides:
  - get_blog_categories RPC function (name, slug, post_count)
  - BLOG cache tier in QUERY_CACHE_TIMES (2min stale, 10min gc)
  - Regenerated supabase.ts with get_blog_categories function signature
affects: [11-02-PLAN, blog-keys.ts, use-blogs.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY INVOKER RPCs for public read-only aggregation"
    - "SQL-side slug computation via lower(replace())"

key-files:
  created:
    - supabase/migrations/20260307120000_blog_categories_rpc.sql
  modified:
    - src/shared/types/supabase.ts
    - src/lib/constants/query-config.ts

key-decisions:
  - "Slug computed server-side in SQL (lower+replace) per locked user decision"
  - "BLOG cache tier uses 2min staleTime matching hourly n8n publish cadence"
  - "RPC granted to both anon and authenticated since blogs are public content"

patterns-established:
  - "BLOG cache tier: 2min staleTime, 10min gcTime for marketing content"

requirements-completed: [BLOG-02]

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 11 Plan 01: Blog Categories RPC & Cache Tier Summary

**get_blog_categories SQL RPC with server-side slug computation, type regeneration, and BLOG cache tier for n8n-published content**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T06:46:36Z
- **Completed:** 2026-03-07T06:48:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created get_blog_categories RPC that aggregates published blog categories with post counts and computed slugs
- Regenerated supabase.ts with typed function signature for get_blog_categories
- Added BLOG cache tier to QUERY_CACHE_TIMES with shorter staleTime reflecting hourly n8n publish cadence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create get_blog_categories RPC and regenerate types** - `c0b2b701e` (feat)
2. **Task 2: Add BLOG cache tier to QUERY_CACHE_TIMES** - `590c60ec0` (feat)

## Files Created/Modified
- `supabase/migrations/20260307120000_blog_categories_rpc.sql` - SQL RPC function returning category name, slug, and post_count
- `src/shared/types/supabase.ts` - Regenerated with get_blog_categories function signature
- `src/lib/constants/query-config.ts` - Added BLOG entry (staleTime: 2min, gcTime: 10min)

## Decisions Made
- Slug computation in SQL via `lower(replace(category, ' ', '-'))` per locked user decision
- BLOG cache tier set to 2min staleTime (shorter than DETAIL's 5min) to reflect hourly n8n publish cadence
- RPC granted to both `anon` and `authenticated` roles since blogs are public marketing content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Docker was not running locally, so `supabase db push` used the linked remote project (default `--linked` flag). Type regeneration via `pnpm db:types` also targeted the remote project via `--project-id`. Both commands completed successfully without local Docker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- get_blog_categories RPC is deployed and callable on the remote database
- supabase.ts has typed function signature ready for Plan 02's blog-keys.ts factory
- BLOG cache tier is available for Plan 02's queryOptions() entries

## Self-Check: PASSED

All files and commits verified:
- supabase/migrations/20260307120000_blog_categories_rpc.sql: FOUND
- src/shared/types/supabase.ts: FOUND
- src/lib/constants/query-config.ts: FOUND
- Commit c0b2b701e: FOUND
- Commit 590c60ec0: FOUND

---
*Phase: 11-blog-data-layer*
*Completed: 2026-03-07*
