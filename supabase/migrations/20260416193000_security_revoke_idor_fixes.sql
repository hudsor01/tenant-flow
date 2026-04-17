-- Security fix: REVOKE IDOR-vulnerable function grants
--
-- P0-1: record_rent_payment is SECURITY DEFINER with no auth.uid() guard.
--   It was granted to `authenticated`, allowing any user to forge rent payments
--   for arbitrary leases. Only service_role (webhook handler) should call it.
--
-- P0-2: anonymize_deleted_user(uuid) and process_account_deletions() are
--   SECURITY DEFINER with no auth.uid() guard. PostgreSQL's default GRANT to
--   PUBLIC means any authenticated user can wipe any other user's account via
--   PostgREST. Both must be service_role-only (cron/admin path).

-- P0-1: record_rent_payment — revoke from everyone, keep service_role
-- Must revoke from PUBLIC (PostgreSQL default grant) in addition to
-- authenticated, otherwise authenticated inherits via PUBLIC.
revoke execute on function public.record_rent_payment(
  text, uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric,
  text, text, text, text, text
) from public, anon, authenticated;

-- P0-2: anonymize_deleted_user — revoke from everyone, grant to service_role
revoke execute on function public.anonymize_deleted_user(uuid)
  from public, anon, authenticated;
grant execute on function public.anonymize_deleted_user(uuid)
  to service_role;

-- P0-2: process_account_deletions — revoke from everyone, grant to service_role
revoke execute on function public.process_account_deletions()
  from public, anon, authenticated;
grant execute on function public.process_account_deletions()
  to service_role;
