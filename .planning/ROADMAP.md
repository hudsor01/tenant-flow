# Roadmap: TenantFlow Health Remediation

## Overview

This roadmap addresses critical technical debt in TenantFlow, progressing from security-critical RLS fixes through database stabilization, test coverage expansion, code quality improvements, and DevOps standardization. Each phase builds a more stable foundation for feature development.

## Domain Expertise

None — internal codebase remediation using established patterns.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Critical Security** - Fix RLS vulnerabilities in active_entitlements and UPDATE policies
- [x] **Phase 2: Database Stability** - Consolidate 35 skipped migrations and fix duplicate functions
- [ ] **Phase 3: Test Coverage** - Add tests for payment/lease systems, enable skipped E2E tests
- [ ] **Phase 4: Code Quality** - Split StripeModule god module, delete dead code, refactor large files
- [ ] **Phase 5: DevOps** - Standardize env vars, add backend CI/CD, decide Go backend fate

## Phase Details

### Phase 1: Critical Security
**Goal**: Eliminate RLS security vulnerabilities that could expose user data
**Depends on**: Nothing (first phase)
**Research**: Unlikely (RLS patterns established in codebase)
**Plans**: TBD

Key tasks from health report:
- Fix active_entitlements `USING (true)` vulnerability (allows all users to see all entitlements)
- Add `WITH CHECK` clause to 5 UPDATE policies missing validation
- Wrap 16 bare `auth.uid()` calls in `(SELECT ...)` for performance
- Review and re-enable security migrations from `.sql.skip` files

Reference: CODEBASE_HEALTH_REPORT.md Section 1.3

### Phase 2: Database Stability
**Goal**: Clear migration backlog and establish stable schema foundation
**Depends on**: Phase 1
**Research**: Unlikely (internal migration consolidation)
**Plans**: TBD

Key tasks from health report:
- Consolidate 9 duplicate function definitions (get_dashboard_stats, etc.)
- Fix property_owner_id → owner_user_id column rename cascade (20+ broken references)
- Add stripe schema existence checks to dependent migrations
- Clear 35 `.sql.skip` migration backlog
- Add migration validation to CI/CD pipeline

Reference: CODEBASE_HEALTH_REPORT.md Sections 1.1, 1.2, 5.3

### Phase 3: Test Coverage
**Goal**: Increase backend coverage from 31% to 70% on critical paths
**Depends on**: Phase 2
**Research**: Unlikely (Jest/Vitest patterns documented in TESTING.md)
**Plans**: 3 (03-01: Stripe tests, 03-02: PDF tests, 03-03: E2E triage)

Key tasks from health report:
- Add tests for stripe-subscription.service.ts (232 lines, 0% coverage)
- Add tests for stripe-customer.service.ts (126 lines, 0% coverage)
- Add tests for pdf-generator.service.ts (604 lines, 0% coverage)
- Enable or delete 51 skipped E2E tests (~43% of E2E suite)
- Add Go backend tests if decision is to keep it

Reference: CODEBASE_HEALTH_REPORT.md Section 3

### Phase 4: Code Quality
**Goal**: Reduce complexity by splitting god module and removing dead code
**Depends on**: Phase 3
**Research**: Unlikely (internal NestJS refactoring patterns)
**Plans**: TBD

Key tasks from health report:
- Split StripeModule into customers/, subscriptions/, webhooks/, connect/ sub-modules
- Delete 5 dead services (property-stats, notification-formatter, etc.)
- Refactor 5 largest files to <500 lines each
- Rename 2 duplicate service names (tenant-stats, metrics)

Reference: CODEBASE_HEALTH_REPORT.md Section 2

### Phase 5: DevOps
**Goal**: Standardize configuration and automate deployment pipeline
**Depends on**: Phase 4
**Research**: Likely (CI/CD setup for Railway deployment)
**Research topics**: GitHub Actions deployment to Railway, Docker registry patterns, migration validation in CI

Key tasks from health report:
- Standardize env var naming (SUPABASE_URL vs NEXT_PUBLIC_*)
- Add .env.local fallback for non-Doppler development
- Add backend auto-deploy to CI/CD (currently manual)
- Decide and act on Go backend status (remove, integrate, or mark experimental)
- Document deployment topology

Reference: CODEBASE_HEALTH_REPORT.md Sections 4, 5

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Critical Security | 2/2 | Complete | 2026-01-15 |
| 2. Database Stability | 2/2 | Complete | 2026-01-15 |
| 3. Test Coverage | 0/3 | Planned | - |
| 4. Code Quality | 0/TBD | Not started | - |
| 5. DevOps | 0/TBD | Not started | - |
