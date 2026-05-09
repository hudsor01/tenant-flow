---
phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder
reviewed: 2026-05-08T00:00:00Z
depth: deep
files_reviewed: 1
files_reviewed_list:
  - src/app/blog/[slug]/page.tsx
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 1 Follow-up: Code Review Report (Cycle 1)

**Reviewed:** 2026-05-08
**Depth:** deep
**Files Reviewed:** 1 (`src/app/blog/[slug]/page.tsx`)
**Branch:** `gsd/phase-1-followup-soft-404` (commit `8ee217589`)
**Status:** issues_found

---

## Summary

The single-line change — swapping `export const revalidate = 3600` for `export const dynamic = 'force-dynamic'` — is correct and well-motivated. The root-loading.tsx streaming concern raised in Specialist-2's research is a non-issue: the root `loading.tsx` only triggers streaming for routes that do NOT have their own closer segment files, and since `generateMetadata` is resolved before any HTML flushes, `notFound()` will emit a real HTTP 404. The `dynamic` export value is typed correctly per Next.js 16.2 (`'auto' | 'error' | 'force-static' | 'force-dynamic'` in `app-segment-config.d.ts`). The `cache()` wrapper from React remains fully correct under `force-dynamic` — React's request-scoped deduplication cache is independent of the ISR/static layer; it deduplicates within a single request, which is exactly what is needed here.

Two issues were found: one warning (a subtle error-handling bug in the `Promise.race` chain that existed before this PR but is now permanently locked in by removing ISR) and one info item (minor comment inaccuracy).

---

## Warnings

### WR-01: `.then()` on `Promise.race` swallows Supabase errors silently

**File:** `src/app/blog/[slug]/page.tsx:47-58`

**Issue:** The `Promise.race([query, timeout])` chain calls `.then(({ data, error }) => ...)` and then `.catch(() => null)`. When Supabase returns an error response (e.g. network hiccup, RLS denial, malformed query), `error` is non-null but `data` is null. The `.then()` branch logs the error at line 50 but then falls through to `return data` — returning `null`. The `.catch()` at line 58 is only reached if the Promise itself rejects (i.e. the timeout fires). This means:

- On a Supabase error response (resolved promise, `error !== null`): `data` is null, `notFound()` fires, and the visitor gets a 404 — **even for a real published post during a transient DB error.** This was acceptable under ISR because a cached response would serve in most cases. With `force-dynamic`, every request hits the DB, so a transient Supabase error during high-traffic will cause published posts to return 404. This is now a higher-probability user-facing bug.
- The `.catch()` branch also returns `null`, collapsing the timeout error (a recoverable infra problem) into the same code path as a missing post. There is no differentiation between "post doesn't exist" and "DB is unreachable."

This is not a regression introduced by this PR — the logic pre-dated the change — but the removal of ISR (which masked this via cache hits) makes it a live user-facing risk rather than an edge case.

**Fix:** Separate the "missing post" path from the "DB error" path. The cleanest approach for this route is to throw/re-throw on DB errors so Next.js surfaces its error boundary (a 500) rather than a misleading 404:

```typescript
const getBlogPost = cache(async (slug: string) => {
  const supabase = await createClient()

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Blog post query timed out')), 5000)
  })
  const query = supabase
    .from('blogs')
    .select('title, slug, published_at, updated_at, featured_image, content, reading_time, category, meta_description, excerpt, tags')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  try {
    const { data, error } = await Promise.race([query, timeout])
    if (error) {
      // PostgREST PGRST116 = "no rows" — the slug genuinely doesn't exist.
      // Any other error code = infrastructure problem; surface as 500 via throw.
      if (error.code === 'PGRST116') return null
      logger.error('Blog post query failed', {
        action: 'getBlogPost',
        route: `/blog/${slug}`,
        metadata: { error: error.message }
      })
      throw new Error('Blog post query failed')
    }
    return data
  } catch (err) {
    if (err instanceof Error && err.message === 'Blog post query timed out') {
      logger.error('Blog post query timed out', {
        action: 'getBlogPost',
        route: `/blog/${slug}`,
        metadata: {}
      })
      throw err // let Next.js error boundary handle it as 500
    }
    throw err
  } finally {
    if (timer) clearTimeout(timer)
  }
})
```

Note: `.single()` returns `PGRST116` when zero rows match — that is the correct "not found" signal. All other error codes indicate a real DB problem.

---

## Info

### IN-01: Comment says "100 broken blog rows" — original PR text said "70+"

**File:** `src/app/blog/[slug]/page.tsx:14`

**Issue:** The inline comment reads: *"slows Google deindex of the 100 broken blog rows the Phase-1 migration drafted."* The `01-RESEARCH-blog-seo.md` consistently says "70+ broken URLs" and "~70 draft rows." The `01-CONTEXT.md` decisions block says "~70+ posts." The number `100` does not appear in any research artifact and is likely a rounding error introduced when writing the comment. Minor but the comment is a permanent breadcrumb — it should be accurate.

**Fix:** Change `100` to `~70` in line 14:

```typescript
// returns soft-404 (HTTP 200 + not-found UI), not real HTTP 404. This breaks
// Specialist-2's "real 404 emitted by framework" contract and slows Google
// deindex of the ~70 broken blog rows the Phase-1 migration drafted.
```

---

## Findings on All Review Dimensions

### 1. Next.js 16 `force-dynamic` correctness — PASS

`export const dynamic = 'force-dynamic'` is the correct primitive. Confirmed via `node_modules/next/dist/build/segment-config/app/app-segment-config.d.ts` line 68:

```typescript
dynamic?: 'auto' | 'error' | 'force-static' | 'force-dynamic';
```

`force-dynamic` opts the route entirely out of the static/ISR rendering pipeline. Every request goes through the Node.js runtime. Under this mode, `notFound()` called from `generateMetadata` (line 71) — which runs before JSX rendering — correctly emits HTTP 404. This is confirmed by Next.js App Router semantics: the router resolves `generateMetadata` before initiating streaming, so the response status is set to 404 prior to any bytes being sent. No `loading.tsx` exists in `/blog/[slug]/` or its ancestors (root `loading.tsx` at `src/app/loading.tsx` only applies to routes without closer segment files; with `force-dynamic` the route is fully server-rendered per request anyway, so `loading.tsx` is irrelevant).

Alternatives considered and correctly not used:
- `revalidate = 0`: equivalent to `force-dynamic` in effect but semantically "always revalidate ISR" — the ISR machinery still runs. `force-dynamic` is the cleaner, explicit primitive.
- `unstable_noStore()`: function-level, not route-level; insufficient since both `generateMetadata` and `Page` need the signal.

### 2. `cache()` wrapper compatibility with `force-dynamic` — PASS

`React.cache()` provides request-scoped deduplication — it memoizes within a single server request. It is orthogonal to the ISR/static layer. With `force-dynamic`, each request is fully server-rendered and gets its own `cache()` scope. `generateMetadata` and `Page` both call `getBlogPost(slug)` but the second call hits the memoized result from the first call within the same request. This remains correct and optimal under `force-dynamic`. No action needed.

### 3. Cost/performance regression — ACCEPTABLE (with caveat noted in WR-01)

The comment's claim — "ISR cache hits are zero in the current state" because all rows were drafted — is accurate. Every request was already hitting the DB since no ISR-cached published responses exist. The move to `force-dynamic` is a semantic formalization of the actual current behavior, not a regression. The 5-second timeout at line 38 is appropriate; 80-398s cold-start times observed in Sentry make this a reasonable guard. WR-01 above addresses the error-handling gap that becomes more impactful without ISR.

### 4. TypeScript / linting — PASS

`export const dynamic = 'force-dynamic'` is typed as `'auto' | 'error' | 'force-static' | 'force-dynamic'` per Next.js 16 type definitions. The string literal `'force-dynamic'` is within the union. `pnpm typecheck` will not flag this. No ESLint rules in this codebase target segment config exports. The change has no other TypeScript surface area.

### 5. CLAUDE.md compliance — PASS

- No `any` types introduced.
- No barrel files touched.
- No inline styles, hex/rgb, `bg-white`, or inline-ms introduced.
- No deprecated patterns.
- No commented-out code (the block comment is an explanatory comment, not commented-out code).
- No emoji.

### 6. Phase 6 forward-carry accuracy — PASS (with caveat)

The comment at lines 20-22 states: *"Phase 6 (BLOG-02 server-rendered rebuild) restores ISR with `generateStaticParams` returning the published slug set — at that point dynamic params hit the proper 404 path while known slugs serve from cache."*

Verified against `01-CONTEXT.md` decisions: BLOG-02 is listed under Phase 6. The `01-CONTEXT.md` does not explicitly name `generateStaticParams` as the mechanism — it says "server-rendered rebuild" — but the described behavior (known slugs cached, unknown slugs 404) is precisely what `generateStaticParams` + `dynamicParams = false` (or the default fallback) provides. The comment is technically accurate and a useful breadcrumb. Minor: Phase 6's BLOG-02 spec is not fully detailed in the available context docs, but the forward-carry claim is internally consistent with how Next.js ISR + `generateStaticParams` works and consistent with the Phase 6 framing in `01-CONTEXT.md`. No correction needed.

### 7. HTTP 404 verification — ADEQUATE

The PR's verification plan (inherited from `01-RESEARCH-blog-seo.md` line 97) includes:
```bash
curl -sI https://tenantflow.app/blog/error-1778151609106 | head -1
# Expected: HTTP/2 404
```
This is the correct verification step and it is documented. The PR description references it. Adequate.

### 8. Side-effects on `/blog` index — NO UX PROBLEM

`src/app/blog/page.tsx` has no `revalidate` or `dynamic` export — it defaults to Next.js's `'auto'` dynamic behavior. The index page uses `<Suspense>` wrapping `<BlogClient />`. This inconsistency (slug page: force-dynamic; index: auto) creates no UX problem during Phase 1 because the index page's client-side `BlogClient` queries the same `status='published'` filter. The empty state (`BlogEmptyState`) is already wired and renders when zero rows are returned. No action needed for Phase 1; Phase 6 owns the index page revalidation story.

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
