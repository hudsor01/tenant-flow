-- E-signature audit hardening (review cycle 10):
-- A signing token freezes the tenant_email captured at send time. If the owner
-- reassigns the lease's primary_tenant_id while the lease is still
-- pending_signature, the original (still-live) link would otherwise sign and
-- bind the lease as the NEW tenant — breaking the guarantee that the person who
-- received the link is the person legally bound.
--
-- Fix (fail-closed at sign time): both signing RPCs now compare the token's
-- tenant_email against the lease's CURRENT primary-tenant email (case- and
-- whitespace-insensitive) and reject / invalidate with reason 'tenant_changed'
-- on mismatch. The owner can simply re-send (which revokes old tokens and issues
-- a fresh one for the new tenant).

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
  v_current_email text;
begin
  select id, lease_id, tenant_email, expires_at, used_at, revoked_at
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

  select id, owner_user_id, lease_status, owner_signed_at, tenant_signed_at, primary_tenant_id
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

  -- Re-bind: the lease's current primary tenant must still match the email the
  -- token was issued to. Mismatch (incl. either side null) is fail-closed.
  select lower(trim(email)) into v_current_email
  from public.tenants
  where id = v_lease.primary_tenant_id;

  if v_current_email is distinct from lower(trim(v_token.tenant_email)) then
    return query select false, false, v_lease.id, 'tenant_changed'::text;
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

create or replace function public.get_lease_signing_context(p_token_hash text)
  returns table (
    valid          boolean,
    reason         text,
    lease_id       uuid,
    lease_status   text,
    tenant_signed  boolean,
    owner_signed   boolean,
    tenant_name    text,
    owner_name     text,
    property_label text,
    unit_number    text,
    start_date     date,
    end_date       date,
    rent_amount    numeric
  )
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_token record;
  v_lease record;
  v_email_match boolean;
begin
  select id, lease_id, tenant_email, expires_at, used_at, revoked_at
  into v_token
  from public.lease_signing_tokens
  where token_hash = p_token_hash;

  if v_token.id is null then
    return query
      select false, 'invalid_token'::text, null::uuid, null::text,
             false, false, null::text, null::text, null::text, null::text,
             null::date, null::date, null::numeric;
    return;
  end if;

  select
    l.id, l.lease_status, l.owner_signed_at, l.tenant_signed_at,
    l.start_date, l.end_date, l.rent_amount,
    u.unit_number,
    p.name as property_name, p.address_line1, p.city, p.state, p.postal_code,
    t.name as tenant_name, t.first_name, t.last_name, t.email as tenant_email,
    o.full_name as owner_name
  into v_lease
  from public.leases l
  left join public.units u on u.id = l.unit_id
  left join public.properties p on p.id = u.property_id
  left join public.tenants t on t.id = l.primary_tenant_id
  left join public.users o on o.id = l.owner_user_id
  where l.id = v_token.lease_id;

  v_email_match :=
    lower(trim(v_lease.tenant_email)) is not distinct from lower(trim(v_token.tenant_email));

  return query
  select
    (v_token.revoked_at is null
       and v_token.used_at is null
       and v_token.expires_at > now()
       and v_lease.lease_status = 'pending_signature'
       and v_lease.tenant_signed_at is null
       and v_email_match) as valid,
    case
      when v_token.revoked_at is not null              then 'revoked_token'
      when v_token.used_at is not null                 then 'used_token'
      when v_token.expires_at <= now()                 then 'expired_token'
      when v_lease.tenant_signed_at is not null        then 'tenant_already_signed'
      when v_lease.lease_status = 'active'             then 'lease_active'
      when v_lease.lease_status <> 'pending_signature' then 'lease_not_pending'
      when not v_email_match                            then 'tenant_changed'
      else null
    end::text as reason,
    v_lease.id,
    v_lease.lease_status,
    (v_lease.tenant_signed_at is not null),
    (v_lease.owner_signed_at is not null),
    coalesce(
      v_lease.tenant_name,
      nullif(trim(coalesce(v_lease.first_name, '') || ' ' || coalesce(v_lease.last_name, '')), ''),
      'Tenant'
    ),
    coalesce(v_lease.owner_name, 'Property Owner'),
    coalesce(
      nullif(
        concat_ws(' — ',
          v_lease.property_name,
          v_lease.address_line1,
          nullif(concat_ws(', ', v_lease.city, v_lease.state, v_lease.postal_code), '')
        ),
        ''
      ),
      'Property'
    ),
    v_lease.unit_number,
    v_lease.start_date,
    v_lease.end_date,
    v_lease.rent_amount::numeric;
  return;
end;
$function$;
