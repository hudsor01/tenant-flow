-- Fix properties table to reference users directly, not through property_owners table
-- property_owners table should ONLY be for Stripe Connect account data
-- All users (owners and tenants) are in users table with user_type column

-- Step 1: Add new owner_user_id column that references users.id
alter table public.properties
add column if not exists owner_user_id uuid;

-- Step 2: Populate owner_user_id from property_owners.user_id
-- This migrates existing data by looking up the user_id from property_owners
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'property_owner_id'
  ) and to_regclass('public.property_owners') is not null then
    update public.properties p
    set owner_user_id = po.user_id
    from public.property_owners po
    where p.property_owner_id = po.id;
  end if;
end $$;

-- Step 3: Make owner_user_id NOT NULL (all properties must have an owner)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'owner_user_id'
  ) then
    if not exists (
      select 1 from public.properties where owner_user_id is null
    ) then
      alter table public.properties
      alter column owner_user_id set not null;
    end if;
  end if;
end $$;

-- Step 4: Add foreign key constraint to users table
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_owner_user_id_fkey'
  ) then
    alter table public.properties
    add constraint properties_owner_user_id_fkey
    foreign key (owner_user_id) references public.users(id) on delete cascade;
  end if;
end $$;

-- Step 5: Drop old property_owner_id column and its constraint
alter table public.properties
drop constraint if exists properties_property_owner_id_fkey;

alter table public.properties
drop column if exists property_owner_id cascade;

-- Step 6: Add comment explaining the architecture
comment on column public.properties.owner_user_id is
'References users.id where user_type = OWNER. property_owners table is only for Stripe Connect data.';

do $$
begin
  if to_regclass('public.property_owners') is not null then
    comment on table public.property_owners is
    'Stripe Connect account information only. All users are in users table with user_type column.';
  end if;
end $$;
