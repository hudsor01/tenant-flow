-- Narrow the signup trigger's removal of a leftover public.users row
-- (20261124215400) to rows that hold nothing worth keeping.
--
-- A signup needs no confirmed email to fire ensure_public_user_for_auth(), so
-- anyone can sign up with the address of a row whose auth user was deleted.
-- That row can still be recovered by restoring the auth user with the same id,
-- and deleting it cascades to everything it owns. So the trigger now removes it
-- only when it owns no owner-created data and has no Stripe customer or
-- subscription. Otherwise the insert fails on the unique email key, as it did
-- before 20261124215400, and the data stays until someone decides what to do.
--
-- Not counted as owner data: rows every account gets at signup or from logging
-- (preferences, notification settings, feature access, default document
-- categories, the tour, notifications, the funnel and gate logs, trial emails,
-- access and audit logs).

-- Started from the production body (pg_get_functiondef, 2026-11-24).
create or replace function public.ensure_public_user_for_auth()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  resolved_email text;
  names record;
begin
  resolved_email := coalesce(nullif(new.email, ''), new.raw_user_meta_data ->> 'email', 'unknown@example.com');
  select * into names from public.auth_metadata_names(new.raw_user_meta_data, resolved_email);

  -- A row for this address whose auth user was deleted would fail the
  -- unique email key below. Remove it only when it holds nothing to keep.
  delete from public.users as stale
  where lower(stale.email) = lower(resolved_email)
    and stale.id <> new.id
    and not exists (select 1 from auth.users as a where a.id = stale.id)
    and stale.stripe_customer_id is null
    and stale.subscription_id is null
    and not exists (select 1 from public.properties as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.units as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.tenants as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.leases as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.maintenance_requests as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.inspections as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.reports as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.document_template_definitions as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.esign_events as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.rent_charges as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.rent_receipts as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.rental_applications as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.rental_application_links as t where t.owner_user_id = stale.id)
    and not exists (select 1 from public.lease_signing_tokens as t where t.created_by = stale.id);

  insert into public.users as u (id, email, full_name, first_name, last_name)
  values (
    new.id,
    resolved_email,
    coalesce(names.full_name, 'Unknown User'),
    names.first_name,
    names.last_name
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, u.email),
        full_name = coalesce(nullif(excluded.full_name, ''), u.full_name),
        first_name = coalesce(u.first_name, excluded.first_name),
        last_name = coalesce(u.last_name, excluded.last_name),
        updated_at = now();

  return new;
end;
$function$;
