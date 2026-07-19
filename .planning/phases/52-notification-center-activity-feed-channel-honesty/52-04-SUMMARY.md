---
phase: 52-notification-center-activity-feed-channel-honesty
plan: 04
subsystem: api
tags: [tanstack-query, supabase, postgrest, notifications, query-keys, mutations, tdd]

# Dependency graph
requires:
  - phase: 52-01
    provides: notifications table + create_notification RPC + composite index (user_id, is_read, created_at desc)
provides:
  - "notificationQueries factory: unreadCount() HEAD count:exact poll @60s + list() bounded read (limit / range)"
  - "mapNotificationRow: typed PostgREST boundary mapper (throws on missing NOT NULL, no as-unknown-as)"
  - "notificationKeys: value-array `all` root for direct invalidation composition"
  - "useMarkNotificationRead + useMarkAllNotificationsRead mutations (is_read/read_at + full invalidation)"
  - "useNotificationList + useUnreadCount read hooks"
affects: [52-05-notification-bell, 52-06-notifications-inbox-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HEAD count:exact unread badge (zero rows transferred) polled at explicit 60s override of the 30s REALTIME preset"
    - "Bounded list read: .limit(10) popover / .range(from,to)+{count:'exact'} page, ordered created_at desc, totalCount from count header never data.length"
    - "Typed row mapper aliasing the generated Tables Row to avoid duplicate types (CLAUDE.md rule #3)"

key-files:
  created:
    - src/hooks/api/query-keys/notification-keys.ts
    - src/hooks/api/query-keys/__tests__/notification-keys.test.ts
    - src/hooks/api/use-notifications.ts
    - src/hooks/api/__tests__/use-notifications.test.ts
  modified: []

key-decisions:
  - "NotificationRow aliases Database['public']['Tables']['notifications']['Row'] rather than redeclaring the shape — the generated Row carries exact nullability and re-declaring would violate CLAUDE.md rule #3 (no duplicate types)"
  - "notificationKeys.all is a value array (not a function) so invalidation can pass it directly alongside ownerDashboardKeys.all"
  - "Both list paths request { count: 'exact' } (mirrors document-keys) so totalCount is always header-sourced"

patterns-established:
  - "Pattern 1: unread badge = HEAD count:exact query scoped to user + is_read=false, refetchInterval 60_000 explicit"
  - "Pattern 2: mark-read / mark-all-read invalidate [notificationKeys.all, ownerDashboardKeys.all] via createMutationCallbacks"

requirements-completed: [NOTIF-02, NOTIF-03]

# Metrics
duration: 10min
completed: 2026-07-19
---

# Phase 52 Plan 04: Notification Data Layer Summary

**`notificationQueries` factory (60s HEAD unread count + bounded inbox list + throwing typed row mapper) and `use-notifications` mark-read / mark-all-read mutations with the full notification + owner-dashboard invalidation contract — zero new dependencies.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-19T19:44:00Z
- **Completed:** 2026-07-19T19:53:11Z
- **Tasks:** 2
- **Files modified:** 4 created (2 source + 2 test)

## Accomplishments
- `notification-keys.ts` — `notificationQueries.unreadCount()` (HEAD `count:'exact'`, zero rows transferred, `refetchInterval: 60_000` scoped to `user_id` + `is_read=false`) and `notificationQueries.list()` (bounded: `.limit(10)` popover / `.range(from,to)` + `{count:'exact'}` page, ordered `created_at` desc). `mapNotificationRow` throws on missing NOT NULL fields (id/title/notification_type/user_id), `?? null` for the six nullable columns, no `as unknown as`.
- `use-notifications.ts` — `useMarkNotificationRead` (single `.eq('id', id)`) and `useMarkAllNotificationsRead` (`.eq('user_id').eq('is_read', false)`) both write `{ is_read: true, read_at }` and invalidate `notificationKeys.all` + `ownerDashboardKeys.all`; plus `useNotificationList` / `useUnreadCount` read wrappers.
- 15 unit tests (11 + 4) green covering the mapper throw/null behavior, the 60s poll, the HEAD count:exact chain, both bounded list paths, the invalidation contract, and the `is_read` (not bare `read`) regression pin.

## Task Commits

Each task was committed atomically (TDD: RED verified locally, then impl+test committed together — see TDD Gate Compliance):

1. **Task 1: notification-keys.ts factory + HEAD unread count + bounded list + typed mapper** - `48ceaf241` (feat)
2. **Task 2: use-notifications.ts mark-read + mark-all-read mutations + read hooks** - `2f052b0b0` (feat)

_Plan metadata commit made after this SUMMARY._

## Files Created/Modified
- `src/hooks/api/query-keys/notification-keys.ts` - notificationQueries factory (unreadCount HEAD poll, bounded list), mapNotificationRow typed boundary mapper, notificationKeys
- `src/hooks/api/query-keys/__tests__/notification-keys.test.ts` - factory + mapper unit tests (11)
- `src/hooks/api/use-notifications.ts` - mark-read / mark-all-read mutations + useNotificationList / useUnreadCount read hooks
- `src/hooks/api/__tests__/use-notifications.test.ts` - mutation unit tests incl. is_read regression pin (4)

## Public API Surface (for Plans 05 / 06)

```typescript
// src/hooks/api/query-keys/notification-keys.ts
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export interface NotificationListResult { rows: NotificationRow[]; totalCount: number }
export function mapNotificationRow(raw: Record<string, unknown>): NotificationRow;
export const notificationKeys = {
  all: ["notifications"],                       // value array — invalidation target
  unreadCount: () => ["notifications", "unread-count"],
  lists: () => ["notifications", "list"],
  list: (opts?) => ["notifications", "list", { limit, from, to }],
};
export const notificationQueries = {
  unreadCount: () => queryOptions(...),         // HEAD count:exact, refetchInterval 60_000
  list: (opts?: { limit?: number; from?: number; to?: number }) => queryOptions(...), // bounded
};

// src/hooks/api/use-notifications.ts
export function useMarkNotificationRead();       // .eq('id', id)
export function useMarkAllNotificationsRead();   // .eq('user_id').eq('is_read', false)
export function useNotificationList(opts?);       // useQuery(notificationQueries.list(opts))
export function useUnreadCount();                // useQuery(notificationQueries.unreadCount())
```

Badge display (D-11, implemented by Plan 05): `count > 9 ? "9+" : String(count)`.

## Decisions Made
- `NotificationRow` aliases the generated `notifications` Row type instead of redeclaring the shape — avoids a duplicate type (CLAUDE.md rule #3) while keeping the exact nullability the mapper relies on.
- `notificationKeys.all` is a plain value array (mirrors `ownerDashboardKeys.all`) so the mutation invalidation array `[notificationKeys.all, ownerDashboardKeys.all]` composes without a call.
- Both list branches request `{ count: 'exact' }` (matching the `document-keys` analog) so `totalCount` is always header-sourced, never `data.length`.

## Deviations from Plan

None - plan executed exactly as written. Task 1 and Task 2 implemented against the plan's `<interfaces>` contract verbatim (imports, mapper shape, HEAD count query, bounded list, invalidation contract, is_read regression pin).

## TDD Gate Compliance

Both tasks are `tdd="true"`. The canonical RED (`test(...)`) → GREEN (`feat(...)`) two-commit split was **not** used because this repo's lefthook `pre-commit` runs a whole-project `typecheck` + unit-test gate on every commit, and `--no-verify` is a hard project prohibition. A test-only RED commit referencing a not-yet-created module fails `tsc` (module-not-found) and would be blocked by the hook.

RED was instead **verified locally** before writing each implementation:
- Task 1: `notification-keys.test.ts` run pre-impl → failed with `Failed to resolve import "../notification-keys"` (RED proven), then impl added → 11/11 GREEN.
- Task 2: `use-notifications.test.ts` run pre-impl → failed with unresolved `../use-notifications` (RED proven), then impl added → 4/4 GREEN.

Each task is a single atomic `feat(...)` commit containing the verified-failing test + the implementation that makes it pass. No `test(...)`-only gate commit exists by hook constraint.

## Issues Encountered
- Initial `git commit` for Task 1 hit the tool's 2-minute default timeout while the pre-commit gate (typecheck + full unit suite ~34s) ran on a cold cache. Re-ran the commit with an extended timeout; all six pre-commit checks (gitleaks, lockfile-verify, lint, typecheck, unit-tests) + commitlint passed. No code change needed.
- `bun run test:unit -- --run <file>` crashes (CAC duplicate `--run`); the wrapper injects `--run`, so the correct form is `bun run test:unit -- <file>`.

## User Setup Required
None - no external service configuration required. Zero new dependencies; pure composition of existing query-key / mutation idioms against the Plan 52-01 `notifications` table.

## Next Phase Readiness
- Plan 05 (notification bell) can consume `useUnreadCount()` for the badge and `notificationQueries.list({ limit: 10 })` for the popover.
- Plan 06 (inbox page) can consume `notificationQueries.list({ from, to })` for pagination and `useMarkAllNotificationsRead()` for the header action.
- No blockers. `bun run typecheck` and both test files are green; the full pre-commit gate passed on both task commits.

## Self-Check: PASSED

---
*Phase: 52-notification-center-activity-feed-channel-honesty*
*Completed: 2026-07-19*
