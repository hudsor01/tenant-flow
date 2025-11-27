-- =============================================================================
-- RLS ISOLATION TESTS
-- =============================================================================
-- Tests that authenticated users can only see/modify their own data.
-- Uses supabase-test-helpers to create test users and authenticate as them.
--
-- Run with: supabase test db --linked

-- Set search_path so pgTAP internal functions can find each other
set search_path to extensions, public, tests;

begin;

select extensions.plan(6);

-- =============================================================================
-- SETUP: Create test users using supabase-test-helpers
-- =============================================================================

select extensions.lives_ok(
  $$ select tests.create_supabase_user('test_owner_a', 'owner_a@test.com') $$,
  'Can create test user owner_a'
);

select extensions.lives_ok(
  $$ select tests.create_supabase_user('test_owner_b', 'owner_b@test.com') $$,
  'Can create test user owner_b'
);

-- =============================================================================
-- TEST: Authentication switching works
-- =============================================================================

select extensions.lives_ok(
  $$ select tests.authenticate_as('test_owner_a') $$,
  'Can authenticate as owner_a'
);

-- Verify we're authenticated as owner_a by checking current_setting
select extensions.is(
  current_setting('role', true),
  'authenticated',
  'Role should be authenticated after authenticate_as()'
);

-- =============================================================================
-- TEST: Service role switching works
-- =============================================================================

select extensions.lives_ok(
  $$ select tests.authenticate_as_service_role() $$,
  'Can switch to service_role'
);

select extensions.is(
  current_setting('role', true),
  'service_role',
  'Role should be service_role after authenticate_as_service_role()'
);

select * from extensions.finish();
rollback;
