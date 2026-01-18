# Roadmap: TenantFlow Health Remediation

## Overview

This roadmap addresses critical technical debt in TenantFlow, progressing from security-critical RLS fixes through database stabilization, test coverage expansion, code quality improvements, and DevOps standardization. Each phase builds a more stable foundation for feature development.

## Milestones

- ✅ **v1.0 Health Remediation** - Phases 1-5 (shipped 2026-01-15)
- ✅ **v1.1 Tech Debt Resolution** - Phases 6-10 (shipped 2026-01-15)
- ✅ **v2.0 Stripe Integration Excellence** - Phases 11-17 (shipped 2026-01-17)

## Domain Expertise

- Official Stripe Documentation (https://docs.stripe.com)
- Stripe API Reference (https://stripe.com/docs/api)
- Stripe.js & Elements (https://stripe.com/docs/js)
- Stripe Connect (https://stripe.com/docs/connect)
- Stripe Webhooks (https://stripe.com/docs/webhooks)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 Health Remediation (Phases 1-5) - SHIPPED 2026-01-15</summary>

- [x] **Phase 1: Critical Security** - Fix RLS vulnerabilities in active_entitlements and UPDATE policies
- [x] **Phase 2: Database Stability** - Consolidate 35 skipped migrations and fix duplicate functions
- [x] **Phase 3: Test Coverage** - Add tests for payment/lease systems, enable skipped E2E tests
- [x] **Phase 4: Code Quality** - Split StripeModule god module, delete dead code, refactor large files
- [x] **Phase 5: DevOps** - Type-safe env validation, backend CI/CD automation

### Phase 1: Critical Security
**Goal**: Eliminate RLS security vulnerabilities that could expose user data
**Plans**: 2/2 complete

### Phase 2: Database Stability
**Goal**: Clear migration backlog and establish stable schema foundation
**Plans**: 2/2 complete

### Phase 3: Test Coverage
**Goal**: Increase backend coverage from 31% to 70% on critical paths
**Plans**: 3/3 complete

### Phase 4: Code Quality
**Goal**: Split StripeModule god module, delete dead code, refactor large files
**Plans**: 6/6 complete

### Phase 5: DevOps
**Goal**: Type-safe env validation and automated deployment pipeline
**Plans**: 4/4 complete

</details>

<details>
<summary>✅ v1.1 Tech Debt Resolution (Phases 6-10) - SHIPPED 2026-01-15</summary>

**Milestone Goal:** Resolve remaining large controller/service files documented in TECH_DEBT.md

- [x] **Phase 6: Stripe Controller Split** - stripe.controller.ts: 760 → 116 lines (-85%)
- [x] **Phase 7: Reports Controller Split** - reports.controller.ts: 703 → 176 lines (-75%)
- [x] **Phase 8: Service Decomposition** - utility.service.ts: 590 → 286 lines (-52%), PDF assessed acceptable
- [x] **Phase 9: Connect Payouts** - connect.controller.ts: 605 → 460 lines (-24%)
- [x] **Phase 10: Final Polish** - TECH_DEBT.md updated, documentation complete

### Phase 6: Stripe Controller Split
**Goal**: Break stripe.controller.ts into focused controllers
**Plans**: 1/1 complete

### Phase 7: Reports Controller Split
**Goal**: Break reports.controller.ts into report-type controllers
**Plans**: 1/1 complete

### Phase 8: Service Decomposition
**Goal**: Split utility.service.ts, assess pdf-generator.service.ts
**Plans**: 1/1 complete

### Phase 9: Connect Payouts
**Goal**: Extract payouts from connect.controller.ts
**Plans**: 1/1 complete

### Phase 10: Final Polish
**Goal**: Update documentation, verify improvements
**Plans**: 1/1 complete

</details>

<details>
<summary>✅ v2.0 Stripe Integration Excellence (Phases 11-17) - SHIPPED 2026-01-17</summary>

**Milestone Goal:** Achieve production-perfect Stripe integration across the full stack — fix all backend issues, implement proper frontend UI, and align everything with official Stripe documentation best practices.

**Issues Being Addressed:**
- TEST-002: Payment services lack unit test coverage (HIGH)
- Pagination hard limit of 1,000 items causing data truncation (HIGH)
- Webhook race conditions and missing transaction wrapping (MEDIUM)
- RLS bypass in webhook handlers without tenant verification (MEDIUM)
- Stripe Sync Engine missing monitoring/observability (MEDIUM)
- Idempotency key generation untested (LOW)
- Console.log debug statements in production scripts (LOW)

**Phase Order:** Fix issues → Implement features → Align with docs → Test everything

- [x] **Phase 11: Stripe Backend Hardening** - Fix pagination, monitoring, and debug logging (4/4 plans)
- [x] **Phase 12: Webhook Security & Reliability** - Fix race conditions, RLS enforcement, transactions
- [x] **Phase 13: Frontend Checkout & Subscriptions** - Checkout UI, subscription management, payment methods (3/3 plans)
- [x] **Phase 14: Stripe Connect & Payouts UI** - Connect onboarding, payout dashboard (2/2 plans)
- [x] **Phase 15: Stripe Documentation Alignment** - Align all code with official Stripe best practices (1/1 plans)
- [x] **Phase 16: Stripe Backend Test Coverage** - Add comprehensive unit tests for payment services (3/3 plans)
- [x] **Phase 17: Stripe E2E & Production Readiness** - E2E tests, production verification (2/2 plans)

#### Phase 11: Stripe Backend Hardening
**Goal**: Fix pagination limits, add Sync Engine monitoring, clean debug logs
**Depends on**: v1.1 complete
**Research**: Likely (Stripe API pagination, rate limits)
**Research topics**: Stripe pagination best practices, rate limit handling, auto-pagination, error codes
**Plans**: TBD

Key tasks:
- Remove 1,000 item hard limit in subscription.service.ts
- Add warning/error when pagination limit approached
- Add Stripe Sync Engine connection pool monitoring
- Replace console.log with structured logging in scripts
- Add metrics for Stripe API call latency and errors

#### Phase 12: Webhook Security & Reliability
**Goal**: Fix race conditions, add RLS enforcement, wrap processing in transactions
**Depends on**: Phase 11
**Research**: Likely (Stripe webhook best practices)
**Research topics**: Webhook idempotency, retry behavior, event ordering, signature verification, error handling
**Plans**: TBD

Key tasks:
- Wrap webhook processing in database transactions
- Add explicit tenant ownership verification in handlers
- Fix post-processing sync issue (mark processed atomically)
- Add dead letter queue for failed webhooks
- Implement webhook event replay capability

#### Phase 13: Frontend Checkout & Subscriptions
**Goal**: Implement proper checkout UI, subscription management, payment method handling
**Depends on**: Phase 12
**Research**: Likely (Stripe.js, Elements, Checkout Sessions)
**Research topics**: Stripe.js initialization, Elements styling, Checkout Sessions vs embedded, Customer Portal, Payment Element
**Plans**: TBD

Key tasks:
- Implement Stripe Elements for card collection
- Build subscription selection and upgrade/downgrade UI
- Add payment method management (add/remove/default)
- Integrate Stripe Customer Portal for self-service
- Handle SCA/3D Secure authentication flows

#### Phase 14: Stripe Connect & Payouts UI
**Goal**: Build Connect account onboarding and payout management dashboard
**Depends on**: Phase 13
**Research**: Likely (Stripe Connect documentation)
**Research topics**: Connect account types (Express/Standard/Custom), onboarding flows, payout schedules, account capabilities
**Plans**: TBD

Key tasks:
- Build Connect account onboarding flow
- Implement account status dashboard
- Add payout schedule configuration UI
- Build payout history and details view
- Handle account verification requirements

#### Phase 15: Stripe Documentation Alignment
**Goal**: Comprehensive review and alignment with official Stripe documentation
**Depends on**: Phase 14
**Research**: Likely (full Stripe API reference)
**Research topics**: Stripe integration checklist, API versioning, deprecation warnings, best practices guide
**Plans**: TBD

Key tasks:
- Audit all Stripe API calls against current docs
- Update to recommended API patterns
- Implement Stripe's error handling best practices
- Add proper API version pinning
- Review and update metadata usage

#### Phase 16: Stripe Backend Test Coverage
**Goal**: Add comprehensive unit tests for all payment services (addresses TEST-002)
**Depends on**: Phase 15
**Research**: Likely (Stripe testing best practices)
**Research topics**: Stripe test mode, mocking strategies, test clocks, idempotency testing
**Plans**: TBD

Key tasks:
- Add unit tests for stripe-subscription.service.ts
- Add unit tests for stripe-customer.service.ts
- Add unit tests for connect-setup.service.ts
- Test idempotency key generation and collision handling
- Test error scenarios and retry logic

#### Phase 17: Stripe E2E & Production Readiness
**Goal**: Full E2E test coverage and production readiness verification
**Depends on**: Phase 16
**Research**: Likely (Stripe testing and go-live)
**Research topics**: Test clocks, webhook testing, Stripe CLI, go-live checklist, monitoring best practices
**Plans**: TBD

Key tasks:
- Add E2E tests for complete payment flows
- Add E2E tests for subscription lifecycle
- Add E2E tests for Connect onboarding
- Implement Stripe CLI webhook testing
- Complete Stripe go-live checklist
- Add production monitoring dashboards

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Critical Security | v1.0 | 2/2 | Complete | 2026-01-15 |
| 2. Database Stability | v1.0 | 2/2 | Complete | 2026-01-15 |
| 3. Test Coverage | v1.0 | 3/3 | Complete | 2026-01-15 |
| 4. Code Quality | v1.0 | 6/6 | Complete | 2026-01-15 |
| 5. DevOps | v1.0 | 4/4 | Complete | 2026-01-15 |
| 6. Stripe Controller Split | v1.1 | 1/1 | Complete | 2026-01-15 |
| 7. Reports Controller Split | v1.1 | 1/1 | Complete | 2026-01-15 |
| 8. Service Decomposition | v1.1 | 1/1 | Complete | 2026-01-15 |
| 9. Connect Payouts | v1.1 | 1/1 | Complete | 2026-01-15 |
| 10. Final Polish | v1.1 | 1/1 | Complete | 2026-01-15 |
| 11. Stripe Backend Hardening | v2.0 | 4/4 | Complete | 2026-01-17 |
| 12. Webhook Security & Reliability | v2.0 | 3/3 | Complete | 2026-01-17 |
| 13. Frontend Checkout & Subscriptions | v2.0 | 3/3 | Complete | 2026-01-17 |
| 14. Stripe Connect & Payouts UI | v2.0 | 2/2 | Complete | 2026-01-17 |
| 15. Stripe Documentation Alignment | v2.0 | 1/1 | Complete | 2026-01-17 |
| 16. Stripe Backend Test Coverage | v2.0 | 3/3 | Complete | 2026-01-17 |
| 17. Stripe E2E & Production Readiness | v2.0 | 2/2 | Complete | 2026-01-17 |

</details>
