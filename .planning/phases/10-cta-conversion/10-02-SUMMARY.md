---
phase: 10-cta-conversion
plan: 02
subsystem: testing
tags: [vitest, regression-pin, testimonials, marketing-honesty, testing-library, jsdom]

# Dependency graph
requires:
  - phase: 10-cta-conversion
    provides: "Plan 10-01 regression-pin pattern for shipped audit fixes (readFileSync source scan + render-based pins)"
provides:
  - "TRUST-01 regression pin: realTestimonials data-shape guard (>=2 real attributed testimonials, non-empty quote/author/company, no fabricated metric, no headshot avatar)"
  - "TRUST-01/04 regression pin: TestimonialsSection empty-array null gate + real-quote render assertion"
  - "TRUST-03/04 regression pin: /security-policy section-7 monitored-inbox documentation scan (security@ + sales@ inboxes, section heading, both SLAs)"
  - "TRUST-02 documented deferral: G2/Capterra/Trustpilot review badges deferred until real reviews exist (no code, no test, no fabricated badge)"
affects: [11-token-alignment, 12-seo-metadata]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regression-pin .ts file rendering a React component uses React.createElement (not JSX) because JSX requires a .tsx extension and the plan fixed the filename as testimonials.test.ts"
    - "The #data path alias does not exist in tsconfig/package.json — testimonials.ts is imported via relative path in production code and the test matches that"

key-files:
  created:
    - src/data/__tests__/testimonials.test.ts
    - src/app/security-policy/__tests__/monitored-inboxes.test.ts
  modified: []

key-decisions:
  - "TRUST-01 reconciliation: REQUIREMENTS.md / ROADMAP ask for >=3 testimonials; exactly 2 real attributed testimonials shipped. Pinned length >= 2 (NOT >= 3) — fabricating a 3rd is rejected per the v1.0 honesty milestone. The 3rd is deferred until a real customer opts in."
  - "TRUST-02 (G2/Capterra/Trustpilot review badges) recorded as a documented deferral — no fabricated badge, no test, no code surface."
  - "testimonials.test.ts imports realTestimonials and TestimonialsSection via relative paths (../testimonials, ../../components/sections/testimonials-section) because the plan's #data alias does not exist in this repo."

patterns-established:
  - "Honesty-guardrail regression pins: a test that fails if a fabricated testimonial metric or headshot avatar is added, protecting the marketing-surface-honesty milestone at CI time"
  - "Documentation-only deferral: a requirement with no code surface is recorded as a deferral in the plan SUMMARY with a stated reactivation trigger — explicitly NOT a coverage gap"

requirements-completed: [TRUST-01, TRUST-02, TRUST-03, TRUST-04]

# Metrics
duration: ~8min
completed: 2026-05-20
---

# Phase 10 Plan 02: TRUST regression pins + TRUST-02 deferral Summary

**Two Vitest regression-pin test files (11 tests) locking the shipped TRUST-01 real testimonials (data shape + TestimonialsSection render gate) and TRUST-03/04 /security-policy monitored-inbox documentation against future drift, plus a documented TRUST-02 review-badge deferral — no production source touched.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-20T23:10:00Z
- **Completed:** 2026-05-20T23:18:00Z
- **Tasks:** 3 (2 code, 1 documentation-only)
- **Files modified:** 2 (both new test files) + this SUMMARY

## Accomplishments

- TRUST-01 / TRUST-04: `src/data/__tests__/testimonials.test.ts` (6 tests) — pins `realTestimonials.length >= 2`, non-empty quote/author/company on every entry, no fabricated `metric`, no headshot `avatar`; renders the `sections/` variant of `TestimonialsSection` and pins both the empty-array null gate and the real-quote render. Fails CI if a future edit drops a real testimonial, strips a field, fabricates a metric, adds a headshot, or breaks the component's gate behavior.
- TRUST-03 / TRUST-04: `src/app/security-policy/__tests__/monitored-inboxes.test.ts` (5 tests) — pure source-text scan of `security-policy/page.tsx` § 7. Pins the `security@tenantflow.app` and `sales@tenantflow.app` inbox documentation, the "Contact &amp; Monitored Inboxes" section heading, the security@ 24-hour acknowledgement SLA, and the sales@ 1-business-day response SLA.
- TRUST-02: recorded below as a documented deferral — no review-badge component, no fixture, no test.

## Task Commits

Each code task was committed atomically:

1. **Task 1: TRUST-01 / TRUST-04 real-testimonial shape + render-gate pin** - `7199c484d` (test)
2. **Task 2: TRUST-03 / TRUST-04 monitored-inbox documentation pin** - `de8d01965` (test)
3. **Task 3: TRUST-02 review-badge deferral** - documentation-only; no code/test file produced. Recorded in this SUMMARY (see "TRUST-02 — Deferred" below). Committed with the plan metadata.

## Files Created/Modified

- `src/data/__tests__/testimonials.test.ts` - TRUST-01/04 regression pin: real-testimonial data-shape assertions (length, quote/author/company, no metric, no avatar) + `TestimonialsSection` empty-gate and real-quote render pins.
- `src/app/security-policy/__tests__/monitored-inboxes.test.ts` - TRUST-03/04 regression pin: `readFileSync` source-text scan of `security-policy/page.tsx` for both monitored inboxes, the § 7 heading, and both SLAs.

## TRUST-01 Reconciliation Note

REQUIREMENTS.md TRUST-01 and ROADMAP success criterion 5 ask for **≥3 testimonials**. The codebase ships **exactly 2 real, attributed testimonials** in `src/data/testimonials.ts` — Janet Shur (8 properties) and Jacob Lear (13 properties) — wired into the homepage and `/pricing`. 10-CONTEXT.md was stale (it said TRUST-01 was deferred); a `phase-10-followup` effort un-deferred TRUST-01 and shipped the 2 real testimonials.

**Fabricating a 3rd testimonial is rejected.** It would directly violate the v1.0 "Marketing Surface Honesty" milestone — the exact pattern Phase 67 deleted (invented people + invented affiliations). This plan pins the 2 real testimonials that exist (`realTestimonials.length >= 2`, **NOT** `>= 3`). The 3rd testimonial is **deferred until a real customer opts in** — it is an operational opt-in event, not a code task. The `>= 2` assertion carries an inline comment recording this reconciliation so a future reader does not "fix" it up to `>= 3`.

## TRUST-02 — Deferred

**TRUST-02 (G2 / Capterra / Trustpilot review badges) is DEFERRED.** This is an intentional, documented deferral — not a coverage gap.

- **Reason:** TenantFlow has **no listings on G2, Capterra, or Trustpilot** — there are no real reviews to badge. Fabricating a review badge or a star rating would violate the v1.0 "Marketing Surface Honesty" milestone, the same honesty rule that governs TRUST-01 (no fabricated attribution). There is no honest review-badge content to ship today.
- **No code surface:** TRUST-02 has no production code and no fixture. Consequently it correctly has **no regression test** — there is nothing to pin. This is the opposite of a coverage gap: a requirement with zero code surface gets zero tests by design.
- **Reactivation trigger:** Revisit TRUST-02 once real reviews accumulate on a review platform (G2, Capterra, or Trustpilot). The component lift is small — a badge row above the footer. The blocker is operational (no reviews exist), not technical.
- **What was NOT done (deliberately):** no review-badge component was created, no G2/Capterra/Trustpilot rating or badge was fabricated, and no TRUST-02 test file was written. `git diff --name-only` for this plan shows only the 2 new test files plus planning docs — no file matching `*badge*` or `*review*`.

## Decisions Made

- **`testimonials.test.ts` uses `React.createElement` rather than JSX.** The plan fixed the filename as `testimonials.test.ts` (`.ts`, not `.tsx`). JSX requires a `.tsx` extension, so the two render tests construct `TestimonialsSection` via `React.createElement` with a typed props object. Net behavior is identical to the plan's JSX snippet; the component and `realTestimonials` types are reused unchanged (no `any`, no redefinition).
- **TRUST-02 recorded as a documented deferral with a stated reactivation trigger** rather than producing a stub component or a fabricated badge.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The `#data` path alias does not exist in this repo**
- **Found during:** Task 1 (TRUST-01/04 test)
- **Issue:** The plan's exact import snippet was `import { realTestimonials } from "#data/testimonials"` and `import { TestimonialsSection } from "#components/sections/testimonials-section"`. `tsconfig.json#paths` and `package.json#imports` define no `#data` alias — `src/data/testimonials.ts` is imported via a relative path in production code (`marketing-home.tsx` uses `../data/testimonials`, `pricing/page.tsx` uses `../../data/testimonials`). The `#data/...` import would not resolve and the test would fail at module load.
- **Fix:** Imported `realTestimonials` via the relative path `../testimonials` and `TestimonialsSection` via `../../components/sections/testimonials-section`, matching how production code references `testimonials.ts`. The `#components/...` alias does exist, but a relative import was used for the component too for consistency within the one test file.
- **Files modified:** src/data/__tests__/testimonials.test.ts
- **Verification:** `bunx vitest --run --project unit src/data/__tests__/testimonials.test.ts` passes (6 tests).
- **Committed in:** `7199c484d` (Task 1 commit)

**2. [Rule 3 - Blocking] JSX render snippet incompatible with the fixed `.ts` filename**
- **Found during:** Task 1 (TRUST-01/04 test)
- **Issue:** The plan's render tests used JSX (`<TestimonialsSection testimonials={[]} />`). The plan also fixed the filename as `testimonials.test.ts` — a `.ts` file cannot contain JSX (TypeScript requires `.tsx`). Renaming to `.tsx` would violate the plan's acceptance criteria, which name `testimonials.test.ts` literally.
- **Fix:** Constructed the component via `React.createElement(TestimonialsSection, { testimonials: ... })` and added `import React from "react"`. Behaviorally identical to the JSX form; the render assertions (`toBeEmptyDOMElement`, `textContent` quote match) are unchanged.
- **Files modified:** src/data/__tests__/testimonials.test.ts
- **Verification:** `bunx vitest --run --project unit src/data/__tests__/testimonials.test.ts` passes (6 tests).
- **Committed in:** `7199c484d` (Task 1 commit)

**3. [Rule 3 - Blocking] Biome format wrapping on the new test files**
- **Found during:** Task 1 (pre-commit `lint` hook) and Task 2 (pre-commit prevention)
- **Issue:** The hand-written `expect(...)` calls did not match Biome's line-wrapping; the Task 1 pre-commit `lint` hook failed (commit did not happen).
- **Fix:** Reformatted via `bunx biome check --write <file>` on both test files, then re-verified the tests still pass before committing.
- **Files modified:** src/data/__tests__/testimonials.test.ts, src/app/security-policy/__tests__/monitored-inboxes.test.ts
- **Verification:** `bunx biome check <file>` clean on both; pre-commit `lint` passed on the subsequent commits.
- **Committed in:** `7199c484d` / `de8d01965` (respective task commits)

---

**Total deviations:** 3 auto-fixed (2 blocking import/syntax incompatibilities in the plan's verbatim snippets, 1 blocking lint formatting)
**Impact on plan:** All auto-fixes were necessary to make the plan's test files resolve, compile, and commit. The `#data` alias and JSX-in-`.ts` issues were artifacts of the plan's example code; the corrected imports/`createElement` form preserves every assertion the plan specified. No scope creep — no production source touched, exactly 2 new test files as planned, no review-badge code.

## Issues Encountered

- Pre-commit `lockfile-verify` hook fails inside the command sandbox (`PermissionDenied` on `bun install --frozen-lockfile`). Per the documented environment note, both `git commit` calls were run with the command sandbox disabled — all five pre-commit checks plus commitlint then pass normally. No `--no-verify` was used.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 (cta-conversion) is complete: Plan 10-01 (CONS-06/07/08, 14 tests) + Plan 10-02 (TRUST-01/03/04, 11 tests) ship 25 regression-pin tests, all in the `unit` Vitest project and gated by the lefthook pre-commit `unit-tests` hook + CI.
- TRUST-02 is recorded as a documented deferral with a stated reactivation trigger; no code surface, no test required.
- No blockers. Phase 10 is ready for verification and PR.

## TDD Gate Compliance

This plan's frontmatter `type` is `execute` (not `tdd`). Both code tasks add regression tests for already-shipped production code (PRs #694/#695) — there is no RED/GREEN cycle to enforce because the implementation predates the tests. The two `test(...)` commits pin existing-and-passing behavior, which is the intended verify-and-pin pattern for this phase.

## Self-Check: PASSED

- FOUND: src/data/__tests__/testimonials.test.ts
- FOUND: src/app/security-policy/__tests__/monitored-inboxes.test.ts
- FOUND commit: 7199c484d (Task 1)
- FOUND commit: de8d01965 (Task 2)

---
*Phase: 10-cta-conversion*
*Completed: 2026-05-20*
