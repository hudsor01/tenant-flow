---
phase: 06-polish-a11y
plan: 01
subsystem: testing
tags: [playwright, axe-core, accessibility, ci, e2e, github-actions]

# Dependency graph
requires:
  - phase: 05-dashboard-portfolio-datatable
    provides: completed /dashboard surface that downstream a11y E2E tests audit
provides:
  - "@axe-core/playwright in ROOT package.json devDependencies (resolves from repo-root node_modules for root-run Playwright)"
  - "--project=owner wired into the CI E2E run so authed /dashboard E2E/axe specs execute on every PR"
affects: [plan-04, 06-polish-a11y, dashboard-a11y, e2e-owner-project]

# Tech tracking
tech-stack:
  added: ["@axe-core/playwright@4.11.3 (dev-only)", "axe-core (transitive)"]
  patterns:
    - "Root-level install for tooling that CI imports from repo root (bunx playwright test runs from root, resolves from root node_modules)"
    - "Authed Playwright project (owner) wired into CI via --project=owner; setup-owner resolved through project dependencies, never manually re-listed"

key-files:
  created:
    - .planning/phases/06-polish-a11y/06-01-SUMMARY.md
  modified:
    - package.json
    - bun.lock
    - .github/workflows/ci-cd.yml

key-decisions:
  - "Installed @axe-core/playwright at ROOT (not only in tests/e2e/package.json) because CI runs bunx playwright test from the repo root, resolving from root node_modules"
  - "Appended --project=owner without re-listing setup-owner; Playwright resolves the setup dependency automatically via the owner project's dependencies array"
  - "Reverted an out-of-scope whitespace-only reformatting of .planning/config.json (tool side-effect, content-identical) to keep commits clean"

patterns-established:
  - "Dev-tooling supply-chain gate: a blocking human-verify checkpoint (T-06-SC) confirms maintainer + source repo before bun add, because slopcheck was unavailable during research"
  - "CI authed-project wiring: add --project=<authed> alongside existing projects; never reorder/remove smoke/public; let setup deps resolve auth storageState"

requirements-completed: [POLISH-05]

# Metrics
duration: 2min
completed: 2026-06-01
---

# Phase 6 Plan 01: A11y/E2E Install + CI Prerequisites Summary

**Installed @axe-core/playwright@4.11.3 into the ROOT devDependencies and wired the authed `owner` Playwright project into the CI E2E run, unblocking the downstream /dashboard axe-accessibility test (Plan 04).**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-01T15:38:44Z
- **Completed:** 2026-06-01T15:40:34Z
- **Tasks:** 3 (1 pre-approved checkpoint, 2 auto)
- **Files modified:** 3 (package.json, bun.lock, .github/workflows/ci-cd.yml)

## Accomplishments
- **Task 1 (checkpoint:human-verify, T-06-SC) — PASSED via pre-clearance.** The blocking package-legitimacy gate for `@axe-core/playwright` was human-approved by the orchestrator BEFORE dispatch (npm maintainer confirmed = Deque Labs `dqlabs <labs@deque.com>` + `npmdeque <axe@deque.com>`; source repo github.com/dequelabs/axe-core-npm; latest 4.11.3 satisfies `^4.11.0`; already declared in tests/e2e/package.json:25). Per the orchestrator's pre-approval, the executor did NOT pause again and proceeded directly to install. No files modified by this gate, so it carries no commit.
- **Task 2 — Root install.** `bun add -D @axe-core/playwright` added `@axe-core/playwright@4.11.3` to root `package.json` devDependencies and updated `bun.lock` (with transitive `axe-core`). The axe engine now resolves from repo-root `node_modules`, which is the binding requirement: CI runs `bunx playwright test --config tests/e2e/playwright.config.ts` from the repo root. Dev-only — never ships to client/runtime, so CSP is unaffected.
- **Task 3 — CI owner-project wiring.** Appended `--project=owner` to the E2E run line at `.github/workflows/ci-cd.yml:162`. `--project=smoke` and `--project=public` preserved and unreordered. Playwright auto-resolves the owner project's `dependencies: ["setup-owner"]`, which authenticates the synthetic owner via `auth-api.setup.ts` and writes the `storageState` (`playwright/.auth/owner.json`) that Plan 04's `/dashboard` axe spec reuses. The required `E2E_OWNER_EMAIL`/`E2E_OWNER_PASSWORD` secrets are already in the job's env block.

## Task Commits

Each implementing task was committed atomically (Task 1 modifies no files — no commit):

1. **Task 1: Verify @axe-core/playwright legitimacy (T-06-SC)** — no commit (verification gate; human-approved by orchestrator before dispatch)
2. **Task 2: Install @axe-core/playwright into root devDependencies** — `4cd7749f3` (chore)
3. **Task 3: Wire owner Playwright project into CI E2E run** — `736cf4f0f` (ci)

**Plan metadata:** committed separately with SUMMARY.md + STATE.md + ROADMAP.md (docs).

## Files Created/Modified
- `package.json` — added `@axe-core/playwright: 4.11.3` to devDependencies (root)
- `bun.lock` — added `@axe-core/playwright` + transitive `axe-core`
- `.github/workflows/ci-cd.yml` — appended `--project=owner` to the E2E run line (line 162)
- `.planning/phases/06-polish-a11y/06-01-SUMMARY.md` — this summary

## Decisions Made
- Installed at ROOT rather than relying on the existing `tests/e2e/package.json:25` declaration, because that nested package has no `node_modules`/lockfile and CI imports the engine from a root-run Playwright invocation.
- Did not manually list `setup-owner` as a CI project flag; Playwright resolves it via the `owner` project's `dependencies` array. Re-listing it would be redundant and is explicitly disallowed by the plan acceptance criteria.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reverted out-of-scope whitespace reformatting of .planning/config.json**
- **Found during:** Task 2 (after `bun add`)
- **Issue:** A tool reading `.planning/config.json` (SDK/state load) rewrote it tabs→spaces, producing a content-identical but fully-reformatted diff unrelated to this plan's scope.
- **Fix:** `git checkout -- .planning/config.json` to discard the spurious change, keeping the commit limited to `package.json` + `bun.lock`.
- **Files modified:** none (reverted)
- **Verification:** `git status --short` showed only `package.json` and `bun.lock` modified after the revert.
- **Committed in:** n/a (kept out of the commit entirely)

---

**Total deviations:** 1 (Rule 3 — kept commit scope clean; no functional change)
**Impact on plan:** No scope creep. Both implementing tasks executed exactly as written.

## Issues Encountered
- During `bun add`, lefthook emitted a `core.hooksPath` set-locally-and-globally warning while attempting `lefthook install`. This is a pre-existing local environment config condition (not a failure) and did not affect the install or the subsequent commits — all pre-commit hooks (lint, typecheck, unit-tests) and commit-msg (commitlint) ran successfully on both task commits.

## User Setup Required
None — no external service configuration required. The synthetic owner accounts (`e2e-owner-a@tenantflow.app`) and the `E2E_OWNER_EMAIL`/`E2E_OWNER_PASSWORD` CI secrets already exist in prod/CI.

## Threat Flags
None — no new application attack surface. T-06-SC (supply chain) was mitigated by the human-verify gate before install; T-06-01 (CI flag) is an additive `--project=owner` with no auth/secret/permission change. No network endpoints, auth paths, file-access patterns, or schema changes introduced.

## Next Phase Readiness
- Wave-0 prerequisites complete. Plan 04's `/dashboard` axe-accessibility spec can now (a) import `AxeBuilder` from a root-run Playwright test, and (b) actually execute in CI under the `owner` project on every PR.
- No blockers.

## Self-Check: PASSED
- FOUND: `.planning/phases/06-polish-a11y/06-01-SUMMARY.md`
- FOUND: `@axe-core/playwright` in `package.json`
- FOUND: `--project=owner` in `.github/workflows/ci-cd.yml`
- FOUND: commit `4cd7749f3` (Task 2)
- FOUND: commit `736cf4f0f` (Task 3)

---
*Phase: 06-polish-a11y*
*Completed: 2026-06-01*
