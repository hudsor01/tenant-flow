---
phase: 38-validation-verification
plan: 01
subsystem: seo/sitemap
tags: [sitemap, seo, crawl, google-indexing]
dependency_graph:
  requires: []
  provides: [complete-sitemap-all-public-pages]
  affects: [google-sitemap-xml, crawl-coverage]
tech_stack:
  added: []
  patterns: [promise-all-parallel-db-queries, isr-revalidate-86400]
key_files:
  created:
    - src/app/sitemap.test.ts
  modified:
    - src/app/sitemap.ts
decisions:
  - Promise.all + Promise.race pattern reused from existing sitemap timeout design to parallelize blog post + category queries without increasing timeout exposure
  - Static dates (2026-01-01 for legal, 2026-04-01 for company/compare/resource/auth) signal content change frequency to Google without misleading daily crawls
  - VALID-01 requires no code change — GSC DNS TXT record already active
metrics:
  duration_minutes: 12
  completed_date: "2026-04-10"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
---

# Phase 38 Plan 01: Sitemap Overhaul Summary

**One-liner:** Sitemap overhauled to include /support, /security-policy, and dynamically discovered blog category pages, with static lastModified dates for stable content.

## Requirements Satisfied

- **VALID-01:** GSC ownership verification is active via DNS TXT record. No meta tag or code change needed. Confirmed no-op.
- **CRAWL-05:** /support, /security-policy, and dynamically discovered blog category pages added to sitemap.
- **CRAWL-06:** Blog posts already used `post.published_at` for `lastModified`. Confirmed correct, no change needed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Sitemap overhaul — add missing pages, blog categories, static dates | 6bc8d8fe9 | src/app/sitemap.ts, src/app/sitemap.test.ts |

## Changes Made

### src/app/sitemap.ts

1. Added `/support` to `companyPages` array with `lastModified: '2026-04-01'`
2. Added `/security-policy` to `legalPages` array with `lastModified: '2026-01-01'`
3. Added parallel `categoryQuery` using `Promise.all([query, categoryQuery])` inside the existing `Promise.race` timeout guard — two independent DB queries run concurrently without increasing timeout risk
4. Deduplicated categories via `[...new Set(categoryRows.map(r => r.category).filter(Boolean))]`
5. Mapped deduplicated categories to `blogCategoryPages` entries at `/blog/category/{slug}` with `changeFrequency: 'weekly'` and `currentDate` (dynamic content)
6. Replaced `currentDate` with static dates for stable pages:
   - Legal (terms, privacy, security-policy): `'2026-01-01'`
   - Company (about, contact, faq, help, support): `'2026-04-01'`
   - Compare pages (buildium, appfolio, rentredi): `'2026-04-01'`
   - Resource pages (3 lead magnets): `'2026-04-01'`
   - Auth (login): `'2026-01-01'`
7. Kept `currentDate` for: homepage, features, pricing, blog hub, resources hub, blog category pages
8. Blog posts retain `post.published_at || currentDate` (CRAWL-06 already satisfied)
9. Added `blogCategoryPages` to `allPages` spread
10. Updated logger metadata to include `categoryEntries: blogCategoryPages.length`

### src/app/sitemap.test.ts (new)

Unit test with 8 test cases:
- Test 1: `/support` URL present
- Test 2: `/security-policy` URL present
- Test 3: blog category entries match `/blog/category/` pattern
- Test 4: stable pages use fixed ISO date strings (not `currentDate`)
- Test 5: blog post entries use `post.published_at`
- Test 6: compare pages for buildium, appfolio, rentredi present
- Test 7: resource pages present
- Test 8: categories are deduplicated (3 unique from 4 rows with one duplicate)

Mock strategy: `makeQueryBuilder(selectArg)` factory creates a thenable builder that returns category rows when `selectArg === 'category'`, blog posts otherwise. `vi.resetModules()` in `beforeEach` ensures each test gets a fresh module import.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — the added DB query is a read-only select of public blog categories already visible on public pages. No PII or auth-gated data exposed.

## Self-Check: PASSED

- [x] `src/app/sitemap.ts` exists and contains `/support`, `/security-policy`, `blog/category/`, `'2026-01-01'`, `'2026-04-01'`, `blogCategoryPages`
- [x] `src/app/sitemap.test.ts` exists with 8 passing tests
- [x] Commit 6bc8d8fe9 exists and contains both files
- [x] `pnpm test:unit -- --run src/app/sitemap.test.ts` exits 0 (1610 tests pass)
- [x] No sitemap-related typecheck errors
