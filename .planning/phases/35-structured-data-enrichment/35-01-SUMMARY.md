---
phase: 35-structured-data-enrichment
plan: 01
subsystem: seo
tags: [seo, json-ld, article-schema, breadcrumbs, structured-data, blog]
dependency_graph:
  requires: [src/lib/seo/article-schema.ts, src/lib/seo/breadcrumbs.ts, src/components/seo/json-ld-script.tsx]
  provides: [Article JSON-LD for blog posts, BreadcrumbList JSON-LD for 11 pages]
  affects: [src/app/blog, src/app/help, src/app/support, src/app/privacy, src/app/terms, src/app/security-policy, src/app/resources]
tech_stack:
  added: []
  patterns: [Article JSON-LD factory with timeRequired, 4-level breadcrumb from route path, BreadcrumbList on all public pages]
key_files:
  created: []
  modified:
    - src/lib/seo/article-schema.ts
    - src/lib/seo/__tests__/article-schema.test.ts
    - src/app/blog/[slug]/page.tsx
    - src/app/blog/[slug]/blog-post-page.tsx
    - src/app/blog/page.tsx
    - src/app/blog/category/[category]/page.tsx
    - src/app/help/page.tsx
    - src/app/support/page.tsx
    - src/app/privacy/page.tsx
    - src/app/terms/page.tsx
    - src/app/security-policy/page.tsx
    - src/app/resources/landlord-tax-deduction-tracker/page.tsx
    - src/app/resources/security-deposit-reference-card/page.tsx
decisions:
  - "Blog post page.tsx fetches post data independently for JSON-LD — Next.js ISR deduplicates with generateMetadata query"
  - "4-level breadcrumb uses synthetic /blog/category/{cat}/{slug} path with overrides for human-readable labels"
  - "Author hardcoded as Richard Hudson (Person type) per D-01 requirement"
  - "Resource pages use JsonLdScript before existing style tag to preserve print CSS order"
metrics:
  duration: 8m
  completed: 2026-04-09
  tasks: 2/2
  tests_added: 2
  total_tests: 1573
---

# Phase 35 Plan 01: Structured Data Enrichment — Article + BreadcrumbList Summary

Article JSON-LD factory extended with timeRequired (ISO 8601 duration) and all public pages enriched with BreadcrumbList JSON-LD via shared Phase 33 utilities.

## What Was Built

### Article Factory Extension (`src/lib/seo/article-schema.ts`)
- Added `timeRequired?: string` to `ArticleJsonLdConfig` interface (ISO 8601 duration, e.g. "PT5M")
- Destructured `timeRequired` from config and conditionally spread into return object
- Satisfies SCHEMA-08 requirement for reading time in Article structured data

### Unit Tests (`src/lib/seo/__tests__/article-schema.test.ts`)
- Added `timeRequired: 'PT5M'` to `baseInput` fixture
- Added 2 new test cases: "timeRequired is included when provided" and "omits timeRequired when not provided"
- All 1573 unit tests pass

### Blog Post Server Wrapper (`src/app/blog/[slug]/page.tsx`)
- Converted default export from sync to async function
- Fetches post data (title, slug, published_at, updated_at, featured_image, content, reading_time, category, meta_description, excerpt, tags) from Supabase
- Computes `wordCount` from content via `.trim().split(/\s+/).length`
- Generates 4-level BreadcrumbList: Home > Blog > Category > Post Title with correct intermediate URLs
- Generates Article JSON-LD with Person author "Richard Hudson", wordCount, timeRequired (ISO 8601), keywords from tags, description, publisher with logo
- Renders both schemas via `<JsonLdScript>` server-side for SSR indexability

### Inline JSON-LD Removal (`src/app/blog/[slug]/blog-post-page.tsx`)
- Removed the entire inline BlogPosting JSON-LD script block that used a raw script tag with unsafe innerHTML pattern
- JSON-LD now lives entirely in the server wrapper for proper SSR rendering
- The JsonLdScript component centralizes XSS escaping (less-than sign to unicode escape)

### BreadcrumbList on 9 Pages
- Blog hub (`src/app/blog/page.tsx`): 2-level breadcrumb (Home > Blog)
- Blog category (`src/app/blog/category/[category]/page.tsx`): 3-level breadcrumb (Home > Blog > Category Name) with capitalized override
- Help, Support, Privacy, Terms, Security Policy: 2-level breadcrumb (Home > Page Title)
- Resource detail pages (tax deduction tracker, security deposit card): 3-level breadcrumb (Home > Resources > Title) with human-readable label overrides
- All resource pages retain their existing print CSS style tags unchanged

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 8544008ca | Add timeRequired to article schema and JSON-LD to blog post wrapper |
| 2 | 0ad2a9b20 | Add BreadcrumbList JSON-LD to blog hub, category, and 7 static pages |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All JSON-LD is wired to real data sources (Supabase blog data for article schema, static route paths for breadcrumbs).

## Threat Flags

No new threat surface introduced. The blog post JSON-LD uses `JsonLdScript` which escapes angle brackets preventing script injection (T-35-01 mitigated). All content is public blog data with no PII (T-35-02 accepted).

## Self-Check: PASSED

Files verified on disk:
- src/lib/seo/article-schema.ts: contains timeRequired
- src/lib/seo/__tests__/article-schema.test.ts: contains 2 new timeRequired tests
- src/app/blog/[slug]/page.tsx: contains createArticleJsonLd, createBreadcrumbJsonLd, JsonLdScript (3 usages)
- src/app/blog/[slug]/blog-post-page.tsx: inline JSON-LD removed
- All 9 breadcrumb pages: 2 JsonLdScript usages each (import + render)

Commits verified: 8544008ca and 0ad2a9b20 in git log.
