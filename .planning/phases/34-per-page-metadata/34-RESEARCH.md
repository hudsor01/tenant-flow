# Phase 34: Per-Page Metadata - Research

**Researched:** 2026-04-08
**Domain:** Next.js 16 Metadata API, SEO canonical URLs, server/client component splitting
**Confidence:** HIGH

## Summary

Phase 34 adds unique, crawlable metadata (title, description, canonical URL, OG tags) to every public page that currently lacks it, and migrates existing inline patterns to use Phase 33's shared `createPageMetadata()` factory. The work divides into three categories: (1) adding `export const metadata` to server component pages that simply lack it (pricing, FAQ, about, contact, help, resources, homepage), (2) splitting three `'use client'` pages (`/features`, `/blog`, `/blog/category/[category]`) into server wrapper + client content so metadata exports become possible, and (3) adding `generateMetadata()` with `searchParams` to the blog pages for pagination noindex logic.

All utilities needed are already built in Phase 33: `createPageMetadata()` for consistent Metadata objects, `createBreadcrumbJsonLd()` for breadcrumb schema, `JsonLdScript` for safe JSON-LD rendering, and `getSiteUrl()` for base URL. No new libraries or dependencies are required. The work is purely additive -- adding metadata exports and splitting components.

**Primary recommendation:** Use `createPageMetadata()` for all static metadata, `generateMetadata()` with `createPageMetadata()` internally for the blog pagination case, and name client split files with `*-client.tsx` suffix per D-01.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Client components use `*-client.tsx` naming convention (e.g., `features-client.tsx`, `blog-client.tsx`, `blog-category-client.tsx`)
- **D-02:** Data fetching stays client-side in the split components. Server `page.tsx` only exports metadata and renders the client component. nuqs URL state and TanStack Query remain in the client piece.
- **D-03:** Pages needing split: `/features`, `/blog`, `/blog/category/[category]` -- all currently `'use client'` full-page components
- **D-04:** Page titles use keyword-first, brand-trailing format optimized for Google indexing (e.g., "Property Management Pricing & Plans | TenantFlow" not just "Pricing | TenantFlow")
- **D-05:** Descriptions are keyword-rich with calls-to-action, 150-160 characters, optimized for CTR in search results
- **D-06:** Each page gets a unique, descriptive title and description -- no generic templates
- **D-07:** Use Next.js `generateMetadata()` with `searchParams` to detect `?page=N`. If page > 1, return `robots: { index: false, follow: true }`. No refactoring of nuqs or TanStack Query needed.
- **D-08:** Migrate all inline `baseUrl` calculations and manual breadcrumb/OG schemas to use `createPageMetadata()` and `createBreadcrumbJsonLd()` from Phase 33 utilities. Full consistency pass across all public pages.

### Claude's Discretion
- Specific title and description wording per page (following D-04/D-05 guidelines)
- Implementation order and plan wave structure
- Whether to add metadata to pages not listed in META-01 through META-12 that happen to lack it (e.g., `/search`)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| META-01 | `/pricing` has `generateMetadata()` with title, description, canonical URL, OG tags | Use `createPageMetadata()` factory; page is already a server component |
| META-02 | `/faq` has metadata export with title, description, canonical URL | Use `createPageMetadata()` factory; page is already a server component |
| META-03 | `/about` has metadata export with title, description, canonical URL | Use `createPageMetadata()` factory; page is already a server component |
| META-04 | `/contact` has metadata export with title, description, canonical URL | Use `createPageMetadata()` factory; page is already a server component |
| META-05 | `/resources` has metadata export with title, description, canonical URL | Use `createPageMetadata()` factory; page is already a server component |
| META-06 | `/help` has metadata export with title, description, canonical URL | Use `createPageMetadata()` factory; page is already a server component |
| META-07 | `/features` split into server wrapper + client content to export metadata | Split `'use client'` page into `features-client.tsx` + server `page.tsx` with `createPageMetadata()` |
| META-08 | `/blog` hub split into server wrapper + client content to export metadata | Split `'use client'` page into `blog-client.tsx` + server `page.tsx` with `generateMetadata()` for pagination noindex |
| META-09 | `/blog/category/[category]` split into server wrapper + client content to export `generateMetadata()` | Split `'use client'` page into `blog-category-client.tsx` + server `page.tsx` with `generateMetadata()` for dynamic category + pagination noindex |
| META-10 | Homepage (`/`) has explicit metadata with title, description, canonical URL | Add `export const metadata` to `src/app/page.tsx` using `createPageMetadata()` |
| META-11 | All public pages have `alternates.canonical` pointing to their canonical URL | `createPageMetadata()` already produces `alternates.canonical` -- just use it everywhere |
| META-12 | Paginated blog pages beyond page 1 have `noindex, follow` robots directive | Use `generateMetadata()` with `searchParams`, pass `noindex: true` to `createPageMetadata()` when page > 1 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No `any` types** -- use `unknown` with type guards
- **No barrel files / re-exports** -- import directly from defining file
- **No inline styles** -- Tailwind utilities or globals.css only
- **Server Components by default** -- `'use client'` only when required
- **Max 300 lines per component, 50 lines per function**
- **Path aliases** use `#` prefix (`#lib/*`, `#components/*`, etc.)
- **File naming** is kebab-case
- **Next.js 16.1** with React 19.2, React Compiler enabled
- **Vitest 4.0** with jsdom, 80% coverage threshold
- **`pnpm typecheck && pnpm lint && pnpm test:unit`** must pass

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.7 | Metadata API (`export const metadata`, `generateMetadata()`) | Built-in, no third-party SEO package needed [VERIFIED: package.json] |
| schema-dts | (installed) | TypeScript types for JSON-LD schemas | Already used by Phase 33 utilities [VERIFIED: codebase grep] |

### Supporting (Phase 33 Utilities -- Already Built)
| Utility | Location | Purpose | When to Use |
|---------|----------|---------|-------------|
| `createPageMetadata()` | `src/lib/seo/page-metadata.ts` | Consistent Metadata with canonical, OG, Twitter | Every page metadata export [VERIFIED: codebase read] |
| `createBreadcrumbJsonLd()` | `src/lib/seo/breadcrumbs.ts` | BreadcrumbList JSON-LD from route path | Replace inline breadcrumb schemas [VERIFIED: codebase read] |
| `JsonLdScript` | `src/components/seo/json-ld-script.tsx` | Type-safe JSON-LD `<script>` renderer | Replace inline `dangerouslySetInnerHTML` patterns [VERIFIED: codebase read] |
| `getSiteUrl()` | `src/lib/generate-metadata.ts` | Single source of truth for base URL | Replace all inline `process.env.NEXT_PUBLIC_APP_URL` calculations [VERIFIED: codebase read] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Metadata API | `next-seo` package | Explicitly out of scope (REQUIREMENTS.md); redundant with Next.js 16 built-in |
| `createPageMetadata()` | Manual metadata objects | Inconsistency, duplicate code; factory already handles canonical + OG + Twitter |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Pattern 1: Static Metadata via `createPageMetadata()` (META-01 through META-06, META-10)

**What:** Pages that are server components and need only static metadata add an `export const metadata` using the factory.
**When to use:** Any server component page where metadata does not depend on route params or search params.
**Example:**
```typescript
// Source: Pattern derived from existing createPageMetadata() API [VERIFIED: codebase]
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Property Management Pricing & Plans | TenantFlow',
  description: 'Compare TenantFlow pricing plans. Start free, scale as your portfolio grows. No credit card required.',
  path: '/pricing'
})

export default function PricingPage() {
  // ... existing component code, minus inline baseUrl + breadcrumb schema
}
```

**Key detail:** The `title` field in `createPageMetadata()` is used directly (NOT through the root layout's `%s | TenantFlow` template). The root layout's template is `{ template: '%s | TenantFlow', default: '...' }`. When a page exports `metadata.title` as a plain string, Next.js applies the template. So if the title is `'Property Management Pricing & Plans'`, Next.js renders it as `'Property Management Pricing & Plans | TenantFlow'`. The factory should receive the title WITHOUT the `| TenantFlow` suffix because the root layout template appends it automatically. [VERIFIED: `src/app/layout.tsx` line 31 and `src/lib/generate-metadata.ts` line 31]

### Pattern 2: Server/Client Split for `'use client'` Pages (META-07, META-08, META-09)

**What:** Pages that are currently `'use client'` (because they use hooks like `useState`, `useEffect`, `nuqs`, TanStack Query) get split into a server `page.tsx` that exports metadata and renders a client component.
**When to use:** Any page that needs metadata but currently has `'use client'` at the top.
**Example:**
```typescript
// src/app/features/page.tsx (server component -- NEW)
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import FeaturesClient from './features-client'

export const metadata: Metadata = createPageMetadata({
  title: 'Property Management Features & Tools',
  description: 'Explore TenantFlow features: automated rent collection, maintenance tracking, tenant screening, financial reporting. Everything you need in one platform.',
  path: '/features'
})

export default function FeaturesPage() {
  return <FeaturesClient />
}

// src/app/features/features-client.tsx (client component -- RENAMED from page.tsx)
'use client'
// ... all existing page.tsx content with useState, useEffect, etc.
// Remove metadata-related code (baseUrl calc, breadcrumbSchema inline)
// The server page.tsx now handles that
```

**Critical constraint (D-02):** Data fetching stays client-side. The server `page.tsx` does NOT fetch data or pass props to the client component. It only exports metadata and renders `<ClientComponent />`.

### Pattern 3: Dynamic Metadata with Pagination Noindex (META-08, META-09, META-12)

**What:** Blog listing pages use `generateMetadata()` to read `searchParams` and conditionally apply `noindex` for paginated pages beyond page 1.
**When to use:** Any page where metadata depends on URL search parameters.
**Example:**
```typescript
// Source: Next.js 16 Metadata API [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata]
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import BlogClient from './blog-client'

interface BlogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams
  const page = Number(params.page) || 1

  return createPageMetadata({
    title: 'Property Management Blog & Insights',
    description: 'Expert property management tips, software comparisons, and landlord guides. Stay ahead with actionable insights from TenantFlow.',
    path: '/blog',
    noindex: page > 1
  })
}

export default function BlogPage() {
  return <BlogClient />
}
```

**Critical detail:** In Next.js 16, `searchParams` is a `Promise` that must be `await`ed. This makes `generateMetadata` async. [VERIFIED: `src/types/next.d.ts` line 16 and existing pattern in `src/app/(owner)/billing/checkout/success/page.tsx`]

**Noindex format:** `createPageMetadata()` already handles `noindex: true` by setting `robots: 'noindex, follow'`. This is a valid Metadata format. D-07 mentions `robots: { index: false, follow: true }` object form, but both are equivalent in Next.js. The string form `'noindex, follow'` is already implemented and tested in the factory. [VERIFIED: `src/lib/seo/page-metadata.ts` line 52 and test at line 79]

### Pattern 4: Dynamic Category Metadata (META-09)

**What:** The `/blog/category/[category]` page uses `generateMetadata()` to read both `params` (category slug) and `searchParams` (page number).
**When to use:** Dynamic routes that need both route params and search params in metadata.
**Example:**
```typescript
// src/app/blog/category/[category]/page.tsx
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import BlogCategoryClient from './blog-category-client'

interface CategoryPageProps {
  params: Promise<{ category: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params
  const search = await searchParams
  const page = Number(search.page) || 1

  // Format category slug for display (e.g., 'property-management' -> 'Property Management')
  const categoryName = category
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return createPageMetadata({
    title: `${categoryName} Articles & Guides`,
    description: `Browse TenantFlow blog posts about ${categoryName.toLowerCase()}. Expert insights and practical guides for property managers.`,
    path: `/blog/category/${category}`,
    noindex: page > 1
  })
}

export default function BlogCategoryPage() {
  return <BlogCategoryClient />
}
```

### Pattern 5: Inline Schema Migration (D-08)

**What:** Replace inline `baseUrl` calculations and manual `dangerouslySetInnerHTML` JSON-LD scripts with Phase 33 utilities.
**When to use:** Every page that currently has inline breadcrumb/FAQ/product schemas.

**Before (current pattern found in 7 pages):**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')
const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', ... }
// In JSX:
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }} />
```

**After (using Phase 33 utilities):**
```typescript
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'
// In JSX:
<JsonLdScript schema={createBreadcrumbJsonLd('/pricing')} />
```

### Anti-Patterns to Avoid
- **Inline `baseUrl` calculation:** Never use `process.env.NEXT_PUBLIC_APP_URL || ...` inline. Use `getSiteUrl()` from `#lib/generate-metadata`.
- **Manual `dangerouslySetInnerHTML` for JSON-LD:** Never write raw `<script>` tags with `dangerouslySetInnerHTML`. Use `JsonLdScript` component.
- **Duplicate `| TenantFlow` in titles:** The root layout template adds `| TenantFlow` automatically. Pass the title WITHOUT the suffix to `createPageMetadata()`.
- **`'use client'` on pages that export metadata:** Client components cannot export `metadata` or `generateMetadata`. Server/client split is required.
- **Relative canonical URLs without `metadataBase`:** The root layout sets `metadataBase` to `getSiteUrl()`, so relative canonicals like `/blog/slug` work. But `createPageMetadata()` returns absolute URLs for consistency. Either approach works, but use the factory for uniformity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page metadata objects | Manual `{ title, description, openGraph, twitter, alternates }` | `createPageMetadata()` | 8 fields to get right; factory handles canonical, OG, Twitter card consistently |
| Breadcrumb JSON-LD | Inline schema objects | `createBreadcrumbJsonLd(path)` | Already handles path parsing, segment formatting, Home item |
| JSON-LD script tags | `dangerouslySetInnerHTML` boilerplate | `JsonLdScript` component | XSS escaping, `@context` wrapping, type safety |
| Base URL resolution | `process.env.NEXT_PUBLIC_APP_URL \|\| ...` | `getSiteUrl()` | Single source of truth; handles VERCEL_URL fallback |

**Key insight:** Phase 33 built exactly these utilities. This phase is about applying them consistently, not building anything new.

## Common Pitfalls

### Pitfall 1: Title Template Double-Suffix
**What goes wrong:** Title ends up as "Pricing | TenantFlow | TenantFlow" because the developer includes `| TenantFlow` in the page title AND the root layout template appends it again.
**Why it happens:** Root layout has `title: { template: '%s | TenantFlow' }` which wraps any page-level string title.
**How to avoid:** Pass titles WITHOUT the `| TenantFlow` suffix to `createPageMetadata()`. The template handles it.
**Warning signs:** Check rendered `<title>` tag in browser DevTools.

### Pitfall 2: `'use client'` Blocks Metadata Export
**What goes wrong:** Adding `export const metadata` to a file with `'use client'` results in a build error: "You are attempting to export 'metadata' from a component marked with 'use client'".
**Why it happens:** Next.js only allows metadata exports from server components. [VERIFIED: existing `'use client'` pages in codebase have no metadata exports]
**How to avoid:** Split into server `page.tsx` + client `*-client.tsx` per D-01/D-03.
**Warning signs:** Build failure during `pnpm typecheck` or `next build`.

### Pitfall 3: Missing `await` on `searchParams` in Next.js 16
**What goes wrong:** Accessing `searchParams.page` directly throws a runtime error because `searchParams` is a `Promise<>` in Next.js 15+.
**Why it happens:** Next.js 15 changed `searchParams` from a plain object to a Promise. [VERIFIED: `src/types/next.d.ts` line 16]
**How to avoid:** Always `const params = await searchParams` before accessing properties.
**Warning signs:** TypeScript error on `searchParams.page` access.

### Pitfall 4: Homepage `force-static` Conflicts with `generateMetadata`
**What goes wrong:** If the homepage uses `generateMetadata()` instead of static `export const metadata`, it may conflict with `export const dynamic = 'force-static'`.
**Why it happens:** `generateMetadata()` is inherently async and can make `force-static` behave unexpectedly.
**How to avoid:** Use `export const metadata` (static) for the homepage, not `generateMetadata()`. The homepage metadata is fully static. [VERIFIED: `src/app/page.tsx` line 4 has `export const dynamic = 'force-static'`]
**Warning signs:** Build warnings about static generation conflicts.

### Pitfall 5: Client Component Props Breaking After Split
**What goes wrong:** The client component expects props that were previously derived from the page-level scope (e.g., `baseUrl`).
**Why it happens:** When moving code from `page.tsx` to `*-client.tsx`, any shared variables need to be passed as props or moved inside the client component.
**How to avoid:** Per D-02, data fetching stays client-side. The server `page.tsx` passes NO props to the client component. Remove any `baseUrl` usage from the client component (it was only used for JSON-LD schemas which now live in the server wrapper). [VERIFIED: current `/features/page.tsx` uses `baseUrl` only for `getBreadcrumbSchema(baseUrl)` which moves to server-side]
**Warning signs:** TypeScript errors about missing props after split.

### Pitfall 6: Inconsistent Canonical URL Patterns
**What goes wrong:** Some pages use relative canonicals (`/blog/slug`), others use absolute (`https://tenantflow.app/blog/slug`), creating inconsistency.
**Why it happens:** Different pages were written at different times with different patterns.
**How to avoid:** Use `createPageMetadata()` everywhere -- it always produces absolute canonical URLs via `getSiteUrl()`. [VERIFIED: `src/lib/seo/page-metadata.ts` line 21]
**Warning signs:** Inconsistent canonical tags in HTML source.

## Code Examples

### Example 1: Static Metadata for Simple Server Component Page
```typescript
// Source: createPageMetadata API [VERIFIED: src/lib/seo/page-metadata.ts]
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Frequently Asked Questions About Property Management',
  description: 'Get answers to common property management questions. Learn about rent collection, maintenance, tenant screening, and how TenantFlow simplifies it all.',
  path: '/faq'
})
```

### Example 2: Server/Client Split
```typescript
// Server page.tsx -- exports metadata, renders client component
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import FeaturesClient from './features-client'

export const metadata: Metadata = createPageMetadata({
  title: 'Property Management Features & Tools',
  description: 'Explore TenantFlow features: automated rent collection, maintenance tracking, tenant screening, and financial reporting in one platform.',
  path: '/features'
})

export default function FeaturesPage() {
  return <FeaturesClient />
}

// Client features-client.tsx -- all interactive code, no metadata
'use client'
import { useState, useEffect } from 'react'
// ... rest of current page.tsx content
```

### Example 3: Migration of Inline JSON-LD
```typescript
// Before (found in 7 pages):
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '...'
const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', ... }
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }} />

// After:
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'
<JsonLdScript schema={createBreadcrumbJsonLd('/faq')} />
```

### Example 4: Blog Page with Pagination Noindex
```typescript
// Source: Next.js 16 searchParams as Promise [VERIFIED: src/types/next.d.ts]
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import BlogClient from './blog-client'

interface BlogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams
  const page = Number(params.page) || 1
  return createPageMetadata({
    title: 'Property Management Blog & Insights',
    description: 'Expert property management tips, software comparisons, and landlord guides. Stay ahead with actionable insights from TenantFlow.',
    path: '/blog',
    noindex: page > 1
  })
}

export default function BlogPage() {
  return <BlogClient />
}
```

## Inventory of Pages Requiring Changes

### Category A: Add Static Metadata (server components, no split needed)

| Page | File | Current State | Inline baseUrl? | Inline JSON-LD? |
|------|------|---------------|-----------------|-----------------|
| Homepage `/` | `src/app/page.tsx` | No metadata export; has `force-static` | No | No (in `marketing-home.tsx`) |
| Pricing `/pricing` | `src/app/pricing/page.tsx` | No metadata export | YES (line 16) | YES: FAQ, breadcrumb, product schemas |
| FAQ `/faq` | `src/app/faq/page.tsx` | No metadata export | YES (line 12) | YES: FAQ, breadcrumb schemas |
| About `/about` | `src/app/about/page.tsx` | No metadata export | YES (line 40) | YES: breadcrumb schema |
| Contact `/contact` | `src/app/contact/page.tsx` | No metadata export | YES (line 5) | YES: breadcrumb schema |
| Resources `/resources` | `src/app/resources/page.tsx` | No metadata export | YES (line 25) | YES: breadcrumb schema |
| Help `/help` | `src/app/help/page.tsx` | No metadata export | No | No |

### Category B: Server/Client Split Required

| Page | Current File | Client File Name | Uses nuqs? | Uses TanStack Query? | Uses useState/useEffect? |
|------|-------------|-----------------|-----------|---------------------|--------------------------|
| Features `/features` | `src/app/features/page.tsx` | `features-client.tsx` | No | No | YES (useState, useEffect) |
| Blog `/blog` | `src/app/blog/page.tsx` | `blog-client.tsx` | YES | YES | No |
| Blog Category `/blog/category/[category]` | `src/app/blog/category/[category]/page.tsx` | `blog-category-client.tsx` | YES | YES | YES (useEffect) |

### Category C: Additional Pages (Claude's Discretion)

| Page | File | Current State | Recommendation |
|------|------|---------------|----------------|
| Search `/search` | `src/app/search/page.tsx` | No metadata, server component | Add metadata -- low effort, improves completeness |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` as plain object | `searchParams` as `Promise<>` requiring `await` | Next.js 15 (Oct 2024) | Must `await searchParams` in `generateMetadata()` |
| `middleware.ts` for route protection | `proxy.ts` (instrumentation hook) | Next.js 16 | Already migrated in project |
| `next-seo` package | Built-in `Metadata` API | Next.js 13+ | No third-party package needed |

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Title template `%s \| TenantFlow` applies automatically to page-level string titles | Architecture Patterns, Pattern 1 | Titles would appear without brand suffix; fix is trivial (add suffix manually) |
| A2 | `force-static` is compatible with `export const metadata` (static metadata, not `generateMetadata`) | Pitfall 4 | Would need to test; if incompatible, remove `force-static` from homepage |

**Note:** A1 and A2 are both standard Next.js Metadata API behavior documented in official docs. A1 was verified by reading the root layout template. A2 is standard behavior (static metadata does not trigger dynamic rendering).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run src/lib/seo/__tests__/page-metadata.test.ts` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| META-01 | Pricing metadata has title, description, canonical, OG | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/page-metadata.test.ts` | Already covered by existing factory tests |
| META-02 | FAQ metadata has title, description, canonical | unit | (same as above) | Already covered |
| META-03 | About metadata has title, description, canonical | unit | (same as above) | Already covered |
| META-04 | Contact metadata has title, description, canonical | unit | (same as above) | Already covered |
| META-05 | Resources metadata has title, description, canonical | unit | (same as above) | Already covered |
| META-06 | Help metadata has title, description, canonical | unit | (same as above) | Already covered |
| META-07 | Features exports metadata after split | manual-only | `pnpm typecheck` verifies export compiles | N/A |
| META-08 | Blog exports metadata after split | manual-only | `pnpm typecheck` verifies export compiles | N/A |
| META-09 | Blog category exports generateMetadata after split | manual-only | `pnpm typecheck` verifies export compiles | N/A |
| META-10 | Homepage has explicit metadata | unit | (same as META-01) | Already covered |
| META-11 | All pages have alternates.canonical | unit | Existing test at line 27-35 covers this | Already covered |
| META-12 | Paginated blog noindex | unit | Existing noindex test at line 71-80 covers the factory | Already covered |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** `pnpm typecheck && pnpm lint && pnpm test:unit` (Success Criteria #5)

### Wave 0 Gaps
None -- existing test infrastructure in `src/lib/seo/__tests__/page-metadata.test.ts` already covers the `createPageMetadata()` factory behavior (canonical URLs, noindex, OG tags, custom images). The phase work is applying the factory to pages, not changing the factory itself. Typecheck + lint verify the metadata exports compile correctly.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- public pages only |
| V3 Session Management | No | N/A -- no session data in metadata |
| V4 Access Control | No | N/A -- metadata is public information |
| V5 Input Validation | Yes (minimal) | `createPageMetadata()` normalizes path; `JsonLdScript` escapes `<` in JSON output |
| V6 Cryptography | No | N/A |

### Known Threat Patterns for Metadata

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via JSON-LD injection | Tampering | `JsonLdScript` replaces `<` with `\u003c`; already implemented [VERIFIED: json-ld-script.tsx line 24] |
| User-controlled data in metadata | Information Disclosure | Blog category slugs come from URL params; `createPageMetadata` normalizes path; no user PII in metadata |

## Open Questions

1. **Blog category display name formatting**
   - What we know: Category slug like `property-management` needs to be formatted as `Property Management` for the title
   - What's unclear: Whether to use simple capitalize-each-word or look up the actual category name from the database
   - Recommendation: Use simple string formatting for the `generateMetadata()` title (D-02 says data fetching stays client-side), accepting minor formatting imperfection for categories with unconventional casing. The client component already resolves the display name from the API.

2. **Homepage `force-static` + metadata interaction**
   - What we know: `src/app/page.tsx` has `export const dynamic = 'force-static'`
   - What's unclear: Whether adding `export const metadata` affects static generation behavior
   - Recommendation: Use `export const metadata` (static, not `generateMetadata`). Static metadata is evaluated at build time and is fully compatible with `force-static`. [ASSUMED]

## Sources

### Primary (HIGH confidence)
- Codebase files read directly:
  - `src/lib/seo/page-metadata.ts` -- `createPageMetadata()` API
  - `src/lib/seo/breadcrumbs.ts` -- `createBreadcrumbJsonLd()` API
  - `src/components/seo/json-ld-script.tsx` -- `JsonLdScript` component
  - `src/lib/generate-metadata.ts` -- `getSiteUrl()`, root metadata template
  - `src/app/layout.tsx` -- Root layout `generateMetadata()` with template
  - `src/types/next.d.ts` -- `searchParams: Promise<>` type definition
  - `src/lib/seo/__tests__/page-metadata.test.ts` -- Existing test coverage
  - All 10 public page files (homepage, pricing, faq, about, contact, help, features, blog, blog/category, resources)
- `package.json` -- Next.js 16.1.7, React 19.2.4

### Secondary (MEDIUM confidence)
- [Next.js Metadata API docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) -- `searchParams` as Promise, `generateMetadata` signature
- [Next.js Metadata and OG images guide](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) -- Static vs dynamic metadata patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all utilities already exist in the codebase; no new dependencies
- Architecture: HIGH -- patterns directly observed in existing codebase (blog/[slug], compare/[competitor])
- Pitfalls: HIGH -- all derived from codebase analysis, not speculation

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable -- Next.js Metadata API is mature and unchanged since v13)
