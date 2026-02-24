---
phase: 50-infrastructure-auth-foundation-user-profile-crud
plan: 03
subsystem: frontend-hooks
tags: [supabase, postgrest, feature-flag, sessions, emergency-contact, auth]

# Dependency graph
requires:
  - 50-01 (isPostgrestEnabled() helper, Supabase anon key client)
provides:
  - use-sessions.ts: dual-path PostgREST (current session via getSession) / NestJS (full session list)
  - use-emergency-contact.ts: dual-path PostgREST (tenants table direct) / NestJS (tenant portal API)
affects:
  - Tenant portal settings page (emergency contact form)
  - User account security settings (sessions list)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual-path queryFn: isPostgrestEnabled() branch with Supabase client, else apiRequest fallback
    - Browser client session access limitation: supabase.auth.getSession() only (no admin.listUserSessions)
    - Emergency contact stored in tenants table columns (emergency_contact_name/phone/relationship)
    - User identity inside mutationFn: supabase.auth.getUser() called per-mutation (not module scope)

key-files:
  modified:
    - apps/frontend/src/hooks/api/use-sessions.ts
    - apps/frontend/src/hooks/api/use-emergency-contact.ts

key-decisions:
  - "Sessions PostgREST path: supabase.auth.admin.listUserSessions() requires service_role key — not available in browser client. PostgREST path returns current session only via supabase.auth.getSession()"
  - "Session revoke PostgREST path: only current session can be revoked via supabase.auth.signOut(); other sessions fall back to apiRequest regardless of feature flag"
  - "Emergency contact PostgREST read: supabase.from('tenants').select(...).eq('user_id', user.id).maybeSingle() — RLS enforces ownership; returns null if record or fields are null"
  - "Emergency contact delete: implemented as update-to-null (not DELETE) — tenant record must be preserved per 7-year retention; only the three emergency contact fields are cleared"
  - "userId obtained from supabase.auth.getUser() inside each mutationFn — not stored at module scope"

patterns-established:
  - "Session list limitation documented with comment: browser client cannot call Admin API"
  - "Partial PostgREST migration: revoke falls through to apiRequest for non-current sessions with explanatory comment"
  - "Emergency contact mapped: DB snake_case columns → camelCase EmergencyContact interface in both paths"

requirements-completed:
  - CRUD-05 (partial — sessions and emergency contact migrated; remaining hooks in 50-04 and 50-05)

# Metrics
duration: 20min
completed: 2026-02-22
---

# Phase 50-03: Migrate use-sessions.ts + use-emergency-contact.ts

**Both hooks migrated to dual-path PostgREST/NestJS controlled by isPostgrestEnabled(). Sessions use current-session-only PostgREST path (browser client limitation); emergency contact maps tenants table columns directly.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-02-22T04:25:00Z
- **Completed:** 2026-02-22T04:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Migrated `use-sessions.ts`: `useUserSessions()` returns current session via `supabase.auth.getSession()` when PostgREST enabled; `useRevokeSessionMutation()` calls `supabase.auth.signOut()` for current session, falls back to apiRequest for others
- Migrated `use-emergency-contact.ts`: `emergencyContactQueries.contact()` queries `tenants` table directly; `useUpdateEmergencyContact()` and `useDeleteEmergencyContact()` update tenants columns via PostgREST
- Zero TypeScript errors on typecheck
- All 965 frontend unit tests pass

## Task Commits

Each task committed atomically:

1. **Task 1: Migrate use-sessions.ts** — dual-path queryFn/mutationFn with PostgREST current-session path and NestJS full-session fallback
2. **Task 2: Migrate use-emergency-contact.ts** — dual-path for query, update mutation, and delete mutation; all reading user identity from getUser() per-call

## Files Created/Modified

- `apps/frontend/src/hooks/api/use-sessions.ts` — Modified: added isPostgrestEnabled() dual-path to useUserSessions() and useRevokeSessionMutation()
- `apps/frontend/src/hooks/api/use-emergency-contact.ts` — Modified: added isPostgrestEnabled() dual-path to emergencyContactQueries.contact(), useUpdateEmergencyContact(), useDeleteEmergencyContact()

## Decisions Made

### Sessions architecture constraint
`supabase.auth.admin.listUserSessions()` requires the `service_role` key, which must never be used in a browser client. The PostgREST path therefore returns only the current session via `supabase.auth.getSession()`. The NestJS path (when PostgREST is disabled) continues to return the full multi-session list from `/api/v1/users/sessions`. This is an acceptable tradeoff — the current session is always available; listing other sessions is a less-used security feature.

### Session revocation partial fallback
Even when PostgREST is enabled, revoking sessions other than the current one requires the Admin API. The `useRevokeSessionMutation()` therefore has a partial PostgREST path: it calls `supabase.auth.signOut()` if the session being revoked matches the current access token, but falls through to `apiRequest` for all other session IDs. A comment documents this constraint.

### Emergency contact delete as update-to-null
The emergency contact "delete" operation sets `emergency_contact_name`, `emergency_contact_phone`, and `emergency_contact_relationship` to `null` via a PostgREST `.update()` call. It does NOT delete the tenant record. This follows the 7-year retention policy — tenant records must be preserved as financial records. Clearing the three columns effectively removes the emergency contact while keeping the tenant row intact.

## Deviations from Plan

None — both tasks executed exactly as specified. The sessions architecture constraint (Admin API limitation) was anticipated in the plan and handled as described.

## Issues Encountered

None — TypeScript typecheck passes with zero errors. All 965 frontend unit tests pass after both migrations.

## User Setup Required

None — no external service configuration required. Feature flag `NEXT_PUBLIC_USE_POSTGREST=true` activates PostgREST path; omitting or setting to any other value uses NestJS fallback.

## Next Phase Readiness

- Phase 50-04 can begin immediately: migrate use-notifications.ts + use-owner-notification-settings.ts
- Pattern established: dual-path queryFn/mutationFn with isPostgrestEnabled() — follow same structure

---
*Phase: 50-infrastructure-auth-foundation-user-profile-crud*
*Completed: 2026-02-22*
