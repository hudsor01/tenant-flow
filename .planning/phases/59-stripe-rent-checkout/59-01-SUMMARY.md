---
phase: 59-stripe-rent-checkout
plan: 01
subsystem: payments
tags: [stripe, checkout, destination-charges, edge-functions, supabase, rent-payments]

# Dependency graph
requires:
  - phase: 34-stripe-connect
    provides: stripe_connected_accounts table, Stripe Express onboarding
  - phase: 58-security-hardening
    provides: CORS helper, Edge Function auth patterns
provides:
  - stripe-rent-checkout Edge Function (creates Checkout Sessions with destination charges)
  - rent_payments fee breakdown columns (gross_amount, platform_fee_amount, stripe_fee_amount, net_amount)
  - rent_payments.rent_due_id linking payments to rent_due periods
  - unique partial index preventing duplicate succeeded payments per rent_due
  - CreateRentCheckoutRequest/Response API contract types
affects: [59-02-frontend-checkout-ui, 60-receipt-emails, 64-autopay]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Destination charge pattern: Stripe Checkout with transfer_data.destination + application_fee_amount"
    - "Tenant auth + lease access verification via lease_tenants junction table"
    - "Duplicate payment prevention via unique partial index on rent_payments(rent_due_id) WHERE status = 'succeeded'"

key-files:
  created:
    - supabase/migrations/20260226180000_add_rent_payment_fee_columns.sql
    - supabase/functions/stripe-rent-checkout/index.ts
  modified:
    - packages/shared/src/types/supabase.ts
    - packages/shared/src/types/api-contracts.ts
    - packages/shared/src/types/TYPES.md
    - apps/frontend/src/hooks/api/use-payments.ts

key-decisions:
  - "Owner absorbs all fees -- tenant pays exact rent amount, platform fee calculated from owner's default_platform_fee_percent (default 5%)"
  - "Duplicate payment prevention at both DB level (unique partial index) and application level (pre-checkout query)"
  - "PaymentIntent metadata includes 8 fields for downstream webhook processing without extra DB queries"
  - "Stripe error detection via duck-typing (checking .type property) rather than instanceof for Deno npm: compatibility"

patterns-established:
  - "Destination charge Edge Function pattern: auth -> resolve tenant -> validate rent_due -> check duplicates -> resolve lease -> verify access -> resolve connected account -> check charges_enabled -> calculate fees -> create Checkout Session"
  - "Fee breakdown storage in rent_payments for owner dashboard reads without Stripe API calls"

requirements-completed: [PAY-01, PAY-02]

# Metrics
duration: 12min
completed: 2026-02-27
---

# Phase 59 Plan 01: Stripe Rent Checkout Backend Summary

**Stripe Checkout destination charge Edge Function with fee breakdown columns, duplicate payment prevention, and tenant-to-owner fund routing via Express accounts**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-27T00:09:29Z
- **Completed:** 2026-02-27T00:22:24Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Database migration adds 6 columns to rent_payments: gross_amount, platform_fee_amount, stripe_fee_amount, net_amount, rent_due_id, checkout_session_id
- Unique partial index prevents duplicate succeeded payments for the same rent_due period
- New stripe-rent-checkout Edge Function handles the complete checkout creation flow: tenant auth, lease access verification, connected account resolution, charges_enabled guard, fee calculation, and Stripe Checkout Session creation with destination charge
- API contract types shared between frontend and Edge Function

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration -- add fee breakdown columns** - `0b34cb329` (feat)
2. **Task 2: Create stripe-rent-checkout Edge Function** - `fada8bc8a` (feat)
3. **Task 3: Add RentCheckout API contract types** - `0de59e6f0` (feat)

## Files Created/Modified
- `supabase/migrations/20260226180000_add_rent_payment_fee_columns.sql` - Adds 6 columns + indexes to rent_payments
- `supabase/functions/stripe-rent-checkout/index.ts` - Edge Function creating Stripe Checkout Sessions with destination charges
- `packages/shared/src/types/supabase.ts` - Regenerated with new rent_payments columns
- `packages/shared/src/types/api-contracts.ts` - Added CreateRentCheckoutRequest, CreateRentCheckoutResponse, RentCheckoutError
- `packages/shared/src/types/TYPES.md` - Updated lookup table with new types
- `apps/frontend/src/hooks/api/use-payments.ts` - Added new columns to optimistic payment object

## Decisions Made
- Owner absorbs all fees (Stripe + platform) -- tenant pays exact rent amount as shown in rent_due.amount
- Platform fee defaults to 5% if owner has no default_platform_fee_percent configured
- PaymentIntent metadata carries 8 fields (tenant_id, lease_id, property_id, unit_id, rent_due_id, amount, period_month, period_year) enabling Phase 60 receipt emails to render without extra DB queries
- Stripe error detection uses duck-typing (.type property starting with "Stripe") rather than instanceof for Deno npm: module compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed optimistic payment object missing new columns**
- **Found during:** Task 1 (Database migration)
- **Issue:** After regenerating Supabase types, the optimistic RentPayment object in use-payments.ts was missing the 6 new columns (gross_amount, platform_fee_amount, stripe_fee_amount, net_amount, rent_due_id, checkout_session_id), causing TS2740 type error
- **Fix:** Added all 6 new columns with null default values to the optimistic payment object
- **Files modified:** apps/frontend/src/hooks/api/use-payments.ts
- **Verification:** pnpm typecheck passes clean
- **Committed in:** 0b34cb329 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix caused by schema change. No scope creep.

## Issues Encountered
- Remote migration history had a mismatch (migration 20260225155855 existed remotely but not locally). Repaired with `supabase migration repair --status reverted` before pushing new migration.

## User Setup Required
None - STRIPE_SECRET_KEY and FRONTEND_URL should already be set in Supabase Edge Function secrets from prior phases.

## Next Phase Readiness
- Edge Function ready to be called from frontend (Plan 02 will add the "Pay Rent" button and TanStack mutation)
- API contract types are available for frontend import
- Webhook handler (stripe-webhooks) will need to be updated in a future plan to create rent_payments records on payment_intent.succeeded with the new fee breakdown columns

---
*Phase: 59-stripe-rent-checkout*
*Plan: 01*
*Completed: 2026-02-27*

## Self-Check: PASSED
- All 4 created/modified files verified on disk
- All 3 task commits verified in git history
