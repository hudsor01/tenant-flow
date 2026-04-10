# Phase 33: SEO Utilities Foundation - Research

**Researched:** 2026-04-08
**Status:** Complete

## Current State Analysis

### Existing SEO Infrastructure

1. **`src/lib/generate-metadata.ts`** - Central metadata file with:
   - `getSiteUrl()` - already exported (Phase 32), single source of truth for base URL
   - `getDefaultMetadata()` / `defaultMetadata` - global Metadata object with title template, OG, Twitter
   - `getJsonLd()` - returns Organization + SoftwareApplication schemas (aggregateRating removed in Phase 32)
   - `generateSiteMetadata()` - async wrapper, currently just returns default metadata

2. **`src/components/seo/seo-json-ld.tsx`** - Global JSON-LD component:
   - Imports `getJsonLd()`, renders array of schemas
   - Uses `dangerouslySetInnerHTML` with `JSON.stringify().replace(/</g, '\\u003c')` for XSS escaping
   - Used in `src/app/layout.tsx` as global structured data

3. **Inline JSON-LD across 8 pages** (all use identical `dangerouslySetInnerHTML` + `\\u003c` pattern):
   - `src/app/pricing/page.tsx` - faqSchema, breadcrumbSchema, offerSchema (3 script tags)
   - `src/app/faq/page.tsx` - faqSchema, breadcrumbSchema (2 script tags)
   - `src/app/about/page.tsx` - breadcrumbSchema (1 script tag)
   - `src/app/contact/page.tsx` - breadcrumbSchema (1 script tag)
   - `src/app/features/page.tsx` - breadcrumbSchema (1 script tag)
   - `src/app/resources/page.tsx` - breadcrumbSchema (1 script tag)
   - `src/app/compare/[competitor]/page.tsx` - comparisonSchema (1 script tag)
   - `src/app/blog/[slug]/blog-post-page.tsx` - BlogPosting inline (1 script tag)

4. **`src/lib/seo/`** - Does NOT exist yet (target directory for new utilities)

5. **`schema-dts`** - NOT installed yet (needed as devDependency for type-safe schemas)

### Key Patterns Observed

- Every page duplicates the same XSS escaping pattern: `JSON.stringify(schema).replace(/</g, '\\u003c')`
- Breadcrumb schemas are constructed inline in each page with near-identical structure
- No shared factory functions exist - each page builds its own schema objects
- `getSiteUrl()` is imported by `robots.ts` but no other file besides `generate-metadata.ts` itself

## Technical Decisions

### schema-dts Usage

`schema-dts` (npm) provides TypeScript types for all Schema.org vocabulary. Key patterns:
- Types like `Article`, `BreadcrumbList`, `FAQPage`, `Product`, `WithContext` are available
- `WithContext<T>` wraps a schema type with `@context: 'https://schema.org'`
- Install as `devDependency` only - types are erased at runtime, zero bundle impact
- Version: `^2.0.0` (latest stable, supports full Schema.org vocabulary)

### JsonLdScript Component Design

The new `JsonLdScript` component should:
- Accept any `schema-dts` type via generic `<T extends Thing>`
- Handle the `@context` wrapping internally
- Centralize XSS escaping (`\\u003c` replacement) in one place
- Replace both the global `SeoJsonLd` component and all per-page inline scripts
- Be a Server Component (no client interactivity needed)

### Factory Function Design

Each factory (breadcrumbs, article, faq, product, page-metadata) should:
- Accept minimal typed inputs (not raw schema objects)
- Return properly typed `schema-dts` objects
- Use `getSiteUrl()` internally for URL construction
- Be pure functions with no side effects (easy to test)

### getSiteUrl() Location

Currently in `src/lib/generate-metadata.ts`. The roadmap says it can stay there OR move to `src/lib/seo/`. Recommendation: **keep it in `generate-metadata.ts`** since it's already exported and imported by `robots.ts`. Moving it would require updating all existing importers for no benefit. The SEO utilities in `src/lib/seo/` will import from `#lib/generate-metadata`.

## Plan Splitting Analysis

The phase has 8 requirements (UTIL-01 through UTIL-08). Natural split:

**Plan 1: JsonLdScript component + schema-dts setup + breadcrumbs + page-metadata factories**
- Install `schema-dts` (UTIL-07 partial)
- Create `JsonLdScript` component (UTIL-01)
- Create `createBreadcrumbJsonLd()` (UTIL-02)
- Create `createPageMetadata()` factory (UTIL-06)
- Export `getSiteUrl()` verification (UTIL-07 - already done in Phase 32)
- Unit tests for above (UTIL-08 partial)

**Plan 2: Article, FAQ, Product factories + remaining tests**
- Create `createArticleJsonLd()` (UTIL-03)
- Create `createFaqJsonLd()` (UTIL-04)
- Create `createProductJsonLd()` (UTIL-05)
- Unit tests for all factories (UTIL-08 complete)

Both plans are in Wave 1 (no dependencies between them). Plan 1 creates the foundation (JsonLdScript, breadcrumbs) that downstream phases need most. Plan 2 creates the content-specific factories.

**Files modified overlap:** None - Plan 1 creates `json-ld-script.tsx`, `breadcrumbs.ts`, `page-metadata.ts`. Plan 2 creates `article-schema.ts`, `faq-schema.ts`, `product-schema.ts`. Safe for parallel execution.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| `schema-dts` types too strict for existing loose schemas | Use `as` casts only at schema construction boundary; factory return types enforce correctness |
| Downstream phases expect specific factory signatures | Define clear input types now; downstream phases consume return values |
| `getSiteUrl()` env var missing in test context | Mock `#env` in vitest; existing test patterns already handle this |

## Dependencies

- Phase 32 (complete): `getSiteUrl()` export, stale files deleted
- No external dependencies beyond `schema-dts` devDependency
