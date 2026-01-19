---
phase: 04-code-quality
plan: 02
subsystem: backend
tags: [module-extraction, webhooks, srp, architecture]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dead code cleanup, clear service naming
provides:
  - WebhooksModule extracted from StripeModule
  - Webhook-related files organized in billing/webhooks/
  - Cleaner module separation following SRP
affects: [billing-module, webhook-processing, module-organization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - forwardRef for circular dependency resolution between StripeModule and WebhooksModule

key-files:
  created:
    - apps/backend/src/modules/billing/webhooks/webhooks.module.ts
    - apps/backend/src/modules/billing/webhooks/webhook.controller.ts
    - apps/backend/src/modules/billing/webhooks/webhook.service.ts
    - apps/backend/src/modules/billing/webhooks/webhook-processor.service.ts
    - apps/backend/src/modules/billing/webhooks/webhook-queue.processor.ts
    - apps/backend/src/modules/billing/webhooks/webhook.controller.spec.ts
    - apps/backend/src/modules/billing/webhooks/webhook.service.spec.ts
    - apps/backend/src/modules/billing/webhooks/webhook-processor.service.spec.ts
    - apps/backend/src/modules/billing/webhooks/handlers/subscription-webhook.handler.ts
    - apps/backend/src/modules/billing/webhooks/handlers/payment-webhook.handler.ts
    - apps/backend/src/modules/billing/webhooks/handlers/checkout-webhook.handler.ts
    - apps/backend/src/modules/billing/webhooks/handlers/connect-webhook.handler.ts
  modified:
    - apps/backend/src/modules/billing/stripe.module.ts (reduced from god module)
  deleted:
    - apps/backend/src/modules/billing/stripe-webhook.controller.ts
    - apps/backend/src/modules/billing/stripe-webhook.controller.spec.ts
    - apps/backend/src/modules/billing/stripe-webhook.service.ts
    - apps/backend/src/modules/billing/stripe-webhook.service.spec.ts
    - apps/backend/src/modules/billing/webhook-processor.service.ts
    - apps/backend/src/modules/billing/webhook-processor.service.spec.ts
    - apps/backend/src/modules/billing/stripe-webhook.queue.ts
    - apps/backend/src/modules/billing/handlers/ (entire directory)

key-decisions:
  - "Extract WebhooksModule as first step of StripeModule decomposition (addresses ARCH-003)"
  - "Use forwardRef for bidirectional dependency between StripeModule and WebhooksModule"
  - "Rename classes to remove Stripe prefix (StripeWebhookController -> WebhookController) since context is clear from module path"
  - "Keep handlers as separate files in handlers/ subdirectory for SRP"
  - "Add StripeWebhookJob type alias for backward compatibility"

patterns-established:
  - "Sub-module extraction: create new module, use forwardRef for parent dependency, re-export needed services"
  - "Webhook architecture: controller for verification, service for idempotency, processor for routing, handlers for domain logic"

issues-created: []

# Metrics
duration: 25min
completed: 2026-01-15
---

# Phase 4 Plan 2: WebhooksModule Extraction from StripeModule

**Extracted WebhooksModule as first step of StripeModule decomposition (ARCH-003)**

## Performance

- **Duration:** 25 min
- **Started:** 2026-01-15T15:58:00Z
- **Completed:** 2026-01-15T16:23:00Z
- **Tasks:** 2
- **Files created:** 12
- **Files deleted:** 7 (+ 1 directory)

## Summary

Extracted all webhook-related functionality from the StripeModule god module into a dedicated WebhooksModule sub-module. This follows the existing @todo ARCH-003 in the codebase recommending decomposition.

## Changes Made

### Task 1: Create webhooks sub-module structure

Created new directory `apps/backend/src/modules/billing/webhooks/` with:

| File | Purpose | Renamed From |
|------|---------|--------------|
| webhooks.module.ts | Module definition | (new) |
| webhook.controller.ts | Signature verification, event queuing | stripe-webhook.controller.ts |
| webhook.service.ts | Idempotency, event tracking | stripe-webhook.service.ts |
| webhook-processor.service.ts | Event routing to handlers | webhook-processor.service.ts |
| webhook-queue.processor.ts | BullMQ queue processor | stripe-webhook.queue.ts |
| handlers/subscription-webhook.handler.ts | Subscription events | handlers/subscription-webhook.handler.ts |
| handlers/payment-webhook.handler.ts | Payment events | handlers/payment-webhook.handler.ts |
| handlers/checkout-webhook.handler.ts | Checkout events | handlers/checkout-webhook.handler.ts |
| handlers/connect-webhook.handler.ts | Connect events | handlers/connect-webhook.handler.ts |

**Class Renames:**

| Original | New |
|----------|-----|
| StripeWebhookController | WebhookController |
| StripeWebhookService | WebhookService |
| StripeWebhookQueueProcessor | WebhookQueueProcessor |
| StripeWebhookJob | WebhookJob (with deprecated alias) |

### Task 2: Update imports and integrate module

**stripe.module.ts changes:**

Before:
- 17 providers (including 6 webhook-related)
- 6 controllers (including 1 webhook controller)
- BullModule registration for stripe-webhooks queue
- 126 lines

After:
- 12 providers (webhook-related moved to WebhooksModule)
- 5 controllers (webhook controller moved)
- Imports WebhooksModule via forwardRef
- 87 lines (31% reduction)

**Removed from StripeModule providers:**
1. StripeWebhookService
2. WebhookProcessor
3. SubscriptionWebhookHandler
4. PaymentWebhookHandler
5. CheckoutWebhookHandler
6. ConnectWebhookHandler
7. StripeWebhookQueueProcessor (conditional)

**Removed from StripeModule controllers:**
1. StripeWebhookController

## Architecture

```
billing/
├── stripe.module.ts           # Core Stripe functionality
├── webhooks/
│   ├── webhooks.module.ts     # Webhook processing module
│   ├── webhook.controller.ts  # Signature verification, queuing
│   ├── webhook.service.ts     # Idempotency, event tracking
│   ├── webhook-processor.service.ts  # Event routing
│   ├── webhook-queue.processor.ts    # BullMQ processor
│   └── handlers/              # Domain-specific handlers
│       ├── subscription-webhook.handler.ts
│       ├── payment-webhook.handler.ts
│       ├── checkout-webhook.handler.ts
│       └── connect-webhook.handler.ts
└── ... (other Stripe services)
```

## Circular Dependency Resolution

WebhooksModule needs StripeConnectService from StripeModule.
StripeModule imports WebhooksModule.

Solution: Use `forwardRef(() => ...)` in both modules.

## Before/After

| Metric | Before | After |
|--------|--------|-------|
| StripeModule providers | 17 | 12 |
| StripeModule controllers | 6 | 5 |
| StripeModule lines | 126 | 87 |
| Separate webhook module | No | Yes |
| Files in billing/ root | 30+ | ~23 |

## Verification

- **Typecheck:** Passed
- **Webhook tests:** 3 suites, 30 tests passed
- **All backend tests:** 131 suites, 1,563 tests passed

## Next Steps (Future Phases)

Per ARCH-003, remaining modules to extract:
- CustomerModule
- SubscriptionModule
- ConnectModule

---
*Phase: 04-code-quality*
*Completed: 2026-01-15*
