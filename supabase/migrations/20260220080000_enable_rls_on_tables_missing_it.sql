-- =============================================================================
-- Migration: Enable RLS on tables flagged by Supabase Security Advisor
-- Created: 2026-02-20
-- Purpose: Seven tables have policies defined but RLS itself was not enabled,
--          leaving them fully open to any authenticated PostgREST request.
--          This migration enables (and forces) RLS on each table.
--          Policies for all seven tables already exist from prior migrations;
--          this is purely a safety-net to activate them.
-- Affected tables:
--   public.rent_payments
--   public.lease_tenants
--   public.maintenance_requests
--   public.notifications
--   public.payment_transactions
--   public.security_events
--   public.leases
-- =============================================================================

-- rent_payments: tenants + owners access their own payment records
alter table public.rent_payments enable row level security;
alter table public.rent_payments force row level security;

-- lease_tenants: join table linking leases to tenants; owner + tenant access
alter table public.lease_tenants enable row level security;
alter table public.lease_tenants force row level security;

-- maintenance_requests: tenants create, owners manage
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_requests force row level security;

-- notifications: users see only their own notifications
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

-- payment_transactions: select for involved parties, mutations service_role only
alter table public.payment_transactions enable row level security;
alter table public.payment_transactions force row level security;

-- security_events: admin read-all, users read own, inserts service_role only
alter table public.security_events enable row level security;
alter table public.security_events force row level security;

-- leases: owners manage, tenants read leases they are party to
alter table public.leases enable row level security;
alter table public.leases force row level security;
