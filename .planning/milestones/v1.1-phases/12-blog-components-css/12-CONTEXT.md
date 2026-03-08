# Phase 12: Blog Components & CSS - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Reusable blog presentation components and CSS utilities ready for page composition in Phase 14. Deliverables: BlogCard, BlogPagination (nuqs), NewsletterSignup, EmptyState (blog-specific), `@tailwindcss/typography` activation, `scrollbar-hide` utility. No page layouts in this phase.

</domain>

<decisions>
## Implementation Decisions

### BlogCard presentation
- Top image spanning full card width, content (title, excerpt, meta) below
- Entire card is a single clickable Link target (no nested interactive elements)
- Subtle lift + shadow on hover (consistent with existing card patterns)
- Category label + reading time as inline text — NO pills, NO rounded/oval badges. Must align with existing design system conventions (the project does not use pill-style badges)
- Featured image uses `next/image` with appropriate aspect ratio

### NewsletterSignup placement & style
- Component lives in footer or last section before footer — NOT embedded inside blog page content
- Inline layout: email input + submit button side by side (single row)
- Toast-only feedback for success and error states (no inline success message replacement)
- CTA button text at Claude's discretion
- Calls the newsletter-subscribe Edge Function (built in Phase 13) — component built first, wired later

### EmptyState (blog-specific)
- Branded CSS-only animation: writing/typewriter/scribble effect
- Pattern matches ChartLoadingSkeleton (rising bars) and BlogLoadingSkeleton (text-reveal) — each domain has its own branded animation
- Shows animation + message only — no CTA button
- NOT the generic `Empty` compound component from `src/components/ui/empty.tsx`
- New component: `BlogEmptyState` in `src/components/shared/`

### Claude's Discretion
- BlogCard image aspect ratio
- BlogPagination exact styling and page parameter name
- NewsletterSignup CTA copy
- EmptyState animation specifics (typewriter cursor, scribble lines, etc.)
- `scrollbar-hide` CSS implementation approach
- BlogCard excerpt truncation (lines, length)

</decisions>

<specifics>
## Specific Ideas

- Category and reading time should be styled as subtle inline text, not decorative elements — consistency with the rest of the UI is paramount
- The writing/typewriter animation for EmptyState should feel branded and domain-appropriate, like how ChartLoadingSkeleton feels chart-related
- nuqs already used in the project for data table URL state (`src/lib/parsers.ts`, `src/hooks/use-data-table.ts`) — BlogPagination should follow similar patterns

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/empty.tsx`: Empty compound component (NOT used for blog — blog gets its own branded version)
- `src/components/shared/chart-loading-skeleton.tsx`: Reference for CSS-only branded animation pattern
- `src/components/shared/blog-loading-skeleton.tsx`: Reference for CSS-only text-reveal animation
- `src/lib/parsers.ts`: nuqs parser patterns for URL state
- `src/hooks/use-data-table.ts`: nuqs `useQueryState` usage reference
- `src/hooks/api/use-blogs.ts`: Blog hooks with `keepPreviousData` (from Phase 11)
- `src/hooks/api/query-keys/blog-keys.ts`: Blog query factories (from Phase 11)

### Established Patterns
- nuqs for URL state management (data tables already use it)
- CSS-only loading animations (no JS animation libraries)
- Toast feedback via existing toast system
- `next/image` for optimized images
- No pills/rounded badges in the design system — inline text for metadata

### Integration Points
- BlogCard consumed by Phase 14 pages (hub, category, related posts)
- BlogPagination consumed by Phase 14 hub and category pages
- NewsletterSignup placed in footer/pre-footer by Phase 14
- EmptyState used on category pages with zero posts (Phase 14)
- `@tailwindcss/typography` enables `prose` class for blog detail content (Phase 14)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-blog-components-css*
*Context gathered: 2026-03-07*
