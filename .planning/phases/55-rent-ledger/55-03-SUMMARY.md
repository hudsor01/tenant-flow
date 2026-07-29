---
phase: 55-rent-ledger
plan: 03
subsystem: frontend
tags: [tdd, vitest, money-boundary, ledger-math, rls-tests, static-guard]

# Dependency graph
requires:
  - phase: 55-rent-ledger (plan 01)
    provides: rent_charges / rent_receipts append-only tables, leases.ledger_start_date, generate_rent_charges()
  - phase: 55-rent-ledger (plan 02)
    provides: get_lease_ledger_summary / get_lease_ledger / reverse_charge / reverse_receipt (the SQL derivation this mirrors)
provides:
  - src/lib/ledger/ledger-math.ts — GRACE_PERIOD_DAYS, deriveChargeState, isLate, computeRunningBalance (dollars)
  - rent-ledger-balance.test.ts — paid/partial/unpaid/late + grace-boundary + credit/reversal coverage
  - rent-ledger-money.test.ts — live static guard rejecting cents math on every ledger source path
  - three RLS integration suites (isolation, append-only, generation) ready to run in 55-04
affects: [55-04 apply+run gate, 55-05 hooks/mappers, 55-06 ledger UI, 55-08 collection-rate KPI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mirrored-constant drift guard: a client constant duplicating a SQL literal carries a source comment naming the SQL owner and is unit-asserted to its exact value"
    - "Static money-boundary guard: fs scan of a subsystem's source paths with comment stripping + detector self-tests (positive and negative controls)"
    - "Cent-tolerance comparison instead of rounding, so money math needs no hundredfold arithmetic at all"

key-files:
  created:
    - src/lib/ledger/ledger-math.ts
    - src/hooks/api/__tests__/rent-ledger-balance.test.ts
    - src/hooks/api/__tests__/rent-ledger-money.test.ts
    - tests/integration/rls/rent-ledger-isolation.test.ts
    - tests/integration/rls/rent-ledger-append-only.test.ts
    - tests/integration/rls/rent-ledger-generation.test.ts
    - .planning/phases/55-rent-ledger/deferred-items.md
  modified: []

key-decisions:
  - "RED and GREEN land in one commit: the pre-commit hook runs the full unit suite with coverage, so a failing-test commit is impossible without --no-verify (absolutely forbidden). RED was verified in-process before the module was written."
  - "No rounding helper that scales by a hundred: paid/late comparisons use a CENT_TOLERANCE constant and the running balance uses Number(value.toFixed(2)), so the module contains zero hundredfold arithmetic and passes its own money guard"
  - "The append-only suite asserts immutability against the SERVICE-ROLE client (the guard trigger) and separately asserts the authenticated owner's update/delete is a silent no-op (RLS exposes no policy for either op) — the honest split, since PostgREST returns no error for a zero-row update"
  - "Money-guard regexes run on comment-stripped code so a source comment restating the rule cannot self-invalidate the file it documents"

patterns-established:
  - "ledger-math.ts is the ONLY client-side ledger derivation; the DB summary RPC remains the aggregate source of truth (W3)"
  - "Every ledger source path added from here on is automatically policed by rent-ledger-money.test.ts — no opt-in required"

requirements-completed: [LEDGER-01, LEDGER-02, LEDGER-03, LEDGER-05, LEDGER-06]

# Metrics
duration: 30min
completed: 2026-07-24
---

# Phase 55 Plan 03: Ledger Derivation Math + Wave 0 Test Suites Summary

**A pure dollars-only ledger-derivation module (paid/partial/unpaid/late + running balance) mirroring the SQL summary's fixed 5-day grace under an explicit drift guard, plus the live static money-boundary guard and the three RLS integration suites the rest of the phase is verified against.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-24T17:52:00Z
- **Completed:** 2026-07-24T18:30:00Z
- **Tasks:** 3
- **Files created:** 7 (1 module, 2 unit suites, 3 RLS suites, 1 deferred-items log)

## Accomplishments

- **`src/lib/ledger/ledger-math.ts` (152 lines):** `GRACE_PERIOD_DAYS`, `isLate`, `deriveChargeState`, `computeRunningBalance`, plus the `LedgerEntry` / `ChargeState` / `LedgerEntryWithBalance` types. `GRACE_PERIOD_DAYS` carries a source comment naming its owner explicitly — the `interval '5 days'` literal in `get_lease_ledger_summary` (`20260724140200_rent_ledger_rpcs.sql`) — and states that the DB owns the aggregate summary while this copy exists only for the interactive per-row table (W3). Late is compared on the UTC calendar day to match the database's `current_date`.
- **Balance unit suite (23 tests):** asserts `GRACE_PERIOD_DAYS === 5` (T-55-12 drift guard), both grace boundaries (`due_date + 5` NOT late, `due_date + 6` late — pinned on `isLate` and on `deriveChargeState`), the partial→paid transition, overpayment, no-due-date, a credit line reducing the running balance, a reversed charge netting to zero, a reversed receipt restoring the prior balance, and float-dust tolerance at the `numeric(10,2)` scale.
- **Money-guard suite (12 tests):** recursively scans `src/lib/ledger`, `src/components/ledger`, `src/hooks/api/use-rent-ledger.ts`, `src/hooks/api/query-keys/rent-ledger-keys.ts`; missing paths are skipped so it is green in Wave 1 while still non-trivial today (it asserts `ledger-math.ts` is in the scanned set). It rejects `formatCents(`, `\*\s*100` and `/\s*100` on comment-stripped code, and self-tests the detector with six positive controls (spaced and unspaced) plus comment/legitimate-math negative controls.
- **Three RLS integration suites (20 tests, deferred run):** owner isolation (owner-scoped SELECT, cross-owner INSERT refused with 42501 on both tables, read RPCs denying another owner's lease), append-only immutability (service-role UPDATE/DELETE raising `0A000` on both tables, owner ops changing nothing, `reverse_charge` netting the balance to zero with exact paired negations, double-reversal no-op, `reverse_receipt` exact negation), and generation (untracked lease yields nothing, one `rent` charge per tracked month at the exact dollar `rent_amount` with `due_date = period_start`, idempotent re-runs, generator not callable by `authenticated`).

## Task Commits

Each task was committed atomically:

1. **Task 1: RED→GREEN ledger-math module + balance unit test** - `f579f2d9e` (feat)
2. **Task 2: Money-boundary static guard test** - `ee02f0a5c` (test)
3. **Task 3: RLS integration scaffolds (isolation, append-only, generation)** - `ae9e687f3` (test)

## Files Created/Modified

- `src/lib/ledger/ledger-math.ts` - Pure derivation module. Dollars end to end; no cents math of any kind (paid/late use a `CENT_TOLERANCE` constant, the running balance uses `Number(value.toFixed(2))`).
- `src/hooks/api/__tests__/rent-ledger-balance.test.ts` - 23 cases covering the derived-state table, both grace boundaries, credits, and reversals.
- `src/hooks/api/__tests__/rent-ledger-money.test.ts` - Live static guard over the ledger source paths + detector self-tests.
- `tests/integration/rls/rent-ledger-isolation.test.ts` - T-55-01/T-55-02 dual-client owner isolation, table and RPC paths.
- `tests/integration/rls/rent-ledger-append-only.test.ts` - T-55-03/T-55-08 immutability + reversal netting.
- `tests/integration/rls/rent-ledger-generation.test.ts` - LEDGER-01/04, T-55-05/T-55-06 amount exactness, coverage predicate, idempotency, privilege boundary.
- `.planning/phases/55-rent-ledger/deferred-items.md` - One out-of-scope discovery (see below).

## Decisions Made

- **RED and GREEN in one commit.** The lefthook pre-commit hook runs `bun run test:unit --coverage`, so a RED commit is impossible without `--no-verify`, which is never permitted. RED was verified in-process first: `Failed to resolve import "#lib/ledger/ledger-math"` — the module genuinely did not exist when the test was authored and run. GREEN followed (23/23).
- **No `Math.round(x * 100) / 100`.** The obvious cent-rounding idiom is exactly the token the money guard forbids. `deriveChargeState`/`isLate` compare against a named `CENT_TOLERANCE = 0.005` (half a cent on a `numeric(10,2)` scale) and `computeRunningBalance` normalizes with `Number(value.toFixed(2))`. The module therefore passes its own guard with no exemption.
- **Immutability asserted where it is actually enforced.** RLS grants owners SELECT + INSERT only, so an owner's UPDATE/DELETE matches zero rows and PostgREST returns success — it never reaches the trigger. The suite asserts that as a no-op (amounts re-read and unchanged) and asserts the raising `0A000` guard against the service-role client, which is the writer RLS does not constrain (RESEARCH Pitfall 3).
- **`.rejects.toMatchObject` on a re-thrown PostgrestError.** PostgREST reports failures in the `{ data, error }` shape rather than throwing, so a small `raises()` helper re-throws the error (preserving `code`) and the assertions use `.rejects.toMatchObject({ message: expect.stringContaining("append-only"), code: "0A000" })` — the chai-6-safe form, never `.rejects.toThrow('string')`.
- **Generation asserted per-lease, not by the RPC's return count.** `generate_rent_charges()` is global and the daily cron may run concurrently, so idempotency is proven by comparing the fixture lease's charge-row ids before and after re-runs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's verify commands use a double `--run` flag**
- **Found during:** Task 1
- **Issue:** `bun run test:unit -- --run <file>` crashes — the `test:unit` script already injects `--run`, and CAC rejects the duplicate (`Expected a single value for option "--run"`). This is the known repo gotcha recorded in MEMORY.md.
- **Fix:** Ran the documented form `bun run test:unit -- <file>` for both unit suites. No file changes; the verification itself was performed exactly as intended.
- **Files modified:** none
- **Commit:** n/a (invocation only)

**2. [Rule 2 - Missing critical coverage] Added a privilege-boundary case to the generation suite**
- **Found during:** Task 3
- **Issue:** The plan's generation suite specified only idempotency, amount exactness and the coverage predicate. RESEARCH's Security Domain names "end user calling the generator to fabricate charges" as a threat, and 55-01 revoked EXECUTE from `authenticated` specifically to stop it — but nothing asserted the revoke.
- **Fix:** Added a case asserting `clientA.rpc('generate_rent_charges')` fails with a code in `REVOKED_CODES`.
- **Files modified:** `tests/integration/rls/rent-ledger-generation.test.ts`
- **Commit:** `ae9e687f3`

**3. [Rule 2 - Missing critical coverage] Added cross-owner RPC read denial to the isolation suite**
- **Found during:** Task 3
- **Issue:** The plan specified table-level isolation only. SECURITY DEFINER bypasses RLS, so the read RPCs are a second, independent disclosure path (T-55-01) — the 42501 ownership guard in 55-02 had no test.
- **Fix:** Added a case asserting owner B's `get_lease_ledger_summary` and `get_lease_ledger` calls on owner A's lease both return code `42501` with null data.
- **Files modified:** `tests/integration/rls/rent-ledger-isolation.test.ts`
- **Commit:** `ae9e687f3`

### Out-of-scope discovery (logged, NOT fixed)

**The append-only guard trigger also blocks `ON DELETE CASCADE`** — logged to `.planning/phases/55-rent-ledger/deferred-items.md` (D1). `rent_ledger_append_only()` raises on every DELETE including the cascade from `leases` / `users`, so a lease with ledger history cannot be deleted. Belongs to 55-01's schema; 55-03 is a TypeScript + tests plan and relaxing an immutability guarantee is a schema decision for 55-04 to surface. The RLS suites are written to tolerate it (best-effort teardown, id-scoped assertions).

## Issues Encountered

- None blocking. The double-`--run` invocation error was the only friction (deviation 1).

## Verification

- `bun run test:unit -- src/hooks/api/__tests__/rent-ledger-balance.test.ts` → 23/23 pass.
- `bun run test:unit -- src/hooks/api/__tests__/rent-ledger-money.test.ts` → 12/12 pass.
- **Money-guard negative control:** a throwaway `src/lib/ledger/__guard-probe.ts` containing unspaced `amount*100` made the guard FAIL (`src/lib/ledger/__guard-probe.ts has no hundredfold scaling or cents formatting`); the probe was deleted immediately and the suite returned to green. The guard is proven live, not merely green-by-emptiness.
- **RED evidence (Task 1):** before `ledger-math.ts` existed, the balance suite failed with `Failed to resolve import "#lib/ledger/ledger-math" from "src/hooks/api/__tests__/rent-ledger-balance.test.ts"`.
- **RLS scaffolds:** collected under a throwaway node-environment config with no credentials — `Test Files 3 skipped (3) · Tests 20 skipped (20)`, zero network calls. The throwaway config was deleted. Task 3's plan gate prints `NO_TYPE_ERRORS_IN_RLS_SCAFFOLDS` (note: `tsconfig.json` excludes `tests/**`, so the gate is structural; biome lints the files and reports clean).
- `bun run typecheck` clean; `bun run lint` clean (1321 files, 1 pre-existing info); full `bun run test:unit` → **295 files / 107312 tests passed**.
- Every commit passed the full lefthook pre-commit chain (gitleaks, lockfile-verify, lint, typecheck, unit-tests with coverage) and commitlint. No `--no-verify` anywhere.
- Money boundary held: `grep -nE '\*\s*100|/\s*100|formatCents\(' src/lib/ledger/ledger-math.ts` → clean.

## TDD Gate Compliance

The plan is `type: tdd`. The RED gate was executed and evidenced (import-resolution failure above) but does **not** appear as a separate `test(...)` commit: the pre-commit hook runs the full unit suite with coverage on every commit, so committing a knowingly-failing test requires `--no-verify`, which is prohibited without exception in this repo. RED and GREEN are therefore combined in `f579f2d9e` (`feat`). Tasks 2 and 3 are non-TDD (`type: auto`) and landed as `test(...)` commits.

## Known Stubs

None. `ledger-math.ts` is complete and fully exercised; the RLS suites are complete and deliberately deferred (their run is Plan 55-04's gate, which needs the migrations applied and `bun run db:types` regenerated).

## Threat Flags

None. This plan adds no network endpoint, auth path, file access pattern, or schema change. The only new trust-boundary surface is test-harness credential handling, which is env-provided and skip-guarded (T-55-13, accepted).

## User Setup Required

None. The RLS suites need `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the four synthetic owner credentials when 55-04 runs them; without those they skip cleanly.

## Next Phase Readiness

- Wave 0 is complete: every behavior the rest of Phase 55 must prove now has an automated assertion authored ahead of it.
- **55-04 (blocking gate)** must: apply the four migrations via MCP `apply_migration`, reconcile filenames to prod-assigned timestamps via `list_migrations`, run `bun run db:types`, then run the three suites (`bun run test:integration -- rent-ledger-isolation|rent-ledger-append-only|rent-ledger-generation`). It should also evaluate deferred item D1 (cascade delete vs. the append-only trigger).
- **55-05/55-06** consume `ledger-math.ts` for the per-row table and inherit the money guard automatically the moment `src/hooks/api/use-rent-ledger.ts`, `rent-ledger-keys.ts`, or `src/components/ledger/` appear.

## Self-Check: PASSED

- FOUND: src/lib/ledger/ledger-math.ts
- FOUND: src/hooks/api/__tests__/rent-ledger-balance.test.ts
- FOUND: src/hooks/api/__tests__/rent-ledger-money.test.ts
- FOUND: tests/integration/rls/rent-ledger-isolation.test.ts
- FOUND: tests/integration/rls/rent-ledger-append-only.test.ts
- FOUND: tests/integration/rls/rent-ledger-generation.test.ts
- FOUND: .planning/phases/55-rent-ledger/deferred-items.md
- FOUND commit: f579f2d9e
- FOUND commit: ee02f0a5c
- FOUND commit: ae9e687f3

---
*Phase: 55-rent-ledger*
*Completed: 2026-07-24*
