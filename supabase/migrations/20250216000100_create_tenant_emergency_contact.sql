-- Create tenant_emergency_contact table
-- Purpose: Store emergency contact information for tenants
-- Relationship: One-to-one with tenant table
-- Status: ✅ APPLIED SUCCESSFULLY IN PRODUCTION (2025-02-16)

-- Create table
create table if not exists tenant_emergency_contact (
  id TEXT primary key default gen_random_uuid ()::text,
  tenant_id TEXT not null unique references tenant (id) on delete CASCADE,
  contact_name TEXT not null check (
    length(contact_name) > 0
    and length(contact_name) <= 255
  ),
  relationship TEXT not null check (
    length(relationship) > 0
    and length(relationship) <= 100
  ),
  phone_number TEXT not null check (
    length(phone_number) >= 10
    and length(phone_number) <= 20
  ),
  email TEXT check (
    email is null
    or (
      length(email) > 0
      and length(email) <= 255
      and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
  ),
  created_at TIMESTAMPTZ not null default now(),
  updated_at TIMESTAMPTZ not null default now()
);

-- Create index on tenant_id for fast lookups
create index IF not exists idx_tenant_emergency_contact_tenant_id on tenant_emergency_contact (tenant_id);

-- Ensure index on tenant.auth_user_id (recommended for policy performance)
create index IF not exists idx_tenant_auth_user_id on tenant (auth_user_id);

-- Enable RLS
alter table tenant_emergency_contact ENABLE row LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
drop policy IF exists "tenant_emergency_contact_select_own" on tenant_emergency_contact;

drop policy IF exists "tenant_emergency_contact_insert_own" on tenant_emergency_contact;

drop policy IF exists "tenant_emergency_contact_update_own" on tenant_emergency_contact;

drop policy IF exists "tenant_emergency_contact_delete_own" on tenant_emergency_contact;

-- RLS Policies: Tenants can manage their own emergency contacts
-- SELECT: Tenant can view their own emergency contact
create policy "tenant_emergency_contact_select_own" on tenant_emergency_contact for
select
  to authenticated using (
    exists (
      select
        1
      from
        tenant t
      where
        t.id = tenant_emergency_contact.tenant_id
        and t.auth_user_id = auth.uid ()
    )
  );

-- INSERT: Tenant can create their own emergency contact (one-to-one enforced by UNIQUE constraint)
create policy "tenant_emergency_contact_insert_own" on tenant_emergency_contact for INSERT to authenticated
with
  check (
    exists (
      select
        1
      from
        tenant t
      where
        t.id = tenant_emergency_contact.tenant_id
        and t.auth_user_id = auth.uid ()
    )
  );

-- UPDATE: Tenant can update their own emergency contact
create policy "tenant_emergency_contact_update_own" on tenant_emergency_contact
for update
  to authenticated using (
    exists (
      select
        1
      from
        tenant t
      where
        t.id = tenant_emergency_contact.tenant_id
        and t.auth_user_id = auth.uid ()
    )
  )
with
  check (
    exists (
      select
        1
      from
        tenant t
      where
        t.id = tenant_emergency_contact.tenant_id
        and t.auth_user_id = auth.uid ()
    )
  );

-- DELETE: Tenant can delete their own emergency contact
create policy "tenant_emergency_contact_delete_own" on tenant_emergency_contact for DELETE to authenticated using (
  exists (
    select
      1
    from
      tenant t
    where
      t.id = tenant_emergency_contact.tenant_id
      and t.auth_user_id = auth.uid ()
  )
);

-- Create updated_at trigger
create or replace function update_tenant_emergency_contact_updated_at () RETURNS TRIGGER as $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger IF exists tenant_emergency_contact_updated_at on tenant_emergency_contact;

create trigger tenant_emergency_contact_updated_at BEFORE
update on tenant_emergency_contact for EACH row
execute FUNCTION update_tenant_emergency_contact_updated_at ();

-- Verification: Check table exists and RLS is enabled
do $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_emergency_contact') THEN
    RAISE EXCEPTION 'Table tenant_emergency_contact was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_emergency_contact' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'RLS is not enabled on tenant_emergency_contact';
  END IF;

  -- Verify all 4 policies exist
  IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_emergency_contact') < 4 THEN
    RAISE EXCEPTION 'Not all RLS policies were created for tenant_emergency_contact';
  END IF;

  RAISE NOTICE '✅ tenant_emergency_contact table created successfully';
  RAISE NOTICE '✅ RLS enabled and all 4 policies created';
  RAISE NOTICE '✅ Updated_at trigger created';
END $$;
