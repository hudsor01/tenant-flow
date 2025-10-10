-- Create User table records for test accounts that exist in auth.users
-- This script manually creates User records for test users

-- First, confirm email doesn't exist
-- Test User (test@tenantflow.app)
INSERT INTO "User" (
  id,
  "supabaseId",
  email,
  "firstName",
  "lastName",
  role,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'ebe70d3d-9fea-42b2-aca9-5e451c173267',
  'test@tenantflow.app',
  'Test',
  'User',
  'OWNER',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "User" WHERE email = 'test@tenantflow.app'
);

-- Test Admin (test.admin@tenantflow.app)
INSERT INTO "User" (
  id,
  "supabaseId",
  email,
  "firstName",
  "lastName",
  role,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'b9108578-8ac8-40ec-b547-c146115f02dc',
  'test.admin@tenantflow.app',
  'Test',
  'Admin',
  'OWNER',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "User" WHERE email = 'test.admin@tenantflow.app'
);

-- Test Landlord (test.landlord@tenantflow.app)
INSERT INTO "User" (
  id,
  "supabaseId",
  email,
  "firstName",
  "lastName",
  role,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  '60fb2a02-ea2b-41a1-bba5-a4901439091d',
  'test.landlord@tenantflow.app',
  'Test',
  'Landlord',
  'OWNER',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "User" WHERE email = 'test.landlord@tenantflow.app'
);

-- Test Tenant (test.tenant@tenantflow.app)
INSERT INTO "User" (
  id,
  "supabaseId",
  email,
  "firstName",
  "lastName",
  role,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  '5067503a-0b5a-46bd-ad20-dc7918389c6e',
  'test.tenant@tenantflow.app',
  'Test',
  'Tenant',
  'OWNER',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "User" WHERE email = 'test.tenant@tenantflow.app'
);

-- Verify creation
SELECT
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  u.role,
  a.confirmed_at as auth_confirmed
FROM "User" u
LEFT JOIN auth.users a ON u."supabaseId" = a.id::text
WHERE u.email IN (
  'test@tenantflow.app',
  'test.admin@tenantflow.app',
  'test.landlord@tenantflow.app',
  'test.tenant@tenantflow.app'
);
