-- Signup names, and public.users rows left behind by deleted auth users.
--
-- 1. Names. ensure_public_user_for_auth() filled only full_name, and never
--    first_name, so every owner email greeted "Hi there". The email signup
--    form sends first_name and last_name in user metadata, which the trigger
--    ignored, so those owners' full_name fell back to their email address.
--    Google sends full_name/name (and sometimes given_name/family_name).
--    auth_metadata_names() reads all of them, in one place, for the trigger
--    and for the backfill below.
--
-- 2. Orphans. Deleting an auth user (service role: integration tests, the
--    dashboard) leaves its public.users row, and users.email is unique. The
--    trigger resolved only an id conflict, so the same address signing up
--    again failed with "Database error saving new user". The trigger now
--    removes a same-email row whose auth user no longer exists before it
--    inserts. A leftover that still owns rows behind a NO ACTION foreign key
--    (rental applications, application links, signing tokens) still blocks
--    the insert, as before, rather than losing that data silently.

-- Names from auth user metadata. Pure: reads only its arguments.
create or replace function public.auth_metadata_names(meta jsonb, email text)
returns table (first_name text, last_name text, full_name text)
language plpgsql
immutable
set search_path to ''
as $function$
declare
  v_meta jsonb := coalesce(meta, '{}'::jsonb);
  v_first text := nullif(btrim(v_meta ->> 'first_name'), '');
  v_last text := nullif(btrim(v_meta ->> 'last_name'), '');
  v_name text := nullif(
    regexp_replace(
      btrim(coalesce(nullif(btrim(v_meta ->> 'full_name'), ''), v_meta ->> 'name', '')),
      '\s+', ' ', 'g'),
    '');
begin
  -- A "name" that is an email address is not a name.
  if v_name is not null and position('@' in v_name) > 0 then
    v_name := null;
  end if;

  v_first := coalesce(v_first, nullif(btrim(v_meta ->> 'given_name'), ''));
  v_last := coalesce(v_last, nullif(btrim(v_meta ->> 'family_name'), ''));

  if v_first is null and v_name is not null then
    v_first := split_part(v_name, ' ', 1);
    v_last := coalesce(v_last, nullif(btrim(substr(v_name, length(v_first) + 2)), ''));
  end if;

  first_name := v_first;
  last_name := v_last;
  full_name := coalesce(nullif(btrim(concat_ws(' ', v_first, v_last)), ''), v_name, email);
  return next;
end;
$function$;

revoke all on function public.auth_metadata_names(jsonb, text) from public, anon, authenticated;

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
  -- unique email key below.
  delete from public.users as stale
  where lower(stale.email) = lower(resolved_email)
    and stale.id <> new.id
    and not exists (select 1 from auth.users as a where a.id = stale.id);

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

-- Backfill: fill a missing first or last name, and replace a full_name that
-- is only the email address. Never overwrites a name an owner set, and never
-- touches an anonymized row (its auth metadata still holds the old name).
update public.users as u
set first_name = coalesce(u.first_name, n.first_name),
    last_name = coalesce(u.last_name, n.last_name),
    full_name = case
      when (u.full_name = u.email or position('@' in u.full_name) > 0)
        and n.full_name is not null and position('@' in n.full_name) = 0
        then n.full_name
      else u.full_name
    end,
    updated_at = now()
from auth.users as a,
  lateral public.auth_metadata_names(a.raw_user_meta_data, a.email) as n
where a.id = u.id
  and u.status <> 'inactive'
  and u.full_name <> '[deleted user]'
  and u.email not like '[deleted-%'
  and (
    (u.first_name is null and n.first_name is not null)
    or (u.last_name is null and n.last_name is not null)
    or ((u.full_name = u.email or position('@' in u.full_name) > 0)
        and n.full_name is not null and position('@' in n.full_name) = 0)
  );

-- Remove the rows already left behind (25 on 2026-11-24, none owning a
-- property, tenant or lease). Capped, so this never runs as a broad delete.
do $$
declare
  v_orphans integer;
begin
  select count(*) into v_orphans
  from public.users as u
  where not exists (select 1 from auth.users as a where a.id = u.id);

  if v_orphans > 25 then
    raise exception 'refusing to delete % orphaned public.users rows (expected at most 25)', v_orphans;
  end if;

  delete from public.users as u
  where not exists (select 1 from auth.users as a where a.id = u.id);
end;
$$;
