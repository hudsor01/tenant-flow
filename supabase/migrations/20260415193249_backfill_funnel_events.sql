-- Phase 44 / Plan 2 / ANALYTICS-03 -- One-time backfill of onboarding_funnel_events
-- Decision: D8 -- first_tenant backfill unions tenants + tenant_invitations to
--                capture pre-v1.3 direct-tenant flows. tenants table has NO direct
--                owner_user_id, so the tenants branch joins through
--                lease_tenants -> leases.owner_user_id.
-- Idempotent: every INSERT uses ON CONFLICT (owner_user_id, step_name) DO NOTHING.
-- Re-runnable: `select public.backfill_funnel_events();` from SQL editor by service_role.
-- NOT admin-callable: no grant execute to authenticated; infrastructure, not API.

create or replace function public.backfill_funnel_events()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Step 1: signup -- OWNER users only (D2 cohort is owner-focused)
  insert into public.onboarding_funnel_events (owner_user_id, step_name, completed_at)
  select u.id, 'signup', coalesce(u.created_at, now())
  from public.users u
  where u.user_type = 'OWNER'
  on conflict (owner_user_id, step_name) do nothing;

  -- Step 2: first_property -- earliest property per owner
  insert into public.onboarding_funnel_events
    (owner_user_id, step_name, completed_at, metadata)
  select
    p.owner_user_id,
    'first_property',
    coalesce(p.created_at, now()),
    jsonb_build_object('property_id', p.id, 'source', 'backfill')
  from (
    select distinct on (owner_user_id)
      id, owner_user_id, created_at
    from public.properties
    order by owner_user_id, created_at asc
  ) p
  on conflict (owner_user_id, step_name) do nothing;

  -- Step 3: first_tenant (D8 UNION -- invitation flow + legacy direct-tenant flow)
  -- tenants has no owner_user_id; walk tenants -> lease_tenants -> leases.owner_user_id.
  insert into public.onboarding_funnel_events
    (owner_user_id, step_name, completed_at, metadata)
  select
    combined.owner_user_id,
    'first_tenant',
    min(combined.created_at) as completed_at,
    jsonb_build_object('source', 'backfill_union') as metadata
  from (
    -- Branch A: modern invitation flow
    select
      ti.owner_user_id,
      coalesce(ti.created_at, now()) as created_at
    from public.tenant_invitations ti
    where ti.owner_user_id is not null

    union all

    -- Branch B: legacy direct-tenant flow (pre-v1.3)
    -- Join: tenants -> lease_tenants -> leases -> owner_user_id
    select
      l.owner_user_id,
      coalesce(t.created_at, now()) as created_at
    from public.tenants t
    join public.lease_tenants lt on lt.tenant_id = t.id
    join public.leases l         on l.id = lt.lease_id
    where l.owner_user_id is not null
  ) combined
  group by combined.owner_user_id
  on conflict (owner_user_id, step_name) do nothing;

  -- Step 4: first_rent -- earliest succeeded payment per owner (via leases join)
  insert into public.onboarding_funnel_events
    (owner_user_id, step_name, completed_at, metadata)
  select
    sub.owner_user_id,
    'first_rent',
    sub.completed_at,
    jsonb_build_object(
      'lease_id', sub.lease_id,
      'rent_payment_id', sub.rent_payment_id,
      'source', 'backfill'
    )
  from (
    select distinct on (l.owner_user_id)
      l.owner_user_id,
      rp.lease_id,
      rp.id as rent_payment_id,
      coalesce(rp.paid_date, rp.created_at, now()) as completed_at
    from public.rent_payments rp
    join public.leases l on l.id = rp.lease_id
    where rp.status = 'succeeded'
      and l.owner_user_id is not null
    order by l.owner_user_id, coalesce(rp.paid_date, rp.created_at) asc
  ) sub
  on conflict (owner_user_id, step_name) do nothing;

  raise notice 'backfill_funnel_events: completed (idempotent)';
end;
$$;

comment on function public.backfill_funnel_events() is
  'Idempotent one-time backfill of onboarding_funnel_events for pre-existing OWNER users. D8: tenant backfill unions tenants + tenant_invitations (legacy + modern flows). Re-runnable via service_role; ON CONFLICT DO NOTHING protects against double-inserts. Not callable by authenticated users (no grant).';

-- One-time invocation as part of this migration.
select public.backfill_funnel_events();
