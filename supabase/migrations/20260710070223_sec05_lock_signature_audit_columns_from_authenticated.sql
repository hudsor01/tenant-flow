-- SEC-05 hardening (review cycle-2): the write-once trigger
-- (reject_signature_audit_tampering) is bypassable from a directly-authenticated
-- owner session via a value->null->value two-step (clear a signature-audit column
-- in one PATCH, then rewrite it in the next — both transitions are individually
-- allowed by the asymmetric guard), letting an owner forge the tenant's recorded
-- signature name / audit metadata on the live-regenerated signed PDF.
--
-- The authoritative fix is column-level UPDATE privilege: the 12 audit columns are
-- written ONLY by the SECURITY DEFINER signing RPCs (record_lease_signature /
-- sign_lease_with_token) and the service-role signing edge function (cancel /
-- finalize) — never by an owner's direct PostgREST session. service_role + the
-- definer RPCs bypass column grants, so every legit sign/cancel/finalize flow keeps
-- working, while an authenticated owner can no longer set, clear, or alter any audit
-- column directly. Mirrors the public.users privileged-column lock
-- (20260507190024). The reject_signature_audit_tampering trigger stays as
-- defense-in-depth for any privileged (service-role) write path.
revoke update on public.leases from authenticated;
grant update (
  id, unit_id, primary_tenant_id, start_date, end_date, rent_amount, rent_currency,
  security_deposit, payment_day, late_fee_amount, late_fee_days, lease_status,
  grace_period_days, created_at, updated_at, sent_for_signature_at, max_occupants,
  pets_allowed, pet_deposit, pet_rent, utilities_included, tenant_responsible_utilities,
  property_rules, property_built_before_1978, lead_paint_disclosure_acknowledged,
  governing_state, owner_user_id, signed_document_path, landlord_notice_address,
  immediate_family_members
) on public.leases to authenticated;
