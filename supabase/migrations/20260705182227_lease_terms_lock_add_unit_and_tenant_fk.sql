-- Phase 26 review cycle 3 (HIGH finding): the pending-window PDF lock froze the
-- direct term columns but omitted the two FK SELECTORS unit_id + primary_tenant_id,
-- which determine the joined property/unit and tenant text drawn on the signed PDF
-- (fetchLeaseSigningData joins units->properties via unit_id and tenants via
-- primary_tenant_id; renderLeasePdf draws propertyLabel/unitNumber/tenant name+email).
-- An owner could re-point either FK during pending_signature (RLS only pins
-- owner_user_id, not FK-target ownership, and no pending action writes the FKs) so the
-- finalized, e-signed PDF describes a different unit/property/tenant than the one the
-- tenant signed. Lock both FKs during pending, exactly like the other PDF terms. This
-- is the vulnerable window: the PDF is rendered + stored at finalize, so re-pointing on
-- an ACTIVE (already-finalized) lease cannot change the stored signed document. No
-- pending-status action (send/resend/sign-owner/tenant-sign/cancel) writes these FKs,
-- so this does not break the signing flow, renew, or terminate. Verified via rolled-back
-- proof: pending unit_id/primary_tenant_id re-point REJECTED, active re-point allowed
-- (13 locked comparisons: 6 financial + 7 pending-term).
--
-- NOTE (follow-up, out of LEASE-04 scope, captured in the roadmap): (1) the leases
-- UPDATE RLS policy validates only owner_user_id, not that a NEW unit_id/primary_tenant_id
-- references an owner-owned row (cross-owner FK-integrity); (2) the signature-audit
-- columns (tenant/owner_signed_at, tenant_signature_name/ip/ua/method, ...) are set
-- during pending by the signing RPCs and are not protected against post-set tampering
-- (would need an asymmetric null-transition guard). Both are signature/RLS-hardening
-- concerns distinct from lease-term locking.
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

  -- Non-financial PDF-rendered terms + the FK selectors that determine the joined
  -- property/unit/tenant text on the signed PDF: locked WHILE OUT FOR SIGNATURE.
  -- None is written by any pending-status action, so freezing them cannot break the
  -- signing workflow; on ACTIVE leases they stay editable (renew/terminate/edits).
  if old.lease_status = 'pending_signature'
     and (
          new.start_date               is distinct from old.start_date
       or new.end_date                 is distinct from old.end_date
       or new.governing_state          is distinct from old.governing_state
       or new.landlord_notice_address  is distinct from old.landlord_notice_address
       or new.immediate_family_members is distinct from old.immediate_family_members
       or new.unit_id                  is distinct from old.unit_id
       or new.primary_tenant_id        is distinct from old.primary_tenant_id
     )
  then
    raise exception 'Cannot edit lease terms while it is out for signature'
      using errcode = '23514',
        detail = 'The lease dates, governing law, notice address, occupants, and the assigned unit/tenant appear on (or determine) the signed lease PDF and are locked while lease_status = pending_signature. Cancel the signature request (back to draft) to change them, then re-send.';
  end if;

  return new;
end;
$function$;
