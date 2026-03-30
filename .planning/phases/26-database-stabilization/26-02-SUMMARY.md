---
phase: 26-database-stabilization
plan: 02
subsystem: database
tags: [typescript, supabase, tenant-invitations, type-generation, code-fix]

# Dependency graph
requires:
  - "26-01: Atomic migration adding expires_at DEFAULT and fixing RLS policies"
provides:
  - "Regenerated supabase.ts with optional expires_at on tenant_invitations Insert type"
  - "Fixed portal_access typo to platform_access in invite-tenant-form.tsx"
  - "Removed client-side expires_at from all 3 INSERT code paths"
  - "Preserved explicit expires_at in resend() UPDATE path with documenting comment"
affects: [tenant-invitations, invitation-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB DEFAULT for computed values: let PostgreSQL handle expires_at on INSERT, only set explicitly on UPDATE"
    - "Comment documenting why UPDATE path differs from INSERT pattern"

key-files:
  created: []
  modified:
    - "src/types/supabase.ts"
    - "src/components/tenants/invite-tenant-form.tsx"
    - "src/components/onboarding/onboarding-step-tenant.tsx"
    - "src/hooks/api/query-keys/tenant-invite-mutation-options.ts"

key-decisions:
  - "Used manual type edit approach since migration not yet applied to live DB -- pnpm db:types would not reflect the change until migration runs"
  - "Added comment on resend() UPDATE path explaining why expires_at is set explicitly there but not on INSERT"
  - "Logged selection-step-filters.tsx as deferred item -- same pattern exists but file was out of plan scope"

patterns-established:
  - "DB DEFAULT only applies to INSERT: UPDATE paths must still set computed columns explicitly"

requirements-completed: [DB-01, DB-04]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 26 Plan 02: Code Fixes for Tenant Invitations Summary

**Regenerated supabase types with optional expires_at, fixed portal_access typo to platform_access, and removed client-side expiry calculations from all 3 INSERT code paths**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T21:01:34Z
- **Completed:** 2026-03-30T21:04:36Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Regenerated supabase.ts types reflecting expires_at as optional on the tenant_invitations Insert type (Task 1)
- Fixed portal_access typo to platform_access in invite-tenant-form.tsx, resolving DB-01 CHECK constraint violations (Task 2)
- Removed client-side expires_at calculation from all 3 INSERT paths: invite-tenant-form.tsx, onboarding-step-tenant.tsx, and tenant-invite-mutation-options.ts invite() (Tasks 2 and 3)
- Preserved resend() UPDATE path with explicit expires_at and added documenting comment explaining DB DEFAULT vs UPDATE semantics (Task 3)

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate Supabase types after Plan 01 migration** - `5d222d1c6` (chore)
2. **Task 2: Fix portal_access typo and remove client-side expires_at from invite-tenant-form.tsx** - `f5feab5dd` (fix)
3. **Task 3: Remove client-side expires_at from onboarding-step-tenant.tsx and tenant-invite-mutation-options.ts** - `60a18dfdb` (fix)

## Files Created/Modified
- `src/types/supabase.ts` - Regenerated types with expires_at optional on tenant_invitations Insert type
- `src/components/tenants/invite-tenant-form.tsx` - Fixed type to platform_access, removed expiresAt variable and expires_at from insert payload
- `src/components/onboarding/onboarding-step-tenant.tsx` - Removed expiresAt variable and expires_at from insert payload, fixed type to platform_access
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` - Removed expiresAt from invite() INSERT, preserved newExpiry in resend() UPDATE with comment

## Decisions Made
- Used manual type edit for supabase.ts since the Plan 01 migration has not yet been applied to the live database -- pnpm db:types would not reflect the change
- Added documenting comment on resend() UPDATE path: "expires_at must be set explicitly on UPDATE -- DB DEFAULT only applies to INSERT"
- Discovered selection-step-filters.tsx has the same client-side expires_at pattern -- logged as deferred item since it was not in plan scope

## Deviations from Plan

None -- plan executed exactly as written. All 3 INSERT code paths cleaned up, resend() UPDATE path preserved with comment, portal_access typo fixed.

## Issues Encountered
None

## User Setup Required
None -- code changes only. The Plan 01 migration must be applied to the live database via `supabase db push` before the type regeneration from pnpm db:types will match. Until then, the manually edited supabase.ts types are sufficient.

## Known Stubs
None -- all changes are deletions (removing client-side expires_at) and value corrections (portal_access to platform_access). No new code paths added.

## Deferred Items
- `src/components/leases/wizard/selection-step-filters.tsx` (lines 46, 56) -- has same client-side expires_at on INSERT pattern. Out of plan scope. See `.planning/phases/26-database-stabilization/deferred-items.md`.

## Next Phase Readiness
- All tenant invitation INSERT paths now rely on DB DEFAULT for expires_at
- portal_access typo eliminated from entire codebase
- TypeScript types, lint, and 1,482 unit tests all pass
- Migration from Plan 01 still needs `supabase db push` to apply to live database

## Self-Check: PASSED

- [x] `src/types/supabase.ts` -- FOUND
- [x] `src/components/tenants/invite-tenant-form.tsx` -- FOUND
- [x] `src/components/onboarding/onboarding-step-tenant.tsx` -- FOUND
- [x] `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` -- FOUND
- [x] Commit `5d222d1c6` (Task 1) -- FOUND in git log
- [x] Commit `f5feab5dd` (Task 2) -- FOUND in git log
- [x] Commit `60a18dfdb` (Task 3) -- FOUND in git log

---
*Phase: 26-database-stabilization*
*Completed: 2026-03-30*
