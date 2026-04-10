---
phase: 37
name: Content SEO & Internal Linking
status: decided
decisions: 5
deferred: 0
---

# Phase 37: Content SEO & Internal Linking — Context

## Domain Boundary

Cross-link blog, comparison, and resource pages to build topical authority clusters. Three content types, three link directions: blog↔compare, compare→blog (already partially done), blog↔resources.

## Decisions

### D-01: Link Mapping Strategy — Extend compare-data.ts pattern
**Type:** Architecture
**Status:** Locked

Use explicit static mapping configs for all cross-link associations. `compare-data.ts` already proves this pattern with `blogSlug`. Create a centralized `content-links.ts` (or extend existing configs) for resource↔blog mappings. Zero runtime cost, SSG-compatible, easy to maintain. Only 3 resource pages exist — a tag-based DB system is overengineered.

**What this means for planner:** Create a static config file mapping resource slugs to related blog slugs and vice versa. No DB schema changes needed.

### D-02: Blog-to-Competitor Detection — Reverse mapping from compare-data.ts
**Type:** Architecture
**Status:** Locked

The 3 comparison blog posts (matching `blogSlug` values in `COMPETITORS`) are the exact posts that "mention a competitor by name." Reverse the `blogSlug → competitor slug` mapping: when rendering a blog post whose slug matches any `blogSlug`, show a CTA linking to `/compare/[competitor]`. No content scanning, no keyword detection — deterministic and zero-cost.

**Implementation hint:** Build a `BLOG_TO_COMPETITOR` reverse-lookup map from `COMPETITORS` at module level. Blog post detail page checks `slug in BLOG_TO_COMPETITOR` → renders compare CTA.

### D-03: Related Articles Component — Footer section with card layout
**Type:** UI
**Status:** Locked

Full-width section placed before the page CTA/footer, displaying 2-3 BlogCard-style cards. Reuses existing `BlogCard` component from `#components/blog/blog-card`. Shared across comparison and resource pages.

**What this means for planner:** Create a `RelatedArticles` component that accepts an array of blog post slugs, fetches their metadata, and renders BlogCard instances in a responsive grid.

### D-04: Comparison pages already link to blog posts
**Type:** Existing
**Status:** Acknowledged

`compare-sections.tsx:219` already renders a link to `/blog/${data.blogSlug}` for each competitor. CONTENT-02 requires a "Related Articles section" — this means adding the D-03 footer section, not just inline links. The existing inline link remains; the Related Articles section adds a dedicated browsing surface.

### D-05: Resource page linking is bidirectional
**Type:** Scope clarification
**Status:** Locked

Per CONTENT-03: resource pages link to related blog posts AND blog posts link back to related resource pages. The `content-links.ts` mapping file (D-01) must support both directions. Blog post detail page checks if slug appears in any resource mapping → renders resource CTA.

## Canonical Refs

- `src/app/compare/[competitor]/compare-data.ts` — COMPETITORS record with blogSlug mappings
- `src/app/compare/[competitor]/compare-sections.tsx` — Existing compare→blog link (line 219)
- `src/components/blog/blog-card.tsx` — Reusable card component for Related Articles
- `src/app/blog/[slug]/page.tsx` — Blog post detail page (needs compare + resource CTAs)
- `src/app/resources/page.tsx` — Resources listing page (needs blog links)
- `src/types/sections/compare.ts` — CompetitorData type with blogSlug field

## Existing Assets

- `BlogCard` component — reuse for Related Articles sections
- `COMPETITORS` data with `blogSlug` — reverse-map for blog→compare detection
- `useBlogs()` / `useComparisonPosts()` hooks — available for fetching blog post metadata
- `PageLayout` — all target pages already wrapped
- `JsonLdScript` + breadcrumb utilities — SEO infrastructure from Phase 33

## Specifics

- 3 competitors: buildium, appfolio, rentredi
- 3 resource pages: landlord-tax-deduction-tracker, seasonal-maintenance-checklist, security-deposit-reference-card
- Blog posts are DB-stored (Supabase), fetched via TanStack Query hooks
- Compare and resource pages are static/SSG
