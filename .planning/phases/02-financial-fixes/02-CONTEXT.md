# Phase 2: Financial Fixes — Context

## Phase Goal
All payment flows charge correct amounts, update correct statuses, and handle edge cases safely.

## Requirements in Scope
PAY-01 through PAY-22 + DOC-01

## Decisions

### 1. Amount Storage Convention
**Decision**: Dollars with `numeric(10,2)` as the canonical storage unit. Convert to cents at the Stripe API boundary only (inside Edge Functions).
**Rationale**: Financial reporting requires human-readable dollar amounts. `numeric(10,2)` avoids floating-point rounding errors. Stripe conversion happens in exactly two places: `stripe-rent-checkout` and `stripe-autopay-charge`.
**Migration**: `rent_due.amount` is currently `integer` — needs `ALTER COLUMN amount TYPE numeric(10,2)`. Existing data is in dollars already (no data transformation needed, just type change).
**Applies to**: PAY-06

### 2. rent_due.amount Semantics
**Decision**: Base rent only. Late fees, credits, and adjustments tracked separately (future phase if needed).
**Rationale**: Keeps rent_due simple and predictable. Late fees are calculated by pg_cron and stored in their own records.
**Applies to**: PAY-01, PAY-02

### 3. Owner Receipt Email Content
**Decision**: Full breakdown — show base rent, platform fee, Stripe fee, and net payout.
**Rationale**: Owners need fee visibility for financial reporting and tax purposes.
**Applies to**: PAY-22 (general quality)

### 4. Currency Formatting
**Decision**: Single `formatCurrency(amountInDollars)` formatter used everywhere. No cents input variant. Consistent `$X,XXX.XX` output.
**Rationale**: One source of truth prevents formatting mismatches between tenant portal, owner dashboard, and reports.
**Applies to**: PAY-06 (consistency)

### 5. Payment Method Deletion Policy
**Decision**: Cannot delete the last remaining payment method. Tenant must add a new method before removing the sole one. When deleting a method that autopay uses, auto-disable autopay and notify the tenant. The "set as default" operation must promote the new default before clearing the old one.
**Rationale**: Prevents tenants from accidentally breaking their autopay setup. Industry standard for subscription services.
**Implementation**: Frontend guard (hide delete when count === 1) + backend RLS/RPC guard as safety net. If deleting the default method with autopay active, disable autopay and show warning toast.
**Applies to**: PAY-07

### 6. setDefaultPaymentMethod Atomicity
**Decision**: Replace the two-step client-side update (clear all → set one) with an atomic SQL RPC (`set_default_payment_method(p_payment_method_id uuid)`). The RPC validates ownership, clears is_default for all tenant methods, sets the target, all in one transaction.
**Rationale**: Two separate PostgREST updates create a race window where no method is default. Atomic SQL eliminates this.
**Applies to**: PAY-16

### 7. Checkout Redirect URLs
**Decision**: Follow Stripe's official `{CHECKOUT_SESSION_ID}` template pattern. `success_url` includes `?session_id={CHECKOUT_SESSION_ID}`. Success page verifies session status server-side via `stripe.checkout.sessions.retrieve()`. `cancel_url` returns to the payment page without parameters.
**Rationale**: Stripe-recommended pattern. Prevents users from crafting fake success URLs.
**Applies to**: PAY-21

### 8. Autopay Retry Strategy
**Decision**: 3 retries over 7 days (day 1, day 3, day 7) matching Stripe's subscription Smart Retry cadence. Off-session PaymentIntents don't auto-retry, so pg_cron drives the schedule. After final failure, mark as failed and email tenant + owner.
**Tracking columns on `rent_due`**: `autopay_attempts integer DEFAULT 0`, `autopay_last_attempt_at timestamptz`, `autopay_next_retry_at timestamptz`. The pg_cron job queries `WHERE autopay_next_retry_at <= now() AND autopay_attempts < 3 AND status != 'paid'`.
**Rationale**: Deterministic retry tracking in the DB prevents double-charges and provides auditability. Aligns with Stripe subscription retry cadence that users are familiar with.
**Applies to**: PAY-13

### 9. Autopay Failure Notifications
**Decision**: Email tenant on each failure attempt (include attempt number: "Attempt 2 of 3"). Email owner only on final failure. Include a "Pay Now" deep link in tenant emails.
**Rationale**: Tenants need to know their card failed so they can update it. Owners don't need noise on recoverable failures.
**Applies to**: PAY-13, PAY-22

### 10. Shared Lease Handling (Per-Tenant Rent Portions)
**Decision**: Per-tenant independent payments aligned with industry standard (Buildium, Apartments.com, TenantCloud, Baselane). Each tenant on a shared lease pays `rent_due.amount * lease_tenants.responsibility_percentage / 100`. Each tenant sees only their portion in the portal. Autopay charges each tenant independently.
**Data model**: No new tables needed. `lease_tenants.responsibility_percentage` already exists (integer, default 100) but is completely unused in business logic. Wire it into:
  - `stripe-autopay-charge`: query lease_tenants for tenant's percentage, charge proportional amount
  - `stripe-rent-checkout`: compute tenant's portion, display and charge that amount
  - Tenant portal: show tenant's portion, not full rent
  - `rent_payments.amount`: stores the amount the individual tenant paid (their portion)
**Validation**: responsibility_percentage values for all tenants on a lease must sum to 100. Add CHECK constraint or validation in lease creation/update.
**Applies to**: PAY-14

### 11. Platform Subscription Failure Handling
**Decision**: Banner notification + email + soft feature lock after 7-day grace period.
**Grace period**: 7 days from first failed invoice. During grace: warning banner on every page. After grace: lock premium features (financial reports, advanced analytics), keep core functionality (properties, tenants, payments).
**Tracking**: Query `stripe.subscriptions` table (already synced) for status. Statuses: `active`, `past_due`, `canceled`, `unpaid`. `past_due` = grace period active. `unpaid` or `canceled` = features locked.
**Implementation**: Add `useSubscriptionStatus()` hook that queries stripe.subscriptions via PostgREST with existing RLS policies. Conditional UI rendering based on status.
**Applies to**: PAY-09

### 12. Billing Hooks — Use stripe Schema
**Decision**: Query `stripe.*` tables (subscriptions, invoices, charges, payment_intents, payment_methods, customers) via PostgREST with existing RLS. Do NOT create new Edge Functions to call Stripe API for read operations. The stripe schema is the source of truth for billing data display.
**Sync fix required**: Stripe sync is STALE (last_synced_at = 2025-12-11, ~3 months old). Must fix the sync engine before relying on stripe.* data. Research official Stripe sync engine documentation before implementing.
**Tables available**: 28 tables including subscriptions, invoices, charges, customers, payment_intents, payment_methods, prices, products, etc.
**RLS**: Already has user-scoped SELECT policies (subscriptions_select_own, invoices_select_own, etc.)
**Webhook infrastructure**: stripe.webhook_events, stripe.webhook_failures tables + materialized views (webhook_health_summary, webhook_event_type_summary).
**Applies to**: PAY-09, PAY-17, PAY-18, PAY-19, PAY-20

### 13. Stripe Schema Sync Fix
**Decision**: Fix the stale stripe sync engine as part of this phase. Sync has been down since 2025-12-11. Must fetch official Stripe sync engine documentation to understand the sync mechanism (webhook-driven via stripe.migrations setup from 2025-09-25). Existing functions: record_webhook_metrics_batch, detect_webhook_health_issues, cleanup_old_webhook_data, refresh_webhook_views.
**Scope**: Diagnose why sync stopped, fix it, backfill missing data from Dec 2025 to present, verify sync is operational.
**Applies to**: PAY-09, PAY-17, PAY-18, PAY-19, PAY-20 (prerequisite for stripe schema reliability)

### 14. Webhook Idempotency (PAY-15)
**Decision**: Stop deleting idempotency records on failure. Current code deletes the `stripe_webhook_events` record when processing fails, allowing the same event to be reprocessed — but with potentially corrupt intermediate state. Instead: keep the record, mark it with `status: 'failed'` and `error_message`. Stripe will retry delivery. On retry, check if record exists with `status: 'failed'` and reprocess. If `status: 'succeeded'`, skip.
**Schema change**: Add `status text DEFAULT 'processing'` and `error_message text` columns to `stripe_webhook_events` if not present.
**Applies to**: PAY-15

### 15. Metadata Validation (PAY-10)
**Decision**: Validate required metadata fields (`tenant_id`, `lease_id`, `unit_id`, `rent_due_id`) before processing payment events. If any required field is missing or empty, log a structured error (Sentry) with the event ID and skip processing. Never fall back to empty strings.
**Applies to**: PAY-10

### 16. rent_due.status Update (PAY-02)
**Decision**: Update `rent_due.status` to `'paid'` inside the `payment_intent.succeeded` webhook handler, atomically with the rent_payments upsert. Use a single RPC that upserts rent_payments AND updates rent_due.status in one transaction. For partial payments (per-tenant splits): mark rent_due as `'paid'` only when all tenant portions are paid (sum of succeeded rent_payments >= rent_due.amount).
**Applies to**: PAY-02

### 17. onboarding_completed_at Fix (PAY-11)
**Decision**: Fix code to only set `onboarding_completed_at` once (skip if already set). Add a backfill migration to set `onboarding_completed_at` for any owners who have `charges_enabled = true` in Stripe but null `onboarding_completed_at` in the DB.
**Applies to**: PAY-11

### 18. Per-Tenant Rent Portions Data Model
**Decision**: No new tables. Compute tenant portions dynamically from `rent_due.amount * lease_tenants.responsibility_percentage / 100`. The `responsibility_percentage` column already exists with correct default (100).
**Validation constraint**: Add `CHECK (responsibility_percentage >= 1 AND responsibility_percentage <= 100)` on lease_tenants. Add application-level validation that percentages for all tenants on a lease sum to exactly 100.
**rent_payments**: Already has `tenant_id` column — each payment record tracks which tenant paid, and stores the dollar amount they paid (their portion).
**Autopay query change**: `stripe-autopay-charge` must join `lease_tenants` to get the tenant's percentage, then charge `rent_due.amount * percentage / 100` instead of the full amount.
**Checkout query change**: `stripe-rent-checkout` must look up the tenant's percentage and compute their portion before creating the Checkout Session.
**Applies to**: PAY-14

### 19. Stripe API Version Alignment
**Decision**: Align all Edge Functions and Next.js to the same Stripe SDK major version and API version `2026-02-25.clover`. Currently:
  - Edge Functions: `stripe@14.25.0` with `apiVersion: '2024-06-20'` (via deno.json import map) — **nearly 2 years out of date**
  - Next.js: `stripe@20.3.1` (no explicit apiVersion pinned)

Latest stable: `2026-02-25.clover` (Stripe's new versioning scheme uses `YYYY-MM-DD.codename`).
Upgrade Edge Functions to `stripe@20.x` and pin `apiVersion: '2026-02-25.clover'` consistently across all environments. Test webhook signature verification after upgrade (constructEventAsync API may have changed).
**Risk**: Major SDK version upgrade (14→20) may have breaking changes. Review stripe@14→20 changelog. Prioritize webhook handler and payment intent creation paths.
**Applies to**: General quality (not a specific PAY requirement but blocks reliable implementation)

### 20. Payment Method Management UX
**Decision**: Based on current codebase analysis:
  - **Last method guard**: Hide delete button when payment_methods count === 1. Add explanatory text: "Add another payment method before removing this one."
  - **Default method + autopay**: When user deletes the current default method (and count > 1), auto-promote the next most recent method to default. If autopay is active and the deleted method was being used for autopay, show a warning toast and let the new default take over for autopay.
  - **Atomic set-default RPC**: Replace the two-step client-side update with `set_default_payment_method(p_payment_method_id uuid)` RPC. Single transaction: validate ownership, clear all is_default for tenant, set target. Eliminates the race condition in the current non-atomic implementation.
  - **Detach from Stripe**: When deleting from local DB, also detach the PaymentMethod from the Stripe Customer via API to prevent stale methods from appearing in Stripe Dashboard.
**Applies to**: PAY-07, PAY-16

## Code Context

### Existing Assets to Leverage
- `lease_tenants.responsibility_percentage` — ready to use, just needs business logic wiring
- `stripe.*` schema (28 tables) with RLS and webhook sync infrastructure
- `payment_methods` table with `is_default`, `tenant_id` columns
- `formatCurrency()` in `src/components/payments/payment-utils.ts`
- `stripe_webhook_events` table for idempotency
- `rent_payments.tenant_id` for per-tenant payment tracking

### Files Requiring Changes
- `supabase/functions/stripe-webhooks/index.ts` — PAY-02, PAY-10, PAY-11, PAY-15
- `supabase/functions/stripe-rent-checkout/index.ts` — PAY-14, PAY-21
- `supabase/functions/stripe-autopay-charge/index.ts` — PAY-08, PAY-13, PAY-14
- `supabase/functions/deno.json` — Stripe SDK version upgrade
- `src/hooks/api/use-payment-methods.ts` — PAY-07, PAY-16
- `src/app/(tenant)/tenant/payments/methods/tenant-payment-methods.client.tsx` — PAY-07 UI
- `src/components/payments/payment-utils.ts` — PAY-06 formatter consolidation
- New migration(s) for: rent_due.amount type change, autopay tracking columns, webhook status columns, responsibility_percentage constraint, onboarding backfill

### Patterns to Follow
- All RPCs use `SECURITY DEFINER` with `SET search_path TO 'public'` and `auth.uid()` guard (Phase 1 pattern)
- Webhook handler uses `stripe_webhook_events` for idempotency
- PostgREST queries use `{ count: 'exact' }` for pagination
- Mutations invalidate related TanStack Query keys including dashboard keys

## Deferred Ideas (Out of Phase Scope)
- Late fee calculation engine (Phase 6 or future milestone)
- Per-tenant rent_due records (over-engineering for current maturity — compute dynamically instead)
- Stripe Connect Express → Standard upgrade (future milestone)
- Payment method type expansion beyond card/ACH (future milestone)
- Real-time payment status via Stripe webhooks → Supabase Realtime (Phase 8 performance)
