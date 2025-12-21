-- Schema Migration: property_owners -> stripe_connected_accounts
-- This renames the Stripe Connect metadata table to the new canonical name used by the app.

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

comment on table public.stripe_connected_accounts is
'Stripe Connect account information only. All users are in users table with user_type column.';

