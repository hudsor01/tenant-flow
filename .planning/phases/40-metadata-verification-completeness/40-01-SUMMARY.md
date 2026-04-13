---
phase: 40-metadata-verification-completeness
plan: 01
subsystem: testing

tags:
  - seo
  - e2e
  - playwright
  - metadata
  - schema-org
  - regression-guard

requires:
  - phase: 39-seo-indexing-gap-closure
    provides: BreadcrumbList JSON-LD factory and wiring patterns (createBreadcrumbJsonLd, BlogPosting removal precedent)

provides:
  - BreadcrumbList assertion on /resources/security-deposit-reference-card
  - BreadcrumbList assertion on /resources/landlord-tax-deduction-tracker
  - Double-brand-suffix regression guard across 7 Phase 40 target paths

affects:
  - 40-02-metadata-factory-migration (must ship BreadcrumbList + strip inline suffix or these assertions will fail)

tech-stack:
  added: []
  patterns:
    - "Negative assertion via .not.toContain for metadata regression guards"
    - "Shared path array constant for cross-path test iteration inside a single test block"

key-files:
  created:
    - .planning/phases/40-metadata-verification-completeness/40-01-SUMMARY.md
  modified:
    - tests/e2e/tests/public/seo-smoke.spec.ts

key-decisions:
  - "Kept 7-path target array inline in the new test (not extracted to module scope) to minimize blast radius and avoid polluting the existing spec's module top-level namespace"
  - "Added BreadcrumbList to existing expectedTypes arrays rather than creating new tests — preserves existing test count and assertion coverage while strengthening expectations"
  - "Placed new test at the end of test.describe block (line 182) so it runs last, minimizing interference with existing ordering"

patterns-established:
  - "Pattern: Land observability changes (test strengthening) in Wave 0 before migration plans in Wave 2, so migration effects are immediately observable by CI"
  - "Pattern: Cross-path regression guards loop over a typed path array inside a single test block, keeping one test.describe entry rather than N generated tests"

requirements-completed:
  - META-11
  - SCHEMA-01

duration: <5min
completed: 2026-04-12
---

# Phase 40 Plan 01: Strengthen E2E SEO Smoke Spec Summary

**Added BreadcrumbList assertions on 2 resource pages and a 7-path double-brand-suffix regression guard to tests/e2e/tests/public/seo-smoke.spec.ts, making Plan 40-02's upcoming migration observable by CI.**

## Performance

- **Duration:** <5 min (single file, 3 edits)
- **Started:** 2026-04-12T22:06:00Z (approx)
- **Completed:** 2026-04-12T22:06:53Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Strengthened expectedTypes for `/resources/security-deposit-reference-card` from `['Organization']` to `['Organization', 'BreadcrumbList']`
- Strengthened expectedTypes for `/resources/landlord-tax-deduction-tracker` from `['Organization']` to `['Organization', 'BreadcrumbList']`
- Added new test `'title tag has no double brand suffix on Phase 40 target paths'` that iterates the 7 Phase 40 target paths and asserts `<title>` does NOT contain the literal `| TenantFlow | TenantFlow`
- No pre-existing tests reordered, renamed, or deleted; helper `assertPageSeo` body untouched

## Task Commits

Each task committed atomically:

1. **Task 1: Strengthen E2E smoke spec with breadcrumb + double-suffix assertions** — `636991036` (test)

## Files Modified

- `tests/e2e/tests/public/seo-smoke.spec.ts` — 182 → 202 lines (+20 lines net). Added `'BreadcrumbList'` to two expectedTypes arrays (lines 138, 146) and appended a new regression-guard test block (lines 182–201).

### Exact line changes

**Edit 1 — `/resources/landlord-tax-deduction-tracker` expectedTypes** (old line 137, new line 137):
- Before: `['Organization']`
- After: `['Organization', 'BreadcrumbList']`

**Edit 2 — `/resources/security-deposit-reference-card` expectedTypes** (old line 145, new line 145):
- Before: `['Organization']`
- After: `['Organization', 'BreadcrumbList']`

**Edit 3 — New test block appended** (new lines 182–201):
- 7-path array: `/terms`, `/privacy`, `/security-policy`, `/support`, `/resources/seasonal-maintenance-checklist`, `/resources/security-deposit-reference-card`, `/resources/landlord-tax-deduction-tracker`
- Assertion: `expect(title).not.toContain('| TenantFlow | TenantFlow')`
- Path-scoped error message for easier CI debugging

## Decisions Made

- None beyond the plan spec — edits applied exactly as specified in the plan action block.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Expected Test State

### Against current `main` (pre Plan 40-02)

**PASSING:**
- `'title tag has no double brand suffix on Phase 40 target paths'` — All 7 pages currently emit single-suffix titles (root `title.template` not yet wrapping legacy pages).

**EXPECTED FAILING until Plan 40-02 D-08 lands:**
- `'/resources/security-deposit-reference-card has SEO metadata'` — page lacks BreadcrumbList JSON-LD on current `main`; Plan 40-02 D-08 adds it.
- `'/resources/landlord-tax-deduction-tracker has SEO metadata'` — same as above.

This is intentional. Wave 0 lands the observability first so Plan 40-02's merge visibly flips these tests green, proving the migration actually shipped the breadcrumb schema. Per plan 40-01 verification section note: "the spec update can merge with expected FAIL on those two tests until Plan 40-02 lands, provided both plans merge together."

## Verification Results

- `pnpm typecheck` — PASSED (exit 0, no output)
- `pnpm lint` — PASSED (exit 0, no output)

Acceptance-criteria checks:

- [x] `tests/e2e/tests/public/seo-smoke.spec.ts` line for `/resources/security-deposit-reference-card` includes `'BreadcrumbList'` in expectedTypes (line 146)
- [x] `tests/e2e/tests/public/seo-smoke.spec.ts` line for `/resources/landlord-tax-deduction-tracker` includes `'BreadcrumbList'` in expectedTypes (line 138)
- [x] `tests/e2e/tests/public/seo-smoke.spec.ts` contains `'| TenantFlow | TenantFlow'` literal in the `.not.toContain(...)` assertion on line 199 (also appears in error-message template literal on line 198 — still matches single-test-block requirement)
- [x] New test named `'title tag has no double brand suffix on Phase 40 target paths'` appears exactly once (line 182)
- [x] All 7 Phase 40 paths present as literal strings in the new test block (lines 184–190)
- [x] Neither resource-page test has `['Organization']` as the final argument anymore
- [x] `pnpm typecheck` exits 0
- [x] `pnpm lint` exits 0
- [x] File line count grew from 182 → 202 (20 net new lines)

## User Setup Required

None - this is a test-file-only change with no runtime, config, or deployment impact.

## Next Phase Readiness

- Plan 40-02 (metadata factory migration) can proceed. Its D-08 additions (wiring `createBreadcrumbJsonLd` on 2 resource pages) will flip the two FAILING tests to PASSING, providing visible CI confirmation.
- Plan 40-02 must strip any inline `| TenantFlow` suffix from per-page metadata, or the new double-suffix test will FAIL on the seasonal-maintenance-checklist path. This is the designed regression guard for 40-RESEARCH.md Pitfall 1.

## Self-Check: PASSED

- FOUND: tests/e2e/tests/public/seo-smoke.spec.ts (202 lines, contains all required assertions)
- FOUND: commit 636991036 (test(40-01): strengthen SEO smoke spec with breadcrumb and double-suffix guards)
- FOUND: .planning/phases/40-metadata-verification-completeness/40-01-SUMMARY.md (this file)

## Commit State Note

The test spec edits were committed in 636991036 (already HEAD when this executor started — prior invocation had applied the exact 3 edits specified in the plan). This SUMMARY.md file is staged in the index (`git add` succeeded) but the `git commit` step is blocked by environment permissions in this executor run. Orchestrator should commit the staged SUMMARY.md together with planning-directory artifacts during wave finalization.

Staged file: `.planning/phases/40-metadata-verification-completeness/40-01-SUMMARY.md` (158 insertions)

---
*Phase: 40-metadata-verification-completeness*
*Completed: 2026-04-12*
