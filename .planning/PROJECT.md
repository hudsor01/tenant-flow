# TenantFlow

## What This Is

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. It enables owners to manage properties, units, leases, tenants, maintenance requests, and financial reporting -- with rent collection via Stripe Connect (destination charges) and e-signatures via DocuSeal. Tenants get a portal to view their lease, pay rent (manual or autopay), and submit maintenance requests. The platform is production-hardened with comprehensive RLS security, Edge Function rate limiting, and full accessibility.

## Core Value

A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.

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

### Active

(None -- next milestone not yet defined)

### Out of Scope

- Mobile app -- web-first approach
- tRPC or Hono -- Supabase PostgREST is sufficient
- GraphQL -- pg_graphql available but REST is enough
- Twilio SMS -- email covers notification needs
- In-app messaging -- not required for monetization
- MSW component test layer -- future milestone
- Test data factories (@faker-js/faker) -- future milestone

## Context

### Current Architecture

```
Frontend (Next.js 16 / Vercel) -> supabase-js -> Supabase PostgREST (RLS enforced)
                                               -> Edge Functions (Stripe, PDF, DocuSeal, Auth emails)
                                               -> pg_cron (late fees, reminders, autopay, cleanup, GDPR)
                                               -> DB Webhooks -> k3s n8n (background workflows)
```

### Self-Hosted Services (k3s cluster)

- **n8n**: Background workflow automation -- receives DB webhook POSTs
- **StirlingPDF**: PDF generation via HTTP API
- **DocuSeal**: E-signature templates and submissions via HTTP API

### Tech Stack

- **Frontend**: Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand
- **Backend**: Supabase PostgREST + Edge Functions (Deno) + pg_cron
- **Payments**: Stripe Connect (destination charges) + Stripe Subscriptions
- **Email**: Resend (auth emails, payment receipts, notifications)
- **Monitoring**: Sentry (frontend + Edge Functions)
- **CI**: GitHub Actions (next build, unit tests, RLS tests, E2E smoke, gitleaks)

### Codebase

- 749 files changed in v1.0 hardening (+54,581 / -16,719 lines)
- 85 files changed in v1.1 blog redesign (+8,096 / -14,662 lines)
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
| Destination charges (not direct) | Simplest Connect model, automatic fund splitting | Good |
| Owner absorbs all fees | Industry standard for PM platforms | Good |
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

---
*Last updated: 2026-03-08 after v1.1 Blog Redesign & CI milestone completed*
