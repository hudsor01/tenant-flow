# Phase 11: Blog Data Layer - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

All blog data queries are paginated, type-safe, and follow the queryOptions() factory convention. Deliverables: `blog-keys.ts` factory, paginated blog list hook, `get_blog_categories` RPC, related posts query, featured comparisons query. No UI components or pages in this phase.

</domain>

<decisions>
## Implementation Decisions

### Category data shape
- `get_blog_categories` RPC returns rows with: `name` (text), `slug` (computed: `lower(name)` + replace spaces with hyphens), `post_count` (integer)
- Category pages resolve display name by looking up the slug in the cached RPC response — no separate RPC call needed
- Slug computation lives in the RPC (SQL), not in frontend code

### Pagination defaults
- Use `keepPreviousData` for flash-free page transitions (consistent with tenants/notifications hooks)
- Page size at Claude's discretion (evaluate what fits the blog card grid)

### Comparisons split logic
- Hub page Zone 1 (Software Comparisons) uses tag-based filtering, not hardcoded category name
- Query filters on `tags` array column (e.g., `cs.{comparison}`) to identify comparison posts
- Specific tag value and View All link behavior at Claude's discretion

### Query staleness & caching
- n8n automation publishes a new blog post every hour — cache times should reflect this
- Blog list and categories queries should use shorter staleTime than typical app queries
- Specific staleTime values at Claude's discretion given the hourly publish cadence

### Claude's Discretion
- Page size for blog list pagination
- Exact tag value for comparison filtering (e.g., "comparison", "software-comparison")
- Whether View All link appears on comparisons section
- Specific staleTime/gcTime values for blog queries
- Internal implementation details (mapper functions, error handling patterns)

</decisions>

<specifics>
## Specific Ideas

- Follow the exact `queryOptions()` factory pattern from `property-keys.ts` — import `createClient`, `getCachedUser`, `handlePostgrestError`, `QUERY_CACHE_TIMES`
- `keepPreviousData` usage matches existing patterns in `use-tenants.ts` and `use-notifications.ts`
- The `blogs` table has a `tags` text array column — use Supabase `.contains()` or `.cs()` for tag filtering
- The `blogs` table `category` column is nullable text — RPC aggregates distinct non-null values

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/api/query-keys/property-keys.ts`: Reference implementation for queryOptions() factory pattern
- `src/hooks/api/use-blogs.ts`: Current blog hooks (to be rewritten) — has basic query structure
- `src/lib/supabase/client.ts`: `createClient()` used inside all query functions
- `src/hooks/api/use-auth.ts`: `getCachedUser()` for auth-dependent queries
- `src/shared/types/supabase.ts`: Generated types with `blogs.Row` definition (slug, category, tags, content, etc.)

### Established Patterns
- `queryOptions()` factories: All query keys in `src/hooks/api/query-keys/` — blog must follow same pattern
- `handlePostgrestError()`: Standard error handling for all Supabase queries
- `QUERY_CACHE_TIMES`: Shared cache time constants (blog may need shorter values)
- `keepPreviousData`: Used in paginated hooks for flash-free transitions
- Soft-delete: Properties use `.neq('status', 'inactive')` — blogs don't have soft-delete, no filter needed
- Pagination: Use `{ count: 'exact' }` and `.range()` — never `data.length`

### Integration Points
- New `blog-keys.ts` factory file in `src/hooks/api/query-keys/`
- `use-blogs.ts` rewritten to consume factories from `blog-keys.ts`
- `get_blog_categories` RPC created via Supabase migration
- Types regenerated with `pnpm db:types` after RPC creation

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-blog-data-layer*
*Context gathered: 2026-03-07*
