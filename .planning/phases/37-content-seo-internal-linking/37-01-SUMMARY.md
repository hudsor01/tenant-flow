---
phase: 37-content-seo-internal-linking
plan: 01
subsystem: seo
tags: [internal-linking, content-seo, blog, server-components, tdd]
dependency_graph:
  requires: []
  provides:
    - src/lib/content-links.ts (RESOURCE_TO_BLOGS, BLOG_TO_RESOURCE, BLOG_TO_COMPETITOR)
    - src/components/blog/related-articles.tsx (RelatedArticles async Server Component)
  affects:
    - src/app/blog/[slug]/ (will consume BLOG_TO_RESOURCE, BLOG_TO_COMPETITOR in plan 02)
    - src/app/resources/ (will consume RESOURCE_TO_BLOGS via RelatedArticles in plan 02)
    - src/app/compare/[competitor]/ (will consume RelatedArticles in plan 02)
tech_stack:
  added: []
  patterns:
    - "Async Server Component with Supabase query (no TanStack Query needed)"
    - "Static reverse-map derivation from COMPETITORS config at module level"
    - "TDD: RED/GREEN/REFACTOR for both mapping config and component"
key_files:
  created:
    - src/lib/content-links.ts
    - src/lib/content-links.test.ts
    - src/components/blog/related-articles.tsx
    - src/components/blog/related-articles.test.tsx
  modified: []
decisions:
  - "BLOG_TO_COMPETITOR derived at module-level from COMPETITORS (compare-data.ts) — single source of truth, no duplication"
  - "BLOG_TO_RESOURCE derived from RESOURCE_TO_BLOGS via flatMap — inverse map computed automatically"
  - "RelatedArticles returns null for empty slugs AND empty query results — callers decide whether section renders"
  - "RelatedArticles uses section-spacing print:hidden — consistent with all marketing sections and printable-resource-friendly"
  - "Tests call async Server Component function directly and render React element — RTL render on return value"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
  tests_added: 21
---

# Phase 37 Plan 01: Content Links Mapping & RelatedArticles Component Summary

Static bidirectional slug maps and async Server Component for rendering cross-linked blog card grids across comparison, resource, and blog detail pages.

## What Was Built

### Task 1: content-links.ts mapping config (TDD)

`src/lib/content-links.ts` exports three static maps:

- `RESOURCE_TO_BLOGS` — 3 resource route segments mapped to arrays of related blog slugs
- `BLOG_TO_RESOURCE` — inverse map derived from `RESOURCE_TO_BLOGS` via `flatMap`
- `BLOG_TO_COMPETITOR` — derived from `COMPETITORS` in `compare-data.ts` — maps comparison blog slugs to competitor slugs

All maps are compile-time constants. Zero runtime cost, SSG-compatible, zero DB queries.

`src/lib/content-links.test.ts` — 15 unit tests covering all 3 maps, all entries, all reverse lookups.

### Task 2: RelatedArticles async Server Component (TDD)

`src/components/blog/related-articles.tsx` — async Server Component that:
- Returns `null` immediately for empty `slugs` array (no DB query)
- Fetches published blog posts matching given slugs from Supabase
- Returns `null` when no published posts match (no empty state UI)
- Renders responsive `md:grid-cols-3 gap-6` grid of `BlogCard` instances
- Applies `section-spacing print:hidden` consistent with all marketing sections
- Uses `typography-h2` heading with customizable `title` prop (defaults to "Related Articles")
- Accepts optional `className` for additional styling

`src/components/blog/related-articles.test.tsx` — 6 smoke tests:
- Returns null for empty slugs array
- Returns null when Supabase returns empty data
- Returns null when Supabase returns null data
- Renders section with default heading when posts found
- Renders custom title prop in h2
- Renders a BlogCard for each returned post

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | ff4826e04 | feat(37-01): create content-links mapping config with bidirectional slug maps |
| 2 | cab038a6e | feat(37-01): create RelatedArticles async Server Component with smoke tests |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 4 created files exist on disk. Both commits confirmed in git log.

- FOUND: src/lib/content-links.ts
- FOUND: src/lib/content-links.test.ts
- FOUND: src/components/blog/related-articles.tsx
- FOUND: src/components/blog/related-articles.test.tsx
- FOUND commit: ff4826e04
- FOUND commit: cab038a6e

## Known Stubs

None — all exports are fully implemented static maps or functional component logic.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. The `RelatedArticles` Supabase query is public-read (published blogs only, enforced by both `.eq('status', 'published')` filter and existing RLS policies).
