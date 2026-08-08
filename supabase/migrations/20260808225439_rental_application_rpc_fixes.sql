-- =============================================================================
-- Phase 66 - three corrections to the rental-application RPCs.
--
-- WHY THIS IS A NEW FILE RATHER THAN AN EDIT.
--   20260807003555_rental_application_rpcs.sql is APPLIED IN PRODUCTION and its
--   filename is already reconciled to the prod-assigned timestamp. Editing an
--   applied migration changes nothing in the database and makes the repo lie
--   about what is deployed. Every function below is therefore a full
--   `create or replace` that can be applied on top of what is live.
--
--   Each body is the 20260807003555 body with ONE change, marked FIX in place.
--   Nothing else - not a grant, not a comment, not a bound - is altered except
--   where the comment stated something that was not true.
--
-- THE THREE CORRECTIONS.
--   F6  submit_rental_application accepted a calendar-IMPOSSIBLE move-in date.
--       `desired_move_in_date` was shape-checked with
--       `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` and then cast `::date`. `2026-02-31`,
--       `2024-13-01` and `0000-01-01` all satisfy that regex and every one of
--       them raises 22008 on the cast, which ABORTS THE WHOLE TRANSACTION - the
--       exact abort the block's own comment says it exists to prevent (it
--       enumerates 22P02 and 22003 and misses the date code). apply-token then
--       answers HTTP 500 and the applicant loses all 26 fields, because that
--       page persists nothing on the device by design. The Edge validator's
--       pattern was the identical regex, so nothing upstream filtered it either;
--       that half is fixed in `_shared/application-guards.ts`.
--
--   F7  create_application_link's one-active-link guard was an UNLOCKED
--       check-then-act. A bare `if exists (...)` with no row lock, no advisory
--       lock and no backing unique index: under READ COMMITTED two concurrent
--       calls both pass the guard and both insert. The comment claimed the guard
--       "doubles as the double-click and race guard", which was false for
--       exactly the reason submit_rental_application takes `FOR UPDATE` 280
--       lines later. The consequence is not cosmetic - the panel renders only
--       the newest link, so the owner revokes the visible one believing the
--       listing is closed while the hidden one keeps accepting applications.
--
--   F8  record_application_conversion wrote `status = 'approved'` and left
--       `disposition_reason` in place, so an application declined and later
--       converted persisted as approved-carrying-a-decline-reason - a state
--       set_application_status treats as impossible, because it clears that
--       column on every path. The retention sweep deliberately RETAINS both
--       columns on the anonymized stub, so the contradiction became the
--       permanent record.
--
-- pgcrypto IS STILL NOT IN `public` (D-15). Both calls below stay written as
-- extensions.gen_random_bytes and extensions.digest. An unqualified call parses,
-- applies clean, and then raises at runtime the first time an owner clicks
-- Create link.
--
-- Grants are NOT restated. `create or replace function` preserves the existing
-- ACL, and the revoke/grant pairs from 20260807003555 stand. Re-issuing them
-- would be harmless but would imply this file is the authority on the lockdown,
-- which it is not.
-- =============================================================================

-- =============================================================================
-- 1. create_application_link - F7: serialize the one-active-link guard.
-- =============================================================================

create or replace function public.create_application_link(
  p_unit_id      uuid,
  p_expires_days integer default 60
)
  returns table (link_id uuid, raw_token text, expires_at timestamptz)
  language plpgsql
  security definer
  set search_path = public
as $function$
declare
  v_owner   uuid := (select auth.uid());
  v_days    integer;
  v_raw     text;
  v_id      uuid;
  v_expires timestamptz;
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;

  -- One message for "this unit does not exist" and "this unit is not yours".
  -- Two distinct messages would let any signed-in owner probe unit ids and learn
  -- which ones belong to somebody else (T-66-02).
  if not exists (
    select 1
    from public.units un
    where un.id = p_unit_id
      and un.owner_user_id = v_owner
  ) then
    raise exception 'unit not found';
  end if;

  -- ---------------------------------------------------------------------------
  -- FIX F7: THE LOCK. Taken BEFORE the guard reads, and held to commit.
  --
  -- The guard below is a check-then-act. Without serialization two concurrent
  -- calls for the same unit both evaluate `if exists` against a snapshot in
  -- which the other's row is not yet visible, both pass, and both insert - and
  -- READ COMMITTED is the default here, so this is the ordinary case rather than
  -- an exotic one. A double-clicked Create button is enough.
  --
  -- The result is not cosmetic. Two active links for one unit means the panel,
  -- which renders only the newest, shows one of them; the owner revokes that one
  -- believing the listing is closed, and the hidden link keeps accepting
  -- applications against a unit that is no longer on the market.
  --
  -- An ADVISORY lock rather than a row lock, because there is no row to lock:
  -- the condition is about the ABSENCE of a link. `pg_advisory_xact_lock`
  -- releases at commit or rollback, needs no cleanup, and is keyed on the unit
  -- so two owners creating links for different units never queue behind one
  -- another. `hashtextextended` gives the bigint the single-argument form wants.
  --
  -- A PARTIAL UNIQUE INDEX CANNOT REPLACE THIS, and the original comment was
  -- right about the reason: the predicate needs now(), which is not immutable
  -- and therefore not indexable. What the original comment got wrong was the
  -- claim that the bare `if exists` "doubles as the double-click and race
  -- guard". It never did - for exactly the reason submit_rental_application
  -- takes `FOR UPDATE` on the link row before it evaluates its caps.
  -- ---------------------------------------------------------------------------
  perform pg_advisory_xact_lock(hashtextextended(p_unit_id::text, 0));

  -- Refuse while an ACTIVE link exists for this unit. Expired and revoked links
  -- do not block - UI-SPEC section C offers "Create a new link" in exactly those
  -- two states, and only "Revoke" while active.
  --
  -- This is what keeps "one active link per unit" true, and it is true only
  -- because of the advisory lock above.
  if exists (
    select 1
    from public.rental_application_links l
    where l.unit_id = p_unit_id
      and l.revoked_at is null
      and l.expires_at > now()
  ) then
    raise exception 'link already active';
  end if;

  -- Clamp rather than trust. An unbounded expiry turns a listing link into a
  -- permanent public write surface that nobody remembers exists, and a zero or
  -- negative value mints a link that is already dead - the owner would post it
  -- to a listing and never learn why no applications arrive.
  v_days := least(greatest(coalesce(p_expires_days, 60), 1), 365);

  -- 256 bits from the server's CSPRNG, hex-encoded. Never gen_random_uuid() as a
  -- token (122 bits of entropy and structured), never client-supplied entropy,
  -- and never a value that reached the server as a query parameter. See header
  -- note (b) for why this call is schema-qualified.
  v_raw     := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + make_interval(days => v_days);

  insert into public.rental_application_links (
    unit_id,
    owner_user_id,
    token_hash,
    raw_token,
    expires_at,
    created_by
  )
  values (
    p_unit_id,
    v_owner,
    encode(extensions.digest(v_raw, 'sha256'), 'hex'),
    v_raw,
    v_expires,
    v_owner
  )
  returning id into v_id;

  return query select v_id, v_raw, v_expires;
end;
$function$;

comment on function public.create_application_link(uuid, integer) is
  'Mints the reusable public application link for a unit the caller owns (D-01/D-03a). Raw token is 32 bytes from extensions.gen_random_bytes, hex-encoded; token_hash is its SHA-256 and is the public lookup key. Refuses a unit the caller does not own and refuses while an unexpired unrevoked link already exists for that unit; that one-active-link guard is serialized per unit by a transaction-scoped advisory lock, because a bare exists() check under READ COMMITTED lets two concurrent calls both pass. Expiry defaults to 60 days (D-03) and is clamped to [1, 365].';

-- =============================================================================
-- 2. submit_rental_application - F6: reject a calendar-impossible move-in date
--    instead of aborting the transaction on the cast.
-- =============================================================================

create or replace function public.submit_rental_application(
  p_token_hash    text,
  p_submission_id uuid,
  p_payload       jsonb,
  p_ip            text,
  p_user_agent    text
)
  returns table (success boolean, reason text, application_id uuid)
  language plpgsql
  security definer
  set search_path = public
as $function$
declare
  v_required constant text[] := array[
    'first_name', 'last_name', 'email', 'phone', 'desired_move_in_date',
    'current_street', 'current_city', 'current_state', 'current_postal_code',
    'gross_monthly_income', 'occupant_count', 'reference_1_name',
    'reference_1_phone', 'certified'
  ];
  v_link            record;
  v_ctx             record;
  v_key             text;
  v_scratch         text;
  v_recent          integer;
  v_app_id          uuid;
  v_occupants       integer;
  v_income          numeric;
  v_other_income    numeric;
  v_employer_months integer;
  v_move_in         date;
  v_message         text;
begin
  -- ---------------------------------------------------------------------------
  -- THE LOCK. Take it FIRST, before evaluating anything.
  --
  -- Under D-01 the link is reusable, so N strangers race this one row by
  -- construction. FOR UPDATE serializes them: every concurrent submission
  -- against the same token queues here, so the cap reads below see every
  -- increment that has already committed. Reading the caps outside this lock is
  -- the classic check-then-act race - two submissions both read
  -- submission_count = 249, both pass, both insert - and it is INVISIBLE to any
  -- single-threaded test. Plan 66-10's parallel-RPC integration test is the
  -- behavioural check that this line is really here.
  --
  -- Moving any cap evaluation above this select, or replacing the select with an
  -- unlocked read, silently removes the only fail-closed control in the phase.
  -- ---------------------------------------------------------------------------
  select l.id, l.owner_user_id, l.unit_id, l.expires_at, l.revoked_at,
         l.submission_count
  into v_link
  from public.rental_application_links l
  where l.token_hash = p_token_hash
  for update;

  if not found then
    return query select false, 'invalid_token'::text, null::uuid;
    return;
  end if;

  if v_link.revoked_at is not null then
    return query select false, 'revoked_token'::text, null::uuid;
    return;
  end if;

  if v_link.expires_at <= now() then
    return query select false, 'expired_token'::text, null::uuid;
    return;
  end if;

  -- Lifetime cap. Replaces the natural ceiling that dropping the single-use
  -- consumption stamp removed (D-01 -> D-04a).
  if v_link.submission_count >= 250 then
    return query select false, 'link_capped'::text, null::uuid;
    return;
  end if;

  -- Rolling-hour cap. Bounds a burst without permanently killing a legitimate
  -- listing, and is counted from the applications themselves rather than a
  -- second counter so it cannot drift out of step with reality.
  select count(*)
  into v_recent
  from public.rental_applications ra
  where ra.link_id = v_link.id
    and ra.created_at > now() - interval '1 hour';

  if v_recent >= 25 then
    return query select false, 'rate_capped'::text, null::uuid;
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- Payload validation - DEFENCE IN DEPTH, deliberately duplicating the strict
  -- validator in supabase/functions/_shared/application-guards.ts.
  --
  -- The Edge Function is the only caller today. It is not the only conceivable
  -- caller, and it is not the only way this function can be reached with a
  -- malformed body. What is written here is a fair-housing record that the
  -- landlord may have to stand behind for two years, so a payload missing a
  -- required answer must be REFUSED rather than stored half-empty.
  --
  -- Every failure returns invalid_payload rather than raising. A raise would
  -- abort the transaction and surface to the applicant as a 500 that loses the
  -- form they just filled in - the same abort class as the Phase 52 C6 bug.
  -- ---------------------------------------------------------------------------
  if p_submission_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;

  foreach v_key in array v_required loop
    if nullif(btrim(coalesce(p_payload ->> v_key, '')), '') is null then
      return query select false, 'invalid_payload'::text, null::uuid;
      return;
    end if;
  end loop;

  -- The UI-05 attestation. Anything other than a true attestation is a refusal:
  -- an application recorded without it is not evidence of anything.
  if p_payload ->> 'certified' <> 'true' then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;

  -- Numeric and date bounds mirror NUMBER_FIELDS in application-guards.ts. They
  -- are checked with a pattern before any cast: an unchecked cast of attacker
  -- text raises 22P02 or 22003 mid-transaction, which is the abort this whole
  -- block exists to avoid.
  v_scratch := btrim(p_payload ->> 'occupant_count');
  if v_scratch !~ '^[0-9]+$' then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;
  v_occupants := v_scratch::integer;
  if v_occupants < 1 or v_occupants > 50 then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;

  v_scratch := btrim(p_payload ->> 'gross_monthly_income');
  if v_scratch !~ '^[0-9]+(\.[0-9]+)?$' then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;
  v_income := v_scratch::numeric;
  if v_income > 10000000 then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- FIX F6: SHAPE IS NOT VALIDITY.
  --
  -- The regex below is the same one as before and still runs first, but it only
  -- proves the string LOOKS like a date. `2026-02-31`, `2024-13-01` and
  -- `0000-01-01` all satisfy it and every one of them raises 22008 on the cast.
  -- An uncaught raise here aborts THE WHOLE TRANSACTION - including the link row
  -- already locked FOR UPDATE and every check above - so apply-token answers
  -- HTTP 500 and the applicant loses all 26 fields with no recovery path,
  -- because /apply deliberately persists nothing on the device.
  --
  -- That is precisely the abort this validation block's own header says it
  -- exists to prevent; the header enumerated 22P02 and 22003 and missed the date
  -- code. The cast now runs inside a subtransaction so a bad date becomes an
  -- ordinary `invalid_payload` answer like every other validation failure here.
  -- ---------------------------------------------------------------------------
  v_scratch := btrim(p_payload ->> 'desired_move_in_date');
  if v_scratch !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;

  begin
    v_move_in := v_scratch::date;
  exception
    -- 22008 datetime_field_overflow is what all three examples above raise, and
    -- 22007 invalid_datetime_format covers shapes the regex should already have
    -- excluded. `others` is the deliberate backstop rather than a shrug: any
    -- escape from this block costs the applicant the entire form, which is a
    -- strictly worse outcome than answering invalid_payload for a date nobody
    -- can move in on. QUERY_CANCELED and ASSERT_FAILURE are not caught by
    -- `others` in PL/pgSQL, so a statement timeout still propagates.
    when others then
      v_move_in := null;
  end;

  if v_move_in is null then
    return query select false, 'invalid_payload'::text, null::uuid;
    return;
  end if;

  v_scratch := nullif(btrim(coalesce(p_payload ->> 'other_income_amount', '')), '');
  if v_scratch is not null then
    if v_scratch !~ '^[0-9]+(\.[0-9]+)?$' or v_scratch::numeric > 10000000 then
      return query select false, 'invalid_payload'::text, null::uuid;
      return;
    end if;
    v_other_income := v_scratch::numeric;
  end if;

  v_scratch := nullif(btrim(coalesce(p_payload ->> 'employer_months', '')), '');
  if v_scratch is not null then
    if v_scratch !~ '^[0-9]+$' or v_scratch::integer > 1200 then
      return query select false, 'invalid_payload'::text, null::uuid;
      return;
    end if;
    v_employer_months := v_scratch::integer;
  end if;

  -- Denormalized label snapshot, taken at submission time. These are the reason
  -- rental_applications.unit_id is `on delete set null` rather than cascade:
  -- units are hard-deletable, and the row still has to read correctly to the
  -- owner after the unit it was for is gone.
  select pr.name        as property_name,
         un.unit_number as unit_number
  into v_ctx
  from public.units un
  left join public.properties pr on pr.id = un.property_id
  where un.id = v_link.unit_id;

  insert into public.rental_applications (
    owner_user_id,
    link_id,
    unit_id,
    property_label,
    unit_label,
    submission_id,
    status,
    occupant_count,
    certified_at,
    applicant_first_name,
    applicant_last_name,
    applicant_email,
    applicant_phone,
    desired_move_in_date,
    current_street,
    current_city,
    current_state,
    current_postal_code,
    current_landlord_name,
    current_landlord_phone,
    reason_for_moving,
    gross_monthly_income,
    employer_name,
    employer_role,
    employer_months,
    other_income_source,
    other_income_amount,
    pet_details,
    vehicle_details,
    reference_1_name,
    reference_1_relationship,
    reference_1_phone,
    reference_2_name,
    reference_2_relationship,
    reference_2_phone,
    submitted_ip,
    submitted_user_agent
  )
  values (
    v_link.owner_user_id,
    v_link.id,
    v_link.unit_id,
    coalesce(v_ctx.property_name, 'Property'),
    v_ctx.unit_number,
    p_submission_id,
    'new',
    v_occupants,
    -- Stamped server-side, never read from the client, so an attestation cannot
    -- be backdated by whoever built the request.
    now(),
    btrim(p_payload ->> 'first_name'),
    btrim(p_payload ->> 'last_name'),
    lower(btrim(p_payload ->> 'email')),
    btrim(p_payload ->> 'phone'),
    v_move_in,
    btrim(p_payload ->> 'current_street'),
    btrim(p_payload ->> 'current_city'),
    upper(btrim(p_payload ->> 'current_state')),
    btrim(p_payload ->> 'current_postal_code'),
    nullif(btrim(coalesce(p_payload ->> 'current_landlord_name', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'current_landlord_phone', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'reason_for_moving', '')), ''),
    v_income,
    nullif(btrim(coalesce(p_payload ->> 'employer_name', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'employer_role', '')), ''),
    v_employer_months,
    nullif(btrim(coalesce(p_payload ->> 'other_income_source', '')), ''),
    v_other_income,
    nullif(btrim(coalesce(p_payload ->> 'pet_details', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'vehicle_details', '')), ''),
    btrim(p_payload ->> 'reference_1_name'),
    nullif(btrim(coalesce(p_payload ->> 'reference_1_relationship', '')), ''),
    btrim(p_payload ->> 'reference_1_phone'),
    nullif(btrim(coalesce(p_payload ->> 'reference_2_name', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'reference_2_relationship', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'reference_2_phone', '')), ''),
    left(p_ip, 100),
    left(coalesce(p_user_agent, ''), 500)
  )
  on conflict (submission_id) do nothing
  returning id into v_app_id;

  -- ---------------------------------------------------------------------------
  -- Idempotency. A double-click and a network retry are ONE submission, and the
  -- client mints submission_id once per form load, so the retry carries the same
  -- key and lands here. Report success: the applicant's data is already stored
  -- and telling them otherwise would make them submit again.
  --
  -- Deliberately does NOT increment submission_count and does NOT notify. An
  -- idempotency path that still incremented would let a flaky connection walk
  -- the lifetime cap down toward zero without a single extra application being
  -- stored, and would notify the owner repeatedly about one applicant.
  --
  -- A genuine second application from the same person still works: reloading the
  -- page mints a new submission_id.
  -- ---------------------------------------------------------------------------
  if v_app_id is null then
    return query select true, 'duplicate'::text, null::uuid;
    return;
  end if;

  update public.rental_application_links
  set submission_count = submission_count + 1
  where id = v_link.id;

  -- NOTIF-01 single-writer invariant: notifications are written by
  -- create_notification and by nothing else, ever. A direct insert here would
  -- bypass the one place that knows the row shape.
  --
  -- The message names the unit and property and NEVER the applicant.
  -- Notification bodies are not covered by the 730-day retention sweep, so an
  -- applicant name in this string would outlive the anonymization of the very
  -- row it describes - PII surviving in a place nobody thinks to look.
  --
  -- 'application_received' must exist in notifications_notification_type_check.
  -- Plan 66-01 extends that constraint in the migration that precedes this one.
  -- If it did not, this call raises 23514 INSIDE this transaction and destroys
  -- the applicant's entire submission rather than merely losing a notification.
  v_message := 'A new application was submitted for '
               || coalesce(v_ctx.property_name, 'a property')
               || coalesce(' unit ' || v_ctx.unit_number, '')
               || '.';

  perform public.create_notification(
    v_link.owner_user_id,
    'application_received',
    'New rental application',
    v_message,
    'rental_application',
    v_app_id,
    '/applications/' || v_app_id::text
  );

  return query select true, null::text, v_app_id;
end;
$function$;

comment on function public.submit_rental_application(text, uuid, jsonb, text, text) is
  'Service-role-only write path for the public /apply/[token] form, and the only INSERT into public.rental_applications. Locks the link row FOR UPDATE before evaluating the 250 lifetime and 25 rolling-hour caps, so neither can be raced (D-04a, F-6). Every payload failure - including a calendar-impossible desired_move_in_date, whose cast runs inside a subtransaction - returns invalid_payload rather than raising, because a raise aborts the transaction and costs the applicant the whole form. Idempotent on submission_id: a repeat returns success with reason=duplicate and neither increments the counter nor re-notifies. Notifies the owner through create_notification only (NOTIF-01).';

-- =============================================================================
-- 3. record_application_conversion - F8: an approved row carries no decline
--    reason.
-- =============================================================================

create or replace function public.record_application_conversion(
  p_application_id uuid,
  p_tenant_id      uuid
)
  returns table (success boolean, reason text)
  language plpgsql
  security definer
  set search_path = public
as $function$
declare
  v_owner uuid := (select auth.uid());
  v_app   record;
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;

  select a.id, a.converted_tenant_id
  into v_app
  from public.rental_applications a
  where a.id = p_application_id
    and a.owner_user_id = v_owner
  for update;

  if not found then
    raise exception 'application not found';
  end if;

  -- BOTH rows are checked, not just the application. Verifying only the
  -- application would let an owner point their own application at another
  -- owner's tenant id, creating a cross-owner reference that leaks the
  -- existence of that tenant and corrupts the other owner's records
  -- (T-66-14). tenants.owner_user_id is nullable, so this comparison also
  -- correctly excludes any unowned tenant row.
  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.owner_user_id = v_owner
  ) then
    raise exception 'tenant not found';
  end if;

  -- Returned, not raised. A second call is a double-click on a slow network or a
  -- retried navigation, and the UI has already relabelled its primary control to
  -- "View tenant" for this state - so raising would surface an error toast for
  -- something entirely benign. Enforcing this in the RPC rather than only in the
  -- UI is what stops a double submit minting a second tenant (T-66-20).
  if v_app.converted_tenant_id is not null then
    return query select false, 'already_converted'::text;
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- FIX F8: `disposition_reason` is cleared with the status, never left behind.
  --
  -- A declined application can be converted later - the owner changes their mind
  -- or the first choice falls through - and this UPDATE wrote `approved` over
  -- the status while leaving the recorded decline reason in place. The row then
  -- read as approved-carrying-a-decline-reason, a state set_application_status
  -- treats as impossible because it clears this column on every one of its
  -- paths. The 730-day retention sweep deliberately RETAINS status and
  -- disposition_reason on the anonymized stub, so that contradiction became the
  -- permanent record of the decision - in the one column kept precisely so a
  -- fair-housing claim can be answered.
  -- ---------------------------------------------------------------------------
  update public.rental_applications
  set converted_tenant_id = p_tenant_id,
      converted_at = now(),
      status = 'approved',
      disposition_reason = null,
      decided_at = coalesce(decided_at, now())
  where id = p_application_id
    and owner_user_id = v_owner;

  return query select true, null::text;
end;
$function$;

comment on function public.record_application_conversion(uuid, uuid) is
  'Owner-gated recorder for D-08/D-09 conversion: stamps converted_tenant_id, converted_at, status=approved and decided_at on an application the caller owns, pointing at a tenant the caller also owns, and CLEARS disposition_reason so a previously-declined row cannot persist as approved-with-a-decline-reason. Returns (false, already_converted) rather than raising on a repeat, so a double-click is benign. Never creates a tenant, and nothing points from tenants back to applications, so no delete in either direction can cascade.';
