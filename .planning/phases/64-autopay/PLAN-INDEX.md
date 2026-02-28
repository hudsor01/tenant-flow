# Phase 64: Autopay — Plan Index

## Trigger Mechanism Decision: pg_cron + Edge Function

**Evaluated:**
1. **Stripe Subscriptions** -- NOT viable. Subscriptions cannot replicate the destination charge pattern (`transfer_data.destination` + `application_fee_amount`) that Phase 59 uses. Each rent payment routes to a different owner's Express account with a different fee split. Stripe Subscriptions are designed for SaaS billing, not multi-landlord rent collection.

2. **pg_cron + Edge Function** -- CHOSEN. The project already uses pg_cron for 4 scheduled jobs (late fees, lease reminders, payment reminders, lease expiry). A new daily job queries `rent_due` records due today where the tenant has autopay enabled, then invokes an Edge Function that creates an off-session PaymentIntent with the same destination charge pattern as manual checkout. Stripe's built-in retry/dunning handles failures.

3. **Hybrid (pg_cron trigger + Stripe retry)** -- This IS the chosen approach. pg_cron fires the initial charge; Stripe retries failed charges via its smart retry logic (up to 4 attempts over ~7 days). The webhook handler already processes `payment_intent.payment_failed` events.

## Architecture

```
pg_cron (daily 07:00 UTC)
  -> process_autopay_charges() [SECURITY DEFINER SQL function]
     -> For each eligible rent_due record:
        -> net.http_post() to stripe-autopay-charge Edge Function
           -> Stripe PaymentIntent.create({ off_session: true, confirm: true })
              -> Webhook: payment_intent.succeeded -> rent_payments record + receipt emails
              -> Webhook: payment_intent.payment_failed -> failure notification email
```

## Plans

### 64-01: Schema + Autopay Edge Function
**Scope:** Database migration, Edge Function, pg_cron job, webhook handler updates, failure email template
**Files:**
- `supabase/migrations/YYYYMMDDHHmmss_autopay_schema_and_cron.sql`
- `supabase/functions/stripe-autopay-charge/index.ts`
- `supabase/functions/stripe-webhooks/index.ts` (add `setup_future_usage` metadata + failure email)
- `supabase/functions/stripe-webhooks/_templates/autopay-failed.tsx`
- `supabase/functions/stripe-rent-checkout/index.ts` (add `setup_future_usage: 'off_session'`)

### 64-02: Frontend — Autopay Toggle + Payment Settings
**Scope:** Wire up existing autopay page, implement real mutations, update autopay status query
**Files:**
- `apps/frontend/src/hooks/api/use-tenant-portal.ts` (real autopay mutations + updated status query)
- `apps/frontend/src/app/(tenant)/tenant/payments/autopay/page.tsx` (wire to real data)

## Dependencies
- 64-01 must complete before 64-02 (frontend depends on Edge Function + schema)

## Success Criteria Mapping
1. "Tenant can toggle autopay on" -> 64-02 (frontend toggle) + 64-01 (schema `auto_pay_enabled`)
2. "On rent due date, automatic charge fires" -> 64-01 (pg_cron + Edge Function)
3. "Failed charge notification + status" -> 64-01 (failure email template + webhook handler)
