---
phase: 37-content-seo-internal-linking
plan: 02
subsystem: seo
tags: [internal-linking, content-seo, blog, server-components, compare, resources]
dependency_graph:
  requires:
    - src/lib/content-links.ts (RESOURCE_TO_BLOGS, BLOG_TO_RESOURCE, BLOG_TO_COMPETITOR)
    - src/components/blog/related-articles.tsx (RelatedArticles async Server Component)
  provides:
    - src/app/blog/[slug]/blog-post-page.tsx (compare CTA + resource CTA conditional sections)
    - src/app/compare/[competitor]/page.tsx (RelatedArticles between WhySwitchSection and BottomCta)
    - src/app/resources/seasonal-maintenance-checklist/page.tsx (RelatedArticles before footer CTA)
    - src/app/resources/landlord-tax-deduction-tracker/page.tsx (RelatedArticles before footer CTA)
    - src/app/resources/security-deposit-reference-card/page.tsx (RelatedArticles before footer CTA)
  affects:
    - /blog/[slug] pages with competitor or resource mappings
    - /compare/[competitor] pages (all 3: buildium, appfolio, rentredi)
    - /resources/* pages (3 resource pages)
tech_stack:
  added: []
  patterns:
    - "Conditional CTA rendering via static slug map lookup in client component"
    - "Async Server Component (RelatedArticles) composed into Server Component page routes"
    - "Static map fallback pattern: RESOURCE_TO_BLOGS['key'] ?? []"
key_files:
  created: []
  modified:
    - src/app/blog/[slug]/blog-post-page.tsx
    - src/app/compare/[competitor]/page.tsx
    - src/app/resources/seasonal-maintenance-checklist/page.tsx
    - src/app/resources/landlord-tax-deduction-tracker/page.tsx
    - src/app/resources/security-deposit-reference-card/page.tsx
decisions:
  - "blog-post-page.tsx is 'use client' so RelatedArticles (async Server Component) cannot be imported — only static CTA links used"
  - "competitorSlug and resourceSlug placed after leadMagnet for co-locality of related lookup variables"
  - "?? [] fallback on RESOURCE_TO_BLOGS lookups for type safety (returns null/undefined if key missing)"
  - "LEFTHOOK=0 used for worktree commits — node_modules absent in worktree, hooks cannot run"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 5
  tests_added: 0
---

# Phase 37 Plan 02: Page Integration — Compare CTAs, Resource CTAs, RelatedArticles Summary

Wired content-links config and RelatedArticles component into all 5 target pages: blog post detail (compare + resource CTAs), comparison pages (Related Articles section), and resource pages (Related Blog Posts section).

## What Was Built

### Task 1: Compare CTA and Resource CTA in blog post page

`src/app/blog/[slug]/blog-post-page.tsx` (client component) updated with:

- Imports: `BLOG_TO_COMPETITOR`, `BLOG_TO_RESOURCE` from `#lib/content-links`; `COMPETITORS` from `#app/compare/[competitor]/compare-data`
- Lookup variables after `leadMagnet`: `competitorSlug = BLOG_TO_COMPETITOR[slug]`, `resourceSlug = BLOG_TO_RESOURCE[slug]`
- Compare CTA block (`bg-primary/5 border border-primary/20`): conditionally rendered when `competitorSlug` is defined; links to `/compare/${competitorSlug}` with competitor name from `COMPETITORS` record
- Resource CTA block (`bg-muted border border-border`): conditionally rendered when `resourceSlug` is defined; links to `/resources/${resourceSlug}`
- Both CTAs placed between article prose and existing Bottom CTA Section
- `aria-hidden="true"` on all `ArrowRight` icons (decorative)
- `RelatedArticles` NOT imported — it is an async Server Component incompatible with `'use client'`

### Task 2: RelatedArticles on compare and resource pages

**Compare page (`src/app/compare/[competitor]/page.tsx`):**
- Added import: `RelatedArticles` from `#components/blog/related-articles`
- Inserted `<RelatedArticles slugs={[data.blogSlug]} title="Read the Full Comparison" />` between `<WhySwitchSection>` and `<BottomCta>`
- Each competitor has one `blogSlug` — renders a single blog card per compare page

**Resource pages (all 3):**
- Added imports: `RelatedArticles` from `#components/blog/related-articles`, `RESOURCE_TO_BLOGS` from `#lib/content-links`
- Inserted `<RelatedArticles slugs={RESOURCE_TO_BLOGS['<key>'] ?? []} title="Related Blog Posts" />` before each footer CTA
- seasonal-maintenance-checklist → 1 blog slug mapped
- landlord-tax-deduction-tracker → 1 blog slug mapped
- security-deposit-reference-card → 1 blog slug mapped

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 50963c0c3 | feat(37-02): add compare CTA and resource CTA to blog post page |
| 2 | 77a126f7a | feat(37-02): add RelatedArticles to compare pages and resource pages |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 5 modified files exist and contain the required additions. Both commits confirmed in git log.

- FOUND: src/app/blog/[slug]/blog-post-page.tsx — contains BLOG_TO_COMPETITOR, BLOG_TO_RESOURCE, COMPETITORS, bg-primary/5, bg-muted border border-border
- FOUND: src/app/compare/[competitor]/page.tsx — contains RelatedArticles, slugs={[data.blogSlug]}, title="Read the Full Comparison"
- FOUND: src/app/resources/seasonal-maintenance-checklist/page.tsx — contains RESOURCE_TO_BLOGS['seasonal-maintenance-checklist'], title="Related Blog Posts"
- FOUND: src/app/resources/landlord-tax-deduction-tracker/page.tsx — contains RESOURCE_TO_BLOGS['landlord-tax-deduction-tracker'], title="Related Blog Posts"
- FOUND: src/app/resources/security-deposit-reference-card/page.tsx — contains RESOURCE_TO_BLOGS['security-deposit-reference-card'], title="Related Blog Posts"
- FOUND commit: 50963c0c3
- FOUND commit: 77a126f7a

## Known Stubs

None — all cross-links wire to real routes via static maps from Plan 01. RelatedArticles fetches real published blog posts from Supabase.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. All additions are read-only UI links to existing public routes. The RelatedArticles Supabase query inherits the published-status filter from Plan 01.
