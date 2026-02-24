# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- ✅ **v3.0 Backend Architecture Excellence** - Phases 18-25 (shipped 2026-01-20) — [archive](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Production-Parity Testing & Observability** - Phases 26-32 (shipped 2026-01-21) — [archive](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 Production Hardening & Revenue Completion** - Phases 33-37 (shipped 2026-02-19)
- ✅ **v6.0 Production Grade Completion** - Phases 38-49 (shipped 2026-02-20)

## Phases

<details>
<summary>✅ v3.0 Backend Architecture Excellence (Phases 18-25) — SHIPPED 2026-01-20</summary>

See [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)

</details>

<details>
<summary>✅ v4.0 Production-Parity Testing & Observability (Phases 26-32) — SHIPPED 2026-01-21</summary>

**Key accomplishments:**
- Docker Compose infrastructure mirroring production
- Three-tier seed data system (smoke/dev/perf) with multi-tenant isolation
- Real Stripe test mode integration in integration tests
- Sentry backend/frontend integration with tenant context
- Synthetic monitoring and post-deploy smoke tests
- 48 new frontend tests with real QueryClient

</details>

### ✅ v5.0 Production Hardening & Revenue Completion (Shipped 2026-02-19)

**Milestone Goal:** Close the gap between what exists in the codebase and what customers can actually use. Verify every critical flow works end-to-end, wire up Stripe Connect so owners can receive rent payments, enforce subscription plan limits, complete the tenant onboarding flow, and confirm financial pages show real data.

#### Phase 33: Full Smoke Test

**Goal**: Systematically walk every critical user flow as both owner and tenant, document what's broken, and fix blocking issues found during the walkthrough.
**Depends on**: v4.0 complete
**Research**: Unlikely (internal testing — no new tech required)
**Plans**: TBD

Plans:
- [x] 33-01: Run automated E2E test suite + write SMOKE-TEST-RESULTS.md
- [x] 33-02: Manual flow verification (owner + tenant) + create ISSUES.md

#### Phase 34: Stripe Connect End-to-End

**Goal**: Complete Stripe Connect onboarding for property owners — surface the CTA in the correct owner UI location, verify the backend onboarding flow, and confirm payouts reach owners after rent is collected.
**Depends on**: Phase 33 (smoke test identifies remaining blockers)
**Research**: Likely (Stripe Connect Express — external API with OAuth flow complexity)
**Research topics**: Connect Express onboarding URL generation, account status webhooks (`account.updated`), transfer vs payout distinction, test mode flows
**Plans**: TBD

Plans:
- [x] 34-01: Verify and fix Stripe Connect onboarding CTA, dialog, backend, and webhook

#### Phase 35: Subscription Enforcement

**Goal**: Enforce plan limits so Free tier users cannot access Pro features. Gate property count, tenant count, and premium features behind subscription checks in both backend guards and frontend UI.
**Depends on**: Phase 33
**Research**: Unlikely (NestJS guards and Zustand store patterns already established in codebase)
**Plans**: TBD

Plans:
- [x] 35-01: Audit plan limits, implement property/tenant count enforcement, add upgrade prompts

#### Phase 36: Tenant Onboarding Flow

**Goal**: Complete the end-to-end tenant journey: owner invites tenant → tenant accepts invite → tenant can view lease and pay rent. Specifically close the gap on the rent payment flow.
**Depends on**: Phase 34 (Stripe Connect required for rent collection)
**Research**: Unlikely (invitation and portal patterns exist; wiring to payment collection)
**Plans**: TBD

Plans:
- [x] 36-01: Verify invitation → accept → activate → tenant portal → pay rent flow

#### Phase 37: Financial Page Wiring

**Goal**: Verify the financial dashboard shows real data — property expenses, Stripe Connect payouts, transaction history. Fix any pages that show placeholder content or empty states despite data existing.
**Depends on**: Phase 34 (Connect payouts data), Phase 36 (rent transactions)
**Research**: Unlikely (internal data wiring — query hooks and Stripe API patterns established)
**Plans**: TBD

Plans:
- [x] 37-01: Replace tax-documents placeholder, verify all financial pages, fix empty states

### ✅ v6.0 Production Grade Completion (Shipped 2026-02-20)

**Milestone Goal:** Complete every remaining gap — security, performance, test coverage, CI/CD, features, and code quality — so TenantFlow is genuinely production-grade and ready to monetize. No shortcuts. Every item addressed properly.

#### Phase 38: Code Quality — Database Query Hygiene + Compression ✅
Replace all `select('*')` with explicit column lists, add compression middleware, fix route ordering in tenants.controller.

#### Phase 39: Legal Compliance — GDPR/CCPA Data Rights ✅
Implement user data deletion endpoint (`DELETE /users/me`), user data export endpoint (`GET /users/me/export`), and account danger zone UI in settings.

#### Phase 40: Security — Rate Limiting + Auth Endpoint Hardening ✅
Add per-endpoint rate limiting to auth routes, tighten file upload MIME validation, add brute-force protection.

#### Phase 41: Test Coverage — Financial + Billing Services ✅
Unit tests for financial.service, billing.service, rent-payments.service (critical path services with zero coverage).

#### Phase 42: Test Coverage — Infrastructure + Remaining Services ✅
Unit tests for report, dashboard, lease, maintenance, tenant, and user services.

#### Phase 43: CI/CD — Backend Sentry Source Maps + RLS Integration Tests ✅
Upload backend source maps to Sentry on deploy, add RLS integration test suite to CI.

#### Phase 44: DocuSeal E-Signature Integration ✅
Integrate DocuSeal for lease document signing — template creation, signing requests, webhook completion handling. Confirmed production-ready: 25/25 tests passing, 8 API endpoints, full frontend UI, DB migrations applied.

#### Phase 45: Maintenance Vendor Management ✅
Vendor management system — vendors table, CRUD API, assignment to maintenance requests, vendor list UI.

#### Phase 46: Financial Reporting — Year-End + Tax Documents ✅
Year-end summary report, tax document generation (1099 placeholder → real data), PDF export for financial statements.

#### Phase 47: Component Size Refactoring — Frontend Debt ✅
Split all frontend components exceeding 300 lines into focused sub-components across all domains.

#### Phase 48: Move-In/Move-Out Inspection — Database-Backed Implementation ✅
Replace inspection stub with real implementation — inspection form, photo upload, condition tracking, PDF report.

#### Phase 49: Landlord Onboarding Wizard ✅
Multi-step onboarding wizard for new landlords — property setup, Stripe Connect, first tenant invite.

### v7.0 Backend Elimination: NestJS → Supabase Direct (Phases 50-57)

**Milestone Goal:** Eliminate the NestJS/Railway backend entirely. Migrate all 26 frontend hook files (~80 mutations, ~130 queries) from `apiRequest()` → NestJS → Supabase to Supabase PostgREST direct, Supabase Edge Functions, pg_cron scheduled jobs, and DB Webhooks → n8n. End state: no NestJS, no Railway, no additional infrastructure cost beyond Supabase.

---

#### Phase 50: Infrastructure & Auth Foundation + User/Profile CRUD

**Goal**: Stand up the Supabase client infrastructure in the frontend (replacing `apiRequest`), migrate all user/profile/settings/MFA/sessions/notifications/tour-progress hooks to PostgREST, and add a feature-flag mechanism so NestJS and PostgREST can coexist during migration without breaking any live functionality.

**Requirements**: CRUD-05

**Success criteria**:
1. `apps/frontend/src/lib/supabase-client.ts` (browser) and `apps/frontend/src/lib/supabase-server.ts` (server) replace `api-client.ts` as the primary data-access layer.
2. `use-profile.ts`, `use-auth.ts`, `use-mfa.ts`, `use-sessions.ts`, `use-emergency-contact.ts`, `use-identity-verification.ts`, `use-notifications.ts`, `use-owner-notification-settings.ts`, `use-pending-mutations.ts`, and `use-tour-progress.ts` all call `supabase.from()` or `supabase.auth.*` with zero `apiRequest()` calls remaining.
3. A feature flag (`NEXT_PUBLIC_USE_POSTGREST=true`) allows any hook to be toggled back to NestJS without a deploy if a regression is found.
4. All existing frontend unit tests pass; NestJS is still running and handling non-migrated hooks.

**Plans:** 5/5 plans complete

Plans:
- [x] 50-01-PLAN.md — Fix Supabase clients (anon key) + feature flag helper
- [x] 50-02-PLAN.md — Migrate use-profile.ts + use-auth.ts
- [x] 50-03-PLAN.md — Migrate use-sessions.ts + use-emergency-contact.ts
- [x] 50-04-PLAN.md — Migrate use-notifications.ts + use-owner-notification-settings.ts
- [x] 50-05-PLAN.md — Migrate use-identity-verification.ts + use-tour-progress.ts

---

#### Phase 51: Core CRUD Migration — Properties, Units, Tenants, Leases

**Goal**: Migrate the four highest-traffic domain hooks (properties, units, tenants, leases) to Supabase PostgREST. These are pure CRUD with RLS already in place and no external-service calls, making them the safest first domain migration.

**Requirements**: CRUD-01, CRUD-02

**Plans:** 5/5 plans complete

**Success criteria**:
1. `use-properties.ts` and `use-unit.ts` use `supabase.from('properties')` / `supabase.from('units')` for all queries and mutations; `apiRequest` removed from both files.
2. `use-tenant.ts` and `use-lease.ts` use PostgREST for all operations including the tenant invitation flow (invite email remains routed through an Edge Function or stays on NestJS until Phase 55).
3. Full CRUD (create, read, update, soft-delete) works end-to-end for all four domains in the running frontend with NestJS not involved.
4. RLS enforcement verified: an owner cannot read another owner's properties, units, tenants, or leases via direct PostgREST calls.

Plans:
- [x] 51-01-PLAN.md — Shared handlePostgrestError utility + migrate properties (query keys + mutations)
- [x] 51-02-PLAN.md — Migrate units (query keys + mutations) + delete NestJS properties/units modules
- [x] 51-03-PLAN.md — Migrate tenants (query keys + mutations)
- [x] 51-04-PLAN.md — Migrate leases (query keys + mutations) + delete NestJS tenants/leases modules
- [x] 51-05-PLAN.md — Bootstrap apps/integration-tests/ + RLS isolation tests for all four domains

---

#### Phase 52: Operations CRUD Migration — Maintenance, Vendors, Inspections

**Goal**: Migrate the remaining operational-domain hooks — maintenance requests, vendors, and inspections — to PostgREST. These have more complex relations (vendor assignment, room/photo/tenant-review sub-resources) but no external service calls.

**Requirements**: CRUD-03, CRUD-04

**Plans:** 3/3 plans complete

**Success criteria**:
1. `use-maintenance.ts` and `use-vendor.ts` use PostgREST for all queries and mutations including vendor assignment to maintenance requests; `apiRequest` removed from both files.
2. `use-inspections.ts` uses PostgREST for all inspection CRUD including room creation, photo upload metadata, and tenant-review operations.
3. Supabase Storage direct upload (already used for property images) extended to inspection photos — no NestJS file proxy.
4. Maintenance and inspection list pages load correctly; vendor dropdown populates from PostgREST in under 300 ms on cold start.

Plans:
- [x] 52-01-PLAN.md — DB migration (new maintenance statuses) + migrate maintenance-keys.ts, use-maintenance.ts, use-vendor.ts to PostgREST
- [x] 52-02-PLAN.md — Migrate inspection-keys.ts and use-inspections.ts to PostgREST + Storage
- [x] 52-03-PLAN.md — Delete NestJS maintenance and inspections modules + RLS integration tests for 3 domains

---

#### Phase 53: Analytics, Reports & Tenant Portal — RPCs + pg_graphql ✅

**Goal**: Migrate analytics, financial reports, and the tenant portal dashboard to call Supabase RPCs directly (`supabase.rpc()`). Enable pg_graphql for complex multi-join aggregations on the owner dashboard, reducing N+1 PostgREST calls to single requests. Deliver CSV/PDF downloads via an Edge Function.

**Requirements**: REPT-01, REPT-02, REPT-03, GRAPH-01, GRAPH-02

**Plans:** 5/5 plans complete

**Success criteria**:
1. `use-owner-dashboard.ts` and `use-analytics.ts` call `supabase.rpc('get_dashboard_stats', ...)` and related RPCs directly; zero `apiRequest()` calls remain.
2. pg_graphql is enabled on the Supabase project; complex dashboard aggregations (portfolio overview, occupancy trends, revenue by property) use `supabase.rpc('graphql.resolve', { query })` reducing multiple round-trips to one.
3. `use-reports.ts` and `use-financials.ts` use `supabase.rpc()` for all data queries; CSV download calls a new `supabase/functions/export-report` Edge Function returning a blob.
4. `use-tenant-portal.ts` uses PostgREST for all tenant dashboard data (lease details, payment history, maintenance status).
5. All financial and analytics pages render with real data and no console errors; report CSV downloads successfully in the browser.

Plans:
- [x] 53-01-PLAN.md — Migrate use-owner-dashboard.ts + use-analytics.ts to supabase.rpc()
- [x] 53-02-PLAN.md — Migrate use-reports.ts + use-financials.ts to supabase.rpc() + PostgREST
- [x] 53-03-PLAN.md — Migrate use-tenant-portal.ts to PostgREST + 4-section tenant portal dashboard + read-only kanban
- [x] 53-04-PLAN.md — Enable pg_graphql portfolio overview query (GRAPH-01, GRAPH-02)
- [x] 53-05-PLAN.md — Create export-report Supabase Edge Function + wire download mutations

---

#### Phase 54: Payments & Billing — PostgREST + Stripe Edge Functions

**Goal**: Migrate rent payment and payment method hooks to PostgREST. Move Stripe Connect onboarding, Stripe subscription management, and Stripe webhook processing entirely to Supabase Edge Functions. This phase eliminates the NestJS Stripe module — the most complex backend module.

**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04

**Success criteria**:
1. `use-payments.ts` and `use-payment-methods.ts` use PostgREST for payment record queries and mutations; `apiRequest` removed from both files.
2. A new `supabase/functions/stripe-connect` Edge Function handles Stripe Connect onboarding URL generation and account status retrieval; `use-stripe-connect.ts` calls this function.
3. A new `supabase/functions/stripe-webhooks` Edge Function processes all Stripe webhook events (`subscription.*`, `account.updated`, `payment_intent.*`) using `Stripe.constructEventAsync()` with the webhook secret from Edge Function environment variables; webhook delivery verified in Stripe dashboard.
4. `use-billing.ts` calls two new Edge Functions — `supabase/functions/stripe-checkout` (new subscriptions via Stripe Checkout) and `supabase/functions/stripe-billing-portal` (existing subscriber management via Stripe Customer Portal) — `apiRequest` removed.
5. A test Stripe webhook event (`customer.subscription.updated`) delivered to the Edge Function endpoint updates the correct subscription record in Supabase within 5 seconds.

**Plans:** 5/5 plans complete

Plans:
- [x] 54-01-PLAN.md — Migrate use-payments.ts + use-payment-methods.ts to PostgREST (PAY-01)
- [x] 54-02-PLAN.md — Create stripe-connect Edge Function + migrate use-stripe-connect.ts (PAY-02)
- [x] 54-03-PLAN.md — DB migration (stripe_webhook_events) + create stripe-webhooks Edge Function (PAY-03)
- [x] 54-04-PLAN.md — Create stripe-checkout + stripe-billing-portal Edge Functions + migrate use-billing.ts (PAY-04)
- [x] 54-05-PLAN.md — Deploy + human verification checkpoint (all PAY requirements)

---

#### Phase 55: External Services Edge Functions — StirlingPDF & DocuSeal

**Goal**: Replace the NestJS StirlingPDF and DocuSeal service modules with Supabase Edge Functions that call the self-hosted k3s APIs directly. Ensure PDF generation, lease template creation, signing requests, and DocuSeal webhook completions all work through Edge Functions.

**Requirements**: EXT-01, EXT-02

**Plans:** 4/4 plans complete

**Success criteria**:
1. A new `supabase/functions/generate-pdf` Edge Function accepts a report payload, calls the StirlingPDF HTTP API on k3s, and returns a PDF blob; the frontend calls this function directly (replacing the NestJS PDF module).
2. A new `supabase/functions/docuseal` Edge Function handles template creation, signing-request initiation, and DocuSeal webhook completion events; all DocuSeal HTTP calls are made from the Edge Function to the k3s DocuSeal instance.
3. A lease document can be sent for e-signature end-to-end: frontend triggers → Edge Function → DocuSeal on k3s → webhook back to Edge Function → Supabase DB updated with signing status.
4. A year-end financial PDF can be generated end-to-end: frontend triggers → Edge Function → StirlingPDF on k3s → PDF blob returned to browser.
5. Both Edge Functions are deployed and accessible; NestJS StirlingPDF and DocuSeal modules are no longer reachable from the frontend.

Plans:
- [x] 55-01-PLAN.md — generate-pdf Edge Function + wire frontend PDF download mutations (EXT-01)
- [x] 55-02-PLAN.md — docuseal outbound Edge Function + migrate use-lease.ts signature mutations (EXT-02 partial)
- [x] 55-03-PLAN.md — docuseal-webhook Edge Function + human verification checkpoint (EXT-02 completion)
- [x] 55-04-PLAN.md — Gap closure: migrate 4 remaining NestJS PDF callsites to generate-pdf Edge Function (EXT-01)

---

#### Phase 56: Scheduled Jobs & DB Webhooks — pg_cron + n8n

**Goal**: Implement all scheduled jobs as pg_cron entries in Postgres and configure Supabase DB Webhooks to POST to n8n on k3s for background workflow triggers. This replaces any cron or event-driven logic that lived in NestJS.

**Requirements**: SCHED-01, SCHED-02, SCHED-03, WF-01, WF-02

**Plans:** 4/4 plans complete

**Success criteria**:
1. A pg_cron job runs daily and calculates late fees on overdue `rent_payments` records past the configurable grace period, inserting a fee record and updating payment status.
2. A pg_cron job runs daily and checks `leases` with `end_date` within 30, 7, or 1 day(s); for each match it inserts a row into a `lease_reminders` queue table that a DB Webhook picks up and POSTs to n8n.
3. A pg_cron job runs nightly and sets `leases.status = 'expired'` where `end_date < now()` and `status = 'active'`.
4. A DB Webhook fires on `rent_payments` INSERT and POSTs the payment payload to the n8n webhook URL on k3s; n8n workflow sends owner notification and generates receipt.
5. A DB Webhook fires on `maintenance_requests` INSERT and UPDATE and POSTs to n8n; n8n workflow sends assignment notifications and status-update emails.

Plans: 4/4 plans complete

- [x] 56-01-PLAN.md — Schema foundations: pg_cron extension, constraint expansions, late_fees + lease_reminders tables
- [x] 56-02-PLAN.md — pg_cron SQL functions + schedule registrations for all 3 jobs (SCHED-01, SCHED-02, SCHED-03)
- [x] 56-03-PLAN.md — DB webhook trigger functions + triggers for rent_payments, maintenance_requests, lease_reminders (WF-01, WF-02)
- [x] 56-04-PLAN.md — n8n workflow JSON files + human verification checkpoint

---

#### Phase 57: Cleanup & Deletion — Remove NestJS Entirely ✅

**Goal**: Delete the entire `apps/backend/` directory, remove all NestJS dependencies, CI/CD stages, Railway configuration, and frontend adapter code. Cancel the Railway subscription. This is the final irreversible step — executed only after all prior phases are verified working in production.

**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05

**Success criteria**:
1. `apps/backend/` directory does not exist in the repository; `git ls-files apps/backend/` returns empty.
2. All 2229+ NestJS unit tests and integration tests are deleted; `pnpm test:unit:backend` command is removed from `package.json` and CI.
3. CI/CD pipeline (`.github/workflows/`) contains no NestJS build, test, lint, or Railway deploy steps; `pnpm build` completes without referencing `@repo/backend`.
4. No `RAILWAY_*` environment variables remain in any `.env.example`, `turbo.json`, or GitHub Actions secrets documentation; `railway.json` and `Procfile` (if any) are deleted.
5. Frontend codebase contains no `apiRequest`, `apiRequestFormData`, `apiRequestRaw`, or `API_BASE_URL` references; `apps/frontend/src/lib/api-client.ts` is deleted; all `apps/backend` references in `pnpm-workspace.yaml` and `turbo.json` are removed.

**Plans:** 5/5 plans complete

Plans:
- [x] 57-01-PLAN.md — CI/CD cleanup: delete deploy-backend.yml, update ci-cd.yml and rls-security-tests.yml
- [x] 57-02-PLAN.md — Monorepo config cleanup: pnpm-workspace.yaml catalog, root package.json scripts, delete Dockerfile/railway.toml/docker-compose.yml
- [x] 57-03-PLAN.md — Frontend apiRequest migration: delete 4 infrastructure files, migrate all callsites to PostgREST/Edge Functions, stub SSE, migrate auth to ANON_KEY, clean env.ts
- [x] 57-04-PLAN.md — Delete apps/backend/ and verify monorepo integrity (build/typecheck/lint/tests)
- [x] 57-05-PLAN.md — Deploy PR + Sentry health check + Railway offboarding (human checkpoint)

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 18-25. Architecture & Testing | v3.0 | ✅ Complete | 2026-01-20 |
| 26-32. Observability | v4.0 | ✅ Complete | 2026-01-21 |
| 33-37. Production Hardening | v5.0 | ✅ Complete | 2026-02-19 |
| 38. Code Quality | v6.0 | ✅ Complete | 2026-02-20 |
| 39. GDPR/CCPA | v6.0 | ✅ Complete | 2026-02-20 |
| 40. Security Hardening | v6.0 | ✅ Complete | 2026-02-20 |
| 41. Test Coverage — Financial | v6.0 | ✅ Complete | 2026-02-20 |
| 42. Test Coverage — Infrastructure | v6.0 | ✅ Complete | 2026-02-20 |
| 43. CI/CD | v6.0 | ✅ Complete | 2026-02-20 |
| 44. DocuSeal E-Signature | v6.0 | ✅ Complete | 2026-02-20 |
| 45. Vendor Management | v6.0 | ✅ Complete | 2026-02-20 |
| 46. Financial Reporting | v6.0 | ✅ Complete | 2026-02-20 |
| 47. Component Refactoring | v6.0 | ✅ Complete | 2026-02-20 |
| 48. Move-In/Move-Out Inspection | v6.0 | ✅ Complete | 2026-02-20 |
| 49. Landlord Onboarding Wizard | v6.0 | ✅ Complete | 2026-02-20 |
| 50. Infrastructure + User/Profile CRUD | v7.0 | ✅ Complete | 2026-02-22 |
| 51. Core CRUD — Properties, Units, Tenants, Leases | v7.0 | ✅ Complete | 2026-02-21 |
| 52. Ops CRUD — Maintenance, Vendors, Inspections | v7.0 | ✅ Complete | 2026-02-21 |
| 53. Analytics, Reports & Tenant Portal | v7.0 | ✅ Complete | 2026-02-22 |
| 54. Payments & Billing — Stripe Edge Functions | v7.0 | ✅ Complete | 2026-02-22 |
| 55. External Services — StirlingPDF & DocuSeal | v7.0 | ✅ Complete | 2026-02-22 |
| 56. Scheduled Jobs & DB Webhooks | v7.0 | ✅ Complete | 2026-02-22 |
| 57. Cleanup & Deletion | v7.0 | ✅ Complete | 2026-02-24 |
