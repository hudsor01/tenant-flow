# Requirements: TenantFlow v1.1

**Defined:** 2026-03-07
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.

## v1.1 Requirements

Requirements for v1.1 Blog Redesign & CI. Each maps to roadmap phases.

### Blog Data Layer

- [x] **BLOG-01**: Paginated blog queries with `.range()` and `{ count: 'exact' }`
- [x] **BLOG-02**: `get_blog_categories` RPC returns distinct categories with post counts
- [x] **BLOG-03**: Related posts query (same category, exclude current, limit 3)
- [x] **BLOG-04**: Featured comparisons query (Software Comparisons category)
- [x] **BLOG-05**: Blog query key factory (`blog-keys.ts`) using `queryOptions()` pattern

### Blog Components

- [x] **COMP-01**: Reusable `BlogCard` component with featured image, category label, reading time
- [x] **COMP-02**: `BlogPagination` component with nuqs URL state
- [x] **COMP-03**: `NewsletterSignup` component with mutation, toast feedback, success state

### Blog Pages

- [x] **PAGE-01**: Hub page with split zones (Software Comparisons vs Insights & Guides)
- [x] **PAGE-02**: Hub page shows category pills from DB with counts
- [x] **PAGE-03**: Detail page with featured image, BlurFade, and related posts section
- [x] **PAGE-04**: Category page with dynamic name resolution and paginated grid
- [x] **PAGE-05**: EmptyState shown on category pages with no posts

### Newsletter

- [x] **NEWS-01**: `newsletter-subscribe` Edge Function using Resend Contacts API (not deprecated Audiences)
- [x] **NEWS-02**: Rate limiting (5 req/min per IP) and email validation on Edge Function
- [x] **NEWS-03**: Newsletter form calls Edge Function and shows success/error states

### Infrastructure

- [x] **INFRA-01**: Activate `@tailwindcss/typography` plugin in `globals.css`
- [x] **INFRA-02**: Add `scrollbar-hide` CSS utility for horizontal scroll zones
- [x] **INFRA-03**: Create `EmptyState` shared component
- [ ] **INFRA-04**: CI workflow: gate `checks` job to PR-only, `e2e-smoke` runs independently on push

## Future Requirements

### Blog Enhancements

- **BLOG-F01**: Blog search with full-text search
- **BLOG-F02**: Blog tags filtering (in addition to categories)
- **BLOG-F03**: Blog RSS feed
- **BLOG-F04**: Blog sitemap with ISR regeneration
- **BLOG-F05**: Blog SEO metadata (og:image, structured data)

### Newsletter Enhancements

- **NEWS-F01**: Double opt-in confirmation email
- **NEWS-F02**: Unsubscribe link in newsletter emails
- **NEWS-F03**: Newsletter analytics (open rate, click rate)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Blog CMS / admin panel | Content managed directly in Supabase; admin UI is a separate milestone |
| SSR/SSG for blog pages | Current client-side rendering is sufficient; SEO milestone later |
| Blog comments | High complexity, moderation burden, not core to content marketing |
| A/B testing on blog layouts | Premature optimization; ship and iterate |
| Email drip campaigns | Beyond newsletter signup; requires dedicated email marketing tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BLOG-01 | Phase 11 | Complete |
| BLOG-02 | Phase 11 | Complete |
| BLOG-03 | Phase 11 | Complete |
| BLOG-04 | Phase 11 | Complete |
| BLOG-05 | Phase 11 | Complete |
| COMP-01 | Phase 12 | Complete |
| COMP-02 | Phase 12 | Complete |
| COMP-03 | Phase 12 | Complete |
| PAGE-01 | Phase 14 | Complete |
| PAGE-02 | Phase 14 | Complete |
| PAGE-03 | Phase 14 | Complete |
| PAGE-04 | Phase 14 | Complete |
| PAGE-05 | Phase 14 | Complete |
| NEWS-01 | Phase 13 | Complete |
| NEWS-02 | Phase 13 | Complete |
| NEWS-03 | Phase 14 | Complete |
| INFRA-01 | Phase 12 | Complete |
| INFRA-02 | Phase 12 | Complete |
| INFRA-03 | Phase 12 | Complete |
| INFRA-04 | Phase 15 | Pending |

**Coverage:**
- v1.1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap creation (all 20 requirements mapped to phases 11-15)*
