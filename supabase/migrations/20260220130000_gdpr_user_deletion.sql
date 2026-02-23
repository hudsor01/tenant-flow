-- =============================================================================
-- Migration: GDPR/CCPA User Deletion Support
-- Purpose: Add deleted_at column to users table for soft-delete and data rights
-- Affected tables: users
-- Special considerations:
--   - Soft-delete preserves data during 30-day grace period
--   - RLS updated to exclude deleted users from all queries
--   - Existing data unaffected (deleted_at defaults to NULL = active)
-- =============================================================================

-- Add deleted_at column to users table
-- NULL means active, non-NULL means soft-deleted
alter table public.users
  add column if not exists deleted_at timestamptz default null;

comment on column public.users.deleted_at is
  'GDPR soft-delete timestamp. NULL = active user. Non-null = pending hard deletion after 30-day grace period.';

-- Create index for efficient filtering of non-deleted users
create index if not exists users_deleted_at_idx
  on public.users (deleted_at)
  where deleted_at is null;

-- =============================================================================
-- Update RLS policies to exclude deleted users
-- =============================================================================

-- Drop and recreate the users SELECT policy to exclude deleted users
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Authenticated users can read their own user record" on public.users;

-- Recreate SELECT policy filtering out deleted users
create policy "Users can view their own non-deleted profile"
  on public.users
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    and deleted_at is null
  );

-- Drop and recreate UPDATE policy
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

create policy "Users can update their own non-deleted profile"
  on public.users
  for update
  to authenticated
  using (
    (select auth.uid()) = id
    and deleted_at is null
  )
  with check (
    (select auth.uid()) = id
  );
