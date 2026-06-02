---
phase: 01-security-definer-classification-tightening
plan: 02
completed: 2026-06-02
requirements: [TIGHTEN-01, TIGHTEN-02, TIGHTEN-03, SECTEST-01]
status: complete
---

# Plan 01-02 Summary — atomic tighten migration + grant-pinning test

**One-liner:** Shipped one atomic prod migration (`20260602202339`) that revokes `authenticated` EXECUTE on the two no-caller functions (keeping `service_role`) and adds an `is_admin()` body gate to `audit_for_all_policies` (grant kept) — advisor `authenticated_security_definer_function_executable` confirmed **46 → 44** — and extended `anon-rpc-grants.rls.test.ts` to pin the new grant state.

## What was done

- **Migration `supabase/migrations/20260602202339_tighten_security_definer_phase1.sql`** applied to prod via MCP `apply_migration`; prod timestamp reconciled via `list_migrations`.
  - TIGHTEN-01: `get_lead_paint_compliance_report()` — revoked from authenticated (+ defensive PUBLIC), service_role retained.
  - TIGHTEN-02: `assert_can_create_lease(uuid, uuid)` — revoked from authenticated (+ defensive PUBLIC), service_role retained.
  - TIGHTEN-03: `audit_for_all_policies(text)` — `CREATE OR REPLACE` adding `public.is_admin()` as the first WHERE predicate (search_path '' preserved, FQ `pg_catalog.pg_policies` body preserved); authenticated grant kept.
- **Advisor delta confirmed live (post-apply):** `authenticated_security_definer_function_executable` **46 → 44**; both TIGHTEN functions absent from the WARN list; `audit_for_all_policies` present by design (grant kept). `rls_enabled_no_policy` unchanged at 10 (Phase 2).
- **ACL verified live** (`has_function_privilege`): both TIGHTEN fns `authn=false`/`svc=true`; `audit_for_all_policies` `authn=true` with `is_admin()` in the body; `is_admin` + `get_current_owner_user_id` (KEEP helpers) `authn=true` — untouched.
- **`anon-rpc-grants.rls.test.ts`** extended: `TIGHTENED_FROM_AUTHENTICATED` array + describe block (both tightened fns return a REVOKED_CODES error from authenticated); positive `get_current_owner_user_id` reachability; non-admin `audit_for_all_policies` 0-row leak-closure pin. **`for-all-audit.test.ts`** annotated (semantics now admin-gated; assertions unchanged).
- **CYCLE-2.md** placeholders filled (migration filename, advisor delta, verification grid all confirmed).

## Deviation from plan (important)

**The plan assumed `authenticated` had EXECUTE via the inherited PUBLIC grant** (so `REVOKE FROM PUBLIC` would suffice; the plan even had a negative-grep gate forbidding `REVOKE FROM authenticated`). **Live `aclexplode(proacl)` proved otherwise:** all three functions carried a **DIRECT `authenticated` grant** (a prior migration `20251230240000`/`20251231063902` already revoked PUBLIC). So `REVOKE FROM PUBLIC` alone would have been a **no-op** and left the functions authenticated-executable — the advisor would NOT have dropped. The migration therefore uses `REVOKE FROM authenticated` (the load-bearing revoke for this ACL state) plus a defensive `REVOKE FROM PUBLIC`. This deviation was necessary for correctness and is why the work was done against the live ACL rather than applying the plan text verbatim. Advisor 46→44 confirms the revoke actually took effect.

Also: TIGHTEN-02's safety gate resolved even more cleanly than expected — `assert_can_create_lease` is orphaned (live `bulk_import_create_lease` validates inline, does not call it), so the revoke cannot affect the bulk-import invariant under any path (see 01-01-SUMMARY).

## Verification

- Migration applied via MCP (not `supabase db push`); timestamp reconciled.
- Advisor delta **46 → 44** confirmed live; 2 TIGHTEN fns absent; `audit_for_all_policies` present (by design); KEEP helpers reachable — all via live `has_function_privilege` / `get_advisors`.
- Test files biome-clean + type-clean (only a pre-existing `tsconfig` `moduleResolution` deprecation, unrelated).
- **Integration test run:** the `rls-security` suite needs `E2E_OWNER_B_*` creds present only as GitHub secrets (not in local `.env.local`), so it runs in **CI on the phase PR**, per the established project pattern. The exact grant behavior the test pins is already independently confirmed via the live MCP ACL grid above; the bulk-import invariant is logically independent of the revoke (orphaned function).

## Requirement closure

- TIGHTEN-01 ✓ · TIGHTEN-02 ✓ · TIGHTEN-03 ✓ · SECTEST-01 ✓ (test extended; CI-run).
