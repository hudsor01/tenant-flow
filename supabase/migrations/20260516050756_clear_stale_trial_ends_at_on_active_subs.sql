-- Session 11 P1 #3: backfill stale trial_ends_at on already-converted accounts.
--
-- The trial_model migration (20260419230000) added trial_ends_at and documented
-- that it should be NULL "once user converts to a paid subscription". The
-- intent was that Stripe webhooks would clear the timestamp when the user
-- upgraded. The handlers never did the clear, so converted-paying accounts
-- accumulated stale trial_ends_at values from their original signup-trial
-- window — sometimes weeks or months in the past.
--
-- Battle-test Session 10 surfaced one such account:
--   stripe_customer_id: cus_UWAf50IxPkmq4u
--   trial_ends_at:      2026-05-06T23:05:55Z (9 days past on 2026-05-15)
--   subscription_status: active
--
-- The matching Edge Function fix lands in this PR
-- (customer-subscription-updated.ts + checkout-session-completed.ts).
-- This migration cleans up the existing rows so the read-side stops seeing
-- stale data before the next webhook fires.
--
-- Scope: only rows where the account is genuinely past-trial — any non-trial
-- Stripe-managed subscription_status with a NOT NULL trial_ends_at. Excludes:
--   - subscription_status = 'trialing' (the column is still load-bearing)
--   - trial_ends_at IS NULL already (no-op)

begin;

update public.users
set trial_ends_at = null,
    subscription_updated_at = now()
where trial_ends_at is not null
  and subscription_status is not null
  and subscription_status <> 'trialing';

commit;
