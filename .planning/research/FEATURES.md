# Feature Landscape

**Domain:** Blog redesign with split content zones, newsletter subscription, and CI workflow optimization for an existing property management SaaS
**Researched:** 2026-03-06
**Scope:** Additive features on an existing blog (3 pages, 4 hooks, markdown rendering, Supabase `blogs` table)

## Table Stakes

Features users expect from a SaaS blog. Missing = the blog feels like an MVP prototype.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Paginated post lists | Blogs with 20+ posts become unnavigable without pagination. Current `useBlogs()` hard-caps at 20 rows with no pagination UI. | Low | `use-blogs.ts` rewrite, `BlogPagination` component, `nuqs` (already in project) | Use Supabase `.range()` with `{ count: 'exact' }`. Project already uses `nuqs` for data tables -- same `parseAsInteger.withDefault(1)` pattern. 12 posts per page is standard for 3-column grids (4 rows). |
| Featured images on blog cards | Every SaaS blog shows card-level images. Current cards are text-only boxes despite `featured_image` existing in the schema. | Low | `BlogCard` shared component, `next/image` | `featured_image` column already exists on `blogs` table. Card component wraps `next/image` with `fill` + `object-cover` for responsive sizing. |
| Featured image on detail page | Article pages without a hero image feel generic. Schema already stores `featured_image`. | Low | `[slug]/page.tsx` rewrite | Priority loading with `next/image` `priority` prop. `sizes` attribute matters for LCP. |
| Dynamic categories from DB | Current hub hardcodes 4 fake categories ("ROI Maximization", "Task Automation", etc.) with fake counts. Categories that do not match actual content destroy trust. | Medium | New `get_blog_categories` RPC, `useCategories()` hook, migration file, `pnpm db:types` regen | RPC returns `SELECT category, count(*) FROM blogs WHERE status='published' GROUP BY category`. SECURITY INVOKER is correct (public content, no auth needed). Must regenerate `supabase.ts` types after applying migration. |
| Category page with real data | Current category page uses hardcoded `categoryConfig` map with icons/descriptions per slug. Breaks for any category not in the map. | Low | `useBlogsByCategory` with pagination, `deslugify()` utility | Replace hardcoded config with dynamic slug-to-name conversion. Use the same `BlogCard` + `BlogPagination` pattern as the hub. |
| Empty states | Category pages with zero posts show nothing useful. A blog with no content needs a clear "nothing here yet" message. | Low | Inline empty state or new `EmptyState` shared component | CLAUDE.md references `EmptyState` from `#components/shared/empty-state` but this component does NOT exist yet (verified via filesystem search). Either create it before the category page task, or use inline empty state UI. The plan imports it -- component must be created first or the import will fail. |
| Loading skeletons | Users need visual feedback during data fetches. Current skeletons exist but are simple pulse divs. | Low | Existing `animate-pulse` pattern | Already in place on current pages. New pages should maintain same skeleton shapes matching final card dimensions. |
| Back navigation | Detail and category pages need "Back to Blog" links. | Low | Already exists | Current pages already have this. Preserve it. |

## Differentiators

Features that elevate the blog beyond basic. Not strictly expected but meaningfully improve engagement and conversion.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Split hub with content zones | Separating "Software Comparisons" (high-intent, bottom-of-funnel) from "Insights & Guides" (educational) creates two clear paths. Comparison content targets buyers actively evaluating their options and converts significantly better than general blog posts. | Medium | `useFeaturedComparisons()` hook, hub page rewrite, horizontal scroll for Zone 1 | Zone 1 = horizontal scrollable comparison cards (6 max, `snap-x`). Zone 2 = paginated grid of everything else, with category pills. The split requires `useBlogs` to filter `.neq('category', 'Software Comparisons')` so comparisons are not duplicated across zones. |
| Category filter pills on hub | Let users browse by topic without leaving the hub. Shows available categories with counts. | Low | `useCategories()` hook (same as table stakes), hub page UI | Pills link to `/blog/category/[slug]` rather than filtering in-place. This avoids complex client-side filter state and gives each category a shareable URL. Filter out "Software Comparisons" from pills since Zone 1 handles it. |
| Related posts on detail page | When a reader finishes an article, showing 3 same-category posts keeps them engaged. Increases pages-per-session and dwell time. Industry standard for content-heavy SaaS blogs. | Low | `useRelatedPosts(category, excludeSlug, limit)` hook, 3-column grid below article | Query: same category, exclude current slug, order by `published_at` desc, limit 3. Use `enabled: !!category && !!excludeSlug` to avoid unnecessary fetches during loading. |
| Functional newsletter signup | Current newsletter form is a dead `<input>` with no backend. A working newsletter is a primary content-marketing conversion mechanism for SaaS blogs. | Medium | `newsletter-subscribe` Edge Function, `NewsletterSignup` client component, Resend Contacts API, rate limiting | **CRITICAL FINDING:** Resend has deprecated Audiences in favor of Segments and a new Contacts API. The plan's endpoint `POST /audiences/{id}/contacts` is deprecated. The current endpoint is `POST https://api.resend.com/contacts` with optional `segments` array parameter. The Edge Function must use the new Contacts API. Required env vars: `RESEND_API_KEY` (already used for auth emails). New env var needed: segment ID(s) for the newsletter segment, or use the deprecated `RESEND_AUDIENCE_ID` which still works but will be removed. |
| BlurFade animations on content | Staggered reveal animations as content enters viewport. Already used extensively on landing pages. Gives the blog a polished, cohesive feel consistent with the marketing site. | Low | `BlurFade` component (already exists at `src/components/ui/blur-fade.tsx`) | Wrap BlogCards, section headers, and detail page header in `<BlurFade delay={N} inView>`. Use incremental delays for grid items (e.g., `0.05 + i * 0.03`). |
| LazySection for below-fold content | The "Insights & Guides" zone (Zone 2) on the hub is below-fold. Lazy loading it defers rendering and Supabase queries until visible. | Low | `LazySection` (exists at `src/components/ui/lazy-section.tsx`), `SectionSkeleton` (exists at `src/components/ui/section-skeleton.tsx`) | Wrapping Zone 2 in `<LazySection>` means the `useBlogs()` call only fires when the user scrolls down. Combined with `staleTime: 5min`, this avoids unnecessary API calls on quick visits. |
| CI workflow deduplication | Current CI runs lint+typecheck+build on both `push` and `pull_request` to `main`. When a PR merge triggers both events, the same checks run twice, wasting ~20 minutes of runner time per merge. | Low | `.github/workflows/ci-cd.yml` modification | Gate `checks` job to PR-only with `if: github.event_name == 'pull_request'`. Make `e2e-smoke` independent on push-to-main (remove `needs: [checks]` dependency since it runs on a different event). The `e2e-smoke` job already has the correct push conditional (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`). |
| CTA linking to /pricing (not /login) | Current detail page CTA links to `/login`. For a blog reader who is not yet a customer, `/pricing` is the correct conversion path (see plans, compare tiers, then sign up). | Low | `[slug]/page.tsx` href change | One-line change but impacts conversion. |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Client-side category filtering on the hub | Adding filter state to the hub (show only "Property Management" posts in Zone 2 without navigation) introduces complex state management, breaks URL sharing, and creates a second way to browse categories alongside the category pages. | Link category pills to `/blog/category/[slug]`. Each category gets a shareable URL and its own paginated page. |
| Full-text blog search | Search requires a search index (pg_trgm or full-text search), debounced input, result highlighting, and a new UI pattern. Overkill for a blog with fewer than 100 posts. | Rely on categories and related posts for discoverability. Revisit search if post count exceeds 200. |
| RSS feed | Technically useful for power users but negligible traffic driver for a SaaS blog. Adds a route and XML rendering with no conversion benefit. | Defer. Can be added as a simple Next.js API route later if needed. |
| Newsletter double opt-in flow | Double opt-in (confirm email via link) requires a confirmation email template, a token table, a verification endpoint, and redirect handling. For a product newsletter (not marketing spam), single opt-in via Resend Contacts API is standard. | Use Resend's built-in contact management. Resend handles unsubscribe links in broadcasts. |
| Blog admin/CMS dashboard | Building a blog editor UI (create/edit posts, upload images, preview markdown) is a large feature with no revenue impact. | Manage blog content directly in Supabase Dashboard or via SQL. Blog posts are admin-authored, not user-generated. |
| Server Components for blog pages | The plan uses `'use client'` for all three blog pages. While blog content is mostly static and SSR-friendly, the project architecture relies on client-side TanStack Query for data fetching. Mixing server/client rendering for blog pages while the rest of the app is client-rendered creates inconsistency and complicates data flow. | Keep blog pages as client components with TanStack Query. The `staleTime: 5min` setting and `next/dynamic` for markdown already handle performance. Consider SSR/ISR for blog pages in a future SEO-focused milestone. |
| Infinite scroll instead of pagination | Infinite scroll harms SEO (no distinct page URLs), makes it hard to reach footer content, and loses user position on back-navigation. | Use URL-based pagination via `nuqs`. Each page is a shareable URL (`/blog?page=2`). |
| Custom email templates for newsletter | Building branded newsletter email templates before having newsletter content to send is premature optimization. | Use Resend Broadcasts with their default template. Invest in custom templates when regular newsletter cadence is established. |
| Tag-based filtering | The `blogs` table has a `tags` column (string array) but no UI or queries use it. Building tag filtering adds another navigation axis on top of categories. | Ignore tags for now. Categories are sufficient for the current content volume. Tags can layer on when category counts exceed 50 posts each. |

## Feature Dependencies

```
get_blog_categories RPC (migration)
  --> pnpm db:types (regenerate supabase.ts)
    --> useCategories() hook compiles
      --> Category pills on hub page
      --> Category page dynamic names

BlogCard component (new shared component)
  --> Hub page Zone 1 (comparisons)
  --> Hub page Zone 2 (insights grid)
  --> Category page post grid
  --> Related posts on detail page

BlogPagination component (new shared component)
  --> Hub page Zone 2
  --> Category page

useBlogs(page) rewrite (adds pagination)
  --> Hub page Zone 2

useFeaturedComparisons(limit) hook (new)
  --> Hub page Zone 1

useRelatedPosts(category, slug) hook (new)
  --> Detail page related posts section

newsletter-subscribe Edge Function (new)
  --> NewsletterSignup component
    --> Hub page (bottom)
    --> Category page (bottom)

EmptyState component (MUST BE CREATED -- does not exist despite CLAUDE.md reference)
  --> Category page zero-results state

CI workflow changes (fully independent -- no code dependencies)
```

**Critical path:** The `get_blog_categories` RPC migration must be applied and types regenerated before `useCategories()` will typecheck. All three page rewrites depend on `BlogCard` and `BlogPagination` being created first. The `newsletter-subscribe` Edge Function must be deployed before `NewsletterSignup` can work in production (though the component can be built and tested with mock responses before deployment).

## MVP Recommendation

Prioritize in this order:

1. **Data layer first** -- `use-blogs.ts` rewrite with pagination + categories + related hooks, plus `get_blog_categories` RPC migration and type regeneration. These unblock everything else.
2. **Shared components** -- `BlogCard`, `BlogPagination`, `NewsletterSignup`, and the missing `EmptyState`. These are reused across all three pages.
3. **Newsletter Edge Function** -- `newsletter-subscribe` with Resend Contacts API (not the deprecated Audiences endpoint) and rate limiting. Uses existing Edge Function patterns (`validateEnv`, `rateLimit`, `errorResponse`, `getCorsHeaders`).
4. **Page rewrites** -- Hub, detail, category pages in that order. All depend on steps 1-3.
5. **CI optimization** -- Independent, can be done in parallel with any other task. Lowest risk change.

**Defer to a future milestone:**
- Blog search (insufficient content volume)
- RSS feed (negligible ROI)
- SSR/ISR for blog pages (SEO optimization milestone)
- Blog admin CMS (manage via Supabase Dashboard)
- Custom newsletter email templates (build content cadence first)
- Tag-based filtering (categories are sufficient at current scale)

## Complexity Assessment

| Feature | Estimated Effort | Risk | Notes |
|---------|------------------|------|-------|
| `use-blogs.ts` rewrite | 1-2 hours | Low | Straightforward Supabase queries with `.range()`. Pattern matches existing pagination hooks. |
| `get_blog_categories` RPC | 30 min | Low | Simple GROUP BY, but requires migration apply + type regen cycle. |
| `BlogCard` component | 30 min | Low | Presentational component, no state. Uses `next/image` with `fill`. |
| `BlogPagination` component | 30 min | Low | `nuqs` pattern already used in project data tables. |
| `EmptyState` shared component | 30 min | Low | Must be created -- referenced in CLAUDE.md but does not exist on filesystem. |
| `newsletter-subscribe` Edge Function | 1-2 hours | **Medium** | Resend API has changed (Audiences deprecated). Must use `POST /contacts` with `segments` parameter. Rate limiting pattern is established. |
| `NewsletterSignup` component | 30 min | Low | TanStack Query mutation, form with toast, success state. |
| Hub page rewrite | 1-2 hours | Low | Largest single file. Composition of existing components. Two zones + category pills. |
| Detail page rewrite | 1 hour | Low | Adds featured image + related posts to existing structure. Preserves `MarkdownContent` dynamic import. |
| Category page rewrite | 30 min | Low | Simplest page. Removes hardcoded `categoryConfig`, adds pagination + empty state. |
| CI workflow dedup | 15 min | Low | One `if` conditional + removing one `needs` dependency in YAML. |
| **Total** | **~8-10 hours** | **Overall: Low-Medium** | The only medium-risk item is the Resend API change in the newsletter Edge Function. |

## Key Research Findings

### Resend API Change (MEDIUM confidence -- verified via official docs)
The implementation plan uses `POST /audiences/{audience_id}/contacts` to add newsletter subscribers. Resend has deprecated Audiences in favor of Segments and a new Contacts API. The current endpoint is `POST https://api.resend.com/contacts` with `email` (required) and optional `segments` array. The old audience-based endpoint still works but will be removed in the future. The Edge Function should use the new Contacts API for longevity. Environment variable should change from `RESEND_AUDIENCE_ID` to a segment-based approach, though audience IDs still function.

### nuqs Pagination (HIGH confidence -- already used in project)
The project already uses `nuqs` for URL state management in data tables. The `parseAsInteger.withDefault(1)` pattern for page numbers is the documented best practice. The library is only 6 kB gzipped and actively maintained. No new dependency needed -- `nuqs` is already installed.

### Supabase Pagination (HIGH confidence -- project convention)
`.range(from, to)` with `{ count: 'exact' }` is the project's established pagination pattern (used in properties, tenants, maintenance list views). Blog queries should follow the same approach. `count: 'exact'` scans the full result set but is appropriate for blog tables which will have hundreds, not millions, of rows.

### CI Dedup Pattern (HIGH confidence -- GitHub Actions documentation)
The cleanest approach is event-type conditionals: `if: github.event_name == 'pull_request'` for the `checks` job, keeping `if: github.event_name == 'push'` for `e2e-smoke`. The `e2e-smoke` job already uses the correct push conditional. The `checks` job needs the PR conditional added, and `e2e-smoke` needs `needs: [checks]` removed since it would run on a different event than `checks` and the dependency would never resolve. Alternative approaches (skip-duplicate-actions marketplace action, concurrency groups) are more complex than needed for this simple case.

### EmptyState Component Gap (HIGH confidence -- verified via filesystem search)
CLAUDE.md documents `EmptyState` from `#components/shared/empty-state` as a convention for list page empty states. This file does not exist on the filesystem. Only domain-specific empty states exist (e.g., `lease-template-empty-state.tsx`). The implementation plan imports `EmptyState` in the category page rewrite. This component must be created before the category page task, or the build will fail. Since the convention is already documented, creating a generic `EmptyState` is the right call.

### Split Content Hub Pattern (MEDIUM confidence -- SaaS blog design patterns)
The "content hub" model with distinct zones for different content types is an established SaaS blog pattern. Hotjar, HubSpot, and other SaaS companies segment their blogs by use case and content type. Separating comparison/bottom-of-funnel content from educational content aligns with standard content marketing strategy where comparison posts target high-intent buyers. Horizontal scroll for the comparisons zone is a common pattern for featured/promoted content that should be visually distinct from the main grid.

## Sources

- [Resend Audiences Introduction](https://resend.com/docs/dashboard/audiences/introduction) -- Audiences overview (deprecated)
- [Resend Audiences to Segments Migration](https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments) -- Migration guide
- [Resend Create Contact API](https://resend.com/docs/api-reference/contacts/create-contact) -- Current endpoint: POST /contacts
- [Resend New Contacts Experience](https://resend.com/blog/new-contacts-experience) -- Contacts API changes
- [nuqs Documentation](https://nuqs.dev/) -- Type-safe URL state management
- [nuqs GitHub](https://github.com/47ng/nuqs) -- Source, testing, changelog
- [GitHub Actions Duplicate Workflow Discussion](https://github.com/orgs/community/discussions/26940) -- Push + PR duplicate builds
- [GitHub Actions Prevent Duplicate Discussion](https://github.com/orgs/community/discussions/57827) -- Dedup patterns
- [GitHub Actions Workflow Conditions](https://oneuptime.com/blog/post/2026-01-25-workflow-conditions-github-actions/view) -- Event conditionals
- [Supabase Pagination Guide](https://makerkit.dev/blog/tutorials/pagination-supabase-react) -- .range() with count: 'exact'
- [PostgREST Pagination and Count](https://postgrest.org/en/stable/references/api/pagination_count.html) -- Official count options documentation
- [SaaS Blog Design Examples](https://www.webstacks.com/blog/saas-blog-design-examples) -- Category segmentation patterns
- [Blog Layout Best Practices 2025](https://crazyvendor.io/blog/10-blog-layout-best-practices-for-2025/) -- Related posts, reading time, scannable design
- [Content Hub Strategy](https://www.saffronedge.com/blog/content-hub/) -- Hub and spoke content model
