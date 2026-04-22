-- v2.3 third audit cycle — RPC error-message hygiene.
--
-- Findings from the third comprehensive review of v2.3:
--
--   LOW (RPC) — NULL p_unit_id / p_primary_tenant_id raised
--               "Unit <null> is not yours or does not exist" instead of
--               "Unit ID is required". Add explicit NULL guards at the top.
--   LOW (RPC) — NULL p_start_date raised the date-ordering error message
--               which is misleading. Add NULL guards on both date params
--               with their own error messages.

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

  -- Explicit NULL guards so the user-facing error names the actual
  -- missing field instead of leaking the underlying ownership check.
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

  if p_payment_day < 1 or p_payment_day > 31 then
    raise exception 'Payment day must be between 1 and 31';
  end if;

  if p_rent_amount is null or p_rent_amount <= 0 then
    raise exception 'Rent amount must be greater than 0';
  end if;

  if p_security_deposit is null or p_security_deposit < 0 then
    raise exception 'Security deposit cannot be negative';
  end if;

  -- Both NULL branches were short-circuited above, so this is a real
  -- ordering check now.
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

  perform public.assert_can_create_lease(p_primary_tenant_id, p_unit_id);

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

commit;
