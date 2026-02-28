# Phase 59: Stripe Rent Checkout - Research

**Researched:** 2026-02-26
**Status:** Complete

## Executive Summary

Phase 59 implements the core rent payment flow: tenant clicks "Pay Rent", gets redirected to Stripe Checkout, payment routes via destination charge to the owner's Express account, and a `rent_payments` record is created on webhook confirmation. Most of the infrastructure already exists — the main work is a new Edge Function for creating rent checkout sessions, updates to the existing webhook handler, schema additions for fee tracking, and frontend wiring.

## Existing Infrastructure

### Stripe Edge Functions (supabase/functions/)
- **stripe-webhooks/index.ts** — Already handles `payment_intent.succeeded` with rent_payments upsert from metadata. Also handles `payment_intent.payment_failed` with owner notification. Idempotent via `stripe_webhook_events` PK.
- **stripe-checkout/index.ts** — Creates platform subscription checkout sessions (owner SaaS billing). NOT for rent payments. Uses `mode: 'subscription'`.
- **stripe-connect/index.ts** — Manages Express account onboarding, balance, payouts, transfers. Has `account`, `onboard`, `refresh-link`, `balance`, `payouts`, `transfers` actions.
- **stripe-billing-portal/index.ts** — Customer portal for managing SaaS subscriptions.
- **stripe-checkout-session/index.ts** — Retrieves completed checkout session for post-checkout page.
- **_shared/cors.ts** — CORS helper with FRONTEND_URL origin matching. Must import for browser-facing functions.
- **deno.json** — Import map: `@supabase/supabase-js@2.49.4`, `stripe@14.25.0`

### Database Schema
- **rent_payments** — Has `amount`, `application_fee_amount`, `currency`, `status` (text CHECK: pending|processing|succeeded|failed|canceled), `tenant_id`, `lease_id`, `stripe_payment_intent_id`, `payment_method_type`, `period_start`, `period_end`, `due_date`, `paid_date`, `late_fee_amount`, `notes`. Missing: `gross_amount`, `platform_fee`, `stripe_fee`, `net_amount` columns for fee breakdown.
- **rent_due** — Has `amount`, `due_date`, `status`, `unit_id`, `lease_id`. Tracks what's owed per period.
- **stripe_connected_accounts** — Has `user_id`, `stripe_account_id`, `charges_enabled`, `payouts_enabled`, `onboarding_status`, `default_platform_fee_percent`. The `default_platform_fee_percent` column already exists!
- **leases** — Has `owner_user_id`, `rent_amount`, `unit_id`, `primary_tenant_id`, `stripe_connected_account_id`, `payment_day`, `lease_status`, `grace_period_days`, `late_fee_amount`.
- **lease_tenants** — Junction table with `lease_id`, `tenant_id`, `is_primary`, `responsibility_percentage`.

### Frontend Payment Hooks
- **use-payments.ts** — Has `useCreateRentPaymentMutation` (currently throws TODO), `usePaymentStatus`, payment method hooks, payment verification hooks (all TODOs).
- **use-tenant-portal.ts** — Has `tenantPortalQueries.amountDue()` (resolves tenant -> lease -> rent_payments), `payments()`, `autopay()`. Defines `PayRentRequest` (payment_method_id + amount_cents) and `PayRentResponse`.

### Tenant Portal Pages
- **tenant-portal-page.tsx** — Dashboard with rent status card, "Pay Now" button linking to `/tenant/payments/new`.
- **tenant-portal.tsx** — Component with `onPayRent` callback, "Pay Now" link.
- **payments/new/page.tsx** — Pay rent page with amount due, payment method selector, submit. Currently throws TODO for mutation. Uses `PayRentRequest` type.
- **payments/page.tsx** — Payment history with autopay status card.

### Key Observations
1. The `payments/new/page.tsx` is designed for on-platform payment processing (select saved payment method, click pay). For Stripe Checkout redirect flow, this page either needs to be replaced or repurposed as the checkout initiation page.
2. The `amountDue` query resolves rent via: auth.uid() -> tenants.id -> lease_tenants -> leases -> rent_payments. This is a 3-step serial query.
3. `stripe_connected_accounts.default_platform_fee_percent` already exists — can store per-owner fee config.
4. The webhook handler already creates rent_payments from PaymentIntent metadata — just needs fee breakdown columns added.
5. `rent_due` table has `lease_id` (nullable) and `unit_id` — can be used for duplicate payment checks.

## Implementation Gaps

### New Edge Function Needed: stripe-rent-checkout
- Creates a Stripe Checkout Session with `mode: 'payment'` and destination charge
- Requires: tenant auth, active lease lookup, rent_due verification, connected account lookup
- Must verify `charges_enabled` before creating session
- Must check for duplicate payment (succeeded payment for same rent_due period)
- Metadata must include: `tenant_id`, `lease_id`, `property_id`, `unit_id`, `rent_due_id`, `amount`, `period_month`, `period_year`

### Schema Changes
- Add to `rent_payments`: `gross_amount`, `platform_fee_amount`, `stripe_fee_amount`, `net_amount`, `rent_due_id` (FK to rent_due), `checkout_session_id`
- These enable the owner dashboard fee breakdown without Stripe API calls

### Webhook Handler Updates
- `payment_intent.succeeded` handler needs to populate fee breakdown columns
- Can extract `application_fee_amount` from PaymentIntent (already done)
- Stripe fee requires Balance Transaction lookup: `stripe.balanceTransactions.retrieve(charge.balance_transaction)`
- Net amount = gross - platform_fee - stripe_fee

### Frontend Changes
- Replace `payments/new/page.tsx` content: instead of selecting a payment method and submitting in-app, it should call the new Edge Function and redirect to Stripe Checkout URL
- Update dashboard "Pay Now" button to call checkout Edge Function directly (no intermediate page per CONTEXT.md: "No pre-checkout confirmation dialog")
- Add success toast on return from Stripe Checkout (check URL params)
- Handle `charges_enabled=false` — disable "Pay Rent" button with tooltip message
- Handle duplicate payment check (already_paid state already exists in payments/new/page.tsx)

## Risk Areas

1. **Stripe fee retrieval timing** — The `balance_transaction` on a PaymentIntent charge may not be immediately available when `payment_intent.succeeded` fires. May need to handle `charge.updated` event or retrieve asynchronously.
2. **rent_due table usage** — The amountDue query in use-tenant-portal.ts queries `rent_payments` not `rent_due`. Need to ensure rent_due records exist for each billing period (likely populated by pg_cron in Phase 56).
3. **Holdover tenants** — CONTEXT.md says payment driven by rent_due records, not lease status. Must ensure the Edge Function and frontend don't gate on `lease_status = 'active'`.
4. **Connected account resolution** — Need to traverse: tenant -> lease -> owner_user_id -> stripe_connected_accounts -> stripe_account_id. Multiple DB lookups.

## Validation Architecture

### Dimension Coverage
| Dimension | Validation Approach |
|-----------|-------------------|
| 1. Functional | Checkout session creates with correct metadata; webhook creates rent_payments with fee breakdown |
| 2. Data integrity | rent_payments.status transitions; duplicate payment prevention; fee math accuracy |
| 3. Auth/Security | Tenant can only pay own rent; webhook signature verified; charges_enabled guard |
| 4. Error handling | charges_enabled=false UX; abandoned checkout cleanup; webhook retry on failure |
| 5. Performance | Connected account lookup caching; no N+1 queries in checkout flow |
| 6. UX | Toast on success return; disabled button for paid periods; clear error states |
| 7. Integration | Stripe API version compatibility (14.25.0); destination charge with application_fee |
| 8. Observability | Console logging in Edge Function; Sentry breadcrumbs on frontend errors |

### Critical Verification Points
1. End-to-end: Tenant clicks "Pay Rent" -> Stripe Checkout -> payment_intent.succeeded webhook -> rent_payments record with status=succeeded
2. Fee math: gross_amount - platform_fee - stripe_fee = net_amount (within 1 cent rounding)
3. Duplicate prevention: Second checkout attempt for same rent_due period blocked
4. charges_enabled guard: Tenant sees clear error when owner hasn't completed Stripe onboarding

---

## RESEARCH COMPLETE
