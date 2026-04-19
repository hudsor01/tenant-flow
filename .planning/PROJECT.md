# TenantFlow

## What This Is

TenantFlow is a landlord-only property management SaaS for owners and managers. Owners manage properties, units, leases, tenants (as records, not accounts), maintenance requests, and financial reporting — with e-signatures via DocuSeal (tier-gated). **Rent facilitation and the tenant portal were removed in the 2026-04-18 landlord-only pivot (PR #596)**: TenantFlow does not move money between tenants and landlords, does not host tenant accounts, and does not act as a payments facilitator. The platform is production-hardened with comprehensive RLS security, Edge Function rate limiting, and full accessibility.

## Core Value

A landlord can add a property, record tenants and leases, track maintenance, and run financial reports — without touching a spreadsheet or calling anyone.

## Requirements

### Validated

- v3.0: Property and unit CRUD with soft-delete
- v3.0: Tenant management with invitation flow
- v3.0: Lease management with rent payment tracking
- v3.0: RLS on all tables (owner_user_id pattern)
- v5.0: Stripe Connect Express onboarding for owner payouts
- v5.0: Stripe Subscriptions (platform billing, Free/Pro tiers)
- v5.0: Supabase Storage for property images
- v5.0/v6.0: Maintenance request management with vendor assignment
- v6.0: Financial reporting: income statement, cash flow, year-end, 1099 vendor
- v6.0: DocuSeal e-signature integration for lease documents
- v6.0: Move-in/move-out inspection with photo upload
- v6.0: Landlord onboarding wizard
- v6.0: GDPR/CCPA data rights (delete account, export)
- v6.0: Per-endpoint rate limiting + auth hardening
- v6.0: 2229+ unit tests across financial, billing, maintenance, tenant services
- v4.0: Sentry error tracking (frontend + backend)
- v7.0: Frontend API calls use Supabase PostgREST directly (no NestJS proxy)
- v7.0: Stripe webhooks handled by Supabase Edge Functions
- v7.0: PDF generation via StirlingPDF Edge Function bridge
- v7.0: DocuSeal API calls via Edge Functions
- v7.0: Scheduled jobs (late fees, reminders) via pg_cron
- v7.0: apps/backend/ directory deleted, Railway subscription cancelled
- v8.0: Security hardening (8 vulnerabilities closed)
- v8.0: Stripe rent checkout with destination charge fee split
- v8.0: Receipt emails via Resend + React Email
- v8.0: Auth flow completion (password reset, email confirmation, Google OAuth)
- v8.0: Code quality (double-toast fix, hook consolidation, cached auth)
- v8.0: Testing & CI/CD (60 RLS write-path tests, PR gating)
- v8.0: Autopay (pg_cron + Edge Function, off-session charges, failure emails)
- v1.0: auth.uid() guards on all 25+ SECURITY DEFINER RPCs (data exfiltration closed)
- v1.0: Payment processing correctness (cents/dollars, autopay idempotency, webhook safety)
- v1.0: Next.js middleware with role-based routing and server-validated sessions
- v1.0: Edge Function hardening (env validation, rate limiting, XSS escaping, CSP, generic errors)
- v1.0: Zero type escape hatches, query key factories, all files under 300 lines
- v1.0: Database schema corrections (NOT NULL, FK cascades, GDPR anonymization, cron health monitoring)
- v1.0: Full accessibility (skip-to-content, aria-labels, error boundaries, not-found pages, mobile keyboard)
- v1.0: Performance (waterfall elimination, code-split charts, consolidated stats RPCs, virtualized lists)
- v1.0: 1,319 unit tests, 16 RLS integration files, 4 Edge Function test suites, 17 E2E journeys
- v1.0: CI pipeline with next build, coverage enforcement, gitleaks, RLS on every PR

- v1.1: Blog data layer (paginated queries, get_blog_categories RPC, related posts, comparison posts, queryOptions factory)
- v1.1: Blog components (BlogCard, BlogPagination, NewsletterSignup, BlogEmptyState with unit tests)
- v1.1: Newsletter Edge Function (Resend Contacts API, 5 req/min rate limiting, segment auto-creation)
- v1.1: Blog pages rewritten (hub split zones, detail blur-fade + related posts, category DB names + pagination)
- v1.1: CI optimization (checks PR-only, e2e-smoke independent on push, per-job concurrency)

- v1.3/Phase 21: Email invitation sending via Edge Function (send-tenant-invitation)
- v1.3/Phase 22: GDPR data export via Edge Function (role-aware owner/tenant export, downloadable JSON)
- v1.3/Phase 22: Self-service account deletion with 30-day grace period (request, countdown, cancel)
- v1.3/Phase 23: PDF template preview and export via StirlingPDF with custom field persistence
- v1.3/Phase 23: Template definition saving via PostgREST upsert with onConflict
- v1.3/Phase 23.1: Cross-cutting UI/UX polish (12 audit findings: typography, dark mode, empty states, shadcn consistency)
- v1.3/Phase 24: Bulk property import via CSV with Papa Parse + Zod validation pipeline
- v1.3/Phase 25: Maintenance photo upload to Supabase Storage with lightbox display
- v1.3/Phase 25: Stripe Express Dashboard access via login link (extends stripe-connect Edge Function)

- v1.5: Code quality & deduplication pass (shared helpers, hook consolidation, dead code removal)

- v1.6/Phase 32: Crawlability critical fixes (robots.txt, canonical URLs, noindex on checkout paths)
- v1.6/Phase 33: SEO utilities foundation (metadata helpers, JSON-LD schema builders)
- v1.6/Phase 34: Per-page metadata audit and generateMetadata coverage (titles, descriptions, OG, canonical)
- v1.6/Phase 35: Structured data enrichment (FAQ, Article, BreadcrumbList, HowTo, Review/Comparison JSON-LD)
- v1.6/Phase 36: Pricing page polish (metadata, priceValidUntil, social proof constants, mobile comparison table a11y)
- v1.6/Phase 37: Content SEO + internal linking between blog/comparison/resource pages
- v1.6/Phase 38: Validation & verification of sitemap, robots, structured data
- v1.6/Phase 39: Structured data gap closure across remaining page types
- v1.6/Phase 40: Metadata verification completeness (final audit pass)
- v1.6: Sitemap split into category sitemaps + Google Search Console readiness

- v1.7/Stage 1: Payout timing instrumentation + autopay notifications + autopay health dashboard widget (shipped in PR 589, branch `feat/launch-readiness-instrumentation`) — *superseded by landlord-only pivot; autopay + payouts removed 2026-04-18 (PR #596)*
- v1.7: Launch Readiness — shipped + archived 2026-04-15 (see `milestones/v1.7-ROADMAP.md`)
- Landlord-only pivot (PR #596, 2026-04-18): removed rent facilitation (rent_due, rent_payments, late_fees, payment_methods, autopay cron + Edge Function, Stripe Connect destination charges), tenant portal (/tenant routes, tenant-portal hooks, tenant_invitations table), payout dashboards. Product now sells as SaaS subscription only; tenants are data records, not auth accounts.
- Auth model collapse (PR #600, 2026-04-19): `user_type` column dropped, replaced with `is_admin` boolean on `public.users`. `custom_access_token_hook` registration deleted; `is_admin()` RPC reads `public.users` directly. `/auth/select-role` flow removed along with user_type sync/restrict triggers. `first_rent` funnel step dropped (dead after rent_payments removal).
- DocuSeal e-signature gate: Growth/Max tier subscription required to send for signature (PR #595, 2026-04-16)

### Active

No active milestone. v1.7 Launch Readiness archived 2026-04-15. Landlord-only pivot shipped 2026-04-18. Run `/gsd:new-milestone vX.Y <name>` to scope the next milestone.

### Out of Scope

- **Rent payment facilitation** (removed 2026-04-18) — not a money-mover; landlords track rent in the ledger/notes, tenants pay them directly
- **Tenant portal + tenant auth accounts** (removed 2026-04-18) — tenants are records owned by the landlord, no self-service UI
- **Stripe Connect / destination charges** (removed 2026-04-18) — platform is Stripe Subscriptions only (SaaS billing)
- **Autopay, late fees, rent reminders** (removed 2026-04-18) — follow-ons to rent facilitation
- Marketing copy, landing page rewrites, launch announcement — deferred until next milestone scope lands
- Mobile app — web-first approach
- tRPC or Hono — Supabase PostgREST is sufficient
- GraphQL — pg_graphql available but REST is enough
- Twilio SMS — email covers notification needs
- In-app messaging — not required for monetization
- MSW component test layer — future milestone
- Test data factories (@faker-js/faker) — future milestone

## Context

### Current Architecture

```
Frontend (Next.js 16 / Vercel) -> supabase-js -> Supabase PostgREST (RLS enforced)
                                               -> Edge Functions (Stripe Subscriptions, PDF, DocuSeal, Auth emails)
                                               -> pg_cron (cleanup, GDPR, cron health)
                                               -> DB Webhooks -> k3s n8n (background workflows)
```

### Self-Hosted Services (k3s cluster)

- **n8n**: Background workflow automation -- receives DB webhook POSTs
- **StirlingPDF**: PDF generation via HTTP API
- **DocuSeal**: E-signature templates and submissions via HTTP API

### Tech Stack

- **Frontend**: Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand
- **Backend**: Supabase PostgREST + Edge Functions (Deno) + pg_cron
- **Payments**: Stripe Subscriptions (platform SaaS billing only; rent facilitation removed 2026-04-18)
- **Email**: Resend (auth emails, payment receipts, notifications)
- **Monitoring**: Sentry (frontend + Edge Functions)
- **CI**: GitHub Actions (next build, unit tests, RLS tests, E2E smoke, gitleaks)

### Codebase

- 749 files changed in v1.0 hardening (+54,581 / -16,719 lines)
- 85 files changed in v1.1 blog redesign (+8,096 / -14,662 lines)
- 141 files changed in v1.3 stub elimination (+11,582 / -2,164 lines)
- 1,415 unit tests, 16 RLS integration test files, 5 Edge Function test suites, 17 E2E tests
- TypeScript strict mode (noUnusedLocals, noUnusedParameters, isolatedModules, checkJs)
- Zero eslint errors, zero typecheck errors

## Constraints

- **Supabase project**: `bshjmbshupiibfiewpxb` (existing, all data in place)
- **Frontend**: Vercel deployment
- **RLS**: All PostgREST queries use authenticated user's JWT
- **Stripe**: Webhook secrets in Edge Function environment variables
- **k3s services**: n8n/StirlingPDF/DocuSeal accessible from Edge Functions via internal URLs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase PostgREST over tRPC/Hono | Zero additional infra, RLS automatic | Good |
| Edge Functions for Stripe | Official Deno SDK, constructEventAsync | Good |
| Destination charges (not direct) | Simplest Connect model, automatic fund splitting | Reversed 2026-04-18 (rent facilitation removed) |
| Owner absorbs all fees | Industry standard for PM platforms | Reversed 2026-04-18 (rent facilitation removed) |
| Landlord-only pivot (2026-04-18, PR #596) | Keeping code debt and dead code is irresponsible; not moving money reduces compliance surface (PCI/money transmitter), lets the product focus on the core "spreadsheet replacement" promise | Pivot commit; ~1500 lines comment audit + 7 tables dropped + 9 edge functions removed |
| pg_cron for scheduled jobs | Runs inside Postgres, no external scheduler | Good |
| Delete NestJS entirely | Clean break prevents split-brain bugs | Good |
| service_role for Edge Functions | All verify auth.uid() via getUser(token), avoids RLS overhead | Good |
| Invitation code in URL query param | Single-use, expiring, rate-limited, accept requires JWT | Good |
| Archive-then-delete for data retention | Never hard delete without archiving first | Good |
| auth.uid() guards on all RPCs | Prevents data exfiltration even if RLS bypassed | Good |
| queryOptions() factories | Consistent cache keys, type-safe invalidation | Good |
| CSS-only loading animations | No JS animation libraries, lighter bundle | Good |
| useVirtualizer directly on tables | More control than wrapper component | Good |
| Gitleaks in pre-commit only | Catches secrets before they reach repo | Good |
| Blog queries via anon RLS | Public content, no auth required, simpler cache | Good |
| Per-job CI concurrency groups | Checks and e2e-smoke run independently | Good |
| Resend Contacts API (not Audiences) | Audiences deprecated, Contacts is current API | Good |
| Service role for GDPR export | Bypass RLS for complete data, JWT still validated first | Good |
| Edge Function blob download | fetch → blob → createObjectURL → anchor click pattern | Good |
| authKeys.deletionStatus() | Deletion status is account-scoped, shares key across owner/tenant | Good |
| PostgREST upsert with onConflict | Template definitions: owner-scoped upsert with jsonb custom_fields | Good |
| Papa Parse for CSV import | RFC 4180 compliance, handles edge cases (quoted commas, newlines) | Good |
| Staged file upload (no auto-upload) | Simpler than Dropzone for maintenance photos, upload after form submit | Good |
| Extend existing Edge Function actions | Stripe login-link added to stripe-connect function vs new function | Good |
| Non-blocking photo upload | Request creation succeeds even if photo upload fails | Good |
| Centralized social proof constants | Single source of truth for all marketing numbers | Good |

---
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-19 after auth model collapse (PR #600) — user_type column dropped, is_admin boolean replaces it*
