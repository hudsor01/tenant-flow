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

### Active (v8.0 — Post-Migration Hardening)

- [ ] Pre-merge blockers resolved (E2E env vars, Railway secrets, Vercel ANON_KEY)
- [ ] RLS write-path isolation tests (INSERT/UPDATE/DELETE) for all 7 domains
- [ ] CLAUDE.md stripped of NestJS content + RLS-only security model documented
- [ ] PostgREST/Edge Function patterns added to CLAUDE.md
- [ ] All 31 TODO stubs tracked; 4 runtime-throw stubs fixed
- [ ] Double-toast error handling fixed across 20+ hooks
- [ ] Duplicate payment method hooks consolidated
- [ ] 86 getUser() calls replaced with cached auth pattern
- [ ] Batch tenant operations refactored to single queries/RPCs
- [ ] 3-step serial tenant portal lookup eliminated
- [ ] CSV export unbounded query protected with limit
- [ ] E2E stale test intercepts rewritten for PostgREST architecture
- [ ] RLS tests run on dedicated integration project, gate PRs
- [ ] Performance metrics (maintenance stats, missing indexes) addressed
- [ ] CI/CD pipeline gaps closed (E2E smoke, coverage gates)

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

## Current Milestone: v8.0 Post-Migration Hardening + Payment Infrastructure

**Goal:** Complete the payment revenue engine (Stripe Connect fee split, receipt emails) and auth flow gaps, while resolving critical security and code quality findings from the v7.0 post-merge review.

**Target features:**
- Stripe rent payment checkout with destination charge fee split (new `stripe-rent-checkout` Edge Function)
- Automated receipt emails via Resend (fire-and-forget on payment success)
- Auth flow completion (password reset page, email confirmation page, Google OAuth polish)
- Critical security fixes (DocuSeal fail-open, IDOR, Stripe webhook constraint)
- RLS write-path isolation test coverage
- CLAUDE.md NestJS cleanup + new PostgREST/Edge Function patterns
- Code quality consolidation (duplicate hooks, error handling, auth guards)
- Performance improvements (auth fan-out, batch N+1, serial lookups)
- CI/CD hardening (E2E in pipeline, RLS tests on PR, dedicated integration project)

---
*Last updated: 2026-02-27 after Phase 59 Stripe Rent Checkout — end-to-end rent payment with destination charges*
