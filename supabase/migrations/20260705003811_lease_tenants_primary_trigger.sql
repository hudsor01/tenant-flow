-- LEASE-02: auto-create the primary lease_tenants join row on every lease create path.
--
-- The UI create paths (lease-creation-wizard + leaseMutations.create) insert only
-- lease columns and never write the lease_tenants join row. Tenant reads join
-- through lease_tenants, and the active-lease tenant-delete guard checks it, so a
-- UI-created lease is invisible on its tenant and that tenant can be soft-deleted
-- despite an active lease. This AFTER INSERT trigger makes the primary join row a
-- data-model invariant on every path (wizard, lease-form, bulk import).
--
-- Idempotent via ON CONFLICT on the existing unique (lease_id, tenant_id) key, so
-- it composes with bulk_import_create_lease. Because this AFTER INSERT trigger
-- fires within bulk_import's own transaction BEFORE bulk_import's manual insert
-- runs, that manual insert is likewise made ON CONFLICT DO NOTHING below or it
-- would hit a duplicate-key error.

create or replace function public.create_primary_lease_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
  values (new.id, new.primary_tenant_id, true, 100)
  on conflict (lease_id, tenant_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_primary_lease_tenant() from public;

comment on function public.create_primary_lease_tenant() is
  'AFTER INSERT trigger fn on public.leases: creates the primary lease_tenants join row (is_primary=true, responsibility_percentage=100) for NEW.primary_tenant_id. Idempotent via ON CONFLICT (lease_id, tenant_id) DO NOTHING so it composes with bulk_import_create_lease. Trigger WHEN clause guards on new.primary_tenant_id IS NOT NULL.';

drop trigger if exists create_primary_lease_tenant_after_insert on public.leases;
create trigger create_primary_lease_tenant_after_insert
  after insert on public.leases
  for each row
  when (new.primary_tenant_id is not null)
  execute function public.create_primary_lease_tenant();

-- Harden bulk_import_create_lease: its manual lease_tenants insert now uses
-- ON CONFLICT DO NOTHING so it no-ops against the row the AFTER INSERT trigger
-- already created in the same transaction. Every other line is preserved verbatim
-- from the prior definition (20260422195546_v23_fourth_audit_lease_overlap.sql).
create or replace function public.bulk_import_create_lease(p_unit_id uuid, p_primary_tenant_id uuid, p_start_date date, p_end_date date, p_rent_amount numeric, p_security_deposit numeric, p_payment_day integer, p_rent_currency text DEFAULT 'USD'::text, p_lease_status text DEFAULT 'draft'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid := auth.uid();
  v_lease_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_unit_id is null then
    raise exception 'Unit ID is required';
  end if;

  if p_primary_tenant_id is null then
    raise exception 'Tenant ID is required';
  end if;

  if p_start_date is null then
    raise exception 'Start date is required';
  end if;

  if p_end_date is null then
    raise exception 'End date is required';
  end if;

  if p_payment_day is null then
    raise exception 'Payment day is required';
  end if;

  if p_payment_day < 1 or p_payment_day > 31 then
    raise exception 'Payment day must be between 1 and 31';
  end if;

  if p_rent_amount is null or p_rent_amount <= 0 then
    raise exception 'Rent amount must be greater than 0';
  end if;

  if p_security_deposit is null or p_security_deposit < 0 then
    raise exception 'Security deposit cannot be negative';
  end if;

  if p_end_date < p_start_date then
    raise exception 'End date must be on or after start date';
  end if;

  if char_length(p_rent_currency) <> 3 then
    raise exception 'Rent currency must be a 3-letter ISO code';
  end if;

  if p_lease_status not in ('draft', 'pending_signature', 'active') then
    raise exception 'Lease status must be draft, pending_signature, or active';
  end if;

  if not exists (
    select 1 from public.units u
    join public.properties p on p.id = u.property_id
    where u.id = p_unit_id
      and p.owner_user_id = v_owner_id
  ) then
    raise exception 'Unit % is not yours or does not exist', p_unit_id;
  end if;

  if not exists (
    select 1 from public.tenants
    where id = p_primary_tenant_id
      and owner_user_id = v_owner_id
  ) then
    raise exception 'Tenant % is not yours or does not exist', p_primary_tenant_id;
  end if;

  if exists (
    select 1 from public.leases l
    where l.unit_id = p_unit_id
      and l.lease_status in ('draft', 'pending_signature', 'active')
      and l.start_date <= p_end_date
      and l.end_date >= p_start_date
  ) then
    raise exception 'Unit % already has an active or pending lease overlapping % to %',
      p_unit_id, p_start_date, p_end_date;
  end if;

  insert into public.leases (
    unit_id, primary_tenant_id, start_date, end_date, rent_amount,
    rent_currency, security_deposit, payment_day, lease_status, owner_user_id
  ) values (
    p_unit_id, p_primary_tenant_id, p_start_date, p_end_date, p_rent_amount,
    upper(p_rent_currency), p_security_deposit, p_payment_day, p_lease_status, v_owner_id
  )
  returning id into v_lease_id;

  insert into public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
  values (v_lease_id, p_primary_tenant_id, true, 100)
  on conflict (lease_id, tenant_id) do nothing;

  return v_lease_id;
end;
$function$;

grant execute on function public.bulk_import_create_lease(uuid, uuid, date, date, numeric, numeric, integer, text, text) to authenticated;
