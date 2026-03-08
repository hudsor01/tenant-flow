# Project Research Summary

**Project:** TenantFlow v1.1 -- Blog Redesign + Newsletter + CI Optimization
**Domain:** Content marketing infrastructure for existing property management SaaS
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

This milestone transforms an MVP blog (3 pages, flat queries, dummy forms) into a production content-marketing platform with split content zones, pagination, category navigation, a working newsletter subscription, and CI workflow optimization. The critical finding is that **zero new npm dependencies are needed** -- every library is already installed and current. The work is purely additive: new components in `src/components/blog/`, a rewritten data layer in `use-blogs.ts` with a new `queryOptions()` factory in `query-keys/blog-keys.ts`, one SQL migration for a categories RPC, one new Edge Function for newsletter subscription, and a CI YAML restructure. Total estimated effort is 8-10 hours.

The recommended approach follows a strict dependency chain: data layer first (hooks + RPC + type regeneration), then shared components (BlogCard, BlogPagination, NewsletterSignup), then page rewrites (hub, detail, category), with CI optimization as an independent parallel track. The architecture is well-understood because it extends existing codebase patterns -- Supabase PostgREST pagination, nuqs URL state, TanStack Query factories, rate-limited Edge Functions -- rather than introducing anything novel. All 14 integration points were verified against the live codebase and none require modifications to existing code.

The primary risks are: (1) the Resend Audiences API has been deprecated in favor of a new Contacts + Segments model, requiring an endpoint update from `POST /audiences/{id}/contacts` to `POST /contacts`; (2) category slug-to-name conversion breaks on acronyms (ROI, SaaS, HVAC) unless resolved via RPC lookup instead of naive deslugification; and (3) the plan's query key pattern violates the project's `queryOptions()` factory convention that all 12 other domains follow. All three are preventable with the mitigations documented below.

## Key Findings

### Recommended Stack

No new packages. Every dependency is already installed at a current version. The milestone uses Next.js 16.1.6, React 19, TailwindCSS 4.2.1, TanStack Query 5.90.21, nuqs 2.8.8, and react-markdown 10.1.0 -- all unchanged. The sole external integration is the Resend Contacts API, authenticated via the existing `RESEND_API_KEY` secret.

**Core technologies (all pre-installed):**
- `nuqs` 2.8.8: URL-driven pagination state (`?page=N`) -- already used in data tables with identical `parseAsInteger.withDefault(1)` pattern
- `react-markdown` 10.1.0 + rehype/remark plugins: Blog content rendering -- already dynamically imported in the existing detail page
- `@tailwindcss/typography` 0.5.19: Prose styling for blog content -- installed as devDep but missing `@plugin` directive in `globals.css` (must be added)
- `BlurFade` component: CSS-only staggered animations -- exists at `src/components/ui/blur-fade.tsx`, no animation library needed
- `LazySection` / `SectionSkeleton`: Intersection-based lazy loading -- exist and are used on landing pages

**One setup requirement:** Add `@plugin "@tailwindcss/typography"` to `globals.css`. Without it, `prose` classes are no-ops in Tailwind 4. Also add a `@utility scrollbar-hide` (3 lines of CSS) for the comparisons carousel.

### Expected Features

**Must have (table stakes):**
- Paginated post lists with URL state via nuqs -- current blog hard-caps at 20 rows with no pagination UI
- Featured images on cards and detail pages -- `featured_image` column exists in schema but is unused
- Dynamic categories from DB via `get_blog_categories` RPC -- current hub hardcodes 4 fake categories with fake counts
- Category pages with real data and pagination -- current page uses a brittle `categoryConfig` map that breaks for any new category
- Loading skeletons and empty states -- extend existing animation patterns
- Working back navigation -- already exists, preserve it

**Should have (differentiators):**
- Split hub with content zones: "Software Comparisons" (horizontal scroll, bottom-of-funnel) separated from "Insights & Guides" (paginated grid, educational)
- Category filter pills on the hub linking to `/blog/category/[slug]`
- Related posts (3 same-category articles) on the detail page for engagement
- Functional newsletter signup via Resend Contacts API (replacing dead form that currently does nothing)
- BlurFade animations and LazySection for below-fold content deferral
- CI workflow deduplication saving ~20 min of runner time per merge
- CTA on detail page linking to `/pricing` instead of `/login` (correct conversion path for blog readers)

**Defer (v2+):**
- Full-text blog search (insufficient content volume, under 100 posts)
- RSS feed (negligible traffic driver for a SaaS blog)
- SSR/ISR for blog pages (future SEO-focused milestone)
- Blog admin CMS (manage via Supabase Dashboard directly)
- Custom newsletter email templates (establish content cadence first)
- Tag-based filtering (categories are sufficient at current scale)
- Newsletter double opt-in (single opt-in is standard for product newsletters)

### Architecture Approach

The redesign adds three layers: (1) a `src/components/blog/` directory with BlogCard, BlogPagination, and NewsletterSignup; (2) a rewritten `use-blogs.ts` with paginated queries backed by a `blog-keys.ts` factory file in `src/hooks/api/query-keys/`; and (3) a `newsletter-subscribe` Edge Function following the existing unauthenticated/rate-limited pattern identical to `tenant-invitation-validate`. No existing shared utilities, middleware, RLS policies, or Deno imports need modification.

**Major components:**
1. `blog-keys.ts` (queryOptions factory) -- All blog query keys and functions, matching the `property-keys.ts` pattern used by every other domain
2. `use-blogs.ts` (thin hook layer) -- `useBlogs(page)`, `useBlogBySlug(slug)`, `useBlogsByCategory(name, page)`, `useFeaturedComparisons(limit)`, `useRelatedPosts(category, slug)`, `useCategories()`
3. `BlogCard` -- Shared presentational component (image, title, excerpt, metadata) used across all three pages
4. `BlogPagination` -- URL-driven page controls via nuqs with `clearOnDefault: true`
5. `NewsletterSignup` -- Client component with TanStack Query mutation calling the newsletter Edge Function
6. `newsletter-subscribe` Edge Function -- Unauthenticated, rate-limited (5 req/min), uses Resend Contacts API
7. `get_blog_categories` RPC -- SECURITY INVOKER, SQL language, STABLE, returns `{category, count}[]`

**Integration points verified as requiring NO changes:**
- `proxy.ts`: `/blog` already in PUBLIC_ROUTES (all sub-routes covered)
- `NuqsAdapter`: already in provider tree at `src/components/providers.tsx`
- RLS: `blogs_select_published` policy covers all new queries (anon + authenticated)
- Deno import map: `@sentry/deno`, `@upstash/ratelimit`, `@upstash/redis` all present
- Edge Function `_shared/` utilities: consumed, not modified
- `PageLayout`: all blog pages already wrapped, no changes needed

### Critical Pitfalls

1. **Query keys must use `queryOptions()` factories** -- The plan copies the old raw `blogKeys` object pattern. All 12 other domains use factories in `src/hooks/api/query-keys/`. Create `blog-keys.ts` with the standard pattern; hooks become one-liners like `useQuery(blogQueries.list(page))`. Address in the data layer task before any pages are written.

2. **Pagination needs `placeholderData: keepPreviousData`** -- Without it, page transitions flash empty (skeleton shimmer) while new data loads. The project already uses this in 6 other hooks. Add `keepPreviousData` to all paginated blog queries and use `isPlaceholderData` for opacity-reduced loading state instead of full skeleton replacement.

3. **Category slug roundtrip breaks on acronyms** -- `slugify("ROI Maximization")` produces `"roi-maximization"` but `deslugify("roi-maximization")` produces `"Roi Maximization"`, which does not match the DB value. Fix: on the category page, call `useCategories()` and match by slug to get the actual DB name instead of naive deslugification.

4. **Resend API endpoint has changed** -- `POST /audiences/{id}/contacts` is deprecated (November 2025). Use `POST https://api.resend.com/contacts` with optional `segments` array. Rename env var from `RESEND_AUDIENCE_ID` to `RESEND_NEWSLETTER_SEGMENT_ID`. Old endpoint still works but will be removed.

5. **Type regeneration is a hard gate** -- After the `get_blog_categories` migration, `pnpm db:types` must run before any hook calling the RPC will typecheck. Commit the migration and regenerated `supabase.ts` together. Do not proceed to component tasks until `pnpm typecheck` passes clean.

## Implications for Roadmap

Based on research, the milestone decomposes into 5 phases following a strict dependency chain.

### Phase 1: Data Layer Foundation
**Rationale:** All UI components and pages depend on hooks and types. The RPC migration must be applied and types regenerated before anything downstream compiles.
**Delivers:** `blog-keys.ts` queryOptions factory, rewritten `use-blogs.ts` with all 6 hooks, `get_blog_categories` SQL migration, regenerated `supabase.ts`
**Addresses:** Paginated post lists (table stakes), dynamic categories (table stakes), all hook dependencies for downstream phases
**Avoids:** Pitfall 1 (query key convention -- use factories from day one), Pitfall 2 (keepPreviousData -- wire into factory), Pitfall 4 (type regeneration -- commit migration + types together)

### Phase 2: Shared Components
**Rationale:** BlogCard, BlogPagination, and NewsletterSignup are consumed by all three page rewrites. Building them as isolated components before page integration ensures clean composition.
**Delivers:** `src/components/blog/blog-card.tsx`, `src/components/blog/blog-pagination.tsx`, `src/components/blog/newsletter-signup.tsx`, CSS utilities (`scrollbar-hide`, `@plugin typography`)
**Addresses:** Featured images on cards (table stakes), URL pagination controls (table stakes), newsletter capture UI (differentiator)
**Avoids:** Pitfall 7 (nuqs clearOnDefault -- configure in BlogPagination), Pitfall 10 (BlurFade delay capping on card grids)

### Phase 3: Newsletter Edge Function
**Rationale:** The Edge Function must be deployed and secrets configured before NewsletterSignup works in production. It is independent of UI components but must be operational before page rewrites integrate the signup form.
**Delivers:** `supabase/functions/newsletter-subscribe/index.ts` deployed with Resend Contacts API, rate limiting, CORS, error handling
**Addresses:** Functional newsletter signup (differentiator)
**Avoids:** Pitfall 4 (Resend endpoint change -- use `POST /contacts`), Pitfall 5 (secrets not deployed -- verify before testing), Pitfall 6 (duplicate contact handling -- treat duplicates as success)

### Phase 4: Page Rewrites
**Rationale:** All dependencies (hooks, components, Edge Function) are in place. Pages are the composition layer. Build in order of complexity: hub (most complex, two zones), detail (adds related posts + featured image), category (simplest, dynamic name + pagination).
**Delivers:** Fully rewritten `/blog` hub with split zones and category pills, `/blog/[slug]` detail with featured image + related posts + fixed CTA, `/blog/category/[category]` with dynamic naming and pagination
**Addresses:** Split content hub (differentiator), related posts (differentiator), category navigation (table stakes), CTA to /pricing (differentiator)
**Avoids:** Pitfall 3 (category slug roundtrip -- use RPC lookup on category page), Pitfall 10 (BlurFade cascade -- cap delay at 6 items)

### Phase 5: CI Optimization
**Rationale:** Completely independent of all blog work. Can be done in parallel with any phase. Low risk, saves ~20 min runner time per merge.
**Delivers:** Deduplicated CI workflow -- checks on PR events only, e2e-smoke independent on push-to-main events
**Addresses:** CI deduplication (differentiator)
**Avoids:** Pitfall 8 (unprotected main -- either keep both triggers with `concurrency.cancel-in-progress: true`, or verify branch protection rules require checks status before merge)

### Phase Ordering Rationale

- Phase 1 before all else: hooks and types are imported by every subsequent file. Nothing compiles without them.
- Phase 2 before Phase 4: page components import BlogCard, BlogPagination, NewsletterSignup. Build errors if components do not exist.
- Phase 3 before Phase 4: Edge Function must be deployed for newsletter to work in production. The component itself can be built in Phase 2 and tested with mock responses.
- Phase 4 pages in order hub/detail/category: hub is most complex and exercises all components; if any component has issues, they surface here first.
- Phase 5 is independent: can run as a parallel PR at any time. Logically groups as a final cleanup.

### Research Flags

**Phases needing attention during implementation (not deeper research -- patterns are known):**
- **Phase 1:** The `queryOptions()` factory pattern MUST be followed, not the plan's raw `blogKeys` approach. This is a convention enforcement issue, not a technical uncertainty.
- **Phase 3:** Verify Resend Contacts API behavior for duplicate emails (send same email twice, observe response code). Handle 409 or equivalent as success. Also verify `RESEND_NEWSLETTER_SEGMENT_ID` setup in Resend dashboard before deploy.
- **Phase 4 (category page):** Test slug roundtrip with acronym categories (ROI, SaaS). Validate that `useCategories()` lookup approach resolves the mismatch.
- **Phase 5:** Check GitHub branch protection settings before modifying CI triggers. If protection is not enforced, keep both triggers with concurrency cancellation.

**Phases with well-documented, established patterns (no additional research needed):**
- **Phase 1 (Data Layer):** PostgREST pagination with `.range()` + `{ count: 'exact' }`, nuqs `parseAsInteger`, queryOptions factories -- all patterns used across 12+ domains
- **Phase 2 (Components):** Presentational components consuming design system tokens, `next/image` with `fill` -- straightforward composition of existing patterns
- **Phase 5 (CI):** GitHub Actions event conditionals -- one `if` condition change, well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All versions verified against `package.json` and `deno.json`. Resend API change confirmed via official docs and migration guide. |
| Features | HIGH | Feature landscape well-mapped with clear table stakes / differentiator / anti-feature boundaries. Complexity assessment: 8-10 hours total, only newsletter Edge Function at medium risk. |
| Architecture | HIGH | All 14 integration points verified against live codebase. No changes to proxy, PageLayout, NuqsAdapter, RLS, Deno imports, or shared Edge Function utilities. Data flow diagrams match existing patterns exactly. |
| Pitfalls | HIGH | 12 pitfalls identified across critical/moderate/minor tiers. All have prevention strategies with LOW recovery cost. Top 5 critical pitfalls are directly actionable during implementation with specific detection methods documented. |

**Overall confidence:** HIGH

### Gaps to Address

- **Resend duplicate contact behavior:** Not explicitly documented in Resend API reference. Must test empirically during Phase 3 by sending the same email twice and observing the response. Regardless of API behavior, always return success to the frontend for duplicate submissions.
- **`@tailwindcss/typography` plugin activation:** Package is installed (0.5.19) but `@plugin "@tailwindcss/typography"` directive is missing from `globals.css`. Must be added before `prose` classes render correctly in Tailwind 4. Trivial fix but will cause invisible styling failures if missed.
- **`scrollbar-hide` utility:** Referenced in plan for comparisons carousel but does not exist in `globals.css`. Add as a 3-line `@utility` block.
- **`text-responsive-display-xl` utility:** Referenced in plan but does not exist. Use existing `text-responsive-display-lg` or `typography-hero` instead.
- **EmptyState shared component:** CLAUDE.md documents `EmptyState` from `#components/shared/empty-state` but the file does not exist on the filesystem. The plan imports it in the category page. Resolution needed before Phase 4: either create the shared component or inline the empty state. Recommend creating it since the convention is already documented and other domains could benefit.

## Sources

### Primary (HIGH confidence)
- Codebase verification: `package.json`, `deno.json`, `globals.css`, `use-blogs.ts`, `ci-cd.yml`, `proxy.ts`, `providers.tsx`, blog migration files -- all read directly from filesystem
- [Resend Create Contact API](https://resend.com/docs/api-reference/contacts/create-contact) -- current endpoint documentation
- [Resend Migrating from Audiences to Segments](https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments) -- deprecation details and migration path
- [TanStack Query v5 Paginated Queries](https://tanstack.com/query/v5/docs/react/guides/paginated-queries) -- keepPreviousData pattern
- [nuqs Documentation](https://nuqs.dev/) -- clearOnDefault, parseAsInteger, adapter requirements
- [PostgREST Pagination and Count](https://postgrest.org/en/stable/references/api/pagination_count.html) -- range() with count: 'exact'
- [GitHub Actions Workflow Syntax](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions) -- event conditionals
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) -- SECURITY INVOKER vs DEFINER

### Secondary (MEDIUM confidence)
- [Resend New Contacts Experience (Nov 2025)](https://resend.com/blog/new-contacts-experience) -- API change announcement
- [GitHub Actions Avoid Double Runs](https://adamj.eu/tech/2025/05/14/github-actions-avoid-simple-on/) -- CI dedup patterns
- [SaaS Blog Design Examples](https://www.webstacks.com/blog/saas-blog-design-examples) -- split content hub pattern validation
- [Content Hub Strategy](https://www.saffronedge.com/blog/content-hub/) -- hub and spoke content model

### Tertiary (LOW confidence)
- Resend duplicate contact response behavior -- not explicitly documented, needs empirical validation during Phase 3 implementation

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
