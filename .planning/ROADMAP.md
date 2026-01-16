# Roadmap: TenantFlow Health Remediation

## Overview

This roadmap addresses critical technical debt in TenantFlow, progressing from security-critical RLS fixes through database stabilization, test coverage expansion, code quality improvements, and DevOps standardization. Each phase builds a more stable foundation for feature development.

## Milestones

- ✅ **v1.0 Health Remediation** - Phases 1-5 (shipped 2026-01-15)
- ✅ **v1.1 Tech Debt Resolution** - Phases 6-10 (shipped 2026-01-15)

## Domain Expertise

None — internal codebase remediation using established patterns.

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

## Phase Details

### Phase 6: Stripe Controller Split
**Goal**: Break stripe.controller.ts (760 lines) into focused controllers by operation type
**Depends on**: Phase 5 (v1.0 complete)
**Research**: Unlikely (internal NestJS patterns)
**Plans**: TBD

Key tasks from TECH_DEBT.md:
- Split into charges.controller.ts (charge and refund operations)
- Split into checkout.controller.ts (checkout session operations)
- Split into invoices.controller.ts (invoice operations)
- Keep shared utilities in stripe.controller.ts or extract to shared

### Phase 7: Reports Controller Split
**Goal**: Break reports.controller.ts (703 lines) into report-type controllers
**Depends on**: Phase 6
**Research**: Unlikely (internal patterns)
**Plans**: TBD

Key tasks from TECH_DEBT.md:
- Extract financial reports to financial-reports.controller.ts
- Extract property reports to property-reports.controller.ts
- Extract tenant reports to tenant-reports.controller.ts
- Consider route module pattern for grouping

### Phase 8: Service Decomposition
**Goal**: Split oversized services into focused, single-responsibility services
**Depends on**: Phase 7
**Research**: Unlikely (internal patterns)
**Plans**: TBD

Key tasks from TECH_DEBT.md:
- pdf-generator.service.ts (604 lines): Extract invoice/lease PDF generators
- utility.service.ts (590 lines): Split into SearchService, PasswordService, UserTypeService

### Phase 9: Connect Payouts
**Goal**: Extract payouts functionality from connect.controller.ts (605 lines)
**Depends on**: Phase 8
**Research**: Unlikely (internal patterns)
**Plans**: TBD

Key tasks from TECH_DEBT.md:
- Extract payouts.controller.ts for payout-specific operations
- Keep account management in connect.controller.ts
- Update ConnectModule imports

### Phase 10: Final Polish
**Goal**: Review remaining tech debt, update documentation, verify improvements
**Depends on**: Phase 9
**Research**: Unlikely (documentation)
**Plans**: TBD

Key tasks:
- Update TECH_DEBT.md with resolved items
- Verify all high-priority items addressed
- Document any remaining low-priority items for future
- Final typecheck and test verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

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
