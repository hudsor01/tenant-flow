# Phase 6: Blog Rebuild + n8n Redesign — Research (Specialist 1: Codebase + DB Audit)

**Researched:** 2026-05-10
**Specialist scope:** What exists today in code + DB; what survives the rebuild; what gets rewritten or deleted
**Sister specialist:** Specialist 2 covers competitor content strategy + topic clusters
**Confidence:** HIGH on file/migration evidence (direct reads); MEDIUM on live row-state (Supabase MCP query tools were not loaded in this session — row counts inferred from CRIT-01 migration pre-flight comments and CONTEXT signals)

## Summary

The blog surface is two-layer: **a working Next.js 16 page tree (server-rendered metadata + slug detail; client-rendered hub + category)** sitting on top of **a `public.blogs` table that's effectively empty after Phase 1**. Phase 1 (CRIT-01) drafted ~100 broken `Error Processing Blog` rows on 2026-05-08 and added a BEFORE-INSERT trigger (`reject_n8n_error_blogs_trigger`) that physically blocks the n8n parser-failure signature from re-bleeding. Per the CRIT-01 migration comments, **every published row matched the bad signature**, so the live published count is currently zero or near-zero — `/blog` index renders an empty state today.

The rebuild has six surfaces to cover, in roughly this order of architectural impact:

1. **DB schema gaps** — `status` is a free-text column with three CHECK values (`draft`, `published`, `archived`) but the workflow REQ list includes a fourth state (`in-review`) that has no DB representation; the `blogs` table has no `author_user_id` FK, no taxonomy table for `category` (it's free text), no soft-FK trigger like `documents.document_type` has, and a Phase-1 trigger comment says **"Phase 6 (BLOG-03) drops this trigger as part of redesigned n8n migration"** — so the trigger is a pre-locked Phase-6 decision artifact.
2. **Persona-aligned content rebuild** — Phase 4 locked "landlords" / "landlords with 1–15 rentals" as the persona, and the existing `BlogPostPage` hero/CTA, `blog-inline-cta.tsx` ("Managing rentals shouldn't be this hard"), `BlogClient` hero subtitle ("Property management insights, software comparisons..."), and category-page hero copy all need a persona pass; none of them currently say "landlords with 1–15 rentals".
3. **`/blog` index is client-rendered today** — `page.tsx` ships `<BlogClient />` (client component) inside `<Suspense fallback={<BlogLoadingSkeleton />}>`. Hits `useBlogs()` + `useBlogCategories()` + `useComparisonPosts()` after hydration. This is the audit's #39 finding ("Loading state on /blog shows 'Loading TenantFlow…' for ~3 seconds") and the BLOG-02 / PERF-01 success criterion. The fix is structurally small: replace `useBlogs/useBlogCategories/useComparisonPosts` with `await supabase.from('blogs')` + `await supabase.rpc('get_blog_categories')` in the server component, drop `'use client'`, and inline the hub layout currently inside `BlogClient`. Detail page (`/blog/[slug]/page.tsx`) is already server-rendered with `notFound()` — no soft-404 risk on the detail surface.
4. **Soft-404 on `/blog/[slug]` is already fixed** — `page.tsx:23` declares `export const dynamic = 'force-dynamic'` plus `notFound()` at line 82+125, so unknown slugs emit real HTTP 404. Phase-1 follow-up comment explicitly says "Phase 6 (BLOG-02 server-rendered rebuild) restores ISR with `generateStaticParams` returning the published slug set". The Phase 6 soft-404 work is the inverse: re-add ISR + `generateStaticParams` for published slugs while keeping `dynamic = 'auto'` (the default) so the framework emits a real 404 for misses outside the static set.
5. **Category page has a soft-404 fallback that violates BLOG-02's "real HTTP 404"** — `/blog/category/[category]/page.tsx:46` correctly calls `notFound()` server-side when the slug isn't in `get_blog_categories()`. But the **client** component (`blog-category-client.tsx:25-30`) does `router.replace('/blog')` for unknown slugs after hydration. With the server `notFound()` already in place this branch is unreachable from a real navigation, but it's dead code that confused at least one reviewer in cycle-1 of Phase-1 review. Recommend deleting it during the rebuild.
6. **n8n is the upstream content producer AND the maintenance/payment runtime** — there are TWO n8n surfaces conflated under "n8n":
   - **(a) Content-generation flow** — the workflow that writes to `public.blogs` and was the source of the Error Processing Blog data. Lives ENTIRELY in n8n's SQLite database (NOT in this repo). Only artifact in this repo: the Phase-1 BEFORE-INSERT reject trigger that blocks its current parser-failure signature.
   - **(b) Operations flow** — five SECURITY DEFINER trigger functions (`notify_n8n_maintenance`, `notify_n8n_payment_reminder`, `notify_n8n_lease_reminder`, `notify_n8n_rent_payment`, `notify_critical_error`) wired to operational tables, configured via `public.app_config`, runbook at `supabase/runbooks/n8n-webhook-config.md`. **This is unrelated to BLOG-03 and must NOT be touched by the rebuild.** The decision artifact for BLOG-03 (the content-generation flow) lives in n8n's UI; only the trigger drop touches the repo.

**Primary recommendation:** Treat Phase 6 as **four independent waves** that can ship sequentially (all in one PR per current GSD config but reviewed as logical units):
- **Wave 1 — Schema:** add `status='in-review'` to CHECK; rename `author_user_id` → owner_user_id to match repo convention OR document the deviation; add `slug` regex CHECK so n8n can't write `error-1778151609106`-shaped slugs ever again; drop the Phase-1 reject trigger AFTER Wave 4 verifies the redesigned n8n flow.
- **Wave 2 — UI rebuild:** convert `/blog` index to a server component (drop `BlogClient`); thread persona copy through hero/CTA/empty state; render visible breadcrumbs on `/blog`, `/blog/[slug]`, `/blog/category/[slug]`; add `generateStaticParams` to `/blog/[slug]` for the published slug set.
- **Wave 3 — Content:** generate 10–15 persona-aligned posts with clean slugs (no millisecond suffixes); manual review gate; ship.
- **Wave 4 — n8n redesign:** sister specialist owns content topics; this specialist's deliverable is the slug-format guard + status-workflow CHECK that the redesigned flow must obey.

## User Constraints (from CONTEXT.md)

CONTEXT.md does not yet exist for Phase 6 (this is the discovery research). The constraints below are inherited from the locked planning artifacts (PROJECT.md Key Decisions + ROADMAP.md Phase 6 + Phase 4 RESEARCH).

### Locked Decisions (from PROJECT.md + ROADMAP.md + Phase 4)

- **Persona word: "landlords"** with **"landlords with 1–15 rentals"** as the segment-anchored variant (Phase 4 RESEARCH, HIGH confidence). All Phase 6 copy MUST use this; no `property owner` / `owner-operator` / `property manager` reintroductions.
- **Phase 6 ships as ONE per-phase branch** (`gsd/phase-6-blog-rebuild`) with the perfect-PR merge gate (two consecutive zero-finding review cycles). Sequencing per ROADMAP: Phase 6 depends on Phase 4 (content + UI lean on settled persona); parallel-eligible with Phase 5.
- **Phase-1 BEFORE-INSERT trigger (`reject_n8n_error_blogs_trigger`) is a Phase-6 obligation to drop** — explicit Phase-1 migration comment: *"Phase 6 / BLOG-03 will drop this trigger as part of n8n redesign — do not preserve indefinitely."*
- **CRIT-01 narrow scope (Phase 1) + BLOG-01..06 full scope (Phase 6).** Phase 1 stopped the SEO bleed via `status='draft'`; Phase 6 rebuilds DB taxonomy + UI + n8n + initial content set.
- **Cross-cutting design-token constraint** — every visual edit uses `globals.css` tokens (oklch colors, spacing, radius, shadow, duration, easing scales); zero hex/rgb/`bg-white`/inline ms anywhere in the diff.
- **No tenant portal regressions** — even in blog content. Tenants are records, not users.
- **Footer "Powered by Hudson Digital" is KEPT** — Phase 6 doesn't touch it (CONS-12 dropped from v1.0 scope per user override).

### Claude's Discretion (Phase 6 internal decisions)

- DB shape for the `in-review` workflow state — CHECK constraint update vs. dedicated workflow_state table; researcher recommends below.
- Server-component decomposition strategy for the `/blog` index — single async server component vs. parallel `<Suspense>` chunks for category/comparison/list zones; researcher recommends below.
- Sitemap behavior under empty-state — current behavior (omit `lastModified` if no posts) is correct per Google's guidance, but the rebuild needs to NOT change this.
- Whether `/blog` keeps the "Software Comparisons" zone vs. consolidates to one paginated grid — current code has it as a horizontal-scroll snap zone (`scrollbar-hide`), which has accessibility tradeoffs; researcher recommends below.
- Whether to migrate off `react-markdown` — current setup works fine with `remark-gfm` + `rehype-raw` + `rehype-sanitize`. Recommend keeping; switching is out-of-scope.
- Visible breadcrumbs primitive — there is NO existing breadcrumb component in `src/components/`; researcher recommends below.

### Deferred Ideas (OUT OF SCOPE for Phase 6)

- Authoring UI in the dashboard (admin-side post editor) — Phase 6 keeps n8n as the writer. Out of scope.
- Comment system, reactions, social sharing buttons — never been in scope.
- Localization of blog posts — English-only per PROJECT.md.
- Per-post unique OG image generation pipeline (programmatic generation via `@vercel/og` etc.) — BLOG-04 says "each post has unique OG image" but the generation primitive is a strategic decision deferred to Phase 6 plan-checker; sister specialist may recommend.
- A/B testing of post titles, hero variants, CTA copy — out of v1.0.
- Tag-based pages (`/blog/tag/<tag>`) — current code only supports `/blog/category/<slug>`. Sister specialist may recommend adding; otherwise out.
- Comment moderation, profanity filtering, pre-publish SEO scoring — BLOG-05 says "automated SEO + tone check pre-publish" but the runtime for that check (Edge Function vs. n8n step vs. manual gate) is sister-specialist scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BLOG-01 | DB audit + cleanup — categorize + hard-delete unsalvageable rows | DB Schema Audit (§ Standard Stack); Live Row State Inventory (§ Runtime State Inventory) |
| BLOG-02 | Rebuild `/blog` + `/blog/[slug]` UI server-rendered, persona-aligned, breadcrumbs, clean slugs | UI Codebase Audit (§ Architecture Patterns); Soft-404 verdict (§ Soft-404 Risk Audit) |
| BLOG-03 | Redesign n8n content-generation workflow, document in N8N-FLOW.md | n8n Surface Map (§ n8n Surface Audit); sister-specialist scope owns content strategy |
| BLOG-04 | 10–15 persona-aligned posts; each with unique OG image | Sister specialist owns; this research notes infrastructure constraints |
| BLOG-05 | Content review/QA: `draft` → `in-review` → `published` states; manual approval gate | DB Schema Audit (§ Standard Stack — `status` CHECK gap) |
| BLOG-06 | Sitemap + RSS reflect new dataset; `robots.ts` unchanged | Sitemap + RSS Audit (§ Sitemap and RSS Verdict) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Blog post content storage | Database (`public.blogs` table) | — | RLS-gated, anon-readable for `status='published'` only |
| Category taxonomy | Database (`get_blog_categories` RPC, derived from `blogs.category`) | — | Currently free-text; recommend normalization (see Open Questions) |
| `/blog` index render | Frontend Server (Next.js Server Component) | — | Today: client-rendered; rebuild target: SSR per BLOG-02 / PERF-01 |
| `/blog/[slug]` detail render | Frontend Server (already SSR) | — | Already correct; rebuild adds `generateStaticParams` for ISR + real-404 contract |
| `/blog/category/[slug]` render | Frontend Server (page.tsx is SSR; client-component for list) | Browser (`useBlogsByCategory`) | Hybrid; rebuild moves the list to server |
| Sitemap generation | Frontend Server (`src/app/sitemap.ts`) | Database (real `lastmod` from row `updated_at`) | ISR with 24h `revalidate`; already honest |
| RSS feed generation | Frontend Server (`src/app/feed.xml/route.ts`) | Database | ISR 24h; already correct + escape-hardened |
| Newsletter signup | Edge Function (`newsletter-subscribe`) | Resend Contacts API | Public, rate-limited 5/min/IP |
| n8n content-generation flow | n8n (external SQLite) | Database (writes to `public.blogs` via service role) | OUT OF REPO; rebuild documented in `N8N-FLOW.md` |
| n8n operations flow (5 triggers) | Database (SECURITY DEFINER triggers + `app_config` config table) | n8n (consumer of webhooks) | UNRELATED to blog rebuild — do NOT touch |
| Reject-bad-rows guard | Database (`reject_n8n_error_blogs_trigger`) | — | Phase-1 emergency; Phase-6 obligation to drop after Wave 4 verifies redesigned flow |

## Standard Stack

### Core (already in tree, KEEP)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x | Framework — server components, ISR, `generateStaticParams`, `notFound()` | Locked; project standard |
| `react-markdown` | 9.x | Markdown rendering for post body | Already wired; `remarkGfm` + `rehypeRaw` + `rehypeSanitize`; pure-Node so SSRs cleanly |
| `remark-gfm` | latest | GFM tables, strikethrough, autolinks | Already wired |
| `rehype-raw` | latest | Allow inline HTML in markdown | Already wired |
| `rehype-sanitize` | latest | XSS guard on rehype-raw output | Already wired; non-negotiable security primitive |
| Supabase JS (`@supabase/ssr`) | latest | DB access via PostgREST + RPCs | Project standard; `getAll`/`setAll` cookie pattern enforced |
| TanStack Query | 5.x | Client-side cache for related-posts (only remaining client fetch on detail page) | Project standard; `queryOptions()` factories in `src/hooks/api/query-keys/blog-keys.ts` |
| `nuqs` | latest | URL-state for `?page=` pagination | Already wired in `BlogPagination` |
| `lucide-react` | latest | Icons (`ArrowLeft`, `ArrowRight`, `Clock`, `User`, `Mail`, `ChevronLeft`, `ChevronRight`, `ClipboardCheck`, `Download`, `FileText`, `Table`) | Locked sole icon library |
| shadcn `<Button>` | — | CTA buttons inside CTAs + breadcrumb back-links | Already used |

### Supporting (project conventions to honor)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `<JsonLdScript>` | local | JSON-LD emission | Used today on all 3 blog page types; keep |
| `createBreadcrumbJsonLd` | local | BreadcrumbList schema | Used today; UI breadcrumbs in BLOG-02 must mirror this same path-segments structure |
| `createArticleJsonLd` | local | Article schema with `authorType: 'Organization'` for "TenantFlow Team" byline | Used today on `/blog/[slug]/page.tsx` |
| `<PageLayout>` (`src/components/layout/page-layout.tsx`) | local | Wraps marketing pages with navbar + footer + grid pattern + `page-offset-navbar` | All blog pages already use; KEEP — never re-add `page-offset-navbar` to children |
| `BlogCard` (`src/components/blog/blog-card.tsx`) | local, 53 lines | Card primitive for hub/category/related grids | KEEP — already aligned to tokens (`bg-card`, `text-muted-foreground`, lucide icons) |
| `BlogEmptyState` | local, 65 lines | CSS-only typewriter empty-state | KEEP — already used; rebuild uses on hub when zero published posts |
| `BlogLoadingSkeleton` | local, 54 lines | CSS-only text-reveal loading skeleton | KEEP for the surfaces that REMAIN client-rendered (related-posts on detail page) |
| `useRelatedPosts` (in `use-blogs.ts`) | local | TanStack Query hook for related-posts on detail page | KEEP — only remaining client fetch on detail page |
| `BlogInlineCta` | local, 43 lines | Inline mid-post CTA | KEEP, but persona pass needed (current copy: "Managing rentals shouldn't be this hard") |
| `LeadMagnetCta` | local, 94 lines | Email-gated download CTA, conditionally rendered for 3 specific slugs | KEEP — already wired to `BLOG_TO_RESOURCE` map |
| `NewsletterSignup` | local, 84 lines | Inline email + Resend Contacts API call | KEEP — wired to working `newsletter-subscribe` Edge Function |
| `BlogPagination` | local, 62 lines | Page numbers via nuqs | KEEP — works today |
| `RelatedArticles` (`src/components/blog/related-articles.tsx`) | local, 55 lines | Async server component for cross-link sections | KEEP — already SSR; used by compare + resource pages |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Verdict |
|------------|-----------|----------|---------|
| `react-markdown` + sanitize | MDX (`@next/mdx`) | MDX gives JSX-in-markdown but requires posts to be FILES not DB rows; would force the entire content pipeline off n8n + DB into git. Out-of-scope rewrite. | KEEP `react-markdown` |
| Free-text `category` column | Per-owner `blog_categories` table mirroring `document_categories` (Phase-65 pattern) | Adds normalization, but blogs have no per-owner concept (single global taxonomy); over-engineering for ~5 categories | KEEP free-text + `get_blog_categories` RPC for now; recommend slug-regex CHECK on `category` to prevent typos |
| Client-rendered hub | Streaming SSR with `<Suspense>` per zone | Streams comparisons/grid/categories in parallel; complex for marginal gain on a small page | KEEP simple async server component (sequential awaits inside one component) |
| Custom breadcrumb component | shadcn `<Breadcrumb>` | Adds shadcn primitive; current `src/components/` has none | RECOMMEND shadcn `<Breadcrumb>` — pre-built, accessible, token-aligned (see code example below) |
| `useBlogCategories` hook on hub | `await supabase.rpc('get_blog_categories')` directly in Server Component | Hook = client + roundtrip; direct = SSR-time | RECOMMEND direct RPC in server component |

**Installation (Phase 6 needs):**

```bash
# shadcn breadcrumb is the only NEW primitive
pnpm dlx shadcn@latest add breadcrumb
# All other libraries already in package.json
```

**Version verification:** Skipping `npm view` — every package above is already pinned in `package.json` and verified working in production via 2026-04 release cadence (v2.6 ships these). The rebuild does not introduce or upgrade any library.

## Architecture Patterns

### Recommended Project Structure (post-rebuild)

```
src/app/blog/
├── page.tsx                              # SERVER COMPONENT (rewrite — drop BlogClient)
├── error.tsx                             # KEEP (13 lines)
├── [slug]/
│   ├── page.tsx                          # KEEP (already SSR + notFound; ADD generateStaticParams)
│   ├── blog-post-page.tsx                # KEEP (still 'use client' for image blur-fade + relatedPosts hook)
│   ├── markdown-content.tsx              # KEEP (35 lines — pure data transform, no edits)
│   └── page.test.tsx                     # KEEP + minor updates for breadcrumb assertion
└── category/[category]/
    ├── page.tsx                          # KEEP (already SSR + notFound for unknown slug)
    ├── blog-category-client.tsx          # REWRITE → SSR (delete client component, inline server-rendered grid)
    └── page.test.tsx                     # REWRITE for SSR testing (vitest + RSC)

src/components/blog/
├── blog-card.tsx                         # KEEP
├── blog-card.test.tsx                    # KEEP
├── blog-pagination.tsx                   # KEEP (still client — uses nuqs)
├── blog-pagination.test.tsx              # KEEP
├── blog-inline-cta.tsx                   # KEEP — persona pass
├── lead-magnet-cta.tsx                   # KEEP
├── newsletter-signup.tsx                 # KEEP
├── newsletter-signup.test.tsx            # KEEP
├── related-articles.tsx                  # KEEP (async RSC)
└── breadcrumb.tsx                        # NEW (shadcn primitive)

src/components/shared/
├── blog-empty-state.tsx                  # KEEP
├── blog-empty-state.test.tsx             # KEEP
└── blog-loading-skeleton.tsx             # KEEP for related-posts client zone

src/hooks/api/
├── use-blogs.ts                          # SHRINK — keep only useRelatedPosts; drop useBlogs/useBlogsByCategory/useBlogCategories/useComparisonPosts (server fetches replace them)
└── query-keys/
    ├── blog-keys.ts                      # SHRINK — keep `related` + `details` factory; the rest become unused
    └── blog-keys.test.ts                 # SHRINK accordingly

supabase/migrations/
├── <YYYYMMDDHHMMSS>_blog_phase6_schema.sql    # NEW — CHECK constraint update for in-review; slug regex CHECK; drop reject_n8n_error_blogs_trigger
└── (existing migrations untouched)
```

**Key architectural moves:**

- **Drop `BlogClient` entirely.** Inline its layout in `page.tsx` as an async server component. The data flow becomes three parallel awaits via `Promise.all` (categories + comparisons + paginated list). Empty-state branch renders `<BlogEmptyState>`.
- **Drop `BlogCategoryClient` entirely.** Inline its layout in `category/[category]/page.tsx`. The DB fetch already runs server-side via `getValidCategory()`; just add the list fetch alongside.
- **Add `generateStaticParams` to `/blog/[slug]/page.tsx`** so published slugs render from cache. Drop `export const dynamic = 'force-dynamic'` (Phase-1 emergency override) — with `generateStaticParams` returning the published slug set, Next.js 16 emits real HTTP 404 for any slug not in the set. ISR `revalidate = 300` gives a 5-minute cache window for new posts.
- **Add visible `<Breadcrumb>` to all 3 page types.** Mirrors the existing JSON-LD `BreadcrumbList` schema. Closes audit #40 + SEO-05 + BLOG-02 success criterion.
- **Persona copy pass through 5 surfaces:** `BlogClient` h1 + subtitle (when migrating to SSR), `BlogPostPage` "Ready to transform..." (line 240), `BlogInlineCta` headline (line 18), `BlogPostPage` author byline (line 164 — keep "TenantFlow Team", aligns with Article schema `authorType: 'Organization'`), and the CategoryPage description in `generateMetadata` (line 35).

### System Architecture Diagram

Data flow at runtime (post-rebuild):

```
                    ┌─────────────────────────────────────────────────┐
                    │  REQUEST: GET /blog or /blog/[slug] or          │
                    │           /blog/category/[slug]                  │
                    └─────────────────────────────────────────────────┘
                                          │
                                          ▼
                ┌────────────────────────────────────────────────────┐
                │  Next.js Server Component (page.tsx)               │
                │  - generateMetadata (cached query for slug detail) │
                │  - JSON-LD <BreadcrumbList> + <Article>            │
                │  - <Breadcrumb> visible UI (NEW Phase 6)           │
                └────────────────────────────────────────────────────┘
                                          │
                                          ├──── Promise.all parallel ────┐
                                          │                              │
                                          ▼                              ▼
                          ┌────────────────────────┐    ┌──────────────────────────┐
                          │ supabase                │    │ supabase.rpc(            │
                          │   .from('blogs')        │    │   'get_blog_categories'  │
                          │   .eq('status',         │    │ )                        │
                          │       'published')      │    │ — RLS allows anon SELECT │
                          │   .order(published_at)  │    │   (security invoker)     │
                          │   .range(...)           │    └──────────────────────────┘
                          └────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │  RLS Policy: blogs_select_       │
                         │   published                      │
                         │  USING (status = 'published')    │
                         │  TO anon, authenticated          │
                         └─────────────────────────────────┘
                                          │
                                          ▼
                          ┌────────────────────────────────────┐
                          │  Initial HTML response with FULL    │
                          │  article body for SEO + AI         │
                          │  crawlers — no client hydration    │
                          │  required to see content.          │
                          └────────────────────────────────────┘
                                          │
                                          ▼
                          ┌────────────────────────────────────┐
                          │  Hydrated: useRelatedPosts hook     │
                          │  fetches 3 same-category posts     │
                          │  (only client query remaining)     │
                          └────────────────────────────────────┘


    SEPARATE FLOW — n8n CONTENT PRODUCER (lives entirely outside this repo):

    ┌──────────────┐   service-role insert   ┌──────────────────────────┐
    │  n8n flow    │  ──────────────────────►│ public.blogs INSERT      │
    │  (SQLite,    │                          │                          │
    │  external)   │                          │ BEFORE INSERT trigger:   │
    └──────────────┘                          │ reject_n8n_error_blogs_  │
                                              │ trigger ← DROP IN P6     │
                                              │                          │
                                              │ NEW BEFORE INSERT:       │
                                              │ slug regex + status      │
                                              │ workflow CHECK           │
                                              └──────────────────────────┘
```

### Pattern 1: Server-Component Hub with Parallel Awaits

**What:** Replace `BlogClient` with an async server component that parallel-fetches the three data shapes the hub needs.
**When to use:** Public listing pages with 2–4 independent reads; project standard for marketing surfaces.
**Example:**

```tsx
// src/app/blog/page.tsx (post-rebuild)
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '#lib/supabase/server'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { PageLayout } from '#components/layout/page-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '#components/ui/breadcrumb'
import { BlogCard } from '#components/blog/blog-card'
import { BlogEmptyState } from '#components/shared/blog-empty-state'
import { NewsletterSignup } from '#components/blog/newsletter-signup'

const PAGE_LIMIT = 9

interface BlogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams
  const page = Number(params.page) || 1
  return createPageMetadata({
    title: 'Property Management Blog — Tips for Landlords with 1–15 Rentals',
    description: 'Operational guides for landlords with 1–15 rentals: leases, maintenance, tax season, and the document vault.',
    path: '/blog',
    noindex: page > 1,
  })
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const offset = (page - 1) * PAGE_LIMIT

  const supabase = await createClient()

  const [{ data: posts, count }, { data: categories }, { data: comparisons }] = await Promise.all([
    supabase
      .from('blogs')
      .select('id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + PAGE_LIMIT - 1),
    supabase.rpc('get_blog_categories'),
    supabase
      .from('blogs')
      .select('id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags')
      .eq('status', 'published')
      .contains('tags', ['comparison'])
      .order('published_at', { ascending: false })
      .limit(6),
  ])

  const totalPages = Math.ceil((count ?? 0) / PAGE_LIMIT)

  return (
    <PageLayout>
      <JsonLdScript schema={createBreadcrumbJsonLd('/blog')} />
      <Breadcrumb className="container mx-auto max-w-6xl px-6 lg:px-8 mb-6">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Blog</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Hero — persona-aligned */}
      <section className="section-spacing">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h1 className="text-responsive-display-xl font-bold tracking-tight">
            The blog for landlords with 1–15 rentals
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Operational guides for leases, maintenance, tax season, and the document vault.
          </p>
        </div>
      </section>

      {/* …rest of layout… */}

      {/* Empty state when zero published posts */}
      {(!posts || posts.length === 0) ? (
        <section className="section-spacing">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <BlogEmptyState message="More posts coming soon." />
          </div>
        </section>
      ) : (
        // …grid + pagination…
      )}
    </PageLayout>
  )
}
```

**Source:** Composite from current `blog-client.tsx` + Next.js 16 Server Component conventions per CLAUDE.md.

### Pattern 2: ISR-cached `generateStaticParams` for Real HTTP 404

**What:** Add `generateStaticParams` returning published slugs; drop `dynamic = 'force-dynamic'`. Next.js 16 emits real 404 for slugs outside the static set (matches Phase-1 follow-up comment intent).

**Example:**

```tsx
// src/app/blog/[slug]/page.tsx (post-rebuild)

// Was: export const dynamic = 'force-dynamic'  (Phase-1 emergency)
// Now: rely on generateStaticParams + revalidate for ISR + real-404
export const revalidate = 300  // 5 minutes

export async function generateStaticParams() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blogs')
    .select('slug')
    .eq('status', 'published')

  return (data ?? []).map(({ slug }) => ({ slug }))
}

// existing getBlogPost + generateMetadata + Page unchanged
```

**Source:** Next.js 16 docs — `generateStaticParams` + ISR. Cross-verified against the Phase-1 migration comment ("Phase 6 (BLOG-02 server-rendered rebuild) restores ISR with `generateStaticParams`").

### Pattern 3: shadcn `<Breadcrumb>` Mirroring JSON-LD

**What:** Render visible breadcrumbs alongside the existing JSON-LD `BreadcrumbList`. Path segments must match `createBreadcrumbJsonLd` exactly — search engines penalize visible-vs-schema mismatch.

**Example:**

```tsx
// src/app/blog/[slug]/page.tsx — server component fragment
const categoryName = post.category ?? ''
const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-')

return (
  <PageLayout>
    <JsonLdScript schema={createBreadcrumbJsonLd(`/blog/category/${categorySlug}/${slug}`, {
      [categorySlug]: categoryName,
      [slug]: post.title,
    })} />

    <Breadcrumb className="container mx-auto max-w-4xl px-6 lg:px-8 mt-6">
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbLink asChild><Link href="/blog">Blog</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        {categoryName && (
          <>
            <BreadcrumbItem><BreadcrumbLink asChild><Link href={`/blog/category/${categorySlug}`}>{categoryName}</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        <BreadcrumbItem><BreadcrumbPage>{post.title}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <BlogPostPage post={post} slug={slug} />
  </PageLayout>
)
```

**Source:** shadcn/ui breadcrumb docs (https://ui.shadcn.com/docs/components/breadcrumb).

### Anti-Patterns to Avoid

- **Don't reintroduce `dynamic({ ssr: false })` on markdown rendering.** Phase-4 SEO work (PR #674) explicitly dropped this; the article body MUST land in initial HTML for crawler visibility.
- **Don't use `useEffect`-based `router.replace('/blog')` for unknown category slugs.** Server-side `notFound()` is already correct in `category/[category]/page.tsx:46`; the client redirect (`blog-category-client.tsx:25-30`) is dead code that should be deleted.
- **Don't filter inactive properties** — that's a different table (`properties`, `status='inactive'`). Blog uses `status='published'`.
- **Don't add a `BLOG_TO_TAG` map for tag pages** — out of scope; existing `?tags=comparison` filter via `useComparisonPosts` is sufficient for the comparisons zone.
- **Don't query without `.range()` or `.limit()`** — every list query in the new code MUST have one (CLAUDE.md zero-tolerance).
- **Don't use string literal query keys** — `useRelatedPosts` is the only remaining client query; it MUST stay routed through `blogQueries.related` factory.
- **Don't break the JSON-LD `BreadcrumbList` schema by drift** — visible breadcrumbs and schema must enumerate the SAME path segments in the SAME order.
- **Don't use `bg-white` / hex colors / inline ms** — every color/spacing/duration must be a `globals.css` token (cross-cutting v1.0 constraint).
- **Don't drop the Phase-1 reject trigger BEFORE the redesigned n8n flow is verified to write valid rows.** Drop sequence is: (1) ship redesigned flow, (2) write 1 successful test post via flow, (3) drop trigger.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Visible breadcrumbs | Custom `<nav>` with `<ol>` + `<li>` | shadcn `<Breadcrumb>` | a11y (aria-current="page", semantic role), token alignment, kbd support |
| Slug derivation from category name | Inline lower-and-dasherize in 4 places | One shared helper (already done in 3 places via `name.toLowerCase().replace(/\s+/g, '-')`) | Single source — already locked in `get_blog_categories()` SQL + repeated in JSX. Phase 6 leaves as-is unless normalization migration ships. |
| Markdown rendering with sanitization | DIY HTML sanitizer | `react-markdown` + `rehype-sanitize` | XSS-safe defaults; battle-tested |
| Article rich-result schema | Hand-rolled JSON-LD | `createArticleJsonLd` | Already enforces `authorType: 'Organization'` for "TenantFlow Team" + datePublished conditional emission |
| Empty-state UI | One-off "No posts yet" `<div>` | `<BlogEmptyState>` | Already aligned to brand + accessible (role="status", sr-only label) |
| Pagination | Hand-rolled prev/next | `<BlogPagination>` (with nuqs URL state) | Already wired |
| RSS feed | Manually-written XML string | Existing `feed.xml/route.ts` | Already escape-hardened for `<>&'"` and `]]>` (cdataEscape) — battle-tested in PR #674 |
| Sitemap with `lastmod` | Hand-rolled mtime guesses | Existing `sitemap.ts` | Already pulls real `updated_at`/`published_at` from DB; honest signals only |
| Newsletter signup | Custom form posting somewhere | `<NewsletterSignup>` + `newsletter-subscribe` Edge Function | Already ships; rate-limited 5/min/IP, Resend Contacts API + cached segment ID |

**Key insight:** Phase 6 is mostly a **deletion** phase: drop `'use client'`, drop `BlogClient`, drop `BlogCategoryClient`, drop most of `use-blogs.ts` (keep only `useRelatedPosts`), drop the redirect-on-unknown-slug useEffect, drop the Phase-1 reject trigger. The diff should be net-negative lines outside of (a) breadcrumb additions, (b) the new schema migration, and (c) 10–15 generated post rows.

## Runtime State Inventory

**Trigger:** Yes — Phase 6 involves database migration (CHECK constraint update + drop of Phase-1 reject trigger), data lifecycle decisions (hard-delete vs draft for unsalvageable rows), and UI/data drift across multiple consumers.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `public.blogs` table — ~100 rows currently `status='draft'` after Phase-1 unpublish (CRIT-01 migration pre-flight: "100 bad rows of 100 published rows", all flipped to draft). Live published count today is ~0. Categories used: TBD via live query (sister specialist may inventory). Tags: free-text array. `featured_image` URLs: external (n8n-supplied) — not migrated to Supabase Storage. | **DECISION REQUIRED:** hard-delete vs keep-as-draft for 100 broken rows. Recommend hard-delete (BLOG-01 says "Hard-delete rows that fail the salvageable test"). |
| **Live service config** | n8n SQLite — content-generation workflow lives here, NOT in git. Edit history not exportable. The redesigned flow's design lives in n8n's UI. **Operations flow** (5 trigger functions) reads URLs from `public.app_config` rows seeded with empty strings; runbook documents fill-in procedure. | (a) Sister specialist owns content-flow redesign documentation in `N8N-FLOW.md`; (b) operations flow is OUT OF SCOPE — do not touch `app_config` rows or trigger functions. |
| **OS-registered state** | None — n8n runs externally; no Windows Task Scheduler / systemd / launchd / cron entries in this repo touch blog content. The 5 operations triggers fire from pg-trigger schedule, not OS. | None. |
| **Secrets/env vars** | `RESEND_API_KEY` (Edge Function) — newsletter-subscribe; unchanged by rebuild. `n8n.webhook.secret` row in `app_config` — operations flow only, unrelated. n8n service-role JWT used by content-generation flow to write rows — out of repo. | None. |
| **Build artifacts** | None — blog content is DB rows, not files. Next.js ISR cache will re-warm on `revalidate = 300` after deploy; first hit per slug will be a cache miss but the round-trip is fast. | None. |

**Nothing found in category:** Stated explicitly above.

**Single most important runtime question:** Will the Phase-1 trigger drop sequence (which Phase 6 OWNS) accidentally re-bleed the bad-row pattern if dropped before the redesigned n8n flow is verified? **Mitigation:** drop the trigger ONLY after the redesigned flow has written ≥1 valid post end-to-end through manual test.

## Common Pitfalls

### Pitfall 1: Soft-404 Reintroduction via `revalidate` Without `generateStaticParams`

**What goes wrong:** If `dynamic = 'force-dynamic'` is removed but `generateStaticParams` is not added, Next.js 16's default behavior caches the 404 fallback path with HTTP 200 + not-found UI for unknown slugs. That's exactly the soft-404 the Phase-1 emergency override was patching.
**Why it happens:** `notFound()` inside a request that hasn't been pre-rendered uses ISR-cached fallback path; without static params, Next assumes any slug is valid until proven otherwise.
**How to avoid:** Either `dynamic = 'force-dynamic'` (current Phase-1 state) OR `generateStaticParams` returning the published slug set. Phase 6 picks the latter for performance + correct 404 emission.
**Warning signs:** `curl -I https://tenantflow.app/blog/this-slug-does-not-exist` returning HTTP 200 instead of 404 post-deploy.

### Pitfall 2: Breadcrumb-vs-JSON-LD Drift

**What goes wrong:** Visible breadcrumb says `Home > Blog > Post` but JSON-LD `BreadcrumbList` says `Home > Blog > Property Management > Post`. Google flags this as a structured-data vs visible-content mismatch and may demote the rich result.
**Why it happens:** `createBreadcrumbJsonLd(`/blog/category/${categorySlug}/${slug}`, {...})` is what the slug-page calls today (line 137-143) — its path is 4 segments deep. Visible breadcrumbs must match.
**How to avoid:** Single source of truth — extract a `getBreadcrumbSegments(post)` helper used by BOTH the JSON-LD call AND the visible `<Breadcrumb>` JSX. Add a Vitest unit test that asserts the two stay in sync.
**Warning signs:** Google Search Console "BreadcrumbList" rich-result errors post-deploy.

### Pitfall 3: ISR Stale Cache for Newly-Published Posts

**What goes wrong:** Author publishes a new post via n8n; the slug doesn't appear on `/blog` for up to 5 minutes (the `revalidate` window).
**Why it happens:** ISR caches the hub page at the page level; new rows aren't reflected until next regeneration.
**How to avoid:** Acceptable trade-off for a marketing blog (5-min staleness < SEO win from cached SSR). If urgency higher, add `revalidatePath('/blog')` call inside an n8n step after each successful insert (sister specialist's flow can include this as the final HTTP request node). Document either way in `N8N-FLOW.md`.
**Warning signs:** Editor publishes a post and it's not visible on `/blog` for several minutes.

### Pitfall 4: Phase-1 Reject Trigger Outliving Its Purpose

**What goes wrong:** Phase 6 forgets to drop `reject_n8n_error_blogs_trigger`. Even with a redesigned n8n flow, any future row whose title happens to match `'Error Processing Blog'` (e.g. a deliberate post about handling errors) gets rejected with errcode 23514.
**Why it happens:** Phase-1 added the trigger as an emergency re-bleed guard with an explicit comment that Phase 6 must drop it.
**How to avoid:** Wave-1 schema migration MUST include `DROP TRIGGER IF EXISTS reject_n8n_error_blogs_trigger ON public.blogs; DROP FUNCTION IF EXISTS public.reject_n8n_error_blogs();`. Order matters: drop trigger BEFORE function (Postgres requires this).
**Warning signs:** Test post insertion via redesigned n8n flow fails with `CRIT-01: insert rejected — row matches the n8n parser-failure signature`.

### Pitfall 5: Free-Text Category Causing Sitemap-Hub Drift

**What goes wrong:** Author types "property management" in one post and "Property Management" in another. `get_blog_categories` returns BOTH as separate rows. Sitemap emits two category URLs (`/blog/category/property-management` AND `/blog/category/property-management`); same slug derived from both — collision.
**Why it happens:** `category` is free-text on the table; the slug is derived at query time via `lower(replace(b.category, ' ', '-'))` in the RPC.
**How to avoid:** Either (a) add a `WHERE LOWER(category) = LOWER(category)` normalization to the sitemap dedup logic (cheap fix), or (b) add a `category_slug` generated column + slug regex CHECK to enforce normalization at write time. Recommend (b) for defense-in-depth — see Open Questions for primitive choice.
**Warning signs:** `/sitemap.xml` lists duplicate `<url>` entries with the same `<loc>` but different `<lastmod>`.

### Pitfall 6: Server-Component Read Bypassing RLS

**What goes wrong:** A planner accidentally uses `createClient()` from `#lib/supabase/admin` (service-role) for the blog hub fetch. RLS bypassed; drafts leak into the public hub.
**Why it happens:** Both `createClient` flavors exist in the codebase; admin client is for legitimate service-role use cases (Edge Functions, cron, RLS audit tests).
**How to avoid:** Hub + slug + category-page server fetches MUST use `createClient` from `#lib/supabase/server` (anon-key client respecting RLS). Add a Vitest test that mocks both clients and asserts the page calls only the SSR-anon client. The current code already does this; just don't regress.
**Warning signs:** Draft rows visible at `/blog` post-deploy.

## Code Examples

### Schema Migration (Wave 1)

```sql
-- supabase/migrations/<ts>_blog_phase6_schema.sql
-- Phase 6 / BLOG-01 + BLOG-05: drop the Phase-1 reject trigger; tighten
-- status workflow; add slug regex CHECK; (optional) add hard-delete of
-- the ~100 unsalvageable draft rows from CRIT-01.

-- Section 1 — drop the Phase-1 reject trigger + function
-- Phase-1 migration explicitly tagged this for Phase-6 removal.
DROP TRIGGER IF EXISTS reject_n8n_error_blogs_trigger ON public.blogs;
DROP FUNCTION IF EXISTS public.reject_n8n_error_blogs();

-- Section 2 — extend the status CHECK to include 'in-review' (BLOG-05)
-- Existing CHECK is on the column DEFAULT-DDL-line-by-line, named
-- blogs_status_check (skipped in 20251210161000 because n8n was active).
-- Use a transactional swap: drop existing + add tightened.
ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_status_check;
ALTER TABLE public.blogs
  ADD CONSTRAINT blogs_status_check
  CHECK (status IN ('draft', 'in-review', 'published', 'archived'));

-- Section 3 — slug regex CHECK to prevent millisecond-suffix bleed (SEO-04)
-- Allow lowercase letters, digits, hyphens; 3–120 chars; no leading/trailing hyphen.
ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_slug_format_check;
ALTER TABLE public.blogs
  ADD CONSTRAINT blogs_slug_format_check
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 120);

-- Section 4 — (optional, gated on user decision) hard-delete unsalvageable rows
-- Phase-1 left them as status='draft' for safety; Phase 6 user signal is
-- "Hard-delete rows that fail the salvageable test" per BLOG-01.
-- DEFER if user wants to manually triage; otherwise:
-- DELETE FROM public.blogs
-- WHERE status = 'draft'
--   AND (title = 'Error Processing Blog'
--        OR content LIKE 'Error: Could not extract content. Response keys: %');

-- Section 5 — post-flight: confirm zero published broken rows + zero rejecting trigger
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM pg_trigger WHERE tgname = 'reject_n8n_error_blogs_trigger';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Phase 6 schema: reject trigger still present (%)', v_count;
  END IF;
END $$;
```

**Source:** Composite from Phase-1 migration `20260508231802_unpublish_broken_blogs.sql` + project conventions in CLAUDE.md (no PostgreSQL ENUMs, prefer text + CHECK).

### Server Component Replacing `BlogCategoryClient`

```tsx
// src/app/blog/category/[category]/page.tsx (post-rebuild)
import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '#lib/supabase/server'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { PageLayout } from '#components/layout/page-layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '#components/ui/breadcrumb'
import { BlogCard } from '#components/blog/blog-card'
import { BlogPagination } from '#components/blog/blog-pagination'
import { BlogEmptyState } from '#components/shared/blog-empty-state'
import { NewsletterSignup } from '#components/blog/newsletter-signup'
import { ArrowLeft } from 'lucide-react'

const PAGE_LIMIT = 9

interface CategoryPageProps {
  params: Promise<{ category: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const getValidCategory = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_blog_categories')
  return (data ?? []).find((c) => c.slug === slug) ?? null
})

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params
  const validCategory = await getValidCategory(category)
  if (!validCategory) return { title: 'Category Not Found | TenantFlow' }
  return createPageMetadata({
    title: `${validCategory.name} — Articles for Landlords`,
    description: `Posts about ${validCategory.name.toLowerCase()} for landlords with 1–15 rentals.`,
    path: `/blog/category/${category}`,
  })
}

export default async function BlogCategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params
  const search = await searchParams
  const validCategory = await getValidCategory(category)
  if (!validCategory) notFound()

  const page = Math.max(1, Number(search.page) || 1)
  const offset = (page - 1) * PAGE_LIMIT
  const supabase = await createClient()

  const { data: posts, count } = await supabase
    .from('blogs')
    .select('id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags', { count: 'exact' })
    .eq('status', 'published')
    .eq('category', validCategory.name)
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_LIMIT - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_LIMIT)

  return (
    <PageLayout>
      <JsonLdScript schema={createBreadcrumbJsonLd(`/blog/category/${category}`, { [category]: validCategory.name })} />

      <Breadcrumb className="container mx-auto max-w-6xl px-6 lg:px-8 mt-6">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/blog">Blog</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{validCategory.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="container mx-auto px-6 pb-12 max-w-6xl">
        <h1 className="text-3xl font-bold">{validCategory.name}</h1>
        <p className="text-muted-foreground">{count ?? 0} articles</p>
      </section>

      <section className="container mx-auto px-6 pb-16 max-w-6xl">
        {!posts || posts.length === 0 ? (
          <BlogEmptyState />
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (<BlogCard key={post.id} post={post} />))}
            </div>
            {totalPages > 1 && <BlogPagination totalPages={totalPages} className="mt-8" />}
          </>
        )}
      </section>

      <NewsletterSignup className="mt-16 container mx-auto px-6 max-w-6xl" />
    </PageLayout>
  )
}
```

**Source:** Composite from current `category/[category]/page.tsx` + `blog-category-client.tsx` collapsed into one server component.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `dynamic({ ssr: false })` for markdown rendering | Direct SSR import (`react-markdown` is pure-Node) | Phase-4 SEO work (PR #674) | Article body lands in initial HTML for SEO + AI crawlers |
| `useBlogBySlug` client hook on detail page | Server-rendered post prop passed from `page.tsx` | Phase-4 (PR #674) | Closes soft-404 hydration race; covered by markdown comment in `markdown-content.tsx` |
| Client-rendered `/blog` index | Server-rendered async component | **Phase 6 — this rebuild** | Audit #39 (PERF-01); 3-second loading state eliminated |
| Client-rendered `/blog/category/[slug]` | Server-rendered async component | **Phase 6 — this rebuild** | Same; also drops the dead `useEffect router.replace` for unknown slugs |
| `dynamic = 'force-dynamic'` on `/blog/[slug]/page.tsx` | `generateStaticParams` + `revalidate = 300` | **Phase 6 — Wave 2** | ISR for cache hits; real HTTP 404 outside the static set |
| Free-text `slug` writable by n8n | Slug regex CHECK at DB layer | **Phase 6 — Wave 1** | Closes audit #38 (`/blog/error-1778151609106`); SEO-04 success criterion |
| Phase-1 BEFORE-INSERT reject trigger | Dropped after redesigned n8n flow verified | **Phase 6 — end of Wave 4** | Per Phase-1 explicit "Phase 6 / BLOG-03 will drop this trigger" comment |
| `auth-helpers-nextjs` cookies | `@supabase/ssr` `getAll`/`setAll` | Pre-v1 — already done | N/A — already correct in `lib/supabase/server.ts` |

**Deprecated/outdated:**

- `useBlogs` / `useBlogsByCategory` / `useBlogCategories` / `useComparisonPosts` hooks in `use-blogs.ts` — after Phase 6 these become dead code. Drop alongside the client components.
- `blogQueries.list` / `blogQueries.categories` / `blogQueries.comparisons` factories in `blog-keys.ts` — same. KEEP `blogQueries.related` (used by `useRelatedPosts` on detail page) and `blogQueries.detail` (still useful for prefetch from hub list, even though primary read is server-side).
- The 30+ tests in `page.test.tsx` (`/blog`) and `page.test.tsx` (`/blog/category`) that mock the client hooks — REWRITE for SSR testing. The detail-page test (`[slug]/page.test.tsx`) already tests the post-prop pattern correctly and only needs minor breadcrumb-assertion updates.
- `BlogCategoryClient`'s redirect-to-`/blog` useEffect (lines 25-30) — dead code post-rebuild.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Live published row count is 0 or near-0 today | Summary, Runtime State Inventory | Phase-1 migration comments confirm 100/100 published rows matched the bad signature and were drafted; if some have already been re-flipped to published manually, BLOG-01 hard-delete must check that not-broken rows aren't deleted. Mitigation: Wave 1 SELECT-first query before DELETE. |
| A2 | The Phase-1 reject trigger is still active in prod | Common Pitfalls, Schema migration | Phase-1 migration shipped 2026-05-08; no later migration drops it; assumed active. If user confirms it was already dropped manually post-Phase-1, Wave-1 migration's `DROP TRIGGER IF EXISTS` is idempotent — no harm. |
| A3 | n8n content-generation flow STILL runs and STILL produces broken rows | n8n Surface Audit, Pitfall 4 | Phase-1 CONTEXT.md said "n8n confirmed still active per CONTEXT.md"; if user has paused the flow already, the trigger drop becomes a Wave-1 task with no Wave-4 dependency. Recommend confirming during Phase 6 discuss. |
| A4 | shadcn `<Breadcrumb>` is not yet installed in `src/components/ui/` | Standard Stack, Code Examples | Confirmed by file enumeration — `src/components/blog/breadcrumb.tsx` does not exist; assumes `src/components/ui/breadcrumb.tsx` also doesn't (search returned zero matches for "Breadcrumb" component file). If already present, skip the `pnpm dlx shadcn@latest add breadcrumb` step. |
| A5 | The 5 n8n operations triggers (`notify_n8n_*`) and the `app_config` table are unrelated to blog content production and will NOT be touched | Architectural Responsibility Map, n8n Surface Map | These are documented in `supabase/runbooks/n8n-webhook-config.md` as "operations" (maintenance/payment/lease/critical-error). The blog content-generation flow is a SEPARATE n8n workflow that writes to `public.blogs` directly. Confirmed via file evidence; if user confirms otherwise, scope expands. |
| A6 | The `category` column free-text is acceptable for v1.0 (no migration to category table) | Architecture Patterns, Pitfall 5 | Sister-specialist topic-cluster strategy may dictate normalization. If sister recommends a `blog_categories` table, Wave 1 schema migration adds 30–50 lines but stays in scope. |
| A7 | Sitemap + RSS code already handles empty-state gracefully | Sitemap and RSS Verdict | Confirmed via `sitemap.ts` lines 178-194 (catch-all error path leaves arrays empty) and `feed.xml/route.ts` lines 78-88 (empty `posts` array yields valid empty-channel feed). Verified by reading the code; no regression risk if Phase 6 doesn't touch these files. |
| A8 | Unique OG-image generation infrastructure (BLOG-04) is sister-specialist scope | Out-of-scope, Phase Requirements | Sister specialist's content/topic research will surface infrastructure constraints; if their plan requires `@vercel/og`, Wave 2 needs a follow-up infra task. Not blocking this research. |

**Total assumed claims:** 8. A1, A2, A3 are the highest-impact; recommend planner verify at Phase 6 discuss-phase before locking the migration ordering.

## Open Questions

1. **Workflow primitive: extend status CHECK vs. add a `workflow_state` column?**
   - What we know: BLOG-05 says "separate `draft` / `in-review` / `published` states; manual approval gate". Existing `status` column has CHECK `IN ('draft', 'published', 'archived')` (3 values, n8n write-active so original migration skipped enum conversion). Adding `'in-review'` to the existing CHECK is a 4-line migration with zero new columns; adding a separate `workflow_state` column would duplicate intent.
   - What's unclear: whether `archived` (currently in CHECK but unused in code) should stay or be removed; whether the manual-approval gate is enforced at app-layer (admin RPC) or DB-layer (a CHECK that requires `approved_by` to be set when `status='published'`).
   - Recommendation: extend the CHECK to `('draft', 'in-review', 'published', 'archived')` (Wave 1); enforce the `in-review → published` transition at app-layer (an admin RPC `approve_blog_post(uuid)` that sets `status='published'` + `published_at`); leave `archived` for future use. Document the workflow in `N8N-FLOW.md` (sister specialist scope).

2. **Hard-delete vs. keep-as-draft for the 100 broken rows?**
   - What we know: BLOG-01 says "Hard-delete rows that fail the salvageable test (rather than leaving as drafts forever)". Phase-1 left them as drafts for safety/reversibility.
   - What's unclear: whether user wants a final manual triage of any rows whose content is partially salvageable (e.g., ~10 rows might have a usable title/category even if content is corrupt).
   - Recommendation: Wave 1 ships hard-delete by default; gate behind a Phase-6 discuss-phase user confirmation. The 30-day grace window from Phase-1 has already passed by Phase-6 ship time.

3. **Slug format for new posts — millisecond timestamp handling?**
   - What we know: Audit #38: `/blog/error-1778151609106` exposed a millisecond timestamp. SEO-04 + BLOG-02 success criterion both target clean slugs. Wave-1 slug regex CHECK proposed above (`^[a-z0-9]+(-[a-z0-9]+)*$`, length 3–120) DOES allow numeric-only slugs (e.g. `2026-tax-season`). Does NOT allow `error-1778151609106`-style if the redesigned n8n flow accidentally regenerates one (because the random number > 100 chars wouldn't fit the natural-content slug pattern, but a 13-char ms timestamp WOULD fit).
   - What's unclear: should the regex additionally REJECT slugs that are pure numeric (`^\d+$`) or that contain a 13-digit substring (a heuristic for ms timestamps)?
   - Recommendation: ship the basic regex (Wave 1); add the 13-digit reject regex as a Wave-1 follow-up if the redesigned n8n flow is uncertain to produce semantic slugs. This is a sister-specialist input — if their content plan locks slug-generation in n8n, the heuristic isn't needed.

4. **Per-post unique OG image — generation primitive?**
   - What we know: BLOG-04 says "each post has unique OG image (covers part of SEO-02 for blog)". Three generation primitives are viable: (a) `@vercel/og` programmatic generation at request time (`/blog/[slug]/opengraph-image.tsx`), (b) pre-generated PNGs uploaded to Supabase Storage with `featured_image` column already pointing at them, (c) external Figma/Canva pipeline + manual upload.
   - What's unclear: whether n8n's redesigned flow can call `@vercel/og` (no — programmatic; lives in Next.js code) or whether it just uploads to Storage as part of the publish step.
   - Recommendation: sister specialist owns. If their flow uses `@vercel/og`, Wave 2 adds `opengraph-image.tsx` next to `page.tsx` in `[slug]/`. If they use static uploads, no UI work needed; n8n writes to `featured_image`.

5. **Should `BlogPostPage` stay client-rendered, or move to server with `<Suspense>` for related-posts?**
   - What we know: detail page `page.tsx` is server (post fetched there); but `<BlogPostPage>` is client (`'use client'`). The reasons for client: (a) `useState` for image blur-fade, (b) `useRelatedPosts` TanStack Query hook. Both are tiny.
   - What's unclear: whether the image blur-fade is worth `'use client'` (it's a 700ms cosmetic effect on a feature image) or whether dropping it makes the whole component server-eligible.
   - Recommendation: keep `BlogPostPage` client (the cost is tiny — only the body + related-posts grid client-bundle). Phase 6 doesn't need to optimize this. The article body is already SSR via `markdown-content.tsx`'s direct import (markdown text lands in initial HTML even though parent is `'use client'`, per the file's comment).

6. **"Software Comparisons" zone on the hub — keep horizontal-scroll, or consolidate?**
   - What we know: current `BlogClient` lines 81-98 render comparisons in a horizontal-scroll snap container with `scrollbar-hide`. Tagged via `tags @> ['comparison']` filter on the comparisons hook. A11y: horizontal scroll containers can confuse screen readers without proper labeling; current code has no `role="region"` or `aria-label`.
   - What's unclear: whether sister specialist's content plan still distinguishes "comparison posts" as a special zone or treats them as just another category.
   - Recommendation: keep the zone (it's working + valuable for SEO topic clustering) but add `role="region" aria-label="Software comparisons"` and a "View all comparisons →" link to `/blog/category/software-comparisons`. Sister specialist owns whether the zone exists at all.

7. **Visible breadcrumbs on the hub `/blog`?**
   - What we know: Audit #40 + SEO-05 + BLOG-02 say "visible breadcrumbs on blog posts and `/compare/[competitor]` pages". Detail page MUST. Category page MUST. The hub `/blog` is the root of the blog tree — its breadcrumb is just `Home > Blog`.
   - What's unclear: is a single-segment breadcrumb (`Home > Blog`) worth the visual weight on the hub?
   - Recommendation: yes, ship on all three for consistency. The hub breadcrumb is `Home > Blog` (current page); category is `Home > Blog > Category`; post is `Home > Blog > Category > Title`. Pattern repeats predictably.

## Environment Availability

> Phase 6 is a code + DB + content phase. Required external dependencies:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js 16 | UI rebuild (server components, ISR, generateStaticParams) | ✓ | 16.x | — |
| Supabase JS (`@supabase/ssr`) | DB reads from server components | ✓ | latest | — |
| `react-markdown` + plugins | Detail-page markdown rendering | ✓ | 9.x | — |
| Supabase MCP (`apply_migration`) | Wave-1 schema migration | ✓ | — | Manual `supabase db push` if MCP unavailable |
| n8n SDK (n8n-mcp) | Wave-4 redesigned content flow | ✓ (per system reminder) | — | Manual workflow design via n8n UI if MCP unavailable |
| Resend Contacts API | Newsletter signup (existing surface) | ✓ | — | — |
| `pnpm dlx shadcn@latest add breadcrumb` | Wave-2 visible breadcrumbs | ✓ (registry.npmjs.org reachable per allowlist) | latest | Hand-write a `<nav>` + `<ol>` + `<li>` (worse a11y) |
| `@vercel/og` | (conditional) per-post OG image generation | not currently in package.json | — | Static-uploaded `featured_image` URLs (current state) |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** `@vercel/og` if sister specialist's content plan uses programmatic OG; otherwise stays out-of-scope.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + jsdom; Playwright for E2E |
| Config file | `vitest.config.ts` + `playwright.config.ts` |
| Quick run command | `pnpm test:unit -- --run src/app/blog/page.test.tsx src/app/blog/[slug]/page.test.tsx src/app/blog/category/[category]/page.test.tsx` |
| Full suite command | `pnpm test:unit && pnpm test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BLOG-01 | DB schema CHECK constraint update; Phase-1 trigger dropped; slug regex enforced | Migration self-test (DO blocks) + RLS integration (existing `tests/integration/rls/`) | Migration's own `RAISE EXCEPTION` post-flight + `pnpm test:integration` | ❌ NEW: `tests/integration/rls/blogs-schema.test.ts` (assert CHECK works, trigger gone, slug regex rejects bad input) |
| BLOG-02 / PERF-01 | `/blog` server-renders post list (no client-loading state) | Vitest unit (RSC test) + Playwright | `pnpm test:unit -- src/app/blog/page.test.tsx` + `pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts` | ✓ Updated: `src/app/blog/page.test.tsx` rewritten for RSC |
| BLOG-02 / SEO-04 | Clean URL slugs (no millisecond timestamps) | Vitest unit (slug regex) + content seed test | `pnpm test:unit -- src/lib/blog/slug-validator.test.ts` (NEW) | ❌ NEW: `src/lib/blog/slug-validator.ts` + test |
| BLOG-02 / SEO-05 | Visible breadcrumbs on `/blog`, `/blog/[slug]`, `/blog/category/[slug]` | Vitest unit + Playwright | Existing E2E + new unit assertions | ✓ Updated: 3 page tests assert `<nav aria-label="Breadcrumb">` present |
| BLOG-03 | n8n flow redesign documented | Manual review of `N8N-FLOW.md` artifact | n/a | n/a (artifact, not code) |
| BLOG-04 | 10–15 persona-aligned posts in DB | DB count assertion | `pnpm test:integration -- tests/integration/rls/blogs-content-set.test.ts` | ❌ NEW: assert `count(*) FROM public.blogs WHERE status='published') >= 10` |
| BLOG-05 | `in-review` workflow state respected by RLS | RLS integration | `pnpm test:integration` | ❌ NEW: assert anon SELECT does NOT return `status='in-review'` rows |
| BLOG-06 | Sitemap + RSS reflect new dataset | Existing tests cover the path | `pnpm test:unit -- src/app/feed.xml/route.test.ts` (existing) | ✓ Existing |

### Sampling Rate

- **Per task commit:** `pnpm test:unit -- --run src/app/blog/`
- **Per wave merge:** `pnpm validate:quick` (typecheck + lint + unit) — wave 1 schema also runs `pnpm test:integration` once
- **Phase gate:** `pnpm test:unit && pnpm test:e2e && pnpm test:integration` all green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/integration/rls/blogs-schema.test.ts` — CHECK + trigger + slug-regex assertions
- [ ] `tests/integration/rls/blogs-content-set.test.ts` — published-count assertion + RLS in-review check
- [ ] `src/lib/blog/slug-validator.ts` + `.test.ts` — pure function for slug regex (used by content-set test + future content-import scripts)
- [ ] `src/app/blog/page.test.tsx` REWRITE — RSC testing pattern (different from current client-mock pattern)
- [ ] `src/app/blog/category/[category]/page.test.tsx` REWRITE — same RSC pattern
- [ ] `src/components/ui/breadcrumb.tsx` — installed via shadcn; no test needed (third-party)
- [ ] Test framework install: none (Vitest + Playwright already installed)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Blog is public; no auth on read path |
| V3 Session Management | no | Same |
| V4 Access Control | yes | RLS policy `blogs_select_published` (`status='published'`) for anon + authenticated; service-role-only INSERT/UPDATE/DELETE |
| V5 Input Validation | yes | (a) `react-markdown` + `rehype-sanitize` for post body XSS guard; (b) NEW slug regex CHECK at DB layer; (c) NEW status workflow CHECK to gate `in-review → published` |
| V6 Cryptography | no | No crypto in this surface |
| V13 API & Web Service | yes | RSS feed: existing `xmlEscape` + `cdataEscape` guard against XML injection (PR #674 hardened) |

### Known Threat Patterns for Public Blog

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via markdown body (n8n-supplied content with raw HTML) | Tampering / Information disclosure | `rehype-sanitize` strips dangerous attributes; `react-markdown` escapes by default |
| RSS XML injection via `]]>` in excerpt | Tampering | `cdataEscape` in `feed.xml/route.ts` (already in place) |
| Sitemap pollution via free-text `category` collisions | Tampering | Wave-1 slug regex CHECK; sitemap dedup logic (assumption A6) |
| Service-role bypass of RLS in Server Components | Information disclosure | Use `#lib/supabase/server` (anon-key client) — not `#lib/supabase/admin` |
| Broken-row resurrection via direct SQL | Tampering | Wave-1 schema migration optionally hard-deletes; Phase-1 trigger dropped only after redesigned flow verified |
| Soft-404 reintroduction reducing crawl efficiency | Information disclosure (SEO) | `generateStaticParams` + ISR + real-404 path (Pitfall 1) |
| Broken-blog-row content leaking via RLS-bypass admin path | Information disclosure | Service-role-only INSERT/UPDATE/DELETE policies in place; no admin-side reads in client surfaces |

## Sources

### Primary (HIGH confidence — direct file reads)

- Repo: `/Users/richard/Developer/tenant-flow/src/app/blog/**` (full directory tree, 8 files)
- Repo: `/Users/richard/Developer/tenant-flow/src/components/blog/**` (7 files including tests)
- Repo: `/Users/richard/Developer/tenant-flow/src/components/shared/blog-{empty-state,loading-skeleton}.tsx`
- Repo: `/Users/richard/Developer/tenant-flow/src/hooks/api/use-blogs.ts`
- Repo: `/Users/richard/Developer/tenant-flow/src/hooks/api/query-keys/blog-keys.ts` + `.test.ts`
- Repo: `/Users/richard/Developer/tenant-flow/src/types/supabase.ts:68-127` (blogs table types)
- Repo: `/Users/richard/Developer/tenant-flow/src/app/sitemap.ts` (full file — 234 lines)
- Repo: `/Users/richard/Developer/tenant-flow/src/app/feed.xml/route.ts` (full file — 134 lines)
- Repo: `/Users/richard/Developer/tenant-flow/src/lib/content-links.ts`
- Repo: `/Users/richard/Developer/tenant-flow/src/lib/constants/query-config.ts:68-78` (BLOG cache config)
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20251209120000_create_blogs_table.sql`
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20251210161000_add_status_enums.sql:50-225` (n8n-skipped rows)
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20251219210000_add_blogs_rls_policies.sql`
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20251220030000_fix_rls_policy_gaps.sql:11-108` (DELETE policy)
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20251230191000_simplify_rls_policies.sql:118-200` (policy consolidation + index drops)
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20260307120000_blog_categories_rpc.sql`
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20260508231802_unpublish_broken_blogs.sql` (Phase-1 cleanup + reject trigger)
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20260222130000_phase56_db_webhooks.sql:1-100` (n8n operations triggers — UNRELATED to blog)
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20260504162155_app_config_table_for_n8n_webhooks.sql`
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20260504162221_notify_n8n_read_from_app_config.sql`
- Repo: `/Users/richard/Developer/tenant-flow/supabase/migrations/20260505002058_notify_n8n_include_owner_email.sql`
- Repo: `/Users/richard/Developer/tenant-flow/supabase/runbooks/n8n-webhook-config.md` (full file)
- Repo: `/Users/richard/Developer/tenant-flow/supabase/functions/newsletter-subscribe/index.ts`
- Repo: `/Users/richard/Developer/tenant-flow/audit-ui-2026-05-08.md` (audit findings #1, #38, #39, #40 + Recommended Fix Order)
- Repo: `/Users/richard/Developer/tenant-flow/.planning/PROJECT.md` (Key Decisions, especially the "Blog: full rebuild" decision and the "Phase 1 stop-bleed" decision)
- Repo: `/Users/richard/Developer/tenant-flow/.planning/REQUIREMENTS.md` (BLOG-01 through BLOG-06 verbatim)
- Repo: `/Users/richard/Developer/tenant-flow/.planning/ROADMAP.md` (Phase 6 details + sequencing rationale)
- Repo: `/Users/richard/Developer/tenant-flow/.planning/phases/04-persona-copy/04-RESEARCH-persona-terminology.md` (persona lock + multi-surface strategy)
- Repo: `/Users/richard/Developer/tenant-flow/tests/e2e/tests/public/seo-smoke.spec.ts:74-180` (existing blog SEO E2E coverage)

### Secondary (MEDIUM confidence — inferred from file evidence + cross-checked)

- Phase-1 migration comments stating live row state ("100 bad rows of 100 published rows") — inferred Phase-6 starting state
- Phase-1 migration explicit comment "Phase 6 / BLOG-03 will drop this trigger" — locks the trigger-drop as a Phase-6 obligation
- CLAUDE.md project conventions (no PostgreSQL ENUMs, `getAll`/`setAll` cookie pattern, query-key factories, no `as unknown as` casts) — applied throughout

### Tertiary (LOW confidence — speculative, flagged for validation)

- shadcn `<Breadcrumb>` registry version (assumed latest at install time)
- n8n content-generation flow's current state (running vs paused) — needs Phase 6 discuss-phase user confirmation
- Whether any of the 100 drafted rows have been manually re-flipped to `published` post-Phase-1 — needs Wave-1 SELECT verification before hard-delete

## Metadata

**Confidence breakdown:**

- DB schema (table columns, CHECK constraints, RLS policies, indexes): **HIGH** — direct migration reads + supabase.ts type cross-check
- Live row state (count of published rows today): **MEDIUM** — Phase-1 migration comments imply zero or near-zero, not directly queried via MCP this session
- Phase-1 trigger still live: **MEDIUM** — no later migration drops it; assumed active
- UI codebase enumeration (10 files): **HIGH** — full reads
- Soft-404 verdict on `/blog/[slug]`: **HIGH** — read code shows `notFound()` + `force-dynamic`; behavior verifiable via curl post-deploy
- Sitemap + RSS empty-state behavior: **HIGH** — code reads explicit
- n8n surface decomposition (content-flow vs operations-flow): **HIGH** — file evidence + runbook + migration comments
- Test inventory: **HIGH** — direct file reads + grep
- Persona alignment for new copy: **HIGH** — Phase 4 research locked persona, copy lift is mechanical
- Open questions (workflow primitive, hard-delete decision, OG image strategy): **LOW** — strategic decisions for user/sister-specialist

**Research date:** 2026-05-10
**Valid until:** 2026-06-09 (30 days; n8n flow state can shift; row counts can shift if any manual SQL run on prod)

---

## RESEARCH COMPLETE

**Phase:** 6 — Blog Rebuild + n8n Redesign
**Confidence:** HIGH on file/migration evidence; MEDIUM on live row state (MCP query tools not loaded); LOW on the 7 open questions that need user/sister-specialist input

### Key Findings

- **Phase 1 already drafted ~100 broken rows** — every published row matched the `Error Processing Blog` signature. Live `/blog` index renders empty state today.
- **`/blog` index is client-rendered** (`BlogClient` + `useBlogs/useBlogCategories/useComparisonPosts`); the rebuild collapses it into one async server component. ~134 lines deleted, ~150 lines added.
- **`/blog/[slug]` already has the correct soft-404 fix** (Phase-1 emergency: `force-dynamic` + `notFound()`); Phase 6's BLOG-02 work is to swap to `generateStaticParams` + ISR + revalidate=300 for performance while keeping real HTTP 404 behavior.
- **Phase-1 BEFORE-INSERT reject trigger is a pre-locked Phase-6 obligation to drop** — explicit comment in `20260508231802_unpublish_broken_blogs.sql`. Drop sequence: redesigned n8n flow verified → drop trigger.
- **Two n8n surfaces exist**: (a) content-generation flow lives ENTIRELY in n8n's external SQLite (NOT in repo); (b) operations flow (5 trigger functions + `app_config` table + runbook) is UNRELATED to blog rebuild and must NOT be touched.
- **Sitemap + RSS already handle empty state correctly** (PR #674 work) — Phase 6 does not modify these files; they auto-update once Wave 3 ships 10–15 published posts.
- **Visible breadcrumbs need a NEW shadcn primitive** (`pnpm dlx shadcn@latest add breadcrumb`) — no breadcrumb component exists in `src/components/` today.
- **Status workflow gap**: existing CHECK is `('draft', 'published', 'archived')`; BLOG-05 needs `'in-review'`. Wave 1 extends the CHECK + adds slug regex CHECK to permanently close the audit-#38 millisecond-slug bleed.
- **Test rewrite scope**: 2 of the 3 page tests must be rewritten for RSC pattern (page.test.tsx for `/blog` and `/blog/category`). The detail-page test (`[slug]/page.test.tsx`) only needs minor breadcrumb-assertion updates.

### File Created

`/Users/richard/Developer/tenant-flow/.planning/phases/06-blog-rebuild/06-RESEARCH-codebase-audit.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| DB schema | HIGH | Direct migration reads + supabase.ts cross-check |
| UI codebase | HIGH | Full file reads (16 files) |
| Soft-404 verdict | HIGH | Code reads explicit; verifiable via curl |
| Sitemap/RSS | HIGH | Empty-state path explicitly handled in code |
| n8n surface map | HIGH | Two-surface decomposition backed by file + runbook + migration evidence |
| Test inventory | HIGH | Full directory enumeration |
| Live row state today | MEDIUM | MCP query tools not loaded this session; inferred from Phase-1 migration comments |
| 7 strategic open questions | LOW | Need user / sister-specialist input |

### Open Questions (Strategic — User Must Answer)

1. **Workflow primitive:** extend `status` CHECK to add `'in-review'` (recommended) vs add a separate `workflow_state` column?
2. **Hard-delete vs keep-as-draft** for the 100 broken rows? (BLOG-01 says hard-delete; user confirms?)
3. **Slug-format guard:** ship basic regex (allows numeric-only) vs add 13-digit-substring reject heuristic?
4. **Per-post unique OG image** generation primitive: `@vercel/og` programmatic vs static-uploaded vs Figma/Canva manual?
5. **`BlogPostPage`** stay client (current — for image blur-fade + related-posts hook) vs go server with `<Suspense>` for related-posts?
6. **"Software Comparisons" zone** on hub: keep horizontal-scroll snap (current) vs consolidate into the main grid?
7. **Visible breadcrumbs on `/blog` hub** (single-segment `Home > Blog`)? Recommended yes for consistency.

### Ready for Planning

Codebase + DB audit complete. Sister specialist 2 (competitor content strategy + topic clusters) can now feed in alongside this research, and the planner can synthesize both into PLAN files mapped to BLOG-01 through BLOG-06.
