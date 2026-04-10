# Architecture: SEO & Google Indexing Optimization

**Domain:** SEO integration for existing Next.js 16 App Router SaaS marketing pages
**Researched:** 2026-04-08
**Confidence:** HIGH (codebase analysis + official Next.js docs + Google structured data specs)

## Current State Analysis

### What Exists Today

The codebase already has a foundational SEO layer, but it is fragmented and inconsistent across pages.

**Global Layer:**
- `src/lib/generate-metadata.ts` -- exports `getDefaultMetadata()` (lazy-initialized Metadata object with title template, OG, Twitter, robots directives) and `getJsonLd()` (Organization + SoftwareApplication schemas)
- `src/components/seo/seo-json-ld.tsx` -- renders global JSON-LD in `<head>` via root layout
- Root layout (`src/app/layout.tsx`) -- calls `generateSiteMetadata()` and renders `<SeoJsonLd />` in `<head>`

**Sitemap Layer:**
- `src/app/sitemap.ts` -- dynamic sitemap with ISR (24h), fetches blog slugs from Supabase with 5s timeout
- `public/sitemap.xml` -- static XML with 15 hardcoded URLs (stale dates from Feb 2025)
- `public/sitemap-index.xml` -- static index pointing to `/sitemap.xml` (stale)
- `public/robots.txt` -- static file with user-agent rules and Sitemap directive

**Per-Page Structured Data (present):**
- FAQ page: FAQPage + BreadcrumbList JSON-LD (inline in component)
- Pricing page: FAQPage + BreadcrumbList + Product/Offer JSON-LD (inline)
- Compare pages: WebPage + BreadcrumbList JSON-LD (inline)
- About page: BreadcrumbList JSON-LD (inline)
- Contact page: BreadcrumbList JSON-LD (inline)
- Resources hub: BreadcrumbList JSON-LD (inline)
- Features page: BreadcrumbList JSON-LD (via `getBreadcrumbSchema()` in features-data.ts)

**Per-Page Metadata (present):**
- Blog `[slug]`: `generateMetadata()` with OG article type, canonical, Twitter card
- Compare `[competitor]`: `generateMetadata()` with OG, canonical
- Resource subpages (3): static `export const metadata`
- Legal pages (terms, privacy, security-policy): static `export const metadata`
- Support page: static `export const metadata`
- Owner/tenant layouts: static `export const metadata` (not SEO-relevant, behind auth)

### Critical Gaps Identified

**Pages MISSING explicit metadata (falling back to root defaults):**
- `/faq` -- no `generateMetadata` or `export const metadata`
- `/about` -- no metadata export
- `/features` -- no metadata export (also `'use client'` -- cannot use `generateMetadata`)
- `/pricing` -- no metadata export
- `/blog` -- no metadata export (also `'use client'`)
- `/blog/category/[category]` -- no metadata export (also `'use client'`)
- `/contact` -- no metadata export
- `/resources` -- no metadata export
- `/help` -- no metadata export
- `/` (homepage) -- no metadata export (delegates to `marketing-home`, which is force-static)

**Pages MISSING canonical URLs:**
- Every page except `/blog/[slug]` and `/compare/[competitor]` lacks explicit `alternates.canonical`

**Pages MISSING structured data:**
- Blog `[slug]`: no Article JSON-LD, no author, no datePublished, no BreadcrumbList
- Blog hub: no BreadcrumbList, no CollectionPage
- Blog category: no BreadcrumbList, no CollectionPage
- Resource subpages: no HowTo or Article JSON-LD, no BreadcrumbList
- Homepage: no WebSite SearchAction, no BreadcrumbList
- Help page: no BreadcrumbList

**Architectural Issues:**
1. `baseUrl` is constructed differently in every file -- some use `process.env.NEXT_PUBLIC_APP_URL` directly, some use the `env` import, some use different fallback ports (3000 vs 3050). The `getSiteUrl()` helper in `generate-metadata.ts` exists but is not exported/used by page components.
2. JSON-LD is constructed inline in every page component as raw object literals with manual `JSON.stringify().replace()` -- no shared rendering pattern, no type safety.
3. BreadcrumbList schema is duplicated across 7+ pages with copy-pasted boilerplate.
4. The static `public/sitemap.xml` and `public/sitemap-index.xml` conflict with the dynamic `src/app/sitemap.ts`. Crawlers may get stale static files instead of fresh dynamic ones depending on resolution order.
5. `robots.txt` blocks `SemrushBot` and `AhrefsBot` (reasonable for crawl budget, but prevents competitive analysis tools -- a business trade-off to document).
6. Blog hub page is `'use client'` -- cannot use `generateMetadata()`, so it cannot have server-side metadata. This is a structural limitation.
7. The `priceValidUntil` in pricing JSON-LD is hardcoded to `2025-12-31` (expired).

## Recommended Architecture

### Principle: Layered Metadata with Shared Utilities

Three layers, each with clear ownership:

```
Layer 1: Root Layout (global defaults)
  - Default title template, OG, Twitter, robots
  - Organization + SoftwareApplication JSON-LD
  - Applied to EVERY page automatically via Next.js metadata merging

Layer 2: Shared SEO Utilities (reusable building blocks)
  - getSiteUrl() -- single source of truth for base URL
  - createBreadcrumbJsonLd() -- generates BreadcrumbList from route segments
  - createArticleJsonLd() -- generates Article schema for blog posts
  - createFaqJsonLd() -- generates FAQPage schema from question arrays
  - JsonLdScript component -- type-safe rendering with XSS prevention
  - Page-level metadata factory functions

Layer 3: Per-Page (page-specific overrides)
  - generateMetadata() or export const metadata per route
  - Page-specific JSON-LD via composable utility functions
  - Canonical URLs derived from route path
```

### Component Boundaries

| Component | Responsibility | Location |
|-----------|---------------|----------|
| `getSiteUrl()` | Single canonical base URL resolution | `src/lib/generate-metadata.ts` (already exists, needs export) |
| `JsonLdScript` | Type-safe JSON-LD `<script>` rendering with XSS escaping | `src/components/seo/json-ld-script.tsx` (NEW) |
| `createBreadcrumbJsonLd()` | Generates BreadcrumbList from route path segments | `src/lib/seo/breadcrumbs.ts` (NEW) |
| `createArticleJsonLd()` | Generates Article schema from blog post data | `src/lib/seo/article-schema.ts` (NEW) |
| `createFaqJsonLd()` | Generates FAQPage schema from question/answer pairs | `src/lib/seo/faq-schema.ts` (NEW) |
| `createProductJsonLd()` | Generates Product/Offer schema for pricing | `src/lib/seo/product-schema.ts` (NEW) |
| `createPageMetadata()` | Factory for per-page Metadata with canonical + OG | `src/lib/seo/page-metadata.ts` (NEW) |
| `SeoJsonLd` | Global JSON-LD in root layout (existing) | `src/components/seo/seo-json-ld.tsx` (KEEP) |

### Data Flow

```
Route: /blog/how-to-collect-rent

1. Root layout generateMetadata() returns:
   { title: { template: '%s | TenantFlow' }, metadataBase, openGraph, twitter, robots }

2. Blog [slug] page generateMetadata() returns (MERGED over root):
   { title: 'How to Collect Rent | TenantFlow Blog',
     description: post.meta_description,
     alternates: { canonical: 'https://tenantflow.app/blog/how-to-collect-rent' },
     openGraph: { type: 'article', publishedTime, ... },
     twitter: { card: 'summary_large_image', ... } }

3. Blog [slug] page component renders JSON-LD:
   <JsonLdScript schema={createArticleJsonLd(post)} />
   <JsonLdScript schema={createBreadcrumbJsonLd('/blog/how-to-collect-rent', {
     segments: [
       { name: 'Blog', path: '/blog' },
       { name: 'How to Collect Rent', path: '/blog/how-to-collect-rent' }
     ]
   })} />

4. Root layout <head> renders (via SeoJsonLd):
   <script type="application/ld+json">Organization schema</script>
   <script type="application/ld+json">SoftwareApplication schema</script>

5. Final HTML <head> contains:
   - Merged <meta> tags (page overrides root where both define same property)
   - Organization JSON-LD (global, every page)
   - SoftwareApplication JSON-LD (global, every page)
   - Article JSON-LD (page-specific)
   - BreadcrumbList JSON-LD (page-specific)
```

## New and Modified Files

### New Files

| File | Purpose | Lines (est) |
|------|---------|-------------|
| `src/lib/seo/breadcrumbs.ts` | `createBreadcrumbJsonLd(path, overrides?)` -- generates BreadcrumbList from URL path. Auto-derives segment names from path (capitalizes, converts hyphens), with optional label overrides for dynamic segments. | ~40 |
| `src/lib/seo/article-schema.ts` | `createArticleJsonLd(post)` -- generates Article schema with headline, datePublished, author, image, description. Returns typed `WithContext<Article>` from schema-dts. | ~50 |
| `src/lib/seo/faq-schema.ts` | `createFaqJsonLd(questions)` -- generates FAQPage schema from `{ question, answer }[]`. Replaces inline FAQ schema construction in faq/page.tsx and pricing/page.tsx. | ~25 |
| `src/lib/seo/product-schema.ts` | `createProductJsonLd(offers)` -- generates Product schema for pricing page. Replaces inline offer schema in pricing/page.tsx. Computes `priceValidUntil` dynamically. | ~40 |
| `src/lib/seo/page-metadata.ts` | `createPageMetadata(config)` -- factory that produces Next.js `Metadata` with canonical URL, OG, Twitter derived from route path and title. Eliminates per-page boilerplate. | ~60 |
| `src/components/seo/json-ld-script.tsx` | `<JsonLdScript schema={...} />` -- type-safe component accepting `WithContext<Thing>` from schema-dts. Handles `JSON.stringify` + XSS escaping. Replaces all inline `<script dangerouslySetInnerHTML>` blocks. | ~20 |
| `src/app/robots.ts` | Dynamic robots.txt route using `MetadataRoute.Robots`. Replaces `public/robots.txt`. Uses `getSiteUrl()` for sitemap URL. | ~35 |
| `src/lib/seo/__tests__/breadcrumbs.test.ts` | Unit tests for breadcrumb generation | ~60 |
| `src/lib/seo/__tests__/article-schema.test.ts` | Unit tests for article schema | ~40 |
| `src/lib/seo/__tests__/faq-schema.test.ts` | Unit tests for FAQ schema | ~30 |
| `src/lib/seo/__tests__/page-metadata.test.ts` | Unit tests for metadata factory | ~50 |

### Modified Files

| File | Change | Why |
|------|--------|-----|
| `src/lib/generate-metadata.ts` | Export `getSiteUrl()` publicly. Currently private function. | All page components and SEO utilities need the canonical base URL. |
| `src/components/seo/seo-json-ld.tsx` | Refactor to use `JsonLdScript` component instead of inline `dangerouslySetInnerHTML`. | Consistency -- every JSON-LD render uses the same component. |
| `src/app/faq/page.tsx` | Add `export const metadata` with title/description/canonical. Replace inline JSON-LD with `createFaqJsonLd()` + `createBreadcrumbJsonLd()` + `<JsonLdScript>`. | Missing metadata, duplicated schema construction. |
| `src/app/about/page.tsx` | Add `export const metadata`. Replace inline breadcrumb JSON-LD with `createBreadcrumbJsonLd()` + `<JsonLdScript>`. | Missing metadata, duplicated breadcrumb boilerplate. |
| `src/app/pricing/page.tsx` | Add `export const metadata`. Replace inline FAQ/breadcrumb/product JSON-LD with utility functions + `<JsonLdScript>`. Fix expired `priceValidUntil`. | Missing metadata, stale pricing dates, duplicated schemas. |
| `src/app/contact/page.tsx` | Add `export const metadata`. Replace inline breadcrumb JSON-LD. | Missing metadata. |
| `src/app/resources/page.tsx` | Add `export const metadata`. Replace inline breadcrumb JSON-LD. | Missing metadata. |
| `src/app/help/page.tsx` | Add `export const metadata`. Add BreadcrumbList JSON-LD. | Missing metadata and structured data. |
| `src/app/blog/[slug]/page.tsx` | Add Article JSON-LD via `createArticleJsonLd()`. Add BreadcrumbList. Keep existing `generateMetadata()`. | Blog posts lack Article structured data -- critical for Google rich results. |
| `src/app/compare/[competitor]/page.tsx` | Refactor inline JSON-LD to use `<JsonLdScript>` + `createBreadcrumbJsonLd()`. Replace hardcoded `baseUrl` with `getSiteUrl()`. | Consistency, deduplication. |
| `src/app/resources/seasonal-maintenance-checklist/page.tsx` | Add BreadcrumbList + HowTo JSON-LD. | Missing structured data. |
| `src/app/resources/landlord-tax-deduction-tracker/page.tsx` | Add BreadcrumbList JSON-LD. | Missing structured data. |
| `src/app/resources/security-deposit-reference-card/page.tsx` | Add BreadcrumbList JSON-LD. | Missing structured data. |
| `src/components/landing/features-data.ts` | Replace `getBreadcrumbSchema()` with call to `createBreadcrumbJsonLd()`. | Remove one-off breadcrumb function. |
| `src/app/features/page.tsx` | Replace inline breadcrumb JSON-LD. Cannot add metadata (is `'use client'`). | Consistency. |
| `src/app/sitemap.ts` | Add support page, security-policy page, blog category pages. Add `lastModified` from actual DB timestamps for blog posts. | Missing pages in sitemap. |

### Files to DELETE

| File | Why |
|------|-----|
| `public/robots.txt` | Replaced by dynamic `src/app/robots.ts` route. Having both causes conflict -- Next.js serves the static file from `/public` at a higher priority than the dynamic route. |
| `public/sitemap.xml` | Stale static file (dates from Feb 2025). The dynamic `src/app/sitemap.ts` already generates fresh content. Having both means crawlers may hit the stale static version. |
| `public/sitemap-index.xml` | Stale static index. Not needed -- Next.js serves the dynamic sitemap at `/sitemap.xml` directly. |

## Patterns to Follow

### Pattern 1: JsonLdScript Component (replaces all inline dangerouslySetInnerHTML)

**What:** A single component for rendering JSON-LD that handles serialization and XSS escaping.

**When:** Every page that needs structured data.

```typescript
// src/components/seo/json-ld-script.tsx
import type { Thing, WithContext } from 'schema-dts'

interface JsonLdScriptProps {
  schema: WithContext<Thing> | WithContext<Thing>[]
}

export function JsonLdScript({ schema }: JsonLdScriptProps) {
  const schemas = Array.isArray(schema) ? schema : [schema]
  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={`jsonld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(s).replace(/</g, '\\u003c')
          }}
        />
      ))}
    </>
  )
}
```

**Why:** Eliminates 10+ instances of duplicated `dangerouslySetInnerHTML` + `JSON.stringify().replace()` boilerplate. Type safety via `schema-dts` catches malformed schemas at compile time.

### Pattern 2: Breadcrumb Generation from Route Path

**What:** A utility that generates BreadcrumbList JSON-LD from the current URL path, with override support for dynamic segments.

**When:** Every public-facing page.

```typescript
// src/lib/seo/breadcrumbs.ts
import type { BreadcrumbList, WithContext } from 'schema-dts'

interface BreadcrumbOverride {
  name: string
  path: string
}

export function createBreadcrumbJsonLd(
  path: string,
  overrides?: { segments?: BreadcrumbOverride[] }
): WithContext<BreadcrumbList> {
  const siteUrl = getSiteUrl()
  const segments = overrides?.segments ?? pathToSegments(path)

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      ...segments.map((seg, i) => ({
        '@type': 'ListItem' as const,
        position: i + 2,
        name: seg.name,
        ...(i < segments.length - 1 ? { item: `${siteUrl}${seg.path}` } : {})
      }))
    ]
  }
}

function pathToSegments(path: string): BreadcrumbOverride[] {
  return path.split('/').filter(Boolean).map((segment, i, arr) => ({
    name: segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    path: '/' + arr.slice(0, i + 1).join('/')
  }))
}
```

**Why:** Replaces 7+ duplicated breadcrumb schema definitions. The `pathToSegments` auto-derives human-readable names from URL slugs, while `overrides.segments` allows explicit control for dynamic routes (e.g., blog post titles).

### Pattern 3: Page Metadata Factory

**What:** A factory function that generates consistent `Metadata` objects with canonical URL, OG, and Twitter card derived from a minimal config.

**When:** Every static marketing page that needs `export const metadata`.

```typescript
// src/lib/seo/page-metadata.ts
import type { Metadata } from 'next'

interface PageMetadataConfig {
  title: string
  description: string
  path: string
  ogType?: 'website' | 'article'
  noIndex?: boolean
}

export function createPageMetadata(config: PageMetadataConfig): Metadata {
  const siteUrl = getSiteUrl()
  const url = `${siteUrl}${config.path}`

  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: url },
    openGraph: {
      title: config.title,
      description: config.description,
      url,
      type: config.ogType ?? 'website',
      siteName: 'TenantFlow',
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
    },
    ...(config.noIndex ? { robots: 'noindex, nofollow' } : {}),
  }
}
```

**Why:** Pages like FAQ, About, Contact, Help, Resources all need the same metadata structure with different values. This eliminates per-page boilerplate while ensuring every page gets canonical URLs and consistent OG tags.

### Pattern 4: Dynamic robots.ts Route

**What:** Replace static `public/robots.txt` with a dynamic `src/app/robots.ts` route.

**When:** Immediately -- the static file and dynamic sitemap are currently in conflict.

```typescript
// src/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/', '/dashboard/', '/tenant/',
                   '/settings/', '/profile/', '/billing/', '/_next/', '/sw.js'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/', '/dashboard/', '/tenant/',
                   '/settings/', '/profile/', '/billing/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
```

**Why:** The `MetadataRoute.Robots` type ensures correct format. Using `getSiteUrl()` means the sitemap URL is always correct across environments (preview deploys, production). The static `public/robots.txt` must be deleted because Next.js serves static files at higher priority than dynamic routes.

Note: The current `robots.txt` disallows `/manage/` which is not a route in the app (the authenticated area is `/dashboard/`). The dynamic version corrects this. It also removes `Crawl-delay` (not respected by Google) and `Request-rate` (non-standard directive).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client Component Metadata
**What:** Pages using `'use client'` (features, blog hub, blog category) cannot export `generateMetadata()` or `export const metadata`.
**Why bad:** These pages fall back to root layout defaults -- generic title, no page-specific description, no canonical URL.
**Instead:** Extract the metadata export into a separate server component wrapper, or convert the page to a Server Component that renders a client component child. For blog hub specifically: the page component itself should be a Server Component that prefetches initial data and passes it to a client component for interactivity.

### Anti-Pattern 2: Hardcoded Base URLs in Components
**What:** Each page constructs `baseUrl` differently: `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` vs `env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app'` vs various fallback ports.
**Why bad:** Inconsistent canonical URLs. Some pages use port 3000 (wrong -- dev server is 3050). Production URLs may differ from what canonical tags emit.
**Instead:** Always use the exported `getSiteUrl()` from `src/lib/generate-metadata.ts`. One function, one source of truth.

### Anti-Pattern 3: Static and Dynamic Sitemap Conflict
**What:** Having both `public/sitemap.xml` (static) and `src/app/sitemap.ts` (dynamic) in the same project.
**Why bad:** Next.js serves files from `/public` at the highest priority. Crawlers requesting `/sitemap.xml` may get the stale static version (Feb 2025 dates, no blog posts) instead of the fresh dynamic version.
**Instead:** Delete `public/sitemap.xml` and `public/sitemap-index.xml`. The dynamic `src/app/sitemap.ts` is the only sitemap source.

### Anti-Pattern 4: Inline JSON-LD Object Construction
**What:** Building JSON-LD schemas as raw object literals inside page components.
**Why bad:** No type safety (typos like `'portal_access'` are not caught). The `@context` and `@type` strings are repeated everywhere. Schema changes require updating 10+ files.
**Instead:** Use `schema-dts` types for compile-time validation and utility functions for each schema type.

## Sitemap Strategy: Keep Single, Enhance Content

### Decision: Do NOT Split Into Category Sitemaps

The current page count is approximately 25-35 URLs (15 static pages + ~10-20 blog posts + 3 compare pages + 3 resource pages). Google's limit is 50,000 URLs per sitemap. Splitting into category sitemaps at this scale provides zero SEO benefit and adds complexity.

**When to revisit:** If blog post count exceeds 500, or if total indexed pages exceed 1,000, split into category sitemaps using `generateSitemaps()`:
```
/sitemap/0.xml  -- static marketing pages
/sitemap/1.xml  -- blog posts
/sitemap/2.xml  -- comparison pages
```

### Sitemap Enhancements (no splitting needed)

1. **Add missing pages:** `/support`, `/security-policy`, `/blog/category/*` pages
2. **Use real `lastModified` dates:** Blog posts should use `published_at` (already done). Static pages should use hardcoded dates that update when content changes.
3. **Remove stale static files:** Delete `public/sitemap.xml` and `public/sitemap-index.xml`

## Metadata Composition Pattern for 'use client' Pages

Three pages are `'use client'` and cannot export metadata: `/features`, `/blog`, `/blog/category/[category]`.

**Solution: Server Component Wrapper Pattern**

```
// BEFORE (features/page.tsx is 'use client')
'use client'
export default function FeaturesPage() { ... }
// NO metadata export possible

// AFTER (features/page.tsx is Server Component, delegates to client)
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import FeaturesContent from './features-content'  // 'use client' lives here

export const metadata: Metadata = createPageMetadata({
  title: 'Features - Property Management Software | TenantFlow',
  description: 'Explore TenantFlow features...',
  path: '/features',
})

export default function FeaturesPage() {
  return <FeaturesContent />
}
```

The existing page component code moves into a `-content.tsx` file with `'use client'`. The `page.tsx` becomes a thin Server Component that exports metadata and renders the client component.

This pattern applies to:
- `src/app/features/page.tsx` -> split into `page.tsx` (server) + `features-content.tsx` (client)
- `src/app/blog/page.tsx` -> split into `page.tsx` (server) + `blog-content.tsx` (client)
- `src/app/blog/category/[category]/page.tsx` -> split into `page.tsx` (server) + `category-content.tsx` (client)

## Internal Linking Component Pattern

Internal linking improvements do not need a new component. The existing `next/link` with `<Link href="...">` is correct. What is needed is **content-level linking strategy** -- ensuring pages cross-reference each other:

1. **Blog -> Compare:** Blog posts mentioning competitors should link to `/compare/[competitor]`
2. **Compare -> Blog:** Compare pages should link to related blog posts (already have `blogSlug` in compare data)
3. **Blog -> Resources:** Blog posts on maintenance topics should link to `/resources/seasonal-maintenance-checklist`
4. **Resources -> Blog:** Resource pages should link to related blog posts
5. **FAQ -> Features/Pricing:** FAQ answers should deep-link to specific feature descriptions

This is a **content editing task**, not an architecture task. No new components needed.

## SEO Validation in CI Pipeline

### Recommended: Build-Time Schema Validation (Not External API)

Do NOT call Google's Rich Results Test API in CI -- it requires network access, adds latency, and is rate-limited.

Instead, validate JSON-LD output at build time:

1. **schema-dts type checking:** TypeScript compilation catches malformed schemas. If `createArticleJsonLd()` returns `WithContext<Article>` and you pass wrong fields, `tsc` fails.
2. **Unit tests for schema functions:** Each utility in `src/lib/seo/` gets tests that verify:
   - Required fields are present (`@context`, `@type`, key properties)
   - Output matches expected schema structure
   - XSS characters are escaped in serialized output
3. **Existing CI pipeline is sufficient:** `pnpm typecheck && pnpm lint` already runs on every PR. Adding typed JSON-LD functions means schema correctness is checked automatically.

Optional future enhancement: Add a `structured-data-testing-tool` npm package to CI for deeper validation against Schema.org specs.

## Suggested Build Order

Build order follows dependency chain: shared utilities first, then page migrations, then cleanup.

### Phase 1: Shared SEO Utilities (no breaking changes)
1. Install `schema-dts` dev dependency
2. Export `getSiteUrl()` from `src/lib/generate-metadata.ts`
3. Create `src/lib/seo/breadcrumbs.ts` -- breadcrumb generation
4. Create `src/lib/seo/article-schema.ts` -- Article JSON-LD
5. Create `src/lib/seo/faq-schema.ts` -- FAQPage JSON-LD
6. Create `src/lib/seo/product-schema.ts` -- Product/Offer JSON-LD
7. Create `src/lib/seo/page-metadata.ts` -- metadata factory
8. Create `src/components/seo/json-ld-script.tsx` -- shared rendering component
9. Write unit tests for all new utility functions

**Why first:** Every subsequent phase depends on these utilities. Creating them alongside existing code means nothing breaks.

### Phase 2: Crawlability Foundation (robots.ts + sitemap cleanup)
10. Create `src/app/robots.ts` dynamic route
11. Delete `public/robots.txt`
12. Delete `public/sitemap.xml` and `public/sitemap-index.xml`
13. Enhance `src/app/sitemap.ts` -- add missing pages, real timestamps

**Why second:** Crawlability must be correct before search engines can benefit from improved structured data. The static/dynamic sitemap conflict must be resolved early.

### Phase 3: Metadata Gap Closure (add missing metadata to all pages)
14. Add `export const metadata` to: faq, about, pricing, contact, resources, help
15. Split `'use client'` pages into server wrapper + client content:
    - `features/page.tsx` -> server wrapper + `features-content.tsx`
    - `blog/page.tsx` -> server wrapper + `blog-content.tsx`
    - `blog/category/[category]/page.tsx` -> server wrapper + `category-content.tsx`
16. Add canonical URLs to all public pages via `createPageMetadata()`

**Why third:** Metadata is the most impactful SEO change and has the most files to touch. It should happen after utilities exist (Phase 1) and crawlability is fixed (Phase 2).

### Phase 4: Structured Data Enrichment (JSON-LD on all pages)
17. Refactor existing inline JSON-LD to use `<JsonLdScript>` + utility functions:
    - FAQ page: `createFaqJsonLd()` + `createBreadcrumbJsonLd()`
    - Pricing page: `createProductJsonLd()` + `createFaqJsonLd()` + `createBreadcrumbJsonLd()`
    - Compare pages: `createBreadcrumbJsonLd()`
    - About, Contact, Resources: `createBreadcrumbJsonLd()`
    - Features: `createBreadcrumbJsonLd()`
18. Add NEW structured data:
    - Blog `[slug]`: `createArticleJsonLd()` + `createBreadcrumbJsonLd()`
    - Resource subpages: BreadcrumbList
    - Homepage: WebSite SearchAction (optional -- only if search is implemented)
19. Update `src/components/seo/seo-json-ld.tsx` to use `<JsonLdScript>`
20. Delete `getBreadcrumbSchema()` from `features-data.ts`

**Why fourth:** Structured data enrichment is the final layer. It depends on Phase 1 utilities and benefits from Phase 3 metadata being in place (canonical URLs in metadata complement structured data).

### Phase 5: Validation and Verification
21. Run Google Rich Results Test manually on key pages (homepage, blog post, FAQ, pricing, compare)
22. Verify sitemap.xml renders correctly in browser
23. Verify robots.txt renders correctly
24. Check Google Search Console for indexing errors (manual -- not CI)

**Why last:** Validation confirms everything works end-to-end. This is a manual verification step, not automated.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Metadata gap analysis | HIGH | Direct codebase grep confirms which pages have/lack `generateMetadata` or `export const metadata` |
| Static/dynamic sitemap conflict | HIGH | Next.js serves `/public` files at highest priority -- documented behavior |
| robots.ts replacing robots.txt | HIGH | Official Next.js docs confirm `src/app/robots.ts` generates `/robots.txt` route, but static file in `/public` takes precedence and must be deleted |
| schema-dts type safety | HIGH | Google-maintained package, 100k+ weekly downloads, used in official Next.js JSON-LD examples |
| Server wrapper pattern for client pages | HIGH | Standard Next.js App Router pattern -- metadata exports require Server Components |
| No sitemap splitting needed | HIGH | 25-35 URLs is far below the 50,000 URL limit where splitting provides value |
| Build-time schema validation vs CI API calls | MEDIUM | schema-dts catches structural errors but not semantic Schema.org violations. For full validation, the `structured-data-testing-tool` npm package exists but adds CI complexity |
| Blog hub as Server Component | MEDIUM | Requires refactoring from `'use client'` to server component with client child. May need TanStack Query prefetching pattern adjustment |

## Sources

### Official Documentation
- [Next.js generateSitemaps](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps) -- sitemap splitting API, 50K URL limit
- [Next.js sitemap.xml file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) -- dynamic sitemap generation
- [Next.js robots.txt file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) -- dynamic robots.ts route, MetadataRoute.Robots type
- [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld) -- recommended `<script>` tag pattern, XSS prevention
- [schema-dts npm package](https://www.npmjs.com/package/schema-dts) -- Google-maintained TypeScript types for Schema.org
- [schema-dts GitHub](https://github.com/google/schema-dts) -- source, documentation

### Codebase Analysis
- `src/lib/generate-metadata.ts` -- existing global metadata + JSON-LD (getSiteUrl is private)
- `src/components/seo/seo-json-ld.tsx` -- existing global JSON-LD renderer
- `src/app/sitemap.ts` -- existing dynamic sitemap with ISR
- `public/robots.txt` -- existing static robots file
- `public/sitemap.xml`, `public/sitemap-index.xml` -- stale static sitemaps
- All page.tsx files in `src/app/` -- metadata export audit

### SEO Best Practices
- [Google Rich Results Test](https://developers.google.com/search/docs/appearance/structured-data) -- manual validation tool
- [structured-data-testing-tool](https://github.com/iaincollins/structured-data-testing-tool) -- CLI for CI integration
- [Next.js SEO breadcrumb patterns](https://jeremykreutzbender.com/blog/app-router-dynamic-breadcrumbs) -- useSelectedLayoutSegments approach
- [Next.js SEO Best Practices 2026](https://globalinkz.com/blog/next-js-seo-best-practices-complete-2026-guide.html) -- comprehensive guide
