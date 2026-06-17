-- E-signature canonical hardening (review cycle 2):
--   - DocuSeal is gone, so the signature_method CHECK constraints (which still
--     permitted 'docuseal') are tightened to 'in_app' only — matching SCHEMA.md
--     and the SignatureMethod TS type.
--   - record_lease_signature now binds the owner signature to a SENT lease
--     (pending_signature), so the owner can't e-sign still-editable draft terms.

-- No lease ever used the docuseal method, but normalize any stray value first.
update public.leases set owner_signature_method = 'in_app'
  where owner_signature_method = 'docuseal';
update public.leases set tenant_signature_method = 'in_app'
  where tenant_signature_method = 'docuseal';

alter table public.leases
  drop constraint if exists leases_owner_signature_method_check;
alter table public.leases
  add constraint leases_owner_signature_method_check
  check (owner_signature_method is null or owner_signature_method = 'in_app');

alter table public.leases
  drop constraint if exists leases_tenant_signature_method_check;
alter table public.leases
  add constraint leases_tenant_signature_method_check
  check (tenant_signature_method is null or tenant_signature_method = 'in_app');

create or replace function public.record_lease_signature(
  p_lease_id              uuid,
  p_signature_ip          text,
  p_signature_user_agent  text,
  p_signed_at             timestamptz,
  p_method                text default 'in_app'
)
  returns table (success boolean, both_signed boolean, error_message text)
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_lease record;
begin
  select id, owner_user_id, lease_status, owner_signed_at, tenant_signed_at
  into v_lease
  from public.leases
  where id = p_lease_id
  for update;

  if v_lease.id is null then
    return query select false, false, 'Lease not found'::text;
    return;
  end if;
  if v_lease.lease_status <> 'pending_signature' then
    return query select false, false, 'Lease must be pending signature to sign'::text;
    return;
  end if;
  if v_lease.owner_signed_at is not null then
    return query select false, false, 'Owner has already signed this lease'::text;
    return;
  end if;

  update public.leases
  set owner_signed_at            = p_signed_at,
      owner_signature_ip         = p_signature_ip,
      owner_signature_user_agent = p_signature_user_agent,
      owner_signature_method     = coalesce(p_method, 'in_app')
  where id = p_lease_id;

  if v_lease.tenant_signed_at is not null then
    update public.leases
    set lease_status = 'active'
    where id = p_lease_id and lease_status <> 'active';

    insert into public.notifications (
      user_id, title, message, notification_type, entity_type, entity_id
    )
    values (
      v_lease.owner_user_id, 'Lease fully signed',
      'Your lease has been signed by all parties and is now active.',
      'lease', 'lease', p_lease_id
    );
  end if;

  return query select true, (v_lease.tenant_signed_at is not null), null::text;
  return;
end;
$function$;
