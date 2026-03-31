---
phase: 28-consumer-migration-dead-code-removal
plan: 01
subsystem: invitation-flow
tags: [migration, dead-code, hooks, refactor]
dependency_graph:
  requires: []
  provides: [useCreateInvitation-hook, invitation-utils, INVITATION_ACCEPT_PATH]
  affects: [invite-tenant-form, onboarding-step-tenant, selection-step-filters, tenants-store]
tech_stack:
  added: []
  patterns: [unified-hook-pattern, discriminated-union-result, duplicate-detection-toast]
key_files:
  created:
    - src/hooks/api/use-create-invitation.ts
    - src/hooks/api/__tests__/use-create-invitation.test.tsx
    - src/lib/invitation-utils.ts
    - src/lib/constants/routes.ts
    - src/components/onboarding/__tests__/onboarding-step-tenant.test.tsx
    - src/components/leases/wizard/__tests__/selection-step-filters.test.tsx
  modified:
    - src/components/tenants/invite-tenant-form.tsx
    - src/components/onboarding/onboarding-step-tenant.tsx
    - src/components/leases/wizard/selection-step-filters.tsx
    - src/hooks/api/query-keys/tenant-invite-mutation-options.ts
    - src/hooks/api/use-tenant-invite-mutations.ts
    - src/hooks/api/__tests__/use-tenant.test.tsx
    - src/components/tenants/tenants.tsx
    - src/stores/tenants-store.ts
    - src/types/sections/tenants.ts
    - src/app/(owner)/tenants/page.tsx
  deleted:
    - src/components/tenants/invite-tenant-modal.tsx
decisions:
  - Unified useCreateInvitation hook with discriminated union result (created vs duplicate)
  - handleDuplicateInvitation shared utility for info toast with resend action
  - INVITATION_ACCEPT_PATH constant for URL construction consistency
  - Router.push for invite navigation instead of Zustand modal state
metrics:
  duration: 782s
  completed: 2026-03-31T02:35:00Z
  tasks: 2/2
  files: 17
---

# Phase 28 Plan 01: Consumer Migration & Dead Code Removal Summary

Migrated all 3 invitation creation consumers to a unified useCreateInvitation() hook with duplicate detection, deleted the legacy InviteTenantModal component, and removed all dead Zustand store state, types, and references.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Migrate consumers to useCreateInvitation | 895cb4bd7 | Created hook, utility, migrated 3 consumers, added 19 tests |
| 2 | Delete InviteTenantModal and dead code | 147b0c564 | Deleted modal, cleaned store/types/page (272 lines removed) |

## What Changed

### Task 1: Consumer Migration

**Created:**
- `src/hooks/api/use-create-invitation.ts` -- Unified hook with duplicate pre-check, 23505 race condition handling, type derivation (lease_signing vs platform_access), and standardized cache invalidation
- `src/lib/invitation-utils.ts` -- Shared `handleDuplicateInvitation()` toast utility showing info toast with resend action button
- `src/lib/constants/routes.ts` -- `INVITATION_ACCEPT_PATH` constant for URL construction
- 3 test files covering hook behavior and migration validation

**Migrated:**
- `invite-tenant-form.tsx` -- Replaced 60-line inline useMutation with 5-line useCreateInvitation() call
- `onboarding-step-tenant.tsx` -- Replaced 65-line inline useMutation with 5-line useCreateInvitation() call
- `selection-step-filters.tsx` -- Replaced 60-line inline useMutation with 5-line useCreateInvitation() call

**Updated:**
- `tenant-invite-mutation-options.ts` -- Removed old `invite()` factory, exported `sendInvitationEmail` for reuse
- `use-tenant-invite-mutations.ts` -- Removed `useInviteTenantMutation` (replaced by useCreateInvitation)
- `use-tenant.test.tsx` -- Removed test for deleted `useInviteTenantMutation`

### Task 2: Dead Code Removal

**Deleted:**
- `src/components/tenants/invite-tenant-modal.tsx` (224 lines) -- Legacy modal component

**Cleaned:**
- `tenants.tsx` -- Removed InviteTenantModal import/render, modal state, replaced openInviteModal with router.push('/tenants/new')
- `tenants-store.ts` -- Removed isInviteModalOpen, openInviteModal, closeInviteModal from state/actions/selectors
- `sections/tenants.ts` -- Deleted InviteTenantData interface, removed onInviteTenant callback from TenantsProps
- `tenants/page.tsx` -- Removed handleInviteTenant callback and onInviteTenant prop

## Decisions Made

1. **Unified hook returns discriminated union** -- `{ status: 'created', invitation }` or `{ status: 'duplicate', existing }` lets consumers handle UX-specific responses without coupling the hook to any specific toast pattern
2. **Shared handleDuplicateInvitation utility** -- Centralizes the info toast with resend action across all 3 consumers per D-07
3. **Router navigation replaces Zustand modal state** -- The intercepting route at `@modal/(.)tenants/new` handles modal display, making Zustand modal state redundant
4. **exactOptionalPropertyTypes handled** -- CreateInvitationParams uses `string | undefined` for optional fields to satisfy TypeScript strict mode

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phase 27 prerequisite files missing from worktree**
- **Found during:** Task 1 setup
- **Issue:** useCreateInvitation hook and INVITATION_ACCEPT_PATH constant from Phase 27 were on the parent branch but not in this worktree
- **Fix:** Created files directly from parent branch content (git show)
- **Files created:** src/hooks/api/use-create-invitation.ts, src/lib/constants/routes.ts
- **Commit:** 895cb4bd7

**2. [Rule 1 - Bug] exactOptionalPropertyTypes type errors**
- **Found during:** Task 1 typecheck
- **Issue:** CreateInvitationParams had `property_id?: string` but consumers passed `string | undefined`, violating exactOptionalPropertyTypes
- **Fix:** Changed to `property_id?: string | undefined` and added null guards for noUncheckedIndexedAccess
- **Commit:** 895cb4bd7

**3. [Rule 1 - Bug] created_at nullable in Supabase type**
- **Found during:** Task 1 typecheck
- **Issue:** `created_at` from tenant_invitations is `string | null` in the generated Supabase types, but invitation-utils passed it directly to Date constructor
- **Fix:** Added null check with 'recently' fallback
- **Commit:** 895cb4bd7

## Verification Results

- `pnpm typecheck` -- PASS (0 errors)
- `pnpm lint` -- PASS (0 errors)
- All 19 tests pass (8 hook tests, 7 property tests, 4 migration validation tests)
- Zero dead code references: `InviteTenantModal`, `isInviteModalOpen`, `InviteTenantData` all absent from src/
- Dashboard `onInviteTenant` preserved (5 references in dashboard tree)
- All 3 consumers import and call `useCreateInvitation()`

## Known Stubs

None -- all functionality is wired to real hooks with working mutation logic.

## Self-Check: PASSED

- src/hooks/api/use-create-invitation.ts -- FOUND
- src/lib/invitation-utils.ts -- FOUND
- src/lib/constants/routes.ts -- FOUND
- src/components/tenants/invite-tenant-modal.tsx -- CONFIRMED DELETED
- Commit 895cb4bd7 -- FOUND
- Commit 147b0c564 -- FOUND
