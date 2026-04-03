# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- v1.0 **Production Hardening** -- Phases 1-10 (shipped 2026-03-07) | [archive](milestones/v1.0-ROADMAP.md)
- v1.1 **Blog Redesign & CI** -- Phases 11-15 (shipped 2026-03-08) | [archive](milestones/v1.1-ROADMAP.md)
- v1.2 **Production Polish & Code Consolidation** -- Phases 16-20 (shipped 2026-03-11) | [archive](milestones/v1.2-ROADMAP.md)
- v1.3 **Stub Elimination** -- Phases 21-25 (shipped 2026-03-18) | [archive](milestones/v1.3-ROADMAP.md)

## Phases

<details>
<summary>v1.0 Production Hardening (Phases 1-10) -- SHIPPED 2026-03-07</summary>

- [x] Phase 1: RPC & Database Security (2/2 plans) -- completed 2026-03-04
- [x] Phase 2: Financial Fixes (7/7 plans) -- completed 2026-03-05
- [x] Phase 3: Auth & Middleware (6/6 plans) -- completed 2026-03-05
- [x] Phase 4: Edge Function Hardening (4/4 plans) -- completed 2026-03-05
- [x] Phase 5: Code Quality & Type Safety (10/10 plans) -- completed 2026-03-06
- [x] Phase 6: Database Schema & Migrations (7/7 plans) -- completed 2026-03-06
- [x] Phase 7: UX & Accessibility (6/6 plans) -- completed 2026-03-06
- [x] Phase 8: Performance Optimization (7/7 plans) -- completed 2026-03-06
- [x] Phase 9: Testing & CI Pipeline (9/9 plans) -- completed 2026-03-06
- [x] Phase 10: Audit Cleanup (2/2 plans) -- completed 2026-03-07

</details>

<details>
<summary>v1.1 Blog Redesign & CI (Phases 11-15) -- SHIPPED 2026-03-08</summary>

- [x] Phase 11: Blog Data Layer (2/2 plans) -- completed 2026-03-07
- [x] Phase 12: Blog Components & CSS (2/2 plans) -- completed 2026-03-07
- [x] Phase 13: Newsletter Backend (1/1 plans) -- completed 2026-03-07
- [x] Phase 14: Blog Pages (2/2 plans) -- completed 2026-03-08
- [x] Phase 15: CI Optimization (1/1 plans) -- completed 2026-03-08

</details>

<details>
<summary>v1.2 Production Polish & Code Consolidation (Phases 16-20) -- SHIPPED 2026-03-11</summary>

- [x] Phase 16: Shared Cleanup & Dead Code (3/3 plans) -- completed 2026-03-08
- [x] Phase 17: Hooks Consolidation (6/6 plans) -- completed 2026-03-08
- [x] Phase 18: Components Consolidation (6/6 plans) -- completed 2026-03-09
- [x] Phase 19: UI Polish (3/3 plans) -- completed 2026-03-09
- [x] Phase 20: Browser Audit (6/6 plans) -- completed 2026-03-09

</details>

<details>
<summary>v1.3 Stub Elimination (Phases 21-25) -- SHIPPED 2026-03-18</summary>

- [x] Phase 21: Email Invitations (2/2 plans) -- completed 2026-03-11
- [x] Phase 22: GDPR Data Rights (2/2 plans) -- completed 2026-03-11
- [x] Phase 23: Document Templates (2/2 plans) -- completed 2026-03-11
- [x] Phase 23.1: UI/UX Polish (2/2 plans) -- completed 2026-03-18
- [x] Phase 24: Bulk Property Import (2/2 plans) -- completed 2026-03-18
- [x] Phase 25: Maintenance Photos & Stripe Dashboard (2/2 plans) -- completed 2026-03-18

</details>

### v1.5 Code Quality & Deduplication (In Progress)

- [x] **Phase 29: Edge Function Shared Utilities** - Extract duplicated patterns across Edge Functions into shared modules (completed 2026-04-03)
- [x] **Phase 30: Frontend Import & Validation Cleanup** - Remove currency re-export indirection and consolidate phone validation (completed 2026-04-03)
- [ ] **Phase 31: Frontend Hook Factories** - Extract repeated query detail and mutation callback patterns into generic factories

## Phase Details

### Phase 29: Edge Function Shared Utilities
**Goal**: Every Edge Function uses shared utility modules for auth, headers, clients, email layout, and error capture -- eliminating copy-pasted boilerplate across 13+ functions
**Depends on**: Nothing (first phase of v1.5)
**Requirements**: EDGE-01, EDGE-02, EDGE-03, EDGE-04, EDGE-05, EDGE-06
**Success Criteria** (what must be TRUE):
  1. Running `deno test --allow-all --no-check` in `supabase/functions/` passes all existing Edge Function tests with zero regressions
  2. No Edge Function file contains inline `getUser(token)` JWT extraction -- all use `validateBearerAuth()` from `_shared/auth.ts`
  3. No Edge Function file contains inline `new Stripe(key, { apiVersion })` or inline `createClient(url, serviceKey)` -- all use shared factories
  4. Auth email templates and drip email templates share a single `wrapEmailLayout()` function from `_shared/email-layout.ts`
  5. Webhook handlers use `captureWebhookError()` from `_shared/errors.ts` instead of inline error logging
**Plans:** 3/3 plans complete

Plans:
- [ ] 29-01-PLAN.md -- Create shared utility modules (auth, headers, clients, email layout, webhook errors)
- [ ] 29-02-PLAN.md -- Update Stripe-related Edge Functions to use shared utilities
- [ ] 29-03-PLAN.md -- Update non-Stripe Edge Functions to use shared utilities

### Phase 30: Frontend Import & Validation Cleanup
**Goal**: All frontend code imports `formatCurrency` from its canonical source and all form schemas use the shared `phoneSchema` -- removing indirection and inconsistency
**Depends on**: Nothing (independent of Phase 29)
**Requirements**: FRONT-01, FRONT-04
**Success Criteria** (what must be TRUE):
  1. `src/lib/formatters/currency.ts` no longer exists -- the re-export file is deleted
  2. All imports of `formatCurrency` point to `src/lib/utils/currency.ts` (or its `#lib/utils/currency` alias) with zero remaining references to the old path
  3. Every form schema that accepts a phone number uses `phoneSchema` from `src/lib/validation/common.ts` -- no inline phone regex or custom phone validators
  4. All 1,469+ existing unit tests pass with zero failures
**Plans:** 2/2 plans complete

Plans:
- [x] 30-01-PLAN.md -- Eliminate currency re-export wrapper (move formatCents to canonical, update 57 imports, delete wrapper)
- [x] 30-02-PLAN.md -- Replace inline phone validation with shared phoneSchema across 3 schema files

### Phase 31: Frontend Hook Factories
**Goal**: Repeated hook boilerplate for entity detail queries and mutation callbacks is extracted into typed factories, reducing per-hook code by 50%+
**Depends on**: Phase 30 (import paths must be stable before refactoring hooks)
**Requirements**: FRONT-02, FRONT-03
**Success Criteria** (what must be TRUE):
  1. A generic `useEntityDetail<T>()` factory exists in `src/hooks/use-entity-detail.ts` and is used by 8+ entity detail hooks (properties, leases, tenants, etc.)
  2. A `createMutationCallbacks()` utility exists and is used by 15+ mutation hooks to generate `onSuccess`/`onError` callbacks with toast + cache invalidation
  3. All 1,469+ existing unit tests pass with zero failures
  4. No hook file exceeds the 300-line limit after refactoring
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 29 -> 30 -> 31

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 29. Edge Function Shared Utilities | v1.5 | 0/3 | Complete    | 2026-04-03 |
| 30. Frontend Import & Validation Cleanup | v1.5 | 2/2 | Complete   | 2026-04-03 |
| 31. Frontend Hook Factories | v1.5 | 0/TBD | Not started | - |
