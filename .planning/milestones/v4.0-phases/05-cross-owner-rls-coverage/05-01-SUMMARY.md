---
phase: 05-cross-owner-rls-coverage
plan: 01
subsystem: testing
tags: [rls, postgrest, supabase, integration-tests, owner-isolation, security]

# Dependency graph
requires:
  - phase: 03-stats-rpc-consolidation
    provides: "dual-client ownerA/ownerB harness template (stats-rpcs.rls.test.ts)"
provides:
  - "Dual-client cross-owner RLS isolation tests for reports (direct owner_user_id, S/I/U/D)"
  - "Dual-client cross-owner RLS isolation tests for document_template_definitions (direct owner_user_id, S/I/U/D)"
  - "Dual-client cross-owner RLS isolation tests for expenses (indirect via maintenance_request_id -> maintenance_requests.owner_user_id, S/I/U/D)"
  - "Regression proof in the rls-security CI gate that a future RLS refactor cannot leak reports/templates/expenses across owners"
affects: [05-02-child-table-rls, 05-03-sqlstate-helper-extract, rls-security-ci-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "False-green-proof RLS test: cross-owner read asserts 0 rows; cross-owner write asserts rejection/no-op + re-read confirms parent row survives"
    - "Indirect-owner RLS test: build the full parent chain under ownerA via the authenticated client, then assert ownerB is denied through the EXISTS-on-parent guard"

key-files:
  created:
    - tests/integration/rls/reports.rls.test.ts
    - tests/integration/rls/document-template-definitions.rls.test.ts
    - tests/integration/rls/expenses.rls.test.ts
  modified: []

key-decisions:
  - "document_template_definitions.template_key has a CHECK limiting it to 5 fixed values + UNIQUE(owner_user_id, template_key); the test uses real keys and clears leftover rows in beforeAll to avoid CHECK/UNIQUE violations on rerun"
  - "expenses fixture chain built via the authenticated ownerA client (not service-role) so the owner-insert MR policy (migration 20260506013951) is exercised end-to-end"
  - "Authoritative integration run deferred to the rls-security CI gate: .env.local secrets are sandbox-blocked locally; typecheck validated the tests compile"

patterns-established:
  - "Cross-owner denial assertion shape: SELECT -> data [] / id absent; INSERT hijack -> error not null + data null; UPDATE/DELETE -> error null + data [] + ownerA re-read shows row unchanged"
  - "Positive controls (ownerA self S/I/U/D) prove the policy rejects only the mismatch, not every call"

requirements-completed: [TEST-01]

# Metrics
duration: 18min
completed: 2026-06-06
---

# Phase 5 Plan 01: Cross-Owner RLS Coverage (TEST-01) Summary

**Three new dual-client RLS integration tests pin cross-owner isolation (S/I/U/D) for `reports` and `document_template_definitions` (direct `owner_user_id`) and `expenses` (indirect via `maintenance_request_id` -> `maintenance_requests.owner_user_id`), each asserting the DENIAL side so a broken-isolation refactor fails CI rather than silently passing.**

## Performance

- **Duration:** ~18 min
- **Tasks:** 2 of 2 completed
- **Files created:** 3
- **Files modified:** 0 (test-only plan; no schema/type/frontend changes)

## Accomplishments

- `reports.rls.test.ts` — direct-owner S/I/U/D isolation: ownerB cannot SELECT (0 rows), INSERT-hijack (error + null data via WITH CHECK), UPDATE/DELETE (data `[]` via USING + ownerA re-read confirms survival). OwnerA positive controls for every operation.
- `document-template-definitions.rls.test.ts` — same four-policy shape, honoring the `template_key` CHECK (5 valid values) and `UNIQUE(owner_user_id, template_key)` constraints; UPDATE mutates the safe `custom_fields` column rather than the unique `template_key`.
- `expenses.rls.test.ts` — indirect-owner S/I/U/D isolation built on a fresh ownerA chain (property -> unit -> tenant -> maintenance_request -> expense) created via the authenticated client; cross-owner INSERT references ownerA's MR id to pin the `expenses_insert_owner` EXISTS-on-parent guard; FK-safe child-before-parent teardown.
- All three import `createTestClient` + `getTestCredentials` from `../setup/supabase-client` (reused harness, no reinvented auth client).

## Task Commits

1. **Task 1: reports + document_template_definitions dual-client tests** - `1ddb532ef` (test)
2. **Task 2: expenses dual-client test via the maintenance_request chain** - `3a67ca52f` (test)

## Files Created/Modified

- `tests/integration/rls/reports.rls.test.ts` - Dual-client S/I/U/D cross-owner isolation for `reports` (direct `owner_user_id`).
- `tests/integration/rls/document-template-definitions.rls.test.ts` - Dual-client S/I/U/D cross-owner isolation for `document_template_definitions` (direct `owner_user_id`), constraint-aware.
- `tests/integration/rls/expenses.rls.test.ts` - Dual-client S/I/U/D cross-owner isolation for `expenses` through the indirect `maintenance_request_id` ownership path, with FK-safe chain fixtures + teardown.

## Verification

- `bun run typecheck` — clean (`tsc --noEmit`, no errors). No `any`, no `as unknown as`, no `.toThrow("string")`. Verified twice (after each task).
- Full lefthook gate passed on both commits (gitleaks, lockfile-verify, lint, typecheck, unit-tests, commitlint). No `--no-verify`.
- **Integration tests NOT run locally.** `.env.local` (carrying the `E2E_OWNER_*` secrets) is sandbox-blocked from read/grep access in this environment, and bare `vitest` did not populate `process.env` for the integration `globalSetup` (which throws when the four credentials are unset). Per the plan's execution rule, the authoritative pass is delegated to the `rls-security` CI gate, which supplies the secrets via repo secrets and fails hard if they are missing.
- **False-green guard (manual reasoning):** each cross-owner read asserts `data` is `[]` / the id is absent (would fail if SELECT leaked the row); each cross-owner write asserts rejection (INSERT) or `data []` + an ownerA re-read showing the row unchanged (would fail if UPDATE/DELETE mutated the row). A refactor that dropped any policy would flip at least one of these assertions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Constraint correctness] document_template_definitions.template_key CHECK + UNIQUE**
- **Found during:** Task 1 (schema verification against migration 20260311200000).
- **Issue:** The plan suggested inserting `template_key = rls-test-template-${Date.now()}`, but the live schema has `CHECK (template_key IN ('lease','maintenance-request','property-inspection','rental-application','tenant-notice'))` plus `UNIQUE(owner_user_id, template_key)`. The suggested value would fail the CHECK, and a fixed valid key could collide with a leftover row from a prior run (UNIQUE violation).
- **Fix:** Used real CHECK-valid keys (distinct per fixture / insert-positive / delete-positive case), cleared any pre-existing owned-key rows for ownerA in `beforeAll`, and made the UPDATE positive control mutate `custom_fields` (a safe column) instead of `template_key`.
- **Files modified:** tests/integration/rls/document-template-definitions.rls.test.ts.
- **Commit:** `1ddb532ef`.

## Threat Flags

None — test-only plan; no new network endpoints, auth paths, file access, or schema changes were introduced. The threat register's `mitigate` dispositions (T-05-01/02/03/FG) are satisfied by the assertions described above.

## Self-Check: PASSED

- tests/integration/rls/reports.rls.test.ts — FOUND
- tests/integration/rls/document-template-definitions.rls.test.ts — FOUND
- tests/integration/rls/expenses.rls.test.ts — FOUND
- Commit `1ddb532ef` — FOUND
- Commit `3a67ca52f` — FOUND
