# Feature Landscape: SEO & Google Indexing Optimization

**Domain:** Property management SaaS -- organic search visibility and structured data
**Researched:** 2026-04-08
**Mode:** Ecosystem research (SEO features focus)

## Existing SEO Audit

TenantFlow already has a meaningful SEO foundation. This audit identifies what exists, what is missing, and what needs enrichment.

### What Already Exists (Do Not Rebuild)

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Global JSON-LD (Organization + SoftwareApplication) | `src/lib/generate-metadata.ts` -> `src/components/seo/seo-json-ld.tsx` | Working | Injected in `layout.tsx` `<head>` |
| BlogPosting JSON-LD | `src/app/blog/[slug]/blog-post-page.tsx` | Working | Per-post with headline, datePublished, dateModified, author |
| FAQPage JSON-LD | `src/app/faq/page.tsx`, `src/app/pricing/page.tsx` | Working | Flattens all questions. Note: Google restricted FAQ rich results to gov/health sites in Aug 2023 -- still useful for AI entity understanding |
| BreadcrumbList JSON-LD | FAQ, pricing, about, contact, features, resources, compare pages | Working | 7 pages have breadcrumbs |
| Product/Offer JSON-LD | `src/app/pricing/page.tsx` | Working | 3 tier offers with aggregateRating |
| WebPage + BreadcrumbList JSON-LD | `src/app/compare/[competitor]/page.tsx` | Working | Per-competitor with breadcrumb |
| generateMetadata() | Blog posts, compare pages, layout.tsx | Working | Dynamic OG + Twitter cards |
| Static metadata exports | Resource pages, legal pages, support, owner/tenant layouts | Working | Title + description |
| Sitemap with ISR | `src/app/sitemap.ts` | Working | 24h revalidation, dynamic blog posts, 5s DB timeout |
| robots.txt | `public/robots.txt` | Working | Blocks app routes, allows social crawlers, blocks SEO bots |
| ISR on blog pages | `src/app/blog/[slug]/page.tsx` | Working | 1h revalidation |
| Canonical URLs | Blog posts, compare pages, global default | Working | Via `alternates.canonical` |

### What Is Missing or Incomplete

| Gap | Impact | Where |
|-----|--------|-------|
| No BreadcrumbList on blog posts | Blog posts are the highest-traffic SEO content -- missing breadcrumb schema hurts navigation signals | `blog/[slug]` |
| No BreadcrumbList on blog hub or category pages | Category pages and blog hub lack structured navigation | `blog/`, `blog/category/[slug]` |
| No BreadcrumbList on resource detail pages | Resource pages have high SEO intent but no breadcrumb schema | `resources/[slug]` |
| No BreadcrumbList on homepage | Homepage should have WebSite schema, not just Organization | `page.tsx` / `marketing-home.tsx` |
| Blog Article schema missing `mainEntityOfPage`, `image`, `wordCount` | Incomplete Article structured data reduces rich result eligibility | `blog/[slug]/blog-post-page.tsx` |
| No HowTo schema on resource pages | Seasonal maintenance checklist is a step-by-step guide -- perfect HowTo candidate | `resources/seasonal-maintenance-checklist` |
| Sitemap is monolithic | Single sitemap.xml for all pages. Google recommends split by content type for crawl efficiency | `src/app/sitemap.ts` |
| No sitemap for blog categories | Category archive pages are not in the sitemap | sitemap.ts |
| Missing pages from sitemap | `/help`, `/support`, `/security-policy`, `/search` not included | sitemap.ts |
| No `generateMetadata()` on public pages | Blog hub, blog category, features, about, contact, FAQ, help, homepage lack page-specific dynamic metadata | Multiple pages |
| `priceValidUntil` is stale | Pricing schema has `2025-12-31` -- expired dates hurt trust signals | `pricing/page.tsx` |
| robots.txt blocks `*.json$` | This pattern uses regex-like syntax that robots.txt does not support (robots.txt uses path prefix matching, not regex). Crawlers may misinterpret it | `public/robots.txt` |
| No `Disallow: /dashboard/` in robots.txt | Owner app routes under `/dashboard/` are not explicitly blocked | `public/robots.txt` |
| No structured data on homepage | Homepage has zero JSON-LD despite being the highest-authority page | `marketing-home.tsx` |
| Comparison pages lack ComparisonTable-style structured data | While WebPage schema exists, no product comparison markup enhances the feature tables | `compare/[competitor]` |
| Internal linking between content types is ad hoc | Blog posts link to resources via manual `LEAD_MAGNETS` map, but no systematic cross-linking between blog, resources, comparisons | Multiple |

---

## Table Stakes

Features users (and Google) expect. Missing these means lost organic visibility compared to Buildium, TurboTenant, AppFolio, and Hemlane.

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|-------------|------------|------------|-------|
| **BreadcrumbList on ALL public pages** | Google shows breadcrumbs in SERPs. Every competitor has them. BreadcrumbList is the highest-ROI schema type for content sites -- replaces raw URLs with readable paths, increases CTR | Low | Existing breadcrumb pattern (7 pages have it) | Add to: blog hub, blog categories, blog posts, resource detail pages, homepage, help, support, search, legal pages |
| **Complete Article schema on blog posts** | Blog is the primary SEO traffic driver. Article schema with `mainEntityOfPage`, `image`, `wordCount`, `keywords`, `publisher.logo` enables enhanced search features. Competitors all have this | Low | Existing BlogPosting schema in `blog-post-page.tsx` | Enrich existing schema, do not replace. Add `image.url`, `image.width`, `image.height`, `wordCount`, `mainEntityOfPage` |
| **generateMetadata() on all public pages** | Pages without explicit titles/descriptions inherit the generic default. Google uses page-specific title/description for SERP display. Missing = generic snippets that do not match search intent | Med | None -- each page is independent | Blog hub, blog categories, features, about, contact, FAQ, help, homepage, support, search, legal pages. Approximately 12 pages need per-page metadata |
| **Sitemap completeness** | Every public page must be in the sitemap. Missing pages = Google may not discover them. Blog categories and several static pages are absent | Low | Existing sitemap.ts structure | Add blog category pages, help, support, security-policy, search. Also add `lastModified` from actual DB data where possible |
| **Fix stale pricing schema date** | `priceValidUntil: '2025-12-31'` is expired. Google may mark offers as outdated. Generates warnings in Rich Results Test | Trivial | None | Change to dynamic date (e.g., end of current year + 1) |
| **robots.txt corrections** | Fix `*.json$` regex pattern (invalid in robots.txt). Add `/dashboard/` disallow. Consider adding `/monitoring/` (Sentry tunnel) | Low | None | Also remove `Request-rate` directive (non-standard, ignored by Google) |
| **Homepage structured data** | Homepage is the highest-authority page. Needs WebSite schema (enables sitelinks search box) and the existing Organization schema should be explicitly tied to homepage, not just global | Low | None | Add `WebSite` schema with `potentialAction` SearchAction for sitelinks searchbox |
| **Canonical URLs on ALL public pages** | Several pages rely on the global default canonical (site root). Each page needs its own canonical to prevent duplicate content issues, especially with query parameters (`?page=2` on blog) | Low | Existing `alternates.canonical` pattern | Blog hub, category pages with pagination are highest priority |

**Confidence:** HIGH -- based on Google Search Central documentation for structured data types, competitor analysis, and codebase audit.

---

## Differentiators

Features that push TenantFlow ahead of competitors in organic search. Not expected, but measurably improve rankings or CTR.

| Feature | Value Proposition | Complexity | Depends On | Notes |
|---------|-------------------|------------|------------|-------|
| **Sitemap index with content-type splits** | Split monolithic sitemap into `sitemap-marketing.xml`, `sitemap-blog.xml`, `sitemap-resources.xml`, `sitemap-compare.xml`. Google crawls category sitemaps more efficiently (30-40% crawl improvement reported). Competitors with large content libraries all use split sitemaps | Med | Next.js `generateSitemaps()` or custom route handler. Existing sitemap.ts refactored | Next.js supports `generateSitemaps()` returning `[{id: 'marketing'}, {id: 'blog'}, ...]`. Each generates separate XML |
| **HowTo schema on resource pages** | The seasonal maintenance checklist is literally a how-to guide with steps. HowTo schema was demoted for mobile rich results in Aug 2023 but still parsed by AI search and desktop rich results. Competitors do not use this schema on their resource pages | Med | Resource page content is already step-structured | Note: Google March 2026 core update restricted HowTo rich results on non-primary content pages. Only apply where content is genuinely instructional |
| **Content cluster internal linking** | Systematic cross-linking between blog posts, comparison pages, and resource pages using a hub-and-spoke model. TurboTenant employs this strategy with `/education/` as a hub linking to `/property-management/`, `/blog/`, and resource subpages. Creates topical authority signals | Med | Blog, comparison, and resource pages already exist. Need a linking data structure | Define cluster topics (rent collection, maintenance, leases, tenant screening) with pillar pages and spoke content |
| **Blog author schema with Person type** | Upgrade from Organization-as-author to named Person entities (even if "TenantFlow Editorial Team"). Google prioritizes E-E-A-T signals, and named authors increase trust scores for YMYL-adjacent content (property management involves financial topics) | Low | Blog post schema already has author field | Can be a static Person entity per blog post author. Does not require a full author management system |
| **WebSite schema with SearchAction** | Enables Google sitelinks search box in branded SERPs. When someone searches "TenantFlow", Google shows a search box directly in the result. Requires `WebSite` schema with `potentialAction` SearchAction pointing to `/search` | Low | Existing `/search` page | One-time addition to homepage structured data |
| **Comparison page SoftwareApplication pairs** | Add SoftwareApplication schema for both TenantFlow AND the competitor on comparison pages. Enables Google to understand the comparison context. Most competitors do not mark up the compared products | Med | Comparison page data already has feature/pricing arrays | Create paired SoftwareApplication schemas with itemReviewed references |
| **Blog reading time and word count in metadata** | Expose `readingTime` and `wordCount` in Article schema. Google uses `timeRequired` for display. `wordCount` is a content-quality signal. Already have `reading_time` in the blog data model | Low | Blog post already has `reading_time` field | Just needs to be added to the Article schema alongside `wordCount` (computed from content length) |
| **Google Search Console verification meta tag** | Add verification tag in layout.tsx metadata for GSC. Once verified, submit sitemap, monitor index coverage, review search performance, identify crawl errors | Low | Vercel DNS or meta tag verification | Use `metadata.verification.google` in Next.js metadata API. Trivial addition, enormous observability gain |
| **Open Graph images per content type** | Generate or set specific OG images for blog categories, resource pages, and comparison pages instead of using the generic dashboard screenshot. Different OG images per page type improve social sharing CTR | Med | Existing OG image infrastructure | Can start with static per-type images (e.g., blog-og.jpg, compare-og.jpg) before considering dynamic generation |
| **noindex on paginated pages beyond page 1** | Blog pagination pages (?page=2, ?page=3) create thin content duplicates. Add `noindex, follow` to pages beyond the first while keeping internal links crawlable. Prevents index bloat | Low | Blog and category pagination already exists | Add via `robots` metadata on paginated pages. Keep `follow` so links are still discovered |

**Confidence:** MEDIUM -- based on SEO best practice sources, competitor analysis, and Google Search Central documentation. Effectiveness of individual features depends on domain authority and content quality.

---

## Anti-Features

Features to explicitly NOT build. Over-optimization or wasted effort.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Dynamic OG image generation (Satori/Vercel OG)** | High complexity for marginal SEO benefit. Requires edge runtime, font loading, image generation pipeline. OG images affect social sharing CTR, not Google rankings directly | Use 3-4 static OG image templates per content type (marketing, blog, compare, resource). Update quarterly |
| **Programmatic SEO pages (city/state landing pages)** | Generating `/property-management-software-in-austin` pages is a classic SEO tactic but Google's March 2025+ helpful content updates heavily penalize thin programmatic content. TenantFlow is not a local service | Focus on content-driven organic growth via blog and comparison pages. These are the actual high-intent keywords |
| **Review/testimonial schema on marketing pages** | Google restricted self-served Review schema. Reviews must come from third-party platforms (G2, Capterra) to be eligible for rich results. Self-published testimonials on your own site will not trigger review stars in SERPs | Link to actual G2/Capterra profiles. Use `aggregateRating` only on SoftwareApplication schema (which is already done) |
| **AMP pages** | Google no longer gives ranking preference to AMP. It adds build complexity and limits interactivity. No property management SaaS uses AMP | Standard Next.js server-rendered pages with good Core Web Vitals are sufficient |
| **Automated meta description generation (AI)** | AI-generated meta descriptions sound generic and hurt CTR. Google frequently overrides poor meta descriptions with page content anyway | Write unique meta descriptions per page. For blog posts, use `meta_description` or `excerpt` (already in the data model) |
| **Schema markup on authenticated app pages** | Dashboard, tenant portal, and owner pages are behind auth and blocked in robots.txt. Adding structured data to them wastes build time and confuses crawlers if they somehow access these pages | Only invest in structured data for public-facing marketing and content pages |
| **JSON-LD via next-seo or schema-dts libraries** | Adding a library dependency for JSON-LD generation adds bundle weight and abstraction layers. The current manual JSON-LD pattern with `dangerouslySetInnerHTML` is the standard Next.js approach and is perfectly fine | Keep the current pattern. Consider a small utility function for common schema fragments (breadcrumb builder, article builder) but no library |
| **Multiple hreflang tags** | TenantFlow is US-only. Adding `hreflang` tags for languages that do not exist creates broken references. The current `en-US` alternate is correct | Keep single `en-US` language alternate |
| **Keyword stuffing in meta tags** | The current `keywords` meta tag in `generate-metadata.ts` lists generic terms. Google has explicitly stated they ignore the `keywords` meta tag. It provides zero SEO value | Remove the `keywords` meta tag entirely or leave it as-is (harmless but useless). Focus on page content quality |
| **Link building / outreach automation** | Automated link building is off-topic for this milestone and risks Google penalties | Organic links from quality content. Comparison pages naturally attract backlinks |

**Confidence:** HIGH -- anti-features identified from Google's explicit documentation on restricted schema types (FAQ, Review, HowTo limitations), helpful content guidelines, and property management SaaS competitive analysis.

---

## Feature Dependencies

```
BreadcrumbList on all pages ──> Create reusable breadcrumb schema builder utility
                             ──> Each page defines its own crumb path
                             ──> No cross-page dependencies

Complete Article schema ──> Existing BlogPosting schema (enrich, don't replace)
                        ──> Blog post data model already has reading_time, featured_image

generateMetadata() on all pages ──> Each page is independent
                                ──> Blog hub/categories need DB queries (use ISR)
                                ──> Homepage can use static metadata

Sitemap split ──> Refactor sitemap.ts into generateSitemaps() pattern
              ──> OR: create route handler for sitemap index
              ──> Blog sitemap needs Supabase query (already done)
              ──> Category sitemap needs category list query

HowTo schema ──> Resource page content is already step-structured
             ──> Parse existing seasonal data into HowTo step format

Content cluster linking ──> Blog, comparison, resource pages all exist
                        ──> Need shared data structure mapping related content
                        ──> Blog posts already have category field for clustering

Homepage WebSite schema ──> /search page already exists
                        ──> Add SearchAction with URL template

Google Search Console ──> Vercel DNS or meta tag (layout.tsx)
                      ──> Sitemap submission (after sitemap improvements)
                      ──> No code dependencies
```

---

## MVP Recommendation

### Phase 1: Foundation (Schema + Metadata Completeness)

Prioritize these first -- they fix gaps and unlock rich result eligibility:

1. **Reusable breadcrumb schema builder** -- utility function that generates BreadcrumbList JSON-LD from a path array. Apply to all 15+ public pages that lack it.
2. **generateMetadata() on all public pages** -- write unique title + description for blog hub, categories, features, about, contact, FAQ, help, homepage, support, search. Approximately 12 pages.
3. **Enrich Article schema on blog posts** -- add `mainEntityOfPage`, `image` (with dimensions), `wordCount`, `keywords`, `publisher.logo`.
4. **Fix stale pricing `priceValidUntil`** -- trivial date fix.
5. **Homepage structured data** -- add `WebSite` schema with `SearchAction`, and ensure Organization schema is explicit on homepage.
6. **Google Search Console verification meta tag** -- add to layout.tsx metadata.

### Phase 2: Technical SEO (Crawlability + Sitemap)

7. **Sitemap completeness** -- add missing pages (categories, help, support, security-policy).
8. **Sitemap split** -- refactor into content-type sitemaps using `generateSitemaps()`.
9. **robots.txt corrections** -- fix `*.json$` pattern, add `/dashboard/`, remove non-standard `Request-rate`.
10. **Canonical URLs on paginated pages** -- blog hub and category pages with `?page=` parameter.
11. **noindex on paginated pages beyond page 1** -- prevent thin content indexing.

### Phase 3: Content SEO (Linking + Enrichment)

12. **Content cluster internal linking** -- define topic clusters, add "Related Resources" and "Related Comparisons" sections to blog posts. Add "Read More" links from comparison pages to relevant blog posts.
13. **Blog author schema upgrade** -- Person type instead of Organization-only.
14. **HowTo schema on resource pages** -- seasonal maintenance checklist as primary candidate.
15. **Comparison page SoftwareApplication pairs** -- enriched structured data on `/compare/*` pages.

### Defer

- **Dynamic OG images**: High effort, low SEO ROI. Use static per-type images.
- **Programmatic city/state pages**: Harmful under current Google guidelines.
- **Open Graph images per content type**: Nice-to-have, defer to post-milestone polish.

---

## Competitor SEO Patterns

### TurboTenant (turbotenant.com)

| Pattern | What They Do | TenantFlow Status |
|---------|-------------|-------------------|
| Content hub architecture | `/education/` hub with `/property-management/`, `/blog/`, `/landlord-tips/` as spokes | Blog + resources exist but no explicit hub/spoke linking |
| Author pages | `/authors/` with named SEO content writers, bios, and article links | No author pages. Blog uses "TenantFlow Team" |
| Pillar content | Long-form guides (95 landlord tips, state-by-state guides) with internal links to software features | Resource pages exist but are isolated |
| Blog volume | High-frequency publishing (2-4 posts/week) covering landlord guides, comparisons, how-tos | Blog exists with categories and pagination |
| Category structure | Multiple category taxonomies: property management, leasing, maintenance, legal | Blog categories exist but no category-level metadata |
| Dedicated SEO team | Senior SEO Manager with 8+ years, team of SEO content writers | N/A (solo developer) |

### Buildium (buildium.com)

| Pattern | What They Do | TenantFlow Status |
|---------|-------------|-------------------|
| Competitor comparison hub | Dedicated comparison pages with feature tables, pricing breakdowns | `/compare/buildium`, `/compare/appfolio`, `/compare/rentredi` exist |
| Blog as lead gen | Blog posts gate content behind email capture (newsletter) | Newsletter signup on blog posts, inline CTAs |
| Resource library | Guides, templates, checklists, webinars organized by topic | 3 resource pages exist |
| Feature page depth | Individual pages per feature with detailed descriptions and screenshots | Single `/features` page |
| Marketing ideas content | Content marketing guides for property managers (meta-SEO content) | Not present |

### AppFolio (appfolio.com)

| Pattern | What They Do | TenantFlow Status |
|---------|-------------|-------------------|
| Enterprise SEO | High domain authority, extensive backlink profile | Lower DA, younger domain |
| Industry report content | Annual industry reports, benchmark studies | Not present (not needed at current scale) |
| Help center as SEO content | Public help articles indexed by Google | Help page exists but is lightweight |
| Video content | YouTube integration, video tutorials | Not present |

**Key insight:** TurboTenant is the closest competitor in market position (targeting small landlords) and their SEO strategy is content-cluster-driven with named authors and high publishing frequency. TenantFlow should match their structural SEO (schema, sitemaps, breadcrumbs) before trying to match their content volume.

---

## Structured Data Schema Map

Which schema types to apply to which pages, with priority:

| Page Type | Schema Types | Priority | Rich Result Eligible? |
|-----------|-------------|----------|----------------------|
| **Homepage** | WebSite (SearchAction), Organization | High | Yes (sitelinks searchbox) |
| **Blog posts** | BlogPosting/Article, BreadcrumbList, Person (author) | High | Yes (article rich results) |
| **Blog hub** | CollectionPage, BreadcrumbList | Med | No (but helps entity understanding) |
| **Blog categories** | CollectionPage, BreadcrumbList | Med | No |
| **FAQ page** | FAQPage, BreadcrumbList | Med | Restricted (gov/health only since Aug 2023) but helps AI search |
| **Pricing page** | Product/Offer, FAQPage, BreadcrumbList | High | Yes (product rich results with price) |
| **Features page** | BreadcrumbList, SoftwareApplication | Med | Limited (SoftwareApplication may show in product queries) |
| **Comparison pages** | SoftwareApplication (paired), BreadcrumbList | Med | Limited |
| **Resource pages** | HowTo (where applicable), BreadcrumbList | Med | Restricted (demoted mobile, still desktop/AI) |
| **About page** | Organization, BreadcrumbList | Low | No |
| **Contact page** | ContactPoint, BreadcrumbList | Low | No |
| **Legal pages** | BreadcrumbList | Low | No |

---

## Sources

### Google Official Documentation
- [Structured Data Markup Google Supports](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) -- complete list of eligible schema types -- HIGH confidence
- [FAQPage Structured Data](https://developers.google.com/search/docs/appearance/structured-data/faqpage) -- restricted to gov/health sites since Aug 2023 -- HIGH confidence
- [Changes to HowTo and FAQ Rich Results (Aug 2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes) -- official announcement of restrictions -- HIGH confidence
- [SoftwareApplication Schema](https://developers.google.com/search/docs/appearance/structured-data/software-app) -- eligible fields, rating display -- HIGH confidence
- [BreadcrumbList Schema](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) -- implementation guide -- HIGH confidence
- [General Structured Data Guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) -- compliance requirements -- HIGH confidence

### Next.js SEO Documentation
- [Next.js generateSitemaps](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps) -- multiple sitemap generation with ID-based splitting -- HIGH confidence
- [Next.js sitemap.xml metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) -- sitemap file convention -- HIGH confidence
- [Sitemap index Discussion #61025](https://github.com/vercel/next.js/discussions/61025) -- community solutions for sitemap index -- MEDIUM confidence

### SEO Strategy and Schema Guides
- [Schema.org for SEO: JSON-LD Examples 2026](https://www.incremys.com/en/resources/blog/schema-seo) -- implementation examples per schema type -- MEDIUM confidence
- [Stop Using FAQ Schema: New Rules 2026](https://greenserp.com/high-impact-schema-seo-guide/) -- post-restriction strategy -- MEDIUM confidence
- [Schema Markup After March 2026](https://www.digitalapplied.com/blog/schema-markup-after-march-2026-structured-data-strategies) -- Google core update impact on schema -- MEDIUM confidence
- [Schema SEO for SaaS Company](https://www.madx.digital/learn/schema-seo-for-saas-company) -- SaaS-specific implementation guide -- MEDIUM confidence
- [SEO Blog Architecture and Internal Linking 2026](https://www.incremys.com/en/resources/blog/seo-blog) -- content cluster strategy -- MEDIUM confidence
- [Breadcrumb Schema Markup 2026 Guide](https://www.dataenriche.com/breadcrumb-schema-markup-implementation/) -- CTR impact data -- MEDIUM confidence

### Property Management SEO
- [SEO for Property Management: 2026 Growth Guide](https://www.localmighty.com/blog/property-management-seo-guide/) -- multi-channel visibility strategy -- MEDIUM confidence
- [Property Management SEO Blueprint 2026](https://www.clearleaddigital.com/blog/property-management-seo-blueprint) -- comprehensive PM SEO guide -- MEDIUM confidence
- [Blog Content That Gets PMs Ranked](https://gogoodjuju.com/the-blog-content-strategy-that-gets-property-management-companies-ranked/) -- content cluster strategy for PM -- MEDIUM confidence
- [SEO Content Clusters 2026](https://www.digitalapplied.com/blog/seo-content-clusters-2026-topic-authority-guide) -- topic authority building -- MEDIUM confidence

### Competitor Analysis
- [TurboTenant Blog](https://www.turbotenant.com/blog/) -- content hub structure, category organization -- HIGH confidence (direct observation)
- [TurboTenant Authors](https://www.turbotenant.com/authors/) -- named author pages with bios -- HIGH confidence (direct observation)
- [TurboTenant Education Hub](https://www.turbotenant.com/education/) -- hub-and-spoke content architecture -- HIGH confidence (direct observation)
- [Buildium Blog](https://www.buildium.com/blog/) -- competitor comparison content strategy -- HIGH confidence (direct observation)
- [Buildium Property Management Marketing Ideas](https://www.buildium.com/blog/property-management-marketing-ideas/) -- content marketing approach -- MEDIUM confidence

### Robots.txt and Crawl Budget
- [Robots.txt: Optimise Crawling 2026](https://www.incremys.com/en/resources/blog/robots-txt) -- crawl budget optimization -- MEDIUM confidence
- [Robots.txt SEO Technical Guide](https://gracker.ai/seo-101/robots-txt-optimization-technical-seo-guide) -- disallow pattern best practices -- MEDIUM confidence
- [Crawl Budget and robots.txt](https://better-robots.com/blog/crawl-budget-explained) -- budget mechanics -- MEDIUM confidence

### Vercel/Next.js Deployment SEO
- [Avoiding Duplicate Content with Vercel URLs](https://vercel.com/kb/guide/avoiding-duplicate-content-with-vercel-app-urls) -- canonical URL handling -- HIGH confidence
- [Setting up GSC with Vercel](https://medium.com/@dpzhcmy/setting-up-google-search-console-57fe7f50a9e1) -- verification guide -- MEDIUM confidence
