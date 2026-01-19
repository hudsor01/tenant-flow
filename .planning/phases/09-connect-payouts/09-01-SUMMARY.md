---
phase: 09-connect-payouts
plan: 01
status: complete
duration: ~3 min
---

## Summary

Extracted payouts and transfers operations from connect.controller.ts (605 lines).

## Changes

### Files Created
- `apps/backend/src/modules/billing/connect/payouts.controller.ts` (245 lines)
  - GET /payouts - List payouts with pagination
  - GET /payouts/:payoutId - Get payout details
  - GET /transfers - List transfers with pagination

### Files Modified
- `apps/backend/src/modules/billing/connect/connect.controller.ts`
  - Reduced from 605 → 460 lines (24% reduction)
  - Now focused on account management operations only

- `apps/backend/src/modules/billing/connect/connect.module.ts`
  - Added PayoutsController to controllers array

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| connect.controller.ts | 605 lines | 460 lines | -24% |
| New controllers | 0 | 1 | +1 |
| Test suites passing | 135 | 135 | 0 |
| Tests passing | 1602 | 1602 | 0 |

## Route Structure (Preserved)

All routes maintain original paths under `/stripe/connect`:
- **ConnectController**: Account management (onboard, status, dashboard-link, balance)
- **PayoutsController**: Financial operations (payouts, transfers)

## Verification

- [x] payouts.controller.ts created with 3 endpoints
- [x] connect.controller.ts reduced to 460 lines
- [x] connect.module.ts registers PayoutsController
- [x] `pnpm --filter @repo/backend typecheck` passes
- [x] `pnpm --filter @repo/backend test:unit` passes (135 suites, 1602 tests)
