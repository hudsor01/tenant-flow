-- Phase 43 (E-sign Flow) — three coordinated schema changes shipped as one file:
--
--   SIGN-01  Add leases.signed_lease_emailed_at (write-once send tracking) so the
--            finalize step can email the executed PDF to the tenant exactly once,
--            even across finalize retries (SIGN-02). This column is intentionally
--            NOT in the reject_signature_audit_tampering write-once list, so the
--            tamper guard is untouched.
--
--   SIGN-03  Re-define sign_lease_with_token to notify the owner when the tenant
--            signs FIRST. The prior body only inserted a notification inside the
--            fully-signed branch (owner_signed_at is not null); the tenant-first
--            path (send does not require an owner signature) inserted nothing and
--            the lease silently stalled in pending_signature. Add an else branch.
--
--   SIGN-04  Re-define get_lease_signing_context so the completed-state reasons
--            (tenant_already_signed / lease_active) are evaluated BEFORE the
--            token-consumption reasons (revoked/used/expired), gated on the token
--            belonging to the current tenant email (v_email_match). Signing always
--            consumes the token, so a legitimate signer revisiting their link only
--            ever had a used_token — the friendly "already signed / active" cards
--            were unreachable. The `valid` boolean expression is unchanged (the
--            document action's PII gate is untouched).
--
-- Both RPC bodies are copied verbatim from the current canonical definitions in
-- 20260618200203_esign_fix_ambiguous_lease_id_in_signing_rpcs.sql (keeping the
-- lst./l. qualified column references that fixed the ambiguous-lease_id defect),
-- then modified. Both keep `security definer set search_path to 'public'`.

alter table public.leases
  add column if not exists signed_lease_emailed_at timestamptz;

comment on column public.leases.signed_lease_emailed_at is
  'SIGN-01: write-once timestamp claimed when the finalize step emails the tenant a copy of the fully executed lease PDF. NULL means not yet sent; the finalize claim atomically flips NULL -> now() so retries never double-email. Not a signature-audit column (excluded from reject_signature_audit_tampering).';

-- ── SIGN-03 ──────────────────────────────────────────────────────────────────
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
  select lst.id, lst.lease_id, lst.tenant_email, lst.expires_at, lst.used_at, lst.revoked_at
  into v_token
  from public.lease_signing_tokens lst
  where lst.token_hash = p_token_hash
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

  select l.id, l.owner_user_id, l.lease_status, l.owner_signed_at, l.tenant_signed_at, l.primary_tenant_id
  into v_lease
  from public.leases l
  where l.id = v_token.lease_id
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

  select lower(trim(t.email)) into v_current_email
  from public.tenants t
  where t.id = v_lease.primary_tenant_id;

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
  else
    -- SIGN-03: tenant signed first. Notify the owner in-app (atomic with the
    -- signature write) so the lease can't silently stall awaiting the owner's
    -- countersignature. The email nudge is best-effort in the Edge Function.
    insert into public.notifications (
      user_id, title, message, notification_type, entity_type, entity_id
    )
    values (
      v_lease.owner_user_id, 'Tenant signed the lease',
      'The tenant has signed. Sign as owner to activate the lease.',
      'lease', 'lease', v_lease.id
    );
  end if;

  return query select true, (v_lease.owner_signed_at is not null), v_lease.id, null::text;
  return;
end;
$function$;

-- ── SIGN-04 ──────────────────────────────────────────────────────────────────
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
  select lst.id, lst.lease_id, lst.tenant_email, lst.expires_at, lst.used_at, lst.revoked_at
  into v_token
  from public.lease_signing_tokens lst
  where lst.token_hash = p_token_hash;

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
    -- SIGN-04: evaluate the completed-state reasons FIRST for the authentic
    -- tenant's token (v_email_match). Signing consumes the token, so a
    -- legitimate signer revisiting their link would otherwise only ever see
    -- used_token and never the friendly "already signed / active" cards. The
    -- v_email_match gate keeps a rebound/stale token holder (tenant_changed)
    -- from being falsely told "you have already signed" — those fall through
    -- to the token-state reasons below.
    case
      when v_email_match and v_lease.tenant_signed_at is not null then 'tenant_already_signed'
      when v_email_match and v_lease.lease_status = 'active'      then 'lease_active'
      when v_token.revoked_at is not null                          then 'revoked_token'
      when v_token.used_at is not null                             then 'used_token'
      when v_token.expires_at <= now()                             then 'expired_token'
      when v_lease.lease_status <> 'pending_signature'             then 'lease_not_pending'
      when not v_email_match                                       then 'tenant_changed'
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
