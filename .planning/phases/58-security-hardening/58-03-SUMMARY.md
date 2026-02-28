---
phase: 58-security-hardening
plan: 03
subsystem: api, ui
tags: [security, sentry, postgrest, sanitization, auth-guard, react, tanstack-query]

# Dependency graph
requires:
  - phase: 58-security-hardening
    provides: Edge Function security hardening (plans 01-02)
provides:
  - requireOwnerUserId guard utility with Sentry warning
  - sanitizeSearchInput utility for PostgREST filter injection prevention
  - Auth-loading shimmer on all 7 form submit buttons
affects: [frontend-mutations, search-queries, form-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireOwnerUserId guard pattern for mutation hooks"
    - "sanitizeSearchInput before all PostgREST ilike/textSearch calls"
    - "useCurrentUser isAuthLoading + animate-pulse on form submit buttons"
    - "Vendor search debounce with useDebouncedCallback (300ms)"

key-files:
  created:
    - apps/frontend/src/lib/require-owner-user-id.ts
    - apps/frontend/src/lib/sanitize-search.ts
    - apps/frontend/src/lib/__tests__/require-owner-user-id.test.ts
    - apps/frontend/src/lib/__tests__/sanitize-search.test.ts
  modified:
    - apps/frontend/src/hooks/api/use-properties.ts
    - apps/frontend/src/hooks/api/use-unit.ts
    - apps/frontend/src/hooks/api/use-maintenance.ts
    - apps/frontend/src/hooks/api/use-lease.ts
    - apps/frontend/src/hooks/api/use-inspections.ts
    - apps/frontend/src/hooks/api/use-vendor.ts
    - apps/frontend/src/hooks/api/use-tenant-portal.ts
    - apps/frontend/src/hooks/api/query-keys/property-keys.ts
    - apps/frontend/src/hooks/api/query-keys/tenant-keys.ts
    - apps/frontend/src/hooks/api/query-keys/unit-keys.ts
    - apps/frontend/src/components/properties/property-form.client.tsx
    - apps/frontend/src/components/properties/add-unit-panel.tsx
    - apps/frontend/src/components/properties/sections/property-form-actions.tsx
    - apps/frontend/src/components/units/unit-form.client.tsx
    - apps/frontend/src/components/units/unit-form-fields.tsx
    - apps/frontend/src/components/maintenance/maintenance-form.client.tsx
    - apps/frontend/src/components/leases/lease-form.tsx
    - apps/frontend/src/components/inspections/new-inspection-form.client.tsx
    - apps/frontend/src/components/maintenance/vendor-form-dialog.tsx
    - apps/frontend/src/components/maintenance/vendors-page.client.tsx

key-decisions:
  - "Used Sentry.captureMessage at warning level for undefined owner_user_id rather than error level"
  - "Stripped PostgREST-dangerous characters (commas, dots, parens, quotes, backslashes) while preserving % for ILIKE wildcards"
  - "Applied 300ms debounce to vendor search to complement sanitization"

patterns-established:
  - "requireOwnerUserId: call at top of mutationFn to fail-fast before any Supabase call"
  - "sanitizeSearchInput: call before any .ilike() or .textSearch() PostgREST filter"
  - "isAuthLoading shimmer: useCurrentUser() + disabled={... || isAuthLoading} + cn(isAuthLoading && 'animate-pulse')"

requirements-completed: [SEC-05, SEC-06]

# Metrics
duration: 45min
completed: 2026-02-26
---

# Phase 58 Plan 03: Frontend Security Utilities Summary

**requireOwnerUserId guard on 7 mutations, sanitizeSearchInput on 4 search queries, and auth-loading shimmer on 7 form submit buttons**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-02-26T10:00:00Z
- **Completed:** 2026-02-26T10:45:00Z
- **Tasks:** 3
- **Files modified:** 24

## Accomplishments
- Created `requireOwnerUserId` utility that throws user-friendly error and logs Sentry warning when owner_user_id is undefined in mutations
- Created `sanitizeSearchInput` utility that strips PostgREST-dangerous characters (commas, dots, parens, quotes, backslashes), preserves ILIKE wildcards (%), and enforces 100-char max length
- Wired `requireOwnerUserId` into all 7 create mutation hooks (properties, units, maintenance, leases, inspections, vendors, tenant-portal)
- Wired `sanitizeSearchInput` into all 4 search query locations (property-keys, tenant-keys, unit-keys, vendor search)
- Added 300ms debounce to vendor search using useDebouncedCallback
- Disabled 7 form submit buttons while auth is loading with Tailwind animate-pulse shimmer animation
- All 985 unit tests + 21 RLS integration tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create requireOwnerUserId and sanitizeSearchInput with tests (TDD)** - `7e64676a0` (feat)
2. **Task 2: Wire requireOwnerUserId into 7 mutations and sanitizeSearchInput into 4 search queries** - `c48b62e01` (feat)
3. **Task 3: Disable submit buttons while auth is loading with shimmer animation** - `c9acbc977` (feat)

## Files Created/Modified

### Created
- `apps/frontend/src/lib/require-owner-user-id.ts` - Guard utility: throws on undefined owner_user_id with Sentry warning
- `apps/frontend/src/lib/sanitize-search.ts` - PostgREST search input sanitizer (strips dangerous chars, preserves %, enforces max length)
- `apps/frontend/src/lib/__tests__/require-owner-user-id.test.ts` - 4 test cases for guard utility
- `apps/frontend/src/lib/__tests__/sanitize-search.test.ts` - 14 test cases for sanitizer (covers all dangerous chars, injection payloads, edge cases)

### Modified (Mutations - requireOwnerUserId)
- `apps/frontend/src/hooks/api/use-properties.ts` - Guard in useCreatePropertyMutation
- `apps/frontend/src/hooks/api/use-unit.ts` - Guard in useCreateUnitMutation
- `apps/frontend/src/hooks/api/use-maintenance.ts` - Guard in useMaintenanceRequestCreateMutation
- `apps/frontend/src/hooks/api/use-lease.ts` - Guard in useCreateLeaseMutation
- `apps/frontend/src/hooks/api/use-inspections.ts` - Guard in useCreateInspection
- `apps/frontend/src/hooks/api/use-vendor.ts` - Guard in useCreateVendorMutation + sanitizeSearchInput for vendor search
- `apps/frontend/src/hooks/api/use-tenant-portal.ts` - Guard on lease-derived owner_user_id in createRentPaymentMutation

### Modified (Search Queries - sanitizeSearchInput)
- `apps/frontend/src/hooks/api/query-keys/property-keys.ts` - Sanitize property search input
- `apps/frontend/src/hooks/api/query-keys/tenant-keys.ts` - Sanitize tenant search input
- `apps/frontend/src/hooks/api/query-keys/unit-keys.ts` - Sanitize unit search input

### Modified (Form Components - Auth Loading Shimmer)
- `apps/frontend/src/components/properties/property-form.client.tsx` - useCurrentUser + isAuthLoading prop to actions
- `apps/frontend/src/components/properties/sections/property-form-actions.tsx` - isAuthLoading prop, disabled + animate-pulse
- `apps/frontend/src/components/properties/add-unit-panel.tsx` - useCurrentUser, disabled + animate-pulse
- `apps/frontend/src/components/units/unit-form.client.tsx` - useCurrentUser, isAuthLoading prop to fields
- `apps/frontend/src/components/units/unit-form-fields.tsx` - isAuthLoading prop, disabled + animate-pulse
- `apps/frontend/src/components/maintenance/maintenance-form.client.tsx` - useCurrentUser, disabled + animate-pulse
- `apps/frontend/src/components/leases/lease-form.tsx` - useCurrentUser, disabled + animate-pulse
- `apps/frontend/src/components/inspections/new-inspection-form.client.tsx` - useCurrentUser, disabled + animate-pulse
- `apps/frontend/src/components/maintenance/vendor-form-dialog.tsx` - useCurrentUser, disabled + animate-pulse

### Modified (Vendor Search Debounce)
- `apps/frontend/src/components/maintenance/vendors-page.client.tsx` - 300ms debounce with useDebouncedCallback

### Modified (Test Mocks)
- `apps/frontend/src/components/maintenance/__tests__/maintenance-form.test.tsx` - Added useCurrentUser mock
- `apps/frontend/src/components/leases/__tests__/lease-form.test.tsx` - Added useCurrentUser mock
- `apps/frontend/src/components/properties/__tests__/add-unit-panel.test.tsx` - Added useCurrentUser mock
- `apps/frontend/src/components/properties/__tests__/property-form.test.tsx` - Added useCurrentUser mock
- `apps/frontend/src/components/properties/__tests__/property-units-table.test.tsx` - Added useCurrentUser mock

## Decisions Made
- Used Sentry `captureMessage` at `warning` level (not error) for undefined owner_user_id since it indicates a UX/auth flow issue, not a crash
- Stripped PostgREST-dangerous characters (`,`, `.`, `(`, `)`, `"`, `'`, `\`) while preserving `%` for ILIKE wildcards -- targeted approach rather than blanket alphanumeric-only filter
- Added 300ms debounce to vendor search as a complementary defense alongside sanitization (not in original plan but follows deviation Rule 2 for input validation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added vendor search debounce (300ms)**
- **Found during:** Task 2 (wiring sanitizeSearchInput into vendor search)
- **Issue:** Vendor search had no debounce, sending queries on every keystroke
- **Fix:** Added `useDebouncedCallback` with 300ms delay alongside sanitization
- **Files modified:** apps/frontend/src/components/maintenance/vendors-page.client.tsx
- **Verification:** Vendor search still functions, debounce reduces query volume
- **Committed in:** c48b62e01 (Task 2 commit)

**2. [Rule 1 - Bug] Updated 5 test files with useCurrentUser mock**
- **Found during:** Task 3 (adding auth-loading state to form buttons)
- **Issue:** Adding `useCurrentUser()` to 7 form components caused 94 test failures across 5 test files that lacked the mock
- **Fix:** Added `vi.mock('#hooks/use-current-user', ...)` returning `{ isLoading: false }` to all 5 failing test files
- **Files modified:** maintenance-form.test.tsx, lease-form.test.tsx, add-unit-panel.test.tsx, property-form.test.tsx, property-units-table.test.tsx
- **Verification:** All 985 tests pass, 0 failures
- **Committed in:** c9acbc977 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness and test stability. No scope creep.

## Issues Encountered
- Tab-indented TypeScript files caused Edit tool string matching failures -- resolved by using Python scripts for edits in those files
- Unicode em-dash character in tenant-keys.ts comments caused string matching to fail -- resolved with Python unicode escape sequences

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SEC-05 (owner_user_id guard) and SEC-06 (search sanitization) requirements fully satisfied
- All frontend mutation hooks now have owner_user_id guards with Sentry logging
- All search queries sanitized against PostgREST filter injection
- All form submit buttons protected against premature submission during auth loading
- Ready for any remaining security hardening plans

## Self-Check: PASSED

- All 4 created files exist on disk
- All 3 task commits verified in git log (7e64676a0, c48b62e01, c9acbc977)
- SUMMARY.md file exists at expected path

---
*Phase: 58-security-hardening*
*Completed: 2026-02-26*
