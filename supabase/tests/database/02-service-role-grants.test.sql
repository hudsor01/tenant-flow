-- =============================================================================
-- SERVICE ROLE GRANT VERIFICATION TESTS
-- =============================================================================
-- Tests that the service_role has proper CRUD permissions on all tables
-- it needs to access for webhook processing and admin operations.
--
-- This prevents the bug where service_role could READ but not WRITE
-- (like the property_owners issue where only SELECT was granted).
--
-- Run with: supabase test db --linked

-- Set search_path so pgTAP internal functions can find each other
set search_path to extensions, public, tests;

begin;

-- Plan: 4 tests per table (SELECT, INSERT, UPDATE, DELETE) for critical tables
-- 4 tests x 8 tables = 32 tests
select extensions.plan(32);

-- =============================================================================
-- PROPERTY_OWNERS - Critical for Stripe webhook processing
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.property_owners', 'SELECT'),
  'service_role should have SELECT on property_owners'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.property_owners', 'INSERT'),
  'service_role should have INSERT on property_owners'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.property_owners', 'UPDATE'),
  'service_role should have UPDATE on property_owners'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.property_owners', 'DELETE'),
  'service_role should have DELETE on property_owners'
);

-- =============================================================================
-- USERS - Core user table
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.users', 'SELECT'),
  'service_role should have SELECT on users'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.users', 'INSERT'),
  'service_role should have INSERT on users'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.users', 'UPDATE'),
  'service_role should have UPDATE on users'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.users', 'DELETE'),
  'service_role should have DELETE on users'
);

-- =============================================================================
-- RENT_PAYMENTS - Payment webhook processing
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.rent_payments', 'SELECT'),
  'service_role should have SELECT on rent_payments'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.rent_payments', 'INSERT'),
  'service_role should have INSERT on rent_payments'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.rent_payments', 'UPDATE'),
  'service_role should have UPDATE on rent_payments'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.rent_payments', 'DELETE'),
  'service_role should have DELETE on rent_payments'
);

-- =============================================================================
-- TENANTS - Tenant management
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.tenants', 'SELECT'),
  'service_role should have SELECT on tenants'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.tenants', 'INSERT'),
  'service_role should have INSERT on tenants'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.tenants', 'UPDATE'),
  'service_role should have UPDATE on tenants'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.tenants', 'DELETE'),
  'service_role should have DELETE on tenants'
);

-- =============================================================================
-- PROPERTIES - Property management
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.properties', 'SELECT'),
  'service_role should have SELECT on properties'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.properties', 'INSERT'),
  'service_role should have INSERT on properties'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.properties', 'UPDATE'),
  'service_role should have UPDATE on properties'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.properties', 'DELETE'),
  'service_role should have DELETE on properties'
);

-- =============================================================================
-- UNITS - Unit management
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.units', 'SELECT'),
  'service_role should have SELECT on units'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.units', 'INSERT'),
  'service_role should have INSERT on units'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.units', 'UPDATE'),
  'service_role should have UPDATE on units'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.units', 'DELETE'),
  'service_role should have DELETE on units'
);

-- =============================================================================
-- LEASES - Lease management
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.leases', 'SELECT'),
  'service_role should have SELECT on leases'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.leases', 'INSERT'),
  'service_role should have INSERT on leases'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.leases', 'UPDATE'),
  'service_role should have UPDATE on leases'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.leases', 'DELETE'),
  'service_role should have DELETE on leases'
);

-- =============================================================================
-- SUBSCRIPTIONS - Billing webhook processing
-- =============================================================================

select extensions.ok(
  has_table_privilege('service_role', 'public.subscriptions', 'SELECT'),
  'service_role should have SELECT on subscriptions'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.subscriptions', 'INSERT'),
  'service_role should have INSERT on subscriptions'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.subscriptions', 'UPDATE'),
  'service_role should have UPDATE on subscriptions'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.subscriptions', 'DELETE'),
  'service_role should have DELETE on subscriptions'
);

select * from extensions.finish();
rollback;
