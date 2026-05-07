-- P1 security hardening — three SQL-only fixes from the 2026-05-07 audit.

------------------------------------------------------------
-- P1-2: revoke check_stripe_sync_status from authenticated
------------------------------------------------------------
-- Returns row counts + last-synced timestamps for stripe.subscriptions,
-- invoices, charges, customers, products, prices. No is_admin() check.
-- Granting EXECUTE to authenticated lets any user estimate the platform's
-- subscriber count + churn — useful for competitor surveillance, useless
-- for any legitimate authenticated caller. service_role retains EXECUTE
-- so admin observability tooling still works.
revoke execute on function public.check_stripe_sync_status() from public, authenticated;

------------------------------------------------------------
-- P1-6: revoke get_user_id_by_stripe_customer from authenticated
------------------------------------------------------------
-- SECURITY DEFINER function that maps a Stripe customer ID → internal
-- auth.users.id with no caller validation. If an attacker leaks/guesses
-- any stripe_customer_id (sometimes visible in third-party emails), they
-- get the platform's user UUID — which is then a primary key for chained
-- attacks (e.g., the lease-signature IDOR closed in P0-2 needed UUIDs
-- as input). The function is only called by service_role flows
-- (Stripe webhook handlers); revoking from authenticated has zero
-- behavioral impact on the app.
revoke execute on function public.get_user_id_by_stripe_customer(text) from public, authenticated;

------------------------------------------------------------
-- P1-7: drop the legacy lease-documents storage policies + bucket
------------------------------------------------------------
-- Migration `20251110160000_create_lease_documents_bucket.sql` left a
-- `Service can manage lease documents ON storage.objects FOR ALL TO
-- authenticated` policy in the migration history. The
-- `for-all-audit` migration at 20260304130000 raises an exception when
-- it sees `FOR ALL TO authenticated`, so a fresh `supabase db reset`
-- against this repo would explode mid-replay even though prod is fine
-- (the policy was manually cleaned up out-of-band).
--
-- This migration brings the repo + prod into agreement by explicitly
-- dropping the legacy policies + bucket. `IF EXISTS` keeps it safe to
-- re-run.
drop policy if exists "Service can manage lease documents" on storage.objects;
drop policy if exists "Property owners can read own lease documents" on storage.objects;
drop policy if exists "Tenants can read their lease documents" on storage.objects;

-- The bucket itself is gone in prod (verified via storage.buckets).
-- We deliberately do NOT `DELETE FROM storage.buckets` here — Supabase
-- guards `storage.buckets` with a `protect_delete()` BEFORE-DELETE
-- trigger that aborts direct deletes (`Direct deletion from storage
-- tables is not allowed. Use the Storage API instead.`). Local devs
-- doing `supabase db reset` will see an empty `lease-documents` bucket
-- with no policies attached — harmless, since the policies are what
-- actually granted access.
