# Technical Debt Backlog

**Last Updated:** 2026-01-17
**Source:** Phase 4 Code Quality - Deferred items from CODEBASE_HEALTH_REPORT.md Section 2

## Overview

Items deferred from Phase 4: Code Quality for future milestones. These do not block current development but should be addressed to maintain code health.

---

## v1.1 Tech Debt Resolution Summary

Milestone v1.1 (Phases 6-10) addressed the high-priority and medium-priority items:

| Phase | File | Before | After | Change |
|-------|------|--------|-------|--------|
| 6 | stripe.controller.ts | 760 | 116 | -85% |
| 7 | reports.controller.ts | 703 | 176 | -75% |
| 8 | utility.service.ts | 590 | 286 | -52% |
| 9 | connect.controller.ts | 605 | 460 | -24% |

**Total lines removed from large files:** ~1,620 lines
**New focused files created:** 8

---

## Large Files (>500 lines)

After v1.1 refactoring, these files have been addressed:

### Resolved (v1.1)

| File | Before | After | Resolution |
|------|--------|-------|------------|
| `modules/billing/stripe.controller.ts` | 760 | 116 | Split into charges, checkout, invoices controllers |
| `modules/reports/reports.controller.ts` | 703 | 176 | Split into export, generation, analytics controllers |
| `modules/billing/connect/connect.controller.ts` | 605 | 460 | Extracted payouts controller |
| `shared/services/utility.service.ts` | 590 | 286 | Split into search, password services |

### Remaining (Acceptable)

Files assessed and accepted as-is due to cohesive responsibilities:

| File | Lines | Reason Acceptable |
|------|-------|-------------------|
| `modules/pdf/pdf-generator.service.ts` | 604 | Cohesive PDF generation; 8 supporting services already exist |
| `modules/maintenance/analytics.controller.ts` | 610 | Standard analytics grouping |
| `subscriptions/subscription-query.service.ts` | 534 | Acceptable complexity for query service |
| `modules/rent-payments/payment-analytics.service.ts` | 526 | Could extract calculation helpers (future) |
| `modules/late-fees/late-fees.service.ts` | 539 | Single responsibility |
| `modules/reports/financial-report.service.ts` | 511 | Acceptable for report service |

### Low Priority (Stable)

Stable files that rarely change - refactoring would add complexity without clear benefit.

| File | Lines | Reason |
|------|-------|--------|
| `modules/leases/lease-signature.service.ts` | 801 | Already has 3 helper services; assessed in 04-05 |
| `modules/maintenance/maintenance.service.ts` | 557 | Reduced in 04-05 from 659 |
| `modules/billing/subscriptions/payment-methods.controller.ts` | 585 | Standard for Stripe complexity |
| `modules/rent-payments/rent-payments.controller.ts` | 565 | Standard controller size |
| `modules/users/users.controller.ts` | 544 | Standard controller size |
| `modules/stripe-sync/stripe-sync.controller.ts` | 542 | Standard controller size |
| `modules/email/n8n-email-webhook.controller.ts` | 522 | Single integration point |

---

## Code Quality Items

### Architecture

#### ARCH-001: Controller Size Pattern (DOCUMENTED)

Many controllers exceed 500 lines. This is acceptable when:
- Controllers are thin layers delegating to services
- Routes are logically grouped
- Swagger documentation adds significant lines

**Decision:** Do not split controllers solely for line count. Split only when responsibilities diverge.

#### ARCH-002: StripeModule Decomposition (COMPLETED v1.0)

StripeModule was decomposed in Phase 4:
- **Before:** 15 services, 6 controllers, ~1000 lines
- **After:** 79 lines, 7 providers, 2 controllers
- **Extracted:** WebhooksModule, ConnectModule, SubscriptionsModule

**Status:** RESOLVED

#### ARCH-003: Orphaned Go Backend (REMOVED)

`apps/backend-go/` reference removed from consideration - user confirmed it was exploratory only.

**Status:** RESOLVED (Not applicable)

### Patterns

#### PATTERN-001: Controller Swagger Documentation (DOCUMENTED)

Controllers have extensive Swagger decorators that increase line counts:
- `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`, `@ApiBody`

This is acceptable as documentation is valuable for API consumers.

#### PATTERN-002: Inconsistent Search Implementation (RESOLVED v1.1)

Global search extracted to `SearchService` in Phase 8.

**Status:** RESOLVED

### Testing

#### TEST-001: Skipped E2E Tests (51 tests)

~43% of E2E tests are marked `.skip()` or `.todo()`.

**Action Required:** Review each skipped test:
- Fix and enable if implementation complete
- Delete if obsolete
- Document blocker if waiting on feature

**Priority:** Medium - for future milestone

#### TEST-002: Payment System Test Coverage (RESOLVED v2.0)

Payment-related services now have comprehensive unit test coverage:
- `stripe-subscription.service.ts` - 89 tests
- `stripe-customer.service.ts` - 56 tests
- `connect-setup.service.ts` - 47 tests
- Idempotency key testing - 20 tests

**Status:** RESOLVED in Phase 16 (Stripe Backend Test Coverage)

#### TEST-003: PDF Generator Test Coverage

`pdf-generator.service.ts` has no unit tests.

**Priority:** Medium - lease generation bugs have legal impact

---

## StripeModule Final State (Post v1.1)

### Metrics

| Metric | Before v1.0 | After v1.0 | After v1.1 | Total Change |
|--------|-------------|------------|------------|--------------|
| stripe.module.ts lines | ~150 | 79 | 79 | -47% |
| stripe.controller.ts | 760 | 760 | 116 | -85% |
| connect.controller.ts | 605 | 605 | 460 | -24% |
| New controllers | 0 | 0 | 4 | +4 |

### Structure (Post v1.1)

```
billing/
  stripe.module.ts (79 lines - orchestrator)
  stripe.controller.ts (116 lines - account/balance only)
  charges.controller.ts (290 lines - charges/refunds)
  checkout.controller.ts (251 lines - checkout sessions)
  invoices.controller.ts (234 lines - invoice ops)

  connect/ (extracted in v1.0)
    connect.module.ts (43 lines)
    connect.controller.ts (460 lines - account management)
    payouts.controller.ts (245 lines - payouts/transfers)

  subscriptions/ (extracted in v1.0)
    subscriptions.module.ts (39 lines)
    subscription.controller.ts
    payment-methods.controller.ts (585 lines)

  webhooks/ (extracted in v1.0)
    webhooks.module.ts (76 lines)
    webhook.controller.ts
```

---

## Recommendations

### For Future Milestones

1. **Address TEST-001**: Review and fix/delete skipped E2E tests (51 tests)
2. ~~**Address TEST-002**: Add unit tests for payment services~~ - RESOLVED v2.0
3. **Address TEST-003**: Add unit tests for PDF generator

### Long-term Improvements

1. **Payment Analytics Split**: When adding new analytics features
2. **PDF Service Split**: When adding new document types
3. **Late Fees Calculation Helpers**: If calculation logic grows

### Do Not Do

1. Do not split files solely based on line count
2. Do not add abstraction layers "for future flexibility"
3. Do not refactor stable code without clear benefit

---

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-01-15 | Initial creation from Phase 4 audit | Claude |
| 2026-01-15 | Updated for v1.1 completion (Phases 6-10) | Claude |
| 2026-01-17 | Marked TEST-002 resolved (v2.0 Phase 16) | Claude |
