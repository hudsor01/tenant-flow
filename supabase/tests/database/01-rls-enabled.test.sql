-- =============================================================================
-- RLS ENABLED VERIFICATION TESTS
-- =============================================================================
-- Tests that Row Level Security is enabled on all tables that contain
-- user-specific or sensitive data. This prevents accidental data exposure.
--
-- Run with: supabase test db --linked

-- Set search_path so pgTAP internal functions can find each other
set search_path to extensions, public, tests;

begin;

-- Plan: 1 test per table that should have RLS enabled (core tables)
select plan(17);

-- =============================================================================
-- CORE USER DATA TABLES - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'users'),
  'RLS should be enabled on public.users'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'property_owners'),
  'RLS should be enabled on public.property_owners'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'tenants'),
  'RLS should be enabled on public.tenants'
);

-- =============================================================================
-- PROPERTY & UNIT TABLES - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'properties'),
  'RLS should be enabled on public.properties'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'units'),
  'RLS should be enabled on public.units'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'property_images'),
  'RLS should be enabled on public.property_images'
);

-- =============================================================================
-- LEASE TABLES - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'leases'),
  'RLS should be enabled on public.leases'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'lease_tenants'),
  'RLS should be enabled on public.lease_tenants'
);

-- =============================================================================
-- FINANCIAL TABLES - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'rent_payments'),
  'RLS should be enabled on public.rent_payments'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'payment_methods'),
  'RLS should be enabled on public.payment_methods'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'payment_transactions'),
  'RLS should be enabled on public.payment_transactions'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'expenses'),
  'RLS should be enabled on public.expenses'
);

-- =============================================================================
-- MAINTENANCE & DOCUMENTS - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'maintenance_requests'),
  'RLS should be enabled on public.maintenance_requests'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'documents'),
  'RLS should be enabled on public.documents'
);

-- =============================================================================
-- USER-SCOPED TABLES - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'stripe' AND c.relname = 'subscriptions'),
  'RLS should be enabled on stripe.subscriptions'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'tenant_invitations'),
  'RLS should be enabled on public.tenant_invitations'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'notifications'),
  'RLS should be enabled on public.notifications'
);

select * from finish();
rollback;
