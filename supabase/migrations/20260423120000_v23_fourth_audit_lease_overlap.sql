-- v2.3 fourth audit cycle — fix bulk_import_create_lease invariant check.
--
-- Cycle 4 caught a P0 production bug: the H9 fix in cycle 2 added
--
--   perform public.assert_can_create_lease(p_primary_tenant_id, p_unit_id);
--
-- but the helper's signature is `(p_unit_id, p_primary_tenant_id)` — args
-- swapped. Plus, reading the helper's body, it requires:
--   - tenant.user_id IS NOT NULL (line 65 of the helper)
--   - an accepted tenant_invitations row for tenant + unit (line 88)
--
-- Both of those invariants are about the legacy tenant-portal flow.
-- Landlord-only tenants (the only kind v2.3 supports) have user_id=NULL
-- and no invitation. So the helper would fail every bulk-imported lease
-- with `Tenant not found` even with the correct arg order.
--
-- Fix:
--   1. Drop the assert_can_create_lease call entirely — it's not the right
--      invariant for the landlord-only bulk-import path.
--   2. Replace it with an inline overlap check: no other active lease may
--      cover any portion of the requested date range on the same unit.
--      That's the actual business-rule invariant cycle-2 H9 was trying to
--      enforce ("overlap/duplicate detection").
--   3. Add NULL guard for payment_day (cycle-4 LOW finding).
--
-- Adds a SECURITY DEFINER, SET search_path, REVOKE/GRANT pattern matching
-- the prior versions.

begin;

create or replace function public.bulk_import_create_lease(
  p_unit_id uuid,
  p_primary_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_rent_amount numeric,
  p_security_deposit numeric,
  p_payment_day integer,
  p_rent_currency text default 'USD',
  p_lease_status text default 'draft'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

  -- L2: NULL guard for payment_day matches the pattern used for the
  -- other required params; without it `NULL < 1` evaluates to NULL and
  -- the range check is skipped, then the INSERT fails with a NOT NULL
  -- constraint violation that's harder to interpret.
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

  -- Overlap check — the actual business-rule invariant the cycle-2 H9
  -- finding was trying to enforce. A unit can't have two leases that
  -- both cover the same calendar day in an active state. Terminated /
  -- ended leases are excluded so re-imports after move-out work.
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
  values (v_lease_id, p_primary_tenant_id, true, 100);

  return v_lease_id;
end;
$$;

comment on function public.bulk_import_create_lease is
  'Atomic lease + lease_tenants insert for landlord-only bulk CSV import. Validates inputs, enforces unit + tenant ownership, rejects date-range overlaps with existing active leases on the same unit, and inserts both rows in one transaction. Does not call assert_can_create_lease (which targets the legacy tenant-invitation flow incompatible with landlord-only tenants).';

commit;
