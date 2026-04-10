# Project Research Summary

**Project:** TenantFlow v1.6 -- SEO & Google Indexing Optimization
**Domain:** Next.js 16 SaaS SEO optimization
**Researched:** 2026-04-08
**Confidence:** HIGH

## Executive Summary

TenantFlow has a meaningful SEO foundation -- `generateMetadata()` on 3 dynamic routes, JSON-LD on 9 pages, a dynamic sitemap with ISR, and Vercel Speed Insights for Core Web Vitals. However, the codebase contains several actively harmful misconfigurations that are worse than having no SEO at all. The `robots.txt` blocks `/_next/` which prevents Googlebot from loading CSS and JavaScript, rendering every page as a blank white screen to the crawler. The Organization schema includes a fabricated `aggregateRating` (4.8 stars, 1,250 reviews) that violates Google's self-serving review policy and risks a manual action stripping all rich results site-wide. A stale `public/sitemap.xml` from February 2025 shadows the dynamic `src/app/sitemap.ts`, and the pricing JSON-LD has an expired `priceValidUntil` date of 2025-12-31. These are not gaps to fill but active damage to fix.

The recommended approach uses zero new runtime dependencies and one dev dependency (`schema-dts` for type-safe JSON-LD). Everything else is native Next.js 16 Metadata API: `generateMetadata()`, `MetadataRoute.Robots`, `MetadataRoute.Sitemap`, and `<script type="application/ld+json">` injection. The project already has every tool it needs -- the work is about correct, consistent usage across all 15+ public pages. A layered architecture (root layout defaults, shared SEO utility functions, per-page overrides) with a `JsonLdScript` component and builder functions (`createBreadcrumbJsonLd`, `createArticleJsonLd`, `createPageMetadata`) replaces the current pattern of copy-pasted inline JSON-LD objects and inconsistent `baseUrl` construction.

The critical sequencing constraint is: crawlability fixes must come first. The `/_next/` block in `robots.txt` means Googlebot cannot render any page. No amount of schema enrichment, metadata optimization, or structured data work matters if Google sees blank pages. Phase 1 is non-negotiable: fix `robots.txt`, delete stale static files, and remove the self-serving AggregateRating. Only after crawlability is restored does investing in metadata, structured data, and content SEO have any value.

## Key Findings

### Recommended Stack

No runtime dependencies. One dev dependency. The SEO optimization is entirely about correct usage of existing Next.js 16 capabilities, not missing tools.

**Core technologies:**
- `schema-dts@^2.0.0` (dev only): TypeScript types for Schema.org JSON-LD -- type-safe structured data authoring, zero runtime cost, maintained by Google, 100K+ weekly npm downloads
- Next.js `generateMetadata()` (native): already used on 3 routes, needs extension to ~12 more public pages -- covers title templates, OG, Twitter, canonical URLs, robots directives
- Next.js `MetadataRoute.Robots` (native): dynamic `robots.ts` replaces the broken static `public/robots.txt` -- environment-aware, type-safe
- Next.js `MetadataRoute.Sitemap` (native): existing `sitemap.ts` needs enhancement (missing pages, accurate timestamps) -- no splitting needed at 25-35 URLs
- `@vercel/speed-insights` (already installed): RUM-based Core Web Vitals monitoring -- no additional CWV tooling needed

**Explicit anti-additions:** `next-seo` (redundant with Metadata API), `next-sitemap` (project already uses native `sitemap.ts`), `web-vitals` (Vercel Speed Insights covers it), `react-schemaorg` (5-line component replaces it), `@googleapis/searchconsole` (out of scope -- use GSC web UI), Lighthouse CI (overkill for ~20 public pages).

### Expected Features

**Must have (table stakes):**
- BreadcrumbList schema on all public pages -- highest-ROI schema type, increases SERP CTR, 7 pages have it but 8+ are missing
- `generateMetadata()` with unique title/description/canonical on all ~12 public pages currently falling back to generic root defaults
- Complete Article schema on blog posts -- `mainEntityOfPage`, `image`, `wordCount`, `keywords`, Person author (blog is primary SEO traffic driver)
- Sitemap completeness -- `/support`, `/security-policy`, blog category pages missing
- Fix stale `priceValidUntil: '2025-12-31'` on pricing page -- expired dates actively hurt rich results
- robots.txt corrections -- fix `/_next/` blocking, invalid `*.json$` pattern, missing `/dashboard/` disallow
- Homepage structured data -- WebSite schema with SearchAction for sitelinks search box
- Canonical URLs on all public pages -- several pages inherit homepage canonical, creating duplicate content signals

**Should have (competitive differentiators):**
- Content cluster internal linking -- blog-to-comparison, comparison-to-blog, resource cross-linking
- Blog author schema with Person type -- E-E-A-T signals for YMYL-adjacent content
- HowTo schema on seasonal maintenance checklist -- genuine instructional content
- Comparison page paired SoftwareApplication schemas
- WebSite SearchAction for sitelinks search box
- `noindex, follow` on paginated blog pages beyond page 1
- Google Search Console verification meta tag

**Defer to v1.7+:**
- Dynamic OG image generation (Satori/Vercel OG) -- high complexity, marginal SEO ROI
- Per-content-type OG images -- nice-to-have polish
- Named author pages at `/blog/authors/[author]`
- Content cluster hub page at `/education/` or `/guides/`
- Sitemap splitting into category sitemaps -- premature at 25-35 URLs

### Architecture Approach

Three-layer architecture: root layout (global defaults), shared SEO utilities (reusable building blocks), and per-page overrides. The key new components are a `JsonLdScript` component for type-safe rendering with XSS escaping, builder functions for each schema type (`createBreadcrumbJsonLd`, `createArticleJsonLd`, `createFaqJsonLd`, `createProductJsonLd`), a `createPageMetadata` factory for consistent Metadata objects, and a dynamic `robots.ts` route. Three `'use client'` pages (features, blog hub, blog/category) need the server wrapper pattern: extract the client code to a `-content.tsx` file, make `page.tsx` a Server Component that exports metadata and renders the client component. The static `public/sitemap.xml`, `public/sitemap-index.xml`, and `public/robots.txt` files must all be deleted since they shadow their dynamic equivalents.

**Major components:**
1. `JsonLdScript` (`src/components/seo/json-ld-script.tsx`) -- type-safe JSON-LD rendering with XSS escaping, replaces 10+ instances of inline `dangerouslySetInnerHTML`
2. SEO builder utilities (`src/lib/seo/`) -- `breadcrumbs.ts`, `article-schema.ts`, `faq-schema.ts`, `product-schema.ts`, `page-metadata.ts` -- centralized, tested schema generation
3. `robots.ts` (`src/app/robots.ts`) -- dynamic route with `MetadataRoute.Robots`, environment-aware, replaces broken static file
4. `getSiteUrl()` (exported from `generate-metadata.ts`) -- single source of truth for base URL, replacing inconsistent `process.env` lookups across pages
5. Server wrappers for 3 client pages -- `features-content.tsx`, `blog-content.tsx`, `category-content.tsx` split from their parent `page.tsx` files

### Critical Pitfalls

1. **robots.txt blocks `/_next/` -- Googlebot sees blank pages** -- HIGHEST PRIORITY. The current `Disallow: /_next/` prevents loading of CSS and JS. Googlebot renders pages as blank white screens, leading to "Crawled but not indexed" status. Replace with targeted rules that allow `/_next/static/` and `/_next/image/` while blocking `/_next/data/`. Must be fixed before any other SEO work has value.

2. **Self-serving AggregateRating risks manual action** -- `generate-metadata.ts` includes fabricated `aggregateRating` (4.8 stars, 1,250 reviews) on Organization and SoftwareApplication schemas. Google prohibits entity A's website hosting ratings for entity A. This is invisible markup (numbers not displayed on any page) which can trigger a manual action that strips ALL rich results site-wide. Remove from Organization entirely; only keep on SoftwareApplication if backed by real third-party reviews.

3. **Static `public/sitemap.xml` shadows dynamic `src/app/sitemap.ts`** -- Next.js serves static files at higher priority than dynamic routes. Crawlers get the stale Feb 2025 file (15 entries) instead of the fresh dynamic version. Delete `public/sitemap.xml` and `public/sitemap-index.xml`.

4. **Expired `priceValidUntil: '2025-12-31'` on pricing page** -- already past. Google flags expired offers and may stop showing pricing rich results. Compute dynamically (end of current year + 1) or omit entirely for ongoing subscription pricing.

5. **3 `'use client'` pages cannot export metadata** -- features, blog hub, and blog/category pages fall back to generic root defaults (no page-specific title, description, or canonical URL). Requires server wrapper pattern to split metadata export from client interactivity.

6. **Canonical URL inconsistency** -- three different URL construction patterns across the codebase (some absolute, some relative, some with wrong port fallbacks). Pages without explicit canonicals inherit the homepage canonical, creating duplicate content signals. Centralize on `getSiteUrl()` and ensure every public page sets its own canonical.

7. **Sitemap `lastModified` uses generation timestamp for all entries** -- every ISR regeneration makes all pages appear freshly modified. Google learns to distrust `lastmod` and may ignore sitemap freshness signals. Use actual content dates.

## Implications for Roadmap

Based on combined research, the milestone maps to 7 phases with a strict dependency chain. The ordering is driven by one overriding principle: crawlability must be restored before any other SEO work has value.

### Phase 1: Crawlability Fixes
**Rationale:** The `/_next/` block in robots.txt means Googlebot sees blank pages. The self-serving AggregateRating risks a manual action. The stale static sitemap shadows the dynamic one. These are production emergencies that make ALL other SEO work invisible. This phase must come first unconditionally.
**Delivers:** Correct `robots.ts` allowing Googlebot to render pages, removal of spam-risk structured data, deletion of stale static files
**Addresses:** CRAWL-01, CRAWL-02, CRAWL-03, CRAWL-04; removes AggregateRating from Organization schema
**Avoids:** Pitfall 1 (blank pages to Googlebot), Pitfall 2 (manual action for spammy markup), static/dynamic sitemap conflict

### Phase 2: SEO Utilities Foundation
**Rationale:** Every subsequent phase depends on shared utilities for JSON-LD generation, metadata factories, and URL resolution. Building them first means page-level work is mechanical consumption of tested building blocks, not per-page reinvention.
**Delivers:** `JsonLdScript` component, `createBreadcrumbJsonLd()`, `createArticleJsonLd()`, `createFaqJsonLd()`, `createProductJsonLd()`, `createPageMetadata()`, exported `getSiteUrl()`, unit tests for all
**Addresses:** UTIL-01 through UTIL-08
**Avoids:** Pitfall 4 (inline JSON-LD duplication), inconsistent URL construction across pages

### Phase 3: Metadata Gap Closure
**Rationale:** With utilities in place and crawlability restored, adding page-specific metadata is the highest-ROI next step. Pages with generic titles and missing canonical URLs underperform in search regardless of structured data quality.
**Delivers:** `generateMetadata()` or `export const metadata` on all ~12 public pages, server wrapper pattern for 3 `'use client'` pages, canonical URLs on all public pages, `noindex` on paginated pages
**Addresses:** META-01 through META-12
**Avoids:** Pitfall 5 (canonical URL inconsistency), Anti-Pattern 1 (client component metadata)

### Phase 4: Structured Data Enrichment
**Rationale:** With crawlability fixed and metadata in place, structured data can now actually reach Google and complement the metadata layer. Refactoring existing inline JSON-LD to use shared utilities ensures consistency, and adding missing schemas maximizes rich result eligibility.
**Delivers:** BreadcrumbList on all public pages, Article JSON-LD on blog posts, WebSite SearchAction on homepage, refactored existing schemas to use shared utilities, HowTo on maintenance checklist, comparison page SoftwareApplication pairs
**Addresses:** SCHEMA-01 through SCHEMA-08
**Avoids:** Pitfall 6 (client-side JSON-LD not in SSR HTML)

### Phase 5: Pricing Page Fixes
**Rationale:** The pricing page has accumulated specific technical debt (expired dates, HTML entity issues, legacy Tailwind syntax, missing mobile layout) that warrants a focused phase.
**Delivers:** Dynamic `priceValidUntil`, fixed HTML entities, centralized social proof config, `noindex` on success/cancel pages, responsive comparison table, legacy Tailwind v3-to-v4 migration
**Addresses:** PRICE-01 through PRICE-05, SCHEMA-04

### Phase 6: Content SEO & Internal Linking
**Rationale:** Cross-linking between content types builds topical authority and improves crawl path discovery. Depends on all structured data and metadata being in place first.
**Delivers:** Blog-to-comparison links, comparison-to-blog links, resource cross-linking
**Addresses:** CONTENT-01 through CONTENT-03

### Phase 7: Validation & Verification
**Rationale:** Final phase confirms everything works end-to-end. GSC verification enables ongoing monitoring. E2E smoke tests prevent regressions.
**Delivers:** GSC verification meta tag, E2E SEO smoke tests, sitemap enhancements (missing pages, accurate timestamps), confirmation that all existing tests pass
**Addresses:** VALID-01 through VALID-03, CRAWL-05, CRAWL-06

### Phase Ordering Rationale

- **Crawlability FIRST is non-negotiable.** The `/_next/` block means Googlebot cannot render any page. Every other SEO improvement is invisible to Google until this is fixed. One documented case showed only 23 of 156 pages indexed after this mistake.
- **Utilities before consumers** follows the same principle as v1.4's hook-before-UI ordering. Building shared functions first means each page migration is a mechanical import, not a per-page reinvention.
- **Metadata before structured data** because canonical URLs and page titles must be correct before JSON-LD can reference them.
- **Content linking last** because it depends on all target pages having correct metadata and schema in place.
- **Validation last** because it tests the output of all preceding phases.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Metadata Gap Closure):** The 3 `'use client'` page splits need careful analysis of existing component state, props, and TanStack Query prefetch patterns.
- **Phase 5 (Pricing Page):** The Tailwind v3-to-v4 migration may surface additional legacy syntax patterns.

Phases with standard patterns (skip additional research):
- **Phase 1 (Crawlability):** robots.txt rules and static file deletion are trivial operations.
- **Phase 2 (SEO Utilities):** Standard TypeScript utility functions with `schema-dts` types.
- **Phase 4 (Structured Data):** Google's docs provide exact field requirements. `schema-dts` types enforce correctness.
- **Phase 6 (Content SEO):** Content editing task using existing `next/link` components.
- **Phase 7 (Validation):** GSC verification is a meta tag. E2E tests follow existing Playwright patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 1 dev dep (`schema-dts`), 0 runtime deps. All capabilities verified against Next.js 16 official docs and existing codebase audit. |
| Features | HIGH | Table stakes confirmed against Google Search Central docs and competitor analysis (TurboTenant, Buildium, AppFolio). Anti-features confirmed against Google's explicit restrictions. |
| Architecture | HIGH | Layered metadata pattern matches Next.js App Router design. Server wrapper pattern is standard. All 9 existing JSON-LD pages and 15+ public pages audited. |
| Pitfalls | HIGH | 3 of 7 critical pitfalls are confirmed production issues. Self-serving AggregateRating verified against Google's structured data policies. |

**Overall confidence:** HIGH

### Gaps to Address

- **AggregateRating source verification:** The fabricated 4.8 stars / 1,250 reviews has no backing data source. Determine whether TenantFlow has any legitimate third-party review platform presence before Phase 1.
- **Google Search Console verification code:** Needs actual verification string from Google -- obtained by site owner during Phase 7 setup.
- **Blog hub server wrapper data flow:** The blog hub `'use client'` split needs examination of TanStack Query prefetch patterns during Phase 3 planning.
- **Sitemap on-demand revalidation:** 24h ISR may be slow for new blog posts. Consider whether publishing should trigger sitemap revalidation.

## Sources

### Primary (HIGH confidence)

- [Next.js JSON-LD Guide](https://nextjs.org/docs/app/guides/json-ld) -- `<script>` tag injection pattern, XSS prevention
- [Next.js Metadata Files: robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) -- `MetadataRoute.Robots` for dynamic `robots.ts`
- [Next.js Metadata Files: sitemap.xml](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) -- `MetadataRoute.Sitemap` and ISR caching
- [schema-dts on npm](https://www.npmjs.com/package/schema-dts) -- v2.0.0, 100K+ weekly downloads, by Google
- [Google Structured Data Policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) -- invisible markup rules, manual action triggers
- [Google FAQ/HowTo Rich Results Changes (Aug 2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes) -- FAQPage restricted to government/health sites
- [Google Review Snippet Documentation](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) -- self-serving review restrictions
- [BreadcrumbList Schema Guide](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) -- implementation requirements
- [SoftwareApplication Schema](https://developers.google.com/search/docs/appearance/structured-data/software-app) -- eligible fields, rating display
- [Vercel Speed Insights docs](https://vercel.com/docs/speed-insights) -- RUM-based CWV monitoring
- Codebase analysis: 9 pages with existing JSON-LD, `sitemap.ts`, `robots.txt`, `generate-metadata.ts`, all `page.tsx` files audited

### Secondary (MEDIUM confidence)

- [The Robots.txt Mistake That Cost Me Visitors](https://minasami.com/web-development/seo/2025/12/05/nextjs-seo-robots-txt-mistake.html) -- real-world `/_next/` blocking impact
- [Schema SEO for SaaS Company](https://www.madx.digital/learn/schema-seo-for-saas-company) -- SaaS-specific schema implementation
- [TurboTenant Blog](https://www.turbotenant.com/blog/) -- competitor content hub structure
- [Buildium Blog](https://www.buildium.com/blog/) -- competitor content strategy

---
*Research completed: 2026-04-08*
*Ready for roadmap: yes*
