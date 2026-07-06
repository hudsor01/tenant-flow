-- Phase 26 review cycle 1 fixes (2 findings from the DB-trigger review):
--
-- FINDING 1 (date-edit hole): the term-lock (20260705004013) froze the 6 financial
-- columns but left start_date/end_date editable. Those dates ARE rendered into the
-- finalized signed PDF (_shared/lease-signing.ts buildLeasePdfData startDate/endDate),
-- so an owner could change them between tenant-sign and finalize and produce a signed
-- PDF the tenant never agreed to (the exact UI-bypass LEASE-04 exists to close). Lock
-- start_date/end_date WHILE the lease is out for signature (lease_status='pending_signature');
-- keep them editable on ACTIVE leases so renew (extend end_date) and terminate
-- (end_date+status) still work. Verified via rolled-back proof: pending date edit
-- rejected, active renew end_date succeeds, active signed rent still rejected.
--
-- FINDING 2 (no backfill): the lease_tenants AFTER-INSERT trigger (20260705003811)
-- only covers FUTURE inserts; pre-existing UI-created leases still lacked their primary
-- join row (10 of 12 live), keeping the original LEASE-02 bug (invisible on the tenant
-- page + tenant-delete guard bypass once activated, since the trigger does not fire on
-- the draft->active UPDATE). One-time idempotent backfill.

-- (1) redefine the term-lock to also lock dates during pending_signature
CREATE OR REPLACE FUNCTION public.reject_signed_lease_term_edits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Financial terms: locked once the lease is signed or out for signature.
  if (old.tenant_signed_at is not null or old.lease_status = 'pending_signature')
     and (
          new.rent_amount       is distinct from old.rent_amount
       or new.security_deposit  is distinct from old.security_deposit
       or new.late_fee_amount   is distinct from old.late_fee_amount
       or new.payment_day       is distinct from old.payment_day
       or new.grace_period_days is distinct from old.grace_period_days
       or new.rent_currency     is distinct from old.rent_currency
     )
  then
    raise exception 'Cannot edit financial terms of a signed lease'
      using errcode = '23514',
        detail = 'Once the tenant has signed (tenant_signed_at set) or the lease is out for signature (lease_status = pending_signature), the financial-term columns (rent_amount, security_deposit, late_fee_amount, payment_day, grace_period_days, rent_currency) are locked.';
  end if;

  -- Lease dates: locked WHILE OUT FOR SIGNATURE. start_date/end_date appear on
  -- the finalized signed PDF, so they must not change between tenant-sign and
  -- finalize. On ACTIVE leases dates stay editable so renew + terminate work.
  if old.lease_status = 'pending_signature'
     and (
          new.start_date is distinct from old.start_date
       or new.end_date   is distinct from old.end_date
     )
  then
    raise exception 'Cannot edit lease dates while it is out for signature'
      using errcode = '23514',
        detail = 'start_date and end_date appear on the signed lease PDF and are locked while lease_status = pending_signature. Cancel the signature request (back to draft) to change dates, then re-send.';
  end if;

  return new;
end;
$function$;

-- (2) one-time backfill of the primary lease_tenants row for pre-existing leases
INSERT INTO public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
SELECT id, primary_tenant_id, true, 100
FROM public.leases
WHERE primary_tenant_id IS NOT NULL
ON CONFLICT (lease_id, tenant_id) DO NOTHING;
