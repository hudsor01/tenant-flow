-- v2.3 second audit cycle — RPC hardening + cron coverage expansion.
--
-- Follow-up to 20260421120000 addressing findings from the comprehensive
-- re-audit:
--
--   H5 — cleanup_orphan_documents only covered entity_type='property'.
--        Extend to cover the other three entity_types the documents table
--        supports (lease, maintenance_request, inspection). Without this
--        a hard-deleted lease/maintenance/inspection leaves its documents
--        rows invisible in prod forever.
--   H8 — bulk_import_create_lease hardcoded rent_currency='USD' and
--        lease_status='draft'. Accept them as params with safe defaults so
--        non-USD customers aren't silently locked into USD.
--   H9 — bulk_import_create_lease bypassed the assert_can_create_lease
--        business-rule invariant (overlap/duplicate detection) that the
--        regular lease-create path enforces. Call it now.
--   M13 — bulk_import_create_lease did not validate its own inputs.
--        SECURITY DEFINER RPCs should validate independently of the Zod
--        client-side check (Zod isn't part of the DB security boundary).

begin;

-- ============================================================================
-- H5: extend orphan cleanup to all entity_types
-- ============================================================================
create or replace function public.cleanup_orphan_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.documents d
  where (
    d.entity_type = 'property'
    and not exists (select 1 from public.properties p where p.id = d.entity_id)
  )
  or (
    d.entity_type = 'lease'
    and not exists (select 1 from public.leases l where l.id = d.entity_id)
  )
  or (
    d.entity_type = 'maintenance_request'
    and not exists (select 1 from public.maintenance_requests m where m.id = d.entity_id)
  )
  or (
    d.entity_type = 'inspection'
    and not exists (select 1 from public.inspections i where i.id = d.entity_id)
  );
end;
$$;

comment on function public.cleanup_orphan_documents is
  'Removes document rows whose parent entity has been hard-deleted, for every entity_type the documents table supports. Runs nightly via pg_cron.';

-- ============================================================================
-- H8 + H9 + M13: bulk_import_create_lease — params, invariant check, input guards
-- ============================================================================
-- Drop the old 7-arg version in favor of a 9-arg version that accepts
-- rent_currency and lease_status. Keep backward compat via defaults so the
-- bulk-import frontend can continue calling with 7 args during the rollout.

drop function if exists public.bulk_import_create_lease(
  uuid, uuid, date, date, numeric, numeric, integer
);

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

  -- M13: validate input ranges independently of the Zod client check.
  if p_payment_day < 1 or p_payment_day > 31 then
    raise exception 'Payment day must be between 1 and 31';
  end if;

  if p_rent_amount is null or p_rent_amount <= 0 then
    raise exception 'Rent amount must be greater than 0';
  end if;

  if p_security_deposit is null or p_security_deposit < 0 then
    raise exception 'Security deposit cannot be negative';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'End date must be on or after start date';
  end if;

  if char_length(p_rent_currency) <> 3 then
    raise exception 'Rent currency must be a 3-letter ISO code';
  end if;

  if p_lease_status not in ('draft', 'pending_signature', 'active') then
    raise exception 'Lease status must be draft, pending_signature, or active';
  end if;

  -- Ownership checks on referenced unit + tenant.
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

  -- H9: enforce the same business-rule invariants the UI lease-create flow
  -- uses (overlap detection, etc.). assert_can_create_lease raises on failure.
  perform public.assert_can_create_lease(p_primary_tenant_id, p_unit_id);

  insert into public.leases (
    unit_id,
    primary_tenant_id,
    start_date,
    end_date,
    rent_amount,
    rent_currency,
    security_deposit,
    payment_day,
    lease_status,
    owner_user_id
  ) values (
    p_unit_id,
    p_primary_tenant_id,
    p_start_date,
    p_end_date,
    p_rent_amount,
    upper(p_rent_currency),
    p_security_deposit,
    p_payment_day,
    p_lease_status,
    v_owner_id
  )
  returning id into v_lease_id;

  insert into public.lease_tenants (
    lease_id,
    tenant_id,
    is_primary,
    responsibility_percentage
  ) values (
    v_lease_id,
    p_primary_tenant_id,
    true,
    100
  );

  return v_lease_id;
end;
$$;

revoke all on function public.bulk_import_create_lease(
  uuid, uuid, date, date, numeric, numeric, integer, text, text
) from public;
grant execute on function public.bulk_import_create_lease(
  uuid, uuid, date, date, numeric, numeric, integer, text, text
) to authenticated;

comment on function public.bulk_import_create_lease is
  'Atomic lease + lease_tenants insert for bulk CSV import. Validates inputs, enforces ownership, and calls assert_can_create_lease so bulk imports cannot bypass the business-rule invariants the UI lease-create flow enforces.';

commit;
