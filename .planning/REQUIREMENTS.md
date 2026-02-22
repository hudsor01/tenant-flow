# Requirements: v7.0 Backend Elimination — NestJS → Supabase Direct

## Overview

Eliminate the NestJS/Railway backend entirely. Migrate all 26 frontend hook files from `apiRequest()` (→ NestJS → Supabase) to Supabase PostgREST direct, Supabase Edge Functions, pg_cron, and DB Webhooks. End state: no NestJS, no Railway, no infrastructure cost beyond Supabase.

---

## v7.0 Requirements

### CRUD — Core PostgREST Migration

- [ ] **CRUD-01**: Dev can migrate properties and units hooks (`use-properties.ts`, `use-unit.ts`) to `supabase.from()` PostgREST with full CRUD + mutations
- [ ] **CRUD-02**: Dev can migrate tenants and leases hooks (`use-tenant.ts`, `use-lease.ts`) to PostgREST including invitation flow
- [ ] **CRUD-03**: Dev can migrate maintenance requests and vendors hooks (`use-maintenance.ts`, `use-vendor.ts`) to PostgREST
- [ ] **CRUD-04**: Dev can migrate inspections hooks (`use-inspections.ts`) to PostgREST including room/photo/tenant-review operations
- [ ] **CRUD-05**: Dev can migrate user profile, settings, MFA, sessions, notifications, and tour progress hooks to PostgREST

### REPT — Analytics & Reports

- [ ] **REPT-01**: Dev can migrate owner dashboard and analytics hooks (`use-owner-dashboard.ts`, `use-analytics.ts`) to call Supabase RPCs directly via `supabase.rpc()`
- [ ] **REPT-02**: Dev can migrate financial reports hooks (`use-reports.ts`, `use-financials.ts`) to Supabase RPCs for data and Edge Function for CSV/PDF downloads
- [ ] **REPT-03**: Dev can migrate tenant portal dashboard hook (`use-tenant-portal.ts`) to PostgREST

### PAY — Payments & Billing

- [ ] **PAY-01**: Dev can migrate rent payment hooks (`use-payments.ts`, `use-payment-methods.ts`) to PostgREST
- [ ] **PAY-02**: Dev can migrate Stripe Connect status and onboarding hooks (`use-stripe-connect.ts`) to a Supabase Edge Function
- [ ] **PAY-03**: Stripe webhook events (subscription changes, Connect account updates, payment events) are handled by a Supabase Edge Function using `constructEventAsync()`
- [x] **PAY-04**: Dev can migrate billing/subscription hooks (`use-billing.ts`) to an Edge Function that wraps Stripe API

### EXT — External Service Edge Functions

- [ ] **EXT-01**: PDF generation requests from frontend are routed through a Supabase Edge Function that calls the self-hosted StirlingPDF HTTP API
- [ ] **EXT-02**: DocuSeal template creation, signing requests, and webhook completions are handled by Supabase Edge Functions calling the self-hosted DocuSeal API

### GRAPH — pg_graphql

- [ ] **GRAPH-01**: pg_graphql is enabled and accessible via `supabase.rpc('graphql.resolve', { query })` for complex multi-join queries
- [ ] **GRAPH-02**: Owner dashboard complex aggregations (portfolio overview, occupancy trends, revenue by property) use pg_graphql queries to reduce N+1 PostgREST calls to a single request

### SCHED — Scheduled Jobs (pg_cron)

- [x] **SCHED-01**: pg_cron job calculates and applies late fees on overdue rent payments (daily, configurable grace period)
- [x] **SCHED-02**: pg_cron job triggers lease expiry reminders (emails via Supabase → n8n 30/7/1 days before end date)
- [x] **SCHED-03**: pg_cron job updates lease status from `active` to `expired` when end date passes

### WF — Background Workflows (DB Webhooks → n8n)

- [x] **WF-01**: DB Webhook fires on `rent_payments` INSERT → POST to n8n with payment context (owner notified, receipt generated)
- [x] **WF-02**: DB Webhook fires on `maintenance_requests` INSERT/UPDATE → POST to n8n for assignment notifications and status updates

### CLEAN — Cleanup & Deletion

- [ ] **CLEAN-01**: `apps/backend/` directory deleted from the monorepo
- [ ] **CLEAN-02**: All NestJS backend unit tests (2229+) and integration tests deleted
- [ ] **CLEAN-03**: CI/CD pipeline updated to remove NestJS build, test, and Railway deploy stages
- [ ] **CLEAN-04**: Railway configuration removed; Railway environment variables and `RAILWAY_*` references purged
- [ ] **CLEAN-05**: Frontend `apiRequest`, `apiRequestFormData`, `apiRequestRaw`, `API_BASE_URL`, and backend-related env vars removed; `apps/backend` references in monorepo config cleaned up

---

## Future Requirements (Deferred)

- `supabase.realtime()` subscriptions for live dashboard updates — not required for v7.0 (polling acceptable short-term)
- pg_net direct HTTP calls from SQL triggers — using DB Webhooks (pg_net wrapper) instead; direct pg_net too low-level
- GraphQL from frontend (Apollo/urql) — pg_graphql accessed via RPC only; no GraphQL client lib in frontend
- Edge Function for user account deletion (GDPR) — already handled via PostgREST/SQL cascade in v6.0

---

## Out of Scope

- tRPC, Hono, or any other Node.js backend framework — decided against; PostgREST + Edge Functions is the complete solution
- Vercel serverless functions as NestJS replacement — not needed
- Mobile app — not in any current milestone
- SMS notifications (Twilio) — removed in v6.0; email via n8n covers this
- GraphQL client library in frontend — pg_graphql accessed via `supabase.rpc()` only

---

## Traceability

| Phase | Name | Requirements Covered |
|-------|------|---------------------|
| 50 | Infrastructure & Auth Foundation + User/Profile CRUD | CRUD-05 |
| 51 | Core CRUD Migration — Properties, Units, Tenants, Leases | CRUD-01, CRUD-02 |
| 52 | Operations CRUD Migration — Maintenance, Vendors, Inspections | CRUD-03, CRUD-04 |
| 53 | Analytics, Reports & Tenant Portal — RPCs + pg_graphql | REPT-01, REPT-02, REPT-03, GRAPH-01, GRAPH-02 |
| 54 | Payments & Billing — PostgREST + Stripe Edge Functions | PAY-01, PAY-02, PAY-03, PAY-04 |
| 55 | External Services Edge Functions — StirlingPDF & DocuSeal | EXT-01, EXT-02 |
| 56 | Scheduled Jobs & DB Webhooks — pg_cron + n8n | SCHED-01, SCHED-02, SCHED-03, WF-01, WF-02 |
| 57 | Cleanup & Deletion — Remove NestJS Entirely | CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05 |
