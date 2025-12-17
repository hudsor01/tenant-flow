-- Fix properties table to reference users directly, not through property_owners table
-- property_owners table should ONLY be for Stripe Connect account data
-- All users (owners and tenants) are in users table with user_type column

-- Step 1: Add new owner_user_id column that references users.id
alter table public.properties
add column owner_user_id uuid;

-- Step 2: Populate owner_user_id from property_owners.user_id
-- This migrates existing data by looking up the user_id from property_owners
update public.properties p
set owner_user_id = po.user_id
from public.property_owners po
where p.property_owner_id = po.id;

-- Step 3: Make owner_user_id NOT NULL (all properties must have an owner)
alter table public.properties
alter column owner_user_id set not null;

-- Step 4: Add foreign key constraint to users table
alter table public.properties
add constraint properties_owner_user_id_fkey
foreign key (owner_user_id) references public.users(id) on delete cascade;

-- Step 5: Drop old property_owner_id column and its constraint
alter table public.properties
drop constraint if exists properties_property_owner_id_fkey;

alter table public.properties
drop column property_owner_id;

-- Step 6: Add comment explaining the architecture
comment on column public.properties.owner_user_id is
'References users.id where user_type = OWNER. property_owners table is only for Stripe Connect data.';

comment on table public.property_owners is
'Stripe Connect account information only. All users are in users table with user_type column.';
