# Phase 38: Validation & Verification - Research

**Researched:** 2026-04-10
**Domain:** Next.js E2E testing (Playwright), sitemap completeness, regression validation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: GSC Verification — DNS already active, no meta tag needed**
Google Search Console is verified via DNS (domain name provider). No `metadata.verification.google` meta tag needed in root layout. VALID-01 requirement satisfied by existing DNS verification — implementation is a no-op with documentation. No code changes for this requirement.

**D-02: E2E Test Scope — All public pages with deep validation**
E2E SEO smoke tests cover ALL public pages: homepage, /pricing, /features, /blog, /blog/[slug], /compare/[competitor], /faq, /about, /contact, /help, /support, /resources, /resources/[each], /terms, /privacy, /security-policy.

Assertions per page (deep validation):
- `<title>` exists and is non-empty
- `<meta name="description">` exists and is non-empty
- `<link rel="canonical">` exists and points to correct URL
- At least one `<script type="application/ld+json">` exists
- Parse JSON-LD content and validate schema `@type` matches expected type per page
- Verify OG tags (`og:title`, `og:description`, `og:url`) exist
- Verify canonical URL matches the page URL

**D-03: Sitemap Full Overhaul**
Sitemap enhancements:
1. Add missing pages: `/support`, `/security-policy`
2. Add blog category pages: `/blog/category/[category]` for each category (dynamic from DB)
3. Add compare pages: `/compare/buildium`, `/compare/appfolio`, `/compare/rentredi`
4. Add resource pages: `/resources/seasonal-maintenance-checklist`, `/resources/landlord-tax-deduction-tracker`, `/resources/security-deposit-reference-card`
5. Use static dates for non-blog pages instead of `currentDate`
6. Blog posts already use `published_at` (line 162-167 of sitemap.ts) — confirmed correct

**D-04: Blog category pages in sitemap need dynamic discovery (Claude's Discretion)**
Blog categories should be discovered from the database rather than hardcoded.

**D-05: Regression pass scope**
VALID-03 requires full regression: `pnpm typecheck && pnpm lint && pnpm test:unit` must pass clean. This is verification of existing state, not new test creation.

**D-06: Compare and resource pages in sitemap**
Sitemap includes compare pages (3 competitors) and resource pages (3 resources). Static routes with known slugs — no DB query needed.

### Claude's Discretion

- D-04: How to discover blog categories for sitemap (recommend: DB query `select distinct category from blogs where status = 'published'`)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VALID-01 | Google Search Console verification meta tag in root layout | D-01: DNS verification already active — no code change. Document as no-op in SUMMARY. |
| VALID-02 | E2E SEO smoke tests verify meta tags and JSON-LD presence on key public pages | D-02: Create Playwright spec in `tests/e2e/tests/public/` covering all 17+ public routes |
| VALID-03 | All existing unit tests pass, typecheck clean, lint clean | D-05: Run `pnpm typecheck && pnpm lint && pnpm test:unit`, fix any failures from prior phases |
| CRAWL-05 | Sitemap enhanced with missing pages: `/support`, `/security-policy`, blog category pages | D-03: Refactor `src/app/sitemap.ts` — `/support` and `/security-policy` are missing; categories need DB query |
| CRAWL-06 | Sitemap uses actual `published_at` timestamps for blog posts | Already implemented (lines 162-167 of sitemap.ts use `post.published_at`) — confirm and document |
</phase_requirements>

---

## Summary

Phase 38 is the final validation phase for v1.6. It has three concrete work items and one documentation-only item:

1. **VALID-01 (no-op):** GSC verification is already active via DNS. No code change. Document in SUMMARY.
2. **VALID-02 (new E2E spec):** Create `tests/e2e/tests/public/seo-smoke.spec.ts` covering all 17+ public routes with deep metadata and JSON-LD validation using Playwright's `page.evaluate()`.
3. **CRAWL-05 (sitemap additions):** `src/app/sitemap.ts` is missing `/support` and `/security-policy` from the company/legal sections. Compare pages and resource pages are already present (lines 55-76). Blog category pages need a new DB query. Replace `currentDate` with meaningful static dates for stable pages.
4. **CRAWL-06 (already done):** Blog posts already use `post.published_at || currentDate` (lines 162-167). Confirm correct, document.
5. **VALID-03:** Run regression suite, fix any failures.

**Primary recommendation:** Write the E2E spec first (most time-consuming). Sitemap additions are simple insertions. Regression pass is final gate.

---

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | 1.58 | E2E test runner | Project standard, already configured |
| `next` | 16.1 | `MetadataRoute.Sitemap` type | Native sitemap typing, no extra packages |
| `@supabase/supabase-js` | 2.97 | DB query for blog categories | Already used in sitemap.ts |

### No new installations needed
All dependencies are already present. The E2E test spec uses `@playwright/test` imports only.

---

## Architecture Patterns

### E2E Test File Location
The Playwright config matches `**/public/**/*.spec.ts` for the `public` project (no auth, Desktop Chrome). [VERIFIED: `tests/e2e/playwright.config.ts` line 225]

```
tests/e2e/tests/public/seo-smoke.spec.ts   ← new file
```

### Playwright Config — Public Project
```typescript
// From tests/e2e/playwright.config.ts
{
  name: 'public',
  use: {
    ...devices['Desktop Chrome'],
    storageState: { cookies: [], origins: [] }  // no auth
  },
  testMatch: ['**/public/**/*.spec.ts', '**/*public*.spec.ts']
}
```
[VERIFIED: playwright.config.ts lines 219-226]

### Pattern: Page.evaluate() for JSON-LD Extraction
Playwright's `page.evaluate()` runs JS in the browser context. Use it to extract and parse all `<script type="application/ld+json">` elements:

```typescript
// Source: Playwright docs + existing test patterns in project
const schemas = await page.evaluate(() => {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  return Array.from(scripts).map(el => {
    try { return JSON.parse(el.textContent ?? '') }
    catch { return null }
  }).filter(Boolean)
})
```

Then assert schema type:
```typescript
const types = schemas.map((s: Record<string, unknown>) => s['@type'])
expect(types).toContain('BreadcrumbList')
```

### Pattern: Metadata Assertions via Playwright Locators
```typescript
// Title
await expect(page).toHaveTitle(/.+/)  // non-empty

// Meta description
const desc = page.locator('meta[name="description"]')
await expect(desc).toHaveAttribute('content', /.+/)

// Canonical
const canonical = page.locator('link[rel="canonical"]')
await expect(canonical).toHaveAttribute('href', /https?:\/\//)

// OG tags
const ogTitle = page.locator('meta[property="og:title"]')
await expect(ogTitle).toHaveAttribute('content', /.+/)
```

### JSON-LD Schema Type Map (per route)
Derived from grepping all public page.tsx files for `JsonLdScript` usage. [VERIFIED: codebase grep]

| Route | Expected @type(s) | Source |
|-------|------------------|--------|
| `/` | `WebSite`, `Organization`, `SoftwareApplication` | `app/page.tsx` + `seo-json-ld.tsx` (layout) |
| `/pricing` | `Product`, `FAQPage`, `BreadcrumbList` | `app/pricing/page.tsx` |
| `/features` | `BreadcrumbList` | `app/features/page.tsx` |
| `/blog` | `BreadcrumbList` | `app/blog/page.tsx` |
| `/blog/[slug]` | `Article`, `BreadcrumbList` | `app/blog/[slug]/page.tsx` |
| `/blog/category/[category]` | `BreadcrumbList` | `app/blog/category/[category]/page.tsx` |
| `/compare/[competitor]` | `WebPage` (inline, not yet `SoftwareApplication`) | `app/compare/[competitor]/page.tsx` |
| `/faq` | `FAQPage`, `BreadcrumbList` | `app/faq/page.tsx` |
| `/about` | `BreadcrumbList` | `app/about/page.tsx` |
| `/contact` | `BreadcrumbList` | `app/contact/page.tsx` |
| `/help` | `BreadcrumbList` | `app/help/page.tsx` |
| `/support` | `BreadcrumbList` | `app/support/page.tsx` |
| `/resources` | `BreadcrumbList` | `app/resources/page.tsx` |
| `/resources/[resource]` | none currently (no JsonLdScript in resource sub-pages) | `app/resources/*/page.tsx` — confirmed missing |
| `/terms` | `BreadcrumbList` | `app/terms/page.tsx` |
| `/privacy` | `BreadcrumbList` | `app/privacy/page.tsx` |
| `/security-policy` | `BreadcrumbList` | `app/security-policy/page.tsx` |

**Important discovery:** Resource sub-pages (`/resources/seasonal-maintenance-checklist`, etc.) do NOT have `JsonLdScript` — their `page.tsx` files lack any JSON-LD. [VERIFIED: head of each resource page.tsx] The E2E test for these pages cannot assert JSON-LD presence unless the spec is written to allow absence, OR Phase 38 adds JSON-LD there. The CONTEXT.md lists resource pages in the E2E scope but SCHEMA-06 (HowTo schema on seasonal checklist) belongs to Phase 35 and may already be done or deferred.

**Resolution for E2E spec:** For resource sub-pages, assert that JSON-LD exists in the global layout (`Organization` + `SoftwareApplication` via `SeoJsonLd`) — those fire on every page from `app/layout.tsx`. The assertion `at least one JSON-LD exists` will always be true because the layout injects two schemas globally.

Also: All pages inherit `Organization` and `SoftwareApplication` from the root layout's `<SeoJsonLd />` component. [VERIFIED: `app/layout.tsx` line 12, 67 and `src/components/seo/seo-json-ld.tsx`]

### Sitemap Current State
[VERIFIED: `src/app/sitemap.ts` — full read]

**Already present:**
- `marketingPages`: `/`, `/features`, `/pricing`
- `contentPages`: `/blog`, `/resources`
- `comparePages`: `/compare/buildium`, `/compare/appfolio`, `/compare/rentredi` (lines 55-64)
- `resourcePages`: `/resources/seasonal-maintenance-checklist`, `/resources/landlord-tax-deduction-tracker`, `/resources/security-deposit-reference-card` (lines 66-76)
- `companyPages`: `/about`, `/contact`, `/faq`, `/help`
- `legalPages`: `/terms`, `/privacy`
- `authPages`: `/login`
- `blogPages`: dynamic from DB using `post.published_at` (lines 162-167) — CRAWL-06 already satisfied

**Missing (CRAWL-05):**
- `/support` — not in companyPages or legalPages
- `/security-policy` — not in legalPages
- Blog category pages — no DB query for distinct categories exists yet

**`currentDate` usage:** Lines 14, and used as `lastModified` for all static pages. D-03 says to replace with meaningful static dates for stable pages. Recommend: use a static `new Date('YYYY-MM-DD').toISOString()` per section rather than `currentDate`. For legalPages, a date matching the last content update (e.g., `2025-01-01`); for companyPages, `2025-06-01`; for marketingPages, current milestone date.

### Pattern: Static Date for Stable Pages
```typescript
// Instead of:
lastModified: currentDate,

// Use:
lastModified: new Date('2025-01-01').toISOString(),  // legal pages (rarely change)
lastModified: new Date('2026-01-01').toISOString(),  // company pages (quarterly-ish)
```

### Pattern: Blog Category Dynamic Discovery
```typescript
// Add inside the try block alongside blogPages query
const categoryQuery = supabase
  .from('blogs')
  .select('category')
  .eq('status', 'published')

const { data: categoryRows } = await Promise.race([categoryQuery, timeout])
const categories = [...new Set((categoryRows ?? []).map(r => r.category).filter(Boolean))]

const categoryPages: MetadataRoute.Sitemap = categories.map(category => ({
  url: `${baseUrl}/blog/category/${category}`,
  lastModified: currentDate,
  changeFrequency: 'weekly' as const,
  priority: 0.6
}))
```

This uses the existing 5s timeout pattern and fails safely (empty array on error).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-LD assertion in E2E | Custom DOM parser | `page.evaluate()` + `JSON.parse()` | Playwright runs JS in browser context natively |
| Canonical URL validation | Regex on href | `page.locator('link[rel="canonical"]').getAttribute('href')` | Locator API handles async correctly |
| Blog category discovery | Hardcode list | DB query `select distinct category` | Ensures new categories automatically appear |
| Meta description check | `page.content()` parse | `page.locator('meta[name="description"]').getAttribute('content')` | Direct, fast, correct |

---

## Common Pitfalls

### Pitfall 1: JSON-LD on Resource Sub-Pages
**What goes wrong:** E2E spec asserts `at least one JSON-LD exists` on `/resources/seasonal-maintenance-checklist`, but the page has no `JsonLdScript`. Test fails.
**Why it happens:** Resource sub-pages were not part of Phase 35 JSON-LD work — they have no `JsonLdScript` in their `page.tsx`.
**How to avoid:** Assert for globally-injected schemas (`Organization` or `SoftwareApplication`) which come from the root layout `SeoJsonLd` component on every page. Do NOT assert page-specific types on resource sub-pages unless Phase 35 added them.
**Warning signs:** `schemas.length === 0` in `page.evaluate()` result.

### Pitfall 2: Blog slug for E2E test is dynamic
**What goes wrong:** E2E test navigates to `/blog/[slug]` but no slug is known at test-write time.
**Why it happens:** Blog post slugs come from the DB.
**How to avoid:** Use a hardcoded known slug from the test DB, OR fetch a slug via the Supabase API in a test fixture, OR use `page.goto('/blog')` and click the first article link. Simplest: use a known seed slug (check if `tests/e2e/fixtures/` has any, or use the blog post slugs referenced in `RESOURCE_TO_BLOGS`).

### Pitfall 3: `currentDate` replacement breaks ISR
**What goes wrong:** Replacing `currentDate` with a hardcoded string for all pages stops Google from seeing updates.
**Why it happens:** `lastModified` tells crawlers when content changed.
**How to avoid:** Only use static dates for truly stable content (terms, privacy = yearly; company pages = seasonal). Keep `currentDate` for pages that change regularly (marketing, blog hub). The ISR `revalidate = 86400` already controls how often the sitemap regenerates.

### Pitfall 4: Playwright `bypassCSP: true` already set
**What goes wrong:** Developer thinks CSP will block `page.evaluate()` — it won't.
**Why it happens:** The playwright config already sets `bypassCSP: true` globally (line 95 of playwright.config.ts). No action needed.

### Pitfall 5: `maxFailures: 1` in playwright config
**What goes wrong:** One failing test stops the entire E2E run, hiding other failures.
**Why it happens:** `maxFailures: 1` is set in playwright.config.ts line 63.
**How to avoid:** Run with `--max-failures=0` locally when debugging a new spec, or write the spec in a way that collects all page failures before asserting. Use `test.describe` loops with soft assertions or capture failures to an array.

### Pitfall 6: OG tags use `property=` not `name=`
**What goes wrong:** `page.locator('meta[name="og:title"]')` finds nothing.
**Why it happens:** OG tags use `property` attribute, not `name`.
**How to avoid:** Always use `page.locator('meta[property="og:title"]')` for OG tags and `page.locator('meta[name="description"]')` for standard meta.

---

## Code Examples

### E2E Spec Skeleton
```typescript
// Source: Playwright docs + existing tests/e2e/tests/homepage.spec.ts pattern
import { test, expect, type Page } from '@playwright/test'

type SchemaObject = Record<string, unknown>

async function getJsonLdSchemas(page: Page): Promise<SchemaObject[]> {
  return page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    return Array.from(scripts).flatMap(el => {
      try {
        const parsed = JSON.parse(el.textContent ?? '')
        // Handle both single schema and @graph arrays
        return Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed]
      } catch {
        return []
      }
    })
  })
}

async function assertPageSeo(page: Page, path: string, expectedTypes: string[]) {
  await page.goto(path, { waitUntil: 'load', timeout: 30000 })

  // Title
  const title = await page.title()
  expect(title.length, `${path}: title should be non-empty`).toBeGreaterThan(0)

  // Meta description
  const desc = await page.locator('meta[name="description"]').getAttribute('content')
  expect(desc?.length ?? 0, `${path}: description should be non-empty`).toBeGreaterThan(0)

  // Canonical
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
  expect(canonical, `${path}: canonical should exist`).toBeTruthy()

  // OG tags
  const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
  expect(ogTitle?.length ?? 0, `${path}: og:title should be non-empty`).toBeGreaterThan(0)

  // JSON-LD
  const schemas = await getJsonLdSchemas(page)
  expect(schemas.length, `${path}: at least one JSON-LD schema should exist`).toBeGreaterThan(0)

  const types = schemas.map(s => s['@type'])
  for (const expectedType of expectedTypes) {
    expect(types, `${path}: should contain @type ${expectedType}`).toContain(expectedType)
  }
}

test.describe('SEO Smoke Tests - Public Pages', () => {
  test('homepage has full SEO', async ({ page }) => {
    await assertPageSeo(page, '/', ['WebSite', 'Organization'])
  })
  // ... one test per page or parameterized
})
```

### Sitemap: Add Missing Pages
```typescript
// In src/app/sitemap.ts — add to companyPages array
{
  url: `${baseUrl}/support`,
  lastModified: '2026-01-01T00:00:00.000Z',
  changeFrequency: 'monthly',
  priority: 0.6
},

// In legalPages array
{
  url: `${baseUrl}/security-policy`,
  lastModified: '2026-01-01T00:00:00.000Z',
  changeFrequency: 'yearly',
  priority: 0.3
},
```

### Sitemap: Blog Category Discovery
```typescript
// Inside try block, after blogPosts query
const { data: categoryRows } = await supabase
  .from('blogs')
  .select('category')
  .eq('status', 'published')
  .not('category', 'is', null)

const categories = [...new Set((categoryRows ?? []).map(r => r.category).filter(Boolean))]
const blogCategoryPages: MetadataRoute.Sitemap = categories.map(category => ({
  url: `${baseUrl}/blog/category/${category}`,
  lastModified: currentDate,
  changeFrequency: 'weekly' as const,
  priority: 0.6
}))
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Resource sub-pages (`/resources/*`) have no JSON-LD scripts in their page.tsx files | Schema Type Map | If Phase 35 added JSON-LD to resource pages, E2E spec can assert page-specific types too |
| A2 | `blogs` table has a `category` column containing non-null string values for published posts | Sitemap pattern | If column name differs or is null for all rows, category query returns empty — acceptable fail-safe |
| A3 | Known blog post slugs from `RESOURCE_TO_BLOGS` (e.g., `preventive-maintenance-checklist-rental-properties-seasonal-guide`) exist in the test DB | E2E pitfall | If slug doesn't exist in local DB, `/blog/[slug]` returns 404 — use a fixture or skip with `test.skip` |

---

## Open Questions

1. **Resource sub-page JSON-LD status**
   - What we know: Phase 35 was responsible for SCHEMA-06 (HowTo on seasonal checklist). Resource page.tsx files currently have no `JsonLdScript` at time of research.
   - What's unclear: Whether Phase 35 was executed before Phase 38 planning and added JSON-LD to resource pages.
   - Recommendation: Check `src/app/resources/seasonal-maintenance-checklist/page.tsx` for `JsonLdScript` before writing the E2E assertion for that route. If absent, assert only global layout schemas.

2. **Known blog slug for E2E**
   - What we know: Blog post slugs are dynamic. The seed slug `preventive-maintenance-checklist-rental-properties-seasonal-guide` is referenced in `RESOURCE_TO_BLOGS`.
   - What's unclear: Whether this post exists in the local test Supabase instance.
   - Recommendation: Use a try/catch in the E2E setup to fetch any published slug from the API, or fall back to navigating via the blog listing page.

---

## Environment Availability

Step 2.6: SKIPPED (no external CLI dependencies — changes are purely code/config in Next.js files and Playwright tests already configured)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58 |
| Config file | `tests/e2e/playwright.config.ts` |
| Quick run command | `pnpm test:e2e` |
| Full suite command | `pnpm typecheck && pnpm lint && pnpm test:unit` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VALID-01 | DNS GSC verification documented | manual/doc | n/a — no code | n/a |
| VALID-02 | All public pages have title, desc, canonical, OG, JSON-LD | E2E | `pnpm test:e2e --project=public` | ❌ Wave 0 |
| VALID-03 | typecheck + lint + unit tests pass | CI gate | `pnpm typecheck && pnpm lint && pnpm test:unit` | ✅ |
| CRAWL-05 | Sitemap includes /support, /security-policy, category pages | manual smoke | verify `/sitemap.xml` in browser | ✅ (after edit) |
| CRAWL-06 | Blog posts use published_at | unit/manual | verify sitemap.ts line 164 | ✅ already implemented |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Phase gate:** `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:e2e --project=public`

### Wave 0 Gaps
- [ ] `tests/e2e/tests/public/seo-smoke.spec.ts` — covers VALID-02 (all public pages, deep SEO assertions)

---

## Security Domain

Phase 38 introduces no new data access patterns, auth flows, or user inputs. The E2E spec is read-only (GET requests to public pages). No ASVS categories apply.

---

## Sources

### Primary (HIGH confidence)
- `src/app/sitemap.ts` — Full read; compare/resource pages already present; /support and /security-policy absent
- `tests/e2e/playwright.config.ts` — Full read; `public` project pattern confirmed
- `tests/e2e/tests/homepage.spec.ts` — Existing E2E pattern to follow
- `src/app/compare/[competitor]/page.tsx` — Inline `WebPage` schema (not using `JsonLdScript`)
- `src/app/blog/category/[category]/page.tsx` — Uses `createBreadcrumbJsonLd`
- `src/app/support/page.tsx` — Uses `createBreadcrumbJsonLd`
- `src/app/security-policy/page.tsx` — Uses `createBreadcrumbJsonLd`
- `src/app/layout.tsx` + `src/components/seo/seo-json-ld.tsx` — Global Organization + SoftwareApplication on all pages
- `src/app/resources/seasonal-maintenance-checklist/page.tsx` — No JsonLdScript (head inspection)
- `src/lib/seo/page-metadata.ts` — `createPageMetadata` generates canonical, OG, Twitter
- `src/components/seo/json-ld-script.tsx` — `JsonLdScript` component implementation

### Secondary (MEDIUM confidence)
- [ASSUMED] `blogs` table has `category` column — inferred from blog category route and query pattern in sitemap

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already in project, verified
- Architecture: HIGH — E2E patterns verified from existing test files and playwright config
- Pitfalls: HIGH — derived from direct code inspection
- Sitemap state: HIGH — full read of sitemap.ts, confirmed line numbers

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable domain — Next.js sitemap API and Playwright patterns do not change rapidly)
