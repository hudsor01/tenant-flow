---
phase: 22-gdpr-data-rights
plan: 01
subsystem: api
tags: [gdpr, edge-function, data-export, supabase, deno, jwt, privacy]

requires:
  - phase: 21-email-invitations
    provides: "Edge Function patterns (CORS, env validation, JWT auth, error handling)"
provides:
  - "export-user-data Edge Function for GDPR Article 20 data portability"
  - "Role-aware data queries (OWNER gets properties/leases/financials, TENANT gets lease/payment/maintenance)"
  - "Downloadable JSON response with Content-Disposition attachment header"
affects: [22-gdpr-data-rights]

tech-stack:
  added: []
  patterns: [role-aware-data-export, service-role-bypass-for-export, pre-fetch-ids-for-in-filter]

key-files:
  created:
    - supabase/functions/export-user-data/index.ts
    - supabase/functions/tests/export-user-data-test.ts
  modified: []

key-decisions:
  - "Service role client used for data queries to bypass RLS and ensure complete data export"
  - "Pre-fetch lease/maintenance IDs before main Promise.all batch to avoid nested joins"
  - "ADMIN role treated as OWNER for data export (same data access pattern)"
  - "PENDING users get profile-only export (no role-specific data)"
  - "Expenses queried via maintenance_request_id join rather than direct owner_user_id"

patterns-established:
  - "Pre-fetch ID pattern: collect FK IDs first, then use .in() filter in parallel batch"
  - "Role-aware export: single endpoint branching on user_type for different data sets"

requirements-completed: [GDPR-01, GDPR-03]

duration: 5min
completed: 2026-03-11
---

# Phase 22 Plan 01: Export User Data Summary

**Role-aware GDPR data export Edge Function with JWT auth, parallel queries via Promise.all, and downloadable JSON attachment for both OWNER and TENANT roles**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T21:07:56Z
- **Completed:** 2026-03-11T21:10:19Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files created:** 2

## Accomplishments
- Edge Function at `supabase/functions/export-user-data/index.ts` that exports all personal data for authenticated users
- Owner export includes: profile, properties, units, leases, rent_due, rent_payments, maintenance_requests, documents, expenses
- Tenant export includes: profile, tenant record, leases (via lease_tenants), rent_due, rent_payments, maintenance_requests
- 14 Deno integration tests covering CORS, method rejection, auth, and response format validation
- All list queries bounded with `.limit(10000)` safety limit
- Independent queries parallelized with `Promise.all()` for performance

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests for export-user-data** - `862f1f6` (test)
2. **Task 1 (GREEN): Implement export-user-data Edge Function** - `c45319f` (feat)

## Files Created/Modified
- `supabase/functions/export-user-data/index.ts` - Role-aware data export Edge Function (315 lines)
- `supabase/functions/tests/export-user-data-test.ts` - 14 Deno integration tests (275 lines)

## Decisions Made
- **Service role client for queries:** Used service_role key to bypass RLS, ensuring complete data export regardless of policy restrictions. The authenticated user's identity is still verified via JWT before any queries run.
- **Pre-fetch ID pattern:** Owner lease IDs and maintenance IDs are fetched first, then used in `.in()` filters for rent_due, rent_payments, and expenses. This avoids complex nested joins while keeping queries parallelized.
- **ADMIN as OWNER:** Admin users get the same data export as owners (properties, leases, financials). Separate admin export is not needed since admins have the same data ownership pattern.
- **PENDING users:** Users who haven't selected a role get profile-only export. No role-specific data exists for them.
- **Expenses via maintenance_request_id:** Rather than adding owner_user_id to the expenses query directly, expenses are fetched through the maintenance_requests relationship using pre-fetched IDs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The Edge Function uses existing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY environment variables already configured.

## Next Phase Readiness
- Backend data export is complete and ready for frontend integration in plan 22-02
- Plan 22-02 will wire the export button in owner settings and tenant profile UI to call this Edge Function
- Account deletion UI (also in 22-02) is independent of this export function

## Self-Check: PASSED

- FOUND: supabase/functions/export-user-data/index.ts
- FOUND: supabase/functions/tests/export-user-data-test.ts
- FOUND: 862f1f6 (test commit)
- FOUND: c45319f (feat commit)

---
*Phase: 22-gdpr-data-rights*
*Completed: 2026-03-11*
