---
phase: 26-lease-domain-correctness
plan: 05
subsystem: database
tags: [leases, lease_tenants, trigger, security-definer, bulk-import, rls]

# Dependency graph
requires:
  - phase: 25-lease-soft-delete
    provides: the soft-delete model these leases live under (untouched here)
provides:
  - "AFTER INSERT trigger create_primary_lease_tenant on public.leases creating the primary lease_tenants join row on every create path"
  - "bulk_import_create_lease made ON CONFLICT-safe so it composes with the trigger"
  - "RLS integration test pinning the PostgREST-created lease -> primary lease_tenants row invariant + owner isolation"
affects: [LEASE tenant-delete guard, TENANT_WITH_LEASE_SELECT reads]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER AFTER INSERT trigger with SET search_path=public + ON CONFLICT DO NOTHING for idempotent join-row creation"
    - "CREATE OR REPLACE preserves ACL; re-grant kept explicit for parity"

key-files:
  created:
    - supabase/migrations/20260705003811_lease_tenants_primary_trigger.sql
    - tests/integration/rls/lease-tenants-trigger.test.ts
  modified: []

key-decisions:
  - "AFTER INSERT trigger (path-independent) rather than patching each UI create path"
  - "Both the trigger insert AND bulk_import's manual insert use ON CONFLICT (lease_id, tenant_id) DO NOTHING so the two compose collision-free within bulk_import's transaction"
  - "Trigger fn revoked from public (matches validate_document_category lockdown), no new advisor finding"

requirements-completed: [LEASE-02]

# Metrics
duration: ~30min
completed: 2026-07-04
---

# Phase 26 Plan 05: LEASE-02 Auto-create Primary lease_tenants Row

**Every lease create path (wizard, lease-form `leaseMutations.create`, and `bulk_import_create_lease`) now produces the primary `lease_tenants` join row, via an idempotent AFTER INSERT trigger — so a UI-created lease is visible on its tenant and the active-lease tenant-delete guard fires.**

## Migration (reconciled)

- **File:** `supabase/migrations/20260705003811_lease_tenants_primary_trigger.sql`
- **Prod version (list_migrations):** `20260705003811` — repo filename matches.

## What shipped

1. `public.create_primary_lease_tenant()` — `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Inserts `(new.id, new.primary_tenant_id, is_primary=true, responsibility_percentage=100)` into `lease_tenants` `ON CONFLICT (lease_id, tenant_id) DO NOTHING`, returns NEW. `REVOKE EXECUTE ... FROM public`.
2. Trigger `create_primary_lease_tenant_after_insert AFTER INSERT ON public.leases FOR EACH ROW WHEN (new.primary_tenant_id IS NOT NULL)` (idempotent `DROP TRIGGER IF EXISTS`).
3. `bulk_import_create_lease` redefined verbatim from `20260422195546_v23_fourth_audit_lease_overlap` with ONLY its `lease_tenants` insert changed to append `on conflict (lease_id, tenant_id) do nothing`. Required because the AFTER INSERT trigger fires during bulk_import's `insert into leases`, so bulk_import's own manual insert would otherwise hit a duplicate-key error.

## bulk_import ON CONFLICT confirmation

`grep -c "on conflict (lease_id, tenant_id) do nothing"` = 2 (trigger fn + bulk_import). Live `pg_get_functiondef` confirms bulk_import's `lease_tenants` insert now ends with `on conflict (lease_id, tenant_id) do nothing`.

## Grant / attribute preservation (verified via pg_proc post-apply)

- `bulk_import_create_lease`: `prosecdef=true`, `proconfig=[search_path=public]`, grants `authenticated=EXECUTE, postgres=EXECUTE` (unchanged).
- `create_primary_lease_tenant`: `prosecdef=true`, `proconfig=[search_path=public]`, grants `postgres=EXECUTE` (revoked from public — no new advisor finding).

## Rolled-back live proofs (BEGIN … RAISE → full rollback)

Ran inside a self-rolling-back DO block against prod (owner A `218000e4…`, unit `d051bf6c…`, tenant `97528f12…`):

- **(a) direct-insert lease (lease-form path)** → `lease_tenants rows=1, is_primary=t` (expect 1, true). PASS.
- **(b1) bulk_import_create_lease** returned a lease id → `lease_tenants rows=1`, no duplicate-key (trigger + ON CONFLICT compose). PASS.
- **(b2) manual same-key insert after trigger** (simulating bulk order) → `dup_err=none, rows=1`. PASS.
- **(c) NULL primary_tenant_id lease** (drop-not-null inside the rolled-back tx to exercise the WHEN guard) → `lease_tenants rows=0`. PASS.

Post-rollback verification: `primary_tenant_id is_nullable = NO` (the ALTER reverted), owner-A lease count `= 2` (unchanged). Zero test rows persisted.

Security advisors (post-apply): 0 ERROR; the 47 WARN are the pre-existing by-design `authenticated_security_definer` set + `rls_enabled_no_policy` — neither new function appears (0 references). No regression.

## Quality gates

- `bun run typecheck` — clean; `src/types/supabase.ts` unchanged (no `db:types` needed).
- `bun run lint` — exit 0 (one pre-existing biome schema-version INFO).
- `bun run test:unit` — 229 files / 101,920 tests pass.

## Files

- `supabase/migrations/20260705003811_lease_tenants_primary_trigger.sql` — trigger fn + trigger + ON CONFLICT-safe bulk_import redefine.
- `tests/integration/rls/lease-tenants-trigger.test.ts` — ownerA PostgREST-inserts a lease (non-bulk path) → asserts one primary `lease_tenants` row (trigger fired); ownerB cannot see the lease or its join row (owner isolation). Runs via `rls-security-tests.yml`.

## Deviations

- Proof (c): `leases.primary_tenant_id` is `NOT NULL`, so a NULL-primary lease is not normally insertable. Proved the trigger's WHEN guard by dropping the NOT NULL inside the rolled-back transaction (reverted on rollback) — a genuine functional proof rather than an assertion.

## Self-Check: PASSED
- Migration + test files exist; grep finds the ON CONFLICT clause twice.
- Trigger + grants verified live post-apply; all proofs rolled back; prod left exactly as found.

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-04*
