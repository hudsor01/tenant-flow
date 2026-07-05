-- LEASE-04: server-side financial-term lock on signed / out-for-signature leases.
--
-- Lease financial terms stay editable while pending_signature and after the
-- tenant signs; the finalize step renders the signed PDF from current DB values,
-- so a post-signature edit yields a signed document with terms the tenant never
-- agreed to. A UI-only lock is bypassable via direct PostgREST, so this BEFORE
-- UPDATE trigger rejects the mutation server-side.
--
-- SCOPE: only the PDF-bearing financial-term columns are locked
-- (rent_amount, security_deposit, late_fee_amount, payment_day,
-- grace_period_days, rent_currency). end_date, start_date, lease_status, and the
-- signature-workflow columns are intentionally NOT locked so that renew
-- (end_date + lease_status='active'), terminate (end_date + lease_status=
-- 'terminated'), and the e-sign finalize/activation writes all keep working.

create or replace function public.reject_signed_lease_term_edits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
      using
        errcode = '23514',
        detail = 'Once the tenant has signed (tenant_signed_at set) or the lease is out for signature (lease_status = pending_signature), the financial-term columns (rent_amount, security_deposit, late_fee_amount, payment_day, grace_period_days, rent_currency) are locked. end_date, start_date, lease_status, and the signature-workflow columns remain editable so renew, terminate, and the signing workflow continue to work.';
  end if;
  return new;
end;
$$;

revoke execute on function public.reject_signed_lease_term_edits() from public;

comment on function public.reject_signed_lease_term_edits() is
  'BEFORE UPDATE trigger fn on public.leases: rejects changes to the financial-term columns (rent_amount, security_deposit, late_fee_amount, payment_day, grace_period_days, rent_currency) once OLD.tenant_signed_at IS NOT NULL or OLD.lease_status = pending_signature. end_date, start_date, lease_status, late_fee_days, and all signature-workflow columns are intentionally NOT locked so renew (end_date + lease_status), terminate (end_date + lease_status), and the e-sign finalize path all succeed.';

drop trigger if exists lease_terms_lock_before_update on public.leases;
create trigger lease_terms_lock_before_update
  before update on public.leases
  for each row
  execute function public.reject_signed_lease_term_edits();
