---
phase: 10-cta-conversion
plan: 01
subsystem: testing
tags: [vitest, regression-pin, marketing-copy, testing-library, jsdom]

# Dependency graph
requires:
  - phase: 09-page-cleanup
    provides: "regression-pin pattern for shipped audit fixes (readFileSync source scan + render-based render pins)"
provides:
  - "CONS-06 regression pin: canonical 'Contact Sales' CTA-label scan across 7 marketing CTA files"
  - "CONS-07 regression pin: FeatureTable 'na' neutral-Minus render assertion + compare-data.ts 4-row count guard"
  - "CONS-08 regression pin: /contact referralSource select placeholder-state + 'Please select' source-text literal"
affects: [11-token-alignment, 12-seo-metadata]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure source-text scan tests carry NO @vitest-environment docblock and must avoid the literal word sequence 'environment' near 'pragma' in their docblock comment — Vitest's environment-docblock parser otherwise picks up the comment text as an environment name"
    - "Radix Select placeholder is not text-queryable in jsdom — pin placeholder STATE (empty value span / no leaked SelectItem label) in the render test and pin the literal placeholder string via a readFileSync source-text scan"

key-files:
  created:
    - src/app/__tests__/cta-label-canonical.test.ts
    - src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx
    - src/components/contact/__tests__/contact-form-fields.test.tsx
  modified: []

key-decisions:
  - "CONS-08 render assertion pins placeholder STATE (no hardcoded default selection in the #type trigger) rather than querying the 'Please select' string, because Radix SelectValue does not render its placeholder text into the DOM under jsdom"

patterns-established:
  - "Regression-pin test files for already-shipped audit fixes: per-file source-text scan loop + a presence-guard assertion, every expect() carrying a self-explaining 2nd message argument"
  - "Render-based pins for shipped UI fixes reuse the real exported component + real types (no redefinition, no casts, no any) with a fully-constructed type-satisfying fixture builder"

requirements-completed: [CONS-06, CONS-07, CONS-08]

# Metrics
duration: 6min
completed: 2026-05-20
---

# Phase 10 Plan 01: CTA-conversion regression pins Summary

**Three Vitest regression-pin test files (14 tests) locking the shipped CONS-06 canonical "Contact Sales" CTA label, CONS-07 neutral /compare/* "na" framing, and CONS-08 /contact "Please select" placeholder against future copy-edit drift — no production source touched.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-20T23:02:00Z
- **Completed:** 2026-05-20T23:08:30Z
- **Tasks:** 3
- **Files modified:** 3 (all new test files)

## Accomplishments

- CONS-06: `cta-label-canonical.test.ts` (8 tests) — source-text scan over 7 CTA files; fails if any of the 4 killed CTA-label variants ("Talk to Sales", "Connect with sales", "Schedule a walkthrough", "Schedule a demo") reappears, or if the canonical "Contact Sales" label disappears from every scanned file.
- CONS-07: `compare-neutral-framing.test.tsx` (4 tests) — renders `FeatureTable` with a crafted `CompetitorData` fixture; pins the by-design `'na'` row to a neutral muted `Minus` with `aria-label="Not applicable"` and `text-muted-foreground`, asserts no destructive color token, pins `compare-data.ts` to exactly 4 `tenantflow:"na"` rows, and pins the `FeatureSupport` `'na'` union member.
- CONS-08: `contact-form-fields.test.tsx` (2 tests) — renders `ContactFormFields`, pins the `referralSource` select to its placeholder state (no hardcoded SelectItem label leaked into the `#type` trigger), and source-text-pins the `placeholder="Please select"` literal while asserting no `placeholder="Sales Outreach"` default regression.

## Task Commits

Each task was committed atomically:

1. **Task 1: CONS-06 canonical "Contact Sales" CTA-label regression pin** - `c9bbd0d97` (test)
2. **Task 2: CONS-07 neutral /compare/* framing regression pin** - `e1f3fb5f7` (test)
3. **Task 3: CONS-08 /contact "Please select" placeholder regression pin** - `decd9da8e` (test)

## Files Created/Modified

- `src/app/__tests__/cta-label-canonical.test.ts` - CONS-06 pure source-text scan over the 7 CTA files for killed label variants + canonical-label presence.
- `src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx` - CONS-07 render-based pin of the `'na'` neutral Minus + `compare-data.ts` 4-row count guard.
- `src/components/contact/__tests__/contact-form-fields.test.tsx` - CONS-08 render-based placeholder-state pin + `placeholder="Please select"` source-text literal pin.

## Decisions Made

- **CONS-08 render assertion redesigned to pin placeholder STATE.** The plan's Task 3 Test 1 assumed `screen.getByText("Please select")` would find the Radix `SelectValue` placeholder when `formData.type` matches no `SelectItem`. Under jsdom the Radix `SelectValue` renders an empty `<span style="pointer-events:none">` — placeholder display is computed by a layout effect tied to the live selected item and does not run in jsdom. Rather than the brittle string query, the render test now pins the observable placeholder state: the `#type` trigger renders none of the six SelectItem labels (no hardcoded default selection). The exact `"Please select"` literal remains pinned by the unchanged source-text test. Net coverage of the CONS-08 intent is equivalent and the test is robust to jsdom Radix quirks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CONS-06 docblock triggered Vitest environment-parser crash**
- **Found during:** Task 1 (CONS-06 test)
- **Issue:** The plan's specified docblock comment contained the phrase "no @vitest-environment pragma". Vitest's environment-docblock parser matched the comment text and tried to load an environment module named `pragma`, crashing the run with `Failed to load url .../pragma`.
- **Fix:** Reworded the docblock to "Pure source scan that never touches the DOM." — removing the `@vitest-environment` token and the word "pragma" from the comment body.
- **Files modified:** src/app/__tests__/cta-label-canonical.test.ts
- **Verification:** `bunx vitest --run --project unit src/app/__tests__/cta-label-canonical.test.ts` passes (8 tests).
- **Committed in:** `c9bbd0d97` (Task 1 commit)

**2. [Rule 1 - Bug] CONS-08 Task-3 Test-1 assertion design was unrunnable under jsdom**
- **Found during:** Task 3 (CONS-08 test)
- **Issue:** Plan's Task 3 Test 1 (`screen.getByText("Please select")`) assumed Radix `SelectValue` renders its placeholder string into the DOM. It does not under jsdom — the value span is empty, so the query threw `Unable to find an element with the text: Please select`.
- **Fix:** Redesigned the render test to pin placeholder STATE — assert the `#type` trigger renders and that none of the six `SelectItem` labels leaked into the trigger as a hardcoded default. The exact literal stays pinned by the second (source-text) test.
- **Files modified:** src/components/contact/__tests__/contact-form-fields.test.tsx
- **Verification:** `bunx vitest --run --project unit src/components/contact/__tests__/contact-form-fields.test.tsx` passes (2 tests).
- **Committed in:** `decd9da8e` (Task 3 commit)

**3. [Rule 3 - Blocking] Biome format wrapping on the new test files**
- **Found during:** Task 1 and Task 2 (pre-commit lint hook)
- **Issue:** The hand-written `expect(...)` calls did not match Biome's line-wrapping; the pre-commit `lint` hook failed (commit did not happen).
- **Fix:** Reformatted the affected `expect()` calls to Biome's preference (Task 1 manually, Task 2 via `biome check --write`).
- **Files modified:** src/app/__tests__/cta-label-canonical.test.ts, src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx
- **Verification:** `bunx biome check <file>` clean on both; pre-commit hook passed on the subsequent commit.
- **Committed in:** `c9bbd0d97` / `e1f3fb5f7` (respective task commits)

---

**Total deviations:** 3 auto-fixed (2 bugs in plan-specified test code, 1 blocking lint formatting)
**Impact on plan:** All auto-fixes were necessary to make the plan's three test files actually run and commit. The CONS-08 redesign preserves the requirement's intent (the literal "Please select" placeholder is still pinned via source-text scan; the killed "Sales Outreach" default is still guarded). No scope creep — no production source touched, exactly 3 new test files as planned.

## Issues Encountered

- Pre-commit `lockfile-verify` hook fails inside the command sandbox (`PermissionDenied` on `bun install --frozen-lockfile`). Per the documented environment note, all three `git commit` calls were run with the command sandbox disabled — all five pre-commit checks plus commitlint then pass normally. No `--no-verify` was used.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 10-02 is ready to execute (the second plan in Phase 10).
- All 14 new tests run inside the `unit` Vitest project and are picked up by the lefthook pre-commit `unit-tests` gate and CI.
- No blockers.

## Self-Check: PASSED

- FOUND: src/app/__tests__/cta-label-canonical.test.ts
- FOUND: src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx
- FOUND: src/components/contact/__tests__/contact-form-fields.test.tsx
- FOUND commit: c9bbd0d97 (Task 1)
- FOUND commit: e1f3fb5f7 (Task 2)
- FOUND commit: decd9da8e (Task 3)

---
*Phase: 10-cta-conversion*
*Completed: 2026-05-20*
