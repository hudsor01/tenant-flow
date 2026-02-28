---
phase: 59-stripe-rent-checkout
verified: 2026-02-27T09:00:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 11/14
  gaps_closed:
    - "checkout_session_id back-filled onto PaymentIntent metadata via stripe.paymentIntents.update after session creation (lines 302-311); webhook reads it correctly at line 238"
    - "period_start, period_end, due_date now derived from rentDue.due_date (lines 251-257) and included in PaymentIntent metadata (lines 292-294); webhook reads real dates instead of defaulting to today"
    - "expires_at set to Math.floor(Date.now() / 1000) + 1800 (line 299); sessions now expire in 30 minutes using the correct Stripe API field name"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Complete a test rent payment end-to-end in staging"
    expected: "Tenant clicks Pay Now on dashboard, is redirected to Stripe Checkout, completes card payment (4242 4242 4242 4242), returns to /tenant?checkout=success, sees green Payment successful! toast, amountDue refreshes to already-paid state, and rent_payments record has non-null checkout_session_id plus accurate period_start/period_end/due_date"
    why_human: "Full Stripe Checkout redirect flow requires a live Stripe test mode session and real browser navigation; PaymentIntent metadata back-fill requires Stripe to process the update asynchronously"
  - test: "Test charges_enabled=false guard on dashboard"
    expected: "When owner connected account has charges_enabled=false, the Pay Now button is replaced with Payment setup pending - contact your landlord, and payments/new page shows Payments Not Available card"
    why_human: "Requires a test Stripe connected account in incomplete onboarding state"
  - test: "Test duplicate payment prevention"
    expected: "Attempting to pay for a period with an existing succeeded rent_payments record returns 409 with Already paid for this period; payments/new page shows Rent Paid card"
    why_human: "Requires a pre-existing succeeded payment record for a specific rent_due_id in the test DB"
---

# Phase 59: Stripe Rent Checkout Verification Report

**Phase Goal:** Tenants can pay rent through the platform with Stripe Connect destination charges, routing funds to the owner's Express account with a platform application fee.
**Verified:** 2026-02-27T09:00:00Z
**Status:** human_needed (all automated checks pass — 3 items require human testing)
**Re-verification:** Yes — after gap closure (previous score: 11/14, current score: 14/14)

## Re-verification Summary

All three gaps from the initial verification have been closed in `supabase/functions/stripe-rent-checkout/index.ts`. No regressions detected in previously-passing truths.

**Gap 1 closed — `checkout_session_id` back-fill (lines 302-311):**
After creating the Checkout Session, the function now calls `stripe.paymentIntents.update(piId, { metadata: { checkout_session_id: session.id } })`. This populates the metadata key that the webhook reads at line 238 (`metadata['checkout_session_id'] ?? null`), so `rent_payments.checkout_session_id` will now hold the Stripe session ID for every payment made through this flow.

**Gap 2 closed — accurate period dates in metadata (lines 251-294):**
The function derives `periodStart` and `periodEnd` from `rentDue.due_date` and includes `due_date: rentDue.due_date`, `period_start: periodStart`, `period_end: periodEnd` in `payment_intent_data.metadata`. The webhook at lines 233-235 now reads real period dates instead of defaulting to today.

**Gap 3 closed — 30-minute session expiry (line 299):**
`expires_at: Math.floor(Date.now() / 1000) + 1800` sets the Stripe Checkout Session to expire in 30 minutes using the correct Stripe API field (`expires_at`, not the invalid `expires_after`).

---

## Goal Achievement

### Observable Truths

#### Plan 01 (Backend): Edge Function + Database

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Checkout Session created with `mode=payment` and `transfer_data.destination` pointing to owner's Express account | VERIFIED | Line 265: `mode: 'payment'`; lines 280-282: `transfer_data: { destination: connectedAccount.stripe_account_id }` |
| 2 | `application_fee_amount` calculated from `default_platform_fee_percent` (fallback 5%) | VERIFIED | Lines 226-227: `platformFeePercent = connectedAccount.default_platform_fee_percent ?? 5` and `Math.round(amountCents * platformFeePercent / 100)` |
| 3 | Edge Function rejects if `charges_enabled=false` | VERIFIED | Lines 215-220: explicit check returns 400 with landlord message |
| 4 | Edge Function rejects with 409 if succeeded payment already exists for same `rent_due_id` | VERIFIED | Lines 119-139: query + 409 response with `{ error: 'Already paid for this period' }` |
| 5 | PaymentIntent metadata includes all required fields | VERIFIED | Lines 283-295: tenant_id, lease_id, property_id, unit_id, rent_due_id, amount, period_month, period_year, due_date, period_start, period_end — 11 fields present (superset of original 8 required) |
| 6 | `rent_payments` has 6 new columns: gross_amount, platform_fee_amount, stripe_fee_amount, net_amount, rent_due_id, checkout_session_id | VERIFIED | Migration `20260226180000_add_rent_payment_fee_columns.sql` adds all 6 columns; supabase.ts types regenerated |

#### Plan 02 (Frontend + Webhook): UI + Fee Population

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Tenant clicks "Pay Rent" and is redirected to Stripe Checkout (no intermediate dialog) | VERIFIED | `payments/new/page.tsx`: single "Pay with Stripe" button calls `checkoutMutation.mutate(amountDue.rent_due_id)`; `useRentCheckoutMutation` redirects via `window.location.href = data.url` |
| 8 | After successful payment, tenant returns to `/tenant?checkout=success` and sees a green success toast | VERIFIED | `tenant-portal-page.tsx` lines 56-72: `useEffect` detects `checkout=success` param, calls `toast.success('Payment successful!')`, invalidates queries, cleans URL |
| 9 | `charges_enabled=false` disables Pay Rent button with explanatory message | VERIFIED | `tenant-portal.tsx` lines 146-151: AlertTriangle + message; `payments/new/page.tsx` lines 112-129: "Payments Not Available" card |
| 10 | Already-paid state disables Pay Rent flow | VERIFIED | `payments/new/page.tsx` lines 84-109: `already_paid=true` renders "Rent Paid" card with View Payment History button |
| 11 | Webhook populates fee breakdown columns (gross_amount, platform_fee_amount, stripe_fee_amount, net_amount) | VERIFIED | `stripe-webhooks/index.ts` lines 174-194: all four columns computed and inserted/updated in both UPDATE and INSERT paths |
| 12 | `checkout_session_id` column populated from Stripe session | VERIFIED (FIXED) | Edge Function back-fills `checkout_session_id: session.id` via `stripe.paymentIntents.update` (lines 302-311); webhook reads `metadata['checkout_session_id'] ?? null` at line 238 |
| 13 | `period_start`, `period_end`, `due_date` accurately recorded in rent_payments | VERIFIED (FIXED) | Edge Function derives dates from `rentDue.due_date` (lines 251-257) and includes all three in metadata (lines 292-294); webhook reads them at lines 233-235 |
| 14 | Abandoned checkout returns tenant to portal unchanged | VERIFIED | `cancel_url: '${frontendUrl}/tenant?checkout=cancelled'`; portal handles `checkout=cancelled` with info toast |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260226180000_add_rent_payment_fee_columns.sql` | 6 columns + indexes | VERIFIED | All 6 columns present, unique partial index created |
| `supabase/functions/stripe-rent-checkout/index.ts` | Complete checkout flow Edge Function | VERIFIED | 337 lines; all 11 steps implemented plus back-fill block (lines 302-311); no stubs |
| `packages/shared/src/types/api-contracts.ts` | 3 new types | VERIFIED | `CreateRentCheckoutRequest`, `CreateRentCheckoutResponse`, `RentCheckoutError` defined |
| `apps/frontend/src/hooks/api/use-tenant-portal.ts` | `useRentCheckoutMutation` + `charges_enabled` + `rent_due_id` | VERIFIED | Hook at lines 995-1030; `AmountDueResponse` includes both fields |
| `apps/frontend/src/hooks/api/mutation-keys.ts` | `tenantPortal.payRent` key | VERIFIED | `payRent: ['mutations', 'tenantPortal', 'payRent'] as const` |
| `apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx` | Stripe Checkout redirect page | VERIFIED | 4 states: loading, error, already_paid, charges_disabled, no_rent_due, pay button |
| `apps/frontend/src/app/(tenant)/tenant/tenant-portal-page.tsx` | Success/cancel toast handling | VERIFIED | `useEffect` with `toastShown` ref, query invalidation, URL cleanup |
| `apps/frontend/src/components/tenant-portal/tenant-portal.tsx` | `chargesEnabled` prop + conditional render | VERIFIED | Prop at line 29; conditional at lines 146-168 |
| `supabase/functions/stripe-webhooks/index.ts` | `payment_intent.succeeded` populates fee columns | VERIFIED | Lines 170-243: balance_transaction expansion, all 4 fee columns plus period dates and checkout_session_id written |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `payments/new/page.tsx` | `stripe-rent-checkout` Edge Function | `useRentCheckoutMutation` fetch call | VERIFIED | `use-tenant-portal.ts` line 1004: `fetch(\`${supabaseUrl}/functions/v1/stripe-rent-checkout\`, ...)` with JWT Bearer |
| `useRentCheckoutMutation` | Stripe Checkout URL | `window.location.href = data.url` | VERIFIED | Lines 1021-1023 in `use-tenant-portal.ts` |
| `tenant-portal-page.tsx` | `amountDue` query | `tenantPortalQueries.amountDue()` | VERIFIED | Lines 49-51; passes `chargesEnabled={amountDue?.charges_enabled ?? false}` to `TenantPortal` |
| `TenantPortal` | `charges_enabled` conditional | `chargesEnabled` prop | VERIFIED | `tenant-portal.tsx` line 146: `chargesEnabled === false` renders disabled message |
| Success return URL | Toast + invalidation | `useSearchParams` + `useEffect` | VERIFIED | `tenant-portal-page.tsx` lines 56-72 |
| Edge Function | `payment_intent_data.metadata` date fields | `due_date`, `period_start`, `period_end` | VERIFIED (FIXED) | Lines 292-294: all three date fields now in metadata derived from `rentDue.due_date` |
| Edge Function | PaymentIntent metadata back-fill | `stripe.paymentIntents.update` | VERIFIED (FIXED) | Lines 304-310: `checkout_session_id: session.id` written after session creation |
| Webhook | `rent_payments` date columns | `metadata['period_start']`, `metadata['period_end']`, `metadata['due_date']` | VERIFIED (FIXED) | Lines 233-235: all three read from metadata; fallback to today no longer triggered for rent payments |
| Webhook | `rent_payments.checkout_session_id` | `metadata['checkout_session_id']` | VERIFIED (FIXED) | Line 238: now has a value instead of always null |
| Edge Function | Stripe session expiry | `expires_at` | VERIFIED (FIXED) | Line 299: `expires_at: Math.floor(Date.now() / 1000) + 1800` — correct Stripe API field, 30-minute window |
| Edge Function | `stripe_connected_accounts` | `.from('stripe_connected_accounts').select(...).eq('user_id', lease.owner_user_id)` | VERIFIED | Lines 191-195 |
| Edge Function | `lease_tenants` junction | `.from('lease_tenants').eq('lease_id').eq('tenant_id')` | VERIFIED | Lines 166-186: tenant access verification |
| Webhook | `rent_payments` fee columns | INSERT/UPDATE with gross_amount, platform_fee_amount, stripe_fee_amount, net_amount | VERIFIED | Lines 203-241 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAY-01 | 59-01, 59-02 | Tenant can pay rent via Stripe Checkout with destination charge fee split to owner's Express account | SATISFIED | Edge Function creates Checkout Session with `transfer_data.destination`; `payments/new` page calls mutation and redirects; webhook records payment with accurate period dates and session traceability |
| PAY-02 | 59-01, 59-02 | Platform receives configurable application fee on each rent payment | SATISFIED | `application_fee_amount` calculated from `default_platform_fee_percent ?? 5` and passed to Stripe; stored in `platform_fee_amount` column via webhook |

Both requirements are fully satisfied. All data integrity gaps that previously existed (checkout_session_id null, period dates incorrect) are now resolved.

### Anti-Patterns Found

No anti-patterns found in the current version of any modified file.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No issues | — | — | — | — |

No `TODO`/`FIXME`/`PLACEHOLDER` comments present. No `any` type violations. No stub implementations.

### Human Verification Required

#### 1. End-to-end Stripe Checkout payment flow (with data integrity check)

**Test:** Log in as a tenant user with an active lease and a rent_due record. Navigate to `/tenant`, click "Pay Now", verify redirect to Stripe Checkout, complete test card payment (4242 4242 4242 4242), verify redirect back to `/tenant?checkout=success`, confirm green "Payment successful!" toast appears and fires exactly once, confirm amountDue refreshes to show already-paid state. After payment, inspect the `rent_payments` record in Supabase: verify `checkout_session_id` is non-null (matches the Stripe session ID), and `period_start`/`period_end`/`due_date` reflect the actual rent period dates (not today's date).
**Expected:** Full flow completes in one browser session. `rent_payments` record has correct dates and a non-null `checkout_session_id`.
**Why human:** Full Stripe Checkout redirect flow requires a live Stripe test mode session, real browser navigation, and PaymentIntent metadata back-fill requires Stripe to process the update asynchronously.

#### 2. charges_enabled=false guard

**Test:** Set a connected account's `charges_enabled` to `false` in the test DB. Log in as a tenant on that owner's lease. Check dashboard and navigate to `/tenant/payments/new`.
**Expected:** Dashboard shows "Payment setup pending - contact your landlord" instead of "Pay Now" button. Payments page shows "Payments Not Available" card with AlertTriangle icon.
**Why human:** Requires a test connected account in incomplete onboarding state.

#### 3. Duplicate payment 409 guard

**Test:** Insert a `rent_payments` record with `status='succeeded'` for a known `rent_due_id`. Attempt to initiate checkout for that same `rent_due_id`.
**Expected:** Edge Function returns 409. Frontend shows error toast from `handleMutationError`. Payments page shows "Rent Paid" card.
**Why human:** Requires a pre-existing succeeded payment record for a specific `rent_due_id` in the test DB.

### Gaps Summary

No gaps remaining. All three previously-identified gaps are closed:

1. `checkout_session_id` — now back-filled via `stripe.paymentIntents.update` after session creation and read by webhook from metadata.
2. Period dates (`period_start`, `period_end`, `due_date`) — now derived from `rentDue.due_date` and included in metadata; webhook reads real dates.
3. Session expiry — now set to 30 minutes via `expires_at` (correct Stripe API field).

---

_Verified: 2026-02-27T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
