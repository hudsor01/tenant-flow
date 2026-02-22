---
phase: 50
status: passed
updated: 2026-02-22
---

# Phase 50 Verification

Phase goal: Stand up the Supabase client infrastructure in the frontend (replacing apiRequest), migrate all user/profile/settings/MFA/sessions/notifications/tour-progress hooks to PostgREST, and add a feature-flag mechanism so NestJS and PostgREST can coexist during migration without breaking any live functionality.

---

## Must-Haves Table

| # | Check | File | Finding | Status |
|---|-------|------|---------|--------|
| 1 | `client.ts` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/frontend/src/lib/supabase/client.ts` | `env.NEXT_PUBLIC_SUPABASE_ANON_KEY` passed to `createBrowserClient`. No publishable key. | PASS |
| 2 | `server.ts` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/frontend/src/lib/supabase/server.ts` | `env.NEXT_PUBLIC_SUPABASE_ANON_KEY` passed to `createServerClient`. Uses `getAll`/`setAll` cookie pattern only. | PASS |
| 3 | `postgrest-flag.ts` exports `isPostgrestEnabled()` | `apps/frontend/src/lib/postgrest-flag.ts` | Exported function returns `process.env.NEXT_PUBLIC_USE_POSTGREST === 'true'`. No `#env` import (correct — runtime check). | PASS |
| 4 | `env.ts` validates `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_USE_POSTGREST` | `apps/frontend/src/env.ts` | Both keys present in `client` schema and `runtimeEnv`. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` retained (still used by NestJS path). | PASS |
| 5 | `use-profile.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-profile.ts` | All queryFn and mutationFn branch on `isPostgrestEnabled()`. PostgREST paths cover: profile detail, update profile, upload avatar, remove avatar, update phone, update/remove emergency contact. | PASS |
| 6 | `use-auth.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-auth.ts` | `authQueries.session()` and `authQueries.user()` both branch on `isPostgrestEnabled()`. Sign-in/sign-out/MFA mutations already used Supabase direct — no flag needed there. | PASS |
| 7 | `use-sessions.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-sessions.ts` | `useUserSessions()` returns current session from `supabase.auth.getSession()` when flag enabled (browser client cannot list all sessions — Admin API limitation is documented in code). `useRevokeSessionMutation()` uses `supabase.auth.signOut()` for current session revocation; falls back to `apiRequest` for non-current sessions. | PASS |
| 8 | `use-emergency-contact.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-emergency-contact.ts` | Query and both mutations (`useUpdateEmergencyContact`, `useDeleteEmergencyContact`) branch on `isPostgrestEnabled()`. Reads/writes `tenants` table filtered by `user_id`. | PASS |
| 9 | `use-notifications.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-notifications.ts` | All six exported hooks/functions branch on `isPostgrestEnabled()`: list, unread count, mark read, delete, mark all read, bulk mark read, create maintenance notification. | PASS |
| 10 | `use-owner-notification-settings.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-owner-notification-settings.ts` | `useOwnerNotificationSettings()` and `useUpdateOwnerNotificationSettingsMutation()` both branch on `isPostgrestEnabled()`. DB-to-type mapping via `mapDbRowToPreferences()` helper (no `any` types). | PASS |
| 11 | `use-identity-verification.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-identity-verification.ts` | `useIdentityVerificationStatus()` branches on `isPostgrestEnabled()` — reads `identity_verification_*` columns from `users` table. `useCreateIdentityVerificationSessionMutation()` intentionally stays on `apiRequest` (server-side Stripe SDK required; comment references Phase 55). | PASS |
| 12 | `use-tour-progress.ts` has `isPostgrestEnabled()` branching | `apps/frontend/src/hooks/api/use-tour-progress.ts` | All three async functions (`getTourProgress`, `updateTourProgress`, `resetTourProgress`) branch on `isPostgrestEnabled()`. localStorage fallback preserved in error paths for both PostgREST and NestJS. | PASS |
| 13 | `pnpm --filter @repo/frontend typecheck` passes | — | Ran successfully. Zero TypeScript errors. | PASS |

---

## Requirements Traceability

### CRUD-05
> Dev can migrate user profile, settings, MFA, sessions, notifications, and tour progress hooks to PostgREST

Phase 50 covers CRUD-05 in full across 5 plan files:

| Plan | Files | Scope |
|------|-------|-------|
| 50-01 | `client.ts`, `server.ts`, `env.ts`, `postgrest-flag.ts` | Supabase client infrastructure + feature flag |
| 50-02 | `use-profile.ts`, `use-auth.ts` | Profile CRUD + auth session/user queries |
| 50-03 | `use-sessions.ts`, `use-emergency-contact.ts` | Session management + emergency contact CRUD |
| 50-04 | `use-notifications.ts`, `use-owner-notification-settings.ts` | Notification list/mutations + notification settings |
| 50-05 | `use-identity-verification.ts`, `use-tour-progress.ts` | Identity verification status + tour progress |

`use-mfa.ts` requires no changes — it already uses Supabase auth directly (confirmed in plan 50-05 success criteria).

---

## Summary

Phase 50 is complete. All 13 verification checks pass. The codebase satisfies the phase goal:

1. **Supabase client infrastructure**: Browser and server clients use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a JWT), which means `auth.uid()` resolves correctly in RLS policies. The deprecated `sb_publishable_*` key is retained in `env.ts` for the NestJS path but is no longer used by the Supabase clients.

2. **Feature flag mechanism**: `apps/frontend/src/lib/postgrest-flag.ts` exports `isPostgrestEnabled()`, which reads `NEXT_PUBLIC_USE_POSTGREST` at runtime. Setting this to `'true'` activates PostgREST direct calls across all 8 migrated hooks; any other value (including absent) falls back to NestJS `apiRequest`. This allows instant rollback without a redeploy.

3. **Env validation**: `apps/frontend/src/env.ts` validates both `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required) and `NEXT_PUBLIC_USE_POSTGREST` (optional) at build time via `@t3-oss/env-nextjs`.

4. **All 8 hooks migrated**: Every hook in scope has dual-path `isPostgrestEnabled()` branching. One intentional NestJS-only exception exists: `useCreateIdentityVerificationSessionMutation` in `use-identity-verification.ts` — this requires server-side Stripe SDK access and cannot run in a browser client (documented with a comment referencing Phase 55 Edge Functions).

5. **TypeScript clean**: `pnpm --filter @repo/frontend typecheck` reports zero errors.

6. **No live functionality broken**: NestJS path remains intact as the default. PostgREST path is opt-in via the feature flag.

CRUD-05 is fully satisfied. Phase 50 is ready for sign-off.
