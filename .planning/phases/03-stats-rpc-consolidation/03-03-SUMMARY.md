# Plan 03-03 Summary — Dual-Client Stats RPC RLS Test (PERF-02, PERF-03)

**Status:** Complete
**Branch:** gsd/phase-3-stats-rpc-consolidation
**Commit:** `fe1444a3a`

## One-liner
Dual-client (ownerA/ownerB) RLS integration test pinning the `auth.uid()` identity guard on `get_unit_stats` + `get_tenant_stats` — cross-owner calls are rejected with `'Unauthorized'`, each owner's self-call returns only their own counts. Runs in the `rls-security` CI gate.

## What shipped
- `tests/integration/rls/stats-rpcs.rls.test.ts` (228 lines) — mirrors `dashboard-rpc-open-maintenance.test.ts` exactly:
  - **`beforeAll`:** dual clients via `createTestClient` + `getTestCredentials`, owner ids via `clientX.auth.getUser()`. Creates fresh owner-A fixtures (one property → one `available` unit at a known `FIXTURE_RENT` → one `active` tenant) so the self-call returns non-zero counts this test owns.
  - **`afterAll`:** FK-safe cleanup (unit → property; tenant standalone), all under ownerA.
  - **5 cases:**
    1. ownerB → `get_unit_stats(ownerA_id)` rejected: `data` null, `error` non-null, `error.message` matches `/unauthorized/i`.
    2. ownerB → `get_tenant_stats(ownerA_id)` rejected, same shape.
    3. ownerA self-call `get_unit_stats(ownerA_id)`: `error` null, `data` non-null, all aggregates are numbers, `total`/`available` >= 1, `totalActualRent` >= `FIXTURE_RENT` (>= assertions, not hard-pins — synthetic account may carry prior fixtures).
    4. ownerA self-call `get_tenant_stats(ownerA_id)`: `error` null, `data` non-null, counted by `tenants.status` (`active` fixture → `active` >= 1, `total` >= 1).
    5. ownerB self-call `get_unit_stats(ownerB_id)` succeeds (positive isolation control — proves the guard rejects only the id mismatch, not every call).

## Why `/unauthorized/i` (not `/access denied/i`)
The new stats RPCs raise the bare message `'Unauthorized'` (mirroring `get_maintenance_stats` per 03-CONTEXT.md + 03-01-SUMMARY.md), NOT the "Access denied: cannot request data for another user" message the dashboard-group RPCs use in `rpc-auth.test.ts`. The assertion is `/unauthorized/i` to match what the RPC actually raises.

## Type discipline
RPC results (`jsonb` → `Json` in the generated client) are narrowed via plain boundary casts `data as UnitStatsRaw` / `data as TenantStatsRaw` to local numeric interfaces — the same pattern the sibling `dashboard-rpc-open-maintenance.test.ts` uses (`data as { property_performance: ... }`). No `as unknown as`, no `: any`, no barrel files. The Zod-validated version of this narrowing lives in the src mappers (Plan 03-02); this test only needs the raw numeric fields.

## Verification
- **Typecheck:** `bun run typecheck` clean (`tsc --noEmit`, zero errors).
- **Acceptance criteria (all met, verified against file content):**
  - References both `get_unit_stats` and `get_tenant_stats`. ✓
  - `/unauthorized/i` asserted on `error.message` for both RPCs (2 occurrences) + `expect(data).toBeNull()` for both cross-owner cases. ✓
  - Self-call success cases assert `error` null + `data` non-null for both RPCs. ✓
  - Uses `createTestClient` + `getTestCredentials` from `../setup/supabase-client`; fixtures cleaned in `afterAll`. ✓
  - No `as unknown as` / `: any`. ✓
  - 228 lines (> 60 min). ✓
- **Local integration run: DEFERRED to CI.** The targeted local run (`bun run test:integration -- tests/integration/rls/stats-rpcs.rls.test.ts`) failed at `globalSetup` with "E2E owner credentials missing" — the synthetic `E2E_OWNER_*` accounts are GitHub repo secrets provided to the `rls-security` CI job, not present in this local environment (and `.env.local` is sandbox-blocked from reads). This is the documented condition (the sibling test's own header notes: "CI provides the env vars via repo secrets; local runs require `.env.local`"). The test is structurally identical to the passing sibling RLS tests; the `rls-security` CI gate (which fails hard when secrets are missing, per CLAUDE.md) is the authoritative live run. Respected the ~45 sign-ins/min auth limit — single attempt, no back-to-back reruns.

## Deviations from Plan
None — plan executed as written. The test file already existed untracked in the working tree (authored to spec earlier, never committed); it matched the plan's acceptance criteria exactly, so it was verified-as-correct and committed without modification rather than rewritten.

## Threat coverage
Pins T-03-06 (Information Disclosure / Elevation of Privilege — cross-owner stats read): the test IS the regression proof for the T-03-01 guard. A future refactor dropping the `auth.uid() != p_user_id` guard fails the `rls-security` CI gate with another owner's aggregates leaking (non-null cross-owner data). T-03-07 (false-green via silent skip) is bounded by the CI job failing hard when the required secrets are absent.

## Self-Check: PASSED
- File exists: `tests/integration/rls/stats-rpcs.rls.test.ts` (committed in `fe1444a3a`). ✓
- Commit exists: `fe1444a3a` on `gsd/phase-3-stats-rpc-consolidation`. ✓
- Typecheck + full lefthook gate (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint) all passed at commit time. ✓
