# Requirements: TenantFlow v1.6 — SEO & Google Indexing Optimization

**Defined:** 2026-04-08
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.

## v1.6 Requirements

### SEO Utilities

- [ ] **UTIL-01**: Shared `JsonLdScript` component renders type-safe JSON-LD with XSS escaping, replacing all inline `dangerouslySetInnerHTML` boilerplate
- [ ] **UTIL-02**: `createBreadcrumbJsonLd()` generates BreadcrumbList schema from route path with override support for dynamic segments
- [ ] **UTIL-03**: `createArticleJsonLd()` generates Article schema from blog post data with headline, datePublished, author, image, wordCount
- [ ] **UTIL-04**: `createFaqJsonLd()` generates FAQPage schema from question/answer arrays
- [ ] **UTIL-05**: `createProductJsonLd()` generates Product/Offer schema with dynamic `priceValidUntil` dates
- [ ] **UTIL-06**: `createPageMetadata()` factory produces consistent Next.js Metadata with canonical URL, OG, and Twitter card from minimal config
- [ ] **UTIL-07**: `getSiteUrl()` exported from `generate-metadata.ts` as single source of truth for base URL
- [ ] **UTIL-08**: Unit tests for all SEO utility functions (breadcrumbs, article, FAQ, product, page metadata)

### Crawlability

- [ ] **CRAWL-01**: Dynamic `robots.ts` route replaces static `public/robots.txt` with `MetadataRoute.Robots` type and corrected disallow rules
- [ ] **CRAWL-02**: Stale `public/sitemap.xml` and `public/sitemap-index.xml` deleted
- [ ] **CRAWL-03**: Stale `public/robots.txt` deleted after dynamic route is in place
- [ ] **CRAWL-04**: robots.txt fixes invalid `*.json$` pattern, removes non-standard `Request-rate`/`Crawl-delay`, adds `/dashboard/` disallow
- [ ] **CRAWL-05**: Sitemap enhanced with missing pages: `/support`, `/security-policy`, blog category pages
- [ ] **CRAWL-06**: Sitemap uses actual `published_at` timestamps for blog posts instead of `currentDate` for all entries

### Per-Page Metadata

- [ ] **META-01**: `/pricing` has `generateMetadata()` with title, description, canonical URL, OG tags
- [ ] **META-02**: `/faq` has metadata export with title, description, canonical URL
- [ ] **META-03**: `/about` has metadata export with title, description, canonical URL
- [ ] **META-04**: `/contact` has metadata export with title, description, canonical URL
- [ ] **META-05**: `/resources` has metadata export with title, description, canonical URL
- [ ] **META-06**: `/help` has metadata export with title, description, canonical URL
- [ ] **META-07**: `/features` split into server wrapper + client content to export metadata
- [ ] **META-08**: `/blog` hub split into server wrapper + client content to export metadata
- [ ] **META-09**: `/blog/category/[category]` split into server wrapper + client content to export `generateMetadata()`
- [ ] **META-10**: Homepage (`/`) has explicit metadata with title, description, canonical URL
- [ ] **META-11**: All public pages have `alternates.canonical` pointing to their canonical URL
- [ ] **META-12**: Paginated blog pages beyond page 1 have `noindex, follow` robots directive

### Structured Data

- [ ] **SCHEMA-01**: BreadcrumbList JSON-LD on all public pages that lack it (blog posts, blog hub, blog categories, resource detail pages, homepage, help, support, legal pages)
- [ ] **SCHEMA-02**: Article JSON-LD on blog posts with `mainEntityOfPage`, `image`, `wordCount`, `keywords`, `publisher.logo`, Person author
- [ ] **SCHEMA-03**: Homepage has WebSite schema with `SearchAction` for sitelinks search box
- [ ] **SCHEMA-04**: Pricing page `priceValidUntil` updated from stale `2025-12-31` to dynamic date
- [ ] **SCHEMA-05**: Existing inline JSON-LD on FAQ, pricing, about, contact, features, resources, compare pages refactored to use shared utilities
- [ ] **SCHEMA-06**: HowTo schema on seasonal maintenance checklist resource page
- [ ] **SCHEMA-07**: Comparison pages have paired SoftwareApplication schemas (TenantFlow + competitor)
- [ ] **SCHEMA-08**: Blog posts include `readingTime` and `wordCount` in Article schema

### Pricing Page

- [ ] **PRICE-01**: `&apos;` HTML entities in FAQ answers replaced with proper apostrophes
- [ ] **PRICE-02**: Hardcoded social proof numbers centralized to `SOCIAL_PROOF` config
- [ ] **PRICE-03**: `pricing/success/page.tsx` and `pricing/cancel/page.tsx` have `noindex` metadata and use `PageLayout`
- [ ] **PRICE-04**: `pricing/complete/page.tsx` legacy Tailwind v3 syntax replaced with v4 design tokens
- [ ] **PRICE-05**: Comparison table has responsive mobile layout

### Validation & Verification

- [ ] **VALID-01**: Google Search Console verification meta tag added to root layout via `metadata.verification.google`
- [ ] **VALID-02**: E2E SEO smoke tests verify meta tags and JSON-LD presence on key public pages
- [ ] **VALID-03**: All existing unit tests pass, typecheck clean, lint clean

### Content SEO

- [ ] **CONTENT-01**: Blog posts link to related comparison pages when mentioning competitors
- [ ] **CONTENT-02**: Comparison pages link to related blog posts
- [ ] **CONTENT-03**: Resource pages link to related blog posts and vice versa

## Future Requirements

### Deferred to v1.7+

- **OG-01**: Per-content-type OG images (blog-og.jpg, compare-og.jpg) instead of generic screenshot
- **OG-02**: Dynamic OG image generation via Satori/Vercel OG
- **CONTENT-04**: Named author pages at `/blog/authors/[author]`
- **CONTENT-05**: Content cluster hub page at `/education/` or `/guides/`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Programmatic city/state landing pages | Google helpful content updates penalize thin programmatic content |
| AMP pages | Google no longer gives ranking preference to AMP |
| AI-generated meta descriptions | Generic, hurt CTR; write unique per page |
| Schema on authenticated app pages | Behind auth, blocked in robots.txt |
| `next-seo` or `next-sitemap` packages | Redundant with native Next.js 16 Metadata API |
| Multiple hreflang tags | US-only product, single `en-US` alternate is correct |
| Sitemap splitting into category sitemaps | 25-35 URLs far below 50K limit; premature complexity |
| `@googleapis/searchconsole` SDK | Use GSC web UI manually |
| Lighthouse CI integration | Overkill for ~20 public pages; manual DevTools audits suffice |
| Link building / outreach automation | Off-topic for this milestone |
| Self-served Review schema on marketing pages | Google restricted; reviews must come from third-party platforms |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UTIL-01 | Phase 33 | Pending |
| UTIL-02 | Phase 33 | Pending |
| UTIL-03 | Phase 33 | Pending |
| UTIL-04 | Phase 33 | Pending |
| UTIL-05 | Phase 33 | Pending |
| UTIL-06 | Phase 33 | Pending |
| UTIL-07 | Phase 33 | Pending |
| UTIL-08 | Phase 33 | Pending |
| CRAWL-01 | Phase 32 | Pending |
| CRAWL-02 | Phase 32 | Pending |
| CRAWL-03 | Phase 32 | Pending |
| CRAWL-04 | Phase 32 | Pending |
| CRAWL-05 | Phase 38 | Pending |
| CRAWL-06 | Phase 38 | Pending |
| META-01 | Phase 34 | Pending |
| META-02 | Phase 34 | Pending |
| META-03 | Phase 34 | Pending |
| META-04 | Phase 34 | Pending |
| META-05 | Phase 34 | Pending |
| META-06 | Phase 34 | Pending |
| META-07 | Phase 34 | Pending |
| META-08 | Phase 34 | Pending |
| META-09 | Phase 34 | Pending |
| META-10 | Phase 34 | Pending |
| META-11 | Phase 34 | Pending |
| META-12 | Phase 34 | Pending |
| SCHEMA-01 | Phase 35 | Pending |
| SCHEMA-02 | Phase 35 | Pending |
| SCHEMA-03 | Phase 35 | Pending |
| SCHEMA-04 | Phase 36 | Pending |
| SCHEMA-05 | Phase 35 | Pending |
| SCHEMA-06 | Phase 35 | Pending |
| SCHEMA-07 | Phase 35 | Pending |
| SCHEMA-08 | Phase 35 | Pending |
| PRICE-01 | Phase 36 | Pending |
| PRICE-02 | Phase 36 | Pending |
| PRICE-03 | Phase 36 | Pending |
| PRICE-04 | Phase 36 | Pending |
| PRICE-05 | Phase 36 | Pending |
| VALID-01 | Phase 38 | Pending |
| VALID-02 | Phase 38 | Pending |
| VALID-03 | Phase 38 | Pending |
| CONTENT-01 | Phase 37 | Pending |
| CONTENT-02 | Phase 37 | Pending |
| CONTENT-03 | Phase 37 | Pending |

**Coverage:**
- v1.6 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation (all requirements mapped to phases)*
