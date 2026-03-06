---
phase: 07-ux-accessibility
plan: 06
subsystem: ui
tags: [metadata, next.js, beforeunload, autofocus, accessibility]

requires:
  - phase: 07-ux-accessibility
    provides: "Accessibility patterns, component conventions, error boundaries"
provides:
  - "Page title metadata for all owner and tenant pages"
  - "useUnsavedChangesWarning hook for form data protection"
  - "autoFocus on primary form inputs"
  - "CLAUDE.md Phase 7 conventions"
affects: [future-forms, new-pages]

tech-stack:
  added: []
  patterns:
    - "Title template in root metadata (child pages set page name only)"
    - "Layout files for metadata on client component pages"
    - "useUnsavedChangesWarning(isDirty) hook pattern"
    - "autoFocus on primary input per form"

key-files:
  created:
    - "src/hooks/use-unsaved-changes.ts"
    - "src/app/(owner)/dashboard/layout.tsx"
    - "src/app/(owner)/properties/layout.tsx"
    - "src/app/(owner)/tenants/layout.tsx"
    - "src/app/(owner)/leases/layout.tsx"
    - "src/app/(owner)/units/layout.tsx"
    - "src/app/(owner)/reports/layout.tsx"
    - "src/app/(owner)/rent-collection/layout.tsx"
    - "src/app/(owner)/financials/layout.tsx"
    - "src/app/(owner)/analytics/layout.tsx"
    - "src/app/(owner)/settings/layout.tsx"
    - "src/app/(owner)/profile/layout.tsx"
    - "src/app/(tenant)/tenant/lease/layout.tsx"
    - "src/app/(tenant)/tenant/maintenance/layout.tsx"
    - "src/app/(tenant)/tenant/documents/layout.tsx"
    - "src/app/(tenant)/tenant/settings/layout.tsx"
    - "src/app/(tenant)/tenant/payments/layout.tsx"
    - "src/app/(tenant)/tenant/profile/layout.tsx"
  modified:
    - "src/lib/generate-metadata.ts"
    - "src/app/(owner)/maintenance/page.tsx"
    - "src/app/(owner)/inspections/page.tsx"
    - "src/app/(owner)/documents/page.tsx"
    - "src/components/leases/wizard/lease-creation-wizard.tsx"
    - "src/components/properties/property-form.client.tsx"
    - "src/components/tenants/invite-tenant-form.tsx"
    - "src/app/(auth)/login/page.tsx"
    - "src/components/properties/sections/property-info-section.tsx"
    - "src/components/leases/wizard/selection-step.tsx"
    - "src/components/tenants/invite-tenant-info-fields.tsx"
    - "CLAUDE.md"

key-decisions:
  - "Title template '%s | TenantFlow' in root metadata enables child pages to set only page name"
  - "Layout files used for metadata on client component pages (cannot export metadata from 'use client' files)"
  - "useUnsavedChangesWarning uses currentStep > 0 for wizard (not TanStack isDirty) since wizard tracks step progress"
  - "autoFocus on property combobox search rather than label input in lease wizard"

patterns-established:
  - "Title template: root layout has template, child pages set page-specific title only"
  - "Metadata layouts: create layout.tsx with metadata export for client component pages"
  - "Unsaved changes: call useUnsavedChangesWarning(isDirty) in forms and multi-step wizards"

requirements-completed: [UX-16, UX-17, UX-21, DOC-01]

duration: 7min
completed: 2026-03-06
---

# Phase 7 Plan 6: Page Metadata, Unsaved Changes Warning, and CLAUDE.md Update Summary

**Title template metadata for 20 pages, beforeunload unsaved-changes hook for 3 forms, autoFocus on 4 primary inputs, and CLAUDE.md Phase 7 conventions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T16:34:42Z
- **Completed:** 2026-03-06T16:42:00Z
- **Tasks:** 2
- **Files modified:** 30

## Accomplishments
- Added title template to root metadata and descriptive titles to all 20 key owner/tenant pages via layout files
- Created useUnsavedChangesWarning hook and integrated into lease wizard, property form, and tenant invite form
- Added autoFocus to login email, property name, tenant invite email, and lease wizard property search
- Updated CLAUDE.md with accessibility rules, component conventions, and form conventions from Phase 7

## Task Commits

Each task was committed atomically:

1. **Task 1: Add page metadata and unsaved changes warning hook** - `8d1c48f6a` (feat)
2. **Task 2: Add autoFocus to primary form inputs and update CLAUDE.md** - `e713ed08e` (feat)

## Files Created/Modified
- `src/lib/generate-metadata.ts` - Added title template `%s | TenantFlow` to root metadata
- `src/hooks/use-unsaved-changes.ts` - New hook using beforeunload event for form data protection
- `src/app/(owner)/*/layout.tsx` (11 files) - Metadata exports for owner client component pages
- `src/app/(tenant)/tenant/*/layout.tsx` (6 files) - Metadata exports for tenant client component pages
- `src/app/(owner)/documents/page.tsx` - Added metadata export (server component)
- `src/app/(owner)/maintenance/page.tsx` - Updated title to use template format
- `src/app/(owner)/inspections/page.tsx` - Updated title to use template format
- `src/components/leases/wizard/lease-creation-wizard.tsx` - Integrated useUnsavedChangesWarning
- `src/components/properties/property-form.client.tsx` - Integrated useUnsavedChangesWarning
- `src/components/tenants/invite-tenant-form.tsx` - Integrated useUnsavedChangesWarning
- `src/app/(auth)/login/page.tsx` - autoFocus on email input
- `src/components/properties/sections/property-info-section.tsx` - autoFocus on property name input
- `src/components/tenants/invite-tenant-info-fields.tsx` - autoFocus on email input
- `src/components/leases/wizard/selection-step.tsx` - autoFocus on property search combobox
- `CLAUDE.md` - Added Accessibility Rules, Component Conventions, and Form Conventions sections

## Decisions Made
- Title template '%s | TenantFlow' in root metadata: child pages only set page name, " | TenantFlow" is auto-appended
- Layout files for client component metadata: Next.js does not allow metadata exports from 'use client' files, so thin layout.tsx files with metadata were created
- Lease wizard uses `currentStep !== 'selection'` for dirty detection (more appropriate than TanStack isDirty since the wizard tracks multi-step progress)
- autoFocus placed on ComboboxInput in lease wizard (first interactive element in Step 1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lease wizard path difference**
- **Found during:** Task 1 (useUnsavedChangesWarning integration)
- **Issue:** Plan referenced `src/components/leases/create/lease-creation-wizard.tsx` but actual path is `src/components/leases/wizard/lease-creation-wizard.tsx`
- **Fix:** Used the correct file path
- **Files modified:** `src/components/leases/wizard/lease-creation-wizard.tsx`

**2. [Rule 3 - Blocking] Property form path difference**
- **Found during:** Task 1 (useUnsavedChangesWarning integration)
- **Issue:** Plan referenced `src/components/properties/property-form.tsx` but actual file is `src/components/properties/property-form.client.tsx`
- **Fix:** Used the correct file path
- **Files modified:** `src/components/properties/property-form.client.tsx`

---

**Total deviations:** 2 auto-fixed (2 blocking path corrections)
**Impact on plan:** Path corrections only, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 7 (UX & Accessibility) is now complete with all 6 plans executed
- All pages have descriptive browser tab titles
- Form data protection in place for multi-step forms
- Ready for Phase 8

## Self-Check: PASSED

All 19 created files verified present. Both task commits (8d1c48f6a, e713ed08e) verified in git log.

---
*Phase: 07-ux-accessibility*
*Completed: 2026-03-06*
