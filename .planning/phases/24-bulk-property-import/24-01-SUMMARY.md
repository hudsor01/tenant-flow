---
phase: 24-bulk-property-import
plan: 01
subsystem: ui
tags: [papaparse, zod, csv, validation, bulk-import]

# Dependency graph
requires:
  - phase: none
    provides: existing propertyCreateSchema and ParsedRow type
provides:
  - Papa Parse CSV parser with Zod schema validation pipeline
  - Structured field-level error reporting for CSV rows
  - Updated ParsedRow type with parsed PropertyCreate field
  - Correct column names matching database schema
affects: [24-02 bulk import confirm step]

# Tech tracking
tech-stack:
  added: [papaparse, "@types/papaparse"]
  patterns: [Papa Parse header mode with Zod safeParse per row]

key-files:
  created: []
  modified:
    - src/components/properties/csv-utils.ts
    - src/types/api-contracts.ts
    - src/components/properties/__tests__/csv-utils.test.ts
    - src/components/properties/bulk-import-stepper.tsx
    - src/components/properties/bulk-import-validate-step.tsx
    - src/components/properties/__tests__/bulk-import-validate-step.test.tsx

key-decisions:
  - "Combined Task 1 and Task 2 into single atomic commit due to type interdependencies across files"
  - "Papa Parse transformHeader normalizes headers to lowercase with underscore separators"
  - "State and property_type uppercased before Zod validation for case-insensitive input"

patterns-established:
  - "CSV validation pattern: Papa Parse parse -> map fields -> Zod safeParse per row -> structured errors"

requirements-completed: [PROP-02]

# Metrics
duration: 6min
completed: 2026-03-18
---

# Phase 24 Plan 01: CSV Parsing Rewrite Summary

**Papa Parse + Zod validation pipeline replacing naive String.split CSV parser with structured field-level errors**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-18T15:37:55Z
- **Completed:** 2026-03-18T15:43:44Z
- **Tasks:** 2 (committed together as atomic change)
- **Files modified:** 8

## Accomplishments
- Replaced naive `String.split(',')` parser with Papa Parse for robust CSV parsing (handles quoted fields, commas in values)
- Added Zod `propertyCreateSchema.safeParse()` validation per row with structured `{ field, message }` errors
- Fixed column names from stub values (`address`, `description`) to match database schema (`address_line1`, `address_line2`, `country`)
- Added `CSV_MAX_ROWS=100` limit with `tooManyRows` flag and `totalRowCount`
- Updated `ParsedRow` type with `parsed: PropertyCreate | null` field

## Task Commits

Tasks 1 and 2 were committed together due to type interdependencies:

1. **Task 1+2: Install Papa Parse, update types, rewrite csv-utils** - `47d949d65` (feat)

## Files Created/Modified
- `src/types/api-contracts.ts` - Updated ParsedRow with structured errors and parsed field, added PropertyCreate import
- `src/components/properties/csv-utils.ts` - Full rewrite with Papa Parse + Zod validation, fixed column names
- `src/components/properties/__tests__/csv-utils.test.ts` - 22 test cases for new parseAndValidateCSV API
- `src/components/properties/bulk-import-stepper.tsx` - Updated to use parseAndValidateCSV instead of parseCSVFile
- `src/components/properties/bulk-import-validate-step.tsx` - Updated to use structured error .message accessor, address_line1 field
- `src/components/properties/__tests__/bulk-import-validate-step.test.tsx` - Updated for structured error format
- `package.json` - Added papaparse dependency
- `pnpm-lock.yaml` - Lockfile update

## Decisions Made
- Combined Task 1 (type change + install) and Task 2 (rewrite) into a single commit because the type change to ParsedRow breaks consumers that must be updated simultaneously
- Papa Parse `transformHeader` normalizes headers to lowercase+trimmed+underscored for case-insensitive header matching
- Country defaults to 'US' when empty, address_line2 converts empty string to undefined

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated bulk-import-validate-step.tsx for new error structure**
- **Found during:** Task 1
- **Issue:** Component accessed `row.errors[0]` as string, but type changed to `{ field, message }`
- **Fix:** Updated to `row.errors[0]?.message` and `row.data.address_line1`
- **Files modified:** src/components/properties/bulk-import-validate-step.tsx
- **Committed in:** 47d949d65

**2. [Rule 3 - Blocking] Updated bulk-import-stepper.tsx for new function name**
- **Found during:** Task 2
- **Issue:** Imported removed `parseCSVFile`, needed `parseAndValidateCSV`
- **Fix:** Updated import and call site (function is now sync, reads text separately)
- **Files modified:** src/components/properties/bulk-import-stepper.tsx
- **Committed in:** 47d949d65

**3. [Rule 3 - Blocking] Updated bulk-import-validate-step tests for new types**
- **Found during:** Task 1
- **Issue:** Test helper `createParsedRow` used `errors: string[]` and `address` field
- **Fix:** Updated to structured errors, `address_line1`, and added `parsed` field
- **Files modified:** src/components/properties/__tests__/bulk-import-validate-step.test.tsx
- **Committed in:** 47d949d65

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All auto-fixes necessary for type safety across dependent files. No scope creep.

## Issues Encountered
- Pre-commit hook runs typecheck on full codebase, requiring all interdependent type changes to be staged together. Tasks 1 and 2 could not be committed separately due to this constraint.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CSV parsing pipeline complete and tested
- Ready for Plan 02 (confirm step implementation using parsed/validated rows)
- `parseAndValidateCSV` returns `{ rows, tooManyRows, totalRowCount }` for UI consumption

---
*Phase: 24-bulk-property-import*
*Completed: 2026-03-18*
