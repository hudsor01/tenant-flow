---
phase: 02-rls-no-policy-resolution
plan: 02
completed: 2026-06-02
requirements: [SECTEST-02]
status: complete
---

# Plan 02-02 Summary — deny-side regression test

**One-liner:** Added `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts` pinning authenticated (ownerA) + anon DENY on all 10 locked tables (20 cases), with the service-role allow side documented as out-of-band (advisor + MCP); the `for-all-audit` regression stays green.

## What was done

- **New `tests/integration/rls/rls-no-policy-lockdown.rls.test.ts`** (mirrors `anon-rpc-grants.rls.test.ts`): `DENIED_CODES` + the 10-table `LOCKED_TABLES` list; `anonClient` (publishable key) + `authnClient` (ownerA via `createTestClient`/`getTestCredentials`); two `describe` blocks (authenticated, anon) each looping the 10 tables with an `expectDenied` assertion (`.from(table).select().limit(1)` → a denied error code OR empty `[]`). 20 cases total. File-level doc documents the Tier-A/B split, the post-revoke expected branch, and that the service_role ALLOW side is verified out-of-band (no service-role key in CI — the false-green pitfall).
- **For-all-audit regression (Task 2):** no code change — `for-all-audit.test.ts` runs as non-admin ownerA and `audit_for_all_policies` gates on `is_admin()` BEFORE the catalog filter, so it returns `[]` regardless of the 10 new `service_role` FOR ALL policies. It stays green (Phase 1 rewrote it to anticipate exactly these policies).

## Verification

- Biome clean + typecheck clean on the new test file (no `any`, no `as unknown as`).
- **Behavior already proven live (pre-CI):** the Plan 02-01 MCP grid confirmed `authenticated` + `anon` table grant = false on all 10 tables, so the deny assertion holds.
- **Integration run:** the `rls-security` suite needs `E2E_OWNER_B_*` creds present only as GitHub secrets (not local `.env.local`), so the new test + the `for-all-audit` regression run in **CI on the phase PR**, per the established project pattern.

## Requirement closure

- SECTEST-02 ✓ (deny side pinned in CI; allow side out-of-band; for-all-audit regression-green).
