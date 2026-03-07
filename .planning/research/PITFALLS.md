# Domain Pitfalls

**Domain:** Blog redesign (pagination, categories RPC, newsletter Edge Function) + CI workflow optimization
**Researched:** 2026-03-06
**Confidence:** HIGH (verified against codebase patterns, official docs, and existing conventions)

---

## Critical Pitfalls

Mistakes that cause broken features, data layer inconsistencies, or convention violations requiring rework.

### Pitfall 1: Blog Query Keys Violate Project Convention (No queryOptions() Factory)

**What goes wrong:** The plan rewrites `use-blogs.ts` with a `blogKeys` object that uses raw `as const` arrays, while every other domain in the codebase uses `queryOptions()` factories in `src/hooks/api/query-keys/`. The CLAUDE.md rule "No string literal query keys -- always use queryOptions() factories from src/hooks/api/query-keys/" is directly violated. The blog hooks file stays in `src/hooks/api/use-blogs.ts` with inline `queryKey` arrays instead of being split into a `query-keys/blog-keys.ts` factory.

**Why it happens:** The existing `use-blogs.ts` already uses the old pattern (raw `blogKeys` object without `queryOptions()`). The plan copies this pattern forward rather than aligning with the post-v1.0 convention. It is easy to miss because the old code "works" -- TanStack Query does not care about the pattern, only the project conventions do.

**Consequences:**
- Breaks the established codebase convention that every other domain follows (property, tenant, lease, maintenance, payment, billing, report, analytics, inspection, unit, financial -- 12 domains)
- Cannot share `queryOptions()` across hooks, making prefetching or `useQueries` harder later
- Inconsistent invalidation: other domains invalidate via factory keys, blog invalidation must use raw arrays
- PR review friction and linting concerns

**Prevention:**
1. Create `src/hooks/api/query-keys/blog-keys.ts` using `queryOptions()` factory pattern matching `property-keys.ts`
2. Move query functions out of `use-blogs.ts` into the factory -- each key (list, detail, category, comparisons, related, categories) gets a `queryOptions()` entry with `queryKey` and `queryFn`
3. Thin hooks in `use-blogs.ts` become `useQuery(blogQueries.list(page))` one-liners
4. Register blog keys in CLAUDE.md's "Factory files" section

**Detection:** Grep for `blogKeys` -- if found outside a `query-keys/` file, convention is violated. Grep for `queryKey:` inside `use-blogs.ts` -- should be zero occurrences (all delegated to factory).

**Phase to address:** Task 1 (data layer rewrite). Must be done before any page component is written since pages import from hooks.

---

### Pitfall 2: Pagination Flash -- Missing placeholderData: keepPreviousData

**What goes wrong:** When the user clicks "Next page" on the blog, the UI flashes empty while page 2 loads. The grid of blog cards disappears, skeleton loaders appear, then cards reappear. This creates a jarring experience especially on slow connections.

**Why it happens:** TanStack Query clears old data when the query key changes (page 1 key differs from page 2 key). The plan's `useBlogs(page)` hook does not include `placeholderData: keepPreviousData`, even though the project already uses this pattern in 6 other hooks (`use-tenant.ts`, `use-notifications.ts`, and the global query provider). The deviation is a copy-paste from the old non-paginated hook which did not need this feature.

**Consequences:**
- Content flash on every page change -- skeleton shimmer instead of smooth data swap
- `isPlaceholderData` is unavailable, so buttons cannot show a subtle loading indicator while keeping old content visible
- Inconsistent with how paginated data tables (using `use-data-table.ts` + nuqs) already behave in the dashboard

**Prevention:**
Add to every paginated blog query:
```typescript
import { keepPreviousData } from '@tanstack/react-query'

// In queryOptions for list, category, comparisons:
placeholderData: keepPreviousData,
```

Then in the page component, use `isPlaceholderData` to show a subtle opacity reduction or spinner overlay rather than full skeleton replacement:
```typescript
const { data, isPlaceholderData } = useQuery(blogQueries.list(page))
// ...
<div className={isPlaceholderData ? 'opacity-60 pointer-events-none' : ''}>
  {/* grid */}
</div>
```

**Detection:** Search `use-blogs.ts` or `blog-keys.ts` for `keepPreviousData` or `placeholderData` -- must be present on paginated queries.

**Phase to address:** Task 1 (data layer). Must be wired before the page component uses the hooks.

---

### Pitfall 3: Category Slug-to-Name Roundtrip Breaks on Multi-Word Names

**What goes wrong:** The category page uses `deslugify("software-comparisons")` which produces "Software Comparisons" -- correct. But `deslugify("roi-maximization")` produces "Roi Maximization" (lowercase "oi" gets a capital "R" but the slug is already case-normalized). The hub page uses `slugify("Software Comparisons")` producing "software-comparisons" -- correct. However, if a blog category in the DB is "ROI Maximization" (uppercase "ROI"), the roundtrip fails: `slugify("ROI Maximization")` produces `"roi-maximization"`, but `deslugify("roi-maximization")` produces `"Roi Maximization"` which does NOT match the DB value `"ROI Maximization"`. The `useBlogsByCategory("Roi Maximization")` query returns zero results.

**Why it happens:** The `deslugify` function naively capitalizes the first letter of each word. Acronyms (ROI, SaaS, HVAC) and proper nouns lose their original casing. The DB is the source of truth for category names, but the URL slug is a lossy encoding that cannot be reversed for acronyms.

**Consequences:**
- Category pages for acronym-containing categories show "No articles yet" even when posts exist
- The hub's category pills link to URLs that produce zero results when clicked
- Users bookmark or share category URLs that silently break

**Prevention:**
Two options, both work:
1. **Server lookup (recommended):** On the category page, fetch categories via the RPC and match by slug instead of deslugifying. Add a `slugify` helper that normalizes consistently. When the page loads, call `useCategories()` and find the category whose `slugify(cat.category) === categorySlug`. Use the DB category name for the query, not the deslugified slug.
2. **Slug column in DB:** Add a `category_slug` computed column or store slugs in the blogs table. Overkill for this milestone.

The first option requires the `useCategories()` hook to be called on the category page (it already is in the plan for the hub, so the hook exists).

**Detection:** Create a blog post with category "ROI Maximization" or "SaaS Comparison". Navigate to `/blog/category/roi-maximization`. If zero results, the roundtrip is broken.

**Phase to address:** Task 9 (category page rewrite). Must resolve before marking the category page complete.

---

### Pitfall 4: get_blog_categories RPC Missing from Supabase Types Until Regenerated

**What goes wrong:** Task 1 writes hooks that call `supabase.rpc('get_blog_categories')`. Task 2 creates the migration. Between Task 1 and Task 2, `pnpm typecheck` fails because the RPC does not exist in `src/shared/types/supabase.ts`. The plan acknowledges this ("May fail on get_blog_categories RPC -- that's OK"), but if a developer runs `pnpm validate:quick` as a habit between commits, the failure blocks work.

More critically: after applying the migration, `pnpm db:types` must be run to regenerate types. If forgotten, the RPC call compiles but TypeScript still flags it. If the migration is applied to production but types are not regenerated and committed, the CI build fails on type checking.

**Why it happens:** Supabase type generation is a manual step (`pnpm db:types`) that must happen after every migration that adds or changes RPCs, tables, or columns. It is easy to apply the migration, confirm it works in SQL, and forget to regenerate types.

**Consequences:**
- TypeScript errors on the `rpc('get_blog_categories')` call until types are regenerated
- CI build fails if `supabase.ts` is stale
- If types are regenerated against a different DB state (e.g., local vs production), the generated file may differ

**Prevention:**
1. Apply migration to the target DB first
2. Immediately run `pnpm db:types`
3. Verify `supabase.ts` now includes `get_blog_categories` in the Functions section
4. Commit both the migration AND the updated `supabase.ts` in the same commit (Task 2 plan already does this -- enforce it)
5. Run `pnpm typecheck` after regeneration to confirm clean

**Detection:** `pnpm typecheck` fails with "Argument of type '"get_blog_categories"' is not assignable to parameter of type..." -- means types were not regenerated.

**Phase to address:** Task 2 (RPC creation). Hard gate: do not proceed to component tasks until typecheck passes clean.

---

### Pitfall 5: newsletter-subscribe Edge Function Secrets Not Deployed

**What goes wrong:** The Edge Function code is correct and deployed via `supabase functions deploy newsletter-subscribe`. But `RESEND_API_KEY` and `RESEND_AUDIENCE_ID` are not set in Supabase Edge Function secrets. The function boots, passes `validateEnv` only when called (not on deploy), and returns 500 with `{ error: "An error occurred" }` on first real request. The generic error message gives no hint about what is wrong.

**Why it happens:** Supabase Edge Function secrets are managed separately from the code deploy. The `RESEND_API_KEY` may already exist (used by `auth-email-send`), but `RESEND_AUDIENCE_ID` is brand new. It must be created in the Resend Dashboard first (Audiences section), then the audience ID copied to Supabase secrets. This two-service choreography is easy to miss.

Additionally, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be set for rate limiting. These likely already exist for other Edge Functions, but verify.

**Consequences:**
- Newsletter form submits, shows spinner, then shows "Something went wrong" toast
- No error details visible to the user or developer without checking Edge Function logs
- If `RESEND_API_KEY` exists but `RESEND_AUDIENCE_ID` is missing, the env validation fails on the audience ID specifically

**Prevention:**
Before deploying the function:
1. Create an Audience in Resend Dashboard (Audiences tab) -- note the audience ID
2. Set secrets: `supabase secrets set RESEND_AUDIENCE_ID=aud_xxxxx`
3. Verify existing secrets: `supabase secrets list` should show `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `FRONTEND_URL`, `SENTRY_DSN`
4. After deploy, test with `curl` against the function URL to verify 200 response

**Detection:** Submit the newsletter form. If toast shows error, check Edge Function logs in Supabase Dashboard for "Missing required environment variables: RESEND_AUDIENCE_ID".

**Phase to address:** Task 5 (Edge Function creation). Gate: test the deployed function with curl before proceeding to the frontend component.

---

## Moderate Pitfalls

Mistakes that cause bugs, degraded UX, or unnecessary rework but are recoverable.

### Pitfall 6: Resend Audiences API Duplicate Contact Behavior Unknown

**What goes wrong:** A user subscribes, then subscribes again with the same email. The plan does not handle the Resend API response for duplicate contacts. If Resend returns a 4xx error for duplicates, the frontend shows "Something went wrong" even though the user is already subscribed. If Resend silently accepts duplicates, no issue -- but neither behavior is documented clearly.

**Why it happens:** The Resend Audiences API docs do not explicitly document what happens when creating a contact with an email that already exists. The plan's Edge Function forwards the raw Resend response status to the error handler without distinguishing "already exists" from "server error."

**Prevention:**
1. Test the endpoint manually: `curl -X POST https://api.resend.com/audiences/{id}/contacts -H "Authorization: Bearer re_xxx" -H "Content-Type: application/json" -d '{"email":"test@test.com"}'` -- send twice, observe second response
2. If Resend returns 409 Conflict or similar for duplicates, handle it as success in the Edge Function:
```typescript
if (!res.ok && res.status !== 409) {
  // Only error on non-duplicate failures
}
```
3. Regardless of API behavior, always return success to the frontend for duplicate submissions -- the user's intent ("subscribe me") is already fulfilled

**Detection:** Subscribe with the same email twice. If second attempt shows error toast, duplicate handling is missing.

**Phase to address:** Task 5 (Edge Function). Test immediately after first deploy.

---

### Pitfall 7: nuqs Page State Starts at 1 But URL Has No ?page= on First Load

**What goes wrong:** On initial load, the URL is `/blog` (no `?page=` param). `parseAsInteger.withDefault(1)` correctly returns 1. User clicks page 2, URL becomes `/blog?page=2`. User clicks "Previous" back to page 1 -- URL becomes `/blog?page=1` instead of removing the param. Now the "clean" URL `/blog` and `/blog?page=1` are different URLs pointing to the same content. This creates duplicate content for SEO and inconsistent browser history entries.

**Why it happens:** `setPage(1)` sets `?page=1` in the URL. nuqs does not automatically remove params when they equal the default value unless configured to do so.

**Consequences:**
- SEO: `/blog` and `/blog?page=1` are duplicate content (minor but avoidable)
- Browser back button creates confusing history: `/blog` -> `/blog?page=2` -> `/blog?page=1` (three entries for two logical pages)
- Shared links look inconsistent

**Prevention:**
Use `clearOnDefault: true` in the nuqs parser:
```typescript
const [page, setPage] = useQueryState(
  'page',
  parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
)
```
This removes `?page=` from the URL when the value equals the default (1).

Alternatively, use `shallow: false` if you want the page change to trigger a full navigation (though for client-side TanStack Query, shallow is correct).

**Detection:** Navigate to page 2, then back to page 1. Check the URL bar -- should be `/blog` not `/blog?page=1`.

**Phase to address:** Task 4 (BlogPagination component). Simple config fix.

---

### Pitfall 8: CI Workflow Dedup Creates Unprotected Main Branch

**What goes wrong:** The plan restructures CI to run checks on `pull_request` only and e2e-smoke on `push` to main independently. If checks are removed from the `push` trigger, pushing directly to main (bypassing PR) skips lint, typecheck, and build verification entirely. The current workflow runs checks on both push and PR -- removing the push trigger removes the safety net for direct pushes.

**Why it happens:** The goal is to avoid double runs: when a PR is merged, GitHub fires both a `push` event (merge commit on main) and completes the PR. The current workflow runs checks twice. The fix seems simple: only run on PR. But this assumes branch protection rules prevent direct pushes to main. If branch protection is misconfigured or an admin force-pushes, the checks never run.

**Consequences:**
- Direct pushes to main deploy without typecheck/lint/build verification
- If branch protection is bypassed (admin, emergency fix), broken code reaches production
- e2e-smoke running independently on push without the checks job as dependency means e2e can run against potentially broken code

**Prevention:**
Keep checks on both triggers but use the concurrency group to cancel the redundant run:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
This is already in the workflow. The first run (from push) gets cancelled by the second (from PR merge) or vice versa. The cost is a brief cancelled workflow run, not a double execution.

Alternatively, if dedup is truly needed, add a branch protection rule requiring the `checks` job to pass before merge, AND keep checks on push as a fallback. The dedup then only affects the merge commit run (which is redundant if PR checks passed).

For e2e-smoke independence: remove `needs: [checks]` but add a separate condition to only run after a successful build artifact exists.

**Detection:** Check `.github/workflows/ci-cd.yml` -- if `checks` job has no `push` trigger, direct pushes are unverified. Verify branch protection rules in GitHub Settings -> Branches -> main -> Require status checks.

**Phase to address:** CI workflow restructuring task. Review branch protection settings before modifying triggers.

---

### Pitfall 9: BlogCard Server Component Renders as Client Component

**What goes wrong:** `BlogCard` is designed as a server component (no `'use client'` directive). But it is used inside `blog/page.tsx` which IS a client component. In Next.js, server components imported into client components become client components automatically. The BlogCard renders correctly, but it ships its full JavaScript to the browser unnecessarily.

**Why it happens:** The plan correctly omits `'use client'` from BlogCard, but all three pages that use it are client components. Since the parent is a client boundary, all children are client-rendered regardless of their own directives.

**Consequences:**
- No actual server-side rendering benefit for BlogCard
- Minor: slightly larger client bundle (BlogCard JS is included)
- The component works correctly -- this is a performance oversight, not a bug

**Prevention:**
This is acceptable for this milestone. BlogCard is small (no heavy imports, no hooks) so the client bundle impact is negligible. The real fix would be converting blog pages to server components with client islands for interactive parts (pagination, newsletter form), but that is a larger architectural change beyond this milestone's scope.

Document in the task that BlogCard is intentionally a "shared component" (no `'use client'`), not a "server component." The distinction matters for future refactoring.

**Detection:** Not detectable in functionality. Only matters for bundle analysis. Low priority.

**Phase to address:** Future optimization milestone. Not blocking for this milestone.

---

### Pitfall 10: BlurFade on Blog Card Grid Causes Layout Shift

**What goes wrong:** Each `BlogCard` in the grid is wrapped in `<BlurFade delay={0.05 + i * 0.03} inView>`. BlurFade starts with `opacity-0` and `translate-y-[6px]`. Before the IntersectionObserver fires, cards are invisible and shifted. When they animate in, the grid content shifts by 6px. For a 12-card grid, all cards appear at slightly different times creating a "waterfall" that takes 0.05 + 11 * 0.03 = 0.38 seconds to complete.

For long pages, cards below the fold animate when scrolled into view (good). But cards above the fold animate on initial page load with staggered delays, meaning the top of the page content is invisible for up to 380ms.

**Why it happens:** BlurFade with `inView` uses IntersectionObserver which fires after the component mounts and the element enters the viewport. On initial page load, above-the-fold elements have a brief invisible period. The staggered `delay` multiplied by many items extends this.

**Consequences:**
- First Contentful Paint shows empty grid area for ~200-400ms
- Cumulative Layout Shift (CLS) score impacted by the 6px translate
- On fast connections, the stagger is perceivable but brief; on slow connections or re-renders, it is jarring

**Prevention:**
1. Cap the maximum delay: `delay={0.05 + Math.min(i, 5) * 0.03}` -- stagger only the first 6 cards, rest appear simultaneously
2. Use `yOffset={4}` instead of the default 6 to minimize layout shift
3. Consider removing BlurFade from above-the-fold content (hero section, first row of cards) and only using it for below-the-fold sections
4. The existing landing page uses BlurFade similarly -- follow its delay pattern for consistency

**Detection:** Load `/blog` and watch the grid area. If cards appear one-by-one in a visible cascade, delay is too aggressive. Use Chrome DevTools Performance tab to measure CLS.

**Phase to address:** Task 7 (hub page). Tuning exercise during visual review.

---

## Minor Pitfalls

### Pitfall 11: SECURITY INVOKER on get_blog_categories Exposes All Categories

**What goes wrong:** The RPC uses `SECURITY INVOKER`, which means it runs with the calling user's permissions. Blog data is public (no RLS policy restricts reading published blogs), so this works correctly. However, if RLS policies are later added to restrict certain categories (e.g., admin-only draft categories), the INVOKER function would return different results for different users -- potentially confusing.

**Prevention:** This is actually correct for the current use case. `SECURITY INVOKER` is the right choice because:
- Blog categories are public data (published posts only, filtered by `WHERE status = 'published'`)
- No auth.uid() dependency needed
- SECURITY DEFINER would be overkill and a security risk (bypasses future RLS)

No action needed. Document the rationale in the migration comment.

**Phase to address:** Task 2 (RPC creation). Already correctly handled in the plan.

---

### Pitfall 12: BlogCard Missing alt="" for Decorative Images

**What goes wrong:** If `post.featured_image` is present but the image is purely decorative (the card title already describes the content), the `alt={post.title}` creates redundant screen reader announcements. The screen reader says both the image alt text and the heading text, which are identical.

**Prevention:** Minor accessibility concern. The current approach (alt = title) is acceptable per WCAG. If images are truly decorative, use `alt=""` with `role="presentation"`. For blog cards, `alt={post.title}` is standard practice. No change needed.

**Phase to address:** Not blocking. Standard pattern.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Task 1: Data layer rewrite | Query keys not using `queryOptions()` factories | Create `blog-keys.ts` in `query-keys/` directory, match `property-keys.ts` pattern |
| Task 1: Data layer rewrite | Missing `placeholderData: keepPreviousData` on paginated queries | Add to list, category, comparisons queries -- project already imports `keepPreviousData` |
| Task 2: RPC creation | Types not regenerated after migration | Run `pnpm db:types` immediately after migration, commit `supabase.ts` with migration |
| Task 4: BlogPagination | `?page=1` persists in URL when navigating back to first page | Use `clearOnDefault: true` in nuqs parser options |
| Task 5: Edge Function | `RESEND_AUDIENCE_ID` secret not set | Create audience in Resend first, set secret before deploy, test with curl |
| Task 5: Edge Function | Duplicate email submission returns error | Handle 409/duplicate as success; test with same email twice |
| Task 7: Hub page | Category slug roundtrip breaks acronyms (ROI, SaaS) | Look up category name from RPC data by matching slug, not by deslugifying |
| Task 9: Category page | Same slug-to-name issue | Use categories RPC to resolve actual DB name from slug |
| CI restructuring | Removing push trigger leaves direct pushes unverified | Keep both triggers with concurrency cancellation, or verify branch protection |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| nuqs + TanStack Query | Using `useQueryState` without `clearOnDefault` | Add `clearOnDefault: true` to avoid `?page=1` in URL |
| nuqs + TanStack Query | Not including page in query key | Ensure query key includes page param: `['blogs', 'list', page, limit]` |
| TanStack Query pagination | No `placeholderData` causing content flash | Use `keepPreviousData` from `@tanstack/react-query` |
| Supabase `.range()` + `{ count: 'exact' }` | Using `data.length` for total instead of `count` | Always use `count` from response -- CLAUDE.md rule |
| Resend Audiences API | Assuming `RESEND_API_KEY` is sufficient | Also need `RESEND_AUDIENCE_ID` -- separate secret |
| Edge Function CORS | Newsletter is unauthenticated but CORS requires `FRONTEND_URL` | Verify `FRONTEND_URL` is set in Edge Function secrets (shared with other functions) |
| Blog slug/category URLs | Case-insensitive slug conversion loses acronyms | Resolve names from DB via RPC, never reconstruct from URL slug |
| BlurFade + grid | Staggered delay on many items causes long animation cascade | Cap `i` in delay calculation; remove from above-fold content |
| GitHub Actions push + PR | Removing push trigger to "dedup" | Keep both with `concurrency.cancel-in-progress: true` |

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `blogKeys` as raw object (not `queryOptions()`) | Faster implementation, no new file | Inconsistent with 12 other domain factories, harder to prefetch/share | Never -- convention exists, follow it |
| Skip `keepPreviousData` on pagination | Simpler hook code | Flash of empty content on page change | Never -- project already uses this pattern |
| Hardcode `deslugify` for category names | No RPC dependency on category page | Breaks on acronyms, multi-word names with special casing | Only if all categories are simple two-word lowercase |
| Skip Resend duplicate handling | Less Edge Function code | User sees error on re-subscribe | Never for public-facing forms |
| Remove CI push trigger entirely | No duplicate workflow runs | Direct pushes to main are unverified | Only with confirmed branch protection rules |

---

## "Looks Done But Isn't" Checklist

- [ ] **Query key pattern:** `blog-keys.ts` exists in `src/hooks/api/query-keys/` and uses `queryOptions()` -- not raw key arrays in `use-blogs.ts`
- [ ] **Pagination smoothness:** `keepPreviousData` is wired; page transitions show old data with opacity reduction, not skeleton flash
- [ ] **Category roundtrip:** Navigate to `/blog/category/roi-maximization` (or any acronym category) -- posts actually appear, not "No articles yet"
- [ ] **Type regeneration:** `pnpm typecheck` passes clean after RPC migration -- `supabase.ts` includes `get_blog_categories`
- [ ] **Edge Function secrets:** `RESEND_AUDIENCE_ID` is set in Supabase; `curl -X POST` to the function URL returns 200 (or 400 for bad email, not 500)
- [ ] **Duplicate subscribe:** Submit same email twice; second attempt shows success or "already subscribed", never an error toast
- [ ] **URL cleanliness:** Navigate to page 2 then back to page 1; URL is `/blog` not `/blog?page=1`
- [ ] **CI safety:** After workflow changes, verify `checks` job runs on both `push` and `pull_request` (or branch protection requires it)
- [ ] **BlurFade timing:** Blog hub loads without visible 400ms+ animation cascade on above-fold content

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong query key pattern (no factory) | LOW | Create `blog-keys.ts`, move queryFn into it, update imports in `use-blogs.ts` -- 30 min refactor |
| Missing `keepPreviousData` | LOW | Add one line to each paginated query option -- 5 min fix |
| Category slug roundtrip broken | MEDIUM | Change category page to look up name from RPC results instead of deslugifying -- requires calling `useCategories()` on category page |
| Types not regenerated | LOW | Run `pnpm db:types`, commit, push -- 2 min fix but blocks CI until done |
| Edge Function secrets missing | LOW | Set secrets via CLI, no code change needed -- 2 min fix |
| CI push trigger removed | LOW | Re-add push trigger to workflow -- 1 min fix, but any direct pushes during the gap were unverified |
| BlurFade animation too aggressive | LOW | Adjust delay constants, rebuild -- 5 min tuning |

---

## Sources

- [TanStack Query v5 Paginated Queries -- placeholderData with keepPreviousData](https://tanstack.com/query/v5/docs/react/guides/paginated-queries)
- [TanStack Query v5 Migration -- keepPreviousData removal](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [nuqs GitHub Issues -- Next.js 16 Adapter Detection](https://github.com/47ng/nuqs/issues/1263)
- [Resend Create Contact API Reference](https://resend.com/docs/api-reference/contacts/create-contact)
- [GitHub Actions Avoid Double Runs](https://adamj.eu/tech/2025/05/14/github-actions-avoid-simple-on/)
- [GitHub Community -- Duplicate PR/Push Checks](https://github.com/orgs/community/discussions/26940)
- [Supabase Database Functions -- SECURITY INVOKER vs DEFINER](https://supabase.com/docs/guides/database/functions)
- Existing codebase: `src/hooks/api/query-keys/property-keys.ts` (canonical `queryOptions()` factory pattern), `src/providers/query-provider.tsx` (global `keepPreviousData`), `supabase/functions/_shared/rate-limit.ts`, `supabase/functions/_shared/env.ts`, `proxy.ts` (public route matching), `.github/workflows/ci-cd.yml`

---
*Pitfalls research for: TenantFlow blog redesign + newsletter + CI optimization milestone*
*Researched: 2026-03-06*
