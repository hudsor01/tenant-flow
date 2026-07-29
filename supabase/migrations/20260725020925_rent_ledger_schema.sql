-- =============================================================================
-- Rent ledger schema (LEDGER-02/04/05/06) - append-only persistence layer.
-- =============================================================================
-- Purpose: create the two owner-scoped, append-only ledger tables that every
-- downstream plan (RPCs, hooks, UI, KPI) reads from, plus the per-lease
-- "track since" column.
--
--   (1) public.rent_charges  - expected charges (auto-generated rent, manual
--       late-fee / other charges, credits, opening balances) and their
--       reversals. Append-only.
--   (2) public.rent_receipts - owner-recorded receipts allocated against a
--       specific charge (partials = multiple discrete rows) and their
--       reversals. Append-only.
--   (3) leases.ledger_start_date - nullable "track since" onboarding date
--       (Stessa pattern, D-04). Charge generation floors periods at this date.
--
-- Money boundary (D-00, load-bearing): every ledger amount is numeric(10,2)
-- DOLLARS. leases.rent_amount is integer dollars in prod; the integer->numeric
-- conversion happens EXACTLY ONCE at charge generation (see the companion cron
-- migration). There are no cents and no hundredfold scaling anywhere in the
-- ledger - this is the exact boundary that produced the v8.0 100x bugs.
--
-- Immutability (D-06): booked amounts must never change. Enforced by TWO
-- independent guards - (a) RLS grants authenticated only SELECT + INSERT (no
-- update / delete policy), and (b) a before-update-or-delete trigger that
-- raises for EVERY writer, including service_role and the table owner (RLS
-- alone does not stop those). Corrections are reversal inserts (reverses_id).
--
-- Analog: 20260724031533_esign_metering.sql (append-only owner-scoped table +
-- owner-SELECT RLS). Diverges by adding an authenticated INSERT policy (owners
-- record receipts / lines directly) and the belt-and-suspenders immutability
-- trigger (esign relies on RLS-only because it has no owner write path).
--
-- Conventions: all SQL lowercase; text + CHECK, never a PG enum (rule 6);
-- owner_user_id is the canonical owner column, referenced directly for RLS
-- (DIS-4 - the owner column is compared to auth.uid() directly here, not via a
-- helper). One policy per operation per role. Does NOT revive the demolished
-- legacy rent-facilitation table, and deliberately ignores the legacy per-lease
-- grace / late-fee / payment-day columns (DIS-1/2/3 - they exist but are unused;
-- grace is a fixed 5 days computed in the read RPC, late fees are manual lines).
--
-- Applied to prod in Plan 55-04 (the blocking gate), NOT here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. rent_charges - expected charges + credits + opening balances + reversals
-- -----------------------------------------------------------------------------
-- Denormalized owner_user_id + lease_id enable direct RLS and cheap owner-scoped
-- reads. amount is SIGNED dollars (charges positive, credits negative). A
-- reversal is a new row whose reverses_id points at the row it negates.
create table if not exists public.rent_charges (
  id            uuid primary key default gen_random_uuid(),
  lease_id      uuid not null references public.leases(id) on delete cascade,
  owner_user_id uuid not null references public.users(id)  on delete cascade,  -- denormalized for direct RLS (DIS-4)
  type          text not null
                constraint rent_charges_type_check
                check (type in ('rent','late_fee','manual_charge','credit','opening')),
  amount        numeric(10,2) not null,           -- SIGNED dollars; no cents, no hundredfold scaling (D-00)
  period_start  date,                             -- 1st of month for 'rent'/'opening'; nullable for ad-hoc lines
  due_date      date,                             -- late-detection anchor; = period_start for 'rent'
  description   text,
  reverses_id   uuid references public.rent_charges(id),  -- reversal = exact negation of the referenced row
  created_at    timestamptz not null default now(),
  -- sign discipline: charges positive, credits negative, opening either;
  -- reversals are exempt because they negate the referenced row.
  constraint rent_charges_sign_check check (
    reverses_id is not null
    or (type in ('rent','late_fee','manual_charge') and amount > 0)
    or (type = 'credit' and amount < 0)
    or (type = 'opening')
  )
);

-- Idempotency for the cron's auto rent charges ONLY (D-01): at most one 'rent'
-- charge per lease per month. The partial predicate MUST exactly match the
-- cron's `on conflict (lease_id, period_start) where type = 'rent'` arbiter
-- (RESEARCH Pitfall 2) - a manual line dated on the 1st must not collide.
create unique index if not exists uq_rent_charges_lease_period_rent
  on public.rent_charges (lease_id, period_start) where type = 'rent';
create index if not exists idx_rent_charges_lease on public.rent_charges (lease_id);
create index if not exists idx_rent_charges_owner on public.rent_charges (owner_user_id);

comment on table public.rent_charges is
  'Append-only, owner-scoped ledger of expected rent charges, manual charges/credits, opening balances, and their reversals (LEDGER-02/05/06). amount is numeric(10,2) DOLLARS (no cents, no hundredfold scaling, D-00). Owners get SELECT + INSERT only; a before-update-or-delete trigger blocks mutation for every writer (append-only) - corrections are reversal inserts via reverses_id.';

alter table public.rent_charges enable row level security;

-- One policy per operation per role (rls-policies skill). SELECT + INSERT only -
-- deliberately no update / delete policy, so the table is append-only for
-- authenticated owners. owner_user_id compared directly to auth.uid() (DIS-4).
create policy rent_charges_select on public.rent_charges
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy rent_charges_insert on public.rent_charges
  for insert to authenticated with check (owner_user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. rent_receipts - owner-recorded receipts allocated per-charge + reversals
-- -----------------------------------------------------------------------------
-- Per-charge allocation (D-02): each receipt references a specific charge.
-- Partial payments are multiple discrete rows against one charge. method is a
-- text LABEL only (cash/check/zelle/...) - never a payment rail (facilitation
-- stays demolished). amount is SIGNED dollars (positive = received, negative =
-- receipt reversal via reverses_id).
create table if not exists public.rent_receipts (
  id            uuid primary key default gen_random_uuid(),
  charge_id     uuid not null references public.rent_charges(id) on delete cascade,
  lease_id      uuid not null references public.leases(id)       on delete cascade,
  owner_user_id uuid not null references public.users(id)        on delete cascade,  -- denormalized for direct RLS
  amount        numeric(10,2) not null,           -- SIGNED dollars; positive = received, negative = reversal (D-00)
  method        text,                             -- label only (cash/check/zelle/...); never a payment rail
  received_date date not null,
  description   text,
  reverses_id   uuid references public.rent_receipts(id),  -- reversal = exact negation of the referenced receipt
  created_at    timestamptz not null default now()
);

create index if not exists idx_rent_receipts_charge on public.rent_receipts (charge_id);
create index if not exists idx_rent_receipts_lease  on public.rent_receipts (lease_id);
create index if not exists idx_rent_receipts_owner  on public.rent_receipts (owner_user_id);

comment on table public.rent_receipts is
  'Append-only, owner-scoped ledger of rent receipts allocated per-charge and their reversals (LEDGER-02). amount is numeric(10,2) DOLLARS (no cents, no hundredfold scaling, D-00); method is a text LABEL only, never a payment rail (facilitation is demolished). Owners get SELECT + INSERT only; a before-update-or-delete trigger blocks mutation for every writer (append-only) - corrections are reversal inserts via reverses_id.';

alter table public.rent_receipts enable row level security;

-- One policy per operation per role. SELECT + INSERT only - no update / delete
-- policy (append-only). Owners record receipts directly from the client.
create policy rent_receipts_select on public.rent_receipts
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy rent_receipts_insert on public.rent_receipts
  for insert to authenticated with check (owner_user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 3. Append-only immutability trigger (belt-and-suspenders, RESEARCH Pitfall 3)
-- -----------------------------------------------------------------------------
-- RLS grants authenticated only SELECT + INSERT, but RLS does not constrain
-- service_role or the table owner. This trigger raises on every update or
-- delete regardless of the writer, guaranteeing booked amounts are immutable
-- at the database layer. Corrections must be posted as reversal inserts.
create or replace function public.rent_ledger_append_only()
  returns trigger language plpgsql as $$
begin
  raise exception 'rent ledger is append-only; post a reversal entry instead of editing/deleting (row %)',
    coalesce(old.id::text, '?')
    using errcode = '0A000';   -- feature_not_supported
end;
$$;

create trigger rent_charges_no_mutate
  before update or delete on public.rent_charges
  for each row execute function public.rent_ledger_append_only();

create trigger rent_receipts_no_mutate
  before update or delete on public.rent_receipts
  for each row execute function public.rent_ledger_append_only();

-- -----------------------------------------------------------------------------
-- 4. leases.ledger_start_date - per-lease "track since" onboarding date (D-04)
-- -----------------------------------------------------------------------------
-- Nullable: a lease with no ledger onboarding shows no ledger until the owner
-- sets track-since. Charge generation only produces charges on/after this date.
alter table public.leases add column if not exists ledger_start_date date;

comment on column public.leases.ledger_start_date is
  'Per-lease "track since" onboarding date (LEDGER-04, D-04). Nullable - no ledger until set. Charge generation (generate_rent_charges) floors periods at this date; no history is backfilled before it.';
