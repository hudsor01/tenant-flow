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
- [ ] 33-01: Run automated E2E test suite + write SMOKE-TEST-RESULTS.md
- [ ] 33-02: Manual flow verification (owner + tenant) + create ISSUES.md

#### Phase 34: Stripe Connect End-to-End

**Goal**: Complete Stripe Connect onboarding for property owners — surface the CTA in the correct owner UI location, verify the backend onboarding flow, and confirm payouts reach owners after rent is collected.
**Depends on**: Phase 33 (smoke test identifies remaining blockers)
**Research**: Likely (Stripe Connect Express — external API with OAuth flow complexity)
**Research topics**: Connect Express onboarding URL generation, account status webhooks (`account.updated`), transfer vs payout distinction, test mode flows
**Plans**: TBD

Plans:
- [ ] 34-01: Verify and fix Stripe Connect onboarding CTA, dialog, backend, and webhook

#### Phase 35: Subscription Enforcement

**Goal**: Enforce plan limits so Free tier users cannot access Pro features. Gate property count, tenant count, and premium features behind subscription checks in both backend guards and frontend UI.
**Depends on**: Phase 33
**Research**: Unlikely (NestJS guards and Zustand store patterns already established in codebase)
**Plans**: TBD

Plans:
- [ ] 35-01: Audit plan limits, implement property/tenant count enforcement, add upgrade prompts

#### Phase 36: Tenant Onboarding Flow

**Goal**: Complete the end-to-end tenant journey: owner invites tenant → tenant accepts invite → tenant can view lease and pay rent. Specifically close the gap on the rent payment flow.
**Depends on**: Phase 34 (Stripe Connect required for rent collection)
**Research**: Unlikely (invitation and portal patterns exist; wiring to payment collection)
**Plans**: TBD

Plans:
- [ ] 36-01: Verify invitation → accept → activate → tenant portal → pay rent flow

#### Phase 37: Financial Page Wiring

**Goal**: Verify the financial dashboard shows real data — property expenses, Stripe Connect payouts, transaction history. Fix any pages that show placeholder content or empty states despite data existing.
**Depends on**: Phase 34 (Connect payouts data), Phase 36 (rent transactions)
**Research**: Unlikely (internal data wiring — query hooks and Stripe API patterns established)
**Plans**: TBD

Plans:
- [ ] 37-01: Replace tax-documents placeholder, verify all financial pages, fix empty states

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
