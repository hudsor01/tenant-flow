# Phase 12: Blog Components & CSS - Research

**Researched:** 2026-03-07
**Domain:** React component development, CSS utilities, URL state management, Tailwind typography
**Confidence:** HIGH

## Summary

Phase 12 delivers reusable presentation components (BlogCard, BlogPagination, NewsletterSignup, BlogEmptyState) and CSS infrastructure (@tailwindcss/typography activation, scrollbar-hide utility) that Phase 14 will compose into pages. All data layer dependencies (blog-keys.ts, use-blogs.ts, PaginatedResponse type) are complete from Phase 11.

The technical risk is low. Every technology involved (nuqs, next/image, Sonner toast, CSS animations, Tailwind typography plugin) is already in active use or already installed in this project. The primary challenge is consistency -- components must match established patterns for CSS-only animations, card styling, toast feedback, and nuqs URL state.

**Primary recommendation:** Build each component as an independent deliverable following the existing patterns exactly: nuqs `parseAsInteger` for pagination (matching use-lightbox-state.ts pattern), `toast` from `sonner` for newsletter feedback (matching mutation-error-handler.ts pattern), CSS-only keyframe animation for BlogEmptyState (matching chart-loading-skeleton.tsx and blog-loading-skeleton.tsx patterns), and `@plugin "@tailwindcss/typography"` in globals.css for prose support.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- BlogCard: Top image spanning full card width, content (title, excerpt, meta) below
- BlogCard: Entire card is a single clickable Link target (no nested interactive elements)
- BlogCard: Subtle lift + shadow on hover (consistent with existing card patterns)
- BlogCard: Category label + reading time as inline text -- NO pills, NO rounded/oval badges
- BlogCard: Featured image uses `next/image` with appropriate aspect ratio
- NewsletterSignup: Lives in footer or last section before footer -- NOT embedded inside blog page content
- NewsletterSignup: Inline layout: email input + submit button side by side (single row)
- NewsletterSignup: Toast-only feedback for success and error states (no inline success message replacement)
- NewsletterSignup: Calls the newsletter-subscribe Edge Function (built in Phase 13) -- component built first, wired later
- EmptyState: Branded CSS-only animation: writing/typewriter/scribble effect
- EmptyState: Pattern matches ChartLoadingSkeleton (rising bars) and BlogLoadingSkeleton (text-reveal) -- each domain has its own branded animation
- EmptyState: Shows animation + message only -- no CTA button
- EmptyState: NOT the generic `Empty` compound component from `src/components/ui/empty.tsx`
- EmptyState: New component: `BlogEmptyState` in `src/components/shared/`

### Claude's Discretion
- BlogCard image aspect ratio
- BlogPagination exact styling and page parameter name
- NewsletterSignup CTA copy
- EmptyState animation specifics (typewriter cursor, scribble lines, etc.)
- `scrollbar-hide` CSS implementation approach
- BlogCard excerpt truncation (lines, length)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | Reusable `BlogCard` component with featured image, category label, reading time | Card component patterns, next/image usage, BlogListItem type from blog-keys.ts, Link from next/link |
| COMP-02 | `BlogPagination` component with nuqs URL state | nuqs parseAsInteger pattern, PaginatedResponse type, useQueryState usage in existing codebase |
| COMP-03 | `NewsletterSignup` component with mutation, toast feedback, success state | Sonner toast import pattern, supabase.functions.invoke pattern, TanStack useMutation pattern |
| INFRA-01 | Activate `@tailwindcss/typography` plugin in `globals.css` | TailwindCSS v4 @plugin directive, prose class system |
| INFRA-02 | Add `scrollbar-hide` CSS utility for horizontal scroll zones | CSS utility class pattern in globals.css |
| INFRA-03 | Create `EmptyState` shared component | CSS-only animation pattern from existing skeletons |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuqs | 2.8.8 | URL state for pagination `?page=N` | Already used in data tables and lightbox, project standard for URL state |
| next/image | 16.1.6 (Next.js) | Optimized blog card images | Project standard, remote patterns already configured |
| next/link | 16.1.6 (Next.js) | BlogCard click target | Project standard for client-side navigation |
| sonner | 2.0.7 | Toast notifications for newsletter | Project standard, `toast` imported directly from `sonner` |
| @tailwindcss/typography | 0.5.19 | `prose` class for blog content | Already in devDependencies, just needs `@plugin` activation |
| @tanstack/react-query | 5.90.21 | Newsletter mutation | Project standard for mutations |
| lucide-react | 0.575.0 | Icons (ChevronLeft, ChevronRight, Mail, etc.) | Sole icon library per CLAUDE.md |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | BlogCard variant styling if needed | Only if card needs variant support |
| tailwind-merge | 3.5.0 | `cn()` utility for conditional classes | Every component with className prop |
| date-fns | 4.1.0 | Date formatting for published_at | BlogCard date display |

### No New Dependencies Required
All libraries are already installed. No `pnpm install` needed for this phase.

## Architecture Patterns

### Recommended File Structure
```
src/
  components/
    blog/
      blog-card.tsx              # COMP-01: Reusable blog card
      blog-card.test.tsx         # Unit tests for BlogCard
      blog-pagination.tsx        # COMP-02: Pagination with nuqs
      blog-pagination.test.tsx   # Unit tests for BlogPagination
      newsletter-signup.tsx      # COMP-03: Newsletter form
      newsletter-signup.test.tsx # Unit tests for NewsletterSignup
    shared/
      blog-empty-state.tsx       # INFRA-03: Branded empty state
      blog-empty-state.test.tsx  # Unit tests for BlogEmptyState
  app/
    globals.css                  # INFRA-01 + INFRA-02: Plugin + utility
```

### Pattern 1: BlogCard as Link-Wrapped Card
**What:** Full card is a single `<Link>` element wrapping the card content. No nested interactive elements.
**When to use:** BlogCard used across hub, category, and related posts sections.
**Example:**
```typescript
// Source: Existing project patterns (property-select-card.tsx, card.tsx)
import Link from 'next/link'
import Image from 'next/image'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

interface BlogCardProps {
  post: BlogListItem
  className?: string
}

export function BlogCard({ post, className }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border bg-card',
        'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
        className
      )}
    >
      {/* Featured image - aspect-[16/10] for blog cards */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {post.featured_image ? (
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category + reading time as inline text */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{post.category}</span>
          <span aria-hidden="true">-</span>
          <span>{post.reading_time} min read</span>
        </div>
        <h3 className="mt-2 font-semibold line-clamp-2">{post.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
          {post.excerpt}
        </p>
      </div>
    </Link>
  )
}
```

### Pattern 2: BlogPagination with nuqs
**What:** Pagination component using `parseAsInteger` from nuqs to manage `?page=N` in URL.
**When to use:** Blog hub and category pages with paginated results.
**Example:**
```typescript
// Source: Existing nuqs patterns (use-lightbox-state.ts, use-data-table.ts)
'use client'

import { parseAsInteger, useQueryState } from 'nuqs'

interface BlogPaginationProps {
  totalPages: number
  className?: string
}

export function BlogPagination({ totalPages, className }: BlogPaginationProps) {
  const [page, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1)
  )

  // Constrain page to valid range
  const currentPage = Math.max(1, Math.min(page, totalPages))

  return (
    <nav aria-label="Blog pagination" className={className}>
      <button
        onClick={() => setPage(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button
        onClick={() => setPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
```

### Pattern 3: NewsletterSignup Mutation Stub
**What:** Form component with email input + submit button. Calls Edge Function via `supabase.functions.invoke`. Built now, wired to real function in Phase 13.
**When to use:** Footer or pre-footer section.
**Example:**
```typescript
// Source: Existing mutation patterns (use-payment-methods.ts, mutation-error-handler.ts)
'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'

export function NewsletterSignup() {
  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke(
        'newsletter-subscribe',
        { body: { email } }
      )
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Subscribed! Check your inbox.')
    },
    onError: () => {
      toast.error('Could not subscribe. Please try again.')
    }
  })
  // ... form JSX
}
```

### Pattern 4: CSS-Only Branded Animation (BlogEmptyState)
**What:** Typewriter/writing CSS-only animation matching the pattern of ChartLoadingSkeleton (chart-rise) and BlogLoadingSkeleton (text-reveal).
**When to use:** Category pages with zero posts.
**Example:**
```typescript
// Source: Existing patterns (chart-loading-skeleton.tsx, blog-loading-skeleton.tsx)
export function BlogEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-lg
                 border border-dashed border-border bg-muted/20 p-12"
      role="status"
      aria-label="No posts found"
    >
      {/* Typewriter animation elements */}
      <div className="flex flex-col gap-2 w-48">
        <div
          className="h-2 rounded bg-primary/20 animate-[typewriter_2s_steps(20)_infinite]"
          style={{ width: '100%', animationDelay: '0ms' }}
        />
        {/* ... more lines */}
      </div>
      <style>{`
        @keyframes typewriter {
          0% { width: 0; opacity: 0.3; }
          50% { width: 100%; opacity: 0.7; }
          100% { width: 0; opacity: 0.3; }
        }
      `}</style>
      <p className="text-sm text-muted-foreground">No posts found</p>
      <span className="sr-only">No posts available in this category</span>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Nested interactive elements inside BlogCard:** The entire card is a Link. Do not nest buttons, links, or other clickable elements inside. This breaks accessibility and causes hydration warnings.
- **Using `data.length` for pagination:** Always use `count` from the Supabase response or `pagination.totalPages` from `PaginatedResponse`.
- **Using `parseAsIndex` for page number:** The project uses 1-based page numbers in the URL (`?page=1`). Use `parseAsInteger.withDefault(1)`, not `parseAsIndex` (which adds +1 offset).
- **Inline success states in NewsletterSignup:** User decision is toast-only. Do not replace the form with a success message.
- **Pills or badges for category/reading time:** User explicitly stated NO pills, NO rounded/oval badges. Use plain inline text with `text-muted-foreground`.
- **Using the generic `Empty` compound component:** BlogEmptyState is a separate branded component in `src/components/shared/`, not the `Empty` from `src/components/ui/empty.tsx`.
- **Module-level Supabase client:** Always create inside the mutation function: `const supabase = createClient()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state sync | Custom useState + router.push | `useQueryState` from nuqs | Handles serialization, history, defaults, SSR hydration |
| Image optimization | Manual srcset, lazy loading | `next/image` with fill + sizes | Automatic format selection, responsive sizing, lazy loading |
| Toast notifications | Custom notification system | `toast` from sonner (direct import) | Project standard, theme-aware, accessible |
| Typography reset | Custom CSS for article content | `@tailwindcss/typography` prose class | Handles headings, lists, code blocks, blockquotes, tables |
| Scrollbar hiding | Vendor-prefixed inline styles | CSS utility class in globals.css | Cross-browser, reusable, no inline styles (CLAUDE.md rule) |

**Key insight:** This phase is entirely about composition. Every building block (data hooks, types, libraries, patterns) already exists. The risk is in deviating from established patterns, not in missing capabilities.

## Common Pitfalls

### Pitfall 1: next/image Without Fallback
**What goes wrong:** BlogCard crashes when `featured_image` is null (nullable column in blogs table).
**Why it happens:** `next/image` requires a `src` prop. Null or empty string throws a runtime error.
**How to avoid:** Always guard with a conditional: render `<Image>` only when `post.featured_image` is truthy. Render a `<div className="bg-muted">` placeholder otherwise.
**Warning signs:** Runtime error "Image is missing required 'src' property" in dev console.

### Pitfall 2: BlogPagination Not Resetting on Category Change
**What goes wrong:** User navigates from page 3 of category A to category B, lands on page 3 of category B (which may not have 3 pages).
**Why it happens:** nuqs persists `?page=3` in URL across navigations.
**How to avoid:** Page consumers (Phase 14) must reset page to 1 when category changes. BlogPagination itself should clamp `page` to valid range (1..totalPages).
**Warning signs:** Empty results on category pages, page number exceeding totalPages.

### Pitfall 3: Typography Plugin Not Activating in TailwindCSS v4
**What goes wrong:** `prose` class has no effect on rendered content.
**Why it happens:** TailwindCSS v4 requires `@plugin "@tailwindcss/typography"` directive in CSS, not a `plugins` array in config. The package is installed (devDependencies) but the directive is missing from globals.css.
**How to avoid:** Add `@plugin "@tailwindcss/typography";` after the `@import 'tailwindcss';` line in globals.css.
**Warning signs:** Blog detail page shows unstyled HTML content.

### Pitfall 4: Newsletter Form State After Submission
**What goes wrong:** Form remains in pending state or allows rapid resubmission.
**Why it happens:** No disabled state during mutation, no form reset after success.
**How to avoid:** Disable submit button when `mutation.isPending`, clear email input on success.
**Warning signs:** Multiple duplicate subscription requests, button staying in loading state.

### Pitfall 5: BlogCard Hover Conflicting With Card Variants
**What goes wrong:** Using the Card component's `interactive` variant AND adding custom hover styles causes doubled transitions.
**Why it happens:** The existing `Card` variant `interactive` already adds `hover:shadow-md transition-shadow cursor-pointer`.
**How to avoid:** Either use the Card variant system OR build a custom card with `<Link>` + Tailwind classes. Since BlogCard wraps in `<Link>` (not `<div>`), use custom styling rather than the Card variant.
**Warning signs:** Double shadow transitions, janky hover effects.

### Pitfall 6: Scrollbar-hide Breaking Accessibility
**What goes wrong:** Hiding scrollbar removes the ability for mouse users to scroll horizontally.
**Why it happens:** `-webkit-scrollbar { display: none }` plus `-ms-overflow-style: none; scrollbar-width: none` hides all scrollbar UI.
**How to avoid:** Only apply `scrollbar-hide` to elements that have alternative scroll mechanisms (touch swipe, scroll buttons, scroll-snap). Verify scroll is still possible via trackpad/touch.
**Warning signs:** Desktop users unable to scroll horizontal content.

## Code Examples

### INFRA-01: Typography Plugin Activation
```css
/* Source: TailwindCSS v4 @plugin directive documentation */
/* Add after @import 'tailwindcss'; in globals.css */

@import 'tailwindcss';
@import 'tw-animate-css';
@plugin "@tailwindcss/typography";
```

Usage in components (Phase 14):
```html
<article class="prose prose-lg dark:prose-invert max-w-none">
  <!-- rendered markdown content -->
</article>
```

### INFRA-02: Scrollbar-hide CSS Utility
```css
/* Source: Common cross-browser scrollbar hiding pattern */
/* Add to globals.css @utility section or as a layer */

@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

Usage:
```html
<div class="overflow-x-auto scrollbar-hide">
  <!-- horizontal scroll content -->
</div>
```

### BlogCard Image Sizing
```typescript
// Source: next/image documentation, existing project patterns
<Image
  src={post.featured_image}
  alt={post.title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover transition-transform duration-300 group-hover:scale-105"
/>
```
Note: `fill` requires the parent to have `position: relative` and explicit dimensions (provided by `aspect-[16/10]`). The `sizes` prop should match the grid layout (3 columns on desktop, 2 on tablet, 1 on mobile).

### Toast Pattern for Newsletter
```typescript
// Source: Existing pattern from mutation-error-handler.ts
import { toast } from 'sonner'

// Success
toast.success('Subscribed! Check your inbox.')

// Error
toast.error('Could not subscribe. Please try again.')
```
Note: Import `toast` directly from `sonner` (not from toast store). This is the dominant pattern in the codebase (50+ usages).

### Edge Function Invoke Pattern (for Newsletter)
```typescript
// Source: Existing pattern from use-payment-methods.ts
const supabase = createClient()
const { data, error } = await supabase.functions.invoke(
  'newsletter-subscribe',
  { body: { email } }
)
if (error) throw new Error(error.message ?? 'Failed to subscribe')
```
Note: The Edge Function does not exist yet (Phase 13). The mutation should still be built with the correct invoke call -- it will fail gracefully until the function is deployed.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` plugins array | `@plugin` directive in CSS | TailwindCSS v4.0 (Jan 2025) | No config file needed for plugins |
| `@tailwindcss/typography` v0.5 with config | Same v0.5 but loaded via `@plugin` | TailwindCSS v4.0 | Activation method changed, API identical |
| Custom scrollbar-hide classes | `@utility` directive in TailwindCSS v4 | TailwindCSS v4.0 | First-class custom utility support |
| nuqs v1.x `useQueryState` | nuqs 2.8 `useQueryState` (same API) | nuqs 2.0 | Framework-agnostic, stable API |

**Current in this project:**
- TailwindCSS 4.2.1
- nuqs 2.8.8
- @tailwindcss/typography 0.5.19 (installed, not activated)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 with jsdom |
| Config file | `vitest.config.ts` (unit project) |
| Quick run command | `pnpm test:unit -- --run src/components/blog/` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | BlogCard renders image, category, reading time, title, excerpt | unit | `pnpm test:unit -- --run src/components/blog/blog-card.test.tsx` | Wave 0 |
| COMP-01 | BlogCard links to `/blog/{slug}` | unit | same file | Wave 0 |
| COMP-01 | BlogCard handles null featured_image | unit | same file | Wave 0 |
| COMP-02 | BlogPagination renders page N of M | unit | `pnpm test:unit -- --run src/components/blog/blog-pagination.test.tsx` | Wave 0 |
| COMP-02 | BlogPagination disables prev on page 1, next on last page | unit | same file | Wave 0 |
| COMP-03 | NewsletterSignup renders email input and submit button | unit | `pnpm test:unit -- --run src/components/blog/newsletter-signup.test.tsx` | Wave 0 |
| COMP-03 | NewsletterSignup shows toast on submit | unit | same file | Wave 0 |
| INFRA-01 | prose class activates typography styles | manual-only | Visual verification in dev server | N/A |
| INFRA-02 | scrollbar-hide utility hides scrollbar | manual-only | Visual verification | N/A |
| INFRA-03 | BlogEmptyState renders animation + message | unit | `pnpm test:unit -- --run src/components/shared/blog-empty-state.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/components/blog/ src/components/shared/blog-empty-state.test.tsx`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/blog/blog-card.test.tsx` -- covers COMP-01
- [ ] `src/components/blog/blog-pagination.test.tsx` -- covers COMP-02
- [ ] `src/components/blog/newsletter-signup.test.tsx` -- covers COMP-03
- [ ] `src/components/shared/blog-empty-state.test.tsx` -- covers INFRA-03

Note: INFRA-01 (typography plugin) and INFRA-02 (scrollbar-hide) are CSS infrastructure changes verified visually, not via unit tests.

## Open Questions

1. **BlogCard image aspect ratio**
   - What we know: Property cards use `aspect-video` (16:9). Blog card images typically range from 16:9 to 16:10 to 3:2.
   - What's unclear: User left this at Claude's discretion.
   - Recommendation: Use `aspect-[16/10]` -- slightly wider than typical blog thumbnails, provides a good content-to-image ratio and prevents tall cards.

2. **BlogPagination URL parameter name**
   - What we know: Data tables use `page`, lightbox uses `lightbox`/`image`. User left parameter name at Claude's discretion.
   - What's unclear: Whether to use `page` (matches data tables) or something blog-specific.
   - Recommendation: Use `page` -- it is the universal convention and matches existing data table usage. Simple, no namespace collision (blog and data tables are on different routes).

3. **Newsletter Edge Function error handling before Phase 13**
   - What we know: The `newsletter-subscribe` Edge Function does not exist yet (Phase 13 deliverable). Component is built first.
   - What's unclear: How the mutation behaves when function does not exist.
   - Recommendation: The mutation will throw (supabase returns 404 for missing functions). The `onError` handler shows a toast. This is correct behavior -- the component is fully functional, just not connected yet. No stub needed.

4. **scrollbar-hide implementation: @utility vs @layer**
   - What we know: TailwindCSS v4 has `@utility` directive for custom utilities. Existing globals.css does not use it yet.
   - What's unclear: Whether `@utility` is the right approach or if a plain class in `@layer utilities` is preferred.
   - Recommendation: Use `@utility scrollbar-hide { ... }` -- it is the TailwindCSS v4 canonical way to define custom utilities and ensures proper detection by the Tailwind compiler.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/components/shared/chart-loading-skeleton.tsx` -- CSS-only animation pattern
- Project codebase: `src/components/shared/blog-loading-skeleton.tsx` -- CSS-only animation pattern
- Project codebase: `src/hooks/use-lightbox-state.ts` -- nuqs `parseAsInteger` + `useQueryState` pattern
- Project codebase: `src/hooks/use-data-table.ts` -- nuqs pagination pattern with `parseAsInteger.withDefault(1)`
- Project codebase: `src/lib/mutation-error-handler.ts` -- `toast` from `sonner` pattern
- Project codebase: `src/hooks/api/use-payment-methods.ts` -- `supabase.functions.invoke` pattern
- Project codebase: `src/hooks/api/query-keys/blog-keys.ts` -- BlogListItem type, PaginatedResponse
- Project codebase: `src/hooks/api/use-blogs.ts` -- Blog hooks consuming blog-keys factory
- Project codebase: `src/components/ui/card.tsx` -- Card variant patterns
- Project codebase: `src/app/globals.css` -- Current CSS structure (no @plugin yet)
- Project codebase: `package.json` -- @tailwindcss/typography 0.5.19 already in devDependencies

### Secondary (MEDIUM confidence)
- [TailwindCSS Typography Plugin](https://github.com/tailwindlabs/tailwindcss-typography) -- v4 `@plugin` directive setup
- [nuqs Built-in Parsers](https://nuqs.dev/docs/parsers/built-in) -- `parseAsInteger` API

### Tertiary (LOW confidence)
None -- all findings verified against project codebase or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- patterns derived from existing codebase, not speculative
- Pitfalls: HIGH -- identified from real codebase patterns and known gotchas
- CSS infrastructure: HIGH -- TailwindCSS v4 @plugin directive verified via official docs

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- all dependencies are mature and pinned)
