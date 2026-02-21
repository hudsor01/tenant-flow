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

### Active (v7.0 — Backend Elimination)

- [ ] Frontend API calls use Supabase PostgREST directly (no NestJS proxy)
- [ ] Stripe webhooks handled by Supabase Edge Functions
- [ ] PDF generation via StirlingPDF Edge Function bridge
- [ ] DocuSeal API calls via Edge Functions
- [ ] Scheduled jobs (late fees, reminders) via pg_cron
- [ ] Background workflows triggered via Supabase DB Webhooks → n8n
- [ ] apps/backend/ directory deleted
- [ ] Railway subscription cancelled (infra cost eliminated)

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
| Edge Functions for Stripe | Official Stripe Deno SDK, `constructEventAsync()` for webhooks | — Pending |
| pg_cron for scheduled jobs | Runs inside Postgres, no external scheduler needed | — Pending |
| DB Webhooks + n8n for workflows | n8n already self-hosted, flexible workflow authoring | — Pending |
| Delete NestJS entirely | No partial migration — clean break prevents split-brain bugs | — Pending |

---
*Last updated: 2026-02-21 after v6.0 completion — initializing v7.0 Backend Elimination milestone*
