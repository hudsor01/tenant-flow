-- ============================================================================
-- CLEANUP TEST USERS - Keep only production accounts
-- ============================================================================
-- This migration removes all test users except:
-- 1. rhudsontspr@gmail.com (primary Google OAuth account)
-- 2. therhudsonsr@gmail.com (secondary Google OAuth account)
--
-- Total users to delete: 83 out of 85
-- ============================================================================

\echo '=== BEFORE CLEANUP ==='
SELECT
  count(*) as total_users,
  count(*) FILTER (WHERE raw_app_meta_data->>'provider' = 'google') as google_users,
  count(*) FILTER (WHERE raw_app_meta_data->>'provider' = 'email') as email_users
FROM auth.users;

\echo ''
\echo '=== USERS TO KEEP ==='
SELECT
  id,
  email,
  raw_app_meta_data->>'provider' as provider,
  created_at
FROM auth.users
WHERE email IN ('rhudsontspr@gmail.com', 'therhudsonsr@gmail.com')
ORDER BY email;

\echo ''
\echo '=== STEP 1: Delete from public.users ==='
-- Delete all users from public.users except the two keepers
DELETE FROM public.users
WHERE "supabaseId" NOT IN (
  SELECT id::text
  FROM auth.users
  WHERE email IN ('rhudsontspr@gmail.com', 'therhudsonsr@gmail.com')
);

\echo ''
\echo '=== STEP 2: Delete from public.profiles ==='
-- Delete all profiles except the two keepers
DELETE FROM public.profiles
WHERE id NOT IN (
  SELECT id
  FROM auth.users
  WHERE email IN ('rhudsontspr@gmail.com', 'therhudsonsr@gmail.com')
);

\echo ''
\echo '=== STEP 3: Delete from auth.identities ==='
-- Delete all OAuth identities except the two keepers
DELETE FROM auth.identities
WHERE user_id NOT IN (
  SELECT id
  FROM auth.users
  WHERE email IN ('rhudsontspr@gmail.com', 'therhudsonsr@gmail.com')
);

\echo ''
\echo '=== STEP 4: Delete from auth.sessions ==='
-- Delete all sessions except the two keepers
DELETE FROM auth.sessions
WHERE user_id NOT IN (
  SELECT id
  FROM auth.users
  WHERE email IN ('rhudsontspr@gmail.com', 'therhudsonsr@gmail.com')
);

\echo ''
\echo '=== STEP 5: Delete from auth.refresh_tokens ==='
-- Delete all refresh tokens except the two keepers
DELETE FROM auth.refresh_tokens
WHERE user_id NOT IN (
  SELECT id
  FROM auth.users
  WHERE email IN ('rhudsontspr@gmail.com', 'therhudsonsr@gmail.com')
);

\echo ''
\echo '=== STEP 6: Delete from auth.users ==='
-- Finally, delete the auth.users records
DELETE FROM auth.users
WHERE email NOT IN ('rhudsontspr@gmail.com', 'therhudsonsr@gmail.com');

\echo ''
\echo '=== AFTER CLEANUP ==='
SELECT
  count(*) as total_users,
  count(*) FILTER (WHERE raw_app_meta_data->>'provider' = 'google') as google_users,
  count(*) FILTER (WHERE raw_app_meta_data->>'provider' = 'email') as email_users
FROM auth.users;

\echo ''
\echo '=== REMAINING USERS ==='
SELECT
  au.id,
  au.email,
  au.raw_app_meta_data->>'provider' as provider,
  au.created_at,
  pu.role as public_role
FROM auth.users au
LEFT JOIN public.users pu ON au.id::text = pu."supabaseId"
ORDER BY au.email;

\echo ''
\echo '=== VERIFICATION ==='
SELECT
  'auth.users' as table_name,
  count(*) as count
FROM auth.users
UNION ALL
SELECT
  'public.users',
  count(*)
FROM public.users
UNION ALL
SELECT
  'public.profiles',
  count(*)
FROM public.profiles
UNION ALL
SELECT
  'auth.identities',
  count(*)
FROM auth.identities
UNION ALL
SELECT
  'auth.sessions',
  count(*)
FROM auth.sessions
WHERE user_id IN (SELECT id FROM auth.users)
UNION ALL
SELECT
  'auth.refresh_tokens',
  count(*)
FROM auth.refresh_tokens
WHERE user_id IN (SELECT id FROM auth.users);

\echo ''
\echo '=== CLEANUP COMPLETE ==='
