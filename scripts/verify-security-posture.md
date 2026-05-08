# Security Posture Verification — 2026-05-07 Audit

Browser-agent prompt for the Supabase SQL editor (project `bshjmbshupiibfiewpxb`).
Validates every fix from the 2026-05-07 security audit (PRs #676 + #677 +
followups) against current prod state. Read-only — no DDL, no data mutation.

## Usage

1. Log into the Supabase dashboard.
2. Open the SQL editor for project `bshjmbshupiibfiewpxb`.
3. Paste the **entire prompt below** (everything between the `<<<` and `>>>`
   markers) into the browser agent's input.
4. Read the resulting Markdown table. Any FAIL = drift to investigate.

## When to re-run

- After any migration that touches `public.users` GRANTs or the
  `users_guard_self_update` trigger.
- After any migration that REVOKEs/GRANTs an admin RPC (especially
  `check_stripe_sync_status`, `get_user_id_by_stripe_customer`,
  `sign_lease_and_check_activation`).
- Before each release as a smoke test.
- Quarterly as a security-posture sanity check.

## Prompt

```text
<<<
You are at the Supabase SQL editor for project bshjmbshupiibfiewpxb. Run
the queries below ONE AT A TIME and collect the results into a single
verification report. Each query has a PASS condition; flag any FAIL.

This validates the 2026-05-07 security audit fixes (PRs #676 + #677). All
queries are read-only; no DDL.

──────────────────────────────────────────────────────────────────────────
QUERY 1 — public.users column-level UPDATE grants (P0-1)
──────────────────────────────────────────────────────────────────────────
SELECT array_agg(column_name ORDER BY column_name) AS update_cols
FROM information_schema.column_privileges
WHERE grantee='authenticated' AND table_schema='public'
  AND table_name='users' AND privilege_type='UPDATE';

PASS: Result is exactly these 10 columns (no more, no less):
  avatar_url, emergency_contact_name, emergency_contact_phone,
  emergency_contact_relationship, first_name, full_name, last_name,
  onboarding_status, phone, updated_at

──────────────────────────────────────────────────────────────────────────
QUERY 2 — public.users table-level grants (P0-B)
──────────────────────────────────────────────────────────────────────────
SELECT array_agg(privilege_type ORDER BY privilege_type) AS table_grants
FROM information_schema.table_privileges
WHERE grantee='authenticated' AND table_schema='public' AND table_name='users';

PASS: Exactly {SELECT}. Must NOT include INSERT, UPDATE (table-wide), or
DELETE. Note: column-level UPDATE grants are intentionally absent here —
they live in `column_privileges` and are validated by Query 1. The hardened
posture deliberately revoked the table-wide UPDATE so only the 10-column
allowlist is writable from authenticated.

──────────────────────────────────────────────────────────────────────────
QUERY 3 — guard_user_self_update trigger and security mode (P0-A)
──────────────────────────────────────────────────────────────────────────
SELECT
  t.tgname,
  CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  p.prosecdef AS is_security_definer
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgname='users_guard_self_update';

PASS: timing=BEFORE, is_security_definer=false (must be SECURITY INVOKER).
FAIL means the trigger never fires correctly — see PR #676 cycle-1 review.

──────────────────────────────────────────────────────────────────────────
QUERY 4 — sign_lease_and_check_activation EXECUTE grants (P0-2)
──────────────────────────────────────────────────────────────────────────
SELECT proname, proacl::text AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='sign_lease_and_check_activation';

PASS: ACL contains only postgres and service_role. Must NOT contain
authenticated or PUBLIC ('=X/postgres' alone).

──────────────────────────────────────────────────────────────────────────
QUERY 5 — admin RPC grants (P1-2 + P1-6 + P1-A)
──────────────────────────────────────────────────────────────────────────
SELECT proname, proacl::text AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('check_stripe_sync_status', 'get_user_id_by_stripe_customer')
ORDER BY proname;

PASS:
  check_stripe_sync_status        → {postgres=X/postgres,service_role=X/postgres}
  get_user_id_by_stripe_customer  → {postgres=X/postgres,service_role=X/postgres}
Both must include service_role and must NOT include authenticated.

──────────────────────────────────────────────────────────────────────────
QUERY 6 — property-images storage INSERT policies (P0-3)
──────────────────────────────────────────────────────────────────────────
SELECT policyname, with_check::text AS with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' AND cmd='INSERT'
  AND with_check::text ILIKE '%property-images%';

PASS: Exactly 1 row, named "Property owners can upload images", with a
WITH CHECK that joins storage.foldername(name) against properties.owner_user_id.
Must NOT contain "Authenticated users can upload property images".

──────────────────────────────────────────────────────────────────────────
QUERY 7 — legacy lease-documents storage policies (P1-7)
──────────────────────────────────────────────────────────────────────────
SELECT policyname FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND policyname IN (
    'Service can manage lease documents',
    'Property owners can read own lease documents',
    'Tenants can read their lease documents'
  );

PASS: Zero rows. All three legacy policies must be gone.

──────────────────────────────────────────────────────────────────────────
QUERY 8 — synthetic E2E owner subscription state
──────────────────────────────────────────────────────────────────────────
SELECT email, subscription_status, is_admin, stripe_customer_id IS NOT NULL AS has_stripe_id
FROM public.users
WHERE email IN ('e2e-owner-a@tenantflow.app', 'e2e-owner-b@tenantflow.app')
ORDER BY email;

PASS: Both rows show subscription_status='active', is_admin=false,
has_stripe_id=false. If subscription_status drifts to 'expired' or
'trialing', CI's e2e-smoke "Dashboard loads for owner" test will start
failing (the trial cron flips trialing→expired; active is durable).

──────────────────────────────────────────────────────────────────────────
QUERY 9 — for-all-audit drift check (P1-7 db reset replay)
──────────────────────────────────────────────────────────────────────────
SELECT count(*) AS for_all_authenticated_count
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND cmd = 'ALL'
  AND 'authenticated' = ANY(roles);

PASS: 0. Any FOR ALL TO authenticated policy in public/storage will abort
`supabase db reset` at migration 20260304130000.

──────────────────────────────────────────────────────────────────────────
QUERY 10 — most recent migrations applied (sanity check)
──────────────────────────────────────────────────────────────────────────
SELECT version, name FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 5;

PASS: The audit's four migrations must all be in the list:
  20260507210516  p1_security_review_followups
  20260507194555  p0_security_review_followups
  20260507191140  p1_security_hardening
  20260507190024  lock_privileged_user_columns_and_p0_security
(There may be newer migrations above these — that's fine.)

──────────────────────────────────────────────────────────────────────────
REPORT FORMAT
──────────────────────────────────────────────────────────────────────────
Output a single Markdown table:

| # | Check                              | Status |
|---|------------------------------------|--------|
| 1 | users column-level UPDATE grants   | PASS / FAIL: <reason> |
| 2 | users table-level grants           | PASS / FAIL: <reason> |
| 3 | guard_user_self_update SECURITY INVOKER | PASS / FAIL: <reason> |
| 4 | sign_lease_and_check_activation revoked | PASS / FAIL: <reason> |
| 5 | admin RPC grants                   | PASS / FAIL: <reason> |
| 6 | property-images INSERT policy      | PASS / FAIL: <reason> |
| 7 | legacy lease-documents policies gone | PASS / FAIL: <reason> |
| 8 | synthetic E2E owners 'active'      | PASS / FAIL: <reason> |
| 9 | for-all-audit drift                | PASS / FAIL: <reason> |
|10 | recent migrations                  | PASS / FAIL: <reason> |

If any FAIL, also output the raw query result so a human can diagnose.
Do NOT run any DDL. Do NOT modify any data. SELECT-only.
>>>
```

## Reference

- PR #676 — P0 security hardening (users column lock, sign_lease IDOR, property-images cross-owner upload, delete-then-insert escalation).
- PR #677 — P1 security hardening (auth-email-send hook secret, stripe-checkout price allowlist, IP rate-limit XFF parsing, admin RPC grants, lease-documents replay, Sentry replay PII masks).
- Original audit: 2026-05-07 (see PR descriptions for full audit context).
