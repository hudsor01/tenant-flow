# Billing / Stripe Integration

**Also called:** billing, payments, subscriptions, stripe stuff
**Status:** Active

## What It Is

Stripe subscription management for property owners (subscription tiers) and tenant rent payments (one-time + autopay).

## Key Files

| File | Purpose |
|------|---------|
| supabase/functions/stripe-webhooks/ | Webhook handler — modular, one file per event type |
| supabase/functions/stripe-checkout-session/ | Checkout session creation (rate-limited) |
| supabase/functions/detach-payment-method/ | Detach from Stripe before DB deletion |
| src/hooks/api/query-keys/billing-keys.ts | Query key factory for billing queries |
| src/hooks/api/query-keys/payment-keys.ts | Query key factory for payment queries |
| stripe.subscriptions (PostgREST) | Query for subscription status — don't call Stripe API for reads |
| stripe.invoices (PostgREST) | Query for invoice history |

## Key Conventions

- Amount columns store dollars (numeric). Convert ×100 only in Edge Functions when calling Stripe API.
- Query `stripe.subscriptions` for real status (`active`, `past_due`, `canceled`, `unpaid`) — never check `users.stripe_customer_id` existence.
- Webhook idempotency tracked in `stripe_webhook_events.status`: `processing / succeeded / failed`.
- Payment method deletion MUST call `detach-payment-method` Edge Fn before DB deletion — no DB-only deletion.
- Autopay retry: `rent_due` has `autopay_attempts`, `autopay_last_attempt_at`, `autopay_next_retry_at` — 3 attempts over 7 days via pg_cron.
- After first successful payment, set default payment method via `set_default_payment_method` RPC.

## Stripe Webhook Events Handled

- `invoice.payment_succeeded` — set default payment method after first payment
- `invoice.payment_failed` — handle failed payments
- `customer.subscription.deleted` — handle cancellations
- `customer.subscription.trial_will_end` — send trial ending notifications
