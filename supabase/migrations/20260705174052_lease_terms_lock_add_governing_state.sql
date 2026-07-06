-- Phase 26 review cycle 1 (Finding 1 completeness): governing_state is a pure
-- lease term (no signing/workflow path writes it — set only at lease creation)
-- that renders into the finalized signed PDF (_shared/lease-signing.ts governingState),
-- so it has the same pending-window hole as start_date/end_date: an owner could
-- change the governing law between tenant-sign and finalize. Add it to the
-- pending_signature date/term lock. landlord_notice_address + immediate_family_members
-- are intentionally NOT locked — the lease-signature 'send' action writes them as
-- part of the signing packet, so locking them would break re-send.
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

  -- Lease dates + governing law: locked WHILE OUT FOR SIGNATURE. start_date,
  -- end_date, and governing_state appear on the finalized signed PDF, so they
  -- must not change between tenant-sign and finalize. On ACTIVE leases dates
  -- stay editable so renew + terminate work.
  if old.lease_status = 'pending_signature'
     and (
          new.start_date      is distinct from old.start_date
       or new.end_date        is distinct from old.end_date
       or new.governing_state is distinct from old.governing_state
     )
  then
    raise exception 'Cannot edit lease dates or governing law while it is out for signature'
      using errcode = '23514',
        detail = 'start_date, end_date, and governing_state appear on the signed lease PDF and are locked while lease_status = pending_signature. Cancel the signature request (back to draft) to change them, then re-send.';
  end if;

  return new;
end;
$function$;
