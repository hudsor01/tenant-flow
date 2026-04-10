# Phase 35: Structured Data Enrichment - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add missing JSON-LD structured data schemas to all public pages (BreadcrumbList, Article, WebSite, HowTo, SoftwareApplication) and migrate the 2 remaining inline `dangerouslySetInnerHTML` JSON-LD scripts (compare pages, blog posts) plus 3 resource detail page scripts to use Phase 33's shared utilities.

</domain>

<decisions>
## Implementation Decisions

### Blog Post Article Schema
- **D-01:** Blog post author is Person with name "Richard Hudson" (not Organization). The `createArticleJsonLd()` factory already accepts `authorName` -- pass `'Richard Hudson'` for all blog posts.
- **D-02:** Blog posts must include `wordCount`, `keywords`, `mainEntityOfPage`, `image`, and `publisher.logo` per SCHEMA-02. The existing `createArticleJsonLd()` factory already supports all of these fields.
- **D-03:** Replace the current inline `BlogPosting` schema in `blog-post-page.tsx` with `createArticleJsonLd()` + `JsonLdScript`. The factory uses `Article` type which Google treats equivalently to `BlogPosting`.

### Schema Factories
- **D-04:** Claude's discretion on whether to build reusable factories or handle inline for HowTo and SoftwareApplication. Recommendation: factory for SoftwareApplication (used across ~5 comparison pages), inline for HowTo (truly one-off on maintenance checklist page). Both must use `JsonLdScript` component for rendering.

### Breadcrumb Trail Structure
- **D-05:** Blog posts use 4-level breadcrumb: Home > Blog > [Category] > [Post Title]. Category crumb uses the post's `category` field, formatted as title case from slug.
- **D-06:** Resource detail pages use 3-level breadcrumb: Home > Resources > [Page Title].
- **D-07:** Legal/support pages use 2-level breadcrumb: Home > [Page Title].
- **D-08:** Homepage gets no breadcrumb (it IS the root). But homepage does get a WebSite schema with SearchAction (SCHEMA-03).

### Inline JSON-LD Migration
- **D-09:** All remaining `dangerouslySetInnerHTML` JSON-LD must be replaced with `JsonLdScript` component. Targets: `compare/[competitor]/page.tsx`, `blog/[slug]/blog-post-page.tsx`, and 3 resource detail pages.
- **D-10:** Comparison page inline `comparisonSchema` must be replaced with proper SoftwareApplication schemas per SCHEMA-07.

### Claude's Discretion
- Implementation order and plan wave structure
- Whether `createBreadcrumbJsonLd()` needs overrides for blog post breadcrumbs (4-level trail may need category + title overrides) or a new helper
- Whether to add `readingTime` field to `createArticleJsonLd()` config or compute it from `wordCount`
- Unit test structure for new schema factories

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SEO Utilities (Phase 33 Output)
- `src/lib/seo/article-schema.ts` -- `createArticleJsonLd()` factory, currently supports title/slug/dates/authorName/image/wordCount/keywords/description
- `src/lib/seo/breadcrumbs.ts` -- `createBreadcrumbJsonLd()` with path + overrides support
- `src/lib/seo/faq-schema.ts` -- `createFaqJsonLd()` for FAQ pages
- `src/lib/seo/product-schema.ts` -- `createProductJsonLd()` for pricing
- `src/lib/seo/page-metadata.ts` -- `createPageMetadata()` factory
- `src/components/seo/json-ld-script.tsx` -- `JsonLdScript` component for safe JSON-LD rendering
- `src/lib/generate-metadata.ts` -- `getSiteUrl()` single source of truth

### Pages With Remaining Inline JSON-LD (migration targets)
- `src/app/compare/[competitor]/page.tsx` -- Inline comparison schema with `dangerouslySetInnerHTML` (SCHEMA-07)
- `src/app/blog/[slug]/blog-post-page.tsx` -- Inline BlogPosting schema with Organization author (SCHEMA-02)
- `src/app/resources/seasonal-maintenance-checklist/page.tsx` -- Inline JSON-LD (SCHEMA-06: HowTo target)
- `src/app/resources/landlord-tax-deduction-tracker/page.tsx` -- Inline JSON-LD
- `src/app/resources/security-deposit-reference-card/page.tsx` -- Inline JSON-LD

### Pages Needing Breadcrumbs Added (SCHEMA-01)
- `src/app/page.tsx` -- Homepage (WebSite schema, no breadcrumb)
- `src/app/blog/[slug]/blog-post-page.tsx` -- Blog posts (4-level: Home > Blog > Category > Post)
- `src/app/blog/page.tsx` -- Blog hub (Home > Blog)
- `src/app/blog/category/[category]/page.tsx` -- Blog categories (Home > Blog > Category)
- `src/app/help/page.tsx` -- Help (Home > Help) -- check if already has breadcrumbs
- `src/app/support/page.tsx` -- Support (Home > Support)
- `src/app/privacy/page.tsx` -- Privacy (Home > Privacy Policy)
- `src/app/terms/page.tsx` -- Terms (Home > Terms of Service)
- `src/app/security-policy/page.tsx` -- Security (Home > Security Policy)

### Pages Already Using JsonLdScript (reference for consistency)
- `src/app/features/page.tsx` -- Breadcrumb via JsonLdScript (Phase 34)
- `src/app/pricing/page.tsx` -- FAQ + breadcrumb + product via JsonLdScript (Phase 34)
- `src/app/faq/page.tsx` -- FAQ + breadcrumb via JsonLdScript (Phase 34)
- `src/app/about/page.tsx` -- Breadcrumb via JsonLdScript (Phase 34)
- `src/app/contact/page.tsx` -- Breadcrumb via JsonLdScript (Phase 34)
- `src/app/resources/page.tsx` -- Breadcrumb via JsonLdScript (Phase 34)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createArticleJsonLd()` -- Already supports Person author, wordCount, keywords, image, mainEntityOfPage. Just needs to be wired into blog post rendering.
- `createBreadcrumbJsonLd(path, overrides?)` -- Generates breadcrumb from path segments. May need override support for 4-level blog post trails (category name, post title).
- `JsonLdScript` -- XSS-safe JSON-LD component, used across 6 pages already from Phase 34.
- `getSiteUrl()` -- Base URL single source of truth.

### Established Patterns
- Phase 34 pattern: Import `JsonLdScript` + schema factory, render `<JsonLdScript schema={createXxxJsonLd(...)} />` in server component wrapper
- Blog posts render in `blog-post-page.tsx` (client component) -- JSON-LD migration may need to move schema to server wrapper `page.tsx` or keep in client with JsonLdScript
- Compare pages are server components with `generateMetadata()` -- can add JsonLdScript directly

### Integration Points
- `blog-post-page.tsx` receives full `post` object with `title`, `published_at`, `updated_at`, `reading_time`, `category`, `featured_image`, `meta_description`, `excerpt`
- Compare pages build `comparisonSchema` from `competitorData` object with `name`, `description`, pricing info
- Resource detail pages have their own inline schema data

</code_context>

<specifics>
## Specific Ideas

- Blog post author is "Richard Hudson" on all posts (user preference for personal branding / E-E-A-T)
- Blog breadcrumbs should show full category context: Home > Blog > Category > Post Title
- WebSite schema on homepage should include SearchAction for Google sitelinks search box

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 35-structured-data-enrichment*
*Context gathered: 2026-04-09*
