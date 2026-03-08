# Phase 14: Blog Pages - Research

**Researched:** 2026-03-07
**Domain:** Next.js page composition using pre-built blog components and hooks
**Confidence:** HIGH

## Summary

Phase 14 is a page-level composition phase. All data hooks (Phase 11), reusable components (Phase 12), and backend infrastructure (Phase 13) are complete. The work is rewriting three existing pages (`/blog`, `/blog/[slug]`, `/blog/category/[category]`) to compose the pre-built pieces together, removing hardcoded marketing content and raw inline newsletter sections.

The existing pages have significant technical debt: the hub page has hardcoded fake stats and category cards with icons; the detail page has 20+ arbitrary `[&>selector]` Tailwind overrides on the prose wrapper; the category page has a hardcoded `categoryConfig` map with icons and descriptions. All three have raw inline newsletter sections (plain `<input>` + `<Button>`) instead of the real `NewsletterSignup` component.

**Primary recommendation:** Treat this as two plans -- one for the hub page (most complex, two distinct content zones + category pills) and one for the detail + category pages (both simpler rewrites). All pages are `'use client'` and compose `PageLayout` with section blocks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Hub page structure: simplified hero (blog title + subtitle only, drop stats card and savings playbook content)
- Category pills below hero, above both content zones -- horizontal row from `useBlogCategories()` with post counts, each linking to `/blog/category/[slug]`
- Software Comparisons zone: horizontal scroll row of BlogCards using `scrollbar-hide` utility, with `useComparisonPosts()` hook (6-card limit)
- Insights & Guides zone: paginated grid of BlogCards with `BlogPagination` controlling via `?page=N` URL param directly on the hub page (no separate /blog/insights route)
- NewsletterSignup component as pre-footer section on hub and category pages (replaces current raw inline newsletter)
- Detail page: featured image full-width banner above title (content-width max-w-4xl, 16:9 aspect ratio), with subtle blur-fade animation on load. Skip gracefully if no featured image.
- Detail page: category name in the author/time/date meta bar, linked to `/blog/category/[slug]`
- Detail page prose CSS: simplify to `prose prose-lg dark:prose-invert` with minimal overrides -- drop the 20+ arbitrary Tailwind selectors now that `@tailwindcss/typography` plugin is active
- Detail page: related posts "Related Articles" heading + 3 BlogCards in horizontal row below CTA section, using `useRelatedPosts(category, slug, 3)`. Stacks on mobile.
- Detail page: no NewsletterSignup (CTA + related posts is enough)
- Detail page: raw inline newsletter section removed entirely
- Category page: display names resolved from database only via `useBlogCategories()` -- drop the hardcoded `categoryConfig` map with icons/descriptions entirely
- Category page: header shows name from DB + article count (no icons, no descriptions)
- Category page: unknown slugs (not found in DB categories) redirect to `/blog`
- Category page: known categories with zero posts show `BlogEmptyState` component
- Category page: paginated grid of BlogCards with `BlogPagination`
- Newsletter wiring (NEWS-03): replace raw inline newsletter sections with real `NewsletterSignup` component; remove from detail page entirely

### Claude's Discretion
- CTA section placement on detail page (keep above related posts, move below, or remove)
- Hub hero exact copy and styling
- Category pills styling (spacing, selected state if "All" pill exists)
- BlogCard grid columns (2-col vs 3-col breakpoints)
- Blur-fade animation implementation (CSS transition vs JS)
- Mobile responsiveness details for horizontal scroll zone

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAGE-01 | Hub page with split zones (Software Comparisons vs Insights & Guides) | Hub page rewrite: `useComparisonPosts()` for horizontal scroll zone, `useBlogs(page)` for paginated grid zone. Components: `BlogCard`, `BlogPagination` |
| PAGE-02 | Hub page shows category pills from DB with counts | `useBlogCategories()` returns `{ name, slug, post_count }[]`. Render as horizontal row of Link pills. |
| PAGE-03 | Detail page with featured image, BlurFade, and related posts section | `useBlogBySlug()` for post data, `useRelatedPosts(category, slug, 3)` for related. `next/image` for featured image. CSS transition for blur-fade. |
| PAGE-04 | Category page with dynamic name resolution and paginated grid | `useBlogCategories()` for name resolution from slug, `useBlogsByCategory(name, page)` for posts, `BlogPagination` for pagination. |
| PAGE-05 | EmptyState shown on category pages with no posts | `BlogEmptyState` from Phase 12. Render when `useBlogsByCategory` returns empty data for a known category. |
| NEWS-03 | Newsletter form calls Edge Function and shows success/error states | `NewsletterSignup` component from Phase 12 already wired to `newsletter-subscribe` Edge Function. Drop-in replacement for raw inline sections. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `next` | 16.x | App Router, `next/image`, `next/dynamic`, `next/link` | Installed |
| `react` | 19.x | Component rendering | Installed |
| `@tanstack/react-query` | 5.x | Server state via `useQuery` + `queryOptions()` | Installed |
| `nuqs` | 2.8.8 | URL state for `?page=N` pagination param | Installed |
| `react-markdown` | 10.1.0 | Markdown rendering (detail page, already dynamic-imported) | Installed |
| `@tailwindcss/typography` | latest | `prose` classes for markdown content | Active in globals.css |
| `lucide-react` | latest | Icon library (sole icon source) | Installed |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `remark-gfm` | 4.0.1 | GFM table/task list support in markdown | Already used in markdown-content.tsx |
| `rehype-raw` | 7.0.0 | Raw HTML in markdown | Already used |
| `rehype-sanitize` | 6.0.0 | XSS protection for markdown HTML | Already used |

**No new dependencies required.** Phase 14 is pure composition of existing pieces.

## Architecture Patterns

### File Structure (Rewrites Only)
```
src/app/blog/
  page.tsx                          # Hub page -- FULL REWRITE
  [slug]/
    page.tsx                        # Detail page -- REWRITE (add featured image, related posts, simplify prose)
    markdown-content.tsx            # NO CHANGES (already dynamic-imported)
  category/
    [category]/
      page.tsx                      # Category page -- FULL REWRITE
  error.tsx                         # NO CHANGES
```

### Pattern 1: Hub Page -- Multi-Zone Layout
**What:** Single page with three data sources rendered in distinct visual zones.
**When to use:** Hub page only.
**Data flow:**
```typescript
// Three independent hooks, parallelized by TanStack Query
const { data: categories } = useBlogCategories()
const { data: comparisons, isLoading: comparisonsLoading } = useComparisonPosts()
const { data: blogData, isLoading: blogsLoading } = useBlogs(page)
```
**Key:** Each zone renders independently. `useBlogs(page)` uses the nuqs `page` param. `useComparisonPosts()` has a fixed 6-card limit. Categories are a simple array mapped to Link pills.

### Pattern 2: Category Page -- DB Resolution with Redirect
**What:** Resolve category display name from database, redirect unknown slugs.
**When to use:** Category page.
**Data flow:**
```typescript
const { data: categories, isLoading: categoriesLoading } = useBlogCategories()
const category = categories?.find(c => c.slug === categorySlug)
// If categories loaded and slug not found -> redirect to /blog
// If found -> use category.name for useBlogsByCategory(category.name, page)
```
**Key:** Must wait for categories to load before deciding redirect vs render. Use `useRouter().replace('/blog')` for unknown slugs. The category name from DB is used to query posts (DB stores category as display name, not slug).

### Pattern 3: Detail Page -- Featured Image with Blur-Fade
**What:** Full-width featured image with CSS-only blur-fade entrance animation.
**When to use:** Detail page when `post.featured_image` is non-null.
**Implementation:**
```typescript
// CSS transition approach (no JS animation library needed)
<div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-lg">
  <Image
    src={post.featured_image}
    alt={post.title}
    fill
    sizes="(max-width: 768px) 100vw, 896px"
    priority
    className="object-cover transition-all duration-700 blur-0"
    // onLoad handler to trigger blur-fade via state
  />
</div>
```
**Recommendation for blur-fade:** Use CSS `filter: blur()` + `opacity` transition triggered by Image `onLoad` event. Start with `blur-sm opacity-0`, transition to `blur-0 opacity-100`. Pure CSS, no library needed.

### Pattern 4: Prose Simplification
**What:** Replace 20+ arbitrary `[&>selector]` overrides with clean `prose prose-lg dark:prose-invert`.
**Why safe:** `@tailwindcss/typography` was activated in Phase 12 (INFRA-01). The plugin provides sensible defaults for headings, paragraphs, lists, blockquotes, code, links, and images. The only override worth keeping is the blockquote primary accent border.
**Target:**
```typescript
<div className="prose prose-lg dark:prose-invert max-w-none">
  <MarkdownContent content={markdownContent} />
</div>
```

### Pattern 5: Horizontal Scroll Zone
**What:** Netflix-style horizontal scroll row for Software Comparisons.
**Implementation:**
```typescript
<div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
  {comparisons.map(post => (
    <BlogCard
      key={post.id}
      post={post}
      className="min-w-[280px] snap-start flex-shrink-0 md:min-w-[320px]"
    />
  ))}
</div>
```
**Key:** `scrollbar-hide` utility is already defined in globals.css (Phase 12 INFRA-02). Use `snap-x snap-mandatory` with `snap-start` on cards for mobile UX. Fixed `min-w` prevents cards from collapsing.

### Anti-Patterns to Avoid
- **Do NOT create new hooks or query keys.** All hooks exist in `use-blogs.ts`, all query keys in `blog-keys.ts`.
- **Do NOT import from `@radix-ui/react-icons`.** Use `lucide-react` only.
- **Do NOT use `useSearchParams()` for pagination.** Use nuqs `useQueryState` via the existing `BlogPagination` component.
- **Do NOT deslugify category names with string manipulation.** Use `useBlogCategories()` to resolve from DB.
- **Do NOT add `next/image` for the detail page featured image without checking `remotePatterns`.** Already configured for `*.supabase.co` and `images.unsplash.com`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blog card presentation | Custom card markup | `BlogCard` from `#components/blog/blog-card` | Consistent across hub, category, related posts |
| URL-driven pagination | Custom useState + URL sync | `BlogPagination` from `#components/blog/blog-pagination` | Uses nuqs, cleans URL on page 1 |
| Newsletter subscription | Raw input + fetch | `NewsletterSignup` from `#components/blog/newsletter-signup` | Handles mutation, toast, loading state |
| Empty state for zero posts | Custom "no posts" div | `BlogEmptyState` from `#components/shared/blog-empty-state` | Branded CSS animation, accessible |
| Loading skeleton | Custom pulse divs | `BlogLoadingSkeleton` from `#components/shared/blog-loading-skeleton` | CSS-only text-reveal animation |
| Category list with counts | Manual SQL / frontend computation | `useBlogCategories()` hook | Returns `{ name, slug, post_count }` from RPC |
| Related posts | Manual same-category filtering | `useRelatedPosts(category, slug, 3)` hook | Excludes current post, limits to 3 |
| Comparison posts | Tag filtering logic | `useComparisonPosts()` hook | `.contains('tags', ['comparison'])`, 6-card limit |
| Paginated blog list | Custom offset calculation | `useBlogs(page, limit)` hook | Handles offset math, returns PaginatedResponse |
| Markdown rendering | Custom parser | `MarkdownContent` via `next/dynamic` | Already dynamically imported with ssr: false |

**Key insight:** Phase 14 should import and compose, never reimplement. Every data-fetching and presentation concern has a pre-built solution from Phases 11-13.

## Common Pitfalls

### Pitfall 1: Category Page Redirect Race Condition
**What goes wrong:** Redirecting to `/blog` before categories have loaded, causing flash redirects on valid category pages.
**Why it happens:** Checking `!category` when `categories` is still `undefined` (loading state).
**How to avoid:** Only redirect when `categoriesLoading === false && !category`. Show loading skeleton while categories are being fetched.
**Warning signs:** Valid category pages briefly flash before redirecting.

### Pitfall 2: Category Name Mismatch Between URL and DB
**What goes wrong:** `useBlogsByCategory` receives a slug instead of the display name, returns zero results.
**Why it happens:** The `blogs.category` column stores display names like "Software Comparisons", but the URL uses slugs like "software-comparisons". The `get_blog_categories` RPC returns both `name` and `slug`.
**How to avoid:** Always resolve slug to name via `useBlogCategories()` before passing to `useBlogsByCategory(resolvedName, page)`. Never pass the raw URL slug to the blog query.
**Warning signs:** Category page always shows empty state even when posts exist in that category.

### Pitfall 3: Pagination State Shared Across Hub Zones
**What goes wrong:** Navigating pages in the Insights & Guides zone could theoretically interfere with other components reading the same `?page=N` param.
**Why it happens:** `BlogPagination` uses a global `?page=N` URL param via nuqs.
**How to avoid:** Only the Insights & Guides zone reads and writes the `page` param. The comparisons zone has a fixed 6-card limit with no pagination. This is safe because only one BlogPagination instance exists per page.
**Warning signs:** None -- this is architecturally clean as-is.

### Pitfall 4: Featured Image Layout Shift
**What goes wrong:** Large CLS (Cumulative Layout Shift) when featured image loads on the detail page.
**Why it happens:** Image dimensions not reserved before load.
**How to avoid:** Use `aspect-video` (16:9) container with `relative` positioning and `fill` prop on `next/image`. The container reserves space before the image loads.
**Warning signs:** Content visibly jumps when the image appears.

### Pitfall 5: Prose CSS Overrides Leaking or Missing
**What goes wrong:** After removing the 20+ `[&>selector]` overrides, markdown content looks different (wrong colors, spacing).
**Why it happens:** `@tailwindcss/typography` defaults may not match the current design system's colors exactly (e.g., `prose-slate` uses slate gray for text, but the app uses `muted-foreground`).
**How to avoid:** Use `prose prose-lg dark:prose-invert` as the base. If needed, add a minimal set of CSS custom properties or a few targeted overrides (blockquote border color). The key is "minimal overrides", not "zero overrides". Test visually with real blog content.
**Warning signs:** Text color mismatch, blockquote styling disappears.

### Pitfall 6: `next/image` Domain Not Configured for Blog Images
**What goes wrong:** `next/image` throws at runtime because the image hostname is not in `remotePatterns`.
**Why it happens:** Blog `featured_image` URLs might point to domains not yet allowlisted.
**How to avoid:** Check `next.config.ts` -- already configured for `*.supabase.co` and `images.unsplash.com`. If blog images come from Supabase Storage (likely), this is covered. The `BlogCard` component already uses `next/image` successfully, confirming the config works.
**Warning signs:** 500 error on images, "hostname not configured" in console.

## Code Examples

### Hub Page Composition (Skeleton)
```typescript
'use client'

import { PageLayout } from '#components/layout/page-layout'
import { BlogCard } from '#components/blog/blog-card'
import { BlogPagination } from '#components/blog/blog-pagination'
import { NewsletterSignup } from '#components/blog/newsletter-signup'
import { BlogLoadingSkeleton } from '#components/shared/blog-loading-skeleton'
import {
  useBlogs,
  useBlogCategories,
  useComparisonPosts,
} from '#hooks/api/use-blogs'
import { parseAsInteger, useQueryState } from 'nuqs'
import Link from 'next/link'

export default function BlogPage() {
  const [page] = useQueryState('page', parseAsInteger.withDefault(1))
  const { data: categories } = useBlogCategories()
  const { data: comparisons, isLoading: comparisonsLoading } = useComparisonPosts()
  const { data: blogData, isLoading: blogsLoading } = useBlogs(page)

  return (
    <PageLayout>
      {/* Hero: simple title + subtitle */}
      {/* Category pills: map categories to Link pills */}
      {/* Comparisons zone: horizontal scroll with scrollbar-hide */}
      {/* Insights zone: grid of BlogCards + BlogPagination */}
      {/* NewsletterSignup pre-footer */}
    </PageLayout>
  )
}
```

### Category Page DB Resolution Pattern
```typescript
const params = useParams()
const categorySlug = params.category as string
const router = useRouter()

const { data: categories, isLoading: categoriesLoading } = useBlogCategories()
const category = categories?.find(c => c.slug === categorySlug)

// Redirect unknown slugs after categories load
useEffect(() => {
  if (!categoriesLoading && categories && !category) {
    router.replace('/blog')
  }
}, [categoriesLoading, categories, category, router])

// Use resolved display name for blog query
const { data: blogData, isLoading: blogsLoading } = useBlogsByCategory(
  category?.name ?? '',
  page
)
```

### Featured Image Blur-Fade (CSS-only)
```typescript
const [imageLoaded, setImageLoaded] = useState(false)

{post.featured_image && (
  <div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-lg mb-8">
    <Image
      src={post.featured_image}
      alt={post.title}
      fill
      sizes="(max-width: 768px) 100vw, 896px"
      priority
      className={cn(
        'object-cover transition-all duration-700 ease-out',
        imageLoaded ? 'blur-0 opacity-100 scale-100' : 'blur-sm opacity-0 scale-105'
      )}
      onLoad={() => setImageLoaded(true)}
    />
  </div>
)}
```

### Simplified Prose Wrapper
```typescript
// BEFORE (current, 20+ overrides):
<div className="prose prose-lg prose-slate dark:prose-invert max-w-none
  [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:mt-12 ...20 more lines...">

// AFTER (simplified):
<div className="prose prose-lg dark:prose-invert max-w-none">
  <MarkdownContent content={markdownContent} />
</div>
```

## State of the Art

| Old Approach (Current Code) | New Approach (Phase 14) | Impact |
|----------------------------|-------------------------|--------|
| Hardcoded category cards with icons | DB-driven category pills via `useBlogCategories()` | Dynamic, accurate post counts |
| Raw inline newsletter `<input>` + `<Button>` | `NewsletterSignup` component (Phase 12) | Wired to Edge Function, toast feedback |
| Hardcoded `categoryConfig` map with deslugification | `useBlogCategories()` RPC resolution | Eliminates client-side slug guessing |
| 20+ `[&>selector]` prose overrides | `prose prose-lg dark:prose-invert` | Maintainable, typography plugin handles defaults |
| No featured image on detail page | `next/image` with blur-fade animation | Visual enhancement, optimized loading |
| No related posts section | `useRelatedPosts()` with 3 BlogCards | Content discovery, user engagement |
| Manual blog card markup | `BlogCard` component | Consistent presentation across all pages |
| No pagination on hub page | `BlogPagination` with nuqs `?page=N` | Scales with content growth |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAGE-01 | Hub page renders comparisons zone + insights zone with pagination | unit | `pnpm test:unit -- --run src/app/blog/page.test.tsx` | No -- Wave 0 |
| PAGE-02 | Hub page renders category pills from hook data with counts | unit | `pnpm test:unit -- --run src/app/blog/page.test.tsx` | No -- Wave 0 |
| PAGE-03 | Detail page renders featured image, blur-fade, related posts | unit | `pnpm test:unit -- --run src/app/blog/\\[slug\\]/page.test.tsx` | No -- Wave 0 |
| PAGE-04 | Category page resolves name from DB, renders paginated grid, redirects unknown | unit | `pnpm test:unit -- --run src/app/blog/category/\\[category\\]/page.test.tsx` | No -- Wave 0 |
| PAGE-05 | Category page shows BlogEmptyState when no posts for known category | unit | `pnpm test:unit -- --run src/app/blog/category/\\[category\\]/page.test.tsx` | No -- Wave 0 |
| NEWS-03 | Hub and category pages render NewsletterSignup component (not raw inline) | unit | Covered in page tests above | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/app/blog/`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/blog/page.test.tsx` -- covers PAGE-01, PAGE-02, NEWS-03 (hub)
- [ ] `src/app/blog/[slug]/page.test.tsx` -- covers PAGE-03
- [ ] `src/app/blog/category/[category]/page.test.tsx` -- covers PAGE-04, PAGE-05, NEWS-03 (category)

Note: Existing tests for `BlogCard`, `BlogPagination`, `NewsletterSignup`, `BlogEmptyState`, and `blog-keys` already have full coverage. Page-level tests focus on composition (correct hooks called, correct components rendered, loading/empty/redirect states).

### Testing Patterns for Page Components

**Mock strategy:** Pages need mocks for:
1. `nuqs` -- use `vi.hoisted()` pattern (see `blog-pagination.test.tsx`)
2. `next/navigation` -- mock `useParams()` and `useRouter()`
3. `#hooks/api/use-blogs` -- mock all hook return values
4. `next/image` -- mock to render `<img>` (see `blog-card.test.tsx`)
5. `next/dynamic` -- mock to render the component directly
6. `#components/blog/*` -- partial mocks to verify composition

**Example mock setup:**
```typescript
vi.mock('#hooks/api/use-blogs', () => ({
  useBlogs: vi.fn(),
  useBlogCategories: vi.fn(),
  useComparisonPosts: vi.fn(),
  useBlogBySlug: vi.fn(),
  useBlogsByCategory: vi.fn(),
  useRelatedPosts: vi.fn(),
}))
```

## Open Questions

1. **Blog image hosting domain**
   - What we know: `next.config.ts` has `*.supabase.co` and `images.unsplash.com` in `remotePatterns`. BlogCard already uses `next/image` with `post.featured_image` successfully.
   - What's unclear: Are all blog `featured_image` URLs from these domains, or could n8n publish posts with images from other domains?
   - Recommendation: Proceed with current config. If a new domain appears, it will be a clear `next/image` error that is trivial to fix by adding the hostname to `remotePatterns`.

2. **Prose styling delta after simplification**
   - What we know: `@tailwindcss/typography` provides sensible defaults. Current overrides are 20+ selectors.
   - What's unclear: Exact visual difference between current verbose overrides and clean `prose prose-lg dark:prose-invert`.
   - Recommendation: Start with clean prose, visually verify with real blog content, add minimal targeted overrides only if something looks wrong. The blockquote primary border accent is the most likely candidate for a single override.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of existing files: `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/app/blog/category/[category]/page.tsx`
- Direct code inspection of Phase 11/12 deliverables: `blog-keys.ts`, `use-blogs.ts`, `blog-card.tsx`, `blog-pagination.tsx`, `newsletter-signup.tsx`, `blog-empty-state.tsx`
- `globals.css` -- confirmed `@tailwindcss/typography` plugin active, `scrollbar-hide` utility defined
- `next.config.ts` -- confirmed `remotePatterns` for image domains
- `vitest.config.ts` -- confirmed test infrastructure (jsdom, unit project)
- Existing test files: `blog-keys.test.ts`, `blog-card.test.tsx`, `blog-pagination.test.tsx`, `newsletter-signup.test.tsx`, `blog-empty-state.test.tsx`

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions from `/gsd:discuss-phase` -- locked implementation choices
- STATE.md accumulated decisions -- blog cache tier, keepPreviousData, component patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions confirmed in package.json
- Architecture: HIGH -- composition of existing pre-built components, patterns verified in codebase
- Pitfalls: HIGH -- identified from direct code inspection of current pages and hook interfaces

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- all dependencies are installed and pinned)
