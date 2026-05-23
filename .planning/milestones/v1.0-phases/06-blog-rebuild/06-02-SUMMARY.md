---
phase: 06-blog-rebuild
plan: 02
subsystem: blog
tags: [seo, ui, isr, og-image, canonical, breadcrumb, server-component]
requires: [06-01]
provides:
  - blog-hub-server-rendered
  - blog-category-server-rendered
  - blog-slug-isr-with-real-404
  - blog-visible-breadcrumb
  - blog-dynamic-og-route
  - blog-canonical-in-head
affects:
  - src/app/blog/page.tsx
  - src/app/blog/[slug]/page.tsx
  - src/app/blog/category/[category]/page.tsx
  - src/app/api/og/blog/[slug]/route.tsx
  - src/components/blog/blog-post-breadcrumb.tsx
  - src/components/ui/breadcrumb.tsx
  - tests/e2e/tests/public/seo-smoke.spec.ts
tech-stack:
  added: ["@vercel/og@0.11.1"]
  patterns: ["RSC + parallel awaits", "ISR with generateStaticParams", "Cookie-less anon client at build time", "@vercel/og edge ImageResponse"]
key-files:
  created:
    - src/app/api/og/blog/[slug]/route.tsx
    - src/components/blog/blog-post-breadcrumb.tsx
    - src/components/blog/__tests__/blog-post-breadcrumb.test.tsx
  modified:
    - src/app/blog/page.tsx
    - src/app/blog/page.test.tsx
    - src/app/blog/[slug]/page.tsx
    - src/app/blog/[slug]/page.test.tsx
    - src/app/blog/category/[category]/page.tsx
    - src/app/blog/category/[category]/page.test.tsx
    - tests/e2e/tests/public/seo-smoke.spec.ts
    - package.json
    - pnpm-lock.yaml
  deleted:
    - src/app/blog/blog-client.tsx
    - src/app/blog/category/[category]/blog-category-client.tsx
decisions:
  - "Canonical URL lives in <head> via Next.js Metadata.alternates.canonical, NOT inside the markdown body — Blocker-#1 fix"
  - "generateStaticParams uses cookie-less anon client to bypass `cookies()`-not-allowed-at-build error"
  - "OG route uses oklch inline CSS (one allowed exception per CONTEXT.md design-token rule)"
  - "ISR revalidate=300 (5 min); unknown slugs hit real HTTP 404 via notFound()"
  - "BlogPostBreadcrumb path derivation matches createBreadcrumbJsonLd to prevent visible-vs-schema drift"
metrics:
  duration_minutes: 50
  completed_date: 2026-05-10
  files_created: 3
  files_modified: 9
  files_deleted: 2
  commits: 4
  unit_tests_passing: 98578
  test_files_passing: 130
---

# Phase 6 Plan 06-02: Blog UI Server-Render + Breadcrumbs + OG + Canonical Wiring — Summary

Server-render `/blog` hub, `/blog/[slug]`, and `/blog/category/[category]` as async server components; restore ISR with `generateStaticParams` + real HTTP 404; ship visible breadcrumbs matching the JSON-LD path; mint per-post 1200×630 OG images via `@vercel/og`; wire `blogs.canonical_url` (Plan 06-01) through `Metadata.alternates.canonical` so the per-post canonical lands in `<head>` (audit-Blocker-#1 fix).

## Commits

| Hash | Type | Subject |
| ---- | ---- | ------- |
| `ae18a566e` | feat | server-render /blog hub + delete client wrappers + add @vercel/og |
| `6dae57010` | feat | isr + visible breadcrumb + per-post og + canonical wiring for blog pages |
| `6e3d46dc9` | test | extend seo-smoke spec with breadcrumb + og + canonical assertions |
| `26058e2a9` | fix  | use cookie-less anon client in generateStaticParams |

## Files

### Created (3)
- `src/app/api/og/blog/[slug]/route.tsx` — `@vercel/og` 1200×630 ImageResponse on edge runtime, 1h CDN cache, oklch brand gradient
- `src/components/blog/blog-post-breadcrumb.tsx` — server-renderable breadcrumb wrapper for post + category pages
- `src/components/blog/__tests__/blog-post-breadcrumb.test.tsx` — pins the 4-segment / 3-segment branches + aria-current

### Modified (9)
- `src/app/blog/page.tsx` — rewritten as async server component (no `'use client'`, no client-loading state). `{ count: 'exact' }` + `.range()` + parallel awaits via `Promise.all`. Visible Breadcrumb above hero.
- `src/app/blog/page.test.tsx` — rewritten for Vitest RSC pattern; asserts breadcrumb nav landmark, BlogCard per-post, category pills, comparisons section, pagination branches, empty-state.
- `src/app/blog/[slug]/page.tsx` — dropped `export const dynamic = 'force-dynamic'`; added `export const revalidate = 300` + `generateStaticParams()` (cookie-less anon client at build time); `getBlogPost` SELECT extended with `canonical_url`; `generateMetadata` sets `openGraph.images` / `twitter.images` to `/api/og/blog/{slug}` and `alternates.canonical = post.canonical_url ?? /blog/{slug}`; renders `<BlogPostBreadcrumb>` above `<BlogPostPage>`.
- `src/app/blog/[slug]/page.test.tsx` — added `generateMetadata` branch coverage: canonical_url non-null → that URL, null → `/blog/{slug}` fallback, og:image[0].url → `/api/og/blog/{slug}`, `notFound()` call on missing row.
- `src/app/blog/category/[category]/page.tsx` — rewritten as async server component; cached `getValidCategory()`; `notFound()` for unknown slugs; `{ count: 'exact' }` + `.range()` pagination; visible Breadcrumb (Home > Blog > Category).
- `src/app/blog/category/[category]/page.test.tsx` — rewritten for RSC pattern; asserts breadcrumb, h1 from DB-resolved name, BlogCard count, pagination, empty state, `notFound()` invocation.
- `tests/e2e/tests/public/seo-smoke.spec.ts` — 4 new test blocks: visible breadcrumb on /blog/[slug], og:image URL pattern, real 404 for unknown slug, tenantflow-vs-buildium canonical → /compare/buildium (skip-if-not-published).
- `package.json` — `@vercel/og@0.11.1` added.
- `pnpm-lock.yaml` — `@vercel/og` + transitive deps locked.

### Deleted (2)
- `src/app/blog/blog-client.tsx` — replaced by inline server-rendering in `src/app/blog/page.tsx`.
- `src/app/blog/category/[category]/blog-category-client.tsx` — replaced by inline server-rendering in the category page rewrite.

## Blocker-#1 Fix Confirmation

Per-post canonical override now lives in `<head>` via the Next.js Metadata API, NOT inside the markdown body.

**Wiring path:**

```
blogs.canonical_url column (Plan 06-01)
    → getBlogPost SELECT picks it up
    → generateMetadata sets `alternates: { canonical: post.canonical_url ?? `/blog/${slug}` }`
    → Next.js framework emits `<link rel="canonical" href="...">` in <head>
```

**Test coverage:**
- Unit (`page.test.tsx`): `canonical_url='/compare/buildium'` row → `metadata.alternates.canonical === '/compare/buildium'`
- Unit: `canonical_url=null` row → `metadata.alternates.canonical === '/blog/{slug}'` (default canonical preserved)
- e2e (`seo-smoke.spec.ts`): `/blog/tenantflow-vs-buildium` → `<link rel="canonical">` matches `/\/compare\/buildium$/` (skip-if-not-published until Plan 06-04)

## next build Output Excerpt

```
├ ƒ /api/og/blog/[slug]      (edge runtime, dynamic)
├ ƒ /blog                    (server-rendered, accepts searchParams)
├ ● /blog/[slug]             (SSG via generateStaticParams + ISR 5-min)
├ ƒ /blog/category/[category] (server-rendered, accepts searchParams)
```

`● /blog/[slug]` confirms `generateStaticParams` ran successfully at build time after the cookie-less anon client fix. Unknown slugs outside the prerendered set fall through to `notFound()` for a real HTTP 404 (BLOG-02 contract).

## Verification

| Check | Result |
| ----- | ------ |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm test:unit` | **130 files, 98,578 tests pass** |
| `pnpm next build` | exit 0, `● /blog/[slug]` SSG |
| Acceptance grep: `grep -L "'use client'" src/app/blog/page.tsx` | OK |
| Acceptance grep: `grep -L "'use client'" src/app/blog/category/[category]/page.tsx` | OK |
| Acceptance grep: `grep -F "export const dynamic = 'force-dynamic'" src/app/blog/[slug]/page.tsx` | 0 (dropped) |
| Acceptance grep: `grep -F "export const revalidate = 300" src/app/blog/[slug]/page.tsx` | 1 |
| Acceptance grep: `grep -F "generateStaticParams" src/app/blog/[slug]/page.tsx` | 1 |
| Acceptance grep: `grep -F "canonical_url" src/app/blog/[slug]/page.tsx` | 3 |
| Acceptance grep: `grep -F "/api/og/blog/" src/app/blog/[slug]/page.tsx` | 2 |
| Acceptance grep: `grep -F "BlogPostBreadcrumb" src/app/blog/[slug]/page.tsx` | 2 |
| Acceptance grep: `grep -F "ImageResponse" src/app/api/og/blog/[slug]/route.tsx` | 2 |
| Acceptance grep: `grep -F "runtime = 'edge'" src/app/api/og/blog/[slug]/route.tsx` | 1 |
| Design-token gate: hex/rgb additions outside OG route | 0 |
| Phase 2 zero-tolerance: `any` types in new files | 0 |
| Phase 2 zero-tolerance: `as unknown as` in new files | 0 |
| Phase 2 zero-tolerance: `bg-white` in new files | 0 |
| Phase 4 regression: MarkdownContent server import | preserved |
| Phase 4 regression: Article schema Organization branch | preserved |
| Phase 4 regression: robots.ts + feed.xml + llms.txt | preserved |
| Phase 5 regression: src/config/pricing.ts | preserved |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cookie-less anon client in generateStaticParams**
- **Found during:** Verification step 3 (`pnpm next build`)
- **Issue:** Build crashed with `Route /blog/[slug] used \`cookies()\` inside \`generateStaticParams\`. This is not supported because generateStaticParams runs at build time without an HTTP request.` The plan's action step referenced `await createClient()` from `#lib/supabase/server`, which depends on `cookies()` from `next/headers`.
- **Fix:** Import `createClient` from `@supabase/supabase-js` directly (renamed to `createSupabaseClient`) for the build-time slug enumeration; keep `createClient` from `#lib/supabase/server` (renamed to `createServerClient`) for `getBlogPost` at request time. Anon-key client still respects RLS (`status='published'` is the public read policy gate), so build-time visibility matches request-time visibility.
- **Files modified:** `src/app/blog/[slug]/page.tsx`
- **Commit:** `26058e2a9`

### Path Note

The plan's `<files_modified>` frontmatter listed `src/components/blog/blog-client.tsx` and `src/components/blog/blog-category-client.tsx` as the deletion targets, but the historical files were at `src/app/blog/blog-client.tsx` and `src/app/blog/category/[category]/blog-category-client.tsx` (verified via `git log --all`). Deletions executed against the actual on-disk paths.

## Threat Flags

None — no new trust boundaries beyond the threat model in the plan (T-06-08..T-06-12 + T-06-24 all mitigated as specified).

## Self-Check: PASSED

- All 3 created files exist on disk
- All 9 modified files contain the expected changes
- Both deleted files are absent from working tree
- All 4 commits exist in git log
- Acceptance grep checks all pass
- `next build` succeeds with `● /blog/[slug]` SSG marker
- 98,578 unit tests pass; targeted 4-file test set passes 35/35
