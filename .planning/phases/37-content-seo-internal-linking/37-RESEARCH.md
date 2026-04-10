# Phase 37: Content SEO & Internal Linking — Research

**Researched:** 2026-04-10
**Domain:** Static content cross-linking (blog ↔ compare ↔ resource pages)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Link Mapping Strategy — Extend compare-data.ts pattern**
Use explicit static mapping configs for all cross-link associations. `compare-data.ts` already proves this pattern with `blogSlug`. Create a centralized `content-links.ts` (or extend existing configs) for resource↔blog mappings. Zero runtime cost, SSG-compatible, easy to maintain. Only 3 resource pages exist — a tag-based DB system is overengineered.
What this means for planner: Create a static config file mapping resource slugs to related blog slugs and vice versa. No DB schema changes needed.

**D-02: Blog-to-Competitor Detection — Reverse mapping from compare-data.ts**
The 3 comparison blog posts (matching `blogSlug` values in `COMPETITORS`) are the exact posts that "mention a competitor by name." Reverse the `blogSlug → competitor slug` mapping: when rendering a blog post whose slug matches any `blogSlug`, show a CTA linking to `/compare/[competitor]`. No content scanning, no keyword detection — deterministic and zero-cost.
Implementation hint: Build a `BLOG_TO_COMPETITOR` reverse-lookup map from `COMPETITORS` at module level. Blog post detail page checks `slug in BLOG_TO_COMPETITOR` → renders compare CTA.

**D-03: Related Articles Component — Footer section with card layout**
Full-width section placed before the page CTA/footer, displaying 2-3 BlogCard-style cards. Reuses existing `BlogCard` component from `#components/blog/blog-card`. Shared across comparison and resource pages.
What this means for planner: Create a `RelatedArticles` component that accepts an array of blog post slugs, fetches their metadata, and renders BlogCard instances in a responsive grid.

**D-04: Comparison pages already link to blog posts**
`compare-sections.tsx:219` already renders a link to `/blog/${data.blogSlug}` for each competitor. CONTENT-02 requires a "Related Articles section" — this means adding the D-03 footer section, not just inline links. The existing inline link remains; the Related Articles section adds a dedicated browsing surface.

**D-05: Resource page linking is bidirectional**
Per CONTENT-03: resource pages link to related blog posts AND blog posts link back to related resource pages. The `content-links.ts` mapping file (D-01) must support both directions. Blog post detail page checks if slug appears in any resource mapping → renders resource CTA.

### Claude's Discretion

None stated.

### Deferred Ideas (OUT OF SCOPE)

None stated.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONTENT-01 | Blog posts link to related comparison pages when mentioning competitors | D-02: reverse-map COMPETITORS.blogSlug → competitor slug; add CTA to blog-post-page.tsx when slug matches |
| CONTENT-02 | Comparison pages link to related blog posts | D-03: add RelatedArticles section to compare/[competitor]/page.tsx using blogSlug from COMPETITORS |
| CONTENT-03 | Resource pages link to related blog posts and vice versa | D-01 + D-05: content-links.ts maps resource slugs ↔ blog slugs; both directions surfaced in UI |
</phase_requirements>

---

## Summary

Phase 37 is a pure static-config + UI wiring phase. All three requirements are satisfied by two new artifacts (a static config file and a shared UI component) plus targeted edits to three existing page files. No DB migrations, no new API routes, no new query factories are needed.

The codebase already has all required primitives: `COMPETITORS` data (with `blogSlug`), `BlogCard` component (accepts `BlogListItem`), `blogQueries.related` factory, and `useRelatedPosts` hook. The resource detail pages are static Server Components; comparison pages are also Server Components. The blog detail page (`blog-post-page.tsx`) is a Client Component using `useQuery`.

The key architectural insight is that blog metadata for the RelatedArticles component must be fetched differently depending on the target page type:
- **Compare pages (Server Components):** fetch blog metadata via `createClient()` at build time (ISR/SSG). Zero client bundle impact.
- **Resource pages (Server Components):** same — direct Supabase server call.
- **Blog post page (Client Component):** add a new `useQuery` call using `blogQueries.slugs(slugs)` or reuse the existing `blogQueries.list` with an `.in('slug', slugs)` filter.

**Primary recommendation:** Create `src/lib/content-links.ts` with the full bidirectional mapping, then create `src/components/blog/related-articles.tsx` as a Server Component that accepts `string[]` of slugs, fetches metadata, and renders `BlogCard` instances.

---

## Standard Stack

### Core (already in project — verified by codebase inspection)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | 5.90 | Client-side blog metadata fetch (blog post page only) | Project standard — all server state via TanStack Query |
| `@supabase/supabase-js` | 2.97 | Server-side blog metadata fetch (compare + resource pages) | Project standard for all DB queries |
| `next/link` | Next.js 16.1 | All internal links | Project standard — never `<a>` for internal nav |
| `lucide-react` | installed | Icons (ArrowRight for CTAs) | CLAUDE.md: sole icon library |

### No New Packages Needed

All required libraries are already installed. [VERIFIED: codebase inspection of package.json]

---

## Architecture Patterns

### Recommended Project Structure

New files:
```
src/
├── lib/
│   └── content-links.ts          # Static bidirectional mapping config (NEW)
└── components/
    └── blog/
        └── related-articles.tsx  # Server Component, accepts slugs[], renders BlogCards (NEW)
```

Modified files:
```
src/app/blog/[slug]/blog-post-page.tsx         # Add compare CTA + resource CTA sections
src/app/compare/[competitor]/page.tsx          # Add <RelatedArticles> section
src/app/resources/seasonal-maintenance-checklist/page.tsx    # Add <RelatedArticles> section
src/app/resources/landlord-tax-deduction-tracker/page.tsx    # Add <RelatedArticles> section
src/app/resources/security-deposit-reference-card/page.tsx  # Add <RelatedArticles> section
```

### Pattern 1: Static Content Mapping Config

**What:** A single `content-links.ts` file exporting two record types and a reverse-lookup utility.

**What this means for planner:** This file is the single source of truth for all cross-link associations. The planner should treat it as Wave 0 (must exist before UI tasks can be implemented).

```typescript
// src/lib/content-links.ts
// [VERIFIED: COMPETITORS structure from compare-data.ts inspection]

import { COMPETITORS } from '#app/compare/[competitor]/compare-data'

/** Maps resource slug → related blog post slugs */
export const RESOURCE_TO_BLOGS: Record<string, string[]> = {
  'seasonal-maintenance-checklist': [
    'preventive-maintenance-checklist-rental-properties-seasonal-guide',
  ],
  'landlord-tax-deduction-tracker': [
    'landlord-tax-deductions-missing-2025',
  ],
  'security-deposit-reference-card': [
    'security-deposit-laws-by-state-2025',
  ],
}

/** Maps blog slug → resource slug (reverse of above) */
export const BLOG_TO_RESOURCE: Record<string, string> = Object.fromEntries(
  Object.entries(RESOURCE_TO_BLOGS).flatMap(([resource, blogs]) =>
    blogs.map(blog => [blog, resource])
  )
)

/** Maps blog slug → competitor slug (derived from COMPETITORS.blogSlug) */
export const BLOG_TO_COMPETITOR: Record<string, string> = Object.fromEntries(
  Object.values(COMPETITORS)
    .filter(c => c.blogSlug)
    .map(c => [c.blogSlug, c.slug])
)
```

**Note on import path:** The `compare-data.ts` file lives in `src/app/compare/[competitor]/compare-data.ts`. The `content-links.ts` imports from it. This is a cross-cutting dependency — if the planner prefers to avoid app-dir imports in lib/, the COMPETITORS data can be duplicated minimally (just `{ blogSlug, slug }` tuples) inline in `content-links.ts`. Either approach is valid; the inline approach avoids the cross-directory dependency. [ASSUMED: planner should decide; both are correct patterns]

### Pattern 2: RelatedArticles Server Component

**What:** A Server Component that accepts an array of blog post slugs, fetches metadata from Supabase, and renders a responsive grid of `BlogCard` components.

**When to use:** On compare pages and resource pages (Server Components). NOT used on the blog post page (Client Component) — see Pattern 3 instead.

```typescript
// src/components/blog/related-articles.tsx
// Source: blog-keys.ts BLOG_LIST_COLUMNS + BlogCard component inspection [VERIFIED]

import { createClient } from '#lib/supabase/server'
import { BlogCard } from '#components/blog/blog-card'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

interface RelatedArticlesProps {
  slugs: string[]
  title?: string
}

export async function RelatedArticles({
  slugs,
  title = 'Related Articles',
}: RelatedArticlesProps) {
  if (slugs.length === 0) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('blogs')
    .select('id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags')
    .in('slug', slugs)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const posts = (data ?? []) as BlogListItem[]
  if (posts.length === 0) return null

  return (
    <section className="section-spacing">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <h2 className="typography-h2 text-foreground mb-8">{title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {posts.map(post => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Important:** This is an `async` Server Component. It must NOT be imported inside a `'use client'` file directly. For the blog post page (Client Component), use Pattern 3.

### Pattern 3: Blog Post Page — Client-side CTAs

**What:** The blog post page (`blog-post-page.tsx`) is a `'use client'` component. It cannot directly use async Server Components. Instead:

- For compare CTA: pure static lookup — no data fetch needed. `BLOG_TO_COMPETITOR[slug]` is evaluated at render time from the static map. Render a CTA `<div>` linking to `/compare/[competitor]`.
- For resource CTA: same pattern. `BLOG_TO_RESOURCE[slug]` is evaluated at render time. Render a CTA `<div>` linking to `/resources/[resource-slug]`.

Both are simple conditional renders — no `useQuery`, no data fetching. The slug is already available from `useParams()`.

```typescript
// In blog-post-page.tsx — after existing Bottom CTA section [VERIFIED: current structure]
// Import at top:
import { BLOG_TO_COMPETITOR, BLOG_TO_RESOURCE } from '#lib/content-links'

// Inside component body, after slug is resolved:
const competitorSlug = BLOG_TO_COMPETITOR[slug]
const resourceSlug = BLOG_TO_RESOURCE[slug]

// Render compare CTA if this blog post matches a competitor:
{competitorSlug && (
  <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl text-center">
    <p className="text-muted-foreground mb-3">
      Compare TenantFlow vs {COMPETITORS[competitorSlug]?.name} side-by-side
    </p>
    <Link
      href={`/compare/${competitorSlug}`}
      className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors"
    >
      See Full Comparison
      <ArrowRight className="ml-1.5 size-4" />
    </Link>
  </div>
)}

// Render resource CTA if this blog post maps to a resource:
{resourceSlug && (
  <div className="mt-8 p-6 bg-muted border border-border rounded-xl text-center">
    <p className="text-muted-foreground mb-3">
      Download our free related resource
    </p>
    <Link
      href={`/resources/${resourceSlug}`}
      className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors"
    >
      View Resource
      <ArrowRight className="ml-1.5 size-4" />
    </Link>
  </div>
)}
```

**Note:** `COMPETITORS` import is needed only if the CTA renders the competitor name. The slug alone (for the href) suffices if the CTA text is generic. Planner decides — both work. [ASSUMED: rendering competitor name is better UX, so import `COMPETITORS` too]

### Pattern 4: Compare Page — Adding RelatedArticles

**What:** The compare page (`/compare/[competitor]/page.tsx`) is a Server Component. The `<BottomCta>` already renders at the end. `<RelatedArticles>` goes between `<WhySwitchSection>` and `<BottomCta>`.

```typescript
// In page.tsx, add import:
import { RelatedArticles } from '#components/blog/related-articles'

// In JSX, between WhySwitchSection and BottomCta:
<WhySwitchSection data={data} />
<RelatedArticles slugs={[data.blogSlug]} title="Read the Full Comparison" />
<BottomCta data={data} />
```

Each compare page only has one associated blog post (`data.blogSlug`), so `slugs` is always a single-element array. [VERIFIED: compare-data.ts has exactly one `blogSlug` per competitor]

### Pattern 5: Resource Pages — Adding RelatedArticles

**What:** Each resource page is a Server Component. Import `RESOURCE_TO_BLOGS` and `RelatedArticles`, then add the section before the footer CTA.

```typescript
// In each resource page.tsx:
import { RelatedArticles } from '#components/blog/related-articles'
import { RESOURCE_TO_BLOGS } from '#lib/content-links'

// In JSX, before final CTA:
<RelatedArticles
  slugs={RESOURCE_TO_BLOGS['seasonal-maintenance-checklist'] ?? []}
  title="Related Blog Posts"
/>
```

The slug key matches the resource route segment exactly. [VERIFIED: route segments from glob inspection match the intended keys]

### Anti-Patterns to Avoid

- **Using `useQuery` for RelatedArticles on Server Component pages:** Server Components can fetch directly via `createClient()`. No client bundle needed.
- **Importing `RelatedArticles` inside a `'use client'` file:** async Server Components cannot be imported in client components. Use the static-lookup CTA pattern (Pattern 3) instead.
- **Creating a new query key factory for slug-based fetches:** The `.in('slug', slugs)` query is a one-off fetch in a Server Component. No TanStack Query key factory needed — TanStack Query is for client-side caching.
- **Using `blogQueries.related()` for the RelatedArticles component:** That query filters by category, not by slug. The new component needs `.in('slug', slugs)` which is not in the existing factory. Don't reuse the wrong query.
- **Adding `blogSlug` array to `COMPETITORS` data:** The mapping is already complete (one blog per competitor). No changes to `compare-data.ts` or `CompetitorData` type are needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blog card UI | Custom card component | `BlogCard` from `#components/blog/blog-card` | Already exists, tested, matches design system |
| Blog metadata fetch | Custom Supabase query | `createClient().from('blogs').select(...).in('slug', slugs)` | PostgREST `.in()` handles multi-slug fetches natively |
| Competitor name lookup | String parsing | `COMPETITORS[competitorSlug]?.name` | Data already in COMPETITORS record |
| Resource description | Custom data | Resource page title/description already in resources/page.tsx free downloads array | Could reference if needed, but simple href suffices |

---

## Common Pitfalls

### Pitfall 1: Importing async Server Component in Client Component

**What goes wrong:** `RelatedArticles` is an async Server Component. If imported directly into `blog-post-page.tsx` (`'use client'`), Next.js throws a build error: `"async" Server Components cannot be imported in Client Components`.

**Why it happens:** Client Components bundle at build time; async Server Components are runtime-rendered on the server.

**How to avoid:** Never import `RelatedArticles` in the blog post page. Use static-lookup CTAs (Pattern 3) which need no async data — just computed values from the static map.

**Warning signs:** Build error mentioning "async" Server Component in Client Component.

### Pitfall 2: Blog slug mismatches between DB and LEAD_MAGNETS/content-links

**What goes wrong:** `content-links.ts` hardcodes blog slugs. If a blog post slug changes in the DB, the mapping silently becomes stale (returns no results, CTA disappears).

**Why it happens:** Blog slugs are stored in Supabase `blogs.slug` (DB-managed), but the mapping is static code.

**How to avoid:** The three blog slugs in `LEAD_MAGNETS` (already hardcoded in `blog-post-page.tsx`) are the same slugs used in `content-links.ts`. These slugs are established and unlikely to change. Document them explicitly in the config file as intentional references. [VERIFIED: LEAD_MAGNETS already uses these exact slugs — see blog-post-page.tsx lines 37-59]

**Confirmed blog slugs (verified against LEAD_MAGNETS in blog-post-page.tsx):**
- `preventive-maintenance-checklist-rental-properties-seasonal-guide`
- `landlord-tax-deductions-missing-2025`
- `security-deposit-laws-by-state-2025`
- `tenantflow-vs-buildium-comparison`
- `tenantflow-vs-appfolio-comparison`
- `tenantflow-vs-rentredi-comparison`

**Confirmed resource slugs (verified against resources/page.tsx free downloads array):**
- `seasonal-maintenance-checklist`
- `landlord-tax-deduction-tracker`
- `security-deposit-reference-card`

### Pitfall 3: Missing `print:hidden` on RelatedArticles for resource pages

**What goes wrong:** Resource pages have print stylesheets. The RelatedArticles section with images and cards would render in print output, breaking the printable format.

**Why it happens:** Resource pages add `@media print` styles hiding `.print:hidden` elements. The existing footer CTA already has `print:hidden` (see seasonal-maintenance-checklist/page.tsx line 249).

**How to avoid:** Add `print:hidden` class to the `<section>` wrapper in `RelatedArticles` when used on resource pages. Either accept a `className` prop, or always apply `print:hidden` (safe on compare pages too since they're not printable).

**Recommendation:** Apply `print:hidden` unconditionally on the RelatedArticles section — no harm on non-print pages.

### Pitfall 4: `blogSlug` may be empty string for hypothetical future competitors

**What goes wrong:** `BLOG_TO_COMPETITOR` is built from `Object.values(COMPETITORS).filter(c => c.blogSlug)`. If any competitor has `blogSlug: ''` (empty string), the filter passes (empty string is truthy... actually false). Correct: empty string IS falsy in JS, so the filter `c.blogSlug` correctly excludes empty strings.

**Why it matters:** All three current competitors have non-empty `blogSlug`. No action needed now. [VERIFIED: compare-data.ts inspection confirms all three have explicit slug values]

### Pitfall 5: `RelatedArticles` fetches on every request (no ISR)

**What goes wrong:** Compare and resource pages use SSG (`generateStaticParams` on compare page). Adding a Server Component that calls `createClient()` and fetches from Supabase will run at build time via `generateStaticParams`, not on each request. This is correct behavior and desired — blog metadata is fetched once at build.

**Why it matters:** If blog posts referenced by the slugs don't yet exist in the DB at build time, `RelatedArticles` renders nothing (posts.length === 0 → returns null). The phase succeeds only if the blog posts are already published.

**How to avoid:** Verify the 6 blog slugs exist as published posts in Supabase before running the build. [ASSUMED: these are existing posts since LEAD_MAGNETS already hardcodes them — safe assumption]

---

## Code Examples

### Verified slug values (from codebase inspection)

```typescript
// [VERIFIED: compare-data.ts]
// Competitor blog slugs:
COMPETITORS.buildium.blogSlug  = 'tenantflow-vs-buildium-comparison'
COMPETITORS.appfolio.blogSlug  = 'tenantflow-vs-appfolio-comparison'
COMPETITORS.rentredi.blogSlug  = 'tenantflow-vs-rentredi-comparison'

// [VERIFIED: blog-post-page.tsx LEAD_MAGNETS object]
// Resource-linked blog slugs:
'preventive-maintenance-checklist-rental-properties-seasonal-guide' → /resources/seasonal-maintenance-checklist
'landlord-tax-deductions-missing-2025'                              → /resources/landlord-tax-deduction-tracker
'security-deposit-laws-by-state-2025'                              → /resources/security-deposit-reference-card

// [VERIFIED: glob of src/app/resources/*/page.tsx]
// Resource route segments:
seasonal-maintenance-checklist
landlord-tax-deduction-tracker
security-deposit-reference-card
```

### BlogListItem type (required by BlogCard)

```typescript
// [VERIFIED: blog-keys.ts]
// BlogCard accepts: post: BlogListItem
// BlogListItem includes: id, title, slug, excerpt, published_at, category,
//                        reading_time, featured_image, author_user_id, status, tags
// RelatedArticles query must select these exact columns (BLOG_LIST_COLUMNS constant)
const BLOG_LIST_COLUMNS =
  'id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags'
```

### Current bottom of blog-post-page.tsx (insertion points)

```typescript
// [VERIFIED: blog-post-page.tsx lines 239-274]
// Existing order (bottom of article element):
// 1. Bottom CTA div (line 240)       ← Insert compare CTA AFTER this
// 2. Newsletter Signup (line 255)    ← Insert resource CTA AFTER newsletter? Or before? 
// 3. Related Articles (line 261)     ← Existing category-based related posts
//
// Recommended insertion order:
// 1. Compare CTA (new, conditional on BLOG_TO_COMPETITOR)
// 2. Resource CTA (new, conditional on BLOG_TO_RESOURCE)
// 3. Bottom CTA (existing)
// 4. Newsletter (existing)
// 5. Related Articles by category (existing)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Keyword-scan blog content for competitor mentions | Static slug lookup against known comparison posts | Phase 37 decision | Zero runtime cost, deterministic |
| Separate "related" query per page type | One shared `RelatedArticles` Server Component with slug array | Phase 37 design | DRY, testable |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 6 blog slugs hardcoded in LEAD_MAGNETS also exist as published posts in Supabase | Pitfall 5 | RelatedArticles renders nothing at build time — phase visually incomplete |
| A2 | Rendering competitor name in compare CTA is better UX than generic text | Pattern 3 | Minor: CTA text slightly less specific — no functional impact |
| A3 | `print:hidden` should apply unconditionally on RelatedArticles section | Pitfall 3 | Minor: compare pages would hide section in print (compare pages aren't printable anyway) |
| A4 | Inserting compare/resource CTAs before existing Bottom CTA is the correct position | Code Examples | Minor UX: position preference — planner can adjust |

---

## Open Questions

1. **Where exactly do compare/resource CTAs appear in blog-post-page.tsx?**
   - What we know: The bottom section has: Bottom CTA → Newsletter → Related Articles (category-based)
   - What's unclear: Should compare/resource CTAs appear inside the `<article>` element or after it? Before or after Newsletter?
   - Recommendation: Inside `<article>`, after the bottom CTA div, before Newsletter. This keeps the article container self-contained.

2. **Should `RelatedArticles` accept a `className` prop for `print:hidden`?**
   - What we know: Resource pages need print:hidden; compare pages don't need printing.
   - What's unclear: Whether to bake `print:hidden` in or make it configurable.
   - Recommendation: Accept `className?: string` prop for flexibility. Pass `"print:hidden"` from resource pages.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure TypeScript/React code changes, no new packages, no external services).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 (jsdom) |
| Config file | `vitest.config.ts` (--project unit) |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONTENT-01 | `BLOG_TO_COMPETITOR` reverse-map is correct | unit | `pnpm test:unit -- --run src/lib/content-links.test.ts` | Wave 0 |
| CONTENT-01 | `BLOG_TO_RESOURCE` reverse-map is correct | unit | `pnpm test:unit -- --run src/lib/content-links.test.ts` | Wave 0 |
| CONTENT-02 | Compare page passes correct `slugs` to RelatedArticles | unit (smoke) | `pnpm test:unit -- --run src/components/blog/related-articles.test.tsx` | Wave 0 |
| CONTENT-03 | `RESOURCE_TO_BLOGS` maps all 3 resources correctly | unit | `pnpm test:unit -- --run src/lib/content-links.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test:unit -- --run src/lib/content-links.test.ts`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** `pnpm validate:quick` (typecheck + lint + unit tests) green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/content-links.test.ts` — unit tests for all three exported maps (RESOURCE_TO_BLOGS, BLOG_TO_RESOURCE, BLOG_TO_COMPETITOR) — covers CONTENT-01, CONTENT-02, CONTENT-03
- [ ] `src/components/blog/related-articles.test.tsx` — smoke test that component renders null when no posts returned — covers CONTENT-02

---

## Security Domain

This phase adds only static config + UI rendering. No user input, no authentication boundaries, no data mutation, no new API routes.

ASVS categories: Not applicable — phase is read-only UI changes to public marketing pages. No security controls required beyond existing RLS (blogs table is already read-only public with `status = 'published'` filter).

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase] `src/app/compare/[competitor]/compare-data.ts` — COMPETITORS record, blogSlug values for all 3 competitors
- [VERIFIED: codebase] `src/app/blog/[slug]/blog-post-page.tsx` — LEAD_MAGNETS object confirming blog-to-resource slug pairs
- [VERIFIED: codebase] `src/components/blog/blog-card.tsx` — BlogCard props, BlogListItem type requirement
- [VERIFIED: codebase] `src/hooks/api/query-keys/blog-keys.ts` — BLOG_LIST_COLUMNS, blogQueries factory
- [VERIFIED: codebase] `src/app/resources/*/page.tsx` (3 files) — resource route segments, existing CTA structure, print styles
- [VERIFIED: codebase] `src/app/compare/[competitor]/compare-sections.tsx:219` — existing blog link in BottomCta
- [VERIFIED: codebase] `src/app/compare/[competitor]/page.tsx` — Server Component structure, generateStaticParams

### Secondary (MEDIUM confidence)

- [VERIFIED: codebase] `src/hooks/api/use-blogs.ts` — useRelatedPosts hook (confirmed NOT suitable for slug-array fetch)
- [CITED: CONTEXT.md] All locked decisions (D-01 through D-05) — planner MUST honor

---

## Metadata

**Confidence breakdown:**
- Static config mapping: HIGH — all slug values verified in codebase
- RelatedArticles Server Component pattern: HIGH — verified against Next.js App Router patterns in existing codebase
- Blog post page CTA insertion: HIGH — existing component structure fully read
- Test requirements: MEDIUM — test file contents are Wave 0 gaps, test commands verified from CLAUDE.md

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable codebase, no fast-moving dependencies)
