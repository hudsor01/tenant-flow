-- Token-based in-app lease e-signature (replaces the DocuSeal integration).
--
-- The owner signs in-app (authenticated). The tenant signs via a single-use
-- magic link emailed to them — tenants are records, never auth users — landing
-- on the public /sign/[token] route. There is no third-party e-sign vendor and
-- no inbound webhook: activation is an atomic in-DB flip decided when the second
-- party signs (the signing RPCs serialize on the lease row's FOR UPDATE lock,
-- so exactly one signer observes both_signed = true).
--
-- This migration:
--   1. Creates lease_signing_tokens (hashed single-use tokens, owner-scoped RLS).
--   2. Adds signature audit columns + signed-document pointers to leases.
--   3. Drops the legacy docuseal_* columns (no vendor, no submission id).
--   4. Rewrites the activation security-event trigger off the dropped columns.
--   5. Replaces the dead sign_lease_and_check_activation RPC with three
--      service_role-only SECURITY DEFINER RPCs:
--        - record_lease_signature      (owner, in-app)
--        - sign_lease_with_token       (tenant, atomic token consume + sign)
--        - get_lease_signing_context   (read-only render context for /sign)

-- ============================================================================
-- 1. lease_signing_tokens
-- ============================================================================
create table public.lease_signing_tokens (
  id           uuid primary key default gen_random_uuid(),
  lease_id     uuid not null references public.leases (id) on delete cascade,
  tenant_email text not null,
  -- SHA-256 hex of the raw token. The raw token is emailed once and never
  -- stored — a DB leak cannot reconstruct a usable signing link.
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  revoked_at   timestamptz,
  created_by   uuid not null references public.users (id),
  created_at   timestamptz not null default now()
);

create index lease_signing_tokens_lease_id_idx
  on public.lease_signing_tokens (lease_id);

alter table public.lease_signing_tokens enable row level security;

-- Owners may read their own lease's tokens (signature-status / audit views).
-- There are deliberately NO write policies: tokens are only ever created,
-- consumed, or revoked by the service_role-only SECURITY DEFINER RPCs and the
-- lease-signature Edge Function (which bypasses RLS as service_role).
create policy "Owners read own lease signing tokens"
  on public.lease_signing_tokens
  for select
  to authenticated
  using (
    lease_id in (
      select id from public.leases
      where owner_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 2. leases: signature audit columns + signed-document pointers
-- ============================================================================
alter table public.leases
  add column owner_signature_user_agent  text,
  add column tenant_signature_user_agent text,
  -- Storage path of the finalized, signature-stamped PDF in the
  -- tenant-documents bucket (lease/<lease_id>/signed-lease.pdf). Owners mint a
  -- signed URL on demand; the PDF is regenerable from lease data if absent.
  add column signed_document_path        text,
  -- SHA-256 hex of the finalized PDF bytes — tamper-evidence for the audit trail.
  add column signed_document_hash        text;

-- ============================================================================
-- 3. Rewrite the activation security-event trigger BEFORE dropping the columns
--    it reads (NEW.docuseal_submission_id / NEW.docuseal_document_url).
-- ============================================================================
create or replace function public.log_security_event_lease_signed()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  -- Fires on the canonical activation transition, regardless of which signing
  -- path (in-app owner or tenant magic link) flipped the lease to active.
  if NEW.lease_status = 'active'
     and OLD.lease_status is distinct from 'active' then
    insert into public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    values (
      'lease.signed',
      'info',
      NEW.owner_user_id,
      'Lease activated (all parties signed)',
      'lease',
      NEW.id,
      jsonb_build_object(
        'unit_id',              NEW.unit_id,
        'previous_status',      OLD.lease_status,
        'has_signed_document',  NEW.signed_document_path is not null
      )
    );
  end if;
  return NEW;
end;
$function$;

-- ============================================================================
-- 4. Drop the legacy DocuSeal columns and the dead activation RPC.
-- ============================================================================
alter table public.leases
  drop column if exists docuseal_submission_id,
  drop column if exists docuseal_document_url;

drop function if exists public.sign_lease_and_check_activation(
  uuid, text, text, timestamptz, text
);

-- ============================================================================
-- 5a. record_lease_signature — owner in-app signature (atomic, lock-guarded).
-- ============================================================================
create function public.record_lease_signature(
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
  select id, lease_status, owner_signed_at, tenant_signed_at
  into v_lease
  from public.leases
  where id = p_lease_id
  for update;

  if v_lease.id is null then
    return query select false, false, 'Lease not found'::text;
    return;
  end if;

  if v_lease.lease_status not in ('draft', 'pending_signature') then
    return query select false, false, 'Lease cannot be signed in its current status'::text;
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

  -- both_signed is true only for whichever party signs second (the lock
  -- serializes concurrent signs), so the caller finalizes exactly once.
  return query select true, (v_lease.tenant_signed_at is not null), null::text;
  return;
end;
$function$;

-- ============================================================================
-- 5b. sign_lease_with_token — tenant signature via single-use token (atomic).
-- ============================================================================
create function public.sign_lease_with_token(
  p_token_hash            text,
  p_signature_ip          text,
  p_signature_user_agent  text,
  p_signed_at             timestamptz
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

  select id, lease_status, owner_signed_at, tenant_signed_at
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
      tenant_signature_method     = 'in_app'
  where id = v_lease.id;

  update public.lease_signing_tokens
  set used_at = p_signed_at
  where id = v_token.id;

  return query select true, (v_lease.owner_signed_at is not null), v_lease.id, null::text;
  return;
end;
$function$;

-- ============================================================================
-- 5c. get_lease_signing_context — read-only render context for /sign/[token].
--     Does NOT consume the token (the page may load multiple times).
-- ============================================================================
create function public.get_lease_signing_context(p_token_hash text)
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
begin
  select id, lease_id, expires_at, used_at, revoked_at
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
    t.name as tenant_name, t.first_name, t.last_name,
    o.full_name as owner_name
  into v_lease
  from public.leases l
  left join public.units u on u.id = l.unit_id
  left join public.properties p on p.id = u.property_id
  left join public.tenants t on t.id = l.primary_tenant_id
  left join public.users o on o.id = l.owner_user_id
  where l.id = v_token.lease_id;

  return query
  select
    (v_token.revoked_at is null
       and v_token.used_at is null
       and v_token.expires_at > now()
       and v_lease.lease_status = 'pending_signature'
       and v_lease.tenant_signed_at is null) as valid,
    case
      when v_token.revoked_at is not null            then 'revoked_token'
      when v_token.used_at is not null               then 'used_token'
      when v_token.expires_at <= now()               then 'expired_token'
      when v_lease.tenant_signed_at is not null      then 'tenant_already_signed'
      when v_lease.lease_status = 'active'           then 'lease_active'
      when v_lease.lease_status <> 'pending_signature' then 'lease_not_pending'
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

-- ============================================================================
-- Grants: service_role only (the Edge Functions call via the admin client).
-- ============================================================================
revoke all on function public.record_lease_signature(uuid, text, text, timestamptz, text) from public;
revoke all on function public.sign_lease_with_token(text, text, text, timestamptz) from public;
revoke all on function public.get_lease_signing_context(text) from public;

grant execute on function public.record_lease_signature(uuid, text, text, timestamptz, text) to service_role;
grant execute on function public.sign_lease_with_token(text, text, text, timestamptz) to service_role;
grant execute on function public.get_lease_signing_context(text) to service_role;
