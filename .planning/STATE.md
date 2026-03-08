---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Blog Redesign & CI
status: executing
stopped_at: Completed 14-01-PLAN.md
last_updated: "2026-03-08T00:37:11.718Z"
last_activity: 2026-03-08 -- Phase 14 plan 01 complete (hub page rewrite with split zones, category pills, newsletter)
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 7
  completed_plans: 6
  percent: 91
---

# Project State: TenantFlow

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.
**Current focus:** v1.1 Blog Redesign & CI -- Phase 14 plan 01 complete, plan 02 next

## Current Position

Milestone: v1.1 Blog Redesign & CI
Phase: 14 of 15 (Blog Pages)
Plan: 1 of 2 in current phase -- COMPLETE
Status: Executing
Last activity: 2026-03-08 -- Phase 14 plan 01 complete (hub page rewrite with split zones, category pills, newsletter)

Progress: [█████████░] 91%

## Performance Metrics

**Velocity:**
- Total plans completed: 6 (v1.1)
- Average duration: 5min
- Total execution time: 28min

*Updated after each plan completion*

## Accumulated Context

### Decisions

- Blog redesign plan exists at docs/plans/2026-03-06-blog-redesign.md (10 tasks, detailed implementation)
- CI dedup: gate checks to PR-only, e2e-smoke runs independently on push to main
- Data layer is critical path: RPC migration + type regeneration must complete before components or pages
- Phase 13 (Newsletter) and Phase 15 (CI) are independent -- can execute in parallel with other phases
- get_blog_categories RPC uses SECURITY INVOKER with grants to anon + authenticated (public content)
- BLOG cache tier: 2min staleTime, 10min gcTime (shorter than DETAIL to reflect hourly n8n publish cadence)
- blogQueries factory follows property-keys.ts pattern: queryOptions() with colocated queryFn + cache times
- Blog queries use anon RLS (no getCachedUser) -- public content pattern for all blog factories
- keepPreviousData in hook layer (use-blogs.ts), not in factory (blog-keys.ts) -- separation of concerns
- Blog page consumers updated to handle PaginatedResponse.data shape (1-line change per consumer)
- NewsletterSignup uses useRef for email input (no controlled state) for single-field form simplicity
- BlogEmptyState uses scaleX(0)->scaleX(1) with transform-origin:left for typewriter line reveal
- Both new components follow existing skeleton pattern: inline style tag with @keyframes
- BlogCard uses single Link wrapper, no nested interactive elements (locked decision)
- Category/reading time as plain inline text spans, not pills/badges (locked decision)
- BlogPagination clears URL param (setPage(null)) when navigating to page 1 for clean URLs
- scrollbar-hide uses TailwindCSS v4 @utility directive pattern
- Always return 200 success regardless of Resend API response (locked decision, duplicates silent)
- Raw fetch to Resend REST API (no SDK, Deno runtime requires fetch)
- Segment ID cached in module-level variable (isolate cache pattern from rate-limit.ts)
- Race condition on segment creation handled via list-create-relist pattern
- Email domain logged for observability, full email never logged
- [Phase 13-newsletter-backend]: Always return 200 success regardless of Resend API response (locked decision, duplicates silent)
- [Phase 14-01]: Simplified hero (plain h1 + subtitle), no HeroSection component or stats card
- [Phase 14-01]: Category pills as inline-flex rounded-full buttons with post counts from useBlogCategories
- [Phase 14-01]: BlogEmptyState shown when Insights & Guides zone has zero posts

### Pending Todos

None.

### Blockers/Concerns

- Resend Contacts API duplicate behavior needs empirical validation during Phase 13 -- RESOLVED (always return success)
- `@tailwindcss/typography` plugin directive added to globals.css -- RESOLVED (12-01)
- BlogEmptyState delivered in 12-02 (src/components/shared/blog-empty-state.tsx) -- RESOLVED

## Session Continuity

Last session: 2026-03-08T00:37:11.716Z
Stopped at: Completed 14-01-PLAN.md
Resume file: None
