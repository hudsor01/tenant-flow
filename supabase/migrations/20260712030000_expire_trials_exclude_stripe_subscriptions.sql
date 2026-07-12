-- BILL-06/BILL-14 interaction fix (v9.0 Phase 36 perfect-PR cycle 2).
--
-- expire_trials() previously demoted EVERY trialing row past its deadline to
-- 'expired' and stamped subscription_updated_at = now() (wall-clock). Two other
-- Phase-36 changes make that unsafe:
--   * BILL-06 gives converting owners a CARRY-OVER Stripe trial, which sets
--     users.subscription_id (a Stripe-native trial, not a pure DB trial).
--   * BILL-14 makes the subscription webhook handlers skip any event whose
--     event.created predates the persisted subscription_updated_at watermark.
--
-- Combined failure: a Stripe trial's `customer.subscription.updated -> active`
-- conversion webhook is delayed into Stripe's retry queue past the 03:00 UTC
-- cron; expire_trials() flips the still-'trialing' row to 'expired' and advances
-- the watermark to now(); the retried conversion event (event.created earlier)
-- then fails the `lte` guard and is skipped forever, stranding a paying owner in
-- 'expired' and locked out by the proxy gate.
--
-- Stripe-managed subscriptions (subscription_id IS NOT NULL) have their trial
-- lifecycle owned entirely by the webhooks (trial_will_end -> conversion or
-- missing_payment_method cancel). expire_trials() must only demote PURE DB
-- trials (no Stripe subscription), so it can never advance the watermark past a
-- pending Stripe event.

create or replace function public.expire_trials()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  expired_count integer;
begin
  update public.users
  set subscription_status = 'expired',
      subscription_updated_at = now()
  where subscription_status = 'trialing'
    and trial_ends_at is not null
    and trial_ends_at < now()
    -- Only pure DB-managed trials. Stripe-native trials (subscription_id set)
    -- are governed by the webhook handlers, whose BILL-14 ordering watermark a
    -- wall-clock write here would corrupt.
    and subscription_id is null;

  get diagnostics expired_count = row_count;

  raise notice 'expire_trials: expired % DB trial(s)', expired_count;
  return expired_count;
end;
$function$;

comment on function public.expire_trials() is
  'pg_cron nightly job: demote pure DB-managed trials (subscription_id IS NULL) whose trial_ends_at has passed to subscription_status=expired. Stripe-native trials are excluded and handled by the subscription webhooks so the BILL-14 ordering watermark is never corrupted by a wall-clock write.';
