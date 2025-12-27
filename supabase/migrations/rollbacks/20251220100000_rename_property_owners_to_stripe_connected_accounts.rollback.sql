-- Rollback for 20251220100000_rename_property_owners_to_stripe_connected_accounts.sql
-- Run manually if you need to revert the rename.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'stripe_connected_accounts'
  ) then
    if not exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'property_owners'
    ) then
      alter table public.stripe_connected_accounts rename to property_owners;
    end if;
  end if;
end
$$;

