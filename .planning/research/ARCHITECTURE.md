# Architecture Patterns

**Domain:** Blog redesign, newsletter subscription, CI optimization for existing property management SaaS
**Researched:** 2026-03-06
**Confidence:** HIGH -- all integration points verified against live codebase

## Recommended Architecture

The blog redesign adds three layers to the existing architecture: (1) new shared UI components in `src/components/blog/`, (2) an enhanced data layer in `use-blogs.ts` with pagination and a new RPC, and (3) a new Edge Function for newsletter subscription. CI changes are structural workflow modifications only.

```
                        EXISTING                              NEW/MODIFIED
                        --------                              ------------

  Blog Pages            src/app/blog/page.tsx          -->    REWRITE (split zones, pagination, categories)
  (3 pages)             src/app/blog/[slug]/page.tsx   -->    REWRITE (featured image, related posts)
                        src/app/blog/category/          -->    REWRITE (dynamic names, pagination)

  Shared Components     (none exist)                   -->    src/components/blog/blog-card.tsx        NEW
                                                              src/components/blog/blog-pagination.tsx  NEW
                                                              src/components/blog/newsletter-signup.tsx NEW

  Data Layer            src/hooks/api/use-blogs.ts     -->    REWRITE (paginated, categories, related)
                        (no RPC)                       -->    get_blog_categories() SQL function         NEW

  Edge Functions        15 existing functions           -->    newsletter-subscribe/index.ts             NEW
                        _shared/{cors,env,errors,            (consumes existing _shared/ utilities)
                         rate-limit}.ts

  CI                    .github/workflows/ci-cd.yml    -->    MODIFY (dedup checks, independent e2e)

  Proxy/Middleware      proxy.ts (blog in PUBLIC_ROUTES) -->  NO CHANGE (already public)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `BlogCard` | Renders a single blog post card (image, title, excerpt, metadata) | Receives `BlogListItem` from parent page |
| `BlogPagination` | URL-driven page controls via `nuqs` | Reads/writes `?page=N` URL param; parent reads same param to drive query |
| `NewsletterSignup` | Email capture form + Edge Function call | Calls `newsletter-subscribe` Edge Function directly via `fetch()` |
| `use-blogs.ts` (hooks) | TanStack Query hooks for all blog data fetching | Supabase PostgREST for list/detail, Supabase RPC for categories |
| `get_blog_categories` RPC | Aggregates distinct published categories with counts | Called by `useCategories()` hook |
| `newsletter-subscribe` Edge Function | Validates email, rate-limits, adds contact to Resend | Resend Contacts API (`POST /contacts`) |
| `PageLayout` | Marketing page shell (navbar, footer, grid pattern) | Wraps all blog pages (ALREADY EXISTS, no changes) |
| `MarkdownContent` | Dynamic-imported `react-markdown` renderer | Used by detail page only (ALREADY EXISTS, no changes) |

### Data Flow

**Blog Hub Page (`/blog`)**
```
URL ?page=N  --(nuqs)--> useQueryState('page')
                              |
                              +--> useFeaturedComparisons(6) --> Supabase PostgREST
                              |                                   .from('blogs')
                              |                                   .eq('category', 'Software Comparisons')
                              |                                   .limit(6)
                              |
                              +--> useBlogs(page)            --> Supabase PostgREST
                              |                                   .from('blogs')
                              |                                   .neq('category', 'Software Comparisons')
                              |                                   .range(from, to)
                              |                                   { count: 'exact' }
                              |
                              +--> useCategories()           --> Supabase RPC
                                                                  get_blog_categories()
```

**Blog Detail Page (`/blog/[slug]`)**
```
useParams().slug --> useBlogBySlug(slug)    --> Supabase PostgREST .single()
                     |
                     +--> useRelatedPosts(post.category, slug) --> Supabase PostgREST
                                                                    .eq('category', category)
                                                                    .neq('slug', excludeSlug)
                                                                    .limit(3)
```

**Category Page (`/blog/category/[category]`)**
```
useParams().category --> deslugify() --> useBlogsByCategory(name, page)
                                              |
URL ?page=N --(nuqs)---------------------+   +--> Supabase PostgREST
                                                     .eq('category', name)
                                                     .range(from, to)
                                                     { count: 'exact' }
```

**Newsletter Subscription**
```
NewsletterSignup form --> useMutation --> fetch() --> newsletter-subscribe Edge Function
                                                        |
                                                        +--> rateLimit(5 req/min)
                                                        +--> validateEnv(RESEND_API_KEY)
                                                        +--> POST https://api.resend.com/contacts
                                                              { email }
```

## Integration Points (Existing vs New)

### 1. Proxy/Middleware -- NO CHANGE NEEDED
`/blog` is already in `PUBLIC_ROUTES` (proxy.ts line 13). The `isPublicRoute()` function uses `startsWith(route + '/')` matching, so `/blog/[slug]` and `/blog/category/[category]` are already covered. Blog pages do not require authentication.

**Confidence:** HIGH -- verified against proxy.ts source.

### 2. PageLayout -- NO CHANGE NEEDED
All three blog pages already wrap content in `<PageLayout>` from `#components/layout/page-layout`. The redesign continues this pattern. No modifications to PageLayout are required.

**Confidence:** HIGH -- verified against current page source.

### 3. NuqsAdapter -- ALREADY IN PROVIDER TREE
The `NuqsAdapter` from `nuqs/adapters/next/app` is already mounted in `src/components/providers.tsx` (wraps `AuthStoreProvider`). `BlogPagination` can use `useQueryState` immediately with no provider changes.

**Confidence:** HIGH -- verified in providers.tsx line 33.

### 4. Blog Hooks (`use-blogs.ts`) -- FULL REWRITE
Current hooks: `useBlogs()`, `useBlogBySlug()`, `useBlogsByCategory()`, `useFeaturedBlogs()`.
All use flat `.limit(20)` queries with no pagination and no `{ count: 'exact' }`.

New hooks add:
- `page` parameter to `useBlogs()` and `useBlogsByCategory()` with `.range(from, to)` and `{ count: 'exact' }`
- `useCategories()` calling `get_blog_categories` RPC
- `useRelatedPosts(category, excludeSlug, limit)` for detail page
- `useFeaturedComparisons(limit)` replacing `useFeaturedBlogs()`
- `PaginatedBlogs` return type (`{ posts, total }`) replacing flat arrays
- `blogKeys` expanded with pagination-aware cache keys

**Breaking change:** `useBlogs()` return type changes from `BlogListItem[]` to `PaginatedBlogs`. Any consumer of `useBlogs()` must be updated. The only consumer is `src/app/blog/page.tsx` which is being fully rewritten, so this is safe.

**Confidence:** HIGH -- verified all consumers via grep.

### 5. Query Key Structure Change
Current `blogKeys.all` is `['blogs']`. Current `blogKeys.category` is `['blogs', 'category', category]`.

New keys add page/limit parameters: `['blogs', 'list', page, limit]`, `['blogs', 'category', category, page]`, `['blogs', 'categories']`, `['blogs', 'comparisons', limit]`, `['blogs', 'related', category, excludeSlug]`.

The `blogKeys` object stays in `use-blogs.ts` (not in `src/hooks/api/query-keys/`). This is an existing pattern deviation -- blog keys are co-located with hooks. The plan maintains this pattern rather than extracting to `query-keys/`.

This is acceptable because blogs are public marketing content, not tenant data. They do not need cross-domain invalidation (no mutation from the frontend -- blogs are service_role only for write).

**Confidence:** HIGH -- no other code references `blogKeys` for invalidation.

### 6. Edge Function Shared Utilities -- CONSUMED, NOT MODIFIED
The `newsletter-subscribe` Edge Function imports from existing `_shared/` modules:
- `cors.ts` -- `getCorsHeaders()`, `handleCorsOptions()`
- `errors.ts` -- `errorResponse()`
- `env.ts` -- `validateEnv()`
- `rate-limit.ts` -- `rateLimit()`

No modifications to these shared modules are needed. The new Edge Function follows the exact same pattern as `tenant-invitation-validate` and `stripe-checkout-session` (unauthenticated, rate-limited).

**Confidence:** HIGH -- verified all imports match existing function signatures.

### 7. Deno Import Map -- NO CHANGE NEEDED
The `supabase/functions/deno.json` already includes `@sentry/deno`, `@upstash/ratelimit`, and `@upstash/redis`. The newsletter function does not introduce any new Deno dependencies -- it uses `fetch()` directly for the Resend API (same as `_shared/resend.ts` pattern).

**Confidence:** HIGH -- verified against deno.json.

### 8. Supabase Types -- REGENERATION REQUIRED
After creating the `get_blog_categories` RPC migration, `pnpm db:types` must run to update `src/shared/types/supabase.ts`. The `useCategories()` hook calls `supabase.rpc('get_blog_categories')` which needs type definitions.

**Confidence:** HIGH -- standard pattern for all RPCs in this codebase.

### 9. Blogs Table Schema -- NO MIGRATION NEEDED (for schema)
The `blogs` table already has: `category TEXT`, `idx_blogs_category`, `featured_image TEXT`, `tags TEXT[]`, `reading_time` (computed), `status CHECK`. All columns needed by the redesign exist.

One migration IS needed: `get_blog_categories()` RPC function (pure read-only aggregation, `SECURITY INVOKER`, no schema changes).

**Confidence:** HIGH -- verified against `20251209120000_create_blogs_table.sql`.

### 10. RLS Policies -- NO CHANGE NEEDED
`blogs_select_published` policy allows `anon, authenticated` users to SELECT where `status = 'published'`. All new queries filter by `status = 'published'`, and the `get_blog_categories` RPC uses `SECURITY INVOKER` so it respects existing RLS. No new policies required.

**Confidence:** HIGH -- verified against `20251219210000_add_blogs_rls_policies.sql`.

### 11. EmptyState Component -- DOES NOT EXIST AS SHARED
The plan references `EmptyState` from `#components/shared/empty-state` in the category page. This component DOES NOT EXIST as a shared reusable component. The codebase has domain-specific empty states (`DashboardEmptyState`, `BillingEmptyState`, `LeaseTemplateEmptyState`) but no shared generic one.

**Resolution:** Inline the empty state in the category page. The current category page already has inline empty state markup. Creating a shared component for one usage point is premature abstraction.

**Confidence:** HIGH -- verified via grep across entire `src/` directory.

### 12. LazySection and SectionSkeleton -- ALREADY EXIST
The plan uses `<LazySection>` and `<SectionSkeleton>` in the hub page for the Insights & Guides zone. Both components exist:
- `src/components/ui/lazy-section.tsx` (IntersectionObserver-based)
- `src/components/ui/section-skeleton.tsx` (variant: 'grid' produces 3-column skeleton)

These are currently used only in landing page sections. Using them in the blog hub is architecturally consistent.

**Confidence:** HIGH -- verified source and usage.

### 13. Resend Contacts API -- ENDPOINT HAS CHANGED
The plan uses `POST /audiences/{id}/contacts` with `RESEND_AUDIENCE_ID` env var. Resend has updated their API: contacts are now global entities. The canonical endpoint is `POST https://api.resend.com/contacts` with `{ email }` in the body. The `audience_id` is no longer in the URL path.

**Impact:** The Edge Function code needs to use the updated endpoint. The `RESEND_AUDIENCE_ID` env var may not be needed (verify at implementation time whether audience segmentation requires passing an audience reference in the request body).

**Confidence:** MEDIUM -- based on Resend docs fetched during research. The older endpoint may still work but the newer one is canonical.

### 14. Design System Tokens -- ALL EXIST
The plan uses design system utilities from `globals.css`. Verified as existing:
- `hero-highlight` (line 617)
- `text-responsive-display-xl`, `text-responsive-display-lg` (line 1020+)
- `section-spacing`, `section-spacing-compact` (line 1060+)
- `typography-h1` through `typography-h4` (line 1214+)

**Confidence:** HIGH -- verified against globals.css.

## Patterns to Follow

### Pattern 1: Paginated PostgREST Queries with `{ count: 'exact' }`
**What:** All list queries use `.range(from, to)` with `{ count: 'exact' }` for server-side pagination.
**When:** Any list that can grow beyond a single page.
**Why:** Existing convention throughout the codebase (properties, leases, tenants all use this pattern).

```typescript
const from = (page - 1) * POSTS_PER_PAGE
const to = from + POSTS_PER_PAGE - 1

const { data, error, count } = await supabase
  .from('blogs')
  .select(BLOG_LIST_COLUMNS, { count: 'exact' })
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .range(from, to)

return { posts: data ?? [], total: count ?? 0 }
```

### Pattern 2: URL-Driven Pagination via `nuqs`
**What:** Page state lives in the URL (`?page=2`) via `nuqs` `useQueryState`.
**When:** Blog list pages where pagination should be shareable/bookmarkable.
**Why:** Already established in the codebase -- `NuqsAdapter` is in the provider tree, data tables use the same pattern.

```typescript
const [page] = useQueryState('page', parseAsInteger.withDefault(1))
```

### Pattern 3: Edge Function with Rate Limiting (Unauthenticated)
**What:** Public Edge Functions use `rateLimit()` before processing.
**When:** Any endpoint callable without authentication (newsletter, invitation validation).
**Why:** Prevents abuse. Three existing functions follow this exact pattern.

```typescript
const rateLimited = await rateLimit(req, {
  maxRequests: 5,
  windowMs: 60_000,
  prefix: 'newsletter',
})
if (rateLimited) return rateLimited
```

### Pattern 4: `SECURITY INVOKER` for Read-Only RPCs
**What:** The `get_blog_categories` RPC uses `SECURITY INVOKER` (not `SECURITY DEFINER`).
**When:** RPCs that only read data and should respect existing RLS policies.
**Why:** No need for elevated privileges. The `blogs_select_published` RLS policy already allows anon/authenticated reads. Using INVOKER means the RPC automatically filters to published blogs through RLS.

```sql
CREATE OR REPLACE FUNCTION get_blog_categories()
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT b.category, count(*)::bigint
  FROM blogs b
  WHERE b.status = 'published' AND b.category IS NOT NULL
  GROUP BY b.category
  ORDER BY count(*) DESC;
$$;
```

### Pattern 5: Component Folder per Domain
**What:** Blog components go in `src/components/blog/` (new directory).
**When:** Creating related shared components for a specific domain.
**Why:** Follows existing patterns: `src/components/properties/`, `src/components/leases/`, `src/components/dashboard/`.

### Pattern 6: Dynamic Import for Heavy Libraries
**What:** `MarkdownContent` (react-markdown) is already loaded via `next/dynamic` with `ssr: false`.
**When:** Libraries that are large and not needed on initial render.
**Why:** Existing convention (recharts, react-markdown documented in CLAUDE.md).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Hardcoded Category Configuration
**What:** The current category page has a `categoryConfig` object mapping slug to `{ name, icon, description, color }`.
**Why bad:** Requires code changes whenever categories change in the database. Fragile coupling between DB data and frontend config.
**Instead:** Derive category name from URL slug via `deslugify()`. Fetch category list from `get_blog_categories` RPC for the hub page category pills.

### Anti-Pattern 2: Non-Functional Newsletter Forms
**What:** Current blog pages have newsletter email inputs with no backend wiring.
**Why bad:** Users submit forms that silently do nothing. Damages trust.
**Instead:** Wire to `newsletter-subscribe` Edge Function with proper success/error states and toast feedback.

### Anti-Pattern 3: Flat List Queries Without Pagination
**What:** Current `useBlogs()` fetches `.limit(20)` with no pagination controls.
**Why bad:** Cannot scale beyond 20 posts. No way for users to navigate to older content.
**Instead:** Use `.range()` with `{ count: 'exact' }` and `BlogPagination` component.

### Anti-Pattern 4: Gradient CTA Styling
**What:** Current detail page CTA uses `bg-linear-to-br from-primary/10 via-primary/5` gradient.
**Why bad:** Inconsistent with the rest of the marketing site design system (card-based, backdrop-blur).
**Instead:** Use `bg-card/20 backdrop-blur-sm border border-border/30` (matches design tokens).

### Anti-Pattern 5: Using Audience-Scoped Resend Endpoint
**What:** The plan uses `POST /audiences/{id}/contacts` for Resend.
**Why bad:** Resend has updated their API. Contacts are now global entities. The endpoint is now `POST /contacts`.
**Instead:** Use `POST https://api.resend.com/contacts` with `{ email }` in the body.

## CI Workflow Architecture

### Current Structure (Problem)
```yaml
on:
  push: [main]        # triggers checks + e2e-smoke
  pull_request: [main] # triggers checks only

jobs:
  checks:             # runs on BOTH push and PR (duplicate on merge)
    - lint, typecheck, build

  e2e-smoke:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [checks]   # BLOCKED by checks completing first
```

**Problems:**
1. When a PR merges to main, `checks` runs twice: once for the PR close event and once for the push event.
2. `e2e-smoke` is blocked by `checks` even though they are independent (e2e uses real Supabase, not build output).

### Recommended Structure
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  checks:
    if: github.event_name == 'pull_request'   # ONLY on PRs
    # lint, typecheck, build

  e2e-smoke:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    # NO needs: [checks] -- runs independently
    # install, playwright, run smoke tests
```

**Changes:**
1. Gate `checks` to `pull_request` only -- PR must pass before merge.
2. Remove `needs: [checks]` from `e2e-smoke` -- runs independently on push to main.
3. Both jobs keep the same `paths-ignore` and `concurrency` settings.

**Implication:** After merge, only e2e-smoke runs (no redundant lint/build). On PRs, only checks run (no premature e2e). Total CI minutes reduced.

## Build Order (Dependency-Aware)

The following order respects dependencies between components:

```
Phase 1: Data Layer (no UI dependencies)
  1a. get_blog_categories RPC migration     -- SQL only, no frontend deps
  1b. Regenerate supabase types             -- pnpm db:types
  1c. Rewrite use-blogs.ts hooks            -- depends on 1b for RPC types

Phase 2: Shared Components (depend on hooks, no page deps)
  2a. blog-card.tsx                         -- depends on BlogListItem type from 1c
  2b. blog-pagination.tsx                   -- depends on POSTS_PER_PAGE from 1c
  2c. newsletter-subscribe Edge Function    -- independent of frontend
  2d. newsletter-signup.tsx                 -- depends on Edge Function URL existing

Phase 3: Page Rewrites (depend on all Phase 1 + 2 components)
  3a. /blog hub page                        -- uses BlogCard, BlogPagination, NewsletterSignup, all hooks
  3b. /blog/[slug] detail page              -- uses BlogCard, useBlogBySlug, useRelatedPosts
  3c. /blog/category/[category] page        -- uses BlogCard, BlogPagination, useBlogsByCategory

Phase 4: CI Optimization (independent of all above)
  4a. Modify ci-cd.yml workflow             -- add event_name conditions, remove needs dependency
```

**Why this order:**
- Phase 1 must come first because hooks are consumed by both components (Phase 2) and pages (Phase 3).
- Phase 2 components are leaf nodes -- they have no dependencies on each other and can be built in parallel.
- Phase 3 pages cannot be built until all their component imports exist.
- Phase 4 is completely independent and can be done at any point, but logically groups as a final cleanup step.

## New vs Modified Files Summary

| Action | File | Why |
|--------|------|-----|
| CREATE | `supabase/migrations/20260306120000_blog_categories_rpc.sql` | New RPC function |
| MODIFY | `src/shared/types/supabase.ts` | Regenerated (includes RPC types) |
| MODIFY | `src/hooks/api/use-blogs.ts` | Full rewrite with pagination + new hooks |
| CREATE | `src/components/blog/blog-card.tsx` | New shared component |
| CREATE | `src/components/blog/blog-pagination.tsx` | New shared component |
| CREATE | `supabase/functions/newsletter-subscribe/index.ts` | New Edge Function |
| CREATE | `src/components/blog/newsletter-signup.tsx` | New shared component |
| MODIFY | `src/app/blog/page.tsx` | Full rewrite (split zones) |
| MODIFY | `src/app/blog/[slug]/page.tsx` | Full rewrite (featured image, related) |
| MODIFY | `src/app/blog/category/[category]/page.tsx` | Full rewrite (dynamic, paginated) |
| MODIFY | `.github/workflows/ci-cd.yml` | CI dedup optimization |
| NO CHANGE | `src/app/blog/error.tsx` | Already uses ErrorPage correctly |
| NO CHANGE | `src/app/blog/[slug]/markdown-content.tsx` | Already dynamic-imported correctly |
| NO CHANGE | `proxy.ts` | `/blog` already in PUBLIC_ROUTES |
| NO CHANGE | `supabase/functions/_shared/*.ts` | Consumed, not modified |
| NO CHANGE | `supabase/functions/deno.json` | No new Deno deps needed |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Resend API endpoint changed (audience_id path deprecated) | HIGH | Edge Function 404s | Use `POST /contacts` endpoint; verify at deploy time |
| `EmptyState` import fails (component does not exist) | HIGH | Build error | Inline empty state markup in category page |
| Category slug/name mismatch (URL slug does not match DB category) | MEDIUM | Empty results | `deslugify()` must match DB values exactly; consider normalizing |
| `get_blog_categories` RPC not in generated types | LOW | TypeCheck fails | Standard: run `pnpm db:types` after migration |

## Scalability Considerations

| Concern | Current (< 50 posts) | At 500 posts | At 5,000 posts |
|---------|----------------------|--------------|----------------|
| Blog list query | `.limit(20)` -- fine | Pagination handles it | Add DB-level text search (pg_trgm index already exists on other tables) |
| Categories RPC | Full scan of blogs | Fine (small table) | Consider materialized view if categories change infrequently |
| Featured images | Stored as URL strings | Fine | Consider Supabase Storage for CDN delivery |
| Newsletter contacts | Resend API | Resend handles scale | No change needed |
| Related posts query | Full scan by category | Fine | Add composite index `(category, published_at DESC)` if slow |

## Sources

- Codebase analysis: all files listed in integration points section verified via Read tool
- Resend API: [Resend Contacts Documentation](https://resend.com/docs/dashboard/audiences/contacts), [Resend Blog on Audiences](https://resend.com/blog/manage-subscribers-using-resend-audiences)
- GitHub Actions: [Workflow Syntax](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)
- nuqs: verified in `src/components/providers.tsx` (NuqsAdapter already mounted)
- Blog table schema: `supabase/migrations/20251209120000_create_blogs_table.sql`
- Blog RLS: `supabase/migrations/20251219210000_add_blogs_rls_policies.sql`
- Proxy routes: `proxy.ts` lines 8-31
