-- =============================================================================
-- Migration: Create Vendors Table
-- Purpose: Add vendor/contractor management for property owners
-- Affected tables: vendors (new)
-- Special considerations:
--   - Uses text + CHECK constraints instead of PostgreSQL ENUMs (per CLAUDE.md)
--   - RLS enabled with per-operation policies for authenticated role
--   - owner_user_id links to auth.users (cascade delete on user removal)
-- =============================================================================

-- vendors table: stores contractor/vendor relationships for property owners
-- trade and status use text columns with CHECK constraints (not PostgreSQL ENUMs)
create table public.vendors (
  id uuid default gen_random_uuid() primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  trade text not null,
  hourly_rate numeric(10,2),
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- trade constraint: valid contractor specializations
  constraint vendors_trade_check check (
    trade in ('plumbing', 'electrical', 'hvac', 'carpentry', 'painting', 'landscaping', 'appliance', 'general', 'other')
  ),

  -- status constraint: vendor lifecycle states
  constraint vendors_status_check check (
    status in ('active', 'inactive')
  )
);

comment on table public.vendors is
  'Contractor and vendor records managed by property owners for maintenance coordination.';

comment on constraint vendors_trade_check on public.vendors is
  'Valid values: plumbing, electrical, hvac, carpentry, painting, landscaping, appliance, general, other';

comment on constraint vendors_status_check on public.vendors is
  'Valid values: active, inactive';

-- Enable RLS - all access controlled via policies below
alter table public.vendors enable row level security;

-- Index for performance: most queries will filter by owner_user_id
create index vendors_owner_user_id_idx on public.vendors (owner_user_id);

-- =============================================================================
-- RLS Policies (one per operation per CLAUDE.md guidelines)
-- All policies use (select auth.uid()) pattern for Postgres optimizer caching
-- =============================================================================

-- SELECT: owners can view only their own vendors
create policy "Owners can view their own vendors"
on public.vendors for select
to authenticated
using ((select auth.uid()) = owner_user_id);

-- INSERT: owners can create vendors assigned to themselves
-- WITH CHECK ensures the row being inserted belongs to the authenticated user
create policy "Owners can create vendors"
on public.vendors for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

-- UPDATE: owners can update only their own vendors
-- USING: row must belong to user; WITH CHECK: updated row must still belong to user
create policy "Owners can update their own vendors"
on public.vendors for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

-- DELETE: owners can remove only their own vendors
create policy "Owners can delete their own vendors"
on public.vendors for delete
to authenticated
using ((select auth.uid()) = owner_user_id);
