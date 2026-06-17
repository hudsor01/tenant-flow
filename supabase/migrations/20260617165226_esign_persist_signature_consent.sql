-- Persist the affirmative ESIGN/UETA consent that gates each signature, so the
-- audit certificate's "affirmatively consented to sign electronically" claim is
-- backed by a stored record. The Edge Functions reject a signature unless the
-- party has consented, so the consent timestamp equals the signature timestamp.

alter table public.leases
  add column owner_signature_consent_at  timestamptz,
  add column tenant_signature_consent_at timestamptz;

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
      owner_signature_method     = coalesce(p_method, 'in_app'),
      owner_signature_consent_at = p_signed_at
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

create or replace function public.sign_lease_with_token(
  p_token_hash            text,
  p_signature_ip          text,
  p_signature_user_agent  text,
  p_signed_at             timestamptz,
  p_signer_name           text default null
)
  returns table (success boolean, both_signed boolean, lease_id uuid, error_message text)
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_token record;
  v_lease record;
begin
  select id, lease_id, expires_at, used_at, revoked_at
  into v_token
  from public.lease_signing_tokens
  where token_hash = p_token_hash
  for update;

  if v_token.id is null then
    return query select false, false, null::uuid, 'invalid_token'::text;
    return;
  end if;
  if v_token.revoked_at is not null then
    return query select false, false, null::uuid, 'revoked_token'::text;
    return;
  end if;
  if v_token.used_at is not null then
    return query select false, false, null::uuid, 'used_token'::text;
    return;
  end if;
  if v_token.expires_at <= p_signed_at then
    return query select false, false, null::uuid, 'expired_token'::text;
    return;
  end if;

  select id, owner_user_id, lease_status, owner_signed_at, tenant_signed_at
  into v_lease
  from public.leases
  where id = v_token.lease_id
  for update;

  if v_lease.id is null then
    return query select false, false, null::uuid, 'lease_not_found'::text;
    return;
  end if;
  if v_lease.lease_status <> 'pending_signature' then
    return query select false, false, v_lease.id, 'lease_not_pending_signature'::text;
    return;
  end if;
  if v_lease.tenant_signed_at is not null then
    return query select false, false, v_lease.id, 'tenant_already_signed'::text;
    return;
  end if;

  update public.leases
  set tenant_signed_at            = p_signed_at,
      tenant_signature_ip         = p_signature_ip,
      tenant_signature_user_agent = p_signature_user_agent,
      tenant_signature_method     = 'in_app',
      tenant_signature_name       = p_signer_name,
      tenant_signature_consent_at = p_signed_at
  where id = v_lease.id;

  update public.lease_signing_tokens
  set used_at = p_signed_at
  where id = v_token.id;

  if v_lease.owner_signed_at is not null then
    update public.leases
    set lease_status = 'active'
    where id = v_lease.id and lease_status <> 'active';

    insert into public.notifications (
      user_id, title, message, notification_type, entity_type, entity_id
    )
    values (
      v_lease.owner_user_id, 'Lease fully signed',
      'Your lease has been signed by all parties and is now active.',
      'lease', 'lease', v_lease.id
    );
  end if;

  return query select true, (v_lease.owner_signed_at is not null), v_lease.id, null::text;
  return;
end;
$function$;
