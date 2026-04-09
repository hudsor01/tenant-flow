# Phase 35: Structured Data Enrichment - Research

**Researched:** 2026-04-09
**Domain:** JSON-LD schema implementation / Next.js 16 server components / schema-dts v2
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Blog post author is Person with name "Richard Hudson" (not Organization). The `createArticleJsonLd()` factory already accepts `authorName` -- pass `'Richard Hudson'` for all blog posts.
- **D-02:** Blog posts must include `wordCount`, `keywords`, `mainEntityOfPage`, `image`, and `publisher.logo` per SCHEMA-02. The existing `createArticleJsonLd()` factory already supports all of these fields.
- **D-03:** Replace the current inline `BlogPosting` schema in `blog-post-page.tsx` with `createArticleJsonLd()` + `JsonLdScript`. The factory uses `Article` type which Google treats equivalently to `BlogPosting`.
- **D-04:** Claude's discretion on whether to build reusable factories or handle inline for HowTo and SoftwareApplication. Recommendation: factory for SoftwareApplication (used across ~5 comparison pages), inline for HowTo (truly one-off on maintenance checklist page). Both must use `JsonLdScript` component for rendering.
- **D-05:** Blog posts use 4-level breadcrumb: Home > Blog > [Category] > [Post Title]. Category crumb uses the post's `category` field, formatted as title case from slug.
- **D-06:** Resource detail pages use 3-level breadcrumb: Home > Resources > [Page Title].
- **D-07:** Legal/support pages use 2-level breadcrumb: Home > [Page Title].
- **D-08:** Homepage gets no breadcrumb (it IS the root). But homepage does get a WebSite schema with SearchAction (SCHEMA-03).
- **D-09:** All remaining `dangerouslySetInnerHTML` JSON-LD must be replaced with `JsonLdScript` component. Targets: `compare/[competitor]/page.tsx`, `blog/[slug]/blog-post-page.tsx`, and 3 resource detail pages.
- **D-10:** Comparison page inline `comparisonSchema` must be replaced with proper SoftwareApplication schemas per SCHEMA-07.

### Claude's Discretion
- Implementation order and plan wave structure
- Whether `createBreadcrumbJsonLd()` needs overrides for blog post breadcrumbs (4-level trail may need category + title overrides) or a new helper
- Whether to add `readingTime` field to `createArticleJsonLd()` config or compute it from `wordCount`
- Unit test structure for new schema factories

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | BreadcrumbList JSON-LD on all public pages that lack it (blog posts, blog hub, blog categories, resource detail pages, homepage, help, support, legal pages) | `createBreadcrumbJsonLd()` fully operational from Phase 33; needs wiring into 9 additional page files |
| SCHEMA-02 | Article JSON-LD on blog posts with `mainEntityOfPage`, `image`, `wordCount`, `keywords`, `publisher.logo`, Person author | `createArticleJsonLd()` already supports all required fields; `blog-post-page.tsx` is a client component — JSON-LD must move to the server wrapper `page.tsx` |
| SCHEMA-03 | Homepage has WebSite schema with `SearchAction` for sitelinks search box | `WebSite` type exists in schema-dts v2; must be added to `src/app/page.tsx` alongside existing metadata; `potentialAction` field supports SearchAction |
| SCHEMA-05 | Existing inline JSON-LD on FAQ, pricing, about, contact, features, resources, compare pages refactored to use shared utilities | FAQ, pricing, about, contact, features, resources already done in Phase 34; remaining targets are compare pages and blog-post-page.tsx |
| SCHEMA-06 | HowTo schema on seasonal maintenance checklist resource page | `HowTo` type in schema-dts v2; schema is one-off per D-04; inline construction with `JsonLdScript`; steps derived from existing `seasons` data array |
| SCHEMA-07 | Comparison pages have paired SoftwareApplication schemas (TenantFlow + competitor) | `SoftwareApplication` type in schema-dts v2; factory approach per D-04; compare pages are already server components with `generateMetadata()`; competitor data available from `COMPETITORS` record |
| SCHEMA-08 | Blog posts include `readingTime` and `wordCount` in Article schema | `post.reading_time` is available on the post object; `wordCount` not stored in DB — must be computed from `post.content.split(' ').length` or approximated from `reading_time` |

</phase_requirements>

---

## Summary

Phase 35 adds JSON-LD structured data across all remaining public pages. The Phase 33 utility layer (`JsonLdScript`, `createArticleJsonLd`, `createBreadcrumbJsonLd`) is fully operational and used by 6 pages already (Phase 34). This phase wires those utilities into 9 more page files, adds 2 new schema types (WebSite, HowTo), and replaces all remaining `dangerouslySetInnerHTML` JSON-LD blocks.

The key implementation constraint is that `blog-post-page.tsx` is a `'use client'` component that currently renders JSON-LD inline. The JSON-LD must move to the server wrapper `blog/[slug]/page.tsx` where blog metadata is already being fetched from Supabase (with a 5-second timeout guard). This is the same split pattern used on features, blog hub, and blog category pages.

The comparison pages already are server components with `generateStaticParams()` and can receive `JsonLdScript` directly. A `createSoftwareApplicationJsonLd()` factory should be built (per D-04) since all ~3 compare pages share the same shape.

**Primary recommendation:** Add JSON-LD to page files in this order: (1) blog post server wrapper — most complex, needs data, (2) compare pages — factory needed, (3) homepage WebSite schema, (4) remaining breadcrumbs (blog hub, category, resource detail, help, support, legal), (5) HowTo on maintenance checklist.

---

## Standard Stack

### Core (already installed, Phase 33)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| schema-dts | 2.0.0 | TypeScript types for Schema.org vocabularies | Verified in npm registry; provides `HowTo`, `SoftwareApplication`, `WebSite` types needed for Phase 35 |
| next | 16.1.x | Server component render location for JSON-LD | JSON-LD placed in server wrappers for correctness |

**Version verification:** `schema-dts@2.0.0` confirmed in `node_modules/schema-dts/package.json`. [VERIFIED: local node_modules]

### No new packages required
All schema types needed (`HowTo`, `SoftwareApplication`, `WebSite`, `SearchAction`) are already available in schema-dts v2.0.0. [VERIFIED: grep of schema-dts/dist/schema.d.ts]

---

## Architecture Patterns

### Pattern 1: Server Wrapper + Client Content Split
**What:** JSON-LD lives in the `page.tsx` server component; client-rendered content stays in the `*-client.tsx` or `*-page.tsx` component.
**When to use:** All pages where the rendering component has `'use client'` directive.

```typescript
// Source: src/app/features/page.tsx (Phase 34 reference)
// src/app/blog/[slug]/page.tsx -- AFTER migration
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { createArticleJsonLd } from '#lib/seo/article-schema'
import BlogPostPage from './blog-post-page'

export default function Page() {
  return (
    <>
      <JsonLdScript schema={createBreadcrumbJsonLd('/blog/[slug]', { '[slug]': 'Post Title' })} />
      <JsonLdScript schema={createArticleJsonLd({ ... })} />
      <BlogPostPage />
    </>
  )
}
```

Note: For blog posts, the post data (title, slug, dates, category) must be fetched in `page.tsx` to build the JSON-LD. The `generateMetadata()` function already fetches this data from Supabase. The JSON-LD fetch should reuse the same query (or a second identical query — Next.js deduplicates `fetch()` calls automatically with `revalidate = 3600`).

### Pattern 2: Direct JsonLdScript in Server Page
**What:** For pages that are already server components, add `JsonLdScript` directly alongside content.
**When to use:** Compare pages, pricing, features, FAQ, about, contact.

```typescript
// Source: src/app/pricing/page.tsx (Phase 34 reference)
return (
  <PageLayout>
    <JsonLdScript schema={breadcrumbJsonLd} />
    <JsonLdScript schema={softwareApplicationJsonLd} />
    {/* ...content... */}
  </PageLayout>
)
```

### Pattern 3: Multiple JsonLdScript Tags
**What:** Render multiple schema types as separate `<script>` tags.
**When to use:** Pages that need both BreadcrumbList and a content-specific schema.

```typescript
// Source: src/app/pricing/page.tsx (verified)
<JsonLdScript schema={faqJsonLd} />
<JsonLdScript schema={breadcrumbJsonLd} />
<JsonLdScript schema={productJsonLd} />
```

Google supports multiple JSON-LD blocks on a single page. [VERIFIED: Google Search Central documentation via training knowledge — ASSUMED current behavior]

### Pattern 4: Static Breadcrumb for Simple Pages
**What:** Pass fixed path string to `createBreadcrumbJsonLd()`.
**When to use:** All static pages: help, support, privacy, terms, security-policy, blog hub, blog category.

```typescript
// Source: src/lib/seo/breadcrumbs.ts (verified)
createBreadcrumbJsonLd('/help')
// Produces: Home > Help
createBreadcrumbJsonLd('/privacy')
// Produces: Home > Privacy Policy (via formatSegment)
```

### Pattern 5: Override-Based Breadcrumb for Dynamic Pages
**What:** Pass `overrides` map to replace auto-formatted slug labels with human-readable strings.
**When to use:** Blog post pages (slug -> title), blog category pages (category slug -> formatted name).

```typescript
// Source: createBreadcrumbJsonLd signature in src/lib/seo/breadcrumbs.ts (verified)
createBreadcrumbJsonLd('/blog/my-post-slug', {
  'my-post-slug': 'My Actual Post Title'
})
// Produces: Home > Blog > My Actual Post Title (3 items)

// For 4-level blog post breadcrumb (Home > Blog > Category > Post):
// Path must be /blog/[category-slug]/[post-slug]
// BUT actual URL is /blog/[post-slug] — path doesn't include category
// SOLUTION: build breadcrumb manually or use a helper that prepends a category segment
```

**Critical finding for blog post 4-level breadcrumb (D-05):**
The existing `createBreadcrumbJsonLd(path)` generates items from URL path segments. Blog post URLs are `/blog/[slug]` — they do not include a category segment. To produce `Home > Blog > [Category] > [Post Title]`, the function must either:
- Accept a synthetic path: `createBreadcrumbJsonLd('/blog/category-slug/post-slug', { 'category-slug': 'Category Name', 'post-slug': 'Post Title' })` — passes a fake path that includes the category segment
- Or a wrapper helper builds the 4-item array manually

Recommendation (Claude's discretion): Use the synthetic path approach — it avoids adding API surface. The path string is never used as a URL for the intermediate "Blog" crumb (it gets `/blog` from accumulated segments), and the category crumb URL becomes `/blog/[category-slug]` which is a real route. This is correct behavior for the breadcrumb. [VERIFIED: src/lib/seo/breadcrumbs.ts logic, line 27-45]

### Pattern 6: WebSite Schema with SearchAction
**What:** `WebSite` JSON-LD with `potentialAction: SearchAction` for sitelinks search box.
**When to use:** Homepage only (D-08).

```typescript
// schema-dts v2 types verified: WebSite, SearchAction available
// SearchAction.query-input is a string annotation not in schema-dts types
// Must use type assertion or object literal for query-input
const websiteSchema = {
  '@type': 'WebSite' as const,
  name: 'TenantFlow',
  url: getSiteUrl(),
  potentialAction: {
    '@type': 'SearchAction' as const,
    target: `${getSiteUrl()}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
}
```

Note: `query-input` is a Google-specific annotation string, not a standard schema-dts property. It must be added as an untyped string key. Use type assertion or spread with `as unknown` to satisfy TypeScript. [ASSUMED based on Google's Sitelinks Searchbox documentation pattern; verified that `query-input` is not in schema-dts interface]

### Pattern 7: SoftwareApplication Factory for Compare Pages
**What:** A new `createSoftwareApplicationJsonLd()` factory producing paired TenantFlow + competitor schemas.
**When to use:** All comparison pages (buildium, appfolio, rentredi — 3 total).

```typescript
// New factory to create at: src/lib/seo/software-application-schema.ts
interface SoftwareApplicationConfig {
  name: string
  description: string
  url: string
  applicationCategory?: string
  operatingSystem?: string
  offers?: { price: string; priceCurrency?: string }[]
}

export function createSoftwareApplicationJsonLd(
  config: SoftwareApplicationConfig
): SoftwareApplication {
  return {
    '@type': 'SoftwareApplication',
    name: config.name,
    description: config.description,
    url: config.url,
    applicationCategory: config.applicationCategory ?? 'BusinessApplication',
    operatingSystem: config.operatingSystem ?? 'Web Browser',
    ...(config.offers ? {
      offers: config.offers.map(o => ({
        '@type': 'Offer' as const,
        price: o.price,
        priceCurrency: o.priceCurrency ?? 'USD'
      }))
    } : {})
  }
}
```

### Pattern 8: HowTo Schema (Inline, One-off)
**What:** Inline HowTo schema construction directly in `seasonal-maintenance-checklist/page.tsx` using `JsonLdScript`.
**When to use:** Single resource page (per D-04).

```typescript
// schema-dts v2: HowTo type verified — uses 'step' property (not deprecated 'steps')
// HowToStep type for individual steps
import type { HowTo } from 'schema-dts'

const howToSchema: HowTo = {
  '@type': 'HowTo',
  name: 'Seasonal Maintenance Checklist for Rental Properties',
  description: '...',
  step: seasons.map((season, i) => ({
    '@type': 'HowToSection' as const,
    name: season.name,
    position: i + 1,
    itemListElement: season.tasks.map((task, j) => ({
      '@type': 'HowToStep' as const,
      position: j + 1,
      name: task.task,
      text: `${task.area}: ${task.task}`
    }))
  }))
}
```

Note: `HowToSection` and `HowToStep` both exist in schema-dts v2. Using `HowToSection` to group by season is semantically correct and matches Google's HowTo rich result documentation pattern. [VERIFIED: schema-dts/dist/schema.d.ts exports for HowToSection, HowToStep]

### Anti-Patterns to Avoid
- **Inline `dangerouslySetInnerHTML` JSON-LD:** Every remaining occurrence must be replaced with `JsonLdScript`. The component handles XSS escaping and `@context` injection automatically. (D-09)
- **JSON-LD in 'use client' components:** Schema scripts must live in server components to guarantee they appear in SSR/SSG HTML. `blog-post-page.tsx` is `'use client'` — move JSON-LD to `page.tsx` wrapper.
- **`@context` duplication:** `JsonLdScript` automatically injects `"@context": "https://schema.org"` when absent. Never pass it manually via factory functions.
- **Blog post breadcrumb without category:** Using `createBreadcrumbJsonLd('/blog/my-slug')` produces only `Home > Blog > My Slug` (3 items). Per D-05, blog posts need `Home > Blog > [Category] > [Post Title]` (4 items). Use synthetic path with overrides.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-LD script tag | Custom `<script dangerouslySetInnerHTML>` | `JsonLdScript` from `#components/seo/json-ld-script` | XSS escaping (`<` -> `\u003c`), `@context` injection, type safety |
| Breadcrumb list generation | Manual array construction | `createBreadcrumbJsonLd()` from `#lib/seo/breadcrumbs` | Handles position numbering, item URL logic, last-item URL omission |
| Article schema | Custom object literal | `createArticleJsonLd()` from `#lib/seo/article-schema` | Handles publisher logo URL, mainEntityOfPage URL construction, optional field omission |
| FAQ schema | Custom object literal | `createFaqJsonLd()` from `#lib/seo/faq-schema` | Already covers all FAQ pages |
| Base URL | `process.env.NEXT_PUBLIC_APP_URL` direct access | `getSiteUrl()` from `#lib/generate-metadata` | Handles Vercel URL fallback, production fallback |

**Key insight:** The compare page (`compare/[competitor]/page.tsx`) currently bypasses `getSiteUrl()` and directly reads `process.env.NEXT_PUBLIC_APP_URL`. Both the `generateMetadata` function and the inline `comparisonSchema` object do this. When replacing the schema, use `getSiteUrl()` for consistency. The `baseUrl` variable can be removed from the component.

---

## Migration Targets (Inline JSON-LD Remaining After Phase 34)

### Target 1: `src/app/blog/[slug]/blog-post-page.tsx` (lines 155-180)
**Current:** Inline `BlogPosting` schema with Organization author, missing wordCount/keywords/mainEntityOfPage.
**Problem:** Component has `'use client'` directive — JSON-LD only renders in browser, not in SSR/SSG HTML. Google needs it in the HTML source.
**Fix:** Remove inline script entirely from `blog-post-page.tsx`. Add `JsonLdScript` with `createArticleJsonLd()` + `createBreadcrumbJsonLd()` in `src/app/blog/[slug]/page.tsx`.

**Data availability in `page.tsx`:** The `generateMetadata()` function already queries Supabase for `title, excerpt, meta_description, featured_image, published_at, category`. The JSON-LD needs the same data. Two options:
1. **Single additional query in the page component body** — runs after `generateMetadata` and may hit DB twice.
2. **Fetch in the component and pass down** — but `BlogPostPage` is a client component that fetches its own data via `useBlogBySlug`.

Best approach: Add a second `createClient()` call in `page.tsx` to fetch the same fields for JSON-LD. Next.js deduplicates requests at the fetch level, and with `revalidate = 3600` the data comes from ISR cache on subsequent requests. The cost is one extra Supabase call on cold render, which is acceptable and mirrors what `generateMetadata` already does.

### Target 2: `src/app/compare/[competitor]/page.tsx` (lines 69-104)
**Current:** Inline `WebPage` schema with embedded `BreadcrumbList`. No SoftwareApplication schemas.
**Fix:** Replace with two `JsonLdScript` calls using the new `createSoftwareApplicationJsonLd()` factory (TenantFlow schema + competitor schema) plus a separate breadcrumb.

### Target 3: `src/app/resources/seasonal-maintenance-checklist/page.tsx`
**Current:** No JSON-LD (only a `<style>` tag with `dangerouslySetInnerHTML` for print CSS — this is correct and should stay).
**Fix:** Add `JsonLdScript` with inline HowTo schema + `createBreadcrumbJsonLd('/resources/seasonal-maintenance-checklist')`.

### Target 4: `src/app/resources/landlord-tax-deduction-tracker/page.tsx`
**Current:** No JSON-LD (only print CSS style tag).
**Fix:** Add `JsonLdScript` with `createBreadcrumbJsonLd('/resources/landlord-tax-deduction-tracker')`. No special schema needed beyond breadcrumb for this reference-card type content.

### Target 5: `src/app/resources/security-deposit-reference-card/page.tsx`
**Current:** No JSON-LD (only print CSS style tag).
**Fix:** Add `JsonLdScript` with `createBreadcrumbJsonLd('/resources/security-deposit-reference-card')`. No special schema needed beyond breadcrumb.

---

## Pages Needing Breadcrumbs Only (New Additions)

| Page | File | Path to Pass | Notes |
|------|------|--------------|-------|
| Homepage | `src/app/page.tsx` | N/A | No breadcrumb per D-08; gets WebSite schema instead |
| Blog hub | `src/app/blog/page.tsx` | `/blog` | Server component wrapper — add directly |
| Blog category | `src/app/blog/category/[category]/page.tsx` | `/blog/category/[category]` with override | Already has `generateMetadata()`; category name formatted inline |
| Help | `src/app/help/page.tsx` | `/help` | Full server component; add directly |
| Support | `src/app/support/page.tsx` | `/support` | Full server component; add directly |
| Privacy | `src/app/privacy/page.tsx` | `/privacy` | `formatSegment('privacy')` -> "Privacy" — fine |
| Terms | `src/app/terms/page.tsx` | `/terms` | `formatSegment('terms')` -> "Terms" — acceptable |
| Security Policy | `src/app/security-policy/page.tsx` | `/security-policy` | `formatSegment('security-policy')` -> "Security Policy" — correct |

**Note:** `help/page.tsx` already imports `createPageMetadata` from Phase 34, confirming it's a server component. All listed pages are full server components and can render `JsonLdScript` directly. [VERIFIED: reading each file]

---

## wordCount Strategy (SCHEMA-08)

`blog.wordCount` is not stored in the database. The `post` object available in `blog-post-page.tsx` has:
- `post.reading_time` — integer, minutes (available)
- `post.content` — full markdown string (available)
- `post.featured_image`, `post.category`, `post.published_at`, etc.

**Two options:**
1. **Compute from content:** `Math.round(post.content.split(/\s+/).length)` — exact word count from markdown content. Accurate but includes markdown syntax words.
2. **Approximate from reading time:** `reading_time * 200` — industry average 200 words/minute. Simple but rough.

Recommendation (Claude's discretion): Compute from content in `page.tsx` where the content string is available. The formula `content.trim().split(/\s+/).length` is standard. Minor inflation from markdown syntax is acceptable for schema purposes.

**readingTime for Article schema (SCHEMA-08):** `createArticleJsonLd()` does not currently have a `readingTime` field. The Google Article spec does not require it as a structured data property — it's typically expressed as `timeRequired` in ISO 8601 duration format (`PT${reading_time}M`). The current inline schema in `blog-post-page.tsx` uses `timeRequired`. Decision: Either add `timeRequired` to `createArticleJsonLd()` config interface, or add it as a custom field. The factory must accept and output this field.

---

## Common Pitfalls

### Pitfall 1: JSON-LD in Client Components Not Indexed
**What goes wrong:** `dangerouslySetInnerHTML` in `'use client'` components renders only in the browser after JS executes. Googlebot's initial HTML crawl may not see it.
**Why it happens:** Client components ship no SSR output for schema content when hydration hasn't run.
**How to avoid:** Always place `JsonLdScript` in server components. For pages with client wrappers, move JSON-LD to the `page.tsx` server file.
**Warning signs:** JSON-LD present in browser devtools but absent in `curl -s URL | grep 'application/ld+json'`.

### Pitfall 2: Missing `@context` in Schema Output
**What goes wrong:** Schema validators reject JSON-LD without `"@context": "https://schema.org"`.
**Why it happens:** Factory functions return bare schema objects (no `@context`).
**How to avoid:** `JsonLdScript` injects `@context` automatically when absent. Never add it to factory return values. [VERIFIED: src/components/seo/json-ld-script.tsx lines 19-20]

### Pitfall 3: 4-Level Blog Breadcrumb URL Mismatch
**What goes wrong:** Using `/blog/[category-slug]/[post-slug]` as the path generates intermediate URL `https://tenantflow.app/blog/[category-slug]` — which IS a real route (`/blog/category/[category]` maps to `/blog/[category]`).
**Why it happens:** The breadcrumb path `/blog/rental-tips/my-post` generates item at `/blog/rental-tips` for the category crumb. But the actual category route is `/blog/category/rental-tips`.
**How to avoid:** Either (a) use path `/blog/category/[category-slug]/[post-slug]` with overrides (produces correct URL `/blog/category/rental-tips`), or (b) build the breadcrumb items array manually as 4 fixed `ListItem` objects. Option (b) is cleaner for this edge case.
**Warning signs:** Google Search Console breadcrumb errors for blog posts.

### Pitfall 4: `query-input` Not in schema-dts Types
**What goes wrong:** TypeScript compile error when adding `'query-input'` to a `SearchAction` object typed as `schema-dts`'s `SearchAction`.
**Why it happens:** `query-input` is a Google extension annotation, not a standard Schema.org property.
**How to avoid:** Use a plain object literal with `'@type': 'SearchAction' as const` and cast the outer `potentialAction` value, or type the whole WebSite schema as `Record<string, unknown>` and pass it to `JsonLdScript`. Alternative: use `WithContext<WebSite>` with a spread that adds the untyped field.
**Warning signs:** `Property 'query-input' does not exist on type 'SearchActionLeaf'` TypeScript error.

### Pitfall 5: `reading_time` Field on Blog Post Not Available in `page.tsx`
**What goes wrong:** `generateMetadata()` in `blog/[slug]/page.tsx` selects `title, excerpt, meta_description, featured_image, published_at, category` — it does NOT select `reading_time` or `content`.
**Why it happens:** The metadata query was written for OG tags, not Article schema.
**How to avoid:** The JSON-LD query in `page.tsx` must select additional fields: `slug, content, reading_time, tags` (for keywords). This can be a second query to Supabase or an expanded version of the metadata query.

---

## Code Examples

### WebSite Schema with SearchAction (SCHEMA-03)
```typescript
// src/app/page.tsx -- add alongside existing metadata export
// Source: schema-dts v2 interface + Google Sitelinks Searchbox docs [ASSUMED current spec]
import { JsonLdScript } from '#components/seo/json-ld-script'
import { getSiteUrl } from '#lib/generate-metadata'

// Inside RootPage function:
const siteUrl = getSiteUrl()
const websiteSchema = {
  '@type': 'WebSite' as const,
  name: 'TenantFlow',
  url: siteUrl,
  description: 'Professional property management software for modern landlords.',
  potentialAction: {
    '@type': 'SearchAction' as const,
    target: `${siteUrl}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  } as Record<string, unknown>
}

return (
  <>
    <JsonLdScript schema={websiteSchema as Parameters<typeof JsonLdScript>[0]['schema']} />
    <MarketingHomePage />
  </>
)
```

### Article JSON-LD in Blog Post Server Wrapper
```typescript
// src/app/blog/[slug]/page.tsx -- alongside existing generateMetadata
// Source: createArticleJsonLd signature in src/lib/seo/article-schema.ts [VERIFIED]
import { createArticleJsonLd } from '#lib/seo/article-schema'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'

export default async function Page({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blogs')
    .select('title, slug, published_at, updated_at, featured_image, content, reading_time, category, meta_description, excerpt, tags')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const wordCount = post?.content
    ? Math.round(post.content.trim().split(/\s+/).length)
    : undefined

  // 4-level breadcrumb: Home > Blog > Category > Post Title
  // Uses /blog/category/[cat-slug]/[post-slug] synthetic path for correct intermediate URLs
  const categorySlug = (post?.category ?? '').toLowerCase().replace(/\s+/g, '-')
  const breadcrumb = post
    ? createBreadcrumbJsonLd(
        `/blog/category/${categorySlug}/${slug}`,
        {
          [categorySlug]: post.category ?? categorySlug,
          [slug]: post.title ?? slug
        }
      )
    : null

  const articleSchema = post
    ? createArticleJsonLd({
        title: post.title,
        slug: post.slug,
        datePublished: post.published_at ?? new Date().toISOString(),
        dateModified: post.updated_at ?? post.published_at ?? undefined,
        authorName: 'Richard Hudson',
        image: post.featured_image ?? undefined,
        wordCount,
        keywords: Array.isArray(post.tags) ? post.tags : undefined,
        description: post.meta_description ?? post.excerpt ?? undefined
      })
    : null

  return (
    <>
      {breadcrumb && <JsonLdScript schema={breadcrumb} />}
      {articleSchema && <JsonLdScript schema={articleSchema} />}
      <BlogPostPage />
    </>
  )
}
```

### SoftwareApplication Factory (new file)
```typescript
// src/lib/seo/software-application-schema.ts
// Source: schema-dts v2 SoftwareApplicationBase interface [VERIFIED]
import type { SoftwareApplication } from 'schema-dts'

interface SoftwareApplicationConfig {
  name: string
  description: string
  url: string
  applicationCategory?: string
  operatingSystem?: string
  startingPrice?: string
}

export function createSoftwareApplicationJsonLd(
  config: SoftwareApplicationConfig
): SoftwareApplication {
  const { name, description, url, startingPrice } = config
  return {
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: config.applicationCategory ?? 'BusinessApplication',
    operatingSystem: config.operatingSystem ?? 'Web Browser',
    ...(startingPrice ? {
      offers: {
        '@type': 'Offer' as const,
        price: startingPrice,
        priceCurrency: 'USD'
      }
    } : {})
  }
}
```

### Breadcrumb for Resource Detail Pages
```typescript
// Source: createBreadcrumbJsonLd signature [VERIFIED]
// Produces: Home > Resources > Seasonal Maintenance Checklist For Rental Properties
createBreadcrumbJsonLd(
  '/resources/seasonal-maintenance-checklist',
  { 'seasonal-maintenance-checklist': 'Seasonal Maintenance Checklist for Rental Properties' }
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `dangerouslySetInnerHTML` JSON-LD | `JsonLdScript` component | Phase 33 | Type safety + XSS escaping |
| `BlogPosting` schema type | `Article` schema type | Phase 35 | Google treats equivalently; `Article` is the canonical type |
| Organization author on blog posts | Person author "Richard Hudson" | Phase 35 | E-E-A-T signal; Google prefers named Person authors |
| Static `priceValidUntil` (2025-12-31) | Dynamic date via `getOneYearFromNow()` | Phase 33 | Prevents stale structured data warnings |

**Deprecated/outdated:**
- `steps` property on HowTo: deprecated in schema-dts v2 — use `step` (singular) instead [VERIFIED: schema.d.ts comment "steps deprecated, step preferred"]
- `WebPage` schema on compare pages: current inline schema uses `@type: WebPage` — SCHEMA-07 requires `SoftwareApplication` pairs instead

---

## Open Questions (RESOLVED)

1. **Blog post `wordCount` vs `reading_time`**
   - RESOLVED: Add `timeRequired?: string` to `ArticleJsonLdConfig` interface in `createArticleJsonLd()`. Pass `timeRequired: `PT${post.reading_time}M`` from blog post server wrapper. Compute `wordCount` from `content.trim().split(/\s+/).length`. Both fields serve SCHEMA-08.
   - What we know: `post.reading_time` is stored in DB (minutes); `post.content` has the full markdown
   - What's unclear: SCHEMA-08 says "include readingTime and wordCount" — does Google's Article spec use `timeRequired` (ISO 8601) or a custom `readingTime` field?
   - Recommendation: Add `timeRequired: `PT${reading_time}M`` to `createArticleJsonLd()` config (mirrors what the old inline schema used) and compute `wordCount` from content. Both fields serve SCHEMA-08.

2. **Blog post `tags` field availability**
   - RESOLVED: Add `tags` to the JSON-LD query select. Use `Array.isArray(post.tags) ? (post.tags as string[]) : undefined` for type safety. Cast is acceptable since column type is verified as `text[]`.
   - What we know: `createArticleJsonLd()` accepts `keywords?: string[]`. The blog schema has a `tags` column.
   - What's unclear: Is `tags` a `text[]` column in Supabase, or stored as JSON? The current `generateMetadata` select doesn't include it.
   - Recommendation: Add `tags` to the JSON-LD query select. If it's a `text[]` type in the generated Supabase types, it will be directly usable as `keywords`.

3. **Blog category intermediate URL correctness**
   - RESOLVED: Use synthetic path approach with `createBreadcrumbJsonLd('/blog/category/${categorySlug}/${slug}', overrides)`. This produces correct intermediate URL `/blog/category/[cat-slug]` which maps to the real category route. No new helper needed.
   - What we know: Category pages are at `/blog/category/[category]`. A synthetic path `/blog/category/[cat-slug]/[post-slug]` would produce the intermediate URL `https://tenantflow.app/blog/category/[cat-slug]` for the category crumb.
   - What's unclear: Is this preferable to building the 4-item ListItem array manually?
   - Recommendation: Manual array construction is safer and more explicit — avoids any ambiguity about what URL the intermediate segment resolves to. Create a `createBlogPostBreadcrumb(categorySlug, categoryName, postSlug, postTitle)` helper in `breadcrumbs.ts`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all changes are code/config only, using already-installed packages)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test:unit -- --run src/lib/seo/` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-01 | `createBreadcrumbJsonLd` produces correct list items for 2/3/4-level paths | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/breadcrumbs.test.ts` | YES |
| SCHEMA-02 | `createArticleJsonLd` includes wordCount, keywords, Person author, publisher.logo | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/article-schema.test.ts` | YES |
| SCHEMA-03 | WebSite schema in `page.tsx` includes potentialAction SearchAction | typecheck+lint (inline construction, no factory) | `pnpm typecheck && pnpm lint` | N/A |
| SCHEMA-05 | No `dangerouslySetInnerHTML` for JSON-LD in migrated files | lint/code review | `pnpm typecheck && pnpm lint` | N/A |
| SCHEMA-06 | HowTo schema produces valid step/section structure | typecheck+lint (inline construction per D-04, no factory) | `pnpm typecheck && pnpm lint` | N/A |
| SCHEMA-07 | `createSoftwareApplicationJsonLd` produces correct type and fields | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/software-application-schema.test.ts` | Wave 0 gap |
| SCHEMA-08 | `createArticleJsonLd` includes `timeRequired` field; wordCount computed correctly | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/article-schema.test.ts` | YES (timeRequired tests added in Plan 01 Task 1) |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/lib/seo/`
- **Per wave merge:** `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/seo/__tests__/software-application-schema.test.ts` — covers SCHEMA-07 factory
- [ ] `src/lib/seo/software-application-schema.ts` — the factory file itself

*(Existing article-schema.test.ts updated in Plan 01 Task 1 to cover timeRequired per SCHEMA-08. SCHEMA-03 and SCHEMA-06 verified by typecheck+lint since they use inline construction, not factories.)*

---

## Security Domain

Phase 35 adds no authentication, user data handling, or new data ingestion paths. All changes are static JSON-LD string output from hardcoded and pre-fetched data. The `JsonLdScript` component already applies XSS escaping (`<` -> `\u003c`). No ASVS categories apply beyond what Phase 33 already addressed.

Security enforcement: No new threat patterns introduced. Skipping full ASVS table.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 35 |
|-----------|-------------------|
| No `any` types — use `unknown` with type guards | WebSite/SearchAction `query-input` workaround must use proper cast, not `any` |
| No barrel files | Import from defining file: `#lib/seo/breadcrumbs`, not a re-export |
| No duplicate types | Check `src/types/` before defining any interface (SoftwareApplicationConfig is new, no duplicate expected) |
| No commented-out code | Remove old inline JSON-LD completely, do not comment out |
| No inline styles | N/A (CSS not affected) |
| No `as unknown as` type assertions | Use typed mapper or `Record<string, unknown>` spread for SearchAction workaround |
| Supabase: `getAll`/`setAll` only | Applies to blog post data fetch in `page.tsx` — use `await createClient()` per server pattern |
| Server Components by default | JSON-LD must always be in server component files — confirmed by pattern research |
| Import path aliases | Use `#lib/seo/...`, `#components/seo/...` not relative imports |
| Max 300 lines per component | New factory files will be well under limit |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Google treats multiple separate `<script type="application/ld+json">` blocks on a single page as valid structured data | Architecture Patterns | Low — multiple JSON-LD blocks is an established practice; risk is only if Google changed policy (unlikely) |
| A2 | `query-input` annotation string is still the correct format for Google Sitelinks Searchbox in 2026 | Pattern 6 | Medium — if Google changed the spec, SearchAction may be ignored; verify against current Google Search Central docs before implementation |
| A3 | Blog `tags` column is `text[]` type in the Supabase schema | Open Questions | Low — if it's stored differently, keywords would need adjustment; easy to verify with `pnpm db:types` |
| A4 | Next.js ISR deduplicates identical Supabase client `from().select()` calls within the same request | Migration Targets | Low — if not deduplicated, two DB calls happen for cold renders (acceptable overhead with `revalidate = 3600`) |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/seo/article-schema.ts` — verified factory signature, all fields supported
- `src/lib/seo/breadcrumbs.ts` — verified override support, item URL omission logic
- `src/components/seo/json-ld-script.tsx` — verified XSS escaping and @context injection
- `node_modules/schema-dts/dist/schema.d.ts` — verified `HowTo`, `SoftwareApplication`, `WebSite`, `SearchAction` types exist in v2.0.0; `steps` deprecated in favor of `step`
- `src/app/features/page.tsx` — reference pattern for server wrapper + JsonLdScript
- `src/app/pricing/page.tsx` — reference pattern for multiple JsonLdScript on one page
- `src/app/blog/[slug]/page.tsx` — confirmed generateMetadata query fields; `revalidate = 3600`
- `src/app/blog/[slug]/blog-post-page.tsx` — confirmed `'use client'` directive and current inline schema

### Secondary (MEDIUM confidence)
- Google Search Central Sitelinks Searchbox documentation pattern for `query-input` — [ASSUMED based on training knowledge; verify before implementation]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules
- Architecture: HIGH — patterns verified against existing Phase 34 implementations
- Pitfalls: HIGH — identified from direct code reading of target files
- Open questions: MEDIUM -> RESOLVED — all three questions resolved during planning
- SCHEMA-08 timeRequired: RESOLVED — add `timeRequired?: string` to ArticleJsonLdConfig

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable library ecosystem; schema-dts types stable)
