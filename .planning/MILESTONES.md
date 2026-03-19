# Project Milestones: TenantFlow

## v1.3 Stub Elimination (Shipped: 2026-03-18)

**Delivered:** Replaced every stub/placeholder in the application with real, production-ready implementations -- from email sending to GDPR compliance to file uploads.

**Phases completed:** 6 phases, 12 plans

**Key accomplishments:**

- Real tenant invitation emails via Resend Edge Function with branded template and accept link routing
- GDPR Article 20 data portability with role-aware export (owner gets properties/leases/financials, tenant gets lease/payment/maintenance)
- Self-service account deletion with 30-day grace period, countdown UI, and cancel capability
- PDF template preview and export via StirlingPDF with custom field persistence (PostgREST upsert)
- Bulk property import via CSV with Papa Parse + Zod validation pipeline and progress tracking
- Maintenance photo upload to Supabase Storage with thumbnail grid and Dialog lightbox viewer
- Stripe Express Dashboard access via login link (extends existing stripe-connect Edge Function)
- Cross-cutting UI/UX polish: 12 audit findings fixed (typography, dark mode, empty states, shadcn consistency)

**Stats:**

- 6 phases (+ 1 inserted decimal phase 23.1), 12 plans, 38 commits
- 141 files changed, +11,582 / -2,164 lines
- Timeline: 7 days (2026-03-11 to 2026-03-18)
- Requirements: 13/13 satisfied (2 EMAIL + 3 GDPR + 3 DOC + 2 PROP + 2 MAINT + 1 STRIPE)

**Git tag:** `v1.3`

**Archives:** [v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) | [v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md)

---

## v1.1 Blog Redesign & CI (Shipped: 2026-03-08)

**Delivered:** Transformed MVP blog into a production content-marketing platform with split content zones, pagination, category navigation, working newsletter subscription, and CI workflow optimization.

**Phases completed:** 5 phases, 8 plans

**Key accomplishments:**

- Built blog data layer with paginated queries, `get_blog_categories` RPC, related posts, and `queryOptions()` factory
- Created reusable blog components (BlogCard, BlogPagination, NewsletterSignup, BlogEmptyState) with unit tests
- Shipped `newsletter-subscribe` Edge Function using Resend Contacts API with 5 req/min rate limiting and segment auto-creation
- Rewrote blog pages: hub with split zones (Software Comparisons + Insights & Guides), detail with blur-fade + related posts, category with DB name resolution + pagination
- Optimized CI workflow: checks gated to PR-only, e2e-smoke runs independently on push, per-job concurrency groups

**Stats:**

- 5 phases, 8 plans, 43 commits
- 85 files changed, +8,096 / -14,662 lines
- Timeline: 2 days (2026-03-07 to 2026-03-08)
- Requirements: 20/20 satisfied (5 BLOG + 3 COMP + 5 PAGE + 3 NEWS + 4 INFRA)
- Unit tests: 1,319 -> 1,415 (+96 new tests)

**Git tag:** `v1.1`

**Archives:** [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) | [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md) | [v1.1-MILESTONE-AUDIT.md](milestones/v1.1-MILESTONE-AUDIT.md)

---

## v1.0 Production Hardening (Shipped: 2026-03-07)

**Delivered:** Closed all 131 findings from comprehensive 8-agent security/quality review across 10 phases, hardening every layer from database RPCs to Edge Functions to frontend accessibility.

**Phases completed:** 1-10 (60 plans)

**Key accomplishments:**

- Closed 12+ SECURITY DEFINER data exfiltration vectors with auth.uid() guards on all RPCs
- Fixed all payment processing bugs: cents/dollars convention, autopay idempotency, webhook processing, Stripe SDK alignment
- Registered middleware with role-based routing, server-validated sessions (getUser over getSession), branded auth emails via Resend
- Hardened 15 Edge Functions with env validation, rate limiting (Upstash Redis), XSS escaping, CSP enforcement, generic error responses
- Eliminated type escape hatches, consolidated query keys to factories, split 20+ oversized files under 300-line limit
- Fixed database schema: NOT NULL constraints, FK cascades, GDPR anonymization, archive-then-delete cron jobs, cron health monitoring
- Full accessibility pass: skip-to-content, aria-labels, error boundaries, not-found pages, mobile sidebar keyboard access
- Parallelized waterfalls, code-split Recharts/react-markdown, consolidated 13 stats queries to 2 RPCs, virtualized list views
- Added 1,319 unit tests, 16 RLS integration test files, 4 Edge Function test suites, trimmed E2E to 17 critical journeys
- Removed dead code and orphaned components, resolved all CLAUDE.md inaccuracies

**Stats:**

- 10 phases, 60 plans, 187 commits
- 749 files changed, +54,581 / -16,719 lines
- Timeline: 3 days (2026-03-04 to 2026-03-07)
- Requirements: 171/171 satisfied (12 SEC + 17 AUTH + 14 EDGE + 22 PAY + 22 CODE + 12 DB + 26 UX + 24 PERF + 21 TEST + 1 DOC)

**Git tag:** `v1.0`

**Archives:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) | [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) | [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

---

## v4.0 Production-Parity Testing & Observability (Shipped: 2026-01-21)

**Delivered:** Production-equivalent test infrastructure with real service integration and comprehensive observability.

**Phases completed:** 26-32 (9 plans total)

**Key accomplishments:**

- Docker Compose infrastructure mirroring production (PostgreSQL 17, Redis, real Supabase)
- Three-tier seed data system (smoke/dev/perf) with multi-tenant isolation
- Real Stripe test mode integration replacing mocks in integration tests
- Sentry backend/frontend integration with tenant context and data scrubbing
- Synthetic monitoring and post-deploy smoke tests
- 48 new frontend tests with real QueryClient (tenant/lease hooks)

**Stats:**

- 7 phases, 9 plans completed
- Test coverage significantly improved
- Real service integration throughout

**Git tag:** `v4.0`

---

## v3.0 (Archived)

See: [v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)

---

*Last updated: 2026-03-08*
