-- First-party funnel events (2026-11-24 SEO audit T1, roadmap PR 3a).
--
-- TenantFlow records a few product events in its own database instead of a
-- paid analytics plan: a "Start free" click, a signup started and completed,
-- a checkout started and completed. Joined to `users` and their subscription
-- state, they answer "where do visitors drop out" in SQL.
--
-- WRITE PATH. Only the `track-event` Edge Function writes, with the service
-- role, behind the shared fail-closed rate limiter (the same path as the
-- contact form and newsletter). No anon or authenticated INSERT grant and no
-- anon-executable SECURITY DEFINER function, so the database's anonymous
-- surface does not grow.
--
-- PRIVACY. No IP address, no user agent, no cookie: a random per-visit id the
-- browser keeps in sessionStorage, the page path, the referrer's host, and the
-- signed-in owner's id when there is one. Rows are deleted after 180 days, and
-- account deletion unlinks them from the owner (anonymize_deleted_user).
--
-- The event names below are a closed list, copied in
-- supabase/functions/_shared/track-event-payload.ts and src/lib/analytics/
-- track.ts; supabase/functions/__tests__/track-event-payload.test.ts holds
-- the three together.

create table public.analytics_events (
	id bigint generated always as identity primary key,
	name text not null
		constraint analytics_events_name_check check (
			name in (
				'cta_start_free',
				'signup_started',
				'signup_completed',
				'checkout_started',
				'checkout_completed'
			)
		),
	props jsonb not null default '{}'::jsonb
		constraint analytics_events_props_check check (
			jsonb_typeof(props) = 'object' and pg_column_size(props) <= 2048
		),
	path text
		constraint analytics_events_path_check check (char_length(path) <= 512),
	referrer_host text
		constraint analytics_events_referrer_host_check check (
			char_length(referrer_host) <= 255
		),
	visit_id uuid,
	user_id uuid references public.users (id) on delete set null,
	created_at timestamptz not null default now()
);

comment on table public.analytics_events is
	'First-party funnel events written only by the track-event Edge Function. No IP, user agent or cookie; deleted after 180 days.';

create index analytics_events_created_at_idx
	on public.analytics_events (created_at);
create index analytics_events_name_created_at_idx
	on public.analytics_events (name, created_at);
create index analytics_events_user_id_idx
	on public.analytics_events (user_id)
	where user_id is not null;

-- New public tables auto-grant authenticated SELECT/INSERT/UPDATE/DELETE
-- (default ACLs). Take them all back; admins read through the policy below.
alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from public, anon, authenticated;
grant select on table public.analytics_events to authenticated;

create policy analytics_events_select_admin
	on public.analytics_events
	for select
	to authenticated
	using ((select public.is_admin()));

-- The funnel, step by step, over the last p_days days: events, distinct
-- visits and distinct signed-in owners per step. Admin-only, like
-- get_funnel_stats; the SQL editor (no JWT role) may also run it.
create function public.get_marketing_funnel(p_days integer default 30)
returns table (step text, events bigint, visits bigint, owners bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
	if coalesce((select auth.role()), '') = 'authenticated'
		and not (select public.is_admin()) then
		raise exception 'unauthorized' using errcode = '42501';
	end if;

	return query
	select
		s.step,
		count(e.id),
		count(distinct e.visit_id),
		count(distinct e.user_id)
	from unnest(array[
		'cta_start_free',
		'signup_started',
		'signup_completed',
		'checkout_started',
		'checkout_completed'
	]) with ordinality as s (step, ord)
	left join public.analytics_events e
		on e.name = s.step
		and e.created_at >= now() - make_interval(days => greatest(p_days, 1))
	group by s.step, s.ord
	order by s.ord;
end;
$$;

revoke all on function public.get_marketing_funnel(integer)
	from public, anon, authenticated;
grant execute on function public.get_marketing_funnel(integer)
	to authenticated, service_role;

-- Retention: events older than 180 days, in bounded batches.
create function public.cleanup_analytics_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	delete from public.analytics_events
	where id in (
		select id
		from public.analytics_events
		where created_at < now() - interval '180 days'
		limit 10000
		for update skip locked
	);
end;
$$;

revoke all on function public.cleanup_analytics_events()
	from public, anon, authenticated;
grant execute on function public.cleanup_analytics_events() to service_role;

-- 03:55 UTC: the last free slot in the 03:00-04:00 retention window.
select cron.schedule(
	'cleanup-analytics-events',
	'55 3 * * *',
	'select public.cleanup_analytics_events()'
);

-- Account deletion unlinks a departing owner's events (CLAUDE.md: new owner
-- data joins anonymize_deleted_user). The body is production's, plus the
-- analytics_events line before the users update.
create or replace function public.anonymize_deleted_user(p_user_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_has_active_leases boolean;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'user % not found', p_user_id;
  end if;

  select exists(
    select 1 from public.leases
    where owner_user_id = p_user_id and lease_status = 'active'
  ) into v_has_active_leases;

  if v_has_active_leases then
    raise exception 'Cannot delete account with active leases. Please end all leases first.';
  end if;

  update public.properties set status = 'inactive' where owner_user_id = p_user_id;
  update public.activity set description = '[deleted user activity]' where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.notifications_archive where user_id = p_user_id;
  delete from public.user_preferences where user_id = p_user_id;
  delete from public.notification_settings where user_id = p_user_id;

  -- Phase 66 (D-12). Applications belong to a departing owner; see header (c).
  -- Applications first: link_id is ON DELETE SET NULL against
  -- rental_application_links, so the reverse order would set-null rows that are
  -- being deleted in the same statement block.
  delete from public.rental_applications where owner_user_id = p_user_id;
  delete from public.rental_application_links where owner_user_id = p_user_id;

  -- 2026-11-25: funnel events stay as anonymous counts, unlinked.
  update public.analytics_events set user_id = null where user_id = p_user_id;

  update public.users
  set full_name = '[deleted user]',
      email = '[deleted-' || p_user_id::text || ']',
      first_name = null,
      last_name = null,
      phone = null,
      avatar_url = null,
      status = 'inactive'
  where id = p_user_id;
end;
$function$;
