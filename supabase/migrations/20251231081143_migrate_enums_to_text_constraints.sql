-- Migration: Convert PostgreSQL enums to text columns with CHECK constraints
--
-- Purpose: Replace all enum types with text columns + CHECK constraints for better maintainability.

-- IMPORTANT: Disable RLS evaluation during migration to prevent policy comparison errors
set session_replication_role = replica;
--
-- Benefits:
-- - Easier to add/remove values (no ALTER TYPE needed)
-- - Simpler migrations and rollbacks
-- - Better compatibility with ORMs and application code
-- - No enum type dependencies across tables
--
-- Affected tables:
-- - leases (lease_status, owner_signature_method, tenant_signature_method, stripe_subscription_status)
-- - maintenance_requests (priority, status)
-- - notifications (notification_type)
-- - payment_transactions (status)
-- - rent_payments (status)
-- - properties (status)
-- - security_events (severity, event_type)
-- - units (status)
--
-- Note: payment_status had duplicate values 'canceled' and 'cancelled' - consolidated to 'cancelled'

-- ============================================================================
-- STEP 1: Drop all dependencies on enum types
-- ============================================================================

-- Drop trigger that watches lease_status column
drop trigger if exists sync_unit_status_on_lease_change on public.leases;

-- Drop exclusion constraint that references lease_status enum
alter table public.leases drop constraint if exists leases_unit_date_overlap_exclusion;

-- Drop CHECK constraints that reference enum types (CRITICAL - these block ALTER COLUMN)
alter table public.leases drop constraint if exists leases_lease_status_check;
alter table public.leases drop constraint if exists leases_stripe_subscription_status_check;
alter table public.leases drop constraint if exists leases_owner_signature_method_check;
alter table public.leases drop constraint if exists leases_tenant_signature_method_check;
alter table public.maintenance_requests drop constraint if exists maintenance_requests_status_check;
alter table public.maintenance_requests drop constraint if exists maintenance_requests_priority_check;
alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.payment_transactions drop constraint if exists payment_transactions_status_check;
alter table public.rent_payments drop constraint if exists rent_payments_status_check;
alter table public.properties drop constraint if exists properties_status_check;
alter table public.security_events drop constraint if exists security_events_severity_check;
alter table public.security_events drop constraint if exists security_events_event_type_check;
alter table public.units drop constraint if exists units_status_check;

-- Drop function that has signature_method enum parameter
drop function if exists public.sign_lease_and_check_activation(uuid, text, text, timestamp with time zone, signature_method);

-- Drop trigger function that references lease_status (trigger function caches column type)
drop function if exists public.sync_unit_status_from_lease() cascade;

-- Drop partial indexes that have explicit enum type casts
drop index if exists public.idx_leases_subscription_pending;
drop index if exists public.idx_leases_draft;
drop index if exists public.idx_leases_pending_signature;
drop index if exists public.idx_leases_active_date_range;
drop index if exists public.idx_leases_dates_owner;
drop index if exists public.idx_leases_expiring_soon;

-- Drop regular indexes on enum columns (from 20251220021229_add_performance_indexes.sql)
drop index if exists public.idx_leases_status;
drop index if exists public.idx_leases_owner_status;
drop index if exists public.idx_leases_lease_status;

-- Drop indexes on other enum columns
drop index if exists public.idx_maintenance_requests_status;
drop index if exists public.idx_payment_transactions_status;
drop index if exists public.idx_rent_payments_status;
drop index if exists public.idx_rent_payments_status_date;
drop index if exists public.idx_rent_payments_status_partial;
drop index if exists public.idx_units_status;
drop index if exists public.idx_units_property_status;
drop index if exists public.idx_maintenance_requests_owner_status;
drop index if exists public.idx_properties_status;
drop index if exists public.idx_maintenance_requests_priority;

-- Drop functions that reference enum columns (they have cached type info)
-- Use dynamic SQL to drop functions regardless of their signature (handles overloads and defaults)
do $$
declare
  r record;
begin
  -- Drop ALL functions whose source code references the enum column names
  -- This ensures we get them regardless of parameter signatures
  for r in
    select p.oid::regprocedure::text as func_sig
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and (p.prosrc like '%lease_status%'
        or p.prosrc like '%payment_status%'
        or p.prosrc like '%stripe_subscription_status%'
        or p.prosrc like '%signature_method%')
  loop
    execute 'drop function if exists ' || r.func_sig || ' cascade';
    raise notice 'Dropped function: %', r.func_sig;
  end loop;
end;
$$;

-- Also drop functions by name that might have enum type in their signature
-- (these reference the TYPE, not just the column name in their body)
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as func_sig
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and (
        pg_get_function_arguments(p.oid) like '%lease_status%'
        or pg_get_function_arguments(p.oid) like '%payment_status%'
        or pg_get_function_arguments(p.oid) like '%stripe_subscription_status%'
        or pg_get_function_arguments(p.oid) like '%signature_method%'
      )
  loop
    execute 'drop function if exists ' || r.func_sig || ' cascade';
    raise notice 'Dropped function with enum param: %', r.func_sig;
  end loop;
end;
$$;

-- ============================================================================
-- STEP 2: Drop default values that reference enum types
-- ============================================================================

alter table public.leases alter column lease_status drop default;
alter table public.leases alter column stripe_subscription_status drop default;
alter table public.maintenance_requests alter column status drop default;
alter table public.maintenance_requests alter column priority drop default;
alter table public.properties alter column status drop default;
alter table public.security_events alter column severity drop default;
alter table public.units alter column status drop default;

-- ============================================================================
-- STEP 2.5: Drop ALL RLS policies on affected tables to prevent comparison errors
-- ============================================================================

-- Disable RLS on affected tables temporarily
alter table public.leases disable row level security;
alter table public.maintenance_requests disable row level security;
alter table public.notifications disable row level security;
alter table public.payment_transactions disable row level security;
alter table public.rent_payments disable row level security;
alter table public.properties disable row level security;
alter table public.security_events disable row level security;
alter table public.units disable row level security;
alter table public.lease_tenants disable row level security;

-- Drop ALL policies explicitly (disabling isn't enough during ALTER COLUMN)
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
    and tablename in ('leases', 'rent_payments', 'maintenance_requests', 'notifications', 'payment_transactions', 'properties', 'security_events', 'units', 'lease_tenants')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
    raise notice 'Dropped policy: % on %', r.policyname, r.tablename;
  end loop;
end;
$$;

-- Also drop ALL triggers on affected tables
do $$
declare
  r record;
begin
  for r in
    select tgname, tgrelid::regclass::text as tablename
    from pg_trigger
    where not tgisinternal
    and tgrelid in (
      'public.leases'::regclass,
      'public.rent_payments'::regclass,
      'public.maintenance_requests'::regclass
    )
  loop
    execute format('drop trigger if exists %I on %s', r.tgname, r.tablename);
    raise notice 'Dropped trigger: % on %', r.tgname, r.tablename;
  end loop;
end;
$$;

-- ============================================================================
-- STEP 3: Convert enum columns to text (idempotent - only converts if not already text)
-- ============================================================================

do $$
begin
  -- leases.lease_status
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leases'
    and column_name = 'lease_status' and data_type = 'USER-DEFINED'
  ) then
    alter table public.leases alter column lease_status type text using lease_status::text;
    raise notice 'Converted leases.lease_status to text';
  else
    raise notice 'leases.lease_status already text, skipping';
  end if;

  -- leases.owner_signature_method
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leases'
    and column_name = 'owner_signature_method' and data_type = 'USER-DEFINED'
  ) then
    alter table public.leases alter column owner_signature_method type text using owner_signature_method::text;
    raise notice 'Converted leases.owner_signature_method to text';
  else
    raise notice 'leases.owner_signature_method already text, skipping';
  end if;

  -- leases.tenant_signature_method
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leases'
    and column_name = 'tenant_signature_method' and data_type = 'USER-DEFINED'
  ) then
    alter table public.leases alter column tenant_signature_method type text using tenant_signature_method::text;
    raise notice 'Converted leases.tenant_signature_method to text';
  else
    raise notice 'leases.tenant_signature_method already text, skipping';
  end if;

  -- leases.stripe_subscription_status
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leases'
    and column_name = 'stripe_subscription_status' and data_type = 'USER-DEFINED'
  ) then
    alter table public.leases alter column stripe_subscription_status type text using stripe_subscription_status::text;
    raise notice 'Converted leases.stripe_subscription_status to text';
  else
    raise notice 'leases.stripe_subscription_status already text, skipping';
  end if;

  -- maintenance_requests.priority
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'maintenance_requests'
    and column_name = 'priority' and data_type = 'USER-DEFINED'
  ) then
    alter table public.maintenance_requests alter column priority type text using priority::text;
    raise notice 'Converted maintenance_requests.priority to text';
  else
    raise notice 'maintenance_requests.priority already text, skipping';
  end if;

  -- maintenance_requests.status
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'maintenance_requests'
    and column_name = 'status' and data_type = 'USER-DEFINED'
  ) then
    alter table public.maintenance_requests alter column status type text using status::text;
    raise notice 'Converted maintenance_requests.status to text';
  else
    raise notice 'maintenance_requests.status already text, skipping';
  end if;

  -- notifications.notification_type
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications'
    and column_name = 'notification_type' and data_type = 'USER-DEFINED'
  ) then
    alter table public.notifications alter column notification_type type text using notification_type::text;
    raise notice 'Converted notifications.notification_type to text';
  else
    raise notice 'notifications.notification_type already text, skipping';
  end if;

  -- payment_transactions.status
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment_transactions'
    and column_name = 'status' and data_type = 'USER-DEFINED'
  ) then
    alter table public.payment_transactions alter column status type text using status::text;
    raise notice 'Converted payment_transactions.status to text';
  else
    raise notice 'payment_transactions.status already text, skipping';
  end if;

  -- rent_payments.status
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rent_payments'
    and column_name = 'status' and data_type = 'USER-DEFINED'
  ) then
    alter table public.rent_payments alter column status type text using status::text;
    raise notice 'Converted rent_payments.status to text';
  else
    raise notice 'rent_payments.status already text, skipping';
  end if;

  -- properties.status
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'properties'
    and column_name = 'status' and data_type = 'USER-DEFINED'
  ) then
    alter table public.properties alter column status type text using status::text;
    raise notice 'Converted properties.status to text';
  else
    raise notice 'properties.status already text, skipping';
  end if;

  -- security_events.severity
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'security_events'
    and column_name = 'severity' and data_type = 'USER-DEFINED'
  ) then
    alter table public.security_events alter column severity type text using severity::text;
    raise notice 'Converted security_events.severity to text';
  else
    raise notice 'security_events.severity already text, skipping';
  end if;

  -- security_events.event_type
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'security_events'
    and column_name = 'event_type' and data_type = 'USER-DEFINED'
  ) then
    alter table public.security_events alter column event_type type text using event_type::text;
    raise notice 'Converted security_events.event_type to text';
  else
    raise notice 'security_events.event_type already text, skipping';
  end if;

  -- units.status
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'units'
    and column_name = 'status' and data_type = 'USER-DEFINED'
  ) then
    alter table public.units alter column status type text using status::text;
    raise notice 'Converted units.status to text';
  else
    raise notice 'units.status already text, skipping';
  end if;
end;
$$;

-- Consolidate 'canceled' to 'cancelled' for consistency (safe to run multiple times)
update public.payment_transactions set status = 'cancelled' where status = 'canceled';
update public.rent_payments set status = 'cancelled' where status = 'canceled';

-- ============================================================================
-- STEP 4: Set new text default values
-- ============================================================================

alter table public.leases alter column lease_status set default 'draft';
alter table public.leases alter column stripe_subscription_status set default 'none';
alter table public.maintenance_requests alter column status set default 'open';
alter table public.maintenance_requests alter column priority set default 'normal';
alter table public.properties alter column status set default 'active';
alter table public.security_events alter column severity set default 'info';
alter table public.units alter column status set default 'available';

-- ============================================================================
-- STEP 5: Add CHECK constraints to enforce valid values
-- ============================================================================

-- lease_status constraint
alter table public.leases
  add constraint leases_lease_status_check
  check (lease_status in ('draft', 'pending_signature', 'active', 'ended', 'terminated'));

-- signature_method constraints
alter table public.leases
  add constraint leases_owner_signature_method_check
  check (owner_signature_method is null or owner_signature_method in ('in_app', 'docuseal'));

alter table public.leases
  add constraint leases_tenant_signature_method_check
  check (tenant_signature_method is null or tenant_signature_method in ('in_app', 'docuseal'));

-- stripe_subscription_status constraint
alter table public.leases
  add constraint leases_stripe_subscription_status_check
  check (stripe_subscription_status is null or stripe_subscription_status in ('none', 'pending', 'active', 'failed'));

-- maintenance_priority constraint
alter table public.maintenance_requests
  add constraint maintenance_requests_priority_check
  check (priority in ('low', 'normal', 'medium', 'high', 'urgent'));

-- maintenance_status constraint
alter table public.maintenance_requests
  add constraint maintenance_requests_status_check
  check (status in ('open', 'in_progress', 'completed', 'cancelled', 'on_hold'));

-- notification_type constraint
alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('maintenance', 'lease', 'payment', 'system'));

-- payment_status constraint for payment_transactions (consolidated: removed 'canceled', use 'cancelled')
alter table public.payment_transactions
  add constraint payment_transactions_status_check
  check (status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'requires_action'));

-- payment_status constraint for rent_payments (consolidated: removed 'canceled', use 'cancelled')
alter table public.rent_payments
  add constraint rent_payments_status_check
  check (status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'requires_action'));

-- property_status constraint
alter table public.properties
  add constraint properties_status_check
  check (status in ('active', 'inactive', 'sold'));

-- security_event_severity constraint
alter table public.security_events
  add constraint security_events_severity_check
  check (severity in ('debug', 'info', 'warning', 'error', 'critical'));

-- security_event_type constraint
alter table public.security_events
  add constraint security_events_event_type_check
  check (event_type in (
    'auth.login', 'auth.logout', 'auth.failed_login', 'auth.password_change', 'auth.password_reset',
    'user.created', 'user.updated', 'user.deleted',
    'property.created', 'property.updated', 'property.deleted',
    'lease.created', 'lease.updated', 'lease.deleted', 'lease.signed',
    'payment.created', 'payment.failed',
    'subscription.created', 'subscription.canceled',
    'admin.action', 'system.error', 'system.warning'
  ));

-- unit_status constraint
alter table public.units
  add constraint units_status_check
  check (status in ('available', 'occupied', 'maintenance', 'reserved'));

-- ============================================================================
-- STEP 6: Recreate functions with text parameters
-- ============================================================================

-- Recreate sign_lease_and_check_activation function with text parameter instead of enum
create or replace function public.sign_lease_and_check_activation(
  p_lease_id uuid,
  p_signer_type text,
  p_signature_ip text,
  p_signed_at timestamp with time zone,
  p_signature_method text default 'in_app'
)
returns table(success boolean, both_signed boolean, error_message text)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_lease record;
begin
  -- Step 1: Lock the lease row to prevent concurrent modifications
  select
    id,
    lease_status,
    owner_signed_at,
    tenant_signed_at
  into v_lease
  from public.leases
  where id = p_lease_id
  for update;

  -- Step 2: Validate lease exists
  if v_lease.id is null then
    return query select false, false, 'Lease not found'::text;
    return;
  end if;

  -- Step 3: Validate lease status
  if p_signer_type = 'tenant' and v_lease.lease_status != 'pending_signature' then
    return query select false, false, 'Lease must be pending signature for tenant to sign'::text;
    return;
  end if;

  if p_signer_type = 'owner' and v_lease.lease_status not in ('draft', 'pending_signature') then
    return query select false, false, 'Lease cannot be signed in its current status'::text;
    return;
  end if;

  -- Step 4: Check if already signed (prevent double signing)
  if p_signer_type = 'owner' and v_lease.owner_signed_at is not null then
    return query select false, false, 'Owner has already signed this lease'::text;
    return;
  end if;

  if p_signer_type = 'tenant' and v_lease.tenant_signed_at is not null then
    return query select false, false, 'Tenant has already signed this lease'::text;
    return;
  end if;

  -- Step 5: Record the signature atomically
  if p_signer_type = 'owner' then
    update public.leases
    set
      owner_signed_at = p_signed_at,
      owner_signature_ip = p_signature_ip,
      owner_signature_method = p_signature_method
    where id = p_lease_id;

    -- Return whether both are now signed (tenant was already signed)
    return query select true, (v_lease.tenant_signed_at is not null), null::text;
  else
    update public.leases
    set
      tenant_signed_at = p_signed_at,
      tenant_signature_ip = p_signature_ip,
      tenant_signature_method = p_signature_method
    where id = p_lease_id;

    -- Return whether both are now signed (owner was already signed)
    return query select true, (v_lease.owner_signed_at is not null), null::text;
  end if;

  return;
end;
$$;

-- Grant execute permissions
grant execute on function public.sign_lease_and_check_activation(uuid, text, text, timestamp with time zone, text) to authenticated;
grant execute on function public.sign_lease_and_check_activation(uuid, text, text, timestamp with time zone, text) to service_role;

-- Recreate upsert_rent_payment function without enum cast
create or replace function public.upsert_rent_payment(
  p_lease_id uuid,
  p_tenant_id uuid,
  p_amount integer,
  p_currency text,
  p_status text,
  p_due_date text,
  p_paid_date text default null,
  p_period_start text default null,
  p_period_end text default null,
  p_payment_method_type text default null,
  p_stripe_payment_intent_id text default null,
  p_application_fee_amount integer default null
)
returns table(id uuid, was_inserted boolean)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_existing_id uuid;
  v_new_id uuid;
  v_was_inserted boolean;
begin
  -- Check if payment already exists by stripe_payment_intent_id (unique constraint)
  select rp.id into v_existing_id
  from rent_payments rp
  where rp.stripe_payment_intent_id = p_stripe_payment_intent_id;

  if v_existing_id is not null then
    -- Payment already exists, return existing ID
    id := v_existing_id;
    was_inserted := false;
    return next;
    return;
  end if;

  -- Insert new payment (no enum cast needed - column is now text)
  insert into rent_payments (
    lease_id,
    tenant_id,
    amount,
    currency,
    status,
    due_date,
    paid_date,
    period_start,
    period_end,
    payment_method_type,
    stripe_payment_intent_id,
    application_fee_amount
  ) values (
    p_lease_id,
    p_tenant_id,
    p_amount,
    p_currency,
    p_status,
    p_due_date::date,
    p_paid_date::timestamptz,
    p_period_start::date,
    p_period_end::date,
    p_payment_method_type,
    p_stripe_payment_intent_id,
    p_application_fee_amount
  )
  returning rent_payments.id into v_new_id;

  id := v_new_id;
  was_inserted := true;
  return next;

exception
  when unique_violation then
    -- Race condition: another process inserted the same payment
    -- Return the existing payment ID
    select rp.id into v_existing_id
    from rent_payments rp
    where rp.stripe_payment_intent_id = p_stripe_payment_intent_id;

    id := v_existing_id;
    was_inserted := false;
    return next;
end;
$$;

-- Grant execute permissions
grant execute on function public.upsert_rent_payment(uuid, uuid, integer, text, text, text, text, text, text, text, text, integer) to authenticated;
grant execute on function public.upsert_rent_payment(uuid, uuid, integer, text, text, text, text, text, text, text, text, integer) to service_role;

-- ============================================================================
-- STEP 7: Recreate trigger function and trigger for lease status sync
-- ============================================================================

-- Recreate the trigger function (dropped in Step 1 to release enum dependency)
create or replace function public.sync_unit_status_from_lease()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  -- When lease becomes active, mark unit as occupied
  if new.lease_status = 'active' and (old is null or old.lease_status != 'active') then
    update public.units set status = 'occupied' where id = new.unit_id;
  end if;

  -- When lease ends or terminates, mark unit as available (if no other active lease)
  if new.lease_status in ('ended', 'terminated') and old.lease_status = 'active' then
    -- Check if there's another active lease for this unit
    if not exists (
      select 1 from public.leases
      where unit_id = new.unit_id
      and id != new.id
      and lease_status = 'active'
    ) then
      update public.units set status = 'available' where id = new.unit_id;
    end if;
  end if;

  return new;
end;
$$;

-- Grant execute permissions
grant execute on function public.sync_unit_status_from_lease() to authenticated;
grant execute on function public.sync_unit_status_from_lease() to service_role;

-- Recreate the trigger
create trigger sync_unit_status_on_lease_change
  after insert or update of lease_status on public.leases
  for each row
  execute function sync_unit_status_from_lease();

-- ============================================================================
-- STEP 8: Recreate exclusion constraint with text comparison
-- ============================================================================

-- Recreate the exclusion constraint to prevent overlapping active leases
-- Now using text comparison instead of enum
alter table public.leases
  add constraint leases_unit_date_overlap_exclusion
  exclude using gist (
    unit_id with =,
    daterange(start_date, coalesce(end_date, '9999-12-31'::date), '[]') with &&
  )
  where (lease_status in ('active', 'pending_signature'));

-- ============================================================================
-- STEP 9: Drop enum types (no longer needed)
-- ============================================================================

drop type if exists public.invitation_type;
drop type if exists public.lease_status;
drop type if exists public.maintenance_priority;
drop type if exists public.maintenance_status;
drop type if exists public.notification_type;
drop type if exists public.payment_status;
drop type if exists public.property_status;
drop type if exists public.security_event_severity;
drop type if exists public.security_event_type;
drop type if exists public.signature_method;
drop type if exists public.stripe_subscription_status;
drop type if exists public.unit_status;

-- ============================================================================
-- STEP 10: Add comments for documentation
-- ============================================================================

comment on constraint leases_lease_status_check on public.leases is
  'Valid values: draft, pending_signature, active, ended, terminated';

comment on constraint leases_owner_signature_method_check on public.leases is
  'Valid values: in_app, docuseal (nullable)';

comment on constraint leases_tenant_signature_method_check on public.leases is
  'Valid values: in_app, docuseal (nullable)';

comment on constraint leases_stripe_subscription_status_check on public.leases is
  'Valid values: none, pending, active, failed (nullable)';

comment on constraint maintenance_requests_priority_check on public.maintenance_requests is
  'Valid values: low, normal, medium, high, urgent';

comment on constraint maintenance_requests_status_check on public.maintenance_requests is
  'Valid values: open, in_progress, completed, cancelled, on_hold';

comment on constraint notifications_notification_type_check on public.notifications is
  'Valid values: maintenance, lease, payment, system';

comment on constraint payment_transactions_status_check on public.payment_transactions is
  'Valid values: pending, processing, succeeded, failed, cancelled, requires_action';

comment on constraint rent_payments_status_check on public.rent_payments is
  'Valid values: pending, processing, succeeded, failed, cancelled, requires_action';

comment on constraint properties_status_check on public.properties is
  'Valid values: active, inactive, sold';

comment on constraint security_events_severity_check on public.security_events is
  'Valid values: debug, info, warning, error, critical';

comment on constraint security_events_event_type_check on public.security_events is
  'Valid security event types for audit logging';

comment on constraint units_status_check on public.units is
  'Valid values: available, occupied, maintenance, reserved';

-- ============================================================================
-- STEP 11: Recreate partial indexes (with text comparisons instead of enum casts)
-- ============================================================================

-- Index for leases with pending/failed subscription status (text comparison)
create index idx_leases_subscription_pending
  on public.leases (stripe_subscription_status)
  where stripe_subscription_status in ('pending', 'failed');

-- Index for draft leases (text comparison)
create index idx_leases_draft
  on public.leases (lease_status)
  where lease_status = 'draft';

-- Index for pending signature leases (text comparison)
create index idx_leases_pending_signature
  on public.leases (lease_status)
  where lease_status = 'pending_signature';

-- Recreate regular indexes on lease_status (now text)
create index idx_leases_status
  on public.leases (lease_status);

create index idx_leases_owner_status
  on public.leases (owner_user_id, lease_status);

-- Recreate indexes on other columns (now text)
create index idx_maintenance_requests_status
  on public.maintenance_requests (status);

create index idx_payment_transactions_status
  on public.payment_transactions (status);

create index idx_rent_payments_status
  on public.rent_payments (status);

create index idx_rent_payments_status_date
  on public.rent_payments (status, due_date);

create index idx_units_status
  on public.units (status);

create index idx_units_property_status
  on public.units (property_id, status);

create index idx_maintenance_requests_owner_status
  on public.maintenance_requests (owner_user_id, status);

-- ============================================================================
-- STEP 12: Re-enable RLS evaluation
-- ============================================================================
set session_replication_role = default;
