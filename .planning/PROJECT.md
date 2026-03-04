# TenantFlow

## What This Is

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. It enables owners to manage properties, units, leases, tenants, maintenance requests, and financial reporting — with rent collection via Stripe Connect and e-signatures via DocuSeal. Tenants get a portal to view their lease, pay rent, and submit maintenance requests.

## Core Value

A landlord can add a property, invite a tenant, collect rent, and see their financials — without touching a spreadsheet or calling anyone.

## Requirements

### Validated (v3.0–v6.0 Shipped)

- ✓ Property and unit CRUD with soft-delete — v3.0
- ✓ Tenant management with invitation flow — v3.0
- ✓ Lease management with rent payment tracking — v3.0
- ✓ Maintenance request management with vendor assignment — v5.0/v6.0
- ✓ Stripe Connect Express onboarding for owner payouts — v5.0
- ✓ Stripe Subscriptions (platform billing, Free/Pro tiers) — v5.0
- ✓ Financial reporting: income statement, cash flow, year-end, 1099 vendor — v6.0
- ✓ DocuSeal e-signature integration for lease documents — v6.0
- ✓ Move-in/move-out inspection with photo upload — v6.0
- ✓ Landlord onboarding wizard — v6.0
- ✓ Supabase Storage for property images — v5.0
- ✓ RLS on all tables (owner_user_id pattern) — v3.0
- ✓ Sentry error tracking (frontend + backend) — v4.0
- ✓ GDPR/CCPA data rights (delete account, export) — v6.0
- ✓ Per-endpoint rate limiting + auth hardening — v6.0
- ✓ 2229+ unit tests across financial, billing, maintenance, tenant services — v6.0

### Validated (v7.0 — Backend Elimination — Shipped 2026-02-22)

- ✓ Frontend API calls use Supabase PostgREST directly (no NestJS proxy) — v7.0
- ✓ Stripe webhooks handled by Supabase Edge Functions — v7.0
- ✓ PDF generation via StirlingPDF Edge Function bridge — v7.0
- ✓ DocuSeal API calls via Edge Functions — v7.0
- ✓ Scheduled jobs (late fees, reminders) via pg_cron — v7.0
- ✓ Background workflows triggered via Supabase DB Webhooks → n8n — v7.0
- ✓ apps/backend/ directory deleted — v7.0
- ✓ Railway subscription cancelled (infra cost eliminated) — v7.0

### Validated (v8.0 Phase 58 — Security Hardening — Shipped 2026-02-26)

- ✓ DocuSeal webhook fail-closed HMAC-SHA256 verification — Phase 58
- ✓ DocuSeal Edge Function IDOR — ownership check before all 5 lease actions — Phase 58
- ✓ generate-pdf Edge Function IDOR — ownership check before PDF generation — Phase 58
- ✓ Stripe webhook notification_type CHECK constraint mismatch fixed — Phase 58
- ✓ undefined owner_user_id guard in all 7 insert mutations (requireOwnerUserId) — Phase 58
- ✓ PostgREST filter injection sanitized in all 4 search inputs (sanitizeSearchInput) — Phase 58
- ✓ Edge Function dependencies pinned via deno.json import map — Phase 58
- ✓ CORS wildcard restricted to FRONTEND_URL on browser-facing Edge Functions — Phase 58

### Validated (v8.0 Phase 59 — Stripe Rent Checkout — Shipped 2026-02-27)

- ✓ Stripe Checkout with destination charges routing funds to owner Express account — Phase 59
- ✓ Platform application fee (default 5%, configurable per owner) — Phase 59
- ✓ Duplicate payment prevention via unique partial index + pre-checkout check — Phase 59
- ✓ Fee breakdown columns on rent_payments (gross, platform fee, Stripe fee, net) — Phase 59
- ✓ Webhook populates fee breakdown via balance_transaction expansion — Phase 59
- ✓ charges_enabled guard prevents checkout when owner Stripe onboarding incomplete — Phase 59
- ✓ Tenant portal Pay Rent → Stripe Checkout redirect with success/cancel toast — Phase 59

### Validated (v8.0 Phase 60 — Receipt Emails — Shipped 2026-02-27)

- ✓ Tenant receives branded HTML receipt email on successful rent payment via Resend — Phase 60
- ✓ Owner receives payment notification email on tenant payment success — Phase 60
- ✓ Shared _shared/resend.ts helper with fire-and-forget pattern (never throws) — Phase 60
- ✓ React Email templates in Deno Edge Functions via npm: protocol — Phase 60
- ✓ notification_settings.email preference checked before sending (default opt-in) — Phase 60
- ✓ Webhook always returns 200 regardless of email outcome; failures logged for Sentry — Phase 60

### Validated (v8.0 Phase 61 — Auth Flow Completion — Shipped 2026-02-27)

- ✓ Password reset page with new password + confirm fields, redirect to /login with success toast — Phase 61
- ✓ Expired/invalid reset link detection via URL hash params with recovery UI — Phase 61
- ✓ Email confirmation page with 60-second rate-limited resend button — Phase 61
- ✓ Auth callback handles email confirmation via verifyOtp for signup/email/recovery types — Phase 61
- ✓ Google OAuth users get PENDING user_type via ensure_public_user_for_auth trigger — Phase 61
- ✓ Role selection page (/auth/select-role) for first-time Google OAuth users — Phase 61
- ✓ Middleware redirects PENDING users to role selection, blocks dashboard access — Phase 61
- ✓ Auto-link pending tenant invitations for Google OAuth users by email match — Phase 61

### Validated (v8.0 Phase 62 — Code Quality + Performance — Shipped 2026-02-27)

- ✓ Double-toast eliminated: handlePostgrestError is throw-only + Sentry, single error wrapper for mutations — Phase 62
- ✓ Payment method hooks consolidated: canonical use-payment-methods.ts, ~170 LOC duplicates deleted — Phase 62
- ✓ All 13 runtime-throw TODO stubs replaced with real implementations globally — Phase 62
- ✓ getCachedUser() reads TanStack Query cache first, 95 raw getUser() calls replaced — Phase 62
- ✓ Batch tenant operations use .in() grouped queries instead of N+1 — Phase 62
- ✓ CSV export capped at 10,000 rows — Phase 62

### Validated (v8.0 Phase 63 — Testing, CI/CD + Documentation — Shipped 2026-02-27)

- ✓ RLS write-path isolation tests for INSERT/UPDATE/DELETE across all 7 domains (60 tests) — Phase 63
- ✓ CI pipeline gates PRs with RLS security tests; failing RLS test blocks merge — Phase 63
- ✓ 12 E2E test files rewritten from NestJS routes to PostgREST/Edge Function/auth endpoints — Phase 63
- ✓ CLAUDE.md stripped of all NestJS references; PostgREST, Edge Function, and RLS patterns documented — Phase 63

### Validated (v8.0 Phase 64 — Autopay — Shipped 2026-02-27)

- ✓ Tenant autopay toggle in Payment Settings section of tenant portal — Phase 64
- ✓ pg_cron job fires daily at 07:00 UTC, calls stripe-autopay-charge Edge Function — Phase 64
- ✓ Off-session PaymentIntent with same destination charge fee split as manual checkout — Phase 64
- ✓ Stripe Checkout uses setup_future_usage: 'off_session' to save card automatically — Phase 64
- ✓ Failed autopay charge triggers Resend notification email with manual payment CTA — Phase 64
- ✓ Stripe built-in retry/dunning handles failed charge retries — Phase 64

### v8.0 Milestone Complete (Phases 58-64 — Shipped 2026-02-27)

All v8.0 requirements delivered:
- ✓ Security hardening (8 vulnerabilities closed)
- ✓ Stripe rent checkout with destination charge fee split
- ✓ Receipt emails via Resend + React Email
- ✓ Auth flow completion (password reset, email confirmation, Google OAuth)
- ✓ Code quality (double-toast fix, hook consolidation, 13 TODO stubs, cached auth)
- ✓ Testing & CI/CD (60 RLS write-path tests, PR gating, CLAUDE.md modernization)
- ✓ Autopay (pg_cron + Edge Function, off-session charges, failure emails)

### Out of Scope

- Mobile app — not planned; web-first
- tRPC or Hono as NestJS replacement — decided against; Supabase PostgREST is sufficient
- GraphQL from frontend — pg_graphql available but not needed for v7.0 (REST is enough)
- Twilio SMS — removed in v6.0; email covers notification needs
- In-app messaging — removed in v6.0; not required for monetization
- Vercel serverless functions as backend — Railway costs less; Supabase Edge Functions handle exceptions

## Context

### Current Architecture (Being Replaced)

```
Frontend (Next.js/Vercel) → apiRequest() → NestJS (Railway) → Supabase PostgREST
```

NestJS on Railway has been the source of persistent reliability issues: cold starts, CORS, 3-hop latency, and Railway billing. The NestJS layer is a proxy — it receives requests, calls Supabase as admin client, and returns data. PostgREST already does this natively with RLS enforcement.

### Target Architecture

```
Frontend (Next.js/Vercel) → supabase-js → Supabase PostgREST (RLS enforced)
                                        ↳ Edge Functions (Stripe, PDF, DocuSeal)
                                        ↳ pg_cron (scheduled: late fees, reminders)
                                        ↳ DB Webhooks → k3s n8n (background workflows)
```

### Self-Hosted Services (k3s cluster)

- **n8n**: Background workflow automation — receives DB webhook POSTs
- **StirlingPDF**: PDF generation via HTTP API
- **DocuSeal**: E-signature templates and submissions via HTTP API

### Key Supabase Capabilities

- **PostgREST**: Auto-generated REST from schema, RLS applied automatically, accessed via `supabase.from()`
- **Edge Functions**: Deno runtime, globally distributed, Stripe webhook support with `constructEventAsync()`
- **pg_cron**: Standard cron syntax for scheduled PostgreSQL jobs
- **DB Webhooks**: Dashboard-configured, POST on INSERT/UPDATE/DELETE via pg_net
- **pg_net**: Async HTTP POST from PostgreSQL (200 req/sec, beta)
- **Realtime**: WebSockets for live dashboard updates

## Constraints

- **Supabase project**: `bshjmbshupiibfiewpxb` (existing, all data in place)
- **Frontend**: Vercel deployment — no changes to hosting
- **RLS**: Must remain in place — all PostgREST queries use authenticated user's JWT
- **Stripe**: Webhook secret handling must move to Edge Function environment variables
- **k3s services**: n8n/StirlingPDF/DocuSeal accessible from Edge Functions via internal URLs
- **No regression**: All existing features must work after NestJS removal

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase PostgREST over tRPC | Zero additional infra, RLS automatic, supabase-js already in frontend | ✓ Good |
| Supabase PostgREST over Hono | No new server needed, Supabase already has REST | ✓ Good |
| Edge Functions for Stripe | Official Stripe Deno SDK, `constructEventAsync()` for webhooks | ✓ Good |
| Destination charges (not direct charges) | Simplest Stripe Connect model; platform creates charge, Stripe splits funds automatically | ✓ Good |
| Owner absorbs all fees | Industry standard for PM platforms; tenant pays exact rent amount | ✓ Good |
| pg_cron for scheduled jobs | Runs inside Postgres, no external scheduler needed | — Pending |
| DB Webhooks + n8n for workflows | n8n already self-hosted, flexible workflow authoring | — Pending |
| Delete NestJS entirely | No partial migration — clean break prevents split-brain bugs | — Pending |

## Current Milestone: v9.0 Testing Strategy Consolidation

**Goal:** Unify the fragmented test infrastructure (Vitest + Jest + scattered directories) into a single-runner Testing Trophy architecture with MSW for component tests, faker factories for test data, and a trimmed E2E suite.

**Target features:**
- Unify Vitest + Jest under single Vitest `projects` config (unit/component/integration)
- Add MSW 2.x for network-level API mocking in component tests
- Create `@faker-js/faker` factory functions replacing static DEFAULT_* objects
- Consolidate orphaned test directories (`src/__tests__/`, `tests/unit/`)
- Migrate 7 RLS integration tests from Jest to Vitest node project
- Formalize component test layer with `.component.test.tsx` naming convention
- Trim E2E to 15-20 critical user journeys
- Update CI pipeline for unified runner
- Remove Jest, ts-jest, @types/jest dependencies

---
*Last updated: 2026-03-03 after v9.0 Testing Strategy Consolidation milestone started*
