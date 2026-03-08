# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- v1.0 **Production Hardening** -- Phases 1-10 (shipped 2026-03-07) | [archive](milestones/v1.0-ROADMAP.md)
- v1.1 **Blog Redesign & CI** -- Phases 11-15 (in progress)

## Phases

<details>
<summary>v1.0 Production Hardening (Phases 1-10) -- SHIPPED 2026-03-07</summary>

- [x] Phase 1: RPC & Database Security (2/2 plans) -- completed 2026-03-04
- [x] Phase 2: Financial Fixes (7/7 plans) -- completed 2026-03-05
- [x] Phase 3: Auth & Middleware (6/6 plans) -- completed 2026-03-05
- [x] Phase 4: Edge Function Hardening (4/4 plans) -- completed 2026-03-05
- [x] Phase 5: Code Quality & Type Safety (10/10 plans) -- completed 2026-03-06
- [x] Phase 6: Database Schema & Migrations (7/7 plans) -- completed 2026-03-06
- [x] Phase 7: UX & Accessibility (6/6 plans) -- completed 2026-03-06
- [x] Phase 8: Performance Optimization (7/7 plans) -- completed 2026-03-06
- [x] Phase 9: Testing & CI Pipeline (9/9 plans) -- completed 2026-03-06
- [x] Phase 10: Audit Cleanup (2/2 plans) -- completed 2026-03-07

</details>

### v1.1 Blog Redesign & CI (In Progress)

**Milestone Goal:** Transform MVP blog into a production content-marketing platform with split content zones, pagination, category navigation, working newsletter subscription, and CI workflow optimization.

- [x] **Phase 11: Blog Data Layer** - RPC migration, query key factory, paginated hooks, type regeneration (completed 2026-03-07)
- [x] **Phase 12: Blog Components & CSS** - BlogCard, BlogPagination, NewsletterSignup, EmptyState, CSS utilities (completed 2026-03-07)
- [x] **Phase 13: Newsletter Backend** - newsletter-subscribe Edge Function with Resend Contacts API and rate limiting (completed 2026-03-07)
- [x] **Phase 14: Blog Pages** - Hub with split zones, detail with related posts, category with pagination (completed 2026-03-08)
- [ ] **Phase 15: CI Optimization** - Gate checks to PR-only, e2e-smoke independent on push

## Phase Details

### Phase 11: Blog Data Layer
**Goal**: All blog data queries are paginated, type-safe, and follow the queryOptions() factory convention
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: BLOG-01, BLOG-02, BLOG-03, BLOG-04, BLOG-05
**Success Criteria** (what must be TRUE):
  1. Blog list query returns paginated results with exact count, and page transitions retain previous data (no flash)
  2. `get_blog_categories` RPC returns distinct categories with accurate post counts from the database
  3. Related posts query returns up to 3 same-category posts excluding the current post
  4. All blog queries use `queryOptions()` factories from `blog-keys.ts` -- no string literal query keys
  5. `pnpm typecheck` passes clean after RPC migration and type regeneration
**Plans:** 2/2 plans complete

Plans:
- [x] 11-01-PLAN.md -- RPC migration, type regeneration, blog cache tier
- [x] 11-02-PLAN.md -- Blog query key factory, hook rewrite, unit tests

### Phase 12: Blog Components & CSS
**Goal**: Reusable blog presentation components and CSS utilities are ready for page composition
**Depends on**: Phase 11
**Requirements**: COMP-01, COMP-02, COMP-03, INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. BlogCard renders a post with featured image, category label, and reading time -- used identically across hub, category, and related posts
  2. BlogPagination controls page via URL query param (`?page=N`) using nuqs, and clearing page returns to default
  3. NewsletterSignup shows input, submit button, and displays success or error toast after submission
  4. `prose` class renders styled typography on blog content (plugin activated)
  5. EmptyState shared component renders on any list page with zero results
**Plans:** 2/2 plans complete

Plans:
- [x] 12-01-PLAN.md -- CSS infrastructure (typography plugin, scrollbar-hide), BlogCard, BlogPagination
- [x] 12-02-PLAN.md -- NewsletterSignup, BlogEmptyState

### Phase 13: Newsletter Backend
**Goal**: Newsletter subscription works end-to-end from Edge Function to Resend contact list
**Depends on**: Nothing (independent of blog UI phases)
**Requirements**: NEWS-01, NEWS-02
**Success Criteria** (what must be TRUE):
  1. `newsletter-subscribe` Edge Function creates a contact in Resend via the Contacts API (not deprecated Audiences API)
  2. Submitting the same email twice returns success (duplicate handled gracefully, not errored)
  3. More than 5 requests per minute from the same IP are rate-limited with a 429 response
**Plans:** 1/1 plans complete

Plans:
- [ ] 13-01-PLAN.md -- newsletter-subscribe Edge Function and integration tests

### Phase 14: Blog Pages
**Goal**: Users can browse, read, and navigate blog content through a redesigned hub, detail pages, and category pages
**Depends on**: Phase 11, Phase 12, Phase 13
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, NEWS-03
**Success Criteria** (what must be TRUE):
  1. Hub page shows two distinct zones: Software Comparisons (horizontal scroll) and Insights & Guides (paginated grid)
  2. Hub page displays category pills sourced from the database with post counts, each linking to its category page
  3. Detail page shows featured image, rendered markdown content, and a related posts section with up to 3 posts
  4. Category page resolves the display name from the database (not slug deslugification) and shows paginated posts
  5. Category page with no posts shows the EmptyState component
**Plans:** 2/2 plans complete

Plans:
- [ ] 14-01-PLAN.md -- Hub page with split zones, category pills, and newsletter
- [ ] 14-02-PLAN.md -- Detail page with featured image and related posts, category page with DB resolution

### Phase 15: CI Optimization
**Goal**: CI workflows run only where needed -- checks on PRs, e2e-smoke on push to main
**Depends on**: Nothing (independent)
**Requirements**: INFRA-04
**Success Criteria** (what must be TRUE):
  1. The `checks` job runs only on pull request events (not on push to main)
  2. The `e2e-smoke` job runs independently on push to main without requiring `checks` to pass first

**Plans**: TBD

## Progress

**Execution Order:**
Phases 11-14 execute sequentially (data layer -> components -> pages). Phase 13 and 15 are independent and can execute in parallel with other phases.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. RPC & Database Security | v1.0 | 2/2 | Complete | 2026-03-04 |
| 2. Financial Fixes | v1.0 | 7/7 | Complete | 2026-03-05 |
| 3. Auth & Middleware | v1.0 | 6/6 | Complete | 2026-03-05 |
| 4. Edge Function Hardening | v1.0 | 4/4 | Complete | 2026-03-05 |
| 5. Code Quality & Type Safety | v1.0 | 10/10 | Complete | 2026-03-06 |
| 6. Database Schema & Migrations | v1.0 | 7/7 | Complete | 2026-03-06 |
| 7. UX & Accessibility | v1.0 | 6/6 | Complete | 2026-03-06 |
| 8. Performance Optimization | v1.0 | 7/7 | Complete | 2026-03-06 |
| 9. Testing & CI Pipeline | v1.0 | 9/9 | Complete | 2026-03-06 |
| 10. Audit Cleanup | v1.0 | 2/2 | Complete | 2026-03-07 |
| 11. Blog Data Layer | v1.1 | 2/2 | Complete | 2026-03-07 |
| 12. Blog Components & CSS | 2/2 | Complete    | 2026-03-07 | - |
| 13. Newsletter Backend | 1/1 | Complete    | 2026-03-07 | - |
| 14. Blog Pages | 2/2 | Complete   | 2026-03-08 | - |
| 15. CI Optimization | v1.1 | 0/? | Not started | - |
