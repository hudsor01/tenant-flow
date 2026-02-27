# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- ✅ **v3.0 Backend Architecture Excellence** - Phases 18-25 (shipped 2026-01-20) — [archive](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Production-Parity Testing & Observability** - Phases 26-32 (shipped 2026-01-21) — [archive](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 Production Hardening & Revenue Completion** - Phases 33-37 (shipped 2026-02-19)
- ✅ **v6.0 Production Grade Completion** - Phases 38-49 (shipped 2026-02-20)
- ✅ **v7.0 Backend Elimination** - Phases 50-57 (shipped 2026-02-24)

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

<details>
<summary>✅ v5.0 Production Hardening & Revenue Completion (Phases 33-37) — SHIPPED 2026-02-19</summary>

**Milestone Goal:** Close the gap between what exists in the codebase and what customers can actually use. Verify every critical flow works end-to-end, wire up Stripe Connect so owners can receive rent payments, enforce subscription plan limits, complete the tenant onboarding flow, and confirm financial pages show real data.

#### Phase 33: Full Smoke Test
Plans:
- [x] 33-01: Run automated E2E test suite + write SMOKE-TEST-RESULTS.md
- [x] 33-02: Manual flow verification (owner + tenant) + create ISSUES.md

#### Phase 34: Stripe Connect End-to-End
Plans:
- [x] 34-01: Verify and fix Stripe Connect onboarding CTA, dialog, backend, and webhook

#### Phase 35: Subscription Enforcement
Plans:
- [x] 35-01: Audit plan limits, implement property/tenant count enforcement, add upgrade prompts

#### Phase 36: Tenant Onboarding Flow
Plans:
- [x] 36-01: Verify invitation → accept → activate → tenant portal → pay rent flow

#### Phase 37: Financial Page Wiring
Plans:
- [x] 37-01: Replace tax-documents placeholder, verify all financial pages, fix empty states

</details>

<details>
<summary>✅ v6.0 Production Grade Completion (Phases 38-49) — SHIPPED 2026-02-20</summary>

**Milestone Goal:** Complete every remaining gap — security, performance, test coverage, CI/CD, features, and code quality — so TenantFlow is genuinely production-grade and ready to monetize.

- Phase 38: Code Quality — Database Query Hygiene + Compression
- Phase 39: Legal Compliance — GDPR/CCPA Data Rights
- Phase 40: Security — Rate Limiting + Auth Endpoint Hardening
- Phase 41: Test Coverage — Financial + Billing Services
- Phase 42: Test Coverage — Infrastructure + Remaining Services
- Phase 43: CI/CD — Backend Sentry Source Maps + RLS Integration Tests
- Phase 44: DocuSeal E-Signature Integration
- Phase 45: Maintenance Vendor Management
- Phase 46: Financial Reporting — Year-End + Tax Documents
- Phase 47: Component Size Refactoring — Frontend Debt
- Phase 48: Move-In/Move-Out Inspection — Database-Backed Implementation
- Phase 49: Landlord Onboarding Wizard

</details>

<details>
<summary>✅ v7.0 Backend Elimination: NestJS → Supabase Direct (Phases 50-57) — SHIPPED 2026-02-24</summary>

**Milestone Goal:** Eliminate the NestJS/Railway backend entirely. Migrate all frontend hooks from apiRequest() to Supabase PostgREST direct, Edge Functions, pg_cron, and DB Webhooks.

- Phase 50: Infrastructure & Auth Foundation + User/Profile CRUD (5/5 plans)
- Phase 51: Core CRUD Migration — Properties, Units, Tenants, Leases (5/5 plans)
- Phase 52: Operations CRUD Migration — Maintenance, Vendors, Inspections (3/3 plans)
- Phase 53: Analytics, Reports & Tenant Portal — RPCs + pg_graphql (5/5 plans)
- Phase 54: Payments & Billing — PostgREST + Stripe Edge Functions (5/5 plans)
- Phase 55: External Services Edge Functions — StirlingPDF & DocuSeal (4/4 plans)
- Phase 56: Scheduled Jobs & DB Webhooks — pg_cron + n8n (4/4 plans)
- Phase 57: Cleanup & Deletion — Remove NestJS Entirely (5/5 plans)

</details>

### v8.0 Post-Migration Hardening + Payment Infrastructure (Phases 58-64)

**Milestone Goal:** Complete the payment revenue engine (Stripe Connect destination charge fee split, receipt emails, autopay) and auth flow gaps, while resolving critical security vulnerabilities, code quality debt, and CI/CD gaps from the v7.0 post-merge review.

- [x] **Phase 58: Security Hardening** - Close 8 active vulnerabilities in Edge Functions and frontend mutations (completed 2026-02-26)
- [x] **Phase 59: Stripe Rent Checkout** - End-to-end rent payment with destination charge fee split (completed 2026-02-27)
- [x] **Phase 60: Receipt Emails** - Automated tenant receipt and owner notification on payment success (completed 2026-02-27)
- [x] **Phase 61: Auth Flow Completion** - Password reset, email confirmation, and Google OAuth routing (completed 2026-02-27)
- [ ] **Phase 62: Code Quality + Performance** - Fix error handling, consolidate hooks, cache auth, batch queries
- [ ] **Phase 63: Testing, CI/CD + Documentation** - RLS write-path tests, pipeline gates, CLAUDE.md modernization
- [ ] **Phase 64: Autopay** - Recurring monthly rent via saved payment method

## Phase Details

### Phase 58: Security Hardening

**Goal**: Close all known security vulnerabilities discovered during the v7.0 post-merge review — Edge Function auth bypass, IDOR, injection, constraint mismatch, and dependency pinning.
**Depends on**: v7.0 complete (Phase 57)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08
**Success Criteria** (what must be TRUE):
  1. DocuSeal webhook handler returns 401 for requests without a valid signature or authorization header; no unauthenticated caller can manipulate lease status
  2. DocuSeal and generate-pdf Edge Functions reject requests where the authenticated user does not own the target lease or report; a cross-tenant IDOR attempt returns 403
  3. Stripe webhook notification_type INSERT succeeds for all actual Stripe event types without CHECK constraint violations
  4. All 6 frontend insert mutations (properties, units, tenants, leases, maintenance_requests, inspections) guard against undefined owner_user_id before calling PostgREST
  5. Search inputs on properties, units, tenants, and maintenance pages cannot inject PostgREST filter operators; all 4 inputs are sanitized
**Plans**: TBD

---

### Phase 59: Stripe Rent Checkout

**Goal**: Tenants can pay rent through the platform with Stripe Connect destination charges, routing funds to the owner's Express account with a platform application fee.
**Depends on**: Phase 58 (security vulnerabilities closed before new payment surface)
**Requirements**: PAY-01, PAY-02
**Success Criteria** (what must be TRUE):
  1. Tenant clicks "Pay Rent" on the tenant portal, is redirected to Stripe Checkout, completes payment, and sees a confirmation page
  2. Owner's Stripe Express account receives the rent amount minus the platform application fee; the platform receives the configured fee
  3. A `rent_payments` record with `status = succeeded` is created in the database after Stripe webhook delivery
  4. If the owner's connected account has `charges_enabled = false`, the tenant sees a clear error message instead of an opaque Stripe failure
**Plans**: TBD

---

### Phase 60: Receipt Emails

**Goal**: Automated receipt and notification emails fire on every successful rent payment, with email suppression respected and webhook reliability preserved.
**Depends on**: Phase 59 (rent checkout must populate PaymentIntent metadata used by receipt template)
**Requirements**: PAY-03, PAY-04, PAY-05
**Success Criteria** (what must be TRUE):
  1. Tenant receives a branded HTML receipt email within 60 seconds of successful rent payment, showing amount, property, and date
  2. Owner receives a notification email within 60 seconds of tenant payment success, showing tenant name, amount, and property
  3. If a tenant or owner email is on the Resend suppression list, no email is sent and no error is thrown
  4. Stripe webhook handler always returns 200 regardless of email delivery outcome; a Resend failure does not cause webhook retries
**Plans**:
- [x] 60-01: Email infrastructure (Resend helper + React Email templates)
- [x] 60-02: Wire email sending into stripe-webhooks handler

---

### Phase 61: Auth Flow Completion

**Goal**: Users can complete all authentication flows end-to-end — password reset via email link, email confirmation after signup, and Google OAuth with correct dashboard routing.
**Depends on**: v7.0 complete (Phase 57) — independent of Phases 58-60
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User clicks "Forgot Password," receives email, clicks link, lands on reset page, enters new password, and can log in with the new password
  2. After signup, user sees an email confirmation page with a "Resend" button; clicking the confirmation link in email activates the account
  3. User signing up via Google OAuth is assigned the correct user_type (owner or tenant) and is routed to the matching dashboard on first login
**Plans**: TBD

---

### Phase 62: Code Quality + Performance

**Goal**: Eliminate accumulated code quality debt (duplicate hooks, error handling noise, dead stubs) and resolve performance bottlenecks (auth fan-out, N+1 queries, serial lookups, unbounded exports).
**Depends on**: Phase 58 (security hardening resolves owner_user_id guards and sanitization that overlap with code quality)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Error toasts appear once per error, not twice; double-toast pattern eliminated across all 20+ mutation hooks
  2. Payment method hooks use a single consolidated module; no duplicate hook definitions exist
  3. All 4 runtime-throw TODO stubs are replaced with real implementations or explicit "not supported" UI; no `throw new Error('TODO')` remains in production code
  4. Tenant portal loads in a single PostgREST query (not 3 serial requests); batch tenant operations use single RPCs
  5. CSV export queries include a row limit; the 86 getUser() fan-out calls are replaced with a cached auth pattern
**Plans**: TBD

---

### Phase 63: Testing, CI/CD + Documentation

**Goal**: Harden the testing and deployment pipeline — RLS write-path isolation tests gate PRs, E2E tests run in CI, and CLAUDE.md reflects the current Supabase-only architecture.
**Depends on**: Phase 58 (security fixes may affect RLS policies tested here)
**Requirements**: TEST-01, TEST-02, TEST-03, CICD-01, CICD-02, DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):
  1. RLS write-path isolation tests cover INSERT, UPDATE, and DELETE for all 7 domains (properties, units, tenants, leases, maintenance, vendors, inspections); a cross-tenant write attempt fails with RLS violation
  2. RLS integration tests run on a dedicated Supabase project and gate PR merges; a failing RLS test blocks the PR
  3. E2E test suite runs as a smoke check in CI with all required environment variables resolved; stale NestJS intercepts are removed
  4. CLAUDE.md contains no NestJS references and documents PostgREST query patterns, Edge Function patterns, and the RLS-only security model
**Plans**: TBD

---

### Phase 64: Autopay

**Goal**: Tenants can enable recurring monthly rent payments using a saved payment method, eliminating the need to manually pay each month.
**Depends on**: Phase 59 (rent checkout must work end-to-end; autopay reuses the same destination charge pattern with `setup_future_usage`)
**Requirements**: PAY-06
**Success Criteria** (what must be TRUE):
  1. Tenant can toggle autopay on from the tenant portal payment settings
  2. On the rent due date, a payment is automatically charged to the tenant's saved payment method with the same destination charge fee split as manual checkout
  3. If the automatic charge fails (card declined, insufficient funds), the tenant receives a notification and the payment status reflects the failure
**Plans**: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 58 → 59 → 60 → 61 → 62 → 63 → 64
Note: Phases 61 and 63 can be parallelized with phases 59/60 as they share no dependencies.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 18-25. Architecture & Testing | v3.0 | - | ✅ Complete | 2026-01-20 |
| 26-32. Observability | v4.0 | - | ✅ Complete | 2026-01-21 |
| 33-37. Production Hardening | v5.0 | - | ✅ Complete | 2026-02-19 |
| 38-49. Production Grade | v6.0 | - | ✅ Complete | 2026-02-20 |
| 50-57. Backend Elimination | v7.0 | - | ✅ Complete | 2026-02-24 |
| 58. Security Hardening | 3/3 | Complete    | 2026-02-26 | - |
| 59. Stripe Rent Checkout | 2/2 | Complete    | 2026-02-27 | - |
| 60. Receipt Emails | 2/2 | Complete   | 2026-02-27 | - |
| 61. Auth Flow Completion | 3/3 | Complete | 2026-02-27 | - |
| 62. Code Quality + Performance | v8.0 | 0/? | Not started | - |
| 63. Testing, CI/CD + Documentation | v8.0 | 0/? | Not started | - |
| 64. Autopay | v8.0 | 0/? | Not started | - |
