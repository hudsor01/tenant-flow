---
phase: 25-critical-corruption-broken-deletes
plan: 02
subsystem: ui
tags: [currency, lease-template, formatter, cents, regression-test]

# Dependency graph
requires:
  - phase: 25-critical-corruption-broken-deletes
    provides: CRIT-02 locked decision (keep cents, fix the formatter only)
provides:
  - "createDefaultContext + DEFAULT_CONTEXT format *Cents fields with the cents-in formatter (formatCents)"
  - "Regression test pinning the face-value lease-template money render"
affects: [lease-template, documents, pdf-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cents-stored template context formats with formatCents (cents-in), never formatCurrency (dollars-in)"

key-files:
  created:
    - src/lib/templates/lease-template.test.ts
  modified:
    - src/lib/templates/lease-template.ts

key-decisions:
  - "Swapped the whole file's import from formatCurrency to formatCents since all 6 money-format call sites are cents-valued (formatCurrency had no remaining use)"

patterns-established:
  - "Lease-template money is CENTS end-to-end (builder dollarsToCents -> context -> formatCents render); the wizard money model is DOLLARS and independent (CRIT-01)"

requirements-completed: [CRIT-02]

# Metrics
duration: 6min
completed: 2026-07-02
---

# Phase 25 Plan 02: Lease-Template Money Formatter Fix Summary

**Fixed CRIT-02: `/documents/lease-template` was rendering money 100x too high ($180,000 rent) because cents-valued fields were passed to the dollars-in `formatCurrency`; switched all six call sites to the cents-in `formatCents`, preserving the cents storage model.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-02T16:29:00Z
- **Completed:** 2026-07-02T16:31:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `createDefaultContext` and the `DEFAULT_CONTEXT` literal now format `rent_amountFormatted`, `security_depositFormatted`, and `late_fee_amountFormatted` via `formatCents`, so the default template renders `$1,800.00` rent, `$1,800.00` deposit, and `$50.00` late fee (was `$180,000.00` / `$5,000.00`).
- Added a 4-case regression suite that fails if the cents fields ever revert to the dollars-in formatter.
- Cents storage model preserved: the builder's `dollarsToCents` input path and the wizard files (CRIT-01) were left untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Format lease-template cents fields with formatCents** - `0c20cb1b4` (fix)
2. **Task 2: Add regression test for face-value template money** - `ce36f868b` (test)

## Files Created/Modified
- `src/lib/templates/lease-template.ts` - Import swapped `formatCurrency` -> `formatCents`; all 6 money-format sites (3 in `DEFAULT_CONTEXT`, 3 in `createDefaultContext`) now use the cents-in formatter. `*Cents` numeric values (180000 / 180000 / 5000) unchanged.
- `src/lib/templates/lease-template.test.ts` - New Vitest suite asserting default rent/deposit/late-fee render at face value from cents plus the `rent_amountCents: 250000 -> "$2,500.00"` override path.

## Decisions Made
- Replaced the module import outright (`formatCurrency` -> `formatCents`) rather than importing both, because after the fix `formatCurrency` had zero remaining call sites in the file. Grep-confirmed before and after.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Lint reports a single pre-existing info (`biome.json` schema `2.4.15` vs CLI `2.4.16`) unrelated to these files — out of scope, left untouched.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CRIT-02 complete; the lease-template preview and generated PDF now render face-value dollars.
- The two money models remain intentionally separate: lease-template = cents (this plan), lease wizard = dollars (CRIT-01). No unification attempted, per phase boundary.

## Self-Check: PASSED
- FOUND: `src/lib/templates/lease-template.ts`
- FOUND: `src/lib/templates/lease-template.test.ts`
- FOUND commit: `0c20cb1b4`
- FOUND commit: `ce36f868b`

---
*Phase: 25-critical-corruption-broken-deletes*
*Completed: 2026-07-02*
