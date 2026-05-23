---
phase: 06-blog-rebuild
cycle: 1
pr: 690
branch: gsd/phase-06-blog-rebuild
reviewed: 2026-05-10T00:00:00Z
depth: deep
files_reviewed: 41
files_reviewed_list:
  - .planning/STATE.md
  - .planning/phases/06-blog-rebuild/06-01-PLAN.md
  - .planning/phases/06-blog-rebuild/06-02-PLAN.md
  - .planning/phases/06-blog-rebuild/06-02-SUMMARY.md
  - .planning/phases/06-blog-rebuild/06-03-PLAN.md
  - .planning/phases/06-blog-rebuild/06-03-SUMMARY.md
  - .planning/phases/06-blog-rebuild/06-04-BRIEFS.md
  - .planning/phases/06-blog-rebuild/06-04-PLAN.md
  - .planning/phases/06-blog-rebuild/06-04-SUMMARY.md
  - .planning/phases/06-blog-rebuild/06-CONTEXT.md
  - .planning/phases/06-blog-rebuild/06-RESEARCH-codebase-audit.md
  - .planning/phases/06-blog-rebuild/06-RESEARCH-content-strategy.md
  - .planning/phases/06-blog-rebuild/06-RESEARCH.md
  - .planning/phases/06-blog-rebuild/06-VALIDATION.md
  - .planning/phases/06-blog-rebuild/N8N-FLOW.md
  - .planning/phases/06-blog-rebuild/n8n-blog-ingest.workflow.json
  - package.json
  - pnpm-lock.yaml
  - scripts/compute-hmac-vector.ts
  - src/app/api/og/blog/[slug]/route.tsx
  - src/app/blog/[slug]/page.test.tsx
  - src/app/blog/[slug]/page.tsx
  - src/app/blog/blog-client.tsx
  - src/app/blog/category/[category]/blog-category-client.tsx
  - src/app/blog/category/[category]/page.test.tsx
  - src/app/blog/category/[category]/page.tsx
  - src/app/blog/page.test.tsx
  - src/app/blog/page.tsx
  - src/components/blog/__tests__/blog-post-breadcrumb.test.tsx
  - src/components/blog/blog-post-breadcrumb.tsx
  - src/types/supabase.ts
  - supabase/functions/n8n-blog-ingest/index.ts
  - supabase/functions/tests/n8n-blog-ingest.test.ts
  - supabase/migrations/20260510214844_phase_6_drop_phase_1_reject_trigger.sql
  - supabase/migrations/20260510214900_phase_6_extend_status_check_in_review.sql
  - supabase/migrations/20260510214914_phase_6_slug_format_check.sql
  - supabase/migrations/20260510214935_phase_6_validation_triggers.sql
  - supabase/migrations/20260510214942_phase_6_delete_phase_1_broken_drafts.sql
  - supabase/migrations/20260510214950_phase_6_blogs_canonical_url.sql
  - tests/e2e/tests/public/seo-smoke.spec.ts
  - tests/integration/rls/blogs-status-workflow.rls.test.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
verdict: NEEDS-FIX
---

# Phase 6: Code Review Report — Cycle 1

**Reviewed:** 2026-05-10
**Depth:** deep
**Files Reviewed:** 41 (16 commits, 10,047 insertions / 731 deletions)
**Status:** issues_found
**Verdict:** NEEDS-FIX

## Summary

Phase 6 ships substantial work across DB, UI, Edge Function, and runbook surfaces. All locked decisions (slug regex, 9 gates, MAX_PUBLIC_PRICE_DISPLAY/Phase-5 invariants, Phase-2 NumberTicker value, 12-post slate, brief #10 canonical_url payload field, HMAC vector reproducibility, design-token diff gate, `force-dynamic` removed, `revalidate=300` set, `notFound()` for unknown slugs, `generateStaticParams` enumerating published slugs, breadcrumb visible, OG route under `/api/og/blog/[slug]`, BlogClient/BlogCategoryClient deleted) verify cleanly. No P0 blockers found.

Three Warnings need attention before the next cycle:

1. **WR-01 (HIGH):** `seo-smoke.spec.ts` locator `a[href^="/blog/"][href*="-"]` will resolve to a `/blog/category/<slug>` link before any `/blog/<slug>` post link, because category pills render above the BlogCard grid in `src/app/blog/page.tsx`. Two e2e tests (`/blog/[slug] has Article schema`, `/blog/[slug] renders visible breadcrumb + dynamic /api/og/blog/ OG image`) will fail post-Plan-06-04 editorial flip when the first picked link routes to a category page (no `Article` schema, no `og:image` matching `/api/og/blog/`).
2. **WR-02 (HIGH):** `src/app/blog/[slug]/page.test.tsx` does not exercise `generateMetadata()` despite plan acceptance criteria explicitly requiring assertions that `openGraph.images[0].url` matches `/api/og/blog/{slug}` AND `alternates.canonical` flips between `'/compare/buildium'` and the default based on `post.canonical_url`. The wiring is correct in source and pinned by the e2e (post-publish, skip-until-flip), but the planned unit-test coverage is missing.
3. **WR-03 (HIGH):** Edge Function `n8n-blog-ingest/index.ts:402` surfaces `error.message` from the PostgREST/Supabase error object back to the n8n caller inside `gate_failures[].message` on the `'23514'` branch. CLAUDE.md `### Edge Functions` says "never expose raw `err.message` to clients" — this is a borderline case (the message originates from our own `RAISE EXCEPTION` strings in `validate_blog_post()` and Postgres CHECK constraint names, both of which we control), but the rule reads strict. Either suppress to a generic `gate: 'db_trigger', message: 'validation failed'` or relax the rule by documenting the intentional carve-out.

The Info items are unpolished but non-blocking: category display values render as raw slug (`'lease-law'`) instead of friendly Title-Cased text in the breadcrumb and category-page H1; the blog hub's `comparisons` query relies on a `tags ?? ['comparison']` contains-filter that the briefs/n8n flow does not populate; the unused regenerated diff in `supabase.ts` drops two RPCs unrelated to Phase 6; the deno test cleanup pattern is unconventional and worth a comment for future maintainers.

Verdict: **NEEDS-FIX** because two of the three warnings (WR-01 and WR-02) directly impact test reliability and planned coverage. WR-03 is a CLAUDE.md interpretation call; either fix or write a one-line justification.

## Critical Issues

_None._

## Warnings

### WR-01: e2e SEO-smoke locator picks the wrong link once posts are live

**File:** `tests/e2e/tests/public/seo-smoke.spec.ts:152, 170, 248`
**Severity:** HIGH

**Issue:**
The shared locator pattern used in three blog-related e2e tests is:

```ts
page.locator('a[href^="/blog/"][href*="-"]').first()
```

This matches BOTH `/blog/category/lease-law` (category pill) AND `/blog/<slug>` (BlogCard). Both URLs start with `/blog/` and contain at least one hyphen. In `src/app/blog/page.tsx`, the category-pill `<Link>` renders at line ~119 — BEFORE the BlogCard grid (line ~160). `.first()` returns the first DOM-order match, which will be a category pill once the editorial flip publishes posts (since the `get_blog_categories` RPC starts returning rows).

Once the first link resolves to `/blog/category/lease-law`:

1. **Test `/blog/[slug] has Article schema` (line 150-164)** navigates to a category page and asserts `expectedTypes: ['Article', 'BreadcrumbList']`. The category page emits BreadcrumbList only — no Article. Assertion fails.
2. **Test `/blog/[slug] renders visible breadcrumb + dynamic /api/og/blog/ OG image (Plan 06-02)` (line 166-198)** navigates to the same category page. Breadcrumb visibility still holds (category page has a visible breadcrumb), but the `og:image` content for `/blog/category/lease-law` is `/images/property-management-og.jpg` (from `createPageMetadata`), NOT `/api/og/blog/<slug>`. The `toMatch(/\/api\/og\/blog\//)` assertion fails.

Both tests currently pass-by-skip because the locator's `.count()` returns 0 with zero published posts. They will start failing the first time the editorial flip publishes a post into a category with any other published post in the same category, because the category-pill row will then have a `(count >= 1)` link rendered.

**Fix:**

Tighten the locator to exclude `/blog/category/`. A simple and reliable selector is `a[href^="/blog/"][href*="-"]:not([href^="/blog/category/"])` (Playwright accepts the `:not()` pseudo-class). Apply to all three call sites:

```ts
// tests/e2e/tests/public/seo-smoke.spec.ts (lines 152, 170, 248)
const firstLink = page
  .locator('a[href^="/blog/"][href*="-"]:not([href^="/blog/category/"])')
  .first()
```

Then update the third call site (`/blog/category/[category] has BreadcrumbList schema`, line 248) similarly — that test wants `a[href^="/blog/category/"]` so the selector inversion there is fine, just confirm it stays scoped.

Add a one-line comment near each locator explaining why the `:not()` is required so future maintainers don't simplify it away.

### WR-02: Slug page test does not cover `generateMetadata()` canonical wiring

**File:** `src/app/blog/[slug]/page.test.tsx` (entire file)
**Severity:** HIGH

**Issue:**
Plan 06-02 Task 2 `<action>` Step 7 explicitly required:

> Add assertions:
> - Mock `getBlogPost` to return a known post WITH `canonical_url='/compare/buildium'`; assert `<BlogPostBreadcrumb>` is rendered.
> - Mock `getBlogPost` to return null; assert `notFound()` was called.
> - Assert `generateMetadata()` returns metadata where:
>   - `openGraph.images[0].url` matches `/api/og/blog/{slug}`
>   - `alternates.canonical === '/compare/buildium'` when the mock post has that canonical_url
>   - `alternates.canonical` is NOT `/compare/buildium` (falls back to default) when the mock post has `canonical_url: null`

The current `src/app/blog/[slug]/page.test.tsx` only imports `BlogArticlePage` from `./blog-post-page` (the client component receiving `post` as a prop). It does NOT import `generateMetadata` or the default export from `./page`, and it does NOT include any assertion on the canonical URL, OG image URL, or notFound() invocation in `page.tsx`.

The wiring in source (`src/app/blog/[slug]/page.tsx:119, 126, 165-167`) is correct:

```ts
const ogImageUrl = `/api/og/blog/${slug}`
const canonical = post.canonical_url ?? `/blog/${slug}`
// ...
alternates: { canonical }
```

And the e2e (`seo-smoke.spec.ts:217-244`) pins the buildium-canonical behavior end-to-end (with `skip-if-not-published` guard until the editorial flip). So the feature works; what's missing is the unit-test coverage that the plan committed to.

**Fix:**

Add a second `describe('generateMetadata (server entry)')` block to `page.test.tsx` that:

1. `vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }) }))`
2. `vi.mock('#lib/supabase/server', () => ({ createClient: ... }))` returning a chain that yields either a known post or `null`/`PGRST116`.
3. Import `{ generateMetadata }` from `./page`.
4. Three test cases:

```ts
it('emits alternates.canonical = post.canonical_url when non-null', async () => {
  // mock supabase to return { ..., canonical_url: '/compare/buildium' }
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'tenantflow-vs-buildium' }) })
  expect(metadata.alternates?.canonical).toBe('/compare/buildium')
})

it('falls back to /blog/{slug} canonical when post.canonical_url is null', async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'plain-post' }) })
  expect(metadata.alternates?.canonical).toBe('/blog/plain-post')
})

it('sets openGraph.images[0].url to /api/og/blog/{slug}', async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'any-post' }) })
  const images = metadata.openGraph?.images
  expect(Array.isArray(images) ? images[0] : images).toMatchObject({
    url: '/api/og/blog/any-post',
    width: 1200,
    height: 630,
  })
})
```

Also worth covering (the plan asked for): `notFound()` is called when the supabase mock returns `null`/`PGRST116`. Use `await expect(generateMetadata({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NEXT_NOT_FOUND')`.

### WR-03: Edge Function leaks DB `error.message` back to the n8n caller

**File:** `supabase/functions/n8n-blog-ingest/index.ts:398-405`
**Severity:** HIGH (CLAUDE.md interpretation)

**Issue:**
On the `error.code === '23514'` branch, the function returns:

```ts
return jsonResponse(req, 400, {
  error: 'validation_failed',
  gate_failures: [
    { gate: 'db_trigger', message: error.message },
  ],
})
```

`error.message` here comes from the PostgREST error object. For a CHECK constraint violation it looks like `new row for relation "blogs" violates check constraint "blogs_status_check"`; for our `RAISE EXCEPTION` inside `validate_blog_post()` it looks like `word_count out of range: 800 (must be 1200..3000)`. CLAUDE.md `### Edge Functions` reads:

> Errors: `errorResponse()` from `_shared/errors.ts` — never expose raw `err.message` to clients. Generic `{ error: 'An error occurred' }` + Sentry/console logging.

The carve-out here is debatable:
- The messages originate from SQL we wrote, not from arbitrary exceptions or stack traces.
- Surfacing them is the whole point of `gate_failures` (n8n needs to know which gate failed to fix the prompt and retry).
- The strict reading of CLAUDE.md still says "never expose raw `err.message`" — this is a literal violation.

**Fix:**

Pick one of two paths:

**Option A (strictest):** Map the error code to a generic gate label and stop forwarding the message:

```ts
if (error.code === '23514') {
  // DB trigger / CHECK constraint violation that survived preflight.
  // Log the full message to Sentry, return a generic identifier so the
  // n8n caller can branch on "db_trigger" but cannot read raw DB text.
  logEvent('n8n-blog-ingest: db_trigger 23514', { slug: payload.slug, code: error.code, message: error.message })
  return jsonResponse(req, 400, {
    error: 'validation_failed',
    gate_failures: [
      { gate: 'db_trigger', message: 'DB validation rejected; preflight gates did not catch this. Check Sentry for detail.' },
    ],
  })
}
```

**Option B (carve out):** Keep the message but document the intentional exception. Add a comment block above the branch explaining that (1) the only `'23514'` messages are produced by SQL we own (the `RAISE EXCEPTION` strings in `validate_blog_post()` + Postgres CHECK constraint names), (2) the message is part of the documented `gate_failures` contract n8n consumes to retry, and (3) the carve-out is reviewed as part of the Phase-6 trust boundary (T-06-01). Reference the comment from the CLAUDE.md "never expose raw err.message" rule.

Without one of those fixes, this remains a literal CLAUDE.md violation flagged by the next reviewer.

## Info

### IN-01: Category display values render as raw slug (`lease-law`) instead of Title Case

**File:** `src/app/blog/category/[category]/page.tsx:123, 132, 136`
**File:** `src/components/blog/blog-post-breadcrumb.tsx:52` (via `category` prop)
**Severity:** MEDIUM

**Issue:**
DB gate #7 constrains `blogs.category` to slug-form values: `('lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault')`. The `get_blog_categories` RPC returns `name: category` (raw slug, not Title Case) because `category` is already the slug, and `slug: lower(replace(category, ' ', '-'))` (also slug).

In the rendered breadcrumb (`{validCategory.name}` line 123) and H1 (`{validCategory.name}` line 132), the displayed text will read `lease-law` rather than `Lease Law`. Same for the BlogPostBreadcrumb (`{category}` line 52) when invoked with `post.category = 'lease-law'`.

This won't penalize SEO (visible text matches JSON-LD, which uses the same raw value via `[categorySlug]: post.category ?? categorySlug` in `src/app/blog/[slug]/page.tsx:186`). It's a UX polish issue that will land in front of the user the moment the editorial flip publishes a post.

**Fix:**
Either:
- Pretty-print the slug at render time: e.g., `humanize(validCategory.name)` where `humanize` splits on `-` and Title Cases each segment. Apply at every render site.
- Or update `get_blog_categories()` to return a friendly `display_name` column alongside `name` (slug) and `slug`. Use `display_name` for UI; keep `name` for filtering. Trades one RPC migration for cleaner downstream code.

The test fixture in `src/app/blog/page.test.tsx:112` and `[slug]/page.test.tsx:124` uses Title-Cased strings (`'Insights & Guides'`, `'Property Management'`), so unit tests will not catch the prod slug-form rendering. Update the fixtures to use the locked enum slugs and the tests will surface the issue.

### IN-02: Blog-hub `comparisons` query relies on a `tags` filter the briefs do not populate

**File:** `src/app/blog/page.tsx:66-72`
**Severity:** MEDIUM

**Issue:**
The hub page renders a "Software Comparisons" section sourced by:

```ts
supabase
  .from('blogs')
  .select(BLOG_LIST_COLUMNS)
  .eq('status', 'published')
  .contains('tags', ['comparison'])
  .order('published_at', { ascending: false })
  .limit(6),
```

The 12 paste-ready briefs in `06-04-BRIEFS.md` do NOT pass `tags` in the n8n payload, and the Edge Function `n8n-blog-ingest/index.ts` does NOT INSERT into `tags`. Brief #10 (`tenantflow-vs-buildium`) is the natural candidate for the `'comparison'` tag, but neither the brief nor the system-prompt augmentation instructs Claude to emit one.

Result: post-editorial-flip, the "Software Comparisons" section will be empty (zero rows match `.contains('tags', ['comparison'])`). The `{comparisons.length > 0 && ...}` guard then hides the entire section. The UX consequence is "section silently absent" — not a bug, but a missed product opportunity.

**Fix:**
Either:
- Have the editorial flip step manually set `tags = ['comparison']` on brief #10's row (document this in `06-04-SUMMARY.md` and in N8N-FLOW.md § editorial-flip).
- Or extend the briefs to include `tags` in the payload AND extend `n8n-blog-ingest/index.ts` to INSERT into `tags` when present (no DB schema change needed; the column already exists). Then ship brief #10 with `tags: ['comparison']`.

### IN-03: `supabase.ts` regen drops two unrelated RPCs

**File:** `src/types/supabase.ts` (lines around 2265-2700 in the diff)
**Severity:** LOW

**Issue:**
`pnpm db:types` regeneration drops two RPC declarations unrelated to Phase 6:
- `activate_lease_with_pending_subscription`
- The two-overload form of `sign_lease_and_check_activation` collapses to a single signature (the `Database["public"]["Enums"]["signature_method"]`-typed overload disappears).

Neither RPC is currently called in `src/` (verified via grep). The drop reflects prod schema drift caught by the Phase-6 regen — separate from Phase 6's own migration set. The drop is benign in this PR but would be confusing to a reviewer reading only the Phase-6 commits.

**Fix:**
Add a one-line note to `06-01-SUMMARY.md` (or `06-VERIFICATION.md` for the phase) documenting that the `db:types` regen also dropped these two RPCs as expected drift from a prior un-merged migration. Optionally `mcp__supabase__list_migrations` reconcile to confirm.

### IN-04: Deno test cleanup pattern is unconventional (`_setup` / `_teardown` as tests)

**File:** `supabase/functions/tests/n8n-blog-ingest.test.ts:135-139, 287-295`
**Severity:** LOW

**Issue:**
The cleanup logic is implemented as the first/last `Deno.test` rather than as `beforeAll`/`afterAll` hooks from `@std/testing/bdd`. The author left a comment explaining the choice (file-order serial execution; uniform discovery across runners), but the pattern is unusual and a future maintainer is likely to "fix" it by converting to BDD hooks and breaking the cleanup guarantee.

**Fix:**
Either:
- Convert to `@std/testing/bdd` `beforeAll` / `afterAll` (Deno test does support BDD hooks in recent stdlib; they DO run in file order); the existing comment notes the BDD path was rejected, but the rejection rationale ("predictable file-order serial execution") is achievable with BDD too.
- Or keep the current pattern AND add a `// DO NOT convert to beforeAll/afterAll — the _setup/_teardown tests must remain top-level Deno.tests so they run unconditionally even if every other test throws.` comment right above each.

The current single-line comment is in the file header docblock; pulling it down to each cleanup test makes the constraint visible at the exact code an editor would touch.

---

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
