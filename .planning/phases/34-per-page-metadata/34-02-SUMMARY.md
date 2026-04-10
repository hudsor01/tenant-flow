---
phase: 34-per-page-metadata
plan: 02
subsystem: seo
tags: [metadata, server-components, pagination-noindex, blog, features]
dependency_graph:
  requires: [33-seo-utilities]
  provides: [features-metadata, blog-metadata, blog-category-metadata, pagination-noindex]
  affects: [src/app/features, src/app/blog, src/app/blog/category]
tech_stack:
  added: []
  patterns: [server-wrapper-client-split, generateMetadata-with-pagination-noindex]
key_files:
  created:
    - src/app/features/features-client.tsx
    - src/app/blog/blog-client.tsx
    - src/app/blog/category/[category]/blog-category-client.tsx
  modified:
    - src/app/features/page.tsx
    - src/app/blog/page.tsx
    - src/app/blog/category/[category]/page.tsx
decisions:
  - Used static metadata export for /features (no dynamic params needed)
  - Used generateMetadata for blog pages (pagination noindex requires searchParams)
  - Category name derived from slug via capitalize-words formatting
metrics:
  duration: 182s
  completed: 2026-04-08T23:46:20Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
---

# Phase 34 Plan 02: Features + Blog Page Metadata Summary

Split 3 use-client pages into server wrapper + client component pairs, enabling metadata exports with pagination noindex for blog pages and breadcrumb JSON-LD for features.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Split /features into server wrapper + client component with metadata | 827c985 | features-client.tsx (new), page.tsx (rewritten) |
| 2 | Split /blog and /blog/category/[category] with generateMetadata and pagination noindex | 2d10ef4 | blog-client.tsx (new), blog-category-client.tsx (new), both page.tsx rewritten |

## What Was Done

### Task 1: Features Page Split
- Created `src/app/features/features-client.tsx` with all interactive code (useState for sticky CTA, useEffect for scroll handler, all section imports)
- Rewrote `src/app/features/page.tsx` as server component with:
  - `export const metadata` via `createPageMetadata()` with title, description, canonical
  - `JsonLdScript` with `createBreadcrumbJsonLd('/features')` replacing inline dangerouslySetInnerHTML
- Removed inline `baseUrl` calculation and `getBreadcrumbSchema` import
- T-34-06 mitigated: replaced dangerouslySetInnerHTML with XSS-safe JsonLdScript component

### Task 2: Blog Pages Split
- Created `src/app/blog/blog-client.tsx` preserving all nuqs state, TanStack Query hooks, category pills, comparisons zone, and newsletter signup
- Rewrote `src/app/blog/page.tsx` with `generateMetadata()` that awaits `searchParams` (Next.js 16 Promise type) and applies `noindex: page > 1`
- Created `src/app/blog/category/[category]/blog-category-client.tsx` preserving useParams, useRouter redirect logic, and all category-specific rendering
- Rewrote `src/app/blog/category/[category]/page.tsx` with `generateMetadata()` that awaits both `params` and `searchParams`, formats category slug to title case, and applies pagination noindex

## Decisions Made

1. **Static vs dynamic metadata**: Features page uses `export const metadata` (no dynamic params needed); blog pages use `generateMetadata()` because pagination noindex requires reading searchParams
2. **Category name formatting**: Derived from URL slug by splitting on hyphens and capitalizing each word (e.g., `property-management` -> `Property Management`)
3. **No props passed to client components**: Per D-02 convention, all client components are self-contained with their own data fetching

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- pnpm typecheck: PASS
- pnpm lint: PASS
- Server wrappers contain no 'use client' directive: VERIFIED
- All 3 client components have 'use client' as first line: VERIFIED
- Pagination noindex present in both blog page wrappers: VERIFIED

## Self-Check: PASSED

All 7 files verified present on disk. Both task commits (827c985, 2d10ef4) verified in git log.
