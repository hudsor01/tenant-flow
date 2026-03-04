# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- ✅ **v3.0 Backend Architecture Excellence** - Phases 18-25 (shipped 2026-01-20) — [archive](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Production-Parity Testing & Observability** - Phases 26-32 (shipped 2026-01-21) — [archive](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 Production Hardening & Revenue Completion** - Phases 33-37 (shipped 2026-02-19)
- ✅ **v6.0 Production Grade Completion** - Phases 38-49 (shipped 2026-02-20)
- ✅ **v7.0 Backend Elimination** - Phases 50-57 (shipped 2026-02-24)
- ✅ **v8.0 Post-Migration Hardening + Payment Infrastructure** - Phases 58-64 (shipped 2026-02-27)

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

<details>
<summary>✅ v8.0 Post-Migration Hardening + Payment Infrastructure (Phases 58-64) — SHIPPED 2026-02-27</summary>

**Milestone Goal:** Complete the payment revenue engine (Stripe Connect destination charge fee split, receipt emails, autopay) and auth flow gaps, while resolving critical security vulnerabilities, code quality debt, and CI/CD gaps from the v7.0 post-merge review.

- [x] Phase 58: Security Hardening (3/3 plans)
- [x] Phase 59: Stripe Rent Checkout (2/2 plans)
- [x] Phase 60: Receipt Emails (2/2 plans)
- [x] Phase 61: Auth Flow Completion (3/3 plans)
- [x] Phase 62: Code Quality + Performance (3/3 plans)
- [x] Phase 63: Testing, CI/CD + Documentation (3/3 plans)
- [x] Phase 64: Autopay (2/2 plans)

</details>

### v9.0 Testing Strategy Consolidation (Phases 05-08)

**Milestone Goal:** Unify the fragmented test infrastructure (Vitest + Jest + scattered directories) into a single-runner Testing Trophy architecture with MSW for component tests, faker factories for test data, and a trimmed E2E suite. Design doc: `docs/plans/2026-03-03-testing-strategy-design.md`.

- [ ] **Phase 05: Vitest Unification + File Consolidation** - Single Vitest runner with projects config, Jest removal, orphaned file cleanup
- [ ] **Phase 06: Test Data Factories** - Faker-based factory functions for all core entities, replacing static DEFAULT_* objects
- [ ] **Phase 07: MSW + Component Test Layer** - Network-level API mocking with MSW 2.x and component test pattern with RTL
- [ ] **Phase 08: E2E Optimization + CI Pipeline** - Playwright cleanup, critical path tagging, unified CI workflow

## Phase Details

### Phase 05: Vitest Unification + File Consolidation
**Goal**: All tests run under a single Vitest runner with named projects (unit, component, integration), Jest is fully removed, and orphaned test files are relocated to their correct co-located directories.
**Depends on**: v8.0 complete (Phase 04)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. Running `pnpm test:unit` executes the Vitest "unit" project; running `pnpm test:integration` executes the Vitest "integration" project; running `pnpm test:component` executes the Vitest "component" project -- all from a single `vitest.config.ts`
  2. All 7 RLS integration test files pass under the Vitest node project with the same assertions and Supabase connection as before; no Jest runner remains
  3. `jest`, `ts-jest`, and `@types/jest` do not appear in `package.json` dependencies or devDependencies; no `jest.config.*` files exist in the repo
  4. The `tests/unit/` directory no longer exists; `pricing-premium.spec.ts` lives next to its source code in `src/`; all orphaned `src/__tests__/` files are in co-located `__tests__/` directories adjacent to their source modules
**Plans**: TBD

---

### Phase 06: Test Data Factories
**Goal**: Every test that needs domain entity data can call a `build*()` factory function that returns a realistic, randomized object -- eliminating brittle static `DEFAULT_*` constants.
**Depends on**: Phase 05 (Vitest projects config must exist so factories are importable from both unit and component test projects)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Factory functions exist for property, tenant, lease, unit, maintenance request, and user entities in `src/test/factories/` with one file per entity
  2. Calling `buildProperty()` returns a complete `Property` object with faker-generated data; calling `buildProperty({ name: 'Custom' })` returns an object with the override applied and all other fields randomized
  3. No test file imports `DEFAULT_PROPERTY`, `DEFAULT_TENANT`, `DEFAULT_LEASE`, or any other `DEFAULT_*` constant from `test-data.ts`; all have been migrated to factory calls
**Plans**: TBD

---

### Phase 07: MSW + Component Test Layer
**Goal**: Developers can write component tests that render real React component trees with TanStack Query, hitting MSW-intercepted network requests that return realistic mock data -- exercising the full component stack without a running backend.
**Depends on**: Phase 06 (factory functions provide the response data that MSW handlers return)
**Requirements**: MOCK-01, MOCK-02, MOCK-03, COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. MSW 2.x server starts before component tests and intercepts all `fetch` calls; unhandled requests produce a warning (not a silent pass or hard failure)
  2. Default MSW handlers exist for Supabase PostgREST endpoints (properties, tenants, leases) and at least one RPC (dashboard stats), returning factory-built data
  3. At least 3 `.component.test.tsx` files demonstrate the full pattern: render a component inside QueryClientProvider, trigger a user interaction with `userEvent`, assert on screen content populated by MSW-mocked API responses
  4. Component tests run as a separate Vitest project (`pnpm test:component`) and do not execute when running `pnpm test:unit`
  5. All component tests follow RTL best practices: `getByRole` query priority, `userEvent.setup()` before render, `screen.*` accessors, `findBy*` for async content
**Plans**: TBD

---

### Phase 08: E2E Optimization + CI Pipeline
**Goal**: Playwright tests target real critical user journeys without stale monorepo paths, and the CI pipeline runs the unified Vitest suite on PRs with E2E reserved for merge-to-main.
**Depends on**: Phase 07 (CI workflow must reference the finalized Vitest project names)
**Requirements**: E2E-01, E2E-02, E2E-03, CI-01, CI-02, CI-03
**Success Criteria** (what must be TRUE):
  1. Playwright config contains no references to `apps/frontend`, `apps/e2e-tests`, or any stale monorepo paths; `pnpm test:e2e` runs successfully from the repo root
  2. Critical-path E2E tests are tagged and cover: auth login/signup, property CRUD, rent payment checkout, and tenant portal access; non-critical tests are documented as candidates for migration to component tests
  3. GitHub Actions PR workflow runs `vitest --project unit --project component` and `vitest --project integration` in parallel, replacing the previous separate unit + Jest RLS workflows
  4. Vitest CI output uses `--reporter=github-actions` so test failures appear as inline PR annotations on the failing lines
  5. E2E tests run only on merge to main (not on every PR push); the PR workflow completes without waiting for Playwright

---

## Progress

**Execution Order:**
Phases execute in numeric order: 05 → 06 → 07 → 08

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01-04. Hardening + Payments | v8.0 | - | Complete | 2026-02-27 |
| 05. Vitest Unification + File Consolidation | v9.0 | 0/? | Not started | - |
| 06. Test Data Factories | v9.0 | 0/? | Not started | - |
| 07. MSW + Component Test Layer | v9.0 | 0/? | Not started | - |
| 08. E2E Optimization + CI Pipeline | v9.0 | 0/? | Not started | - |
