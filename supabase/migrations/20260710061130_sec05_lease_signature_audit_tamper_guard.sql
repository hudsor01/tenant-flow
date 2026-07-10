-- SEC-05: make the e-signature audit trail tamper-proof. RLS is row-level, so an
-- owner can PATCH a signature-audit column after the tenant signs; the signed PDF
-- is regenerated live from these columns, so a doctored value renders onto the
-- signature block + audit certificate. This BEFORE UPDATE trigger enforces a
-- write-once state machine on the 12 audit columns:
--   null  -> value      ALLOWED (sign)
--   value -> null       ALLOWED (cancel / revert to draft)
--   value -> same       ALLOWED (no-op)
--   value -> different  REJECTED (tamper)
-- Independent of reject_signed_lease_term_edits (the financial term-lock). Does NOT
-- block the legit sign (record_lease_signature / sign_lease_with_token null->value)
-- or cancel (lease-signature cancel value->null) flows.

create or replace function public.reject_signature_audit_tampering()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if (old.owner_signed_at is not null and new.owner_signed_at is not null and new.owner_signed_at is distinct from old.owner_signed_at)
     or (old.owner_signature_ip is not null and new.owner_signature_ip is not null and new.owner_signature_ip is distinct from old.owner_signature_ip)
     or (old.owner_signature_user_agent is not null and new.owner_signature_user_agent is not null and new.owner_signature_user_agent is distinct from old.owner_signature_user_agent)
     or (old.owner_signature_method is not null and new.owner_signature_method is not null and new.owner_signature_method is distinct from old.owner_signature_method)
     or (old.owner_signature_consent_at is not null and new.owner_signature_consent_at is not null and new.owner_signature_consent_at is distinct from old.owner_signature_consent_at)
     or (old.tenant_signed_at is not null and new.tenant_signed_at is not null and new.tenant_signed_at is distinct from old.tenant_signed_at)
     or (old.tenant_signature_ip is not null and new.tenant_signature_ip is not null and new.tenant_signature_ip is distinct from old.tenant_signature_ip)
     or (old.tenant_signature_user_agent is not null and new.tenant_signature_user_agent is not null and new.tenant_signature_user_agent is distinct from old.tenant_signature_user_agent)
     or (old.tenant_signature_method is not null and new.tenant_signature_method is not null and new.tenant_signature_method is distinct from old.tenant_signature_method)
     or (old.tenant_signature_name is not null and new.tenant_signature_name is not null and new.tenant_signature_name is distinct from old.tenant_signature_name)
     or (old.tenant_signature_consent_at is not null and new.tenant_signature_consent_at is not null and new.tenant_signature_consent_at is distinct from old.tenant_signature_consent_at)
     or (old.signed_document_hash is not null and new.signed_document_hash is not null and new.signed_document_hash is distinct from old.signed_document_hash)
  then
    raise exception 'Cannot alter a recorded e-signature audit value'
      using errcode = '42501',
        detail = 'Signature audit columns are write-once: a non-null value may only be cleared (cancel) or left unchanged, never overwritten with a different value.';
  end if;

  return new;
end;
$$;

drop trigger if exists reject_signature_audit_tampering_before_update on public.leases;
create trigger reject_signature_audit_tampering_before_update
  before update on public.leases
  for each row
  execute function public.reject_signature_audit_tampering();

comment on function public.reject_signature_audit_tampering() is
  'SEC-05: BEFORE UPDATE guard on leases enforcing a write-once state machine on the 12 e-signature audit columns (owner/tenant signed_at, ip, user_agent, method, consent_at; tenant_signature_name; signed_document_hash). null->value and value->null are allowed (sign / cancel); value->different is rejected (tamper). Complements reject_signed_lease_term_edits.';

-- Trigger-only SECURITY DEFINER function — never called directly as an RPC.
-- Revoke the default PUBLIC EXECUTE (matches reject_signed_lease_term_edits;
-- clears the anon_security_definer_function_executable advisor).
revoke execute on function public.reject_signature_audit_tampering() from public;
