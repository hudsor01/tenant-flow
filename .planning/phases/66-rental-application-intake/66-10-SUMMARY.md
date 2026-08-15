---
phase: 66-rental-application-intake
plan: 10
subsystem: testing
tags:
  [
    integration-tests,
    rls,
    vitest,
    postgrest,
    concurrency,
    retention,
    gdpr,
    fair-housing,
  ]

# Dependency graph
requires:
  - phase: 66-01
    provides: "the two tables, their SELECT/DELETE policies, and the deliberate absence of any INSERT or UPDATE policy that Group A exists to prove"
  - phase: 66-04
    provides: "the seven RPC signatures, the closed reason-code set, and the FOR UPDATE cap evaluation that the concurrency test is the only check on"
  - phase: 66-05
    provides: "anonymize_old_rental_applications() and the GDPR cascade extension"
  - phase: 66-06
    provides: "all four migrations LIVE on production, which is what makes these tests executable at all"
  - phase: 66-08
    provides: "apply-token deployed v1 ACTIVE, which the Group E deploy-gated tests post to"
provides:
  - "tests/integration/rls/rental-application-links.rls.test.ts (11 tests)"
  - "tests/integration/rls/rental-applications.rls.test.ts (28 tests)"
  - "tests/integration/rls/rental-applications-retention.test.ts (12 tests)"
  - "the first behavioural check on the FOR UPDATE cap serialization"
  - "a documented contradiction between shipped set_application_status behaviour and 66-04-SUMMARY's retention-clock claim"
affects:
  - 66-11 onward (any change to the seven RPC signatures or the two policies now fails these suites)
  - the phase verifier (three suites remain UNEXECUTED on this machine; see Blockers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Blast-radius guard before an irreversible global sweep: enumerate the rows a window would make due, skip the test when any of them were not created by the test"
    - "Schema-level column-absence assertion through PostgREST error probing, with a positive control, where information_schema is not reachable"
    - "Probe-gated skip for facts only reachable through a schema PostgREST does not expose (cron.job), rather than a fabricated assertion"

key-files:
  created:
    - tests/integration/rls/rental-application-links.rls.test.ts
    - tests/integration/rls/rental-applications.rls.test.ts
    - tests/integration/rls/rental-applications-retention.test.ts
  modified: []

key-decisions:
  - "Every negative assertion carries a positive control in the same test; an RLS negative without one passes trivially against a missing row"
  - "The lifetime cap is set directly to 249 rather than walked to by 250 real submissions - the rolling-hour cap fires at 25 first, so the loop the plan describes is unreachable, and 250 live rows on production is not a trade worth making"
  - "D4 pins ACTUAL shipped behaviour that contradicts 66-04-SUMMARY rather than asserting the summary's claim and failing; changing an applied production migration is an owner-gated apply plan's job, not a test plan's"
  - "information_schema and cron.job are unreachable from this harness; the column contract is asserted via PostgREST column probing (equivalent strength) and the cron slot is probe-gated (weaker, and stated as such)"

patterns-established:
  - "A test that invokes a global, irreversible production sweep must prove its blast radius before running, not merely restore config afterwards - try/finally protects the setting, not the rows already destroyed"
  - "When a plan's acceptance criterion asserts a behaviour the shipped code does not have, pin the shipped behaviour and escalate the contradiction; a test written to the plan would simply fail and teach nothing"

requirements-completed: [APPLY-01, APPLY-02, APPLY-03, APPLY-04, APPLY-05]

# Metrics
duration: 71min
completed: 2026-08-07
---

# Phase 66 Plan 10: RLS Integration Suites Summary

**Three suites, 51 tests, 2,713 lines: the APPLY-02 anon-write denial that exists nowhere else in the repo, the per-link caps driven by five genuinely parallel RPC calls against a link one below the ceiling, and a retention sweep whose 29 cleared PII columns are iterated rather than sampled — none of which has been executed, because this machine's `.env.local` carries no Supabase credentials.**

## Performance

- **Duration:** ~71 min
- **Tasks:** 3 of 3 authored and committed
- **Files created:** 3 (2,713 lines, 51 tests)

## Task Commits

1. **Task 1: link lifecycle and owner isolation** — `e43477cb2` (test), 518 lines, 11 tests
2. **Task 2: anon denial, caps under concurrency, conversion edges** — `b6b79322b` (test), 1,330 lines, 28 tests
3. **Task 3: retention sweep, config window, GDPR cascade** — `497c15228` (test), 865 lines, 12 tests

## BLOCKER — the three suites have never been run

`bun run test:integration` fails before any test file loads:

```
Error: globalSetup: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing
```

`.env.local` on this machine contains exactly one variable, `VERCEL_OIDC_TOKEN`. Verified this is **pre-existing and not caused by this plan** by running an untouched suite (`tests/integration/rls/gdpr-anonymize.test.ts`) — identical failure. It matches the recorded condition in project memory: `.env.local` missing app vars breaks `bun run dev` and every local integration/e2e run, and that file must never be edited.

Consequences, stated plainly rather than buried:

- **Every `<verify>` block in 66-10-PLAN.md is unsatisfied.** No suite has passed, no suite has failed, and no teardown has ever executed.
- **The teardown-completeness claim is structural, not observed.** Every `afterAll` deletes its fixtures and then **re-queries and asserts zero rows** — but that assertion has never fired. See "Teardown" below for exactly what is and is not established.
- **The concurrency result is unmeasured.** The test is written to discriminate; whether the lock actually holds is unproven by this plan.

What this plan CAN establish, and did:

| Gate                                            | Result                       |
| ----------------------------------------------- | ---------------------------- |
| `tsc --noEmit -p tests/integration/tsconfig.json` | **PASS**                     |
| `bun run typecheck` (all three tsconfigs)       | **PASS**                     |
| `bun run lint` (biome, 1,353 files)             | **PASS**, no fixes applied   |
| lefthook pre-commit on all three commits        | **PASS** (gitleaks, lockfile, lint, typecheck, unit+coverage) |

No `--no-verify` on any commit.

**Required next step:** whoever holds the Supabase credentials runs

```bash
bun run test:integration -- tests/integration/rls/rental-application-links.rls.test.ts
bun run test:integration -- tests/integration/rls/rental-applications.rls.test.ts
bun run test:integration -- tests/integration/rls/rental-applications-retention.test.ts
```

twice consecutively, and confirms `select value from public.app_config where key='applications.retention_days'` reads `730` afterwards.

Note the invocation form: the plan specifies `-- --run <file>`, but `test:integration` is already `vitest --run --project integration`, and a second `--run` is a CAC duplicate-flag error (a recorded gotcha in this project). The correct form omits it.

## The concurrency test — is it genuinely parallel?

**Yes.** `B2` builds five distinct `submission_id`s, maps them to five `submit_rental_application` calls, and dispatches all five through `Promise.all`. Each is an independent HTTPS request to PostgREST, so each lands in its own backend connection and its own transaction. They are not interleaved coroutines on one connection.

The test discriminates because of what it asserts:

- With `select ... for update` on the link row, the five queue; the winner increments 249 → 250, the other four then read 250 and return `link_capped`. One success, one row, counter +1.
- Without it, all five read `submission_count = 249`, all five pass the cap check, all five insert. Five successes, five rows, counter 254.

So `expect(succeeded).toHaveLength(1)` **plus** a row-count delta of exactly one **plus** `submission_count === 250` is a three-way assertion that no unlocked implementation can satisfy. A sequential loop cannot tell those two implementations apart at all, which is why 66-04-SUMMARY named this the one check that matters.

Honest caveats: five is a small fan-out, and PostgREST connection pooling could in principle serialize requests before they reach the lock, which would let an unlocked implementation pass by accident. That is a false-negative risk (a broken lock looks fine), never a false positive. Increasing the fan-out is the mitigation if the test ever needs strengthening; it was kept at five to bound the production write footprint.

## Which negatives have positive controls

Every one. Listed explicitly because an RLS suite is the easiest place in a codebase to write a test that proves nothing.

| Negative assertion                                   | Positive control in the SAME test                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| ownerB reads zero of ownerA's links                  | ownerA reads exactly 1 for that id first                                |
| ownerB reads zero of ownerA's applications           | ownerA reads exactly 1 for that id first                                 |
| ownerB cannot `create_application_link` on unitA     | ownerB **can** create on their own unit — the refusal is ownership, not a blanket failure |
| ownerB cannot `revoke_application_link` on linkA     | ownerA's revoke of a link they own succeeds                             |
| ownerB cannot `set_application_status`               | ownerA's identical call succeeds                                        |
| ownerB cannot `set_application_notes`                | ownerA's call succeeds and the value is trimmed as specified            |
| conversion refuses ownerB's tenant                   | the same application converts against ownerA's tenant                   |
| authenticated cannot EXECUTE `submit_rental_application` | service_role succeeds with the **same arguments**                    |
| authenticated cannot UPDATE the table                | the owner CAN read the row, so zero-rows is the missing policy not a missing row |
| anon cannot SELECT applications                      | the owner reads the same row, count 1                                    |
| the sweep is revoked from authenticated and anon     | service_role runs it and gets a number back                              |
| forbidden columns do not exist                       | `select('id')` succeeds through the same probe mechanism                |
| no archive table exists                              | `rental_applications` selects cleanly through the same mechanism         |
| an invalid payload writes nothing                    | a valid payload on the **same link** is accepted                        |
| the 700-day row is not swept                         | an 800-day row in the same sweep IS swept                                |
| the sweep clears 29 PII columns                      | all 29 asserted non-null immediately BEFORE the sweep                    |
| the cascade deletes applications, links, notifications | all three asserted present (count 1) immediately before the cascade    |

Two enumeration-specific assertions go further and compare error strings for equality: "not yours" and "does not exist" must produce the *same* message on `create_application_link`, `revoke_application_link` and `set_application_status`. Distinct messages let a signed-in owner probe another owner's ids.

## Teardown

Every suite's `afterAll` deletes in FK-safe order — notifications by `entity_id`, then applications, then links, then tenants, then units, then properties — and then **re-queries and asserts the count is zero** rather than assuming the deletes worked. The retention suite additionally destroys its disposable user (applications, links, notifications, units, properties, trigger-seeded `document_categories`, the `public.users` row, and the auth user if one was created) and asserts that user is gone.

**But none of this has executed.** The correct claim is: teardown is written to leave zero rows and to prove it; it has not been observed doing so. Do not read the assertions in this file as evidence that production is clean — nothing was ever written to production by this plan, because the suites never ran.

Three additional safety properties, all structural:

1. **The retention window restore is `try/finally`,** in both mutating tests, plus a backstop upsert at the top of `afterAll`. A failed assertion cannot leave production on a one-day window.
2. **The restore writes back the value captured at suite start,** never a hardcoded `730` — an operator who raised the window to `1460` does not get it silently walked back down.
3. **The sweep is guarded before it runs, not just cleaned up after.** `try/finally` protects the *setting*; it does nothing for rows the sweep already destroyed. So `foreignDueIds(window)` enumerates every row that would become due at that window and is not one of this file's own, and the test **skips** when that list is non-empty. Fail-closed: if the guard cannot prove the blast radius, the test does not run. This is a Rule 2 addition — see Deviations.

## Deviations from Plan

### Rule 2 — auto-added missing critical safety

**1. Blast-radius guard on every sweep invocation**

- **Found during:** Task 3
- **Issue:** The plan mandates `try/finally` around the `app_config` mutation and calls out T-66-37. That protects the *config value*. It does nothing about the sweep itself, which is global and irreversible: assertion 7 sets the window to **1 day** and then invokes a function that anonymizes every non-converted application older than that, for every owner. Today that set is empty (the tables are one day old), so the test is safe by accident. The first real customer application makes it a data-destruction event, and the `finally` block would restore the config while the PII is already gone.
- **Fix:** `foreignDueIds(days)` enumerates due rows not created by the suite; each sweep test skips when it is non-empty. Applied to all eight sweep-invoking tests, not just the two config-mutating ones.
- **Commit:** `497c15228`

### Rule 1 — deviations from the plan's literal acceptance criteria, with reasons

**2. The lifetime-cap loop the plan describes is unreachable**

Assertion 7 says to "call `submit_rental_application` in a loop until `submission_count` reaches the lifetime cap". That loop terminates at 25, not 250: the rolling-hour cap is evaluated in the same function and fires first. It would also put 250 live applicant rows on production for the duration of a test. Implemented instead as the plan's own technique for assertion 8 — set `submission_count` to 249 directly, submit once (**accepted**, which pins the boundary at exactly 250 rather than 249), submit again (`link_capped`). The rate cap gets its own test with 24 seeded rows plus one genuine accepted submission, so the 25th is proven rather than seeded.

**3. `information_schema` is unreachable from this harness**

Assertions 12 (Task 2) and 9 (Task 3) specify `information_schema` queries. PostgREST exposes `public` and `graphql_public` only (`supabase/config.toml:13`), there is no `exec_sql` RPC in this project, and no `pg` driver is a dependency — adding one would be a package install, which the executor rules exclude from auto-fix. Substituted an equivalent-strength PostgREST probe: `select(<column>)` for each of the 13 forbidden column names must error, with `select('id')` as the positive control that the probe works. Same for the two archive table names. This is still a schema-level assertion — it cannot be satisfied by a passing code path — and it is backed by a second, behavioural assertion: a payload carrying `ssn` and `date_of_birth` is submitted, and the stored row is asserted to contain neither value under any column name.

**4. The cron assertion is probe-gated, and that is weaker than the plan asked for**

Assertion 10 (Task 3) requires reading `cron.job`. The `cron` schema is not exposed to PostgREST and there is no arbitrary-SQL path here. The test probes `service.schema("cron").from("job")` and, when the schema is unreachable, **skips** — following the precedent set verbatim by `notifications-retention.rls.test.ts`, whose header records the same limitation and defers those assertions to orchestrator MCP verification. Plan 66-06 already verified both facts live (1 job named `anonymize-rental-applications`; 0 other jobs on `35 3 * * *`). Stated as a gap rather than papered over: **on this project's PostgREST configuration this test will skip, so the cron slot is not pinned by CI.**

**5. Column counts in the plan are wrong; the code is right**

Task 3 assertion 1 says "23 nullable PII columns"; its acceptance criterion says "all 26 cleared columns". The shipped sweep clears **29**: 26 nullable columns set to NULL plus 3 NOT NULL columns overwritten with `[deleted]`. The migration's own comment says 29. The test iterates two arrays totalling 29 and asserts every one, so the plan's undercount cannot cause an under-assertion.

### FINDING — shipped behaviour contradicts 66-04-SUMMARY

**6. `approved -> reviewing -> approved` DOES move the retention clock forward**

- **Found during:** Task 2, writing assertion 15.
- **The plan's acceptance criterion:** "Assertion 15 compares the two `decided_at` timestamps for equality." 66-04-SUMMARY makes the same claim: "a status flipped approved -> reviewing -> approved does not push the anonymization date forward and hold applicant PII past policy."
- **What production actually does.** `set_application_status` (live as `20260807003555`) has two UPDATE branches. The terminal branch carries `decided_at = coalesce(decided_at, now())`. The **non-terminal branch sets `decided_at = null` outright.** So the coalesce protects `approved -> rejected` (terminal → terminal) and nothing else; a round trip through `reviewing` clears the stamp, and the next `approved` writes a fresh `now()`.
- **Why the claim was made anyway:** 66-04-SUMMARY's own decision note records the two-branch split and the `null` clear correctly. The retention-clock conclusion built on top of it simply does not follow from it. A literal-string gate on `decided_at = coalesce(decided_at, now())` passed, which is exactly the kind of assertion that confirms a line exists without confirming what it implies.
- **What was done:** two tests instead of one. `D3` asserts the coalesce where it genuinely holds (`approved -> rejected` preserves the original `decided_at` — timestamp equality, as the plan asks). `D4` asserts the actual round-trip behaviour: `decided_at` becomes null on the way to `reviewing`, and a **new, different** timestamp on the way back. `D4`'s comment names the contradiction in full.
- **Why not fix the SQL:** the migration is applied to production. Changing it needs a new migration and an owner-gated apply (the 66-06 pattern), which no executor can perform — executor agents hold no Supabase MCP tools. Writing the test to the summary's claim would have produced a failing test that teaches nothing.
- **Which behaviour is correct is a real open question.** Clearing `decided_at` ages the row from `created_at`, which is *earlier*, so the row sweeps *sooner* — privacy-conservative but it destroys the landlord's fair-housing evidence earlier. Preserving it holds PII longer. The migration argues for clearing ("leaving a stale timestamp would age an undecided row from a decision that was withdrawn"). That argument is sound. **The defect is the summary's claim, not necessarily the code** — but one of the two must change, and D4 makes any future change to either side visible instead of silent.

**Total:** 1 Rule 2 safety addition, 4 documented departures from literal plan text (each unreachable-as-written), 1 escalated finding. No Rule 4 architectural question arose. No package installed. No production migration touched.

## Threat Model Coverage

| Threat ID | Disposition | Status                                                                                                                                                            |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-66-04   | mitigate    | **Written, unrun.** Group A: 7 tests covering anon insert/select/execute and authenticated execute/insert/update/read-isolation, each with a positive control.     |
| T-66-05   | mitigate    | **Written, unrun.** `B2` fires 5 parallel RPCs at `submission_count = 249` and asserts one success, one row, counter +1.                                            |
| T-66-36   | mitigate    | **Written, unrun.** Dual-client assertions on every read path and all five owner RPCs, plus message-equality checks on three of them so refusals cannot enumerate. |
| T-66-12   | mitigate    | **Written, unrun.** All 29 cleared columns iterated, with a pre-sweep positive control that each was populated.                                                     |
| T-66-23   | mitigate    | **Written, unrun.** `R8` deletes the config row and asserts the 730 default still fires — the NULL-window silent no-op.                                             |
| T-66-37   | mitigate    | **Strengthened.** `try/finally` on both config mutations, an `afterAll` backstop, AND a fail-closed blast-radius guard before every sweep (Rule 2 addition).       |
| T-66-21   | mitigate    | **Written, unrun.** Both archive table names probed, with a positive control.                                                                                      |
| T-66-26   | mitigate    | **Written, unrun.** `R12` asserts the two new deletes AND the pre-existing behaviour (notifications gone, user row redacted, properties inactive).                  |
| T-66-SC   | mitigate    | **Done.** Zero packages installed. `node:crypto` and the existing harness cover everything.                                                                         |

## Known Stubs

None. All 51 tests carry real assertions. Five are conditionally skipped by design:

- `E1`–`E5` skip when the `apply-token` probe says undeployed. It is deployed (66-08, v1 ACTIVE), so they should run; the gate exists so the suite does not false-fail on a network blip, following the `isSignFunctionDeployed` precedent.
- `R10` skips when `cron` is not exposed to PostgREST, which on this project it is not. Recorded as a real gap in Deviations, not presented as coverage.
- The eight sweep tests skip when the blast-radius guard finds foreign due rows. Today that set is empty, so they should run.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no schema change and no new trust boundary. It reads and writes production through credentials the harness already held.

## Self-Check: PASSED

**Files verified present on disk:**

- `tests/integration/rls/rental-application-links.rls.test.ts` — FOUND, 518 lines
- `tests/integration/rls/rental-applications.rls.test.ts` — FOUND, 1,330 lines
- `tests/integration/rls/rental-applications-retention.test.ts` — FOUND, 865 lines

**Commits verified in `git log`:** `e43477cb2`, `b6b79322b`, `497c15228`

**Branch:** `gsd/phase-66-rental-application-intake` (verified before the first commit; never `main`)

**Not verified, and cannot be from this machine:** that any of the 51 tests pass, that any assertion is non-vacuous against the live database, or that teardown leaves zero rows. See the BLOCKER section.

## Next Phase Readiness

**These suites are now the contract on seven RPC signatures, two RLS policies, one grant matrix and one retention sweep.** A rename or signature change in 66-11 onward breaks them.

Carry-forwards:

1. **[BLOCKING for verification] The three suites must be run by someone with Supabase credentials.** Nothing in this plan's coverage claims is observed. Run twice consecutively to prove teardown.
2. **The `decided_at` contradiction needs an owner decision.** Either `set_application_status`'s non-terminal branch stops clearing `decided_at` (new migration, owner-gated apply, and `D4` gets inverted), or 66-04-SUMMARY's retention-clock claim is corrected. Do not close the phase with both statements standing.
3. **The cron slot is not pinned by any automated check.** `R10` skips on this PostgREST configuration. If that matters, the options are exposing `cron` to PostgREST (a production security change, not a test change) or adding a service-role-only RPC that returns the job inventory.
4. **`R12` creates a disposable user on production.** It prefers a direct `public.users` insert and only falls back to `auth.admin.createUser` if a FK forces it. Whoever runs the suite first should confirm no `rls-retention-*@example.com` user survives.
5. **Group B and E write real rows to production and rely on teardown.** They are bounded (one link and at most 25 applications per test) and every row is `RUN_TAG`-prefixed and therefore greppable if a run is interrupted mid-suite.

---

_Phase: 66-rental-application-intake_
_Completed: 2026-08-07_
