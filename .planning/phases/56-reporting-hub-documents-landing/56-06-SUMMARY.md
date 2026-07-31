---
phase: 56
plan: 06
subsystem: reporting-hub
tags: [e2e, playwright, owner-axe, rpthub-04, d-25, d-31, gate-not-yet-satisfied]
requires:
  - loginAsOwner
  - "ROUTES.REPORTS_* constants (56-05)"
  - "REPORTS_HUB_GROUPS (56-01/56-03)"
provides:
  - "9-test reports-hub spec registered in the owner-axe project CI actually runs"
  - "chromium exclusion so the spec does not double-execute"
affects:
  - tests/e2e/tests/reports-hub.spec.ts
  - tests/e2e/playwright.config.ts
tech-stack:
  added: []
  patterns:
    - "root-level spec placement + explicit owner-axe allowlist entry, because owner/ placement gates nothing in this repo's CI"
key-files:
  created:
    - tests/e2e/tests/reports-hub.spec.ts
  modified:
    - tests/e2e/playwright.config.ts
  deleted: []
decisions:
  - "The spec is AUTHORED, REGISTERED and LISTED but has NEVER EXECUTED. RPTHUB-04 is NOT yet satisfied and 56-07 must not start on this plan's completion alone."
  - "Declined to run `playwright test` locally: the webServer command contains `rm -f .env.local` (playwright.config.ts:284-286), which would destroy an unrecoverable gitignored file. The run would have failed at the first beforeEach anyway — no E2E owner credentials exist locally."
  - "Task 1's `grep -c storageState == 0` criterion conflicted with the plan's own mandated header wording; resolved by 56-03's precedent — reword so the grep stays trustworthy, lose no information."
metrics:
  duration: ~25 min
  completed: 2026-07-31
---

# Phase 56 Plan 06: Reports Hub E2E Gate Summary

A 9-test spec covering all 8 `/reports` hub routes is registered in the `owner-axe` Playwright
project — one of the three projects CI's `e2e-smoke` job actually invokes — and excluded from the
non-CI `chromium` project so it cannot double-execute.

---

## READ THIS FIRST — THE GATE IS NOT YET SATISFIED

**The spec has never run. It is authored and registered but has NOT been observed passing against a
live app.** No test in `reports-hub.spec.ts` has executed against a browser, a server, or an
authenticated session, in this session or any prior one.

What that means concretely, in the terms this phase cares about:

- The spec **does not currently prove** that the 8 hub routes render for an authenticated owner.
- **RPTHUB-04 is therefore NOT satisfied by the completion of this plan.**
- **Plan 56-07 must not delete `src/app/(owner)/financials/` on the strength of this plan alone.**
  D-11's ordering — *prove the hub, then remove the legacy tree* — is not met until CI's `e2e-smoke`
  job reports these 9 tests passing. Treating "56-06 is done" as "the gate is green" is precisely
  the failure mode RPTHUB-04 exists to prevent.

The plan anticipated this outcome. Task 2's fourth acceptance criterion reads: *"...OR the summary
records that CI's `e2e-smoke` job is the verification source"*. **That is the branch taken.** But
there is no CI run to link either — see "Why it could not be run" below.

### What was verified instead (all quoted from command output this session)

| Claim | Evidence | Proves |
|---|---|---|
| The spec is picked up by `owner-axe` | `--project=owner-axe --list` → 9 `Reports hub routes` entries, `Total: 22 tests in 4 files` (was `13 tests in 3 files`, 0 matches) | registration works |
| It runs under CI's exact invocation | `--project=smoke --project=public --project=owner-axe --list` → 9 matches, `Total: 89 tests in 9 files` | it will be executed by `e2e-smoke` |
| It does not double-execute | `--project=chromium --list` → **0** matches, `Total: 22 tests in 8 files` (was `31 tests in 9 files`, 9 matches) | the exclusion works |
| The spec compiles under full strict TS | `bun run typecheck` exit 0 | no type errors |
| It is lint-clean | `bun run lint` exit 0 — "Checked 1377 files in 165ms. No fixes applied." | style conformance |
| The 8 target routes are real compiled routes | all 8 `/(owner)/reports/**/page` keys PRESENT in `.next/server/app-paths-manifest.json` | the paths resolve in a Next.js build |
| The 8 expected `<h1>` strings are the ones in source | read at `page.tsx:32`, `income-statement-page-header.tsx:29`, `cash-flow-header.tsx:28`, `balance-sheet/page.tsx:159`, `expenses/page.tsx:140`, `tax-documents/page.tsx:70`+`:105`, `generate/page.tsx:120`, `year-end/page.tsx:174` | the assertions target real text |
| 56-03's zero-charts purity guard still passes | `bun run test:unit -- ".../reports-hub-purity.test.ts"` → **31 passed (31)**, exit 0 | D-34 intact |
| No production source changed | `git status --porcelain 'src/'` → empty | this plan is tests-only |
| The legacy tree is live and untouched | `git status --porcelain 'src/app/(owner)/financials/'` → empty; 6 `page.tsx` files still on disk | RPTHUB-04's required pre-deletion state |

**None of the above is a substitute for running the spec.** A listing proves the file is *selected*;
it says nothing about whether `loginAsOwner` succeeds, whether the proxy admits the session, or
whether any `<h1>` actually renders. The build manifest proves the routes *compile*, not that they
render authenticated — 56-05 made the same distinction and it holds here.

### Why it could not be run — two independent blockers

**1. Running it would destroy `.env.local` (hard stop, deliberate refusal).**

`tests/e2e/playwright.config.ts:284-286`, the `webServer` command, in BOTH branches:

```
rm -rf .next && rm -f .env.local && bash -c "... npx next dev --turbopack --port 3050"
```

`.env.local` is gitignored and unrecoverable. The execution directive forbids modifying it; deleting
it is the maximal form of that. Nothing on port 3050 was listening
(`reuseExistingServer` would not have applied), so the command *would* have run. **I did not run
`playwright test`.** The `--list` invocations are safe and were proven so empirically: `.env.local`
stat is byte-identical before and after all four listings (`1204 1784342884 50572079` → unchanged,
same inode).

**2. The run would have failed at the first `beforeEach` regardless — no credentials exist here.**

| Requirement | State |
|---|---|
| `tests/e2e/.env.test` | **ABSENT** — `dotenv.config()` at `playwright.config.ts:24` loads nothing |
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` | absent from the shell env (`env \| grep -c '^E2E_OWNER'` → **0**) and absent from `.env.local` (checked by key name only, values never read) |
| `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` | absent → config falls back to `http://127.0.0.1:54321` |
| Local Supabase on :54321 | **nothing listening** |

`loginAsOwner` throws unconditionally at `tests/e2e/auth-helpers.ts:277-279`
(*"E2E_OWNER_PASSWORD environment variable is required"*) before any navigation. Those four values
are GitHub Actions secrets, supplied only to the `e2e-smoke` job. With `maxFailures: 1` the run
would abort on the first test.

**3. There is no CI run to cite either.** The branch `gsd/phase-56-reporting-hub-documents-landing`
has **no upstream** (`git rev-parse --abbrev-ref @{u}` → *"no upstream configured"*) and
`gh pr list --head ... --state all` returns `[]`. Nothing has ever been pushed, so `e2e-smoke` has
never seen this spec.

### The one action that closes the gate

Push the branch, open the PR, and confirm the `e2e-smoke` check reports **9 passing
`Reports hub routes` tests**. Only then may 56-07 delete `src/app/(owner)/financials/`.

---

## What Was Built

| Task | Artifact | Commit |
|------|----------|--------|
| 1 | `tests/e2e/tests/reports-hub.spec.ts` (123 lines, 9 tests) | `19a3e8453` |
| 2 | `tests/e2e/playwright.config.ts` — `owner-axe` testMatch + `chromium` testIgnore | `e3e63f8aa` |

### Task 1 — the spec

One `test.describe` — `Reports hub routes (Phase 56 — RPTHUB-04)` — with a single
`test.beforeEach` calling `loginAsOwner(page)`, at the **root** of `tests/e2e/tests/`
(`dirname` is `tests/e2e/tests` exactly, not `.../owner`).

Eight route tests generated from a `hubRoutes` array of exactly 8 entries, each doing three things
and nothing more:

1. `page.goto(path)`
2. `expect(currentUrl).not.toContain("/login")` and `expect(currentUrl).toContain(path)` — the
   authenticated-render assertion, since the proxy sends unauthenticated `/reports` traffic to
   `/login`
3. `expect(pageHeading(page, heading)).toBeVisible({ timeout: 15000 })`

A ninth test pins D-31 on the index: `Statements` and `Exports` present as level-2 headings, and
**zero** headings named `Analytics`. All three assertions are scoped to `main#main-content` so the
sidebar's own live `Analytics` nav entry — a peer section this phase deliberately leaves alone —
can neither satisfy nor defeat them.

`pageHeading()` applies `.first()`. `tax-documents/page.tsx` declares an `<h1>` in *both* its error
branch (`:70`) and its loaded branch (`:105`); only one renders at a time, but `.first()` removes
the strict-mode ambiguity outright — 56-05's handover note called for exactly this.

Deliberately absent, per the plan: no second per-page test, no table assertions, no `$`-amount
assertions, no summary-strip figure assertions. An owner fixture with no ledger data legitimately
renders `$0.00`, and with `maxFailures: 1` one flaky value assertion aborts the whole `e2e-smoke`
job.

An inline comment records — **verified from source, not assumed** — that the `Export` controls in
the income-statement (`income-statement-page-header.tsx:59`, a `<Button variant="outline">`) and
cash-flow (`cash-flow-header.tsx:58`, a raw `<button>`) headers carry **no click handler**. Both
were read this session and neither has an `onClick`. They must never be clicked or asserted as
functional — a pre-existing defect copied verbatim from the legacy tree, not this phase's to repair.

### Task 2 — the registration

Two entries, `"**/reports-hub.spec.ts"`, appended to the `owner-axe` `testMatch` allowlist (with a
comment in the Phase 52 style, plus a note that the project is a filename allowlist rather than a
glob, so dropping the entry silently removes the gate) and to the `chromium` `testIgnore` array
alongside the existing `notifications.spec.ts` entry.

`git diff tests/e2e/playwright.config.ts` is exactly `+8 -0` across two hunks. `maxFailures`,
`retries`, `workers`, `timeout`, `webServer` and every other project are untouched, and no project
was added to CI.

**The `owner-axe` project is the one that matters.** `.github/workflows/ci-cd.yml` runs:

```
bunx playwright test --config tests/e2e/playwright.config.ts --project=smoke --project=public --project=owner-axe
```

The `owner` project is never invoked, which is why `owner/owner-financials.e2e.spec.ts` and
`owner/reports-gate.spec.ts` gate nothing today (D-25). **Measured, not assumed:** before
registration the new spec ran under `chromium` (9 tests) and not at all under `owner-axe` (0) — i.e.
placement alone would have reproduced the exact defect this plan exists to avoid.

## Acceptance Criteria NOT Met As Literally Written

Reported with evidence rather than reworded to pass.

### 1. Task 2, criterion 4 — the spec was NOT demonstrated green

Covered exhaustively above. The criterion's own alternative branch (CI as verification source) is
also unavailable, because the branch has never been pushed. **This is the plan's central criterion
and it is unmet.** Everything else below is secondary.

### 2. Task 1 — `grep -c 'storageState'` returns **0**, and getting there required overriding the
plan's own mandated wording

The plan's Task 1 action text explicitly requires the header comment to say *"authentication is
performed in-test by `loginAsOwner` with NO storageState"* and *"a spec that only matched the
storageState `chromium` project would pass locally"*. Writing that verbatim produced
`grep -c 'storageState'` = **2**, against an acceptance criterion demanding **0**. The two
instructions cannot both hold — the same class of internal conflict 56-03 reported three times.

Resolved by 56-03's established precedent (its Deviation #1: *"a file that documents a
grep-checkable ban by containing the banned token defeats the grep"*): the comment was reworded to
carry the identical information without the literal token — it names the concrete artifact
(`playwright/.auth/owner.json`), names the four projects that consume it, states that this spec
consumes none of it, and records *why* the token is omitted. The criterion now returns **0** and is
a genuine check that the spec never configures per-project session state.

Note the analog the plan says to copy wholesale, `notifications.spec.ts`, contains the token twice
in its own header — so the criterion was never satisfiable by copying the analog either.

### 3. Task 1's `<verify>` command returns 0 at the end of Task 1

`--project=owner-axe -g "Reports hub routes" --list` cannot match anything until Task 2 adds the
allowlist entry. A task-ordering artifact in the plan, not a defect in the work. Both the
pre-registration and post-registration listings are recorded above instead, which is strictly more
informative — they demonstrate the registration is load-bearing rather than assuming it.

### 4. Corrected in passing: `bun run typecheck` DOES cover this file

The root `tsconfig.json` excludes `tests/**/*`, so a first reading suggests the criterion is
vacuous. It is not: the `typecheck` script runs three invocations —
`tsc --noEmit && tsc --noEmit -p tests/integration/tsconfig.json && tsc --noEmit -p tests/e2e/tsconfig.json`.
The third covers `tests/e2e/tests/**/*.ts` under the same strict flags. Verified independently by
running `bunx tsc -p tests/e2e/tsconfig.json --noEmit` before and after adding the file: exit 0 with
zero output both times.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's mandated header wording broke its own grep criterion**

- **Found during:** Task 1 acceptance-criteria run
- **Issue:** `grep -c 'storageState'` = 2 against a criterion of 0; the plan's action text mandates
  the wording that produces those 2.
- **Fix:** reworded per 56-03's precedent, preserving every fact. See criterion 2 above.
- **Files modified:** `tests/e2e/tests/reports-hub.spec.ts`
- **Commit:** `19a3e8453`

**2. [Rule 1 - Bug] A zero-width space smuggled into the header comment**

- **Found during:** Task 1, non-ASCII scan
- **Issue:** The header originally spelled the `owner` project's glob literally. A glob of that
  shape contains `*/`, which terminates a `/** */` block comment, so I had inserted an invisible
  U+200B to break the sequence. An invisible character in source is a maintenance trap, and the
  repo has a recorded history of non-ASCII corruption hazards.
- **Fix:** reworded to describe the match ("any path carrying an `owner/` segment is claimed by the
  `owner` project's testMatch glob") and removed the character. `grep -P '[^\x00-\x7F]'` now returns
  only em-dashes.
- **Files modified:** `tests/e2e/tests/reports-hub.spec.ts`
- **Commit:** `19a3e8453` (pre-commit)

### Deliberately NOT Done

**`playwright test` was not executed.** Not an oversight and not a shortcut — see the two blockers
above. The destructive `rm -f .env.local` is the decisive one; the missing credentials mean the run
would have produced no useful signal even if the destruction were acceptable.

**`requirements.mark-complete` was not run.** Per the execution directive and consistent with 56-01
through 56-05. `.planning/REQUIREMENTS.md` is unmodified — last touched by `0e6cb8878`, a planning
commit. RPTHUB-04 is an ordering guarantee and, as stated at the top of this summary, it is not yet
met.

**`tests/e2e/tests/constants/routes.ts` was not edited.** `REPORTS_ANALYTICS` still points at the
route 56-03 deleted. It remains consumer-free and belongs to 56-08's sweep (56-03 deferred item 1),
and this plan's file list does not include it.

**No production source was touched.** `git status --porcelain 'src/'` is empty across both commits,
and neither commit deletes a file (`git diff --diff-filter=D` empty for both).

## Deferred Issues

Nothing new appended to `deferred-items.md`. Two standing observations that are not this plan's to
fix, recorded here so they are not lost:

1. **`tests/e2e/playwright.config.ts:284-286` deletes `.env.local` on every local E2E run.** This
   makes local E2E execution destructive in any working copy that has one. It is intentional (the
   config wants a clean env for the test server) but it is a live footgun and there is no guard,
   warning, or backup. Any future plan that needs a local E2E run hits this first.
2. **The `owner` Playwright project still contains 12 specs that CI never runs**, including
   `owner-financials.e2e.spec.ts` — the spec this one supersedes — and `reports-gate.spec.ts`. This
   plan does not change that; 56-07/56-08 dispose of the financials one.

## Known Stubs

None in the code sense — the spec contains 9 real tests with real assertions against real route
paths and real heading strings, no placeholders, no `test.skip`, no `test.fixme`.

**But the honest framing is stronger than "no stubs":** an unrun test is not a stub, it is an
*unverified claim*. Its assertions are only as good as the first execution, which has not happened.
This is called out in full at the top of this summary rather than buried here, because a reader who
only skims the Known Stubs section would otherwise conclude the plan shipped proven coverage.

## Threat Model Disposition

| Threat | Disposition | Evidence |
|---|---|---|
| T-56-21 repudiation — spec placement and registration | **mitigated** | Placement pinned: `dirname` is `tests/e2e/tests`, not `.../owner`. Registration pinned: `grep -c 'reports-hub.spec.ts' playwright.config.ts` → **2**, and the listing under CI's exact three-project invocation enumerates all 9 tests. Measured against the counterfactual: pre-registration the spec ran under `chromium` (9) and `owner-axe` (0), so the threat was live and is now closed. |
| T-56-21b — the same threat's deeper form | **NOT mitigated** | Registration guarantees the spec will be *executed* by CI. It does not guarantee it *passes*. Until `e2e-smoke` reports green, RPTHUB-04 rests on an assertion nobody has run. Stated prominently rather than folded into the row above. |
| T-56-22 DoS — CI budget exhaustion | **mitigated by construction, UNMEASURED** | 9 tests, one `test.describe`, one shared `loginAsOwner`, h1-presence assertions only, zero data-value assertions. No runtime figure can be quoted because the spec has never run — the 15-minute `e2e-smoke` budget impact is a design argument, not a measurement. |
| T-56-23 spoofing — synthetic owner credentials | **accept** | No credential is introduced, referenced by value, or committed. The spec reads none directly; `loginAsOwner` consumes `E2E_OWNER_*` from the environment. The fixture must remain `subscription_status = 'active'` — `auth-helpers.ts:326-330` already fails loudly with an actionable message on a `/pricing` redirect. |
| T-56-24 tampering — premature legacy deletion | **NOT mitigated by this plan** | 56-07's `depends_on: ["56-06"]` makes it start after this plan *reports done*, which is not the same as the gate being green. This summary's opening section is the mitigation: it states in terms that cannot be misread that the deletion is not yet authorized. The legacy tree is verified intact (`git status --porcelain 'src/app/(owner)/financials/'` empty, 6 `page.tsx` on disk). |
| T-56-SC tampering — package installs | **n/a** | Zero package-manager commands. `bun.lock` untouched; `lockfile-verify` passed on both commits. |

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change was introduced. This
plan adds one test file and two array entries in a test config; it ships nothing to production and
`git status --porcelain 'src/'` is empty.

## Self-Check: PASSED

Created file exists on disk:

- `tests/e2e/tests/reports-hub.spec.ts` — FOUND (123 lines)

Modified file exists and carries both entries:

- `tests/e2e/playwright.config.ts` — FOUND, `grep -c 'reports-hub.spec.ts'` → **2**

Both commit hashes resolve in `git log`:

- `19a3e8453` test(56-06): add the 8-route reports hub e2e spec — 1 file, +123
- `e3e63f8aa` test(56-06): register the reports hub spec in the owner-axe ci project — 1 file, +8

`.env.local` verified unmodified: stat `1204 1784342884 50572079` identical before and after every
command run this session.

## Notes for the rest of Phase 56

- **56-07 IS BLOCKED on a CI result, not on this plan's completion.** Do not delete
  `src/app/(owner)/financials/` until `e2e-smoke` on a pushed branch reports 9 passing
  `Reports hub routes` tests. If the phase ships without that, RPTHUB-04 is a false claim in a
  claims-integrity milestone — the exact category of defect this milestone exists to eliminate.
- **When CI first runs this spec, expect the h1 assertions to be the ones that break, not the auth.**
  `loginAsOwner` is proven by `notifications.spec.ts` and `dashboard-smoke.e2e.spec.ts` under the
  same project. The heading strings were read from source but never observed in a rendered DOM;
  `/reports/year-end`'s `<h1>` in particular wraps a `<FileText>` icon alongside its text
  (`year-end/page.tsx:174-177`), so its accessible name is the assertion most exposed to a surprise.
- **Do not "fix" a red run by loosening an assertion.** A failing route test after 56-05's copy is
  real information about the copied tree, and D-11 exists to surface exactly that before deletion.
- **56-08 must not remove `reports-hub.spec.ts` from either config array.** The `owner-axe` entry is
  the gate; the `chromium` entry prevents double execution. The spec also names `/reports/*` paths
  only, so it is unaffected by 56-08's `/financials` sweep and needs no `grep -v` exclusion.
- **Local E2E execution is not available in this working copy** and cannot be made available without
  either editing `.env.local` (forbidden) or accepting its deletion (destructive). Any later plan
  that assumes a local Playwright run should plan around CI instead.
