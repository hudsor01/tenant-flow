# Phase 16: Stripe Backend Test Coverage

## Overview

Add comprehensive unit tests for payment services that currently lack coverage.

## Current State

**Total Payment Services:** 28
- With Tests: 14 (50%)
- Without Tests: 14 (50%)

## Services Needing Tests

### High Priority (Business-Critical)

| Service | Lines | Key Functionality |
|---------|-------|-------------------|
| stripe-owner.service.ts | 422 | Rent payment intents with destination charges, owner customer management |
| connect-setup.service.ts | 514 | Connected Account creation, country validation, onboarding |
| stripe-sync.service.ts | 185 | Stripe Sync Engine, webhook processing, entity sync |
| stripe.service.ts | 315 | Subscription listing/pagination, invoice caching |

### Medium Priority

| Service | Lines | Key Functionality |
|---------|-------|-------------------|
| billing.service.ts | 274 | Synced Stripe schema queries, customer linking |
| stripe-shared.service.ts | 126 | Idempotency key generation, error handling |
| payment-method.service.ts | 123 | Payment Intent/Checkout Session creation |
| connect-billing.service.ts | 226 | Connected account customer/subscription management |
| connect-payouts.service.ts | 108 | Balance retrieval, payout listing |
| connect.service.ts | 153 | Facade for Connect services |

### Lower Priority

| Service | Lines | Key Functionality |
|---------|-------|-------------------|
| tenant-payment-query.service.ts | 268 | RLS-enforced payment queries |
| tenant-payment-mapper.service.ts | 132 | Payment data transformation |

## Testing Strategy

1. **Mock Stripe API** - Use jest.mock() for all Stripe SDK calls
2. **Mock Supabase** - Mock admin client for database operations
3. **Test Error Handling** - Verify all 8 Stripe error types handled correctly
4. **Test Idempotency** - Verify HMAC-SHA256 key generation
5. **Test Business Logic** - Destination charges, application fees, country validation

## Plan Breakdown

Given the scope (12 services, 3,400+ lines), split into multiple plans:

- **16-01**: High priority services (stripe-owner, connect-setup, stripe-sync, stripe.service)
- **16-02**: Medium priority services (billing, shared, payment-method, connect-billing)
- **16-03**: Remaining services (connect-payouts, connect facade, tenant-payment services)

## Success Criteria

- All 12 services have unit test files
- Tests cover happy paths and error scenarios
- Tests verify idempotency key generation
- Tests verify Stripe error type handling
- All tests pass in CI
