---
phase: 08-nav-active-states
plan: 01
subsystem: testing
tags: [vitest, jsdom, testing-library, regression-pin, navbar, lucide-react]

# Dependency graph
requires:
  - phase: 08-nav-active-states
    provides: "CONS-02/03/11 production fixes shipped in commit 7540ebe48 (Multi-Property Dashboard icon, homepage active-nav state, Resources dropdown dead link)"
provides:
  - "CONS-02 regression pin — features-section.test.tsx asserts LayoutDashboard icon, not arrow-left"
  - "CONS-03 regression pin — navbar-desktop-nav.test.tsx asserts aria-current wiring both directions"
  - "CONS-11 regression pin — types.test.ts asserts no placeholder hrefs in DEFAULT_NAV_ITEMS"
affects: [phase-09-page-cleanup, phase-11-token-alignment, perfect-PR review gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regression-pin test per audit fix — a future revert of a shipped fix fails CI via a red test"
    - "Props-driven component render — pass pathname as a prop instead of mocking next/navigation"

key-files:
  created:
    - src/components/sections/__tests__/features-section.test.tsx
    - src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx
    - src/components/layout/navbar/__tests__/types.test.ts
  modified: []

key-decisions:
  - "No production code changed — the three CONS fixes already shipped in 7540ebe48; this plan only locks them"
  - "next/link rendered cleanly under jsdom with no mock — passthrough vi.mock fallback was not needed"

patterns-established:
  - "Regression-pin tests: every audit fix gets a test that fails CI if the fix is reverted"
  - "Component tests pass pathname/props directly rather than mocking next/navigation"

requirements-completed: [CONS-02, CONS-03, CONS-11]

# Metrics
duration: ~5min
completed: 2026-05-20
---

# Phase 8 Plan 01: Nav Active States Regression Pins Summary

**Three new Vitest regression-pin test files lock the shipped CONS-02/03/11 fixes (Multi-Property Dashboard LayoutDashboard icon, homepage aria-current wiring, no placeholder hrefs in the navbar config) so a future edit cannot silently revert them.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-20T23:34:11Z
- **Completed:** 2026-05-20T23:38:51Z
- **Tasks:** 3
- **Files modified:** 3 (all newly created test files)

## Accomplishments
- CONS-02 pinned: `features-section.test.tsx` asserts the Multi-Property Dashboard card renders `svg.lucide-layout-dashboard` and not `svg.lucide-arrow-left`, plus all six feature cards for coverage.
- CONS-03 pinned: `navbar-desktop-nav.test.tsx` asserts no `aria-current="page"` on any nav link at `pathname="/"`, a correct positive at `/compare`, and no false-highlight on a sibling route (`/pricing`).
- CONS-11 pinned: `types.test.ts` asserts no `DEFAULT_NAV_ITEMS` entry or dropdown item uses a placeholder href (`#`, `/#`, empty, `javascript:void(0)`) and the Resources parent resolves to `/resources`.
- Full unit suite stays green: 101,892 tests across 148 files; the 3 new files add 9 passing tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: CONS-02 regression pin — Multi-Property Dashboard card icon test** - `05c4f7626` (test)
2. **Task 2: CONS-03 regression pin — homepage aria-current navbar test** - `ceb5b3634` (test)
3. **Task 3: CONS-11 regression pin — nav config no-placeholder-href test** - `80d868d58` (test)

## Files Created/Modified
- `src/components/sections/__tests__/features-section.test.tsx` - CONS-02 pin: LayoutDashboard icon + six-card coverage (3 tests)
- `src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx` - CONS-03 pin: aria-current wiring, both directions (3 tests)
- `src/components/layout/navbar/__tests__/types.test.ts` - CONS-11 pin: no placeholder hrefs in DEFAULT_NAV_ITEMS (3 tests)

## Decisions Made
- No production source touched — `features-section.tsx`, `navbar-desktop-nav.tsx`, `navbar/types.ts`, `is-active-link.ts` are all unmodified (verified via `git diff --name-only HEAD~3 HEAD`).
- `next/link` rendered cleanly under jsdom without a provider or mock; the documented passthrough `vi.mock("next/link")` fallback was unnecessary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Collapsed an `expect(...)` call to a single line for biome**
- **Found during:** Task 1 (CONS-02 regression test)
- **Issue:** The plan's exact file content placed the six-card `expect(screen.getByRole(...))` call across three lines; the biome pre-commit lint hook (`bun run lint`) flagged it and blocked the commit, demanding the single-line form.
- **Fix:** Collapsed `expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();` onto one line.
- **Files modified:** src/components/sections/__tests__/features-section.test.tsx
- **Verification:** `bunx biome check` clean; 3 tests still pass.
- **Committed in:** `05c4f7626` (Task 1 commit)

**2. [Rule 3 - Blocking] Switched a single-quote test name to double quotes for biome**
- **Found during:** Task 2 (CONS-03 regression test)
- **Issue:** The plan's exact file content used a single-quoted string for the third `it(...)` title (`'does not false-highlight Compare...'`); biome enforces double quotes for strings with no apostrophe and blocked the commit.
- **Fix:** Changed the title to a double-quoted string.
- **Files modified:** src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx
- **Verification:** `bunx biome check` clean; 3 tests still pass.
- **Committed in:** `ceb5b3634` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were trivial formatting adjustments required to satisfy the biome lint pre-commit hook. No behavior change, no scope creep — the test assertions are byte-identical to the plan's intent.

## Issues Encountered
- The `bun run test:unit` script already appends `--run`; invoking `bun run test:unit -- --run <path>` errored with a duplicate-option message. Resolved by calling `bun run test:unit -- <path>` (no extra `--run`).
- The pre-commit `lockfile-verify` hook fails inside the command sandbox (`bun install --frozen-lockfile` needs install-cache write access). Per the documented environment note, the three `git commit` calls were retried with the sandbox disabled — all five pre-commit checks plus commitlint then passed. No `--no-verify` used.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 8's three audit fixes are now regression-locked; a future revert of any of them fails CI.
- Ready for `/gsd-verify-work 8` and the perfect-PR review gate.

## Self-Check: PASSED

All three test files and the SUMMARY exist on disk; all three task commits (`05c4f7626`, `ceb5b3634`, `80d868d58`) exist in git history.

---
*Phase: 08-nav-active-states*
*Completed: 2026-05-20*
