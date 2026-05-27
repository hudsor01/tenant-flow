-- Schema Migration: property_owners -> stripe_connected_accounts
-- This renames the Stripe Connect metadata table to the new canonical name used by the app.
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap the trailing COMMENT in a
-- table-existence guard. If the rename did not fire (e.g. on a chain
-- replay where property_owners wasn't present at this point), the
-- unconditional COMMENT failed with SQLSTATE 42P01. Guarding the COMMENT
-- with to_regclass keeps prod behavior (table exists, comment lands) and
-- makes chain replay safe.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'property_owners'
  ) then
    if not exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'stripe_connected_accounts'
    ) then
      alter table public.property_owners rename to stripe_connected_accounts;
    end if;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.stripe_connected_accounts') is not null then
    execute $cmd$comment on table public.stripe_connected_accounts is 'Stripe Connect account information only. All users are in users table with user_type column.'$cmd$;
  end if;
end $$;

