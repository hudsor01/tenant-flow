---
phase: 39-structured-data-gap-closure
plan: 02
subsystem: seo
tags: [json-ld, schema.org, blog, structured-data, nextjs]

# Dependency graph
requires:
  - phase: 35
    provides: createArticleJsonLd helper wired into blog/[slug]/page.tsx (server component)
provides:
  - Blog post pages now emit a single, correct Article JSON-LD schema
  - Stale inline BlogPosting block with Organization author removed
  - Server-component Article schema is the sole structured data source for blog posts
affects: [seo, google-indexing, rich-results, blog-discoverability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-component JSON-LD as sole source of truth — client components never emit schema"

key-files:
  created: []
  modified:
    - src/app/blog/[slug]/blog-post-page.tsx

key-decisions:
  - "Client component carries zero JSON-LD — all structured data lives in the server component"

patterns-established:
  - "Single-source schema rule: when a page has both server and client components, JSON-LD lives only in the server component to prevent duplicate/conflicting schemas"

requirements-completed: [SCHEMA-02, SCHEMA-05]

# Metrics
duration: 10min
completed: 2026-04-12
---

# Phase 39 Plan 02: Remove Stale Inline BlogPosting JSON-LD Summary

**Deleted 28 lines of stale client-side BlogPosting JSON-LD from blog-post-page.tsx, leaving the correct server-side Article schema from page.tsx as the sole structured data source for blog posts.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-12T20:33Z
- **Completed:** 2026-04-12T20:40Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed the entire inline `<script type="application/ld+json">` block that emitted a BlogPosting schema with Organization author from the client component
- Confirmed server component (`blog/[slug]/page.tsx`) already renders the correct Article JSON-LD via `createArticleJsonLd` with Person author (Richard Hudson), wordCount, keywords, and canonical breadcrumb
- Eliminated the duplicate conflicting schema pair that Google could have resolved in either direction, ensuring a single unambiguous Article rich-result surface per blog post

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove stale inline BlogPosting JSON-LD from blog-post-page.tsx** - `b5bbbb959` (fix)

## Files Created/Modified
- `src/app/blog/[slug]/blog-post-page.tsx` - Deleted the `{/* JSON-LD Structured Data */}` comment and the adjacent 26-line `<script type="application/ld+json">` element with the `BlogPosting` payload. File shrank from 336 to 308 lines. No imports removed (no `createBlogPostingJsonLd`-style helper existed to clean up) and no other behavior changes.

## Decisions Made
None - plan executed exactly as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None during the code change itself. Worktree initially had `node_modules` missing; `pnpm install --frozen-lockfile` restored it before typecheck/lint/test runs.

## Verification

- `grep "application/ld+json" src/app/blog/[slug]/blog-post-page.tsx` — zero matches
- `grep "BlogPosting" src/app/blog/[slug]/blog-post-page.tsx` — zero matches
- `grep "JSON-LD Structured Data" src/app/blog/[slug]/blog-post-page.tsx` — zero matches
- `grep "createArticleJsonLd" src/app/blog/[slug]/page.tsx` — matches at line 6 (import) and line 112 (usage)
- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0
- `pnpm test:unit` — 1,610 tests passed across 125 files

## User Setup Required

None - no external service configuration required. Google will pick up the cleaner schema on next crawl; no manual resubmission needed.

## Next Phase Readiness
- Blog posts now emit exactly one Article schema per page — ready for Google Search Console rich-result validation
- No stubs, no placeholder schemas, no conflicting emitters remain on blog post routes

## Self-Check: PASSED

**Files verified:**
- FOUND: src/app/blog/[slug]/blog-post-page.tsx (modified, 308 lines)
- FOUND: .planning/phases/39-structured-data-gap-closure/39-02-SUMMARY.md (this file)

**Commits verified:**
- FOUND: b5bbbb959 — fix(39-02): remove stale inline BlogPosting JSON-LD from blog-post-page

---
*Phase: 39-structured-data-gap-closure*
*Completed: 2026-04-12*
