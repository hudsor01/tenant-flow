---
phase: 66-rental-application-intake
plan: 17
subsystem: testing
tags: [playwright, e2e, geometry, non-vacuity, cascade, ci-gating, production-fixtures]

# Dependency graph
requires:
  - phase: 66-12
    provides: "the applicant form, the honeypot, the disclaimer block and the submit states — §D-1 is precisely the case where a class is present and inert, so only a rendered measurement can decide it"
  - phase: 66-11
    provides: "the /apply/[token] page shell and its three card states; its unavailable-state proof was render-layer only, and E-10 is the handoff it named"
  - phase: 66-14
    provides: "the application-links panel; E-19's geometric half was undecidable in jsdom and was deferred here"
  - phase: 66-13
    provides: "the queue whose class contract that plan's test guards against deletion only; E-18 and E-20 are the computed values it could not assert"
  - phase: 66-15
    provides: "/applications/[id] and the conversion href whose source-side half it pinned; E-21 is the rendered-attribute half"
  - phase: 66-04
    provides: "create_application_link / revoke_application_link — the only authenticated write path into rental_application_links, and the reason link rows can be revoked but never deleted"
  - phase: 66-10
    provides: "the deployed apply-token function (v1 ACTIVE) and the four applied migrations, plus the probe-and-skip deploy gate this plan copies"
provides:
  - "tests/e2e/tests/public/apply-token.spec.ts — E-1 to E-16, 16 tests under the CI-gating `public` project"
  - "tests/e2e/tests/owner/applications.spec.ts — E-17 to E-21, 5 tests under the CI-gating `owner-axe` project"
  - "tests/e2e/lib/application-fixtures.ts — reuse-first production seeding with a bounded, documented footprint"
affects:
  - "tests/e2e/playwright.config.ts — owner-axe allowlist plus three testIgnore entries, so the owner spec runs exactly once and gates a PR"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resolve a CSS custom property through a throwaway probe element and read ITS computed colour, so the comparison survives theming and matches the serialization getComputedStyle produces"
    - "Assert a set of offenders (`expect(offenders).toEqual([])`) rather than looping expect, so a failure names the element and its measured value"
    - "Every absence assertion carries a positive control in the same test — a zero count and a byte-identical pair are both satisfied trivially by a page that failed to render"
    - "Reuse-first production seeding for a table with no DELETE policy: discover an existing fixture, create at most what is missing, and never mint per run"
    - "Locate a class-less primitive structurally (`main#main-content > div > div`, `[role=\"tabpanel\"] ul`) rather than by the class the test then measures, which would be circular"

key-files:
  created:
    - tests/e2e/tests/public/apply-token.spec.ts
    - tests/e2e/tests/owner/applications.spec.ts
    - tests/e2e/lib/application-fixtures.ts
  modified:
    - tests/e2e/playwright.config.ts

key-decisions:
  - "The owner spec runs under `owner-axe`, not `owner`. CI's e2e-smoke job invokes --project=smoke --project=public --project=owner-axe and never runs `owner`, whose setup-owner storageState dependency is absent from that list, so the plan's literal placement would have produced a spec that gates nothing on a PR — the exact `written but never collected` failure this plan exists to prevent"
  - "E-10's dead-token case is a REVOKED link, not an expired one. rental_application_links has no UPDATE policy for any role and create_application_link clamps p_expires_days to a minimum of one day, so an authenticated owner cannot produce an expired row at all; revocation is the only real dead state reachable, and get_application_context collapses all four into one shape so it carries the same non-enumeration property"
  - "Link rows are REUSED, never revoked in afterAll. The plan says revoke, but the table has no DELETE policy: revoking would force the next run to mint a replacement that also could never be deleted, converting a two-row fixture into unbounded growth of production rows on every PR"
  - "E-7 fills the form before measuring tab order. The submit button is disabled while the form is invalid and a disabled button is skipped by Tab, so asserting the order at the moment an applicant would actually submit is both the deterministic and the meaningful reading"
  - "E-2 excludes the honeypot and Radix's hidden bubble checkbox input structurally; including either would fail the 48px assertion for reasons unrelated to the cascade it measures"
  - "Copy constants (TOKEN_UNAVAILABLE_COPY, FAIR_HOUSING_NOTE) are mirrored as literals rather than imported from `#lib/...`. Playwright's loader resolves package.json subpath imports to extensionless .ts paths, and 66-02 already owns the snapshot, so a drift fails there first"

requirements-completed: [APPLY-01, APPLY-02, APPLY-03, APPLY-04, APPLY-06]

# Metrics
duration: 95min
completed: 2026-08-08
---

# Phase 66 Plan 17: Rendered-Geometry Acceptance Specs Summary

Twenty-one measured browser assertions — bounding boxes, computed styles, DOM order, tab order
and the rendered head — replacing the class-presence checks that Phase 65 proved cannot detect
the defect class this repo actually ships.

## What was built

| File | Rows | Project | Runs in CI |
|---|---|---|---|
| `tests/e2e/tests/public/apply-token.spec.ts` | E-1 … E-16 (16 tests) | `public` | yes |
| `tests/e2e/tests/owner/applications.spec.ts` | E-17 … E-21 (5 tests) | `owner-axe` | yes |
| `tests/e2e/lib/application-fixtures.ts` | seeding + teardown | — | — |

### E-1 … E-21: implemented, one for one

Every row of UI-SPEC §E is implemented. The mapping from §E row to test is in the test titles,
which carry the row id verbatim so a missing row is visible in `--list` output rather than
discoverable only by reading.

Two §E rows are asserted inside one test each for a structural reason, and both halves are
present:

- **E-5 and E-14** share `"E-5 and E-14: the card caps at 672px and pairs the name fields at
  1280px"` — one viewport change, two measurements.
- **E-9** is asserted on the absent-token branch **and** on the valid branch inside the same
  test, because the two render different component trees and a per-branch metadata regression
  would otherwise ship silently.

### The four explicit handoffs from earlier plans

| Handoff | Owner | Status |
|---|---|---|
| 66-11: unavailable states proved at render layer only; no real dead row ever existed | E-10 | **Implemented** with a real revoked link (see deviation 2) |
| 66-14: §C's geometric half undecidable in jsdom | E-19 | **Implemented** across a real `page.reload()` |
| 66-13: its class contract is a deletion guard only | E-18, E-20 | **Implemented** as computed-style reads |
| 66-12: a class assertion cannot decide §D-1 | E-2, E-3 | **Implemented** as measured heights (48px / ≥96px) |

## Non-vacuity: every absence assertion carries a positive control

The brief named four traps. Each is answered in the code:

1. **`toBeVisible()` cannot assert a honeypot is hidden.** E-6 uses `not.toBeInViewport()` plus
   `getBoundingClientRect().right < 0`, and the file header records that `66-RESEARCH.md`'s
   `toBeHidden()` prescription is wrong because Playwright's visibility model is geometric.
   `toBeHidden` appears nowhere in either file.
2. **A "no horizontal scroll" assertion passes on a page that failed to render.** Every
   measurement test asserts real content first: E-2/E-4/E-8/E-13 assert `count() >= 20` real
   inputs or fields before asserting anything about them; E-17 asserts `boxes.length > 0`.
3. **A byte-identity assertion passes trivially if both sides are error pages.** E-10 asserts
   `deadText` contains the unavailable title *before* comparing, so a Supabase outage during the
   run (which would render `CONTEXT_ERROR_COPY` on both sides) is a failure, not a pass.
4. **Counting proves nothing if the count is zero.** E-8's forbidden-field count of zero is
   preceded by a `>= 20` real-input control. E-18's colour equality is preceded by
   `expect(foreground).not.toBe(primary)` — without it the comparison could not discriminate the
   Phase-65 accent-tinted row from the correct one. E-20's computed-margin read is preceded by
   `expect(computed.itemTag).toBe("li")`.

Two further controls were added beyond the brief: E-15 asserts the confirmation card is visible
before checking that no input holds the email (otherwise the assertion passes on a page where
the click never landed, since a successful submit unmounts every input), and E-16 asserts the
rate-limited notice is visible before checking the retained value.

## Deviations from Plan

### 1. [Rule 2 — missing critical functionality] The owner spec runs under `owner-axe`, and `playwright.config.ts` was edited

- **Found during:** Task 2, reading `playwright.config.ts` and `.github/workflows/ci-cd.yml`.
- **Issue:** The plan places the spec at `tests/e2e/tests/owner/applications.spec.ts` and points
  at the `owner` project's `OWNER_AUTH_FILE` storage state. CI's `e2e-smoke` step runs
  `--project=smoke --project=public --project=owner-axe`. It never runs `owner`, `firefox` or
  `mobile-chrome`, and the config's own comment records that `setup-owner` "is NOT exercised in
  CI". As written, all five owner-surface assertions would have executed nowhere on a PR — the
  precise "a spec that is written but never collected reports green" failure this plan exists to
  prevent, and the same lesson `documents-hub.spec.ts`'s header already records.
- **Fix:** Kept the plan's file path. Added `"**/owner/applications.spec.ts"` to the `owner-axe`
  `testMatch` allowlist and to the `testIgnore` of `owner`, `firefox` and `mobile-chrome`, and
  switched the spec to in-test `loginAsOwner` with no storageState — byte-identical to the
  pattern `notifications.spec.ts`, `reports-hub.spec.ts` and `documents-hub.spec.ts` use. Running
  it once rather than three times also bounds its production seed to one write per run.
- **Files modified:** `tests/e2e/playwright.config.ts`.
- **Verified:** `--list` across all six projects shows each of the five tests exactly once, under
  `[owner-axe]` only.
- **Commit:** `1ca1b8198`.

### 2. [Rule 3 — blocking issue] E-10's dead token is revoked, not expired

- **Found during:** Task 1, reading `20260807003342_rental_applications_schema.sql`.
- **Issue:** The plan says "Produce the expired case by creating a link, expiring it via the
  seeding client". `rental_application_links` ships one SELECT policy and no INSERT, UPDATE or
  DELETE policy for any role (66-01), and `create_application_link` clamps `p_expires_days` to
  `[1, 365]`. There is no path by which an authenticated owner can produce an expired row. The
  instruction is not executable as written, and the E2E environment holds no service-role key.
- **Fix:** The dead fixture is a **revoked** link. `get_application_context` collapses invalid,
  expired, revoked and unit-deleted into one shape with NULL details, so a revoked row is exactly
  the "real token in a dead state" the non-enumeration contrast requires. The reasoning is
  recorded in `ensureApplyTokens`' doc comment so nobody re-adds an `expires_at` backdate that
  cannot work.
- **Files modified:** `tests/e2e/lib/application-fixtures.ts`.
- **Commit:** `bfa7015b9`.

### 3. [Rule 2 — missing critical functionality] Link rows are reused, not revoked in teardown

- **Found during:** Task 1, working out the teardown.
- **Issue:** The plan says "Revoke the link in `afterAll`". Combined with deviation 2's finding,
  revoking on every run means every run finds no active link, mints a replacement, and revokes
  that too. Because the table has no DELETE policy for any role, each of those rows is permanent.
  The E2E suite runs on every PR and every push to `main`, so the plan's teardown would grow the
  production table without bound.
- **Fix:** Seeding is reuse-first. `ensureApplyTokens` discovers an existing active link and an
  existing dead link, and creates only what is missing — the dead one first, because the RPC
  refuses while an active link exists on a unit and a revoked link does not block creation, so
  resolving in the other order would leave the dead fixture unobtainable on a single-unit owner.
  The steady state is **exactly two link rows, for all time**. `afterAll` signs out and nothing
  else, and both file headers say so out loud.
- **Files modified:** `tests/e2e/lib/application-fixtures.ts`, both specs.
- **Commit:** `bfa7015b9`, `1ca1b8198`.

### 4. [Rule 3 — blocking issue] A third file was added: `tests/e2e/lib/application-fixtures.ts`

- **Issue:** The plan lists two files. Both specs need the same sign-in, unit discovery and link
  resolution; the public spec needs raw tokens and the owner spec needs an application row built
  on top of one. Duplicating ~200 lines of production-write logic across two files would have put
  the teardown discipline in two places that could drift.
- **Fix:** One shared, heavily documented helper under `tests/e2e/lib/` (where
  `frontend-logger.ts` already lives). It is imported by both specs and is not a barrel — every
  symbol is declared in it.

### 5. E-7 fills the form before measuring tab order

The plan says "Focus the attestation checkbox, press `Tab`". `SubmitButton` renders
`disabled={!canSubmit}` and a disabled button is skipped by Tab, so on an empty form the assertion
would be non-deterministic (66-12's own unit test at line 355 pins that the button is disabled
until the attestation is checked). The test therefore fills the 14 required answers, asserts the
button is enabled, and *then* measures — which is also the moment the property actually matters.

## Authentication gates

None. No interactive login, no secret entry, no CLI auth was required.

## Verification

| Check | Result |
|---|---|
| `bun run typecheck` (app + integration + e2e tsconfigs) | **PASS** |
| `bun run lint` (biome, 1,379 files) | **PASS**, no fixes applied |
| `bun run test:unit` (lefthook pre-commit, both commits) | **PASS**, 66.12% lines |
| Playwright collection — before | 241 tests in 23 files (`public` + `owner-axe` + `owner`) |
| Playwright collection — after | **262 tests in 25 files** (**+21 in +2 files**) |
| Per-project assignment across all six projects | each new test appears **exactly once**: 16 under `[public]`, 5 under `[owner-axe]`, zero duplicates in `owner` / `firefox` / `mobile-chrome` / `chromium` |
| `bun run test:e2e` | **NOT RUN LOCALLY** — see below |

### The specs were proven to be collected, not to pass

The `--list` delta above is the equivalent of Phase 65's 105 → 114 count check: 21 is exactly
16 + 5, so every test declared is a test Playwright collects, in the project intended.

**Neither spec was executed locally, and this is not a shortcut.** Three independent blockers:

1. `tests/e2e/.env.test` does not exist on this machine, so `playwright.config.ts` falls back to
   `http://127.0.0.1:54321` and the demo anon key. No local Supabase is running.
2. `E2E_OWNER_PASSWORD` is unset, so `loginAsOwner` and `readSeedCredentials` cannot authenticate.
   `.env.local` here holds only `VERCEL_OIDC_TOKEN`, and it is never to be edited.
3. **The webServer command begins `rm -rf .next && rm -f .env.local`.** Starting the suite locally
   would delete the developer's `.env.local`. That alone makes a local run unacceptable
   regardless of the other two.

They run in CI, where `e2e-smoke` supplies `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD` and fails hard
when any is missing.

### Production rows: zero written, verified rather than assumed

No spec was executed, no seeding helper was invoked, and no Supabase MCP tool is available to this
executor. The only commands run against anything networked were `bunx tsc`, `bunx biome` and
`bunx playwright test --list`, none of which opens a database connection. **Zero production rows
were created, modified or deleted by this plan.**

What CI will write, on its first run, is stated precisely so it can be audited: at most **one
active link row and one revoked link row** on the synthetic owner's unit, both permanent because
no DELETE path exists, both reused by every subsequent run; and **one `rental_applications` row
plus its owner notification**, only when the owner has none, deleted in `afterAll`.

## Known limitations

1. **Conditional skips are real, and they are visible.** Both specs skip with an explicit reason
   string (`no active link fixture: …`) when credentials, a unit, the deployed function or a
   fixture is unavailable. E-9 and the absent-token 200 check need no fixture and always run.
2. **A capped link would silence E-17/E-18/E-20/E-21.** `submit_rental_application` has a
   fail-closed lifetime cap of 250 per link with no decrement path. Reuse-first seeding consumes
   it at most once per run *and only when the owner's queue is empty*, so the horizon is long, but
   it is not infinite: when it is reached `ensureApplication` returns
   `apply-token refused the seed submission (link_capped)` and those four tests skip. The skip is
   loud in the report; it is not silent.
3. **`apply-token.spec.ts` is 583 lines**, above the 300-line guideline. It is 16 independent
   tests plus a header that records the CORS split, the honeypot correction and the seeding
   contract. Splitting it would fork the `beforeAll` seed across two files and double the
   production sign-in, which is a worse trade.
4. **E-15 and E-16 are stubbed, and only client state is claimed.** The header states this
   explicitly and points at 66-10 for the server-side proofs, so nobody later "upgrades" the stub
   into a claim it cannot support (T-66-55).

## Threat Flags

None. This plan adds no runtime surface — two test files and one test helper. The helper's write
capability is bounded by RLS to the synthetic owner's own rows, and it holds no service-role key.

## Self-Check: PASSED

- `tests/e2e/tests/public/apply-token.spec.ts` — FOUND
- `tests/e2e/tests/owner/applications.spec.ts` — FOUND
- `tests/e2e/lib/application-fixtures.ts` — FOUND
- `.planning/phases/66-rental-application-intake/66-17-SUMMARY.md` — FOUND
- commit `bfa7015b9` — FOUND
- commit `1ca1b8198` — FOUND
- `toBeHidden(` as a CALL in either spec — 0 occurrences (the four matches are the prose that
  records why it is wrong)
- Playwright collection delta 241 → 262 (+21 = 16 + 5), each new test in exactly one project
