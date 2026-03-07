# Phase 11: Blog Data Layer - Research

**Researched:** 2026-03-07
**Domain:** TanStack Query data layer, Supabase PostgREST pagination, SQL RPC functions
**Confidence:** HIGH

## Summary

Phase 11 migrates the blog data layer from ad-hoc `useQuery` hooks with string literal key arrays to the project's established `queryOptions()` factory pattern. The existing `use-blogs.ts` has 5 hooks with basic queries but lacks pagination (`.range()` with `{ count: 'exact' }`), `keepPreviousData` for flash-free transitions, proper error handling via `handlePostgrestError`, and query key factories in a dedicated `blog-keys.ts` file. All other domains in the project (properties, tenants, leases, maintenance, payments, etc.) have already been migrated to this pattern.

The phase also requires creating a `get_blog_categories` RPC that returns distinct categories with post counts and computed slugs. This RPC does not yet exist -- confirmed by checking `supabase.ts` generated types (no `get_blog_categories` in Functions). Additionally, two new query factories are needed: related posts (same category, exclude current, limit 3) and featured comparisons (tag-based filtering on the `tags` text array column).

**Primary recommendation:** Follow the exact patterns from `property-keys.ts` and `tenant-keys.ts` for the factory file. Use `handlePostgrestError` instead of throwing `new Error()`. Add a `BLOG` entry to `QUERY_CACHE_TIMES` with shorter stale times (2-3 minutes) given the hourly n8n publish cadence. Create the RPC with `slug` computation in SQL as decided in CONTEXT.md.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `get_blog_categories` RPC returns rows with: `name` (text), `slug` (computed: `lower(name)` + replace spaces with hyphens), `post_count` (integer)
- Category pages resolve display name by looking up the slug in the cached RPC response -- no separate RPC call needed
- Slug computation lives in the RPC (SQL), not in frontend code
- Use `keepPreviousData` for flash-free page transitions (consistent with tenants/notifications hooks)
- Hub page Zone 1 (Software Comparisons) uses tag-based filtering, not hardcoded category name
- Query filters on `tags` array column (e.g., `cs.{comparison}`) to identify comparison posts
- n8n automation publishes a new blog post every hour -- cache times should reflect this
- Blog list and categories queries should use shorter staleTime than typical app queries

### Claude's Discretion
- Page size for blog list pagination
- Exact tag value for comparison filtering (e.g., "comparison", "software-comparison")
- Whether View All link appears on comparisons section
- Specific staleTime/gcTime values for blog queries
- Internal implementation details (mapper functions, error handling patterns)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BLOG-01 | Paginated blog queries with `.range()` and `{ count: 'exact' }` | Pattern established in `property-keys.ts` lines 162-215, `tenant-keys.ts` lines 62-108. Use `PaginatedResponse<T>` from `api-contracts.ts`. Add `keepPreviousData` at hook consumption level. |
| BLOG-02 | `get_blog_categories` RPC returns distinct categories with post counts | New SQL function needed. Return shape: `name text, slug text, post_count bigint`. RPC does not yet exist in generated types. Follow `SECURITY INVOKER` pattern with `SET search_path = public`. |
| BLOG-03 | Related posts query (same category, exclude current, limit 3) | PostgREST filter chain: `.eq('category', category).neq('slug', excludeSlug).limit(3)`. No RPC needed -- simple PostgREST query. |
| BLOG-04 | Featured comparisons query (Software Comparisons category) | User decided tag-based filtering via `.contains()` on the `tags` text array column. Supabase JS method: `.contains('tags', ['comparison'])`. |
| BLOG-05 | Blog query key factory (`blog-keys.ts`) using `queryOptions()` pattern | New file in `src/hooks/api/query-keys/blog-keys.ts`. Follow `propertyQueries` pattern: `all()`, `lists()`, `list(filters)`, `details()`, `detail(slug)`, plus `categories()`, `related()`, `comparisons()`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | v5 | Query state management, `queryOptions()` factories, `keepPreviousData` | Already used everywhere in project |
| `@supabase/supabase-js` | (project version) | PostgREST queries, RPC calls, `{ count: 'exact' }` pagination | Only data access layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` `.contains()` | (built-in) | Array column filtering for tags | Comparison post queries filtering on `tags` array |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RPC for categories | Raw PostgREST `.select('category').eq('status','published')` + client-side aggregation | RPC is cleaner: server-side GROUP BY, returns slug computation, single round trip. RPC is the locked decision. |
| Tag-based comparison filtering | Category-name filtering `.eq('category', 'Software Comparisons')` | Tag-based is the locked decision. More flexible for content that spans categories. |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/hooks/api/query-keys/
  blog-keys.ts          # NEW: queryOptions() factory (the primary deliverable)

src/hooks/api/
  use-blogs.ts          # REWRITE: consume factories from blog-keys.ts

supabase/migrations/
  YYYYMMDDHHMMSS_blog_categories_rpc.sql  # NEW: get_blog_categories RPC

src/lib/constants/
  query-config.ts       # MODIFY: add BLOG cache tier

src/shared/types/
  supabase.ts           # REGENERATE: after RPC creation via pnpm db:types
```

### Pattern 1: queryOptions() Factory (Canonical Reference)
**What:** Centralized query configuration using TanStack Query v5 `queryOptions()` that colocates query key, query function, and cache config.
**When to use:** Every data query in the application.
**Example from existing codebase (`property-keys.ts`):**
```typescript
// Source: src/hooks/api/query-keys/property-keys.ts
import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

export const propertyQueries = {
  all: () => ['properties'] as const,
  lists: () => [...propertyQueries.all(), 'list'] as const,
  list: (filters?: PropertyFilters) =>
    queryOptions({
      queryKey: [...propertyQueries.lists(), filters ?? {}],
      queryFn: async (): Promise<PaginatedResponse<Property>> => {
        const supabase = createClient()
        // ... query with { count: 'exact' } and .range()
        if (error) handlePostgrestError(error, 'properties')
        return { data, total, pagination: { page, limit, total, totalPages } }
      },
      ...QUERY_CACHE_TIMES.DETAIL
    }),
}
```

### Pattern 2: Paginated Hook with keepPreviousData
**What:** Hook layer that consumes the factory and adds `keepPreviousData` for flash-free pagination.
**When to use:** Any paginated list view.
**Example from existing codebase (`use-tenant.ts`):**
```typescript
// Source: src/hooks/api/use-tenant.ts
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { tenantQueries } from './query-keys/tenant-keys'

export function useTenantList(page: number = 1, limit: number = 50) {
  const offset = (page - 1) * limit
  const queryOpts = tenantQueries.list({ limit, offset })
  return useQuery({
    ...queryOpts,
    placeholderData: keepPreviousData
  })
}
```

### Pattern 3: RPC Query Factory
**What:** Factory entry that calls a Supabase RPC function with typed mapper at the boundary.
**When to use:** Complex server-side aggregations (categories with counts).
**Example pattern for blog categories:**
```typescript
categories: () =>
  queryOptions({
    queryKey: [...blogQueries.all(), 'categories'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_blog_categories')
      if (error) handlePostgrestError(error, 'blog categories')
      return data ?? []
    },
    ...QUERY_CACHE_TIMES.BLOG  // shorter staleTime
  }),
```

### Pattern 4: Supabase Array Contains Filter
**What:** PostgREST filtering on `text[]` array columns using the `contains` method.
**When to use:** Tag-based filtering for comparison posts.
**Supabase JS API:**
```typescript
// Filter rows where tags array contains 'comparison'
const { data } = await supabase
  .from('blogs')
  .select(BLOG_LIST_COLUMNS)
  .eq('status', 'published')
  .contains('tags', ['comparison'])
  .order('published_at', { ascending: false })
  .limit(limit)
```
The `.contains()` method generates the PostgREST `cs` (contains) filter. For text arrays, the argument is an array of strings the column must contain.

### Anti-Patterns to Avoid
- **String literal query keys:** Never `queryKey: ['blogs']`. Always use the factory: `blogQueries.all()`.
- **`throw new Error(error.message)` in queryFn:** Use `handlePostgrestError(error, 'blogs')` which captures to Sentry and throws.
- **Module-level Supabase client:** Create `createClient()` inside each queryFn (project convention).
- **`data.length` for pagination totals:** Always use `count` from `{ count: 'exact' }` response.
- **`as unknown as` type assertion on RPC results:** Use typed mapper functions at boundaries (project zero-tolerance rule).
- **Custom PaginatedBlogs type:** Use `PaginatedResponse<BlogListItem>` from `api-contracts.ts` for consistency.
- **Unbounded `.select('*')` on blog list queries:** Use specific column selection via `BLOG_LIST_COLUMNS` constant.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination response shape | Custom `{ posts, total }` interface | `PaginatedResponse<T>` from `api-contracts.ts` | Consistent with all other paginated queries in the project |
| Category slug generation (frontend) | `slugify()` function in JS | RPC returns pre-computed slug | Locked decision: slug computed in SQL. Category pages look up slug in cached RPC response. |
| PostgREST error handling | `throw new Error(error.message)` | `handlePostgrestError(error, domain)` | Captures to Sentry, consistent error shape |
| Cache time configuration | Inline `staleTime: 3 * 60 * 1000` | `QUERY_CACHE_TIMES.BLOG` constant | Centralized cache config at `src/lib/constants/query-config.ts` |
| Query key arrays | `['blogs', 'list', page]` | `blogQueries.list(filters).queryKey` | Type-safe, consistent invalidation |

**Key insight:** The entire project has already converged on these patterns. Blog is the last domain using the old ad-hoc style. Follow existing patterns exactly.

## Common Pitfalls

### Pitfall 1: RPC Return Type Mismatch After db:types Regeneration
**What goes wrong:** The `get_blog_categories` RPC returns `{ name, slug, post_count }` but the generated type in `supabase.ts` uses the SQL column types which may need mapping.
**Why it happens:** Supabase type generation creates `Functions['get_blog_categories']['Returns']` automatically but the column names and types in generated code must match exactly what the RPC returns.
**How to avoid:** After running `pnpm db:types`, verify the generated return type matches. Use a mapper function if the generated type uses `bigint` for `post_count` (SQL `count(*)::bigint` maps to `number` in Supabase JS).
**Warning signs:** TypeScript errors on the RPC call after type regeneration.

### Pitfall 2: keepPreviousData in Wrong Layer
**What goes wrong:** Putting `placeholderData: keepPreviousData` inside `blog-keys.ts` factory instead of in the consuming hook.
**Why it happens:** It seems natural to put all query config in one place.
**How to avoid:** The factory file (`blog-keys.ts`) defines `queryOptions` with `queryKey`, `queryFn`, and cache times. The hook file (`use-blogs.ts`) spreads the factory options and adds `placeholderData: keepPreviousData`. This matches `tenant-keys.ts` (no `keepPreviousData`) vs `use-tenant.ts` (adds `keepPreviousData`).
**Warning signs:** Factory file importing `keepPreviousData`.

### Pitfall 3: Blog Category Slug Case Sensitivity
**What goes wrong:** Category page URL slug `software-comparisons` does not match DB category `Software Comparisons` when looking up display name.
**Why it happens:** The URL uses lowercase slugified form, but the DB stores the display name.
**How to avoid:** The RPC returns both `name` (display) and `slug` (computed). Category pages look up the slug in the cached RPC response to get the display name. The query to the DB then uses the `name` field for the `.eq('category', name)` filter.
**Warning signs:** Category pages showing no posts despite posts existing in DB.

### Pitfall 4: `contains()` vs `cs()` API
**What goes wrong:** Using wrong method name for array containment filter.
**Why it happens:** PostgREST uses `cs` as the filter abbreviation, but `supabase-js` exposes it as `.contains()`.
**How to avoid:** Use `.contains('tags', ['comparison'])` in supabase-js. This generates the correct `cs.{comparison}` filter.
**Warning signs:** 400 error from PostgREST, or empty results when tags exist.

### Pitfall 5: PGRST116 Handling on Detail Query
**What goes wrong:** Blog detail query with `.single()` throws when post is not found (unpublished or nonexistent).
**Why it happens:** PostgREST returns error code `PGRST116` when `.single()` finds zero rows.
**How to avoid:** The existing `useBlogBySlug` already handles this correctly -- check for `error.code === 'PGRST116'` and return `null`. Preserve this pattern in the factory migration. Do NOT use `handlePostgrestError` for PGRST116 since it is an expected state, not an error.
**Warning signs:** Sentry noise from "not found" blog slugs.

### Pitfall 6: Blog Queries Don't Need Authentication
**What goes wrong:** Adding `getCachedUser()` calls to blog query functions.
**Why it happens:** Most other query factories use `getCachedUser()` since they are owner-scoped.
**How to avoid:** Blogs are public content with `anon` and `authenticated` RLS policies. No auth check needed. The RLS policy `blogs_select_published` already filters to `status = 'published'` for both `anon` and `authenticated` roles.
**Warning signs:** Blog queries failing for unauthenticated users visiting the marketing site.

## Code Examples

Verified patterns from the existing codebase:

### Blog Query Key Factory Structure
```typescript
// Source: Pattern derived from property-keys.ts + tenant-keys.ts
// File: src/hooks/api/query-keys/blog-keys.ts

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse } from '#shared/types/api-contracts'
import type { Database } from '#shared/types/supabase'

type Blog = Database['public']['Tables']['blogs']['Row']

type BlogListItem = Pick<Blog,
  'id' | 'title' | 'slug' | 'excerpt' | 'published_at' |
  'category' | 'reading_time' | 'featured_image' |
  'author_user_id' | 'status' | 'tags'
>

const BLOG_LIST_COLUMNS =
  'id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags'

export interface BlogFilters {
  category?: string
  tag?: string
  limit?: number
  offset?: number
}

export const blogQueries = {
  all: () => ['blogs'] as const,
  lists: () => [...blogQueries.all(), 'list'] as const,

  list: (filters?: BlogFilters) =>
    queryOptions({
      queryKey: [...blogQueries.lists(), filters ?? {}],
      queryFn: async (): Promise<PaginatedResponse<BlogListItem>> => {
        const supabase = createClient()
        const limit = filters?.limit ?? 9
        const offset = filters?.offset ?? 0

        let q = supabase
          .from('blogs')
          .select(BLOG_LIST_COLUMNS, { count: 'exact' })
          .eq('status', 'published')
          .order('published_at', { ascending: false })

        if (filters?.category) {
          q = q.eq('category', filters.category)
        }
        if (filters?.tag) {
          q = q.contains('tags', [filters.tag])
        }

        q = q.range(offset, offset + limit - 1)

        const { data, error, count } = await q
        if (error) handlePostgrestError(error, 'blogs')

        const total = count ?? 0
        return {
          data: (data ?? []) as BlogListItem[],
          total,
          pagination: {
            page: Math.floor(offset / limit) + 1,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      },
      ...QUERY_CACHE_TIMES.BLOG
    }),

  details: () => [...blogQueries.all(), 'detail'] as const,

  // detail, categories, related, comparisons entries follow same pattern
}
```

### get_blog_categories RPC (SQL)
```sql
-- Source: Pattern from existing RPCs (get_dashboard_stats, get_maintenance_stats)
-- Conventions: SECURITY INVOKER, SET search_path = public, lowercase SQL

create or replace function get_blog_categories()
returns table(name text, slug text, post_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.category as name,
    lower(replace(b.category, ' ', '-')) as slug,
    count(*)::bigint as post_count
  from blogs b
  where b.status = 'published'
    and b.category is not null
  group by b.category
  order by count(*) desc;
$$;
```

### Cache Time Addition (query-config.ts)
```typescript
// Source: src/lib/constants/query-config.ts
// Add after the existing SECURITY entry:

/**
 * Blog content queries (public marketing content)
 * Shorter staleTime because n8n publishes every hour
 */
BLOG: {
  staleTime: 2 * 60 * 1000,  // 2 minutes
  gcTime: 10 * 60 * 1000     // 10 minutes
},
```

### Hook Consuming Factory with keepPreviousData
```typescript
// Source: Pattern from use-tenant.ts lines 81-110
// File: src/hooks/api/use-blogs.ts

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { blogQueries } from './query-keys/blog-keys'

export function useBlogs(page: number = 1, limit: number = 9) {
  const offset = (page - 1) * limit
  return useQuery({
    ...blogQueries.list({ limit, offset }),
    placeholderData: keepPreviousData
  })
}
```

## State of the Art

| Old Approach (current use-blogs.ts) | Current Approach (rest of codebase) | Impact |
|--------------------------------------|--------------------------------------|--------|
| `blogKeys` as plain object with `as const` arrays | `blogQueries` as factory returning `queryOptions()` | Type-safe, colocated queryFn + key |
| `throw new Error(error.message)` | `handlePostgrestError(error, domain)` | Sentry capture, consistent error shape |
| Hardcoded `staleTime: 5 * 60 * 1000` | `QUERY_CACHE_TIMES.BLOG` constant | Centralized, shorter for hourly content |
| No pagination (`.limit(20)` hardcoded) | `.range()` + `{ count: 'exact' }` + `PaginatedResponse<T>` | Real pagination with total counts |
| No `keepPreviousData` | `placeholderData: keepPreviousData` on paginated hooks | Flash-free page transitions |
| `useBlogs()` returns all data inline | Factory in `blog-keys.ts`, thin hooks in `use-blogs.ts` | Reusable, prefetchable, avoids circular deps |
| Category filtering by name string | RPC returns name + slug, filter by tag for comparisons | Dynamic categories from DB, tag-based comparisons |

**Deprecated/outdated:**
- The existing `blogKeys` object in `use-blogs.ts` (plain key arrays) must be fully replaced by `blogQueries` factory in `blog-keys.ts`
- The existing `useBlogsByCategory` filtering by category name string is still valid for category pages, but comparisons use tag filtering per user decision
- The blog redesign plan at `docs/plans/2026-03-06-blog-redesign.md` was created before the GSD phased approach. Its Task 1 and Task 2 cover the data layer scope of Phase 11, but with deviations: it uses hardcoded category name for comparisons (user now decided tag-based), does not use `handlePostgrestError`, does not use `PaginatedResponse<T>`, and does not separate factory from hooks.

## Open Questions

1. **Exact tag value for comparison filtering**
   - What we know: The `tags` column is `text[]`. The user wants tag-based filtering via `.contains()`. Possible values: `"comparison"`, `"software-comparison"`, etc.
   - What's unclear: What tag values actually exist in the DB for comparison posts.
   - Recommendation: Use `"comparison"` as the tag value (shortest, clearest). The factory should accept the tag as a parameter so the value is not hardcoded inside the query function. Verify against live data during implementation.

2. **Page size for blog list**
   - What we know: Current code uses `.limit(20)`. Blog redesign plan uses `12`. A 3-column grid layout (from the existing pages) works well with multiples of 3.
   - What's unclear: Final visual grid layout (Phase 12/14 concern).
   - Recommendation: Default to `9` (3x3 grid). This gives good above-the-fold content density without excessive scrolling. The page size is parameterized so consumers can override.

3. **Whether blog types should move to shared types**
   - What we know: `BlogListItem` and `BlogDetail` are currently defined locally in `use-blogs.ts` as `Pick` types from the generated `Blog` row.
   - What's unclear: Whether Phase 12/14 components will need these types.
   - Recommendation: Keep them in `blog-keys.ts` and export them. If Phase 12 components need them, they import directly from `blog-keys.ts` (no barrel files, per project rules). Move to `shared/types/` only if used across 3+ files in different domains.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BLOG-01 | Paginated blog queries return `PaginatedResponse` with correct total and page math | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | No -- Wave 0 |
| BLOG-02 | `get_blog_categories` RPC returns name, slug, post_count | manual-only | Manual: verify via `supabase` CLI or DB query after migration | N/A (SQL function, no TS unit test) |
| BLOG-03 | Related posts query excludes current slug, limits to 3, filters by category | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | No -- Wave 0 |
| BLOG-04 | Comparisons query filters by tag using `.contains()` | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | No -- Wave 0 |
| BLOG-05 | All query keys use factory pattern, no string literals | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm typecheck` (catches RPC type mismatches, import errors)
- **Per wave merge:** `pnpm validate:quick` (types + lint + unit tests)
- **Phase gate:** `pnpm typecheck` passes clean after RPC migration and type regeneration

### Wave 0 Gaps
- [ ] `src/hooks/api/query-keys/blog-keys.test.ts` -- covers BLOG-01, BLOG-03, BLOG-04, BLOG-05 (mock Supabase client, verify query construction and return shape)
- [ ] RPC verification script or manual validation for BLOG-02 (SQL function correctness tested via DB, not Vitest)

Note: Blog queries are public (no auth needed), so unit tests primarily verify query construction, filter parameters, pagination math, and response mapping. Integration testing of actual Supabase queries is out of scope for this phase's unit tests.

## Sources

### Primary (HIGH confidence)
- `src/hooks/api/query-keys/property-keys.ts` -- canonical `queryOptions()` factory reference with pagination, `handlePostgrestError`, `QUERY_CACHE_TIMES`
- `src/hooks/api/query-keys/tenant-keys.ts` -- paginated list factory with `PaginatedResponse<T>`, `{ count: 'exact' }`, `.range()`
- `src/hooks/api/use-tenant.ts` -- `keepPreviousData` consumption pattern at hook layer
- `src/hooks/api/use-notifications.ts` -- alternate `keepPreviousData` pattern with inline pagination
- `src/hooks/api/use-blogs.ts` -- current implementation to be migrated (5 hooks, ad-hoc keys)
- `src/lib/constants/query-config.ts` -- centralized cache time configuration
- `src/lib/postgrest-error-handler.ts` -- error handling pattern (Sentry capture + throw)
- `src/shared/types/supabase.ts` lines 50-109 -- `blogs` table Row/Insert/Update types
- `supabase/migrations/20251209120000_create_blogs_table.sql` -- table schema (tags text[], category text, reading_time generated)
- `supabase/migrations/20251219210000_add_blogs_rls_policies.sql` -- RLS: `anon` and `authenticated` can SELECT published, service_role for CUD

### Secondary (MEDIUM confidence)
- `docs/plans/2026-03-06-blog-redesign.md` -- earlier plan with data layer scope overlap (Task 1-2), some decisions superseded by CONTEXT.md
- Supabase PostgREST documentation -- `.contains()` maps to `cs` filter for array containment

### Tertiary (LOW confidence)
- None -- all findings verified against project source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- identical to 8 existing factory files in the project
- Architecture: HIGH -- patterns verified against 3+ existing implementations (property, tenant, notification)
- Pitfalls: HIGH -- identified from concrete code differences between current `use-blogs.ts` and target pattern
- RPC design: HIGH -- SQL pattern matches existing RPCs, return shape specified in CONTEXT.md decisions

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable patterns, no external dependency changes expected)
