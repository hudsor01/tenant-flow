-- =============================================================================
-- RLS ENABLED VERIFICATION TESTS
-- =============================================================================
-- Tests that Row Level Security is enabled on all tables that contain
-- user-specific or sensitive data. This prevents accidental data exposure.
--
-- Run with: supabase test db --linked
--
-- Asserts only on CURRENT product tables. The pre-pivot rent-facilitation
-- (rent_payments, payment_methods, payment_transactions), tenant-portal
-- (tenant_invitations) and property_owners tables were demolished
-- (20260418140000_demolish_rent_and_tenant_portal.sql + follow-ups); the
-- stripe.* schema is now a read-only FDW (foreign tables carry no RLS).

-- Set search_path so pgTAP internal functions can find each other
set search_path to extensions, public, tests;

begin;

-- Plan: 1 test per table that should have RLS enabled (current core tables)
select plan(15);

-- =============================================================================
-- CORE USER DATA TABLES - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'users'),
  'RLS should be enabled on public.users'
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
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'lease_signing_tokens'),
  'RLS should be enabled on public.lease_signing_tokens'
);

-- =============================================================================
-- FINANCIAL TABLES - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'expenses'),
  'RLS should be enabled on public.expenses'
);

-- =============================================================================
-- MAINTENANCE, DOCUMENTS & INSPECTIONS - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'maintenance_requests'),
  'RLS should be enabled on public.maintenance_requests'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'documents'),
  'RLS should be enabled on public.documents'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'document_categories'),
  'RLS should be enabled on public.document_categories'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'inspections'),
  'RLS should be enabled on public.inspections'
);
select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'vendors'),
  'RLS should be enabled on public.vendors'
);

-- =============================================================================
-- NOTIFICATIONS - MUST HAVE RLS
-- =============================================================================

select ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'notifications'),
  'RLS should be enabled on public.notifications'
);

select * from finish();
rollback;
