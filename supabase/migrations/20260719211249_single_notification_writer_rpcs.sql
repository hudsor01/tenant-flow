-- CR-01 (Phase 52 code-review BLOCKER): restore the NOTIF-01 single-writer
-- invariant for lease sign/activation notifications.
--
-- Phase 52 added trg_notify_owner_lease_esign (AFTER UPDATE ON leases,
-- 20260719200224_notification_and_activity_event_triggers.sql), making it the
-- sole notification writer for the tenant-signature and activation transitions:
--   • tenant_signed_at null -> not-null  =>  create_notification('lease_signed')
--   • lease_status        -> 'active'    =>  create_notification('lease_executed')
--
-- But the two signing RPCs that perform those exact UPDATEs were never
-- reconciled — they still direct-insert their own rows with the legacy,
-- off-contract notification_type='lease' (a 6th type with no TYPE_VISUALS entry
-- that renders with the fallback Bell icon). Both writers running on the same
-- statement produced 2-3x duplicate owner notifications per signing event and
-- bypassed create_notification, breaching the NOTIF-01 "single, un-bypassable
-- system insert point" contract declared by
-- 20260719193759_create_notification_and_reconcile_rls.sql.
--
-- This migration re-defines BOTH RPCs with ONLY the direct
-- `insert into public.notifications (...)` blocks removed. Every other statement
-- is preserved byte-for-byte from the current canonical definitions:
--   • record_lease_signature  <- 20260617165226_esign_persist_signature_consent.sql
--   • sign_lease_with_token    <- 20260717202529_esign_notify_reason_order_email_tracking.sql
-- The trigger now emits 'lease_signed'/'lease_executed' in place of each RPC's
-- legacy 'lease' insert; the activation `update ... lease_status='active'` (which
-- fires the trigger) is kept, so removal is complete, not lossy. Both keep
-- `security definer set search_path to 'public'`.

-- ── record_lease_signature (owner in-app signature path) ─────────────────────
-- Dropped: the `insert into public.notifications (... 'lease' ...)` inside the
-- activation branch. trg_notify_owner_lease_esign now emits 'lease_executed' on
-- the `update ... lease_status='active'`.
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
    -- notification now emitted by trg_notify_owner_lease_esign (lease_executed).
  end if;

  return query select true, (v_lease.tenant_signed_at is not null), null::text;
  return;
end;
$function$;

-- ── sign_lease_with_token (tenant magic-link signature path) ─────────────────
-- Dropped: BOTH notification inserts — the fully-signed branch (legacy
-- 'Lease fully signed') and the tenant-first `else` branch (legacy 'Tenant
-- signed the lease'). trg_notify_owner_lease_esign now emits 'lease_signed' on
-- the tenant_signed_at update and 'lease_executed' on the activation update, so
-- the tenant-first case no longer needs an explicit notify branch. Every other
-- statement (SIGN-03 email-match gate, token consumption) is unchanged.
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
    -- notification now emitted by trg_notify_owner_lease_esign (lease_executed).
  end if;
  -- SIGN-03: tenant-first (owner not yet signed) no longer needs an explicit
  -- notify block — trg_notify_owner_lease_esign emits 'lease_signed' on the
  -- tenant_signed_at update above. The email nudge stays best-effort in the
  -- Edge Function.

  return query select true, (v_lease.owner_signed_at is not null), v_lease.id, null::text;
  return;
end;
$function$;
