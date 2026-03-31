---
phase: 28-consumer-migration-dead-code-removal
plan: 02
subsystem: ui
tags: [react, tanstack-query, invitation, dropdown-menu, tenant-table]

# Dependency graph
requires:
  - phase: 28-01
    provides: useCreateInvitation hook, invitation mutation hooks, invitation query keys with invitation_url
provides:
  - InvitationTableRow component with resend, copy-link, and cancel dropdown actions
  - Pending invitations rendered inline in tenant list table
  - Invitation data wired from page.tsx through tenantInvitationQueries.list()
affects: [tenant-management, invitation-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-contained mutation components: InvitationTableRow calls mutation hooks directly instead of receiving callbacks via props"
    - "Inline invitation rows in same tbody as tenant rows (no separate table)"

key-files:
  created:
    - src/components/tenants/invitation-table-row.tsx
    - src/components/tenants/__tests__/invitation-table-row.test.tsx
  modified:
    - src/components/tenants/tenant-table.tsx
    - src/components/tenants/tenants.tsx
    - src/app/(owner)/tenants/page.tsx

key-decisions:
  - "InvitationTableRow calls useResendInvitationMutation and useCancelInvitationMutation directly rather than receiving callbacks from parent -- keeps component self-contained"
  - "Invitation rows render after virtualized tenant rows in the same tbody, not in a separate section"

patterns-established:
  - "Self-contained table row components: row components with actions can call mutation hooks directly to avoid prop drilling"

requirements-completed: [UI-05, UI-06]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 28 Plan 02: Pending Invitation Rows Summary

**Inline invitation rows in tenant table with resend, copy-link, and cancel dropdown actions via self-contained InvitationTableRow component**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T02:48:44Z
- **Completed:** 2026-03-31T02:53:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- InvitationTableRow component with 8-column layout matching TenantTableRow exactly (checkbox disabled, email in Name column, dashes for empty fields, status badge with relative timestamp, dropdown actions)
- Dropdown menu with Resend Invitation, Copy Invitation Link (conditional on URL), and Cancel Invitation with destructive confirmation dialog
- Tenant list page fetches pending invitations via tenantInvitationQueries.list() and renders them inline after tenant rows in the same tbody

## Task Commits

Each task was committed atomically:

1. **Task 1: Update TenantInvitation type and invitation list query** - `ad29fa57a` (feat) -- already committed by Wave 1 plans
2. **Task 2: Create InvitationTableRow component, integrate into TenantTable, wire data** - `11985faff` (feat)

## Files Created/Modified
- `src/components/tenants/invitation-table-row.tsx` - InvitationTableRow component with dropdown actions (resend, copy link, cancel) and confirmation dialog
- `src/components/tenants/__tests__/invitation-table-row.test.tsx` - Unit tests for component export and pattern validation
- `src/components/tenants/tenant-table.tsx` - Added invitations prop and InvitationTableRow rendering in tbody
- `src/components/tenants/tenants.tsx` - Pass invitations to TenantTable, update empty state check
- `src/app/(owner)/tenants/page.tsx` - Fetch pending invitations via tenantInvitationQueries.list() and pass to Tenants component

## Decisions Made
- InvitationTableRow calls mutation hooks directly (useResendInvitationMutation, useCancelInvitationMutation) instead of receiving callback props -- avoids prop drilling and keeps the component self-contained
- Kept onResendInvitation and onCancelInvitation in TenantsProps (conservative approach) -- they may be used by TenantDetailSheet or other features
- Invitation rows are appended after paginated tenant rows and are always visible regardless of pagination page index

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Handled exactOptionalPropertyTypes for invitation mapping**
- **Found during:** Task 2 (page.tsx invitation mapping)
- **Issue:** TypeScript strict mode with exactOptionalPropertyTypes requires conditional spread for optional properties rather than `propertyName: inv.property_name || undefined` which passes `undefined` explicitly
- **Fix:** Used conditional spread pattern `...(inv.property_name ? { propertyName: inv.property_name } : {})` for optional properties in the invitation mapping
- **Files modified:** src/app/(owner)/tenants/page.tsx
- **Verification:** pnpm typecheck passes
- **Committed in:** 11985faff (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix for strict TypeScript)
**Impact on plan:** Essential for correctness under strict TypeScript. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tenant list page now shows pending invitations with actionable dropdown menus
- Invitation management is fully wired with resend, copy link, and cancel actions
- Ready for any follow-up phases that build on tenant invitation visibility

---
## Self-Check: PASSED

All 5 files verified present. Both commit hashes (ad29fa57a, 11985faff) verified in git log.

---
*Phase: 28-consumer-migration-dead-code-removal*
*Completed: 2026-03-31*
