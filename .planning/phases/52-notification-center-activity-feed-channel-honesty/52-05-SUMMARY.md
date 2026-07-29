---
phase: 52-notification-center-activity-feed-channel-honesty
plan: 05
subsystem: ui
tags: [notifications, client-island, popover, badge, open-redirect-guard, a11y, react-19]

# Dependency graph
requires:
  - phase: 52-04
    provides: "notificationQueries (unreadCount 60s HEAD poll + bounded list) + use-notifications hooks (mark-read/mark-all-read/useNotificationList/useUnreadCount) + NotificationRow"
provides:
  - "NotificationBell client island: live 9+-capped unread badge (60s poll) + Popover trigger, dynamic aria-label"
  - "NotificationPopoverList: 10 most recent, Mark-all-read, View-all footer, Skeleton loading + compact Empty caught-up state"
  - "NotificationItem row: semantic per-type icon chip, three unread signals (dot / bg-primary/5 / weight 600), app-relative action_url open-redirect guard"
  - "app-shell-header now mounts NotificationBell (interactive island) in place of the /settings?tab=notifications link"
affects: [52-06-notifications-inbox-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client island in a server-component header: NotificationBell self-contains 'use client' + useQuery; header stays RSC"
    - "Render-time open-redirect guard: action_url navigates only when startsWith('/') and not startsWith('//'), else falls back to /notifications"
    - "noUncheckedIndexedAccess-safe type->visual lookup with a neutral fallback (Bell + bg-muted) for unmapped notification_type"

key-files:
  created:
    - src/components/notifications/notification-item.tsx
    - src/components/notifications/notification-popover-list.tsx
    - src/components/notifications/notification-bell.tsx
    - src/components/notifications/__tests__/notification-bell.test.tsx
  modified:
    - src/components/shell/app-shell-header.tsx
    - src/components/shell/__tests__/app-shell.test.tsx

key-decisions:
  - "Row-click fires mark-read only for unread rows (skips a wasteful mutation + invalidation on already-read rows); navigation is never blocked"
  - "Popover Mark-all-read disabled state derives from unread among the visible rows (plan-scoped deps: useNotificationList + useMarkAllNotificationsRead only; no extra useUnreadCount dependency)"
  - "Neutral fallback visual (Bell + bg-muted) added for unmapped notification_type — required by noUncheckedIndexedAccess and guards future types"

# Metrics
duration: 15min
completed: 2026-07-19
---

# Phase 52 Plan 05: Notification Center Surface Summary

**NotificationBell header client island (60s live unread badge capped at 9+, dynamic aria-label) opening a CommandDialog-density Popover of the 10 most recent notifications — unread rows carry the three UI-SPEC signals, click marks-read then navigates through an app-relative action_url open-redirect guard, and the header now mounts the interactive island in place of the old settings link. Zero new dependencies.**

## Performance
- **Duration:** ~15 min
- **Completed:** 2026-07-19
- **Tasks:** 3
- **Files:** 4 created (3 source + 1 test), 2 modified (1 source + 1 test)

## Accomplishments
- `notification-item.tsx` — one row per `NotificationRow`. Leading semantic icon chip (`size-8 rounded-lg` + the `icon-bg-primary` / `icon-bg-info` / `bg-destructive/10` utility per the 5-type contract; lucide-only: FileSignature / FileCheck / AlertTriangle / Wrench + a neutral Bell fallback). Unread rows carry all three signals (leading `size-2 bg-primary` dot, `bg-primary/5` surface, title weight 600); read rows carry none. `next/link` href passes through `resolveHref` — navigates only for app-relative `/...` paths (not `//host`, not external), else falls back to `/notifications` (T-52-15 open-redirect guard). onClick marks-read (unread only) without blocking navigation. Relative time via date-fns `formatDistanceToNow`.
- `notification-popover-list.tsx` — `useNotificationList({ limit: 10 })` + `useMarkAllNotificationsRead`. Sticky header (title + Mark-all-read, disabled at 0 visible unread) over a `max-h-96 overflow-y-auto` `divide-y` body; loading → 4 `Skeleton` rows; empty → compact `Empty` (Bell + "You're all caught up"). Sticky footer "View all notifications" → `/notifications`.
- `notification-bell.tsx` — `"use client"` island. `useUnreadCount()` 60s poll feeds a `Badge` (`count > 9 ? "9+" : String(count)`, hidden at 0); 44px-min ghost button (`min-h-11 min-w-11`, Bell `w-5 h-5 text-muted-foreground`) with dynamic aria-label ("Notifications" | "Notifications, {n} unread"). Wrapped in `Popover` (`align="end" sideOffset={8} w-80 p-0`) rendering the list. Opening never clears the badge (D-10).
- `app-shell-header.tsx` — swapped the `<Link href="/settings?tab=notifications">…<Bell/></Link>` for `<NotificationBell />` (sibling of `GlobalSyncIndicator`); dropped the now-unused lucide `Bell` import. Header stays a server component.
- 6 bell unit tests green: badge caps at "9+" (>9), shows the exact number (1-9), hidden at 0; sources from `useUnreadCount`; aria-label at 0 and at >0.

## Task Commits
1. **Task 1: notification-item row + notification-popover-list** — `9e141a9e4` (feat)
2. **Task 2: NotificationBell client island + unit test (TDD)** — `de7bb0088` (feat)
3. **Task 3: mount NotificationBell in app-shell header (swap the Link)** — `b00896f73` (feat)

_Plan metadata commit made after this SUMMARY._

## Files Created/Modified
- `src/components/notifications/notification-item.tsx` — row: semantic icon chip, three unread signals, app-relative action_url guard, mark-read-on-click
- `src/components/notifications/notification-popover-list.tsx` — 10 recent + Mark-all-read + View-all footer + Skeleton/Empty branches
- `src/components/notifications/notification-bell.tsx` — client island: 9+-capped live badge + Popover trigger + dynamic aria-label
- `src/components/notifications/__tests__/notification-bell.test.tsx` — 6 tests (badge cap/hidden-at-0, useUnreadCount source, aria-label)
- `src/components/shell/app-shell-header.tsx` — mount swap + Bell import removal
- `src/components/shell/__tests__/app-shell.test.tsx` — mock NotificationBell island + assert it renders in place of the removed link

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] app-shell.test.tsx broke from the header swap**
- **Found during:** Task 3
- **Issue:** Swapping the settings `<Link>` for `<NotificationBell />` made `AppShell` render the island, which calls `useUnreadCount()` (useQuery). The existing `app-shell.test.tsx` renders `<AppShell>` without a `QueryClientProvider`, so all 32 tests threw "No QueryClient set". Two further assertions (`a[href="/settings?tab=notifications"]` link presence; a `getByText("Notifications")` command-palette check) referenced the now-removed link / collided with the mock text.
- **Fix:** Mocked `#components/notifications/notification-bell` in the test (mirroring the existing `GlobalSyncIndicator` mock, labelled "Bell" to avoid the command-palette "Notifications" collision) and updated the obsolete "should render notifications link" test to assert the `notification-bell` island renders.
- **Files modified:** `src/components/shell/__tests__/app-shell.test.tsx`
- **Commit:** `b00896f73`

### Minor implementation choices (not plan violations)
- **Neutral fallback visual (Bell + `bg-muted`)** added for unmapped `notification_type`. Required by `noUncheckedIndexedAccess` (the `TYPE_VISUALS[...]` lookup is `TypeVisual | undefined`); also future-proofs against new types. Still lucide-only.
- **Mark-read fires only for unread rows** on click (skips a redundant mutation + invalidation for already-read rows). Navigation is never blocked either way.
- **Popover Mark-all-read disabled** derives from unread among the visible rows, honoring the plan's scoped deps for the list (useNotificationList + useMarkAllNotificationsRead only). The server mutation still clears all unread for the user.

## Threat Surface
- **T-52-15 (open redirect, mitigate):** implemented at render via `resolveHref` — `next/link` navigates only to app-relative `/...` paths (rejects `//host` and external URLs), else `/notifications`. No `dangerouslySetInnerHTML`.
- **T-52-16 (badge integrity, accept):** badge reads the RLS-scoped `useUnreadCount`; opening the popover never auto-clears it.
- No new security surface beyond the plan's threat model. No Threat Flags.

## Known Stubs
None. The "You're all caught up" empty state and Skeleton loading branch are real UX states, not placeholders. No hardcoded empty data flows to the UI; all rows are fed by `useNotificationList` / `useUnreadCount`.

## TDD Gate Compliance
Task 2 is `tdd="true"`. Per the same lefthook constraint documented in 52-04 (whole-project typecheck + unit gate on every commit; `--no-verify` is a hard project prohibition), a test-only RED commit referencing a not-yet-created module fails `tsc`. RED was verified locally: `notification-bell.test.tsx` run pre-impl failed to resolve `../notification-bell` (RED proven), then the component was added → 6/6 GREEN. The task is a single atomic `feat(...)` commit containing the verified-failing test + the implementation.

## Verification
- `bun run test:unit -- src/components/notifications/__tests__/notification-bell.test.tsx` → 6/6 pass
- `bun run typecheck` → exit 0
- `app-shell.test.tsx` → 32/32 pass (regression fix)
- Source scan: `startsWith` open-redirect guard present; no `@radix-ui/react-icons` (lucide-only)
- All three per-task commits passed the full lefthook pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit-tests) + commitlint

## Issues Encountered
- The lefthook pre-commit runs the whole unit suite (~106k tests). Two commit attempts hit a transient flaky failure (773 tests reported failing under parallel-worker contention during the hook); an immediate standalone `bun run test:unit` run was fully green (282 files / 106353 tests, exit 0), and the re-run commit passed. No code cause.
- First Task 1 commit also blocked on a biome formatting error (long multi-name import needed wrapping); fixed with `biome check --write` and re-committed.

## Self-Check: PASSED

---
*Phase: 52-notification-center-activity-feed-channel-honesty*
*Completed: 2026-07-19*
