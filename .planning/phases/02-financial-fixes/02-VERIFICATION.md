---
phase: 02-financial-fixes
verified: 2026-03-05T06:30:00Z
status: passed
score: 22/22 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 17/22
  gaps_closed:
    - "Migration files apply without timestamp conflicts"
    - "Stripe SDK in Edge Functions is version 20.x with apiVersion 2026-02-25.clover"
    - "Billing hooks (useInvoices) query stripe.invoices via RPC"
    - "stripe.* tables contain synced data (sync gap closed) — human-verified"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Tenant can complete a rent payment end-to-end"
    expected: "Checkout creates a session with correct per-tenant amount (responsibility_percentage applied), success redirect includes session_id, webhook marks rent_due paid"
    why_human: "Requires Stripe test mode, live Edge Functions, and DB to be fully wired"
  - test: "SubscriptionStatusBanner visible for past_due owners"
    expected: "Owner with past_due subscription sees yellow warning banner in owner layout with link to /owner/billing"
    why_human: "Requires live Stripe test data — stripe.subscriptions must have a past_due record"
---

# Phase 2: Financial Fixes Verification Report

**Phase Goal:** All payment flows charge correct amounts, update correct statuses, and handle edge cases safely
**Verified:** 2026-03-05T06:30:00Z
**Status:** passed
**Re-verification:** Yes -- after gap closure (previous: gaps_found, 17/22)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | rent_due.amount and rent_payments.amount columns are numeric(10,2) | VERIFIED | Migration 20260304140000 line 29-40: ALTER TABLE with numeric(10,2) |
| 2 | stripe_webhook_events has status and error_message columns | VERIFIED | Migration 20260304140000 lines 65-73: ADD COLUMN status + CHECK constraint |
| 3 | rent_due has autopay retry tracking columns | VERIFIED | Migration 20260304140000 lines 51-54: autopay_attempts, autopay_last_attempt_at, autopay_next_retry_at |
| 4 | lease_tenants.responsibility_percentage has CHECK constraint (1-100) | VERIFIED | Migration 20260304140000 lines 91-93: CHECK constraint added |
| 5 | record_rent_payment RPC atomically upserts rent_payments and updates rent_due.status | VERIFIED | Migration 20260304150000: full UPSERT + conditional UPDATE with SUM check |
| 6 | set_default_payment_method RPC atomically swaps default in a single transaction | VERIFIED | Migration 20260304150000 lines 133-166: clear-then-set in single PL/pgSQL function |
| 7 | toggle_autopay RPC validates tenant is on the lease | VERIFIED | Migration 20260304150000 lines 180-213: join tenants->lease_tenants check |
| 8 | Stripe SDK in Edge Functions is version 20.x with apiVersion 2026-02-25.clover | VERIFIED | All Edge Functions use '2026-02-25.clover'. detach-payment-method/index.ts line 110 confirmed updated. Zero 'acacia' references remain in supabase/functions/. |
| 9 | Webhook does not delete idempotency records on failure | VERIFIED | stripe-webhooks/index.ts lines 125-137: marks status='failed' with error_message, no DELETE |
| 10 | Webhook validates required metadata and captures to Sentry | VERIFIED | stripe-webhooks/index.ts lines 248-260: captureError() called on missing tenant_id/lease_id |
| 11 | onboarding_completed_at is only set once -- never overwritten if already present | VERIFIED | stripe-webhooks/index.ts lines 204-220: shouldSetCompletedAt check with !existingCompletedAt |
| 12 | Owner payment receipt email includes fee breakdown | VERIFIED | stripe-webhooks/index.ts lines 268-298: balance_transaction retrieval, platform/stripe/net amounts |
| 13 | stripe-rent-checkout computes tenant portion using responsibility_percentage | VERIFIED | stripe-rent-checkout/index.ts lines 168-189: SELECT responsibility_percentage, compute portion |
| 14 | stripe-rent-checkout success_url includes {CHECKOUT_SESSION_ID} template | VERIFIED | stripe-rent-checkout/index.ts line 334: {CHECKOUT_SESSION_ID} in URL |
| 15 | stripe-autopay-charge computes tenant portion and passes idempotency key | VERIFIED | stripe-autopay-charge/index.ts lines 119-261: responsibility_percentage query + idempotency key |
| 16 | pg_cron autopay function includes retry logic -- queries autopay_next_retry_at | VERIFIED | Migration 20260304160000_autopay_cron_retry.sql lines 109-140 |
| 17 | Tenant receives email on each autopay failure with attempt number | VERIFIED | stripe-autopay-charge/index.ts lines 373-460: sendEmail with attempt count and Pay Now link |
| 18 | useSetDefaultPaymentMethod calls set_default_payment_method RPC | VERIFIED | use-payment-methods.ts line 173: supabase.rpc('set_default_payment_method', ...) |
| 19 | useDeletePaymentMethod calls detach-payment-method Edge Function | VERIFIED | use-payment-methods.ts line 138: supabase.functions.invoke('detach-payment-method', ...) |
| 20 | useDeletePaymentMethod prevents deleting last method | VERIFIED | use-payment-methods.ts lines 125-132: count check, guard at count <= 1 |
| 21 | Billing hooks query stripe.* tables via PostgREST/RPC | VERIFIED | useInvoices calls get_user_invoices RPC (lines 122-134 of use-billing.ts) which queries stripe.invoices. Falls back to rent_payments if RPC unavailable. useSubscriptionStatus queries get_subscription_status RPC. |
| 22 | useCheckoutStatus references stripe-checkout-session | VERIFIED | use-payments.ts lines 538, 570: 'stripe-checkout-session' (no stripe-checkout-status references found) |
| 23 | SubscriptionStatusBanner shows warning for past_due, lock for unpaid/canceled | VERIFIED | subscription-status-banner.tsx: useSubscriptionStatus() consumed, past_due/unpaid/canceled handled |
| 24 | Tenant portal toggle_autopay button calls toggle_autopay RPC | VERIFIED | use-tenant-portal.ts lines 1254-1260: supabase.rpc('toggle_autopay', ...) |
| 25 | Tenant portal shows per-tenant proportional rent amount | VERIFIED | use-tenant-portal.ts lines 292, 344-360: responsibility_percentage used, tenantRent computed |
| 26 | CLAUDE.md documents all Phase 2 conventions | VERIFIED | CLAUDE.md has numeric(10,2), record_rent_payment, 2026-02-25.clover, autopay_attempts, detach-payment-method, stripe schema, subscription status conventions |
| 27 | Backfill migration sets onboarding_completed_at for existing owners | VERIFIED | Migration 20260304170000: UPDATE property_owners WHERE charges_enabled=true AND onboarding_completed_at IS NULL |
| 28 | stripe.* tables contain synced data (sync gap closed) | VERIFIED | Human-verified in previous session: stripe-experiment-sync CLI installer created 33 tables and backfilled all entities |
| 29 | Migration files apply without timestamp conflicts | VERIFIED | 20260304160000 now has exactly 1 file (autopay_cron_retry.sql). stripe_sync_diagnosis.sql renamed to 20260304161000. Confirmed via ls. |
| 30 | invoice.payment_failed events update subscription status and notify owner | VERIFIED | stripe-webhooks/index.ts lines 395-430: invoice.payment_failed handler with owner lookup + email |

**Score:** 22/22 must-haves verified (30/30 truths including derived truths)

---

### Gap Closure Detail

**Gap 1 (Blocker): Duplicate migration timestamp -- CLOSED**
- Previous: Two files shared timestamp `20260304160000` (autopay_cron_retry.sql and stripe_sync_diagnosis.sql)
- Fix: `stripe_sync_diagnosis.sql` renamed to `20260304161000_stripe_sync_diagnosis.sql`
- Verification: `ls supabase/migrations/20260304160000_*.sql` returns exactly 1 file (autopay_cron_retry.sql). `20260304161000_stripe_sync_diagnosis.sql` exists.

**Gap 2 (PAY-17): detach-payment-method apiVersion -- CLOSED**
- Previous: `supabase/functions/detach-payment-method/index.ts` line 110 used `'2025-02-24.acacia'`
- Fix: Updated to `'2026-02-25.clover'`
- Verification: Line 110 reads `apiVersion: '2026-02-25.clover'`. Grep for 'acacia' in supabase/functions/ returns zero results.

**Gap 3 (PAY-20): useInvoices doesn't query stripe.invoices -- CLOSED**
- Previous: `useInvoices` queried `rent_payments` directly with no attempt to access stripe.invoices
- Fix: Created `get_user_invoices` RPC in migration `20260305120000_get_user_invoices_rpc.sql`. Updated `use-billing.ts` to call `supabase.rpc('get_user_invoices', { p_limit: 50 })` first, falling back to rent_payments only if RPC fails.
- Verification: RPC is SECURITY DEFINER, validates auth.uid(), queries `stripe.invoices` by customer, converts cents to dollars, limits results. Hook at lines 122-134 calls the RPC and maps results to FormattedInvoice. Fallback at lines 142-158 preserves backward compatibility.

**Gap 4 (Human-verify): Stripe sync engine -- CLOSED**
- Previous: Sync engine needed manual Dashboard re-enablement, checkpoint was auto-approved
- Resolution: Human-verified in previous session. CLI installer `stripe-experiment-sync` successfully created 33 tables and backfilled all entities.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260304140000_financial_fixes_schema.sql` | Column type changes, new columns, CHECK constraints | VERIFIED | 124 lines, all 6 schema tasks complete |
| `supabase/migrations/20260304150000_financial_fixes_rpcs.sql` | record_rent_payment, set_default_payment_method, toggle_autopay | VERIFIED | 227 lines, all 3 RPCs with SECURITY DEFINER, GRANT EXECUTE |
| `supabase/functions/deno.json` | Stripe SDK v20 | VERIFIED | stripe@20 + @sentry/deno@9 |
| `supabase/functions/stripe-webhooks/index.ts` | Fixed webhook with idempotency, metadata, onboarding, fee email, invoice.payment_failed | VERIFIED | 31,718 bytes, all 6 fixes present |
| `supabase/functions/stripe-rent-checkout/index.ts` | Per-tenant checkout with correct redirect URLs | VERIFIED | 14,748 bytes, responsibility_percentage + {CHECKOUT_SESSION_ID} |
| `supabase/functions/stripe-autopay-charge/index.ts` | Per-tenant autopay with idempotency, retry tracking, failure notifications | VERIFIED | 19,838 bytes, idempotency key, sendEmail on failure |
| `supabase/migrations/20260304160000_autopay_cron_retry.sql` | Updated pg_cron function with retry logic | VERIFIED | Dual cursors, autopay_next_retry_at, per-tenant amounts. No timestamp collision. |
| `supabase/migrations/20260304161000_stripe_sync_diagnosis.sql` | Stripe sync diagnosis and monitoring | VERIFIED | Renamed from 20260304160000. Documentation + check_stripe_sync_status() RPC |
| `supabase/migrations/20260304170000_onboarding_backfill.sql` | Backfill onboarding_completed_at | VERIFIED | UPDATE property_owners WHERE charges_enabled=true |
| `supabase/migrations/20260305120000_get_user_invoices_rpc.sql` | RPC to query stripe.invoices for PAY-20 | VERIFIED | 63 lines, SECURITY DEFINER, auth.uid() guard, stripe.invoices query, cents-to-dollars conversion |
| `supabase/functions/detach-payment-method/index.ts` | Edge Function: Stripe detach then DB delete | VERIFIED | apiVersion now '2026-02-25.clover', Stripe detach mandatory, no fallback |
| `src/hooks/api/use-payment-methods.ts` | Fixed payment method hooks with atomic RPC and Stripe detach | VERIFIED | 8,498 bytes, RPC call + Edge Function invoke |
| `src/hooks/api/use-billing.ts` | Billing hooks querying stripe.* tables | VERIFIED | useInvoices calls get_user_invoices RPC first. useSubscriptionStatus calls get_subscription_status RPC first. Both fall back gracefully. |
| `src/components/payments/payment-utils.ts` | Consolidated currency formatter | VERIFIED | formatCurrency exported, 2,076 bytes |
| `src/components/billing/subscription-status-banner.tsx` | Subscription status banner component | VERIFIED | 2,156 bytes, past_due/unpaid/canceled handled |
| `CLAUDE.md` | Updated with Phase 2 conventions | VERIFIED | All conventions documented |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| stripe-webhooks/index.ts | stripe_webhook_events | INSERT with status column | WIRED | Lines 71-79: insert with status: 'processing' |
| stripe-webhooks/index.ts | Stripe API | constructEventAsync | WIRED | Line 58: stripe.webhooks.constructEventAsync |
| stripe-webhooks/index.ts | record_rent_payment RPC | supabase.rpc | WIRED | Lines 289-300: supabase.rpc('record_rent_payment', ...) |
| stripe-webhooks/index.ts | users table | invoice.payment_failed handler | WIRED | Lines 395-430: users lookup by stripe_customer_id |
| stripe-rent-checkout/index.ts | lease_tenants | SELECT responsibility_percentage | WIRED | Lines 168-189: responsibility_percentage query |
| stripe-autopay-charge/index.ts | lease_tenants | SELECT responsibility_percentage | WIRED | Lines 119-155: responsibility_percentage query |
| stripe-autopay-charge/index.ts | _shared/resend.ts | sendEmail for failure notifications | WIRED | Lines 15, 434-460, 500-520: sendEmail imported and called |
| use-payment-methods.ts | set_default_payment_method RPC | supabase.rpc call | WIRED | Line 173: supabase.rpc('set_default_payment_method', ...) |
| use-payment-methods.ts | detach-payment-method Edge Function | supabase.functions.invoke | WIRED | Line 138: invoke('detach-payment-method', ...) |
| use-billing.ts | stripe.subscriptions | Via get_subscription_status RPC (fallback to leases) | WIRED | RPC attempted first, graceful fallback |
| use-billing.ts | stripe.invoices | Via get_user_invoices RPC (fallback to rent_payments) | WIRED | Lines 122-134: supabase.rpc('get_user_invoices', { p_limit: 50 }). RPC queries stripe.invoices (migration 20260305120000). |
| subscription-status-banner.tsx | use-billing.ts | useSubscriptionStatus hook | WIRED | Line 5-18: useSubscriptionStatus imported and consumed |
| use-tenant-portal.ts | toggle_autopay RPC | supabase.rpc call | WIRED | Line 1254: supabase.rpc('toggle_autopay', ...) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PAY-01 | 02-01 | Amount convention documented | SATISFIED | Migration header + CLAUDE.md document dollars/numeric(10,2) convention |
| PAY-02 | 02-01 | rent_due.status updated to 'paid' in webhook | SATISFIED | record_rent_payment RPC with SUM-based conditional UPDATE |
| PAY-03 | 02-01 | Tenant can enable/disable autopay | SATISFIED | toggle_autopay RPC + useToggleAutopay hook wired in tenant portal |
| PAY-04 | 02-04 | stripe-checkout-status corrected to stripe-checkout-session | SATISFIED | use-payments.ts lines 538, 570: correct reference |
| PAY-05 | 02-04 | No double-division in formatCents() | SATISFIED | formatCents() = formatCurrency(cents/100) -- single division |
| PAY-06 | 02-01 | rent_payments.amount changed to numeric(10,2) | SATISFIED | Migration 20260304140000: all 7 amount columns changed |
| PAY-07 | 02-04 | Payment method deletion calls stripe.paymentMethods.detach() | SATISFIED | detach-payment-method/index.ts line 113 |
| PAY-08 | 02-01/02-03 | Idempotency key on autopay paymentIntents.create | SATISFIED | stripe-autopay-charge/index.ts line 261 |
| PAY-09 | 02-02/02-06 | Platform subscription webhook handling | SATISFIED | invoice.payment_failed handler + Stripe sync confirmed operational |
| PAY-10 | 02-02 | Webhook validates tenant_id/lease_id -- no empty string fallback | SATISFIED | stripe-webhooks/index.ts lines 248-260 |
| PAY-11 | 02-02/02-05 | onboarding_completed_at preserved | SATISFIED | Webhook set-once check + backfill migration |
| PAY-12 | 02-04 | Plan limit enforcement called from frontend | SATISFIED | use-tenant-portal.ts lines 1357-1373 |
| PAY-13 | 02-01/02-03 | Autopay retry mechanism | SATISFIED | pg_cron migration with retry logic |
| PAY-14 | 02-01/02-03 | Autopay handles shared leases correctly (per-tenant portions) | SATISFIED | responsibility_percentage used across all payment flows |
| PAY-15 | 02-01/02-02 | Webhook failure does not delete idempotency record | SATISFIED | Status-based tracking, no DELETE |
| PAY-16 | 02-01/02-04 | setDefaultPaymentMethod uses transaction | SATISFIED | Atomic RPC at DB layer |
| PAY-17 | 02-02/02-03 | Stripe API version consistent across Edge Functions | SATISFIED | All Edge Functions use '2026-02-25.clover'. Zero 'acacia' references remain. |
| PAY-18 | 02-02 | Owner payment receipt includes fee breakdown | SATISFIED | balance_transaction retrieval with fee computation |
| PAY-19 | 02-04/02-06 | useSubscriptionStatus checks actual subscription status | SATISFIED | Queries stripe.subscriptions via RPC, falls back to leases |
| PAY-20 | 02-04 | Billing hooks implemented or UI disabled | SATISFIED | useInvoices queries stripe.invoices via get_user_invoices RPC (migration 20260305120000). Falls back to rent_payments if RPC unavailable. |
| PAY-21 | 02-03 | Success/cancel redirect URLs include session_id | SATISFIED | {CHECKOUT_SESSION_ID} template in success_url |
| PAY-22 | 02-01 | rent_due table has service_role write policies | SATISFIED | Migration 20260304140000 lines 108-113 |
| DOC-01 | 02-05 | CLAUDE.md updated with current conventions | SATISFIED | All Phase 2 patterns documented |

---

### Anti-Patterns Found

No blocker or warning anti-patterns remain. All 4 previously flagged anti-patterns have been resolved:

| Previous Anti-Pattern | Resolution |
|----------------------|------------|
| detach-payment-method wrong apiVersion | Updated to '2026-02-25.clover' |
| Duplicate migration timestamp 20260304160000 | Renamed to 20260304161000 |
| useInvoices queries rent_payments not stripe.invoices | Now calls get_user_invoices RPC first |
| Stripe sync engine not confirmed | Human-verified operational |

No TODO/FIXME/placeholder comments found in Phase 2 implementation files.
No empty return stubs in critical implementation paths.

---

### Human Verification Required

#### 1. Payment End-to-End Flow

**Test:** As a tenant, navigate to the payment page, initiate a rent payment, complete the Stripe checkout, and verify the success redirect includes a session_id parameter.
**Expected:** Per-tenant amount reflects responsibility_percentage. Success URL contains `?session_id=cs_xxx`. Webhook fires, rent_due.status becomes 'paid'. Owner receives email with fee breakdown.
**Why human:** Requires live Stripe test mode, deployed Edge Functions, and applied migrations working together.

#### 2. Subscription Status Banner Display

**Test:** As an owner with a past_due subscription in Stripe, visit the owner dashboard.
**Expected:** Yellow warning banner appears at the top of the owner layout with a link to /owner/billing. No banner shows for active subscriptions.
**Why human:** Requires a test account with a specific subscription status. SubscriptionStatusBanner is wired to owner layout but the data path needs live verification.

---

### Gaps Summary

All 4 gaps from the initial verification have been closed. No new gaps found.

The phase goal -- "All payment flows charge correct amounts, update correct statuses, and handle edge cases safely" -- is achieved at the code level. Two human verification items remain for live end-to-end testing (payment flow and subscription banner), but these are standard integration tests, not blockers to code-level goal achievement.

---

_Verified: 2026-03-05T06:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification of: 2026-03-05T02:00:00Z initial verification_
