---
phase: 31-forms-behavior
plan: 06
subsystem: settings
tags: [forms, settings, user-preferences, notifications, postgrest]
requires: []
provides:
  - General Settings persists Contact Email/Phone (users) + Timezone/Language (user_preferences)
  - Timezone/Language load from user_preferences on mount
  - "Enable All Notifications" reads/writes every channel (email/sms/push/inApp)
affects:
  - src/components/settings/general-settings.tsx
  - src/components/settings/notification-settings.tsx
  - src/hooks/api/query-keys/user-preferences-keys.ts
tech-stack:
  patterns:
    - "user_preferences read via queryOptions() factory + typed boundary mapper (mirrors owner-notification-settings-keys)"
    - "upsert onConflict user_id with user_id stamped from getCachedUser (auth-derived, never client input)"
key-files:
  created:
    - src/hooks/api/query-keys/user-preferences-keys.ts
    - src/components/settings/__tests__/general-settings.test.tsx
    - src/components/settings/__tests__/notification-settings.test.tsx
  modified:
    - src/components/settings/general-settings.tsx
    - src/components/settings/notification-settings.tsx
decisions:
  - "Timezone/Language live on user_preferences (not users); confirmed against src/types/supabase.ts + base_schema.sql (user_id UNIQUE, owner-scoped RLS incl. INSERT so upsert works)."
  - "Email save is guarded (non-empty + changed) so a blank field can never wipe the account email."
  - "user_preferences read fallbacks = America/Chicago / en-US so the selects always show a valid option even before a row exists."
metrics:
  tasks: 2
  commits: 2
  files: 5
  completed: 2026-07-09
---

# Phase 31 Plan 06: Settings Persistence + Enable-All Summary

General Settings now persists all four editable fields (Contact Email + Phone -> `users`; Timezone + Language -> `user_preferences`) and loads the saved timezone/language on mount; the "Enable All Notifications" toggle now reads ON only when every channel is on and writes email/sms/push/inApp together in one mutate.

## Tasks

| Task | Requirement | Commit | What |
|------|-------------|--------|------|
| 1 | FORMFIX-06 | `4641fc2a4` | Add `user-preferences-keys.ts` (`userPreferencesQueries.detail()` + `mapUserPreferencesRow` typed mapper + `userPreferencesKeys`). general-settings loads timezone/language from that query, and `handleSaveChanges` updates `users` with email(+phone) and upserts `user_preferences` `{ user_id, timezone, language }` onConflict `user_id`. Email guarded against blank; "No changes to save" preserved. |
| 2 | FORMFIX-07 | `9b9244036` | notification-settings "Enable All" `checked` = AND of all four channels (mirroring each channel switch's own default); `onCheckedChange` writes `{ email, sms, push, inApp }` in a single mutate. Per-channel + category toggles unchanged. Added `aria-label` for test/a11y targeting. |

## Key Decisions

- **DB placement verified before wiring:** `src/types/supabase.ts` + `20251101000000_base_schema.sql` confirm `users` has email/phone (no timezone/language), and `user_preferences` has `user_id` UNIQUE (`user_preferences_user_id_key`), `timezone`, `language`, with owner-scoped RLS including an INSERT policy — so `upsert onConflict "user_id"` is valid.
- **Mirrors the notification-settings pattern:** createClient inside each fn, `getCachedUser()` for the id, typed mapper at the PostgREST boundary (no `as unknown as`), no barrel/index re-export, no module-level client.
- **Security (threat register):** T-31-06-01 mitigated — `user_id` stamped from `getCachedUser()`, never from client input; RLS enforces owner scope. T-31-06-02 mitigated — email only sent when non-empty and changed.
- **Two writes, two mutations:** email/phone -> `users` (`updateProfile`), timezone/language -> `user_preferences` (`updatePreferences`); each invalidates its own query key. Save button disabled while either is pending.

## Deviations from Plan

None — plan executed as written.

## Tests

- `general-settings.test.tsx` (4 tests): loads saved timezone/language on mount (not the hardcoded defaults); saving persists email+phone to `users` and timezone+language to `user_preferences` (upsert payload asserted); blank email is not sent (T-31-06-02); "No changes to save" fires when nothing changed. Wired against a mocked PostgREST boundary through a real `QueryClientProvider` so the factory, mapper, and upsert run for real.
- `notification-settings.test.tsx` (4 tests): toggling Enable All ON writes all four channels in one mutate; reads checked=false when any channel is off; checked=true only when all on; toggling off from all-on writes all four false.

`bun run typecheck` clean, `bun run lint` exit 0, `bun run test:unit` 102231 passed (234 files). Each task passed the full pre-commit suite.

## Self-Check: PASSED

- Files created: `src/hooks/api/query-keys/user-preferences-keys.ts`, `src/components/settings/__tests__/general-settings.test.tsx`, `src/components/settings/__tests__/notification-settings.test.tsx` — all present.
- Files modified: `src/components/settings/general-settings.tsx`, `src/components/settings/notification-settings.tsx`.
- Commits `4641fc2a4` (FORMFIX-06) and `9b9244036` (FORMFIX-07) present on `phase/31-forms-behavior`.
