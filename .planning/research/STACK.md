# Technology Stack

**Project:** TenantFlow v1.6 - SEO & Google Indexing Optimization
**Researched:** 2026-04-08
**Overall confidence:** HIGH

## Verdict: 1 Dev Dependency, 0 Runtime Dependencies

This milestone adds **one** dev dependency (`schema-dts`) for type-safe JSON-LD authoring. Everything else uses native Next.js 16 APIs, existing Vercel tooling already in the project, or pure implementation patterns (no libraries needed).

The SEO work is almost entirely about **correct usage of existing capabilities** -- the project already has `generateMetadata()`, `sitemap.ts`, `robots.txt`, JSON-LD injection, OG tags, and Vercel Speed Insights. The gap is completeness and consistency, not missing tools.

## Stack Additions

### Dev Dependencies (Build-Time Only)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| schema-dts | 2.0.0 | TypeScript types for Schema.org JSON-LD | Type-safe structured data authoring; catches schema errors at compile time, not after deployment; 100K+ weekly npm downloads; by Google; zero runtime cost (types only) |

**Install:**
```bash
pnpm add -D schema-dts@^2.0.0
```

`schema-dts` is a dev dependency because it exports only TypeScript type definitions -- no JavaScript ships to the browser. The `WithContext<T>` generic enforces correct `@context` and `@type` fields. The `Graph` type supports multi-entity `@graph` arrays. Version 2.0.0 (released March 2026) drops the TypeScript peer dependency, so it works as a regular dev dep without version conflicts.

### Runtime Dependencies: None

No runtime packages. Next.js 16 metadata API, native `sitemap.ts`, and `<script type="application/ld+json">` injection handle everything.

## What Next.js 16 Handles Natively (DO NOT Add Libraries For)

### Metadata Management -- Native `generateMetadata()`
Already used on 3 dynamic routes (`blog/[slug]`, `compare/[competitor]`, root layout). The project also has a `generate-metadata.ts` utility with lazy-initialized defaults, `metadataBase`, `title.template`, OG images, and Twitter cards.

**What to extend (not replace):**
- Add `generateMetadata()` to the 8 public pages currently missing it (help, search, blog/category/[category], resources/*, features, blog hub)
- Ensure every public page has `alternates.canonical`
- Ensure OG image dimensions are consistent (1200x630)

**DO NOT add:** `next-seo`, `next-metadata`, or any metadata management library. Next.js `Metadata` type handles title templates, OG, Twitter, robots, alternates, and canonical URLs natively. These libraries were useful in Pages Router; they are redundant in App Router.

### Sitemap Generation -- Native `sitemap.ts` + `generateSitemaps()`
The project has `src/app/sitemap.ts` generating a flat sitemap with marketing + blog pages. Next.js natively supports:
- `sitemap.ts` returning `MetadataRoute.Sitemap` (already used)
- `generateSitemaps()` for splitting into multiple sitemaps with `sitemap/[id].xml` URLs
- ISR caching via `export const revalidate` (already set to 86400)

**What to extend:**
- Split into category sitemaps using route-based sitemap files (e.g., `src/app/blog/sitemap.ts`, `src/app/compare/sitemap.ts`)
- Add missing pages: `help`, `support`, `search`, `security-policy`, resource detail pages, blog category pages
- Delete stale `public/sitemap.xml` and `public/sitemap-index.xml` (static files from pre-dynamic era that shadow the dynamic route)

**DO NOT add:** `next-sitemap`. The npm package adds a post-build step, its own config file, and generates static XML. Native `sitemap.ts` is simpler, runs at request time with ISR caching, and the project already uses it. `next-sitemap` would be a downgrade.

### robots.txt -- Native `robots.ts` (Upgrade from Static File)
The project currently has `public/robots.txt` (static). Next.js supports `src/app/robots.ts` returning `MetadataRoute.Robots` with programmatic rules, which is better because:
- Environment-aware (can reference `env.NEXT_PUBLIC_APP_URL` for sitemap URL)
- Type-safe via `MetadataRoute.Robots`
- No stale static file to maintain

**What to do:**
- Convert `public/robots.txt` to `src/app/robots.ts`
- Remove invalid directives (`Request-rate`, `Host` -- not part of robots.txt spec, ignored by all major crawlers)
- Keep Googlebot/Bingbot-specific rules, social bot allowances, and SEO bot blocks

### JSON-LD Injection -- Native `<script>` in Server Components
Next.js official guidance (as of 2025-2026) is to render JSON-LD as a `<script type="application/ld+json">` tag directly in page/layout components. There is no native `Metadata.structuredData` API -- this is an open feature request (vercel/next.js Discussion #70652) that has not been implemented.

The project already uses this pattern in 9 pages. The improvement is:
- Type-safe authoring with `schema-dts` types instead of raw object literals
- Centralized JSON-LD builder utilities (avoid copy-pasting `@context` and `replace(/</g, '\\u003c')` in every page)
- Expand schema coverage to all public pages

### Open Graph & Twitter Cards -- Native Metadata API
Already implemented in the root layout and blog detail pages. Coverage gaps exist on comparison pages (missing images), resource pages, and some marketing pages. This is a content/metadata audit, not a tooling gap.

### Core Web Vitals Monitoring -- Vercel Speed Insights (Already Installed)
The project already has `@vercel/speed-insights` and `@vercel/analytics` in the root layout, rendering in production only. These provide:
- Real User Monitoring (RUM) for LCP, INP, CLS
- 75th percentile tracking (what Google actually uses)
- Per-route breakdowns in the Vercel dashboard

**DO NOT add:** `web-vitals` npm package, Lighthouse CI, or `playwright-lighthouse`. Vercel Speed Insights already collects the exact CWV metrics Google uses for ranking. Adding synthetic testing tools (Lighthouse) for CI is overkill for this milestone -- the project has 2 E2E specs, not hundreds of pages to regression-test. Manual Lighthouse audits in Chrome DevTools are sufficient for the handful of public pages.

### Google Search Console Verification -- Static File or Meta Tag
GSC verification does not require a library. The standard approach for Vercel-hosted Next.js sites:
1. Add Google's HTML verification file to `public/` (e.g., `public/google[hash].html`)
2. OR add meta tag via `generateMetadata()` in root layout: `verification: { google: 'your-verification-code' }`

Next.js `Metadata` type includes a `verification` field that generates `<meta name="google-site-verification">` natively.

**DO NOT add:** `@googleapis/searchconsole` (v5.0.0). This is a server-side SDK for programmatically querying Search Console data (search analytics, URL inspection). It requires Google OAuth service account credentials and a Node.js server runtime. The milestone scope is SEO readiness (verification, structured data, sitemaps), not building a Search Console analytics dashboard. If GSC data integration is wanted later, it would be an Edge Function or server action -- but that is out of scope for v1.6.

## What Already Exists and Should Be Extended (Not Replaced)

### Existing JSON-LD Coverage

| Page | Schema Types Present | Gap |
|------|---------------------|-----|
| Root layout (`SeoJsonLd`) | Organization, SoftwareApplication | Good -- keep as global schemas |
| `/faq` | FAQPage, BreadcrumbList | Good -- complete |
| `/about` | Organization (local) | Missing BreadcrumbList |
| `/contact` | ContactPoint/LocalBusiness | Missing BreadcrumbList |
| `/pricing` | Product, Offer, BreadcrumbList | Good -- complete |
| `/features` | BreadcrumbList | Missing SoftwareApplication features detail |
| `/resources` | CollectionPage, BreadcrumbList | Good -- complete |
| `/blog/[slug]` | BlogPosting | Missing BreadcrumbList, missing mainEntityOfPage |
| `/compare/[competitor]` | Webpage comparison | Missing BreadcrumbList |
| `/blog` hub | None | Needs CollectionPage + BreadcrumbList |
| `/blog/category/[category]` | None | Needs CollectionPage + BreadcrumbList |
| `/help` | None | Needs FAQPage or WebPage + BreadcrumbList |
| `/support` | None | Needs ContactPoint + BreadcrumbList |
| `/search` | None | Needs SearchAction (WebSite schema) |
| `/terms`, `/privacy`, `/security-policy` | None | Needs WebPage + BreadcrumbList |
| Resource detail pages (3) | None | Needs HowTo or Article + BreadcrumbList |

### Existing Metadata Coverage

Pages with `generateMetadata()` or `export const metadata`: blog/[slug], compare/[competitor], root layout, plus ~19 owner/tenant layouts. Public marketing pages mostly inherit from the root layout's `title.template` but lack page-specific descriptions and canonical URLs.

### Existing Sitemap

`src/app/sitemap.ts` generates ~20 URLs. Missing: `help`, `support`, `search`, `security-policy`, blog category pages, resource detail pages. The stale `public/sitemap.xml` (15 entries, dated 2025-02-11) shadows the dynamic route and should be deleted.

## Recommended Architecture for JSON-LD Utilities

No library needed -- build utility functions using `schema-dts` types:

```typescript
// src/lib/seo/json-ld.ts
import type { WithContext, FAQPage, BreadcrumbList, BlogPosting, WebPage } from 'schema-dts'

const SITE_URL = 'https://tenantflow.app'

export function breadcrumbJsonLd(items: Array<{ name: string; url?: string }>): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {})
    }))
  }
}

export function blogPostJsonLd(post: BlogPostData): WithContext<BlogPosting> {
  // Type-checked at compile time
}

export function faqJsonLd(questions: Array<{ q: string; a: string }>): WithContext<FAQPage> {
  // Type-checked at compile time
}
```

This pattern:
- Centralizes the `@context` boilerplate
- Enforces correct schema types via TypeScript (compile-time, not runtime)
- Can be unit-tested with Vitest
- Eliminates the `dangerouslySetInnerHTML` + `replace(/</g, '\\u003c')` copy-paste across 15+ pages

### JSON-LD Renderer Component (Existing Pattern, Improved)

```typescript
// src/components/seo/json-ld-script.tsx (replaces current seo-json-ld.tsx pattern)
import type { Thing, WithContext } from 'schema-dts'

interface JsonLdScriptProps {
  data: WithContext<Thing> | Array<WithContext<Thing>>
}

export function JsonLdScript({ data }: JsonLdScriptProps) {
  const schemas = Array.isArray(data) ? data : [data]
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={`jsonld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c')
          }}
        />
      ))}
    </>
  )
}
```

## SEO Testing Strategy (No New Dependencies)

### Unit Tests (Vitest -- Already in Stack)

Test JSON-LD builder functions output valid schema shapes:
```typescript
// src/lib/seo/__tests__/json-ld.test.ts
describe('breadcrumbJsonLd', () => {
  it('generates valid BreadcrumbList schema', () => {
    const result = breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'Blog' }])
    expect(result['@type']).toBe('BreadcrumbList')
    expect(result.itemListElement).toHaveLength(2)
  })
})
```

### E2E Validation (Playwright -- Already in Stack)

Add SEO smoke tests checking meta tags and JSON-LD presence on public pages:
```typescript
// tests/e2e/tests/seo-smoke.spec.ts
test('homepage has required meta tags', async ({ page }) => {
  await page.goto('/')
  const title = await page.title()
  expect(title).toContain('TenantFlow')
  const description = page.locator('meta[name="description"]')
  await expect(description).toHaveAttribute('content', expect.stringContaining('property management'))
  const jsonLd = page.locator('script[type="application/ld+json"]')
  expect(await jsonLd.count()).toBeGreaterThan(0)
})
```

### Manual Validation (No Library)

- Google Rich Results Test (https://search.google.com/test/rich-results) -- paste URLs after deployment
- Schema Markup Validator (https://validator.schema.org/) -- validate JSON-LD snippets during development
- Google Search Console -- monitor indexing after verification

**There is no programmatic API for Rich Results Test** -- Google deprecated the old Structured Data Testing Tool API and never provided a replacement. Manual testing after deploy is the standard workflow.

## Anti-Additions: What NOT to Add

| Library | Why It Seems Tempting | Why Not | What to Do Instead |
|---------|----------------------|---------|-------------------|
| `next-seo` | Popular SEO package | Redundant -- Next.js `Metadata` API does everything `next-seo` does (title templates, OG, canonical, robots). Was useful in Pages Router; unnecessary in App Router. | Use native `generateMetadata()` |
| `next-sitemap` | Auto-generates sitemaps | Adds post-build step, config file, and static XML generation. Native `sitemap.ts` is already in the project and runs dynamically with ISR. | Extend existing `sitemap.ts` + add route-level sitemaps |
| `@googleapis/searchconsole` | Query GSC data | Requires OAuth service account, server runtime. Out of scope -- milestone is SEO readiness, not analytics dashboard. | Verify via meta tag, use GSC web UI manually |
| `web-vitals` | Core Web Vitals | Already have `@vercel/speed-insights` which collects the same metrics with a better dashboard. Adding `web-vitals` is redundant. | Use existing Vercel Speed Insights |
| `lighthouse` / `playwright-lighthouse` | CI performance testing | `playwright-lighthouse` last updated 2 years ago. Synthetic tests are less accurate than RUM. Only ~20 public pages -- manual Lighthouse audits suffice. | Manual Chrome DevTools Lighthouse + Vercel Speed Insights RUM |
| `react-schemaorg` | JSX wrapper for JSON-LD | Adds a React component layer around `<script>` injection. Unnecessary -- the 5-line `JsonLdScript` component does the same thing without a dependency. | Build a simple typed component |
| `schema-org` (Harlan Wilton's) | Unhead-based schema management | Designed for Nuxt/Vue/Unhead ecosystem. Does not integrate with Next.js metadata API. | Use `schema-dts` types + custom builders |

## Stale Files to Remove

| File | Why Remove |
|------|-----------|
| `public/sitemap.xml` | Static file from 2025-02-11 with 15 entries. Shadows the dynamic `src/app/sitemap.ts` route. Crawlers may hit this instead of the dynamic version. |
| `public/sitemap-index.xml` | Points to `public/sitemap.xml`. Stale and misleading. |
| `public/robots.txt` | Will be replaced by `src/app/robots.ts` for dynamic generation. Static file would shadow the route. |

## Google Search Console Verification

No library needed. Two options:

**Option A (Recommended): Meta tag via Metadata API**
```typescript
// src/app/layout.tsx generateMetadata()
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...metadata,
    verification: {
      google: 'your-verification-string-from-gsc',
    },
  }
}
```
This is built into Next.js `Metadata` type. No extra dependency.

**Option B: HTML file**
Drop `public/google[hash].html` from GSC into `public/`. Vercel serves it as a static asset.

Either method is permanent and survives deployments. Option A is cleaner (no stray files in `public/`).

## Summary Table

| Category | Decision | Rationale |
|----------|----------|-----------|
| Structured data types | Add `schema-dts@^2.0.0` (dev) | Type-safe JSON-LD authoring; zero runtime cost; by Google |
| Metadata management | Use native `generateMetadata()` | Already covers everything; extend to all public pages |
| Sitemap generation | Extend native `sitemap.ts` | Already dynamic with ISR; split into route-level sitemaps |
| robots.txt | Convert to native `robots.ts` | Dynamic, type-safe, environment-aware |
| Core Web Vitals | Keep `@vercel/speed-insights` | Already installed; RUM is better than synthetic tests |
| JSON-LD injection | Build typed utility functions | 1 component + 4-5 builder functions using schema-dts types |
| SEO testing | Vitest (unit) + Playwright (E2E smoke) | Already in stack; add SEO-specific test files |
| GSC verification | `Metadata.verification` field | Native Next.js; no library needed |
| New runtime deps | None | Zero bundle size impact |

## Version Compatibility

| Technology | Version | Compatibility Notes |
|------------|---------|---------------------|
| schema-dts | 2.0.0 | TypeScript 5.9+ compatible; no peer deps in v2; types-only package |
| Next.js Metadata API | 16.1.7 | `generateMetadata()`, `MetadataRoute.Sitemap`, `MetadataRoute.Robots` all stable |
| Vercel Speed Insights | ^1.3.1 (installed) | CWV monitoring active in production |
| Vercel Analytics | ^1.6.1 (installed) | Page view and route tracking active |

## Sources

- [Next.js JSON-LD Guide](https://nextjs.org/docs/app/guides/json-ld) -- official recommendation is `<script>` tag injection, no native Metadata API field (HIGH confidence)
- [Next.js generateSitemaps](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps) -- native multi-sitemap support via route-based splitting (HIGH confidence)
- [Next.js Metadata Files: sitemap.xml](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) -- `MetadataRoute.Sitemap` type and ISR caching (HIGH confidence)
- [Next.js Metadata Files: robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) -- `MetadataRoute.Robots` for dynamic robots.ts (HIGH confidence)
- [schema-dts on npm](https://www.npmjs.com/package/schema-dts) -- v2.0.0, 100K+ weekly downloads, by Google (HIGH confidence)
- [schema-dts GitHub releases](https://github.com/google/schema-dts/releases) -- v2.0.0 changelog: drops TS peer dep, adds schema-dts-lib (HIGH confidence)
- [Vercel Speed Insights docs](https://vercel.com/docs/speed-insights) -- RUM-based CWV monitoring, already in project (HIGH confidence)
- [Vercel preview deployment indexing](https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines) -- automatic `X-Robots-Tag: noindex` on preview deploys (HIGH confidence)
- [Google Search Console verification methods](https://support.google.com/webmasters/answer/9008080) -- meta tag, HTML file, DNS TXT record options (HIGH confidence)
- [@googleapis/searchconsole on npm](https://www.npmjs.com/package/@googleapis/searchconsole) -- v5.0.0, requires OAuth service account; scope confirmed as out of v1.6 (MEDIUM confidence)
- [vercel/next.js Discussion #70652](https://github.com/vercel/next.js/discussions/70652) -- Feature request for native `structuredData` in Metadata API; NOT implemented as of Next.js 16.1 (HIGH confidence)
- [Rich Results Test](https://search.google.com/test/rich-results) -- manual validation only; no programmatic API available (HIGH confidence)
- Codebase analysis of 9 pages with existing JSON-LD, sitemap.ts, robots.txt, generate-metadata.ts (HIGH confidence)
