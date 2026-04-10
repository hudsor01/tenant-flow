---
phase: 37-content-seo-internal-linking
reviewed: 2026-04-10T18:42:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/lib/content-links.ts
  - src/lib/content-links.test.ts
  - src/components/blog/related-articles.tsx
  - src/components/blog/related-articles.test.tsx
  - src/app/blog/[slug]/blog-post-page.tsx
  - src/app/compare/[competitor]/page.tsx
  - src/app/resources/seasonal-maintenance-checklist/page.tsx
  - src/app/resources/landlord-tax-deduction-tracker/page.tsx
  - src/app/resources/security-deposit-reference-card/page.tsx
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 37: Code Review Report

**Reviewed:** 2026-04-10T18:42:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 37 introduces internal cross-linking infrastructure between blog posts, resource pages, and competitor comparison pages. The implementation is clean overall: a static bidirectional mapping config (`content-links.ts`), an async server component for rendering related articles (`RelatedArticles`), and integration of cross-links into blog post detail, compare, and resource pages.

One critical XSS-class issue exists in the blog post JSON-LD structured data. Several warnings cover missing error handling, a missing query limit, and a type assertion that should use a mapper function per project conventions. Two info-level items flag minor code quality concerns.

## Critical Issues

### CR-01: JSON-LD Missing Script-Close Escape in Blog Post Page

**File:** `src/app/blog/[slug]/blog-post-page.tsx:161-183`
**Issue:** The JSON-LD script block uses `JSON.stringify()` on user-controlled database fields (`post.title`, `post.meta_description`, `post.excerpt`, `post.category`) without escaping `<` characters. If any of these fields contain a closing script tag sequence, the browser will close the script element early, enabling XSS injection. The compare page at `src/app/compare/[competitor]/page.tsx:100-101` already applies the correct mitigation (`.replace(/</g, '\\u003c')`), but the blog post page does not.

**Fix:** Add `.replace(/</g, '\\u003c')` after `JSON.stringify(...)` on line 182, matching the pattern already used in `compare/[competitor]/page.tsx:100-101`.

## Warnings

### WR-01: RelatedArticles Query Missing `.limit()` Clause

**File:** `src/components/blog/related-articles.tsx:31-38`
**Issue:** The Supabase query uses `.in('slug', slugs)` without a `.limit()`. Project convention (CLAUDE.md) states: "All list queries MUST have `.limit()` or pagination `.range()` -- no unbounded `select('*')` on growing tables." While the `slugs` array is currently small (1-3 items from static config), the component accepts arbitrary `string[]` and could be called with larger arrays in the future.

**Fix:** Add `.limit(slugs.length)` after the `.order()` call on line 38.

### WR-02: RelatedArticles Silently Discards Supabase Errors

**File:** `src/components/blog/related-articles.tsx:31-40`
**Issue:** The destructured `{ data }` discards the `error` field from the Supabase response. If the query fails (network error, RLS issue, table schema mismatch), the component silently renders nothing. This makes debugging difficult in production.

**Fix:** Destructure `error` alongside `data` and log it:
```tsx
const { data, error } = await supabase
    .from('blogs')
    .select(...)

if (error) {
    console.error('RelatedArticles query failed:', error.message)
}
```

### WR-03: Type Assertion Instead of Mapper Function

**File:** `src/components/blog/related-articles.tsx:40`
**Issue:** `const posts = (data ?? []) as BlogListItem[]` uses a type assertion to cast the Supabase response. Project convention (CLAUDE.md, "RPC Return Typing") requires typed mapper functions at PostgREST boundaries instead of `as` casts. The assertion is structurally safe because the selected columns align with the `Pick<>` type, but it bypasses compile-time verification if `BlogListItem` changes.

**Fix:** Either add a mapper function for consistency, or document this as one of the acceptable PostgREST string-to-type assertions (the 24 documented exceptions in CLAUDE.md).

### WR-04: `params.slug as string` Unsafe Type Assertion

**File:** `src/app/blog/[slug]/blog-post-page.tsx:85`
**Issue:** `const slug = params.slug as string` asserts the `useParams()` value is a string without validation. `useParams()` returns `Record<string, string | string[]>`, so `slug` could theoretically be `string[]`. While this specific route (`[slug]`) should always produce a string, the assertion bypasses runtime safety.

**Fix:**
```tsx
const rawSlug = params.slug
const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug ?? ''
```

## Info

### IN-01: Hardcoded Color Classes in Resource Pages (Dark Mode)

**File:** `src/app/resources/seasonal-maintenance-checklist/page.tsx:19-20`, `src/app/resources/landlord-tax-deduction-tracker/page.tsx:59`, `src/app/resources/security-deposit-reference-card/page.tsx:213`
**Issue:** Resource pages use hardcoded light-mode color classes like `bg-amber-50`, `text-amber-900`, `bg-green-50`, etc. for seasonal/category sections and disclaimer boxes. These do not adapt to dark mode. The project uses `bg-background`, `text-foreground`, `bg-muted` conventions for dark-mode safety per CLAUDE.md accessibility rules.

**Fix:** These are printable reference pages where light backgrounds are intentional for print output. Consider wrapping with `dark:` variants for screen display or accept as a deliberate design decision for print-first pages.

### IN-02: Test Hardcodes Expected Count of BLOG_TO_COMPETITOR Entries

**File:** `src/lib/content-links.test.ts:74`
**Issue:** `expect(Object.keys(BLOG_TO_COMPETITOR)).toHaveLength(3)` will break whenever a new competitor is added to `compare-data.ts`. Similarly, line 14 hardcodes `RESOURCE_TO_BLOGS` length. Consider deriving expected counts from the source data to make tests resilient to growth.

**Fix:**
```typescript
it('has an entry for every competitor with a blogSlug', () => {
    const competitorsWithBlog = Object.values(COMPETITORS).filter(c => Boolean(c.blogSlug))
    expect(Object.keys(BLOG_TO_COMPETITOR)).toHaveLength(competitorsWithBlog.length)
})
```

---

_Reviewed: 2026-04-10T18:42:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
