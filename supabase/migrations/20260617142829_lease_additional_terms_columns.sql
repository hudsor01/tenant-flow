-- Persist the two "additional terms" the owner enters in the Send-for-Signature
-- dialog. In the DocuSeal flow these were embedded only in the vendor-rendered
-- PDF and never stored. The token-based flow renders the signed PDF at
-- finalization (after both parties sign), so these terms must live on the lease.
--
--   landlord_notice_address  — required at send: where the tenant sends formal
--                              notices. A genuine lease term, now durable.
--   immediate_family_members — optional occupant disclosure.
alter table public.leases
  add column landlord_notice_address  text,
  add column immediate_family_members text;
