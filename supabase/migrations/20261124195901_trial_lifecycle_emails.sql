-- Trial lifecycle emails: the send log, the config, the invoker and the job.
--
-- An owner on the database-managed 14-day trial heard nothing from TenantFlow
-- after signing up: expire_trials() only flips the status, and the one trial
-- email (Stripe's trial_will_end) fires only for Stripe-managed trials. The
-- `trial-lifecycle` Edge Function now sends a welcome, a first-property nudge,
-- a trial-ending warning and a trial-ended note (rules and copy:
-- supabase/functions/_shared/trial-lifecycle.ts). This migration gives it:
--
--   1. public.trial_lifecycle_emails: one row per owner per email kind, ever.
--      The unique key is the exactly-once claim; the row id is the Resend
--      Idempotency-Key. service_role only: no owner reads or writes it.
--   2. app_config rows: the function URL, a shared secret generated here (it
--      never appears in a file, a log or an Edge secret: the function reads it
--      from this table to check the Bearer), the launch time (owners who signed
--      up before it get no welcome) and a kill switch that starts 'false'.
--   3. public.invoke_trial_lifecycle(): the pg_cron caller, a no-op unless the
--      switch is 'true'. SECURITY DEFINER, no EXECUTE for anon/authenticated.
--   4. An hourly job at :07, a free slot (check-cron-health runs at :00).

-- 1. The send log.
create table public.trial_lifecycle_emails (
	id uuid primary key default gen_random_uuid(),
	owner_user_id uuid not null references public.users (id) on delete cascade,
	kind text not null check (
		kind in ('welcome', 'add_first_property', 'trial_ending', 'trial_ended')
	),
	status text not null default 'claimed' check (status in ('claimed', 'sent')),
	resend_message_id text,
	created_at timestamptz not null default now(),
	sent_at timestamptz,
	constraint trial_lifecycle_emails_owner_kind_key unique (owner_user_id, kind)
);

comment on table public.trial_lifecycle_emails is
	'Trial lifecycle emails sent (or claimed) per owner: one row per owner per kind, ever. The unique key is the exactly-once claim, the id the Resend Idempotency-Key. Written only by the trial-lifecycle Edge Function (service_role).';

alter table public.trial_lifecycle_emails enable row level security;

revoke all on table public.trial_lifecycle_emails from anon, authenticated;

create policy service_role_only on public.trial_lifecycle_emails
	for all to service_role using (true) with check (true);

-- 2. Config. The secret is generated here and never leaves the database except
--    in the invoker's Authorization header.
insert into public.app_config (key, value)
values
	(
		'trial_lifecycle.url',
		'https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/trial-lifecycle'
	),
	('trial_lifecycle.secret', encode(extensions.gen_random_bytes(32), 'hex')),
	('trial_lifecycle.launch_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
	('trial_lifecycle.enabled', 'false')
on conflict (key) do nothing;

-- 3. The invoker.
create or replace function public.invoke_trial_lifecycle()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
	v_url     text;
	v_secret  text;
	v_enabled text;
begin
	select value into v_enabled from public.app_config where key = 'trial_lifecycle.enabled';
	if v_enabled is distinct from 'true' then
		return;
	end if;

	select value into v_url    from public.app_config where key = 'trial_lifecycle.url';
	select value into v_secret from public.app_config where key = 'trial_lifecycle.secret';
	if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
		return;
	end if;

	perform net.http_post(
		url     := v_url,
		headers := jsonb_build_object(
			'Content-Type',  'application/json',
			'Authorization', 'Bearer ' || v_secret
		),
		timeout_milliseconds := 30000
	);
end;
$$;

comment on function public.invoke_trial_lifecycle() is
	'pg_cron caller for the trial-lifecycle Edge Function: POSTs with Bearer <app_config trial_lifecycle.secret>. No-op unless app_config trial_lifecycle.enabled = ''true''. Not granted to public/anon/authenticated.';

revoke all on function public.invoke_trial_lifecycle() from public, anon, authenticated;

-- 4. The job.
select cron.schedule(
	'trial-lifecycle-emails',
	'7 * * * *',
	'select public.invoke_trial_lifecycle()'
);
