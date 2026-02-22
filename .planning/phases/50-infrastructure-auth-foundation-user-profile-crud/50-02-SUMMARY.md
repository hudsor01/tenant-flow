# Phase 50-02 Summary: Migrate use-profile.ts + use-auth.ts to Dual-Path PostgREST/NestJS

**Phase**: 50-infrastructure-auth-foundation-user-profile-crud
**Plan**: 02
**Status**: COMPLETE
**Date**: 2026-02-22

## Objective

Migrate `use-profile.ts` and `use-auth.ts` to use Supabase PostgREST direct calls when `NEXT_PUBLIC_USE_POSTGREST=true`, with feature-flagged fallback to `apiRequest` (NestJS path).

## Tasks Completed

### Task 1: Migrate use-profile.ts to dual-path PostgREST/NestJS

**File**: `apps/frontend/src/hooks/api/use-profile.ts`

Added imports for `isPostgrestEnabled` from `#lib/postgrest-flag` and `createClient` from `#lib/supabase/client`.

All 6 queryFn/mutationFn now have dual paths:

| Function | PostgREST path | NestJS fallback |
|----------|---------------|-----------------|
| `profileQueries.detail()` | `supabase.from('users').select(...).single()` | `apiRequest('/api/v1/users/profile')` |
| `useUpdateProfileMutation` | `supabase.from('users').update({...}).eq('id', userId)` | `apiRequest('/api/v1/users/profile', PATCH)` |
| `useUploadAvatarMutation` | `supabase.storage.from('avatars').upload(path)` + `users.update(avatar_url)` | `fetch('/api/v1/users/avatar', POST)` |
| `useRemoveAvatarMutation` | `supabase.from('users').update({avatar_url: null})` + best-effort storage remove | `apiRequest('/api/v1/users/avatar', DELETE)` |
| `useUpdatePhoneMutation` | `supabase.from('users').update({phone})` | `apiRequest('/api/v1/users/phone', PATCH)` |
| `useUpdateProfileEmergencyContactMutation` | `supabase.from('tenants').update({emergency_contact_*})` | `apiRequest('/api/v1/users/emergency-contact', PATCH)` |
| `useRemoveProfileEmergencyContactMutation` | `supabase.from('tenants').update({emergency_contact_* = null})` | `apiRequest('/api/v1/users/emergency-contact', DELETE)` |

**Key design decisions:**
- Emergency contact data lives on `tenants` table (not `users` table) — PostgREST path uses `.eq('user_id', userId)` RLS enforced filter
- Avatar upload path: `{userId}/avatar.{ext}` in Supabase Storage `avatars` bucket with `upsert: true`
- Storage cleanup in `useRemoveAvatarMutation` is best-effort (wrapped in try/catch) — DB update is authoritative
- `userId` obtained via `supabase.auth.getUser()` within each mutationFn — not stored at module scope
- All optimistic update and rollback logic (onMutate/onError) is path-independent and unchanged
- Cast from `users` row to `UserProfile` via `as unknown as UserProfile` — DB row is base fields only, NestJS path returns richer joined shape

### Task 2: Migrate use-auth.ts authQueries to dual-path

**File**: `apps/frontend/src/hooks/api/use-auth.ts`

The `isPostgrestEnabled` import and dual-path implementations for `authQueries.session()` and `authQueries.user()` were already present from prior Phase 50-01 work. Verified they were correctly implemented:

| Query | PostgREST path | NestJS fallback |
|-------|---------------|-----------------|
| `authQueries.session()` | `supabase.auth.getSession()` returning `AuthSession \| null` | `apiRequest('/api/v1/auth/session')` |
| `authQueries.user()` | `supabase.auth.getUser()` + `supabase.from('users').select('id, email, stripe_customer_id')` | `apiRequest('/api/v1/users/me')` |

All other auth mutations (`useSignOutMutation`, `useSupabaseLoginMutation`, `useSupabaseSignupMutation`, `useSupabasePasswordResetMutation`, `useSupabaseUpdateProfileMutation`, `useChangePasswordMutation`) already use Supabase auth directly — no changes needed.

**Key design decisions:**
- `stripe_customer_id` confirmed to exist in `users` table (not a separate table) — direct select is correct
- `authQueries.user()` does two-step: auth.getUser() for the authenticated user ID, then PostgREST for DB data
- `authQueries.session()` deduplicates with `authQueries.supabaseSession()` — both exist but serve different cache key namespaces

## Verification

- `pnpm --filter @repo/frontend typecheck`: zero TypeScript errors
- `pnpm --filter @repo/frontend lint`: zero lint errors
- `pnpm --filter @repo/frontend test:unit -- --run`: 965 tests pass (8 skipped)
- `grep -c "isPostgrestEnabled" use-profile.ts`: 8 occurrences
- `grep -c "isPostgrestEnabled" use-auth.ts`: 3 occurrences

## Commit

`b1bace7ee` — feat(50-02): migrate use-profile.ts and use-auth.ts to dual-path PostgREST/NestJS

## Files Modified

- `apps/frontend/src/hooks/api/use-profile.ts` — full dual-path migration (+193/-20 lines)
- `apps/frontend/src/hooks/api/use-auth.ts` — already had dual-path from 50-01 (0 additional changes needed)
- `.planning/ROADMAP.md` — marked 50-02 as complete
- `.planning/phases/50-infrastructure-auth-foundation-user-profile-crud/50-02-SUMMARY.md` — this file
