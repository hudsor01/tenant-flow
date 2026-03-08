# Phase 14: Blog Pages - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse, read, and navigate blog content through a redesigned hub page (split zones), detail pages (featured images, related posts), and category pages (DB-resolved names, pagination). All three pages consume components from Phase 12 (BlogCard, BlogPagination, NewsletterSignup, BlogEmptyState) and hooks from Phase 11 (blogQueries factory). Newsletter wiring (NEWS-03) connects the NewsletterSignup component to the Phase 13 Edge Function.

</domain>

<decisions>
## Implementation Decisions

### Hub page structure
- Simplified hero section (blog title + subtitle only, drop stats card and savings playbook content)
- Category pills below hero, above both content zones — horizontal row of pills from `useBlogCategories()` with post counts, each linking to `/blog/category/[slug]`
- Software Comparisons zone: horizontal scroll row of BlogCards using `scrollbar-hide` utility, with `useComparisonPosts()` hook (6-card limit)
- Insights & Guides zone: paginated grid of BlogCards with `BlogPagination` controlling via `?page=N` URL param directly on the hub page (no separate /blog/insights route)
- NewsletterSignup component as pre-footer section (replaces current raw inline newsletter)

### Detail page layout
- Featured image: full-width banner above title (content-width max-w-4xl, 16:9 aspect ratio), with subtle blur-fade animation on load. Skip gracefully if no featured image.
- Category name in the author/time/date meta bar, linked to `/blog/category/[slug]`
- Prose CSS: simplify to `prose prose-lg dark:prose-invert` with minimal overrides — drop the 20+ arbitrary Tailwind selectors now that `@tailwindcss/typography` plugin is active
- Related posts: "Related Articles" heading + 3 BlogCards in horizontal row below the CTA section, using `useRelatedPosts(category, slug, 3)`. Stacks on mobile.
- No NewsletterSignup on detail page (CTA + related posts is enough)
- Raw inline newsletter section removed entirely from detail page

### Category page resolution
- Display names resolved from database only via `useBlogCategories()` — drop the hardcoded `categoryConfig` map with icons/descriptions entirely
- Category header shows name from DB + article count (no icons, no descriptions)
- Unknown slugs (not found in DB categories): redirect to `/blog`
- Known categories with zero posts: show `BlogEmptyState` component (PAGE-05 requirement)
- Paginated grid of BlogCards with `BlogPagination`
- NewsletterSignup as pre-footer section (replaces current raw inline newsletter)

### Newsletter wiring (NEWS-03)
- Replace raw inline newsletter sections on hub and category pages with the real `NewsletterSignup` component
- Remove raw newsletter section from detail page entirely
- NewsletterSignup already calls `supabase.functions.invoke('newsletter-subscribe', { body: { email } })` — wiring is complete from Phase 12/13

### Claude's Discretion
- CTA section placement on detail page (keep above related posts, move below, or remove)
- Hub hero exact copy and styling
- Category pills styling (spacing, selected state if "All" pill exists)
- BlogCard grid columns (2-col vs 3-col breakpoints)
- Blur-fade animation implementation (CSS transition vs JS)
- Mobile responsiveness details for horizontal scroll zone

</decisions>

<specifics>
## Specific Ideas

- The horizontal scroll for comparisons should use the `scrollbar-hide` CSS utility built in Phase 12 — same pattern as Netflix-style rows
- Category pills come from `useBlogCategories()` RPC which returns `{ name, slug, post_count }` — no frontend slug computation needed
- Detail page prose simplification is safe because `@tailwindcss/typography` was activated in Phase 12 (12-01 plan)
- Current pages have significant hardcoded content (fake stats, marketing copy) that should be cleaned out during the rewrite
- `useComparisonPosts()` filters on tags array with `.contains()` — no category name matching
- `keepPreviousData` is already applied in `useBlogs()` and `useBlogsByCategory()` hooks for flash-free pagination

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/blog/blog-card.tsx`: BlogCard with featured image, category label, reading time
- `src/components/blog/blog-pagination.tsx`: BlogPagination with nuqs URL state (`?page=N`)
- `src/components/blog/newsletter-signup.tsx`: NewsletterSignup with Edge Function mutation + toast feedback
- `src/components/shared/blog-empty-state.tsx`: BlogEmptyState with branded CSS animation
- `src/components/shared/blog-loading-skeleton.tsx`: BlogLoadingSkeleton for dynamic imports
- `src/hooks/api/use-blogs.ts`: All blog hooks (useBlogs, useBlogBySlug, useBlogsByCategory, useBlogCategories, useRelatedPosts, useComparisonPosts)
- `src/hooks/api/query-keys/blog-keys.ts`: Blog query factory with all query options

### Established Patterns
- `PageLayout` wrapper for all marketing pages
- `next/dynamic` with `ssr: false` for heavy components (MarkdownContent already uses this pattern)
- nuqs for URL state (BlogPagination already implements this)
- `next/image` for optimized images with aspect ratio
- Toast feedback system for user actions
- `flex-center`, `flex-between` utility classes used across existing pages

### Integration Points
- `src/app/blog/page.tsx`: Hub page — full rewrite (replace hardcoded content with component composition)
- `src/app/blog/[slug]/page.tsx`: Detail page — enhance with featured image, related posts, simplified prose
- `src/app/blog/category/[category]/page.tsx`: Category page — rewrite to use DB resolution, BlogCard, BlogPagination, BlogEmptyState
- `src/app/blog/[slug]/markdown-content.tsx`: Already dynamically imported — no changes needed
- `src/app/blog/error.tsx`: Error boundary — no changes needed

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-blog-pages*
*Context gathered: 2026-03-07*
