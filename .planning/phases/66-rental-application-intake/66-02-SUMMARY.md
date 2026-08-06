---
phase: 66-rental-application-intake
plan: 02
subsystem: validation
tags: [zod, deno, edge-functions, pii, fair-housing, apply-02, apply-06, copy-constants]

# Dependency graph
requires:
  - phase: 66-01
    provides: "the rental_applications column contract and the disposition_reason CHECK vocabulary these modules mirror"
provides:
  - "supabase/functions/_shared/application-guards.ts - isHoneypotTripped, isTimingSuspicious, parseSubmissionPayload, the field contract constants and MAX_FIELD_LENGTHS; zero imports, zero runtime-global references, importable from both Deno and Vitest"
  - "src/lib/validation/rental-applications.ts - strict zod schema, RentalApplicationInput, derived required/optional key sets"
  - "src/lib/applications/application-copy.ts - APPLY_DISCLAIMER, FAIR_HOUSING_NOTE, TOKEN_UNAVAILABLE_COPY, APPLICATION_STATUSES, APPLICATION_STATUS, DISPOSITION_REASONS"
  - "a bidirectional parity test that fails when either validator gains or loses a field"
affects:
  - 66-03 (submit Edge Function consumes the guards module)
  - 66-07 (the public apply form consumes the zod schema and the copy constants)
  - 66-11 (E2E assertions read APPLY_DISCLAIMER and TOKEN_UNAVAILABLE_COPY)
  - 66-12 (owner queue consumes APPLICATION_STATUS)
  - 66-13 (application detail consumes APPLICATION_STATUS and DISPOSITION_REASONS)
  - 66-15 (decline dialog consumes DISPOSITION_REASONS)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dependency-free leaf module shared between the Deno runtime and the Node test runner, as an alternative to reading edge-function source text from disk"
    - "Unknown-key rejection ahead of required-key checks, so a forbidden field produces a diagnostic rejection rather than a silent strip"
    - "Bidirectional set-equality parity test as the only link between two hand-maintained copies of one contract"
    - "Validation key sets derived from the zod shape rather than hand-listed, so they cannot drift from the schema they describe"

key-files:
  created:
    - supabase/functions/_shared/application-guards.ts
    - supabase/functions/__tests__/application-guards.test.ts
    - supabase/functions/__tests__/application-payload-parity.test.ts
    - src/lib/validation/rental-applications.ts
    - src/lib/validation/__tests__/rental-applications.test.ts
    - src/lib/applications/application-copy.ts
    - src/lib/applications/__tests__/application-copy.test.ts
  modified:
    - .gitignore

key-decisions:
  - "ParseResult.value widened to Record<string, string | number | boolean> rather than dropping `certified` from the output to preserve the plan's narrower type - hiding a contract key from the RPC is the drift class this plan exists to prevent"
  - "The Deno-side current_state check is a two-letter pattern, not USState membership; copying the 50-entry union into a zero-import module would be the duplicate constant CLAUDE.md forbids, and the asymmetry runs client-stricter-than-server"
  - "FORBIDDEN_SUBMISSION_KEYS exported from the guards module (additive to the plan's export list) so both the Deno test and the parity test pin the same D-06 list, and removing an entry fails a test"
  - "Second-reference pairing implemented per UI-SPEC A-3 Section 5 (any of the three filled requires name AND phone), which is broader than the plan's behaviour row (name without phone)"

patterns-established:
  - "Pattern 1: a shared contract written twice is safe only while a bidirectional set-equality test connects the copies; one-directional parity silently permits the drift that drops an applicant answer"
  - "Pattern 2: reject over-long input rather than slicing it - a truncated applicant answer is a silently corrupted fair-housing record, which is why sign-lease-token's slice-to-200 was deliberately not copied"

requirements-completed: [APPLY-02, APPLY-03, APPLY-06]

# Metrics
duration: 17min
completed: 2026-08-06
---

# Phase 66 Plan 02: Validation, Guards and Locked Copy Summary

**Three dependency-free modules and four test files: a Deno-side strict payload validator whose unknown-key rejection is the APPLY-02 SSN gate, a browser-side zod mirror pinned to it by a bidirectional parity test, and the APPLY-06 disclaimer plus the non-enumerating token-unavailable copy as single exported constants.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-08-06T17:25Z
- **Completed:** 2026-08-06T17:42Z
- **Tasks:** 3
- **Files created:** 7 (3 source, 4 test)
- **Files modified:** 1 (`.gitignore`)
- **Assertions:** 179 passing across the four test files

## Task Commits

1. **Task 1: the Deno-side guards and strict payload validator** - `3a92dc08e` (feat)
2. **Task 2: the browser-side zod schema and the parity guard** - `37c061e17` (feat)
3. **Task 3: locked copy constants** - `6c91bb215` (feat)

## Accomplishments

- `supabase/functions/_shared/application-guards.ts` (356 lines, 208 non-comment): zero `import` statements and zero runtime-global references, verified by grep, so the same module loads under Deno and under Vitest. Its test imports and exercises it rather than reading source text, which is the difference between this file and `premium-report-gate.test.ts`.
- **The SSN gate is a rejection, not a strip.** Unknown keys are scanned before required keys are checked, so `{ ...valid, ssn }` returns `{ ok: false, reason: "unknown_field", field: "ssn" }`. A stripping implementation would let the value cross the network and land in an Edge Function log before being discarded.
- **A second, independent layer catches the same class:** `MAX_FIELD_LENGTHS` has no entry for a non-contract key, so even if a forbidden key were added to a key set, `readString` still returns `unknown_field`. Demonstrated by mutation testing (below).
- `src/lib/validation/rental-applications.ts`: `z.object({...}).strict()`, state sourced from the existing `stateNames` map and `USState` union (zero two-letter string literals in the file), phone and email reusing `phoneSchema` / `emailSchema` from `./common` rather than new copies.
- The required/optional key sets are **derived from the schema shape** (`safeParse(undefined)` per field), not hand-listed, so the thing the parity test pins is the schema itself.
- `src/lib/applications/application-copy.ts`: all copy verified **verbatim** against 66-UI-SPEC §A-3, §A-4 and §A-7 by whitespace-normalized string comparison against the spec file, not by eye.

## Non-Vacuity Evidence

The plan called out that this project has shipped assertions that pass under both a correct and a broken implementation. Three mutations were applied to the committed guards module and the suite re-run; all three were caught, and the module was restored with `git checkout` afterwards.

| Mutation | Result |
|---|---|
| Add `"ssn"` to `SUBMISSION_OPTIONAL_KEYS` | **6 tests fail**, including `caps every string field in the contract`, `excludes ssn from both key sets`, and the parity assertion `has no optional field the browser schema lacks` |
| Remove `"pet_details"` from `SUBMISSION_OPTIONAL_KEYS` | **2 tests fail**: `has no optional field the Deno validator lacks` and `agrees on the total field count` — the drift direction a one-directional parity test would miss |
| Change unknown-key rejection to `continue` (silent strip) | **12+ tests fail**, led by `rejects an ssn key rather than stripping it` and every `never accepts a <forbidden> key` row |

The honeypot and timing guards are asserted in both directions (a constant-`false` guard fails the trip cases; a constant-`true` guard fails the clean cases), so neither can be satisfied by a stub. `TOKEN_UNAVAILABLE_COPY` is asserted to contain none of `expired` / `revoked` / `invalid` in **both** the title and the body, so reintroducing state differentiation fails here rather than in a security review.

**One assertion is a contract pin rather than a behavioural test, stated honestly:** `expect(HONEYPOT_FIELD).toBe("company_website")` cannot fail for a wrong reason, because nothing in this plan renders the form. It becomes load-bearing when plan 66-07 renders the input from this constant; if 66-07 hardcodes the name instead of importing `HONEYPOT_FIELD`, this assertion protects nothing and the E2E geometry check in UI-SPEC §E is the only remaining guard. Flagged for 66-07.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.gitignore` silently swallowed both Task 3 files**

- **Found during:** Task 3
- **Issue:** `.gitignore:282` carries `*-copy.*` (an editor/OS duplicate-artifact rule). It matches both `application-copy.ts` and `application-copy.test.ts`. `git add` refused them, and biome skips them too because `biome.json` sets `vcs.useIgnoreFile: true`. Every local check — typecheck, lint, unit tests — passed while the module was on disk and unshippable. This is exactly the "green CI, nothing shipped" failure class the phase-66-01 summary flagged for unapplied migrations.
- **Fix:** Two explicit negations after the `*-copy.*` rule, with a comment naming the failure mode. Renaming the module was rejected: the plan's `<interfaces>` block publishes `src/lib/applications/application-copy.ts` and five downstream plans import that path.
- **Files modified:** `.gitignore`
- **Commit:** `6c91bb215`

**2. [Rule 3 - Blocking] The test import specifier cannot carry a `.ts` extension**

- **Found during:** Task 1
- **Issue:** The plan's acceptance criterion requires the Vitest test to contain `from "../_shared/application-guards.ts"`. That is TS5097 (`An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled`) because `tsconfig.json#include` covers `supabase/functions/__tests__/**/*.ts`, putting the test in the root TS program. `bun run typecheck` failed.
- **Fix:** The test imports `../_shared/application-guards` without the extension; both specifiers resolve to the same file, so nothing can drift. The Deno consumer in plan 66-03 must still use the `.ts` form. Enabling `allowImportingTsExtensions` repo-wide was rejected as a global compiler change far outside this plan's blast radius. The reason is recorded in the test file header so the next reader does not "restore" the extension.
- **Files modified:** `supabase/functions/__tests__/application-guards.test.ts`
- **Commit:** `3a92dc08e`

**3. [Rule 3 - Blocking] The plan's verify command is a CLI error**

- **Found during:** Task 1
- **Issue:** `bun run test:unit -- --run <file>` fails. `package.json#scripts.test:unit` is already `vitest --run --project unit`, so the extra `--run` is a CAC duplicate-flag error.
- **Fix:** All verification used `bun run test:unit -- <file>`. Same for the plan-level `<verification>` block.

**4. [Rule 2 - Missing validation] Three unbounded inputs in the Deno validator**

- **Found during:** Task 1
- **Issue:** The plan's `MAX_FIELD_LENGTHS` list omits `desired_move_in_date`, so a 5000-character value would have been accepted into a `date` column. `occupant_count` and `employer_months` had a lower bound but no upper bound, and both land in `integer` columns — an oversized value raises a Postgres overflow *inside the submit transaction*, aborting the whole submission rather than returning a clean validation answer.
- **Fix:** `desired_move_in_date` capped at 10 with an ISO `YYYY-MM-DD` pattern; `occupant_count` capped at 50; `employer_months` capped at 1200; `current_postal_code` given a `^\d{5}(-\d{4})?$` pattern (it had a length cap but no format). Every cap is mirrored in the zod schema. A test asserts that **every** string key in the contract has a `MAX_FIELD_LENGTHS` entry, so a future field added without a cap fails.
- **Commit:** `3a92dc08e`

**5. [Rule 2 - Contract correctness] Second-reference pairing broadened**

- **Found during:** Task 1
- **Issue:** The plan's behaviour row covers only `reference_2_name` present without `reference_2_phone`. UI-SPEC §A-3 Section 5 is broader: *"if any one is filled the zod schema requires name + phone together"*. A lone `reference_2_relationship` would have passed the narrower rule and stored a relationship attached to nobody.
- **Fix:** Both validators implement the UI-SPEC rule. Tested in both directions plus the lone-relationship case.
- **Commit:** `3a92dc08e`, `37c061e17`

### Interface Deviation

**`ParseResult` value type widened.** The plan declared `{ ok: true; value: Record<string, string | number> }`, but `certified` is the boolean `true` and is a contract key. The two options were to widen the type or to drop `certified` from the returned value. Dropping it would have hidden a contract key from the RPC that consumes `p_payload` — the exact silent-omission class this plan exists to prevent — so the type is `Record<string, string | number | boolean>`. This is a superset: any consumer reading `value.first_name` is unaffected. **Plan 66-03 should type its `p_payload` variable accordingly.**

## TDD Gate Compliance

**Warning: the RED gate was observed but could not be committed separately.**

Both TDD tasks followed RED-then-GREEN in execution: the test file was written first and run against a missing module, and the failure was confirmed before any implementation existed (Task 1 at 17:27, Task 2 at 17:33). Neither RED state could be committed, because lefthook's `pre-commit` stage runs `typecheck` and `unit-tests` against the staged tree — a commit containing only a failing test fails the hook. `--no-verify` is prohibited by project policy and was not used. Each task therefore landed as a single `feat` commit containing the test and the implementation.

`git log` for this plan shows three `feat` commits and no `test(...)` commit. That is the reason. This is a structural property of the repo's hook configuration, not a shortcut, and it will recur for every `tdd="true"` task in this phase unless the pre-commit hook grows a staged-tree exemption.

## Verification

All gates run and passing:

- `bun run test:unit -- src/lib/validation/__tests__/rental-applications.test.ts src/lib/applications/__tests__/application-copy.test.ts supabase/functions/__tests__/application-guards.test.ts supabase/functions/__tests__/application-payload-parity.test.ts` — **4 files, 179 assertions, all pass**
- `bun run typecheck` — **pass** (all three projects: root, integration, e2e)
- `bun run lint` — **pass** (1343 files, no fixes applied)
- Full suite regression: `bun run test:unit` — **315 files, 106,892 tests, all pass**

Acceptance greps:

| Check | Result |
|---|---|
| `grep -c "^import" supabase/functions/_shared/application-guards.ts` | **0** |
| `grep -c "Deno\." supabase/functions/_shared/application-guards.ts` | **0** (the header prose was reworded to avoid the literal, since a comment would satisfy the grep dishonestly) |
| `grep -c "readFileSync" supabase/functions/__tests__/application-guards.test.ts` | **0** |
| `grep -c "stateNames\|USState" src/lib/validation/rental-applications.ts` | **4** |
| two-letter string literals in `rental-applications.ts` | **0** (no duplicate states constant) |
| `export * from` / `export { … } from` in `application-copy.ts` | **0** (not a barrel file) |
| `DISPOSITION_REASONS.length` | **7**, all matching `^[a-z][a-z0-9_]*$` |
| `badgeVariant === "destructive"` anywhere | **none** |

**One plan gate could not be run as written:** `bunx biome check supabase/functions/_shared/application-guards.ts supabase/functions/__tests__/application-guards.test.ts` reports *"No files were processed"* — `biome.json#files.includes` excludes `supabase/functions/**` repo-wide. The two Deno-side files are therefore unlinted and unformatted by biome, as is the pre-existing `premium-report-gate.test.ts`. They were written by hand in the repo's tab-indented style. This is a pre-existing configuration gap, not a regression, and was not "fixed" here — un-excluding `supabase/functions/**` would reformat every edge function in the repo.

## Issues Encountered

None blocking. The `.gitignore` collision (deviation 1) is the one that would have shipped silently: local typecheck, lint and tests all passed with the module on disk and untracked.

## Known Stubs

None. All three modules are complete and fully consumed by their own tests. No placeholder values, no mock data sources, no unwired components.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. All five threats in the plan's register (T-66-08, T-66-11, T-66-09, T-66-02, T-66-SC) are addressed with a named failing test each, and no new security-relevant surface was introduced.

## Next Phase Readiness

Carry-forwards for downstream plans:

- **66-03 (Edge Function):** import `../_shared/application-guards.ts` **with** the explicit `.ts` extension (Deno requires it; the Vitest test deliberately omits it). Type the validated payload as `Record<string, string | number | boolean>`. The honeypot and timing guards return a **200 with zero rows written** — the bot must not learn it was caught (UI-SPEC §A-6). Neither guard is a defence; the fail-closed bound is 66-04's DB cap.
- **66-07 (public form):** render the honeypot input's `name` from the exported `HONEYPOT_FIELD` constant rather than hardcoding `company_website`, otherwise the constant assertion in the guards test protects nothing. Optional text fields send `""`, which both validators treat as absent — do not "clean" empty strings to `undefined` in the submit path, and do not send them as `null` (only `undefined`/`null`/blank are treated as absent, but `null` is safest avoided since the RPC receives the parsed object, not the raw body). The zod schema's `current_state` accepts lowercase and normalizes to uppercase, so no input-level transform is needed.
- **66-11 (E2E):** assert the disclaimer against `APPLY_DISCLAIMER`, not a copied string. The em-dash in paragraph 2 is intentional and commented; a test that strips punctuation would hide a real edit.
- **66-12 / 66-13 / 66-15:** `APPLICATION_STATUS.rejected.label` is `"Declined"` while the DB value is `"rejected"`. Both live in one map so they cannot drift; do not add a second label lookup.
- **Any plan adding a form field:** it must be added to the zod schema, to `SUBMISSION_REQUIRED_KEYS` or `SUBMISSION_OPTIONAL_KEYS`, **and** to `MAX_FIELD_LENGTHS` (or `NUMBER_FIELDS`). Missing any one fails a named test.

No blockers.

## Self-Check: PASSED

Files:

- `supabase/functions/_shared/application-guards.ts` — FOUND
- `supabase/functions/__tests__/application-guards.test.ts` — FOUND
- `supabase/functions/__tests__/application-payload-parity.test.ts` — FOUND
- `src/lib/validation/rental-applications.ts` — FOUND
- `src/lib/validation/__tests__/rental-applications.test.ts` — FOUND
- `src/lib/applications/application-copy.ts` — FOUND
- `src/lib/applications/__tests__/application-copy.test.ts` — FOUND

Commits:

- `3a92dc08e` — FOUND in git log
- `37c061e17` — FOUND in git log
- `6c91bb215` — FOUND in git log

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-06*
