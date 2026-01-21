# Plan 16-02 Summary: Medium-Priority Payment Service Unit Tests

## Execution Overview

**Duration**: ~10 minutes
**Status**: ✅ Complete
**Commits**:
- `a8f352b5e` - test(16-02): add unit tests for medium-priority payment services

## What Was Built

### 1. billing.service.spec.ts (23 tests)
- **getStripeCustomer tests**:
  - Returns customer from stripe schema
  - Returns null when not found (PGRST116)
  - Throws on other database errors

- **findCustomerByOwnerId tests**:
  - Returns customer when owner has stripe_customer_id
  - Returns null when owner not found
  - Returns null when owner has no stripe_customer_id

- **findCustomerByTenantId tests**:
  - Returns customer when tenant has stripe_customer_id
  - Returns null when tenant not found

- **linkCustomerToOwner/linkCustomerToTenant tests**:
  - Updates user/tenant record with stripe_customer_id
  - Throws on database error

- **findSubscriptionByStripeId tests**:
  - Returns subscription from stripe schema
  - Returns null when not found

- **findSubscriptionsByCustomerId tests**:
  - Returns array of subscriptions
  - Returns empty array when none found
  - Throws on database error

- **findSubscriptionByUserId tests (RLS-enforced)**:
  - Returns subscription with RLS-enforced query
  - Returns null when not found (PGRST116)
  - Throws on other errors (fail-closed security)
  - Returns null when data is null without error

- **findPaymentIntentByStripeId tests**:
  - Returns payment intent from stripe schema
  - Returns null when not found

### 2. payment-method.service.spec.ts (14 tests)
- **createPaymentIntent tests**:
  - Creates payment intent with params
  - Uses idempotency key when provided
  - Propagates Stripe errors

- **createCheckoutSession tests**:
  - Creates checkout session with params
  - Uses idempotency key when provided
  - Propagates Stripe errors

- **getCharge tests**:
  - Returns charge by ID
  - Returns null on error

- **listPaymentMethods tests**:
  - Lists payment methods for customer
  - Filters by type (card)
  - Filters by type (us_bank_account)
  - Propagates Stripe errors

- **detachPaymentMethod tests**:
  - Detaches payment method
  - Propagates Stripe errors

### 3. connect-billing.service.spec.ts (16 tests)
- **createCustomerOnConnectedAccount tests**:
  - Creates customer with stripeAccount header
  - Includes metadata with platform tag
  - Includes optional phone when provided
  - Propagates Stripe errors

- **createSubscriptionOnConnectedAccount tests**:
  - Creates price first, then subscription
  - Uses idempotency keys for both operations
  - Sets payment_behavior to default_incomplete
  - Uses custom currency when provided
  - Includes custom metadata
  - Propagates Stripe errors

- **deleteCustomer tests**:
  - Deletes customer with idempotency key
  - Uses stripeAccount header
  - Propagates Stripe errors

- **cancelSubscription tests**:
  - Cancels subscription with idempotency key
  - Uses stripeAccount header
  - Propagates Stripe errors

### 4. connect-payouts.service.spec.ts (14 tests)
- **getConnectedAccountBalance tests**:
  - Retrieves balance with stripeAccount header
  - Returns balance object with available and pending amounts

- **listConnectedAccountPayouts tests**:
  - Lists payouts with stripeAccount header
  - Uses default limit of 10
  - Supports custom limit
  - Supports pagination with starting_after

- **getPayoutDetails tests**:
  - Retrieves payout by ID with stripeAccount header

- **listTransfersToAccount tests**:
  - Lists transfers with destination filter
  - Uses default limit of 10
  - Supports custom limit
  - Supports pagination options

- **createDashboardLoginLink tests**:
  - Creates login link for connected account
  - Returns URL string
  - Propagates Stripe errors

## Test Statistics

| Test File | Tests | Status |
|-----------|-------|--------|
| billing.service.spec.ts | 23 | ✅ Pass |
| payment-method.service.spec.ts | 14 | ✅ Pass |
| connect-billing.service.spec.ts | 16 | ✅ Pass |
| connect-payouts.service.spec.ts | 14 | ✅ Pass |
| **Total** | **67** | **✅ All Pass** |

## Verification

- [x] billing.service.spec.ts exists and passes
- [x] payment-method.service.spec.ts exists and passes
- [x] connect-billing.service.spec.ts exists and passes
- [x] connect-payouts.service.spec.ts exists and passes
- [x] pnpm typecheck passes
- [x] pnpm test:unit:backend passes (1757 tests, 67 new)

## Coverage Summary

Phase 16 test coverage (Plans 01 + 02):
- **Plan 16-01**: 89 tests (high-priority services)
- **Plan 16-02**: 67 tests (medium-priority services)
- **Total**: 156 new tests for Stripe payment services

## Next Steps

Plan 16-02 complete. Remaining plans in Phase 16 TBD.
