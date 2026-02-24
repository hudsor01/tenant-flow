---
phase: 50-infrastructure-auth-foundation-user-profile-crud
plan: 04
status: complete
completed: 2026-02-22
---

# Phase 50-04 Summary: Migrate use-notifications.ts + use-owner-notification-settings.ts

## What Was Done

Migrated two notification hooks to dual-path PostgREST/NestJS via the `isPostgrestEnabled()` feature flag.

### Task 1: use-notifications.ts

Added dual-path implementations to all 7 exported functions:

| Function | PostgREST path | NestJS fallback |
|---|---|---|
| `useNotifications()` | `.from('notifications').select('*', { count: 'exact' })` with optional `.eq('is_read', false)`, `.order()`, `.range()` | `GET /api/v1/notifications?...` |
| `useUnreadNotificationsCount()` | `.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)` | `GET /api/v1/notifications?...unreadOnly=true` |
| `useMarkNotificationReadMutation()` | `.from('notifications').update({ is_read: true, read_at }).eq('id', id)` | `PUT /api/v1/notifications/:id/read` |
| `useDeleteNotificationMutation()` | `.from('notifications').delete().eq('id', id)` | `DELETE /api/v1/notifications/:id` |
| `useMarkAllNotificationsReadMutation()` | `.from('notifications').update({ is_read: true, read_at }).eq('is_read', false)` | `PUT /api/v1/notifications/read-all` |
| `useBulkMarkNotificationsReadMutation()` | `.from('notifications').update({ is_read: true, read_at }).in('id', ids)` | `PUT /api/v1/notifications/bulk-read` |
| `useCreateMaintenanceNotificationMutation()` | `.from('notifications').insert({ ... }).select().single()` | `POST /api/v1/notifications/maintenance` |

Key note: `useMarkAllNotificationsReadMutation()` returns `{ updated: 0 }` for the PostgREST path — PostgREST does not easily return a count of updated rows; query invalidation refreshes counts automatically.

RLS on the `notifications` table filters by `auth.uid()` automatically, so no explicit `user_id` filter is needed in SELECT queries.

### Task 2: use-owner-notification-settings.ts

Added dual-path implementations to both exported functions, plus a DB-to-type mapping helper.

**Key challenge**: The `notification_settings` DB table uses flat columns (`email`, `in_app`, `push`, `sms`, `general`, `maintenance`, `leases`) while the `NotificationPreferences` TypeScript type uses `{ email, inApp, push, sms, categories: { maintenance, leases, general } }`. A `mapDbRowToPreferences()` helper handles the mapping.

| Function | PostgREST path | NestJS fallback |
|---|---|---|
| `useOwnerNotificationSettings()` | `.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle()` + mapping | `GET /api/v1/notification-settings` |
| `useUpdateOwnerNotificationSettingsMutation()` | Maps `OwnerNotificationSettingsUpdate` back to DB columns, then `.upsert({ user_id, ...dbUpdate }, { onConflict: 'user_id' }).select().single()` | `PUT /api/v1/notification-settings` |

Default preferences returned when no row exists yet (new user): all channels enabled except SMS, all categories enabled.

All `onMutate`/`onError`/`onSuccess`/`onSettled` callbacks are unchanged — they are data-path-independent.

## Decisions Made

- `useMarkAllNotificationsReadMutation()` PostgREST path returns `{ updated: 0 }` — PostgREST update does not expose row count; query invalidation handles UI refresh
- `useOwnerNotificationSettings()` uses `.maybeSingle()` not `.single()` — avoids 406 error for users with no row yet; returns `defaultPreferences` when `data === null`
- `mapDbRowToPreferences()` module-level function — clean separation, TypeScript-verified mapping (DB `in_app` → type `inApp`)
- `dbUpdate.updated_at = new Date().toISOString()` always set on upsert — keeps `updated_at` current regardless of which fields changed
- Both hooks explicitly call `supabase.auth.getUser()` in PostgREST paths that need `user_id` — consistent with established patterns from Phase 51+

## Verification

- `pnpm --filter @repo/frontend typecheck` — passes (zero errors)
- `pnpm --filter @repo/frontend test:unit -- --run` — 965 tests pass, 8 skipped
- Both files import `isPostgrestEnabled` from `#lib/postgrest-flag` (8 usages in use-notifications.ts, 3 in use-owner-notification-settings.ts)
- All apiRequest calls wrapped in `if/else` with PostgREST alternatives
- No `any` types used — DB row mapping is fully typed via `Database['public']['Tables']['notification_settings']['Row']`
