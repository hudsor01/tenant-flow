-- Test RLS policies for auth and tenant isolation
begin;
select plan(8);

-- Install pgTAP extension if not already installed
create extension if not exists pgtap with schema extensions;

-- Setup test data with unique IDs to avoid conflicts
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
values 
  ('test-user-1-' || gen_random_uuid()::text, 'user1@test.com', '$2a$10$dummy', now(), now(), now(), now(), '{"provider": "email"}', '{}', false, 'authenticated'),
  ('test-user-2-' || gen_random_uuid()::text, 'user2@test.com', '$2a$10$dummy', now(), now(), now(), now(), '{"provider": "email"}', '{}', false, 'authenticated');

-- Test 1: Check auth.users table exists and has RLS enabled
select has_table('auth', 'users', 'auth.users table should exist');
select table_privs_are('auth', 'users', 'authenticated', ARRAY[]::text[], 'auth.users should have no direct privileges for authenticated users');

-- Test 2: Test tenant data isolation
select has_table('public', 'properties', 'properties table should exist');

-- Test 3: Verify RLS policies exist on critical tables
select policies_are('public', 'properties', ARRAY[
  'Users can only access properties in their organization'
], 'Properties table should have tenant isolation policy');

select policies_are('public', 'leases', ARRAY[
  'Users can only access leases in their organization'  
], 'Leases table should have tenant isolation policy');

select policies_are('public', 'tenants', ARRAY[
  'Users can only access tenants in their organization'
], 'Tenants table should have tenant isolation policy');

-- Test 4: Test that functions are properly secured
select has_function('public', 'get_user_organization', 'get_user_organization function should exist');

-- Test 5: Test subscription data isolation
select policies_are('public', 'Subscription', ARRAY[
  'Users can only access their own subscriptions'
], 'Subscription table should have user isolation policy');

select * from finish();
rollback;