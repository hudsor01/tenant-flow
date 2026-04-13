# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

<details>
<summary>v1.0 Production Hardening -- Phases 1-10 (shipped 2026-03-07)</summary>

- [x] Phase 1: RPC & Database Security (2/2 plans) -- completed 2026-03-04
- [x] Phase 2: Financial Fixes (7/7 plans) -- completed 2026-03-05
- [x] Phase 3: Auth & Middleware (6/6 plans) -- completed 2026-03-05
- [x] Phase 4: Edge Function Hardening (4/4 plans) -- completed 2026-03-05
- [x] Phase 5: Code Quality & Type Safety (10/10 plans) -- completed 2026-03-06
- [x] Phase 6: Database Schema & Migrations (7/7 plans) -- completed 2026-03-06
- [x] Phase 7: UX & Accessibility (6/6 plans) -- completed 2026-03-06
- [x] Phase 8: Performance Optimization (7/7 plans) -- completed 2026-03-06
- [x] Phase 9: Testing & CI Pipeline (9/9 plans) -- completed 2026-03-06
- [x] Phase 10: Audit Cleanup (2/2 plans) -- completed 2026-03-07

[archive](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>v1.1 Blog Redesign & CI -- Phases 11-15 (shipped 2026-03-08)</summary>

- [x] Phase 11: Blog Data Layer (2/2 plans) -- completed 2026-03-07
- [x] Phase 12: Blog Components & CSS (2/2 plans) -- completed 2026-03-07
- [x] Phase 13: Newsletter Backend (1/1 plans) -- completed 2026-03-07
- [x] Phase 14: Blog Pages (2/2 plans) -- completed 2026-03-08
- [x] Phase 15: CI Optimization (1/1 plans) -- completed 2026-03-08

[archive](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>v1.2 Production Polish & Code Consolidation -- Phases 16-20 (shipped 2026-03-11)</summary>

- [x] Phase 16: Shared Cleanup & Dead Code (3/3 plans) -- completed 2026-03-08
- [x] Phase 17: Hooks Consolidation (6/6 plans) -- completed 2026-03-08
- [x] Phase 18: Components Consolidation (6/6 plans) -- completed 2026-03-09
- [x] Phase 19: UI Polish (3/3 plans) -- completed 2026-03-09
- [x] Phase 20: Browser Audit (6/6 plans) -- completed 2026-03-09

[archive](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>v1.3 Stub Elimination -- Phases 21-25 (shipped 2026-03-18)</summary>

- [x] Phase 21: Email Invitations (2/2 plans) -- completed 2026-03-11
- [x] Phase 22: GDPR Data Rights (2/2 plans) -- completed 2026-03-11
- [x] Phase 23: Document Templates (2/2 plans) -- completed 2026-03-11
- [x] Phase 23.1: UI/UX Polish (2/2 plans) -- completed 2026-03-18
- [x] Phase 24: Bulk Property Import (2/2 plans) -- completed 2026-03-18
- [x] Phase 25: Maintenance Photos & Stripe Dashboard (2/2 plans) -- completed 2026-03-18

[archive](milestones/v1.3-ROADMAP.md)

</details>

<details>
<summary>v1.5 Code Quality & Deduplication -- Phases 29-31 (shipped 2026-04-08)</summary>

- [x] Phase 29: Edge Function Shared Utilities (3/3 plans) -- completed 2026-04-03
- [x] Phase 30: Frontend Import & Validation Cleanup (2/2 plans) -- completed 2026-04-03
- [x] Phase 31: Frontend Hook Factories (2/2 plans) -- completed 2026-04-08

</details>

## Phases

### v1.6 SEO & Google Indexing Optimization (Phases 32-40)

- [x] **Phase 32: Crawlability & Critical Fixes** - Fix robots.txt blocking Googlebot rendering, delete stale static files, remove spam-risk AggregateRating
- [x] **Phase 33: SEO Utilities Foundation** - Build shared JSON-LD components and metadata factories that all subsequent phases consume (completed 2026-04-08)
- [x] **Phase 34: Per-Page Metadata** - Add generateMetadata() to all public pages with canonical URLs, OG tags, and server wrappers for client pages (completed 2026-04-08)
- [x] **Phase 35: Structured Data Enrichment** - Add missing schemas and refactor existing inline JSON-LD to use shared utilities (completed 2026-04-09)
- [x] **Phase 36: Pricing Page Polish** - Fix pricing page technical debt (HTML entities, legacy Tailwind, mobile layout, dynamic dates) (completed 2026-04-10)
- [x] **Phase 37: Content SEO & Internal Linking** - Cross-link blog, comparison, and resource pages for topical authority (completed 2026-04-10)
- [x] **Phase 38: Validation & Verification** - GSC verification, E2E SEO smoke tests, sitemap enhancements, full regression pass (completed 2026-04-10)
- [x] **Phase 39: Structured Data Gap Closure** - Wire orphaned SoftwareApplication factory, add HowTo + BreadcrumbList to checklist page, remove stale inline BlogPosting (completed 2026-04-13)
- [x] **Phase 40: Metadata & Verification Completeness** - Migrate 7 remaining pages (legal, support, resource guides) to createPageMetadata(), close BreadcrumbList gap on 2 resource pages (VALID-01 already satisfied via DNS per Phase 38 D-01)

## Phase Details

### Phase 32: Crawlability & Critical Fixes
**Goal**: Googlebot can render every public page and no structured data risks a manual action
**Depends on**: Nothing (first phase -- highest priority)
**Requirements**: CRAWL-01, CRAWL-02, CRAWL-03, CRAWL-04
**Success Criteria** (what must be TRUE):
  1. No file in `public/` named `robots.txt`, `sitemap.xml`, or `sitemap-index.xml`
  2. `src/app/robots.ts` exists and exports a `MetadataRoute.Robots` with `/_next/static/` and `/_next/image/` allowed, `/_next/data/` and `/dashboard/` disallowed, and no invalid patterns like `*.json$` or non-standard directives like `Request-rate`/`Crawl-delay`
  3. No `aggregateRating` property exists anywhere in `generate-metadata.ts` Organization schema
  4. Running `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** 1 plan
Plans:
- [x] 32-01-PLAN.md -- Dynamic robots.ts, delete stale static files, remove fabricated aggregateRating -- completed 2026-04-08

### Phase 33: SEO Utilities Foundation
**Goal**: All JSON-LD and metadata generation uses tested, type-safe shared utilities instead of per-page inline boilerplate
**Depends on**: Phase 32
**Requirements**: UTIL-01, UTIL-02, UTIL-03, UTIL-04, UTIL-05, UTIL-06, UTIL-07, UTIL-08
**Success Criteria** (what must be TRUE):
  1. `src/components/seo/json-ld-script.tsx` renders a `<script type="application/ld+json">` tag with XSS-escaped content and accepts any `schema-dts` type
  2. `src/lib/seo/` contains `breadcrumbs.ts`, `article-schema.ts`, `faq-schema.ts`, `product-schema.ts`, and `page-metadata.ts` exporting their respective factory functions
  3. `getSiteUrl()` is exported from `src/lib/seo/` (or `generate-metadata.ts`) and is the single source of truth for base URL -- no other file constructs the site URL from `process.env` directly
  4. `schema-dts` is listed in `devDependencies` in `package.json`
  5. Unit tests exist for every utility function in `src/lib/seo/` and the `JsonLdScript` component, all passing
**Plans:** 2/2 plans complete
Plans:
- [x] 33-01-PLAN.md -- JsonLdScript component, breadcrumb factory, page-metadata factory, schema-dts install
- [x] 33-02-PLAN.md -- Article, FAQ, and product JSON-LD schema factories

### Phase 34: Per-Page Metadata
**Goal**: Every public page has unique, crawlable metadata with correct canonical URLs and OG tags
**Depends on**: Phase 33
**Requirements**: META-01, META-02, META-03, META-04, META-05, META-06, META-07, META-08, META-09, META-10, META-11, META-12
**Success Criteria** (what must be TRUE):
  1. Every `page.tsx` under `src/app/(public)/` (or equivalent public route group) exports `metadata` or `generateMetadata()` with a unique title and description
  2. `/features`, `/blog`, and `/blog/category/[category]` each have a server-component `page.tsx` that exports metadata and renders a separate `*-client.tsx` client component
  3. All public pages include `alternates.canonical` pointing to their own canonical URL (not inheriting the homepage canonical)
  4. Paginated blog listing pages beyond page 1 include `robots: { index: false, follow: true }` in their metadata
  5. Running `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** 2 plans
Plans:
- [x] 34-01-PLAN.md -- Static metadata + inline JSON-LD migration for 7 server-component pages -- completed 2026-04-08
- [x] 34-02-PLAN.md -- Server/client splits for features, blog, blog/category with generateMetadata and pagination noindex -- completed 2026-04-08

### Phase 35: Structured Data Enrichment
**Goal**: Google Rich Results Test shows valid schemas for every public page type (breadcrumbs, articles, FAQ, HowTo, comparisons)
**Depends on**: Phase 33, Phase 34
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08
**Success Criteria** (what must be TRUE):
  1. Every public page renders at least a `BreadcrumbList` JSON-LD script tag in its HTML source
  2. Blog post pages render an `Article` JSON-LD with `mainEntityOfPage`, `image`, `wordCount`, `keywords`, and a `Person` author (not just organization)
  3. Homepage renders a `WebSite` JSON-LD with `SearchAction` (potentialAction with `query-input`)
  4. All previously inline JSON-LD blocks on FAQ, pricing, about, contact, features, resources, and compare pages are replaced with `JsonLdScript` component calls using shared utility functions
  5. Running `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** 3 plans
Plans:
- [x] 35-01-PLAN.md -- Blog post Article schema + breadcrumbs for blog hub, category, help, support, legal, and resource pages -- completed 2026-04-09
- [x] 35-02-PLAN.md -- Homepage WebSite schema, compare page SoftwareApplication factory + migration, HowTo on maintenance checklist -- completed 2026-04-09
- [x] 35-03-PLAN.md -- Gap closure: fix blog test imports broken by async server component conversion -- completed 2026-04-09

### Phase 36: Pricing Page Polish
**Goal**: Pricing page has zero technical debt, correct structured data dates, and works well on mobile
**Depends on**: Phase 33
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05, SCHEMA-04
**Success Criteria** (what must be TRUE):
  1. No `&apos;` HTML entity appears in any pricing page source file -- all replaced with literal apostrophes or proper Unicode
  2. A single `SOCIAL_PROOF` config object is the source of truth for all social proof numbers on pricing pages -- no hardcoded `"10,000+"` or `"4.8"` scattered in JSX
  3. `pricing/success/page.tsx` and `pricing/cancel/page.tsx` export `noindex` metadata and render inside `PageLayout`
  4. `pricing/complete/page.tsx` contains no Tailwind v3 syntax (`bg-gray-50`, `text-gray-600`, etc.) -- all converted to v4 design tokens (`bg-muted`, `text-muted-foreground`, etc.)
  5. Pricing JSON-LD `priceValidUntil` is computed dynamically (not hardcoded to any specific date)
**Plans:** 4/4 plans complete
Plans:
- [x] 36-01-PLAN.md -- HTML entity cleanup and SOCIAL_PROOF config centralization
- [x] 36-02-PLAN.md -- Success/cancel page restructure with noindex and PageLayout
- [x] 36-03-PLAN.md -- Tailwind v3 to v4 migration on pricing/complete
- [x] 36-04-PLAN.md -- Responsive mobile layout for pricing comparison table

### Phase 37: Content SEO & Internal Linking
**Goal**: Blog, comparison, and resource pages cross-link to each other, building topical authority clusters
**Depends on**: Phase 34, Phase 35
**Requirements**: CONTENT-01, CONTENT-02, CONTENT-03
**Success Criteria** (what must be TRUE):
  1. Blog posts that mention a competitor by name include a link to the corresponding `/compare/[competitor]` page
  2. Comparison pages include a "Related Articles" section linking to relevant blog posts
  3. Resource pages link to related blog posts and blog posts link back to related resource pages
**Plans:** 2/2 plans complete
Plans:
- [x] 37-01-PLAN.md -- Content-links mapping config + RelatedArticles server component with tests
- [x] 37-02-PLAN.md -- Wire cross-links into blog, compare, and resource pages

### Phase 38: Validation & Verification
**Goal**: All SEO work is verified end-to-end and the site is ready for Google Search Console monitoring
**Depends on**: Phase 32, Phase 33, Phase 34, Phase 35, Phase 36, Phase 37
**Requirements**: VALID-01, VALID-02, VALID-03, CRAWL-05, CRAWL-06
**Success Criteria** (what must be TRUE):
  1. Root layout `metadata.verification.google` contains a verification string (placeholder acceptable until real GSC code is obtained)
  2. E2E tests exist that visit key public pages and assert presence of `<title>`, `<meta name="description">`, and `<script type="application/ld+json">` tags
  3. Sitemap includes `/support`, `/security-policy`, and all blog category pages
  4. Blog post entries in the sitemap use their `published_at` timestamp for `lastModified` instead of the generation timestamp
  5. Running `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** 2/2 plans complete
Plans:
- [x] 38-01-PLAN.md -- Sitemap overhaul with missing pages, blog categories, static dates
- [x] 38-02-PLAN.md -- E2E SEO smoke tests for all public pages + full regression pass

### Phase 39: Structured Data Gap Closure
**Goal**: All orphaned/missing JSON-LD schemas are wired into their target pages and stale inline blocks are removed
**Depends on**: Phase 33, Phase 35
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-05, SCHEMA-06, SCHEMA-07
**Gap Closure**: Closes gaps from v1.6 milestone audit
**Success Criteria** (what must be TRUE):
  1. `src/app/compare/[competitor]/page.tsx` imports and renders `createSoftwareApplicationJsonLd` for both TenantFlow and competitor, plus `createBreadcrumbJsonLd` via `JsonLdScript` -- no inline `comparisonSchema` or direct `process.env` reads
  2. `src/app/resources/seasonal-maintenance-checklist/page.tsx` renders HowTo JSON-LD with 4 `HowToSection` steps (Spring/Summer/Fall/Winter) and a BreadcrumbList, both via `JsonLdScript`
  3. `src/app/blog/[slug]/blog-post-page.tsx` contains zero `<script type="application/ld+json">` inline blocks -- only the server component `page.tsx` renders Article JSON-LD
  4. Running `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** 2/2 plans complete
Plans:
- [x] 39-01-PLAN.md -- Add HowTo + BreadcrumbList to maintenance checklist, replace inline comparisonSchema with factory calls
- [x] 39-02-PLAN.md -- Remove stale inline BlogPosting from blog-post-page.tsx

### Phase 40: Metadata & Verification Completeness
**Goal**: Every public page has canonical URLs, Open Graph tags, Twitter card, and BreadcrumbList JSON-LD via shared factories -- the full public SEO surface is consistent
**Depends on**: Phase 33
**Requirements**: META-11, VALID-01, SCHEMA-01
**Gap Closure**: Closes gaps from v1.6 milestone audit (scope expanded from 4 to 7 pages per factual codebase scan)
**Success Criteria** (what must be TRUE):
  1. `/terms`, `/privacy`, `/security-policy`, `/support`, `/resources/seasonal-maintenance-checklist`, `/resources/security-deposit-reference-card`, and `/resources/landlord-tax-deduction-tracker` page.tsx files use `createPageMetadata()` with canonical, OG, and Twitter card -- no raw `metadata` objects without `alternates.canonical`
  2. VALID-01 satisfied via DNS verification (Phase 38 D-01 lock) -- no `verification.google` meta tag added to `src/app/layout.tsx`
  3. `/resources/security-deposit-reference-card` and `/resources/landlord-tax-deduction-tracker` render BreadcrumbList JSON-LD via shared factory (closes SCHEMA-01 on full public surface)
  4. No page title contains inline `| TenantFlow` suffix -- root `title.template` handles brand (Pitfall 1 avoided)
  5. E2E SEO smoke spec passes for all 7 Phase 40 paths (canonical, breadcrumb, double-suffix regression)
  6. Running `pnpm typecheck && pnpm lint && pnpm test:unit` passes with zero errors
**Plans:** 3/3 plans complete
Plans:
- [x] 40-01-PLAN.md -- Strengthen E2E SEO smoke spec with breadcrumb + double-suffix assertions (Wave 0)
- [x] 40-02-PLAN.md -- Migrate 4 legal/support pages to createPageMetadata factory (Template A, Wave 1)
- [x] 40-03-PLAN.md -- Migrate 3 resource pages + close BreadcrumbList gap + update ROADMAP (Templates B/C, Wave 1)

## Progress

**Execution Order:**
Phases execute in numeric order: 32 -> 33 -> 34 -> 35 -> 36 -> 37 -> 38 -> 39 -> 40

Phase 39 and 40 are independent gap closure phases that can execute in either order.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 32. Crawlability & Critical Fixes | v1.6 | 1/1 | Complete | 2026-04-08 |
| 33. SEO Utilities Foundation | v1.6 | 2/2 | Complete | 2026-04-08 |
| 34. Per-Page Metadata | v1.6 | 2/2 | Complete | 2026-04-08 |
| 35. Structured Data Enrichment | v1.6 | 3/3 | Complete | 2026-04-09 |
| 36. Pricing Page Polish | v1.6 | 4/4 | Complete | 2026-04-10 |
| 37. Content SEO & Internal Linking | v1.6 | 2/2 | Complete | 2026-04-10 |
| 38. Validation & Verification | v1.6 | 2/2 | Complete | 2026-04-10 |
| 39. Structured Data Gap Closure | v1.6 | 2/2 | Complete    | 2026-04-13 |
| 40. Metadata & Verification Completeness | v1.6 | 3/3 | Complete | 2026-04-13 |
