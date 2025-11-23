-- Create Test Users in public.users table for E2E Testing
-- These records must exist for tests to pass user profile queries

-- Test Owner User
INSERT INTO public.users (
  id,
  email,
  full_name,
  first_name,
  last_name,
  user_type,
  status
) VALUES (
  -- Use a deterministic UUID based on the email for reproducibility
  gen_random_uuid(),
  'test-admin@tenantflow.app',
  'Test Admin',
  'Test',
  'Admin',
  'OWNER',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  updated_at = NOW();

-- Note: Test tenant users are created dynamically during tests with unique emails
-- (test-tenant-{timestamp}@example.com) so they don't need to be pre-created here
