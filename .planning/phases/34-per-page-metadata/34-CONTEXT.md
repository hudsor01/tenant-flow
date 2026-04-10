# Phase 34: Per-Page Metadata - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Add unique, crawlable metadata (title, description, canonical URL, OG tags) to every public page that lacks it. Split `'use client'` pages into server wrapper + client content where needed to enable metadata exports. Migrate existing inline metadata patterns to use Phase 33's shared utilities.

</domain>

<decisions>
## Implementation Decisions

### Server/Client Split Approach
- **D-01:** Client components use `*-client.tsx` naming convention (e.g., `features-client.tsx`, `blog-client.tsx`, `blog-category-client.tsx`)
- **D-02:** Data fetching stays client-side in the split components. Server `page.tsx` only exports metadata and renders the client component. nuqs URL state and TanStack Query remain in the client piece.
- **D-03:** Pages needing split: `/features`, `/blog`, `/blog/category/[category]` — all currently `'use client'` full-page components

### Metadata Content Strategy
- **D-04:** Page titles use keyword-first, brand-trailing format optimized for Google indexing (e.g., "Property Management Pricing & Plans | TenantFlow" not just "Pricing | TenantFlow")
- **D-05:** Descriptions are keyword-rich with calls-to-action, 150-160 characters, optimized for CTR in search results (e.g., "Compare TenantFlow pricing plans. Start free, scale as your portfolio grows. No credit card required.")
- **D-06:** Each page gets a unique, descriptive title and description — no generic templates

### Blog Pagination Noindex
- **D-07:** Use Next.js `generateMetadata()` with `searchParams` to detect `?page=N`. If page > 1, return `robots: { index: false, follow: true }`. No refactoring of nuqs or TanStack Query needed.

### Existing Metadata Cleanup
- **D-08:** Migrate all inline `baseUrl` calculations and manual breadcrumb/OG schemas to use `createPageMetadata()` and `createBreadcrumbJsonLd()` from Phase 33 utilities. Full consistency pass across all public pages.

### Claude's Discretion
- Specific title and description wording per page (following D-04/D-05 guidelines)
- Implementation order and plan wave structure
- Whether to add metadata to pages not listed in META-01 through META-12 that happen to lack it (e.g., `/search`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SEO Utilities (Phase 33 Output)
- `src/lib/seo/page-metadata.ts` — `createPageMetadata()` factory for consistent Metadata objects
- `src/lib/seo/breadcrumbs.ts` — `createBreadcrumbJsonLd()` for BreadcrumbList schema
- `src/lib/seo/article-schema.ts` — `createArticleJsonLd()` for blog posts
- `src/lib/seo/product-schema.ts` — `createProductJsonLd()` for pricing
- `src/components/seo/seo-json-ld.tsx` — `JsonLdScript` component for safe JSON-LD rendering
- `src/lib/generate-metadata.ts` — `getSiteUrl()` single source of truth for base URL

### Pages Requiring Metadata Addition
- `src/app/page.tsx` — Homepage, no metadata export (META-10)
- `src/app/pricing/page.tsx` — No metadata export (META-01)
- `src/app/faq/page.tsx` — No metadata export, has inline baseUrl + breadcrumb (META-02)
- `src/app/about/page.tsx` — No metadata export (META-03)
- `src/app/contact/page.tsx` — No metadata export, has inline baseUrl + breadcrumb (META-04)
- `src/app/help/page.tsx` — No metadata export (META-06)

### Pages Requiring Server/Client Split
- `src/app/features/page.tsx` — `'use client'`, needs split (META-07)
- `src/app/blog/page.tsx` — `'use client'`, uses nuqs + TanStack Query (META-08)
- `src/app/blog/category/[category]/page.tsx` — `'use client'`, uses nuqs + TanStack Query (META-09)

### Pages That Already Have Metadata (reference for consistency)
- `src/app/blog/[slug]/page.tsx` — Has `generateMetadata()` with ISR
- `src/app/compare/[competitor]/page.tsx` — Has `generateMetadata()`
- `src/app/privacy/page.tsx` — Has static `metadata` export
- `src/app/terms/page.tsx` — Has static `metadata` export
- `src/app/security-policy/page.tsx` — Has static `metadata` export
- `src/app/support/page.tsx` — Has static `metadata` export
- `src/app/resources/*/page.tsx` — Resource pages have metadata exports

### Root Layout
- `src/app/layout.tsx` — Root `generateMetadata()` via `generateSiteMetadata()`, provides default OG/title

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createPageMetadata()` — Takes `{title, description, path, noindex?, ogImage?}`, returns full Metadata with canonical, OG, Twitter card
- `createBreadcrumbJsonLd()` — Generates BreadcrumbList schema from route path
- `JsonLdScript` — Type-safe JSON-LD renderer with XSS escaping
- `getSiteUrl()` — Single source of truth for base URL (no more inline `process.env.NEXT_PUBLIC_APP_URL` calculations)
- `PageLayout` — Already wraps all marketing pages

### Established Patterns
- Server components by default, `'use client'` only when needed
- `export const metadata` for static pages, `generateMetadata()` for dynamic pages
- `src/app/blog/[slug]/page.tsx` is the reference pattern for dynamic metadata with ISR

### Integration Points
- All new metadata exports integrate with Next.js Metadata API (no third-party packages)
- `createPageMetadata()` already handles canonical URL construction from path

</code_context>

<specifics>
## Specific Ideas

- Titles should be optimized for Google organic search (keyword-first, brand-trailing)
- Descriptions should include CTAs and be 150-160 chars for optimal SERP display
- The `/resources` page itself (if it exists as a hub) should get metadata too

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-per-page-metadata*
*Context gathered: 2026-04-08*
