---
phase: 04-code-quality
plan: 03
subsystem: backend
tags: [module-extraction, connect, srp, architecture]

# Dependency graph
requires:
  - phase: 04-02
    provides: WebhooksModule extraction pattern, StripeModule decomposition started
provides:
  - ConnectModule extracted from StripeModule
  - Connect-related files organized in billing/connect/
  - Cleaner module separation following SRP
affects: [billing-module, stripe-connect, module-organization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Direct module import (no forwardRef needed since ConnectModule has no parent dependencies)

key-files:
  created:
    - apps/backend/src/modules/billing/connect/connect.module.ts
    - apps/backend/src/modules/billing/connect/connect.controller.ts
    - apps/backend/src/modules/billing/connect/connect.service.ts
    - apps/backend/src/modules/billing/connect/connect-setup.service.ts
    - apps/backend/src/modules/billing/connect/connect-billing.service.ts
    - apps/backend/src/modules/billing/connect/connect-payouts.service.ts
    - apps/backend/src/modules/billing/connect/connect.controller.spec.ts
  modified:
    - apps/backend/src/modules/billing/stripe.module.ts (removed Connect providers, imports ConnectModule)
    - apps/backend/src/modules/billing/webhooks/webhook.controller.ts (updated import path)
    - apps/backend/src/modules/billing/webhooks/webhook.controller.spec.ts (updated import path)
    - apps/backend/src/modules/leases/lease-subscription.service.ts (updated import path)
    - apps/backend/src/test-utils/mocks.ts (renamed mock function)
  deleted:
    - apps/backend/src/modules/billing/stripe-connect.controller.ts
    - apps/backend/src/modules/billing/stripe-connect.controller.spec.ts
    - apps/backend/src/modules/billing/stripe-connect.service.ts
    - apps/backend/src/modules/billing/connect-setup.service.ts
    - apps/backend/src/modules/billing/connect-billing.service.ts
    - apps/backend/src/modules/billing/connect-payouts.service.ts

key-decisions:
  - "Extract ConnectModule as second step of StripeModule decomposition (addresses ARCH-003)"
  - "No forwardRef needed - ConnectModule is self-contained with only SupabaseModule dependency"
  - "Rename classes: StripeConnectController -> ConnectController, StripeConnectService -> ConnectService"
  - "Keep three focused sub-services: ConnectSetupService, ConnectBillingService, ConnectPayoutsService"
  - "Re-export ConnectModule from StripeModule for backward compatibility"

patterns-established:
  - "Sub-module extraction: for self-contained modules, direct import without forwardRef"
  - "Facade pattern: ConnectService delegates to focused sub-services for SRP"

issues-created: []

# Metrics
duration: 15min
completed: 2026-01-15
---

# Phase 4 Plan 3: ConnectModule Extraction from StripeModule

**Extracted ConnectModule as second step of StripeModule decomposition (ARCH-003)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-15T16:00:00Z
- **Completed:** 2026-01-15T16:15:00Z
- **Tasks:** 2
- **Files created:** 7
- **Files deleted:** 6

## Summary

Extracted all Stripe Connect functionality from the StripeModule god module into a dedicated ConnectModule sub-module. This continues the ARCH-003 decomposition started in plan 04-02 (WebhooksModule extraction).

## Changes Made

### Task 1: Create connect sub-module structure

Created new directory `apps/backend/src/modules/billing/connect/` with:

| File | Purpose | Renamed From |
|------|---------|--------------|
| connect.module.ts | Module definition | (new) |
| connect.controller.ts | Connect account endpoints | stripe-connect.controller.ts |
| connect.service.ts | Facade service | stripe-connect.service.ts |
| connect-setup.service.ts | Account creation, onboarding | connect-setup.service.ts |
| connect-billing.service.ts | Customer/subscription on connected accounts | connect-billing.service.ts |
| connect-payouts.service.ts | Balance, payouts, transfers | connect-payouts.service.ts |
| connect.controller.spec.ts | Controller tests | stripe-connect.controller.spec.ts |

**Class Renames:**

| Original | New |
|----------|-----|
| StripeConnectController | ConnectController |
| StripeConnectService | ConnectService |

### Task 2: Update imports and integrate module

**stripe.module.ts changes:**

Before:
- 13 providers (including 4 Connect-related)
- 5 controllers (including 1 Connect controller)
- 87 lines (after WebhooksModule extraction)

After:
- 9 providers (Connect-related moved to ConnectModule)
- 4 controllers (Connect controller moved)
- Imports ConnectModule directly
- 80 lines (8% reduction)

**Removed from StripeModule providers:**
1. StripeConnectService
2. ConnectSetupService
3. ConnectBillingService
4. ConnectPayoutsService

**Removed from StripeModule controllers:**
1. StripeConnectController

**External imports updated:**
- webhook.controller.ts: `StripeConnectService` -> `ConnectService`
- lease-subscription.service.ts: `StripeConnectService` -> `ConnectService`
- webhook.controller.spec.ts: Updated mock provider
- mocks.ts: `createMockStripeConnectService` -> `createMockConnectService`

## Architecture

```
billing/
├── stripe.module.ts           # Core Stripe functionality
├── webhooks/                  # Webhook processing (from 04-02)
│   └── ...
├── connect/                   # Stripe Connect (new)
│   ├── connect.module.ts      # Module definition
│   ├── connect.controller.ts  # REST endpoints
│   ├── connect.service.ts     # Facade for sub-services
│   ├── connect-setup.service.ts      # Account creation/onboarding
│   ├── connect-billing.service.ts    # Customer/subscription mgmt
│   └── connect-payouts.service.ts    # Balance/payouts/transfers
└── ... (other Stripe services)
```

## Module Dependencies

ConnectModule is self-contained:
- Imports: SupabaseModule only
- Exports: ConnectService, ConnectSetupService, ConnectBillingService, ConnectPayoutsService

No forwardRef needed (unlike WebhooksModule) because ConnectModule doesn't depend on StripeModule.

## Before/After

| Metric | Before (04-02) | After (04-03) |
|--------|----------------|---------------|
| StripeModule providers | 12 | 9 |
| StripeModule controllers | 5 | 4 |
| StripeModule lines | 87 | 80 |
| Separate Connect module | No | Yes |
| Connect files in billing/ root | 6 | 0 |

## Verification

- **Typecheck:** Passed
- **Connect tests:** 4 tests passed
- **Webhook tests:** 2 tests passed (updated imports)
- **All backend tests:** 134 suites, 1,593 tests passed

## ARCH-003 Progress

| Module | Status | Plan |
|--------|--------|------|
| WebhooksModule | Extracted | 04-02 |
| ConnectModule | Extracted | 04-03 |
| CustomerModule | Pending | Future |
| SubscriptionModule | Pending | Future |

## Next Steps (Future Phases)

Per ARCH-003, remaining modules to extract:
- CustomerModule (StripeCustomerService)
- SubscriptionModule (StripeSubscriptionService)

---
*Phase: 04-code-quality*
*Completed: 2026-01-15*
