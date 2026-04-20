-- v2.1 Phase 51: 14-day free trial model.
--
-- Before this migration, new landlord signups hit the proxy.ts subscription
-- gate immediately with subscription_status=NULL and were redirected to
-- /pricing — no onboarding window, no trial. The (deleted) drip emails
-- advertised a "14-day free trial" the product didn't actually implement.
--
-- This migration adds the trial model that matches the marketing promise:
--   1. users.trial_ends_at timestamptz column
--   2. BEFORE INSERT trigger: puts new signups into subscription_status='trialing'
--      with trial_ends_at = now()+14d, unless a subscription state is already set
--      (Stripe webhook can still overwrite on upgrade)
--   3. Daily pg_cron job: demotes expired trials to subscription_status='expired'
--      so proxy.ts correctly redirects them to /pricing
--   4. One-time backfill: existing users with NULL subscription_status get a
--      fresh 14-day window starting now (generous but simple — pre-launch)
--
-- The proxy middleware already accepts 'trialing' as a valid gate state, so
-- no proxy.ts changes are required.

begin;

-- ============================================================================
-- 1. trial_ends_at column
-- ============================================================================
alter table public.users
  add column if not exists trial_ends_at timestamptz;

comment on column public.users.trial_ends_at is
  'When the 14-day free trial expires. NULL once user converts to a paid subscription. Populated by set_trial_on_signup() on INSERT and cleared by Stripe webhooks on upgrade.';

create index if not exists idx_users_trial_ends_at
  on public.users (trial_ends_at)
  where subscription_status = 'trialing';

-- ============================================================================
-- 2. BEFORE INSERT trigger: put new signups into trial state
-- ============================================================================
create or replace function public.set_trial_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- Only set trial if subscription state isn't already populated (e.g. Stripe
  -- webhook race wrote subscription_status='active' before the user row lands).
  if new.subscription_status is null then
    new.subscription_status := 'trialing';
    new.trial_ends_at := now() + interval '14 days';
  end if;
  return new;
end;
$function$;

comment on function public.set_trial_on_signup() is
  '14-day free trial for new landlord signups. Sets subscription_status=trialing + trial_ends_at=now()+14d on INSERT to public.users if subscription_status is still NULL (lets Stripe webhooks pre-empt the trial on instant upgrade).';

drop trigger if exists trial_on_signup on public.users;
create trigger trial_on_signup
  before insert on public.users
  for each row
  execute function public.set_trial_on_signup();

-- ============================================================================
-- 3. expire_trials() — called daily by pg_cron
-- ============================================================================
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
    and trial_ends_at < now();

  get diagnostics expired_count = row_count;

  raise notice 'expire_trials: expired % trial(s)', expired_count;
  return expired_count;
end;
$function$;

comment on function public.expire_trials() is
  'pg_cron nightly job: demote users whose trial_ends_at has passed to subscription_status=expired. proxy.ts gate then correctly redirects them to /pricing on next request.';

-- Schedule the job daily at 03:00 UTC (matches the cleanup-jobs window in CLAUDE.md).
-- Idempotent: unschedule first in case migration replays.
select cron.unschedule('expire-trials') where exists (
  select 1 from cron.job where jobname = 'expire-trials'
);

select cron.schedule(
  'expire-trials',
  '0 3 * * *',
  $$select public.expire_trials();$$
);

-- ============================================================================
-- 4. Backfill: existing users with NULL subscription_status get a fresh trial
-- ============================================================================
update public.users
set subscription_status = 'trialing',
    trial_ends_at = now() + interval '14 days',
    subscription_updated_at = now()
where subscription_status is null
  and deletion_requested_at is null;

commit;
