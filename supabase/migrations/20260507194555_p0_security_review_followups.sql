-- Cycle-1 review followups for the P0 security migration applied earlier
-- in 20260507190024_lock_privileged_user_columns_and_p0_security.sql.
--
-- Cycle-1 surfaced 14 findings; the SQL-side ones are addressed here.
-- The TS-side findings (test fallback column names, `as unknown as`
-- cast, loose `.toBeTruthy()` assertion, `as never` cast on the RPC
-- call, `beforeAll` orphan sweep) ride this same PR but as code edits
-- to `tests/integration/rls/users-privileged-columns.rls.test.ts`.
--
-- ## P0-A — `users_guard_self_update` was non-functional as written
--
-- Two compounding bugs in the prior trigger:
--
--   1. `SECURITY DEFINER` made `current_user` return the function
--      owner (postgres) regardless of the calling role. The bypass
--      branch `current_user IN (...)` was unconditionally taken, so
--      `RAISE EXCEPTION` never fired. Empirically reproduced against
--      prod: with `is_admin` re-granted to `authenticated`, the
--      escalation succeeded silently.
--
--   2. The check itself was inverted: it returned NEW (allowed the
--      update) when ALL allowed columns were unchanged — exactly the
--      shape of a privileged-only write. And it raised an exception
--      when ANY allowed column changed — i.e., legitimate updates.
--      So even with the security mode fixed, the original column-list
--      logic would have blocked profile edits and allowed admin
--      escalation.
--
-- Fixed in this migration:
--   * `SECURITY INVOKER` so `current_user` is the actual session role.
--   * Allowlist-based check: project NEW and OLD into jsonb, strip the
--     allowed columns, compare the remainders. If any non-allowed
--     column changed, raise 42501. Robust against future schema
--     additions (new columns are automatically privileged unless
--     explicitly added to both this allowlist and the matching GRANT).
--
-- ## P0-B — fourth escalation path: delete-then-insert
--
-- `authenticated` had table-level INSERT and DELETE GRANTs on
-- `public.users` plus permissive `users_insert_own_record` /
-- `users_delete_own_record` policies. An attacker could
-- `DELETE FROM users WHERE id = auth.uid()` and then
-- `INSERT INTO users (id, ..., is_admin) VALUES (auth.uid(), ..., true)`.
-- Self-inflicted DoS via FK cascade — but the result is an admin
-- account. Verified zero app callers of `from('users').insert()` /
-- `.delete()` across `src/` and `supabase/functions/`. Signup uses
-- the SECURITY DEFINER trigger on `auth.users`, deletion goes through
-- `request_account_deletion()`. Safe to revoke.
--
-- ## P1-A — trigger column list missed 9 columns
--
-- The original guard explicitly named 12 privileged columns. The
-- `users` table has 9 more that aren't in the safe-update GRANT:
-- `status` (soft-delete flag), `subscription_cancel_at_period_end`,
-- `subscription_current_period_end`, `subscription_source`, and 5
-- `identity_verification_*` columns. The new allowlist-style check
-- automatically covers all of them — no enumeration drift possible.
--
-- ## P2-A, P2-B, P2-C
--
-- P2-A (redundant `coalesce(-infinity)`): gone — the new check uses
--   jsonb equality which handles NULL natively.
-- P2-B (SECURITY DEFINER unnecessary): fixed (was the root cause of
--   P0-A's first half).
-- P2-C (cargo-cult REVOKE EXECUTE on the trigger function): dropped.
--   Trigger functions aren't called via EXECUTE grants, so the line
--   conveyed a security property it didn't actually establish.

------------------------------------------------------------
-- Replace the trigger function with the corrected version
------------------------------------------------------------
-- Drop the old trigger first so we can drop+recreate the function with
-- a different SECURITY mode. CREATE OR REPLACE FUNCTION cannot change
-- security mode in older Postgres versions.
drop trigger if exists users_guard_self_update on public.users;
drop function if exists public.guard_user_self_update();

create function public.guard_user_self_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  -- Allowlist of columns the row owner may modify. MUST stay in
  -- lockstep with the column-level GRANT UPDATE on public.users.
  allowed_cols constant text[] := array[
    'first_name',
    'last_name',
    'full_name',
    'phone',
    'avatar_url',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'onboarding_status',
    'updated_at'
  ];
begin
  -- service_role / postgres / supabase_admin bypass: these are the
  -- only legitimate writers of privileged columns (Stripe webhook
  -- handlers, deletion cron, ops scripts).
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  -- Strip the allowed columns from a jsonb projection of NEW and OLD;
  -- the remainder must be byte-identical. If anything in the remainder
  -- changed, a privileged column was touched and we reject. Robust
  -- against future schema additions.
  if (to_jsonb(new) - allowed_cols) is distinct from (to_jsonb(old) - allowed_cols) then
    raise exception
      'Privileged column on public.users cannot be modified via PostgREST. Use the appropriate RPC or service-role flow.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger users_guard_self_update
  before update on public.users
  for each row
  execute function public.guard_user_self_update();

------------------------------------------------------------
-- P0-B: revoke INSERT and DELETE on public.users from authenticated
------------------------------------------------------------
-- Closes the delete-then-insert escalation path. App code does not
-- INSERT or DELETE on `public.users` from PostgREST under
-- authenticated — both flows go through SECURITY DEFINER paths
-- (the `auth.users` signup trigger, `request_account_deletion()`).
revoke insert, delete on public.users from authenticated;
