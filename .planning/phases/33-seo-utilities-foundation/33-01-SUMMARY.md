---
phase: 33-seo-utilities-foundation
plan: 01
subsystem: seo
tags: [seo, json-ld, breadcrumbs, metadata, schema-dts]
dependency_graph:
  requires: [src/lib/generate-metadata.ts]
  provides: [JsonLdScript, createBreadcrumbJsonLd, createPageMetadata]
  affects: []
tech_stack:
  added: [schema-dts]
  patterns: [JSON-LD server component, breadcrumb factory, metadata factory]
key_files:
  created:
    - src/components/seo/json-ld-script.tsx
    - src/lib/seo/breadcrumbs.ts
    - src/lib/seo/page-metadata.ts
    - src/components/seo/__tests__/json-ld-script.test.tsx
    - src/lib/seo/__tests__/breadcrumbs.test.ts
    - src/lib/seo/__tests__/page-metadata.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Exclude string from Thing union via Exclude<Thing, string> to avoid TS2590 union complexity"
  - "Use Object.entries reduce for @context injection to avoid spread of complex schema-dts union types"
  - "Serialize schema-dts results to plain JSON in tests via JSON.parse(JSON.stringify()) for assertion compatibility"
metrics:
  duration: 9m
  completed: 2026-04-08
  tasks: 3/3
  tests_added: 19
  total_tests: 1538
---

# Phase 33 Plan 01: SEO Utilities Foundation Summary

Install schema-dts for type-safe JSON-LD, create JsonLdScript component with XSS escaping, breadcrumb factory from route paths, and page metadata factory for canonical URLs and OG tags.

## What Was Built

### JsonLdScript Component (`src/components/seo/json-ld-script.tsx`)
- Server Component that renders `<script type="application/ld+json">` tags
- Accepts any schema-dts object type (Organization, BreadcrumbList, FAQPage, etc.)
- Automatically wraps with `@context: 'https://schema.org'` if not already present
- Centralizes XSS escaping (`< -> \u003c`) in one location instead of 8+ inline patterns
- Uses `Exclude<Thing, string>` to constrain to object-shaped schemas only

### Breadcrumb Factory (`src/lib/seo/breadcrumbs.ts`)
- `createBreadcrumbJsonLd(path, overrides?)` generates BreadcrumbList schema from route path
- Splits path segments, auto-capitalizes labels (e.g., `/faq` -> "Faq")
- Supports label overrides for dynamic segments (e.g., `{ 'my-post': 'My Blog Post' }`)
- Last breadcrumb omits `item` URL per Schema.org spec (current page indicator)
- Imports `getSiteUrl()` from `generate-metadata.ts` as single source of truth

### Page Metadata Factory (`src/lib/seo/page-metadata.ts`)
- `createPageMetadata(config)` generates consistent Next.js `Metadata` objects
- Produces canonical URL, Open Graph tags (title, description, url, image), and Twitter card
- Supports `noindex` option for pages that should not be indexed
- Supports custom `ogImage` override with fallback to default OG image
- Imports `getSiteUrl()` from `generate-metadata.ts` as single source of truth

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 448260456 | Install schema-dts, create JsonLdScript component with 5 tests |
| 2 | 0c8242bbb | Create breadcrumb and page-metadata factories with 14 tests |
| 3 | 484f44f6c | Fix schema-dts type complexity for strict typecheck |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] schema-dts Thing type includes string, causing TS2322 and TS2590**
- **Found during:** Task 3 (typecheck)
- **Issue:** `Thing` from schema-dts is a union that includes `string`, causing `'@context' in schema` guard to fail type narrowing, and spreading the complex union produced TS2590 "too complex to represent"
- **Fix:** Used `Exclude<Thing, string>` to constrain props to object-shaped schemas only. Replaced object spread with `Object.entries().reduce()` to build the context-wrapped object without TypeScript needing to compute the spread union type.
- **Files modified:** `src/components/seo/json-ld-script.tsx`
- **Commit:** 484f44f6c

**2. [Rule 1 - Bug] schema-dts readonly array types incompatible with Record<string, unknown>[] cast**
- **Found during:** Task 3 (typecheck)
- **Issue:** `itemListElement` from schema-dts BreadcrumbList is a readonly complex union type that cannot be directly cast to `Array<Record<string, unknown>>`
- **Fix:** Added `toPlain()` and `getItems()` helper functions in breadcrumbs test that serialize via `JSON.parse(JSON.stringify())` to get plain mutable objects for assertions
- **Files modified:** `src/lib/seo/__tests__/breadcrumbs.test.ts`
- **Commit:** 484f44f6c

## Self-Check: PASSED

All 6 created files verified on disk. All 3 commit hashes verified in git log.
