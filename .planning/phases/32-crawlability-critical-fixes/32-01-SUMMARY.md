---
phase: 32-crawlability-critical-fixes
plan: 01
subsystem: seo
tags: [robots.txt, json-ld, structured-data, googlebot, crawlability, next-metadata]

# Dependency graph
requires: []
provides:
  - Dynamic robots.ts route with correct allow/disallow rules for Googlebot
  - Exported getSiteUrl() utility for sitemap URL construction
  - Cleaned JSON-LD schemas without fabricated aggregateRating data
affects: [seo, marketing-pages, structured-data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MetadataRoute.Robots for dynamic robots.txt generation"

key-files:
  created:
    - src/app/robots.ts
  modified:
    - src/lib/generate-metadata.ts

key-decisions:
  - "Exported getSiteUrl() rather than duplicating URL logic in robots.ts"
  - "Used MetadataRoute.Robots type for type-safe robots.txt generation"

patterns-established:
  - "Dynamic robots.ts route pattern using Next.js MetadataRoute API"

requirements-completed: [CRAWL-01, CRAWL-02, CRAWL-03, CRAWL-04]

# Metrics
duration: 4min
completed: 2026-04-08
---

# Phase 32 Plan 01: Crawlability Critical Fixes Summary

**Dynamic robots.ts allowing Googlebot CSS/JS access, removed fabricated aggregateRating from JSON-LD, deleted stale static robots.txt/sitemap files**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-08T17:00:48Z
- **Completed:** 2026-04-08T17:05:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created dynamic robots.ts route that allows /_next/static/ and /_next/image/ so Googlebot can render pages (previously blocked by static robots.txt disallowing all of /_next/)
- Removed fabricated aggregateRating (4.8 stars, 1,250 reviews) from both Organization and SoftwareApplication JSON-LD schemas to avoid Google manual action risk
- Deleted stale public/robots.txt, public/sitemap.xml, and public/sitemap-index.xml that shadowed dynamic routes
- Exported getSiteUrl() from generate-metadata.ts for reuse in robots.ts sitemap URL
- Removed invalid robots.txt patterns: Crawl-delay, Request-rate, *.json$, /manage/, bot-specific blocks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dynamic robots.ts and export getSiteUrl** - `4af73593d` (feat)
2. **Task 2: Remove aggregateRating and delete stale static files** - `127d78f8f` (fix)

## Files Created/Modified
- `src/app/robots.ts` - Dynamic robots.txt route with MetadataRoute.Robots export, allows /_next/static/ and /_next/image/
- `src/lib/generate-metadata.ts` - Exported getSiteUrl(), removed aggregateRating from Organization and SoftwareApplication schemas
- `public/robots.txt` - Deleted (replaced by dynamic route)
- `public/sitemap.xml` - Deleted (shadowed dynamic sitemap.ts)
- `public/sitemap-index.xml` - Deleted (stale index file)

## Decisions Made
- Exported getSiteUrl() rather than duplicating URL construction logic in robots.ts -- single source of truth for site URL resolution
- Used Next.js MetadataRoute.Robots type for type-safe robots.txt generation rather than a raw string template

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Googlebot can now render pages (CSS/JS access unblocked)
- JSON-LD structured data is clean for Google Search Console validation
- Dynamic robots.ts serves as the single source of truth for crawl rules

## Self-Check: PASSED

- All created files exist: src/app/robots.ts, src/lib/generate-metadata.ts, 32-01-SUMMARY.md
- All deleted files confirmed gone: public/robots.txt, public/sitemap.xml, public/sitemap-index.xml
- Commits verified: 4af73593d (Task 1), 127d78f8f (Task 2)

---
*Phase: 32-crawlability-critical-fixes*
*Completed: 2026-04-08*
