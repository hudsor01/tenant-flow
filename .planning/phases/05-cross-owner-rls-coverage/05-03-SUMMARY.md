---
phase: 05-cross-owner-rls-coverage
plan: 03
subsystem: testing/rls-integration
tags: [test-only, rls, sqlstate, refactor, dedup]
requires: []
provides:
  - "tests/integration/rls/_helpers/revoked-codes.ts (single source for REVOKED_CODES + DENIED_CODES)"
  - "SQLSTATE-pinned RLS/ownership rejection assertions (P0001) at the audit-named sites"
affects:
  - tests/integration/rls (rls-security CI gate)
tech-stack:
  added: []
  patterns:
    - "Shared code-set helper imported directly (no barrel) by all dup sites"
    - "Primary assertion on error.code (SQLSTATE) with message-substring kept only as defense-in-depth canary"
key-files:
  created:
    - tests/integration/rls/_helpers/revoked-codes.ts
  modified:
    - tests/integration/rls/funnel-admin-rpc.test.ts
    - tests/integration/rls/admin-rpc-grants.rls.test.ts
    - tests/integration/rls/anon-rpc-grants.rls.test.ts
    - tests/integration/rls/rls-no-policy-lockdown.rls.test.ts
    - tests/integration/rls/users-privileged-columns.rls.test.ts
    - tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts
    - tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
    - tests/integration/rls/bulk-import-create-lease.test.ts
decisions:
  - "Migrated bare-raise-exception ownership/overlap guards assert P0001 (PostgreSQL default for raise_exception with no `using errcode`), NOT 42501 — 42501 is reserved for EXECUTE-revoke/grant denials"
  - "Message-substring assertions kept as defense-in-depth semantic-change canaries alongside the new code pin (not deleted)"
  - "REVOKED_CODES and DENIED_CODES exported as two SEPARATE named consts — they are different sets (EXECUTE-revoke vs RLS row-deny)"
metrics:
  duration: ~12m
  completed: 2026-06-06
  tasks: 2
  files: 9
---

# Phase 5 Plan 03: SQLSTATE Assertions + Shared REVOKED_CODES Helper Summary

Extracted the duplicated `REVOKED_CODES` literal (and the distinct `DENIED_CODES` set) to one shared helper consumed by all 5 dup sites, and migrated the message-string RLS/ownership-rejection assertions at the audit-named sites to pin SQLSTATE `P0001` — insulating them from chai-6 / message-drift fragility while keeping the message lines as defense-in-depth canaries.

## What Was Built

### Task 1: Shared code-set helper + rewire 5 dup sites (commit `e1ed304f4`)
- Created `tests/integration/rls/_helpers/revoked-codes.ts` exporting two `readonly string[]` named consts:
  - `REVOKED_CODES = ["42501","42883","PGRST202"]` — EXECUTE-revoke set (revoked EXECUTE on a SECURITY DEFINER fn surfaces as one of these).
  - `DENIED_CODES = ["42501","PGRST301","PGRST302","PGRST116"]` — RLS row-deny / missing-table-grant set (a DIFFERENT set, used only by rls-no-policy-lockdown).
- Rewired all 5 dup sites to import directly (no barrel / no re-export index, per zero-tolerance rule #2):
  - `anon-rpc-grants.rls.test.ts` — deleted local `const REVOKED_CODES`, imports the shared const (usage at :224/:234/:257 unchanged).
  - `funnel-admin-rpc.test.ts` — inline `["42501","42883","PGRST202"]` at the canonical reference site replaced with `REVOKED_CODES`.
  - `admin-rpc-grants.rls.test.ts` — all four inline arrays replaced with `REVOKED_CODES`.
  - `users-privileged-columns.rls.test.ts` — the single 3-code inline array replaced with `REVOKED_CODES`. The 9 single-code `expect(error!.code).toBe("42501")` pins (legitimate EXECUTE-revoke / column-grant denials) were LEFT UNTOUCHED.
  - `rls-no-policy-lockdown.rls.test.ts` — deleted local `const DENIED_CODES`, imports the shared `DENIED_CODES` (the `expectDenied` helper usage unchanged).

### Task 2: Migrate message-string rejection assertions to SQLSTATE P0001 (commit `1b5148161`)
All three RPCs raise their ownership/overlap guards via bare `raise exception` (NO `using errcode`) → PostgreSQL default SQLSTATE `P0001` (raise_exception). The primary assertion is now `error.code === "P0001"`; the message-substring checks were kept as defense-in-depth semantic-change canaries.
- `dashboard-rpc-revenue-6mo.test.ts` — added `expect(error?.code).toBe("P0001")` at BOTH the A→B and B→A access-denied guard blocks (2 code pins).
- `dashboard-rpc-open-maintenance.test.ts` — added `expect(error?.code).toBe("P0001")` at the access-denied guard (1 code pin).
- `bulk-import-create-lease.test.ts` — added `expect(error!.code).toBe("P0001")` at the three ownership/overlap rejections: unit-not-yours, tenant-not-yours, overlap (3 code pins).

## Verification

| Gate | Result |
|------|--------|
| `bun run typecheck` | PASS (`tsc --noEmit`, clean) |
| `bun run lint` (biome) | PASS (No fixes applied; the `biome.json` schema-version info note is pre-existing and unrelated) |
| Inline `["42501","42883","PGRST202"]` outside helper | NONE |
| Inline `["42501","PGRST301","PGRST302","PGRST116"]` outside helper | NONE |
| All 5 sites import `./_helpers/revoked-codes` | YES (grep -L returns none) |
| P0001 code pins: revenue-6mo / open-maintenance / bulk-import | 2 / 1 / 3 |
| `42501` introduced on the bare-raise guards | NONE (forbidden — would fail against prod) |
| `.toThrow(` introduced | NONE |
| users-privileged-columns single-code `.toBe("42501")` pins | 9, untouched |
| Pre-commit lefthook gate (gitleaks, lint, typecheck, unit-tests) | PASS both commits |

Both commits passed the full lefthook gate (NEVER `--no-verify`). No integration suite was run locally (auth rate-limit ~45 sign-ins/min) — the `rls-security` CI gate is the runtime proof per the plan's execution rules; typecheck + grep gates are the local proof.

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the LOCKED decisions and the false-migration guard (P0001 not 42501 on the bare-raise guards).

## Out-of-Scope (noted per plan)

- `bulk-import-create-lease.test.ts` input-range `it.each` validation block (~:255-292) and the NULL-guard `it.each` block (~:360-391): these use message regexes against bare `raise exception` (also P0001) but are application INPUT-validation, not RLS/ownership rejections. LEFT UNCHANGED per the plan's explicit scoping.

## Known Stubs

None.

## Self-Check: PASSED

- `tests/integration/rls/_helpers/revoked-codes.ts` — FOUND
- Commit `e1ed304f4` (Task 1) — FOUND
- Commit `1b5148161` (Task 2) — FOUND
- All 8 modified test files present on branch `gsd/phase-5-cross-owner-rls-coverage`
