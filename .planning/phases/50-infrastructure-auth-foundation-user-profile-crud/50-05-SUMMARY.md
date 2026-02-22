---
phase: 50-infrastructure-auth-foundation-user-profile-crud
plan: 05
subsystem: frontend-hooks
tags: [supabase, postgrest, feature-flag, identity-verification, tour-progress]

# Dependency graph
requires:
  - 50-01 (isPostgrestEnabled() helper, Supabase anon key client)
provides:
  - use-identity-verification.ts: dual-path PostgREST (users table read) / NestJS (session creation stays)
  - use-tour-progress.ts: dual-path PostgREST (user_tour_progress table) / NestJS (full legacy path)

affects:
  - Identity verification onboarding flow (Stripe Identity)
  - Owner/tenant onboarding tour UI

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Identity verification status read from users table columns (no separate table)
    - Tour progress upsert with onConflict: 'user_id,tour_key' composite key
    - localStorage fallback for tour progress failures (both PostgREST and NestJS paths)
    - Partial PostgREST migration: session creation stays NestJS (server-side Stripe SDK required)

key-files:
  modified:
    - apps/frontend/src/hooks/api/use-identity-verification.ts
    - apps/frontend/src/hooks/api/use-tour-progress.ts

key-decisions:
  - "useCreateIdentityVerificationSessionMutation keeps NestJS path: Stripe Identity SDK is server-side only; cannot be called from browser client; comment documents this constraint with future Phase 55 Edge Function reference"
  - "useIdentityVerificationStatus PostgREST path: reads users table columns directly (identity_verification_status, identity_verification_session_id, identity_verification_data, identity_verification_error, identity_verified_at) via .eq('id', user.id).single()"
  - "Tour progress upsert: onConflict: 'user_id,tour_key' ensures idempotent updates; no need to check existence first"
  - "Tour progress localStorage fallback: preserved in both PostgREST and NestJS error paths so UI never blocks on API failures"
  - "resetTourProgress PostgREST path: upserts with status: 'not_started', current_step: 0, completed_at: null, skipped_at: null — NestJS equivalent at /api/v1/users/tours/:key/reset"

patterns-established:
  - "Partial migration: mutation stays NestJS when server-side SDK required; documented with comment citing future phase"
  - "localStorage as progressive enhancement: completion status persisted locally so tour state survives API failures"

requirements-completed:
  - CRUD-05 (complete — all Phase 50 hooks migrated: use-profile, use-auth, use-sessions, use-emergency-contact, use-notifications, use-owner-notification-settings, use-identity-verification, use-tour-progress)

# Metrics
duration: 25min
completed: 2026-02-22
---

# Phase 50-05: Migrate use-identity-verification.ts + use-tour-progress.ts

**Both hooks migrated to dual-path PostgREST/NestJS controlled by isPostgrestEnabled(). Identity verification status reads users table directly; session creation remains NestJS (Stripe Identity SDK server-side only). Tour progress uses upsert with localStorage fallback.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-22T04:45:00Z
- **Completed:** 2026-02-22T05:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Migrated `use-identity-verification.ts`: `useIdentityVerificationStatus()` reads `identity_verification_*` columns from `users` table directly; `useCreateIdentityVerificationSessionMutation()` stays NestJS (server-side Stripe SDK)
- Migrated `use-tour-progress.ts`: all three exported functions (`getTourProgress`, `updateTourProgress`, `resetTourProgress`) have dual-path with PostgREST reading/writing `user_tour_progress` table; localStorage fallback preserved
- Zero TypeScript errors on typecheck
- All 965 frontend unit tests pass

## Task Commits

1. **Task 1: Migrate use-identity-verification.ts** — dual-path for status query; session creation intentionally stays NestJS with explanatory comment
2. **Task 2: Migrate use-tour-progress.ts** — dual-path for all three functions; upsert pattern with onConflict composite key; localStorage fallback retained

## Files Created/Modified

- `apps/frontend/src/hooks/api/use-identity-verification.ts` — Modified: added isPostgrestEnabled() dual-path to useIdentityVerificationStatus(); session creation mutation left on NestJS
- `apps/frontend/src/hooks/api/use-tour-progress.ts` — Modified: added isPostgrestEnabled() dual-path to getTourProgress(), updateTourProgress(), resetTourProgress()

## Decisions Made

### Identity verification session creation stays NestJS
`useCreateIdentityVerificationSessionMutation()` calls Stripe Identity via `/api/v1/identity/verification-session`. This requires the server-side Stripe SDK which cannot run in the browser. The mutation is intentionally left on the NestJS path with a comment: `// Session creation requires server-side Stripe API — stays on NestJS until Phase 55 Edge Functions`. A future Edge Function could replace this, but that is out of scope for Phase 50.

### Identity verification reads users table columns
The `identity_verification_*` columns are stored directly on the `users` table (not a separate table). The PostgREST path selects exactly those 5 columns from `users` filtered by `id = user.id`. This avoids a JOIN and maps cleanly to `IdentityVerificationRecord`.

### Tour progress upsert with composite conflict key
`updateTourProgress` and `resetTourProgress` use `.upsert({...}, { onConflict: 'user_id,tour_key' })` rather than checking for existence first. This is idempotent and avoids a read-before-write pattern.

### localStorage fallback preserved
The original `use-tour-progress.ts` already had localStorage as a fallback for API failures. This fallback is preserved in both the PostgREST and NestJS error paths — if either path fails, the function returns the localStorage status rather than throwing. This prevents broken API from blocking the onboarding tour UI.

## Phase 50 Complete

All 8 hooks in Phase 50 are now migrated to dual-path PostgREST/NestJS:

| Hook | PostgREST path | NestJS fallback |
|---|---|---|
| use-profile.ts | profiles table | /api/v1/profile |
| use-auth.ts | supabase.auth.* | /api/v1/auth/* |
| use-sessions.ts | auth.getSession() (current only) | /api/v1/users/sessions |
| use-emergency-contact.ts | tenants table columns | /api/v1/tenant-portal/* |
| use-notifications.ts | notifications table | /api/v1/notifications/* |
| use-owner-notification-settings.ts | notification_settings table | /api/v1/notification-settings |
| use-identity-verification.ts | users table columns | /api/v1/identity/* |
| use-tour-progress.ts | user_tour_progress table | /api/v1/users/tours/* |

## Deviations from Plan

None — both tasks executed as specified.

## Issues Encountered

None — TypeScript typecheck passes with zero errors. All 965 frontend unit tests pass after both migrations.

## User Setup Required

None — no external service configuration required. Feature flag `NEXT_PUBLIC_USE_POSTGREST=true` activates PostgREST path; omitting or setting to any other value uses NestJS fallback.

## Next Phase Readiness

- Phase 50 complete — all 5 plans executed
- Next phase in v7.0 milestone: Phase 53 (Properties + Units hooks migration)

---
*Phase: 50-infrastructure-auth-foundation-user-profile-crud*
*Completed: 2026-02-22*
