-- Phase 26 review cycle 2 (Finding: completes the pending-window PDF-term lock).
-- landlord_notice_address + immediate_family_members render into the finalized
-- signed PDF ("Additional Terms"), and NO pending-status action writes them:
--   * the lease-signature 'send' action writes them in the SAME update that flips
--     draft->pending_signature, so OLD.lease_status='draft' at trigger time (send is
--     gated on draft at index.ts:195) — a pending-keyed lock never fires on it;
--   * 'resend' does not update the leases table at all (only lease_signing_tokens);
--   * 'sign-owner' (record_lease_signature) and 'cancel' never write these columns.
-- (This corrects migration 20260705174052's comment, which wrongly claimed locking
-- them would break re-send.) So they can be frozen during pending exactly like
-- start_date/end_date/governing_state, closing the last PDF-tamper gap. The tenant
-- signature-name + signature-audit columns are intentionally NOT locked here: they
-- are written DURING pending by the tenant/owner signing RPCs, so a simple pending
-- lock would reject the legitimate signing UPDATE (out of this phase's scope).
-- Verified via rolled-back proof: draft->pending send SUCCEEDS, pending notice/family
-- edits REJECTED, owner counter-sign SUCCEEDS, active edits allowed. (11 locked
-- comparisons: 6 financial + 5 pending-term.)
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

  -- Non-financial PDF-rendered terms: locked WHILE OUT FOR SIGNATURE. start_date,
  -- end_date, governing_state, landlord_notice_address, and immediate_family_members
  -- all appear on the finalized signed PDF and are not written by any pending-status
  -- action, so they must not change between tenant-sign and finalize. On ACTIVE
  -- leases they stay editable so renew + terminate + edits work.
  if old.lease_status = 'pending_signature'
     and (
          new.start_date               is distinct from old.start_date
       or new.end_date                 is distinct from old.end_date
       or new.governing_state          is distinct from old.governing_state
       or new.landlord_notice_address  is distinct from old.landlord_notice_address
       or new.immediate_family_members is distinct from old.immediate_family_members
     )
  then
    raise exception 'Cannot edit lease terms while it is out for signature'
      using errcode = '23514',
        detail = 'start_date, end_date, governing_state, landlord_notice_address, and immediate_family_members appear on the signed lease PDF and are locked while lease_status = pending_signature. Cancel the signature request (back to draft) to change them, then re-send.';
  end if;

  return new;
end;
$function$;
