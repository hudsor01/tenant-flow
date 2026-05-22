---
phase: 15-v1-0-milestone-cleanup
plan: 05
subsystem: testing
tags: [vitest, jsdom, regression-pin, nav, audit-2, source-scan]

requires:
  - phase: 02-frontend-correctness-numberticker-mobile
    provides: DEFAULT_NAV_ITEMS as the canonical nav config
  - phase: 08-nav-active-states
    provides: NavbarDesktopNav render-test analog (aria-current pins)
  - phase: 14-battle-test-findings-remediation
    provides: AUDIT-2 deferral comment in src/components/layout/navbar/types.ts
provides:
  - Source-scan regression pin: structural absence of /blog in DEFAULT_NAV_ITEMS + AUDIT-2 comment retention
  - Render regression pin: zero <a href="/blog"> rendered by NavbarDesktopNav and NavbarMobileMenu with DEFAULT_NAV_ITEMS
  - Belt-and-suspenders pair: future un-deferral when the first blog cohort lands MUST edit BOTH test files (deliberate signal)
affects: [blog-cohort-launch, future-nav-config-edits]

tech-stack:
  added: []
  patterns:
    - Pair-test pattern (source-scan + render) for "deliberate absence" invariants
    - readFileSync source-text scan as a comment-presence regression guard
    - In-narrowing on `as const satisfies readonly NavItem[]` discriminated union (mirrors types.test.ts:26)

key-files:
  created:
    - src/components/layout/navbar/__tests__/nav-blog-suppression-source.test.ts
    - src/components/layout/navbar/__tests__/nav-blog-suppression-render.test.tsx
  modified: []

key-decisions:
  - "Both source-scan AND render test ship (D-13 belt-and-suspenders override of plan-checker's 'either-or' recommendation)"
  - "Source-scan asserts three independent signals (AUDIT-2 token + deferr keyword + /blog token) so removing any one breaks the test"
  - "No @ts-expect-error probes in either shipped file (D-23 + CLAUDE.md rule #4: no commented-out code)"
  - "Zero production-source drift: only the two new test files added under src/components/layout/navbar/__tests__/"

patterns-established:
  - "Pair-test for deliberate-absence invariant: pure source scan (no jsdom) + render-time scan (jsdom). Source catches direct config edits; render catches hook/config-injected drift."
  - "readFileSync + three coexisting regex signals as belt-and-suspenders for documenting-comment retention."

requirements-completed: []

duration: ~15min
completed: 2026-05-21
---

# Phase 15 Plan 05: /blog Suppression Regression Pins Summary

**Belt-and-suspenders regression pair (source-scan + render) locking the AUDIT-2 deferral of `/blog` from `DEFAULT_NAV_ITEMS` so future un-deferral must be a deliberate edit, not accidental drift.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 0 (zero production-source drift)
- **Total tests added:** 5 (3 source-scan + 2 render)

## Accomplishments

- Source-scan test pins both the structural absence of `/blog` in `DEFAULT_NAV_ITEMS` (top-level + every dropdown) AND the documenting AUDIT-2 deferral comment in `src/components/layout/navbar/types.ts` lines 31-39. Three coexisting signals (`AUDIT-2` reference + `deferr` keyword + `/blog` token) so removing any one breaks the test.
- Render test mounts both `NavbarDesktopNav` and `NavbarMobileMenu` with `DEFAULT_NAV_ITEMS` and asserts `queryAllByRole("link").filter(href === "/blog")` is empty. Catches any hook/config-injected blog link the source-scan would miss.
- Future un-deferral when the first blog content cohort lands MUST edit BOTH test files — deliberate signal, not accidental drift.

## Task Commits

1. **Task 1: Source-scan test** — `e9b8fb92c` (test)
2. **Task 2: Render test** — `f992446ec` (test)

## Files Created/Modified

- `src/components/layout/navbar/__tests__/nav-blog-suppression-source.test.ts` (56 lines, 3 passing tests)
  - Imports `DEFAULT_NAV_ITEMS`, iterates structural absence on top-level + dropdown entries.
  - `readFileSync` `src/components/layout/navbar/types.ts`, asserts `/AUDIT-2/`, `/deferr/i`, `/\/blog/` all match.
  - Pure source scan: no `@vitest-environment jsdom` pragma.
- `src/components/layout/navbar/__tests__/nav-blog-suppression-render.test.tsx` (54 lines, 2 passing tests)
  - `@vitest-environment jsdom` pragma in the header docblock.
  - `render(<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/" />)` + `queryAllByRole("link")` filter on `href === "/blog"` (must be length 0).
  - `render(<NavbarMobileMenu isOpen={true} onOpenChange={() => {}} onClose={() => {}} navItems={DEFAULT_NAV_ITEMS} pathname="/" ctaText="Start free trial" ctaHref="/signup" isAuthenticated={false} />)` with the same assertion.

## Decisions Made

- **D-13 belt-and-suspenders override:** plan-checker recommended "source-scan OR render — either is sufficient"; user explicitly chose "Both." Source-scan catches direct edits to `DEFAULT_NAV_ITEMS`; render catches hook/config-injected drift the source-scan misses. Both ship.
- **Three-signal source-scan retention assertion:** instead of one regex spanning the comment, three independent assertions (`/AUDIT-2/`, `/deferr/i`, `/\/blog/`). Removing any one of those tokens from the source comment fails the test, so a future edit that hollows out the comment without removing all three keywords still trips the regression.
- **No `@ts-expect-error` probes shipped:** per D-23 + plan-checker Warning #3 + CLAUDE.md zero-tolerance rule #4. The `if (!("dropdownItems" in item)) continue;` in-narrowing pattern is already proven to compile by `types.test.ts:26` on the current `as const satisfies` declaration, so no empirical probe was needed in the first place.

## Deviations from Plan

**1. [Rule 1 - Bug] PATTERNS.md regex pattern needed adjustment for multi-line comment shape**

- **Found during:** Task 1 (source-scan test authoring)
- **Issue:** PATTERNS.md proposed `/AUDIT-2.*deferr/i` as a single regex — but the actual comment in `src/components/layout/navbar/types.ts` puts the "deferred" keyword on line 37 BEFORE the `AUDIT-2` token on line 38, so the proposed single-line regex `/AUDIT-2.*deferr/i` (no `s` flag, no multi-line) cannot match. First test run confirmed: the AUDIT-2 retention assertion failed.
- **Fix:** Split the single regex into three independent assertions: `/AUDIT-2/`, `/deferr/i`, `/\/blog/`. All three must match; removing any one breaks the test. Stronger guard than the original single-regex proposal.
- **Files modified:** `src/components/layout/navbar/__tests__/nav-blog-suppression-source.test.ts` (lines 48-54)
- **Verification:** `bunx vitest --run --project unit src/components/layout/navbar/__tests__/nav-blog-suppression-source.test.ts` — 3/3 passing.
- **Committed in:** `e9b8fb92c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in proposed regex pattern caught during first test run)
**Impact on plan:** The fix strengthens the regression pin: removing any of the three independent comment signals trips the test, vs. the original single-regex requiring both tokens to coexist on one line in a specific order.

## Issues Encountered

- **Worktree path leak (#3099):** First Write tool call accidentally landed `nav-blog-suppression-source.test.ts` in the main repo `/Users/richard/Developer/tenant-flow/src/...` instead of the worktree `/Users/richard/Developer/tenant-flow/.claude/worktrees/agent-a2bd1c3d953ef2a23/src/...`. Caught by `git status` after staging failed with "pathspec did not match." Fixed by re-Writing to the worktree-prefixed path and `rm` on the main-repo leak. Documented in worktree-path-safety.md exists for this exact failure mode; lesson reinforced.
- **Pre-commit unit-tests hook flakiness:** First commit attempt failed because the full 105k-test pre-commit unit suite produced 639 failures with "Invalid Chai property: toHaveAttribute / toBeInTheDocument" — pre-existing worker-pool / setupFiles race that Plan 15-04 is designed to fix. Retrying the same commit immediately afterward passed (worker pressure dropped between runs). Both commits eventually landed with all hooks (gitleaks, lint, typecheck, unit-tests, lockfile-verify) green.

## User Setup Required

None — pure test additions, no external configuration.

## Next Phase Readiness

- Phase 15 success criterion 5 (`/blog suppression pinned with regression tests`) is satisfied.
- `v1.0-MILESTONE-AUDIT.md` `tech_debt` cross-milestone item "/blog suppression pinned via comment, no regression test" is closed by this plan.
- Future blog content cohort un-deferral requires editing BOTH `nav-blog-suppression-source.test.ts` AND `nav-blog-suppression-render.test.tsx` — deliberate signal preserved.

## Self-Check: PASSED

- `src/components/layout/navbar/__tests__/nav-blog-suppression-source.test.ts` — FOUND (56 lines)
- `src/components/layout/navbar/__tests__/nav-blog-suppression-render.test.tsx` — FOUND (54 lines)
- Commit `e9b8fb92c` — FOUND (`test(15-05): add source-scan pin for /blog suppression in DEFAULT_NAV_ITEMS`)
- Commit `f992446ec` — FOUND (`test(15-05): add render-time pin for /blog suppression in NavbarDesktopNav and NavbarMobileMenu`)
- `git diff --stat HEAD~2 HEAD -- src/components/layout/navbar/` shows only the two new test files (110 insertions, 0 deletions)
- Combined run `bunx vitest --run --project unit nav-blog-suppression-source.test.ts nav-blog-suppression-render.test.tsx` — 5/5 passing
- Zero `@ts-expect-error` markers in either file
- Zero `as unknown as` casts
- Zero bare `any` types
- No modifications to STATE.md or ROADMAP.md (per orchestrator instruction)

---
*Phase: 15-v1-0-milestone-cleanup*
*Plan: 05*
*Completed: 2026-05-21*
