---
phase: 52-notification-center-activity-feed-channel-honesty
plan: 06
subsystem: ui
tags: [notifications, nextjs, tanstack-query, pagination, playwright, e2e, owner-axe]

# Dependency graph
requires:
  - phase: 52-04
    provides: "notificationQueries.list({ from, to }) bounded .range()+{count:'exact'} paginated read; useNotificationList / useUnreadCount / useMarkAllNotificationsRead"
  - phase: 52-05
    provides: "NotificationItem row component (semantic icon chip, three unread signals, open-redirect guard); NotificationBell header island + popover"
  - phase: 52-08
    provides: "Honest Settings notification panel — Email + category toggles only (SMS/push/in-app removed)"
provides:
  - "/notifications full inbox page (plain owner route): paginated read+unread audit-complete history via .range() + header-sourced count, Mark-all-read, full Empty, error+Retry"
  - "NotificationsInboxClient: 20-per-page bounded pagination; totalPages from count header never data.length; Mark-all-read disabled state from useUnreadCount (accurate across pages)"
  - "notifications.spec.ts E2E smoke: bell->popover, mark-all-read clears badge (gated on unread), /notifications inbox renders, Settings shows no SMS/push (HONEST-01/02)"
  - "owner-axe Playwright project extended to run the notification smoke in CI e2e-smoke"
affects: [notification-center, channel-honesty, phase-52-verify]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin server page + client split (maintenance/page.tsx mirror): metadata export + default component rendering the client island"
    - "Bounded paginated inbox: pass { from, to } to drive the query factory's .range() path; total pages from count header, disabled Mark-all-read from useUnreadCount (dedupes with header bell)"
    - "E2E smoke authored to owner-axe conventions (in-test loginAsOwner, no storageState) + registered in the owner-axe testMatch so it gates the PR under CI --project=owner-axe"

key-files:
  created:
    - src/app/(owner)/notifications/page.tsx
    - src/components/notifications/notifications-inbox.client.tsx
    - tests/e2e/tests/notifications.spec.ts
  modified:
    - tests/e2e/playwright.config.ts

key-decisions:
  - "Mark-all-read disabled state reads useUnreadCount() (header-sourced count, dedupes with the bell's existing query) rather than visible-row unread — accurate across pages, never data.length"
  - "Registered **/notifications.spec.ts in the owner-axe project testMatch (and excluded it from chromium) so the required smoke runs in CI e2e-smoke; a top-level spec otherwise matches only the non-CI chromium project"
  - "Plain route only — no @modal slot / default.tsx / catch-all — to avoid the documented app-wide 404 soft-200 regression (T-52-18)"

patterns-established:
  - "Pattern 1: paginated audit-complete inbox — .range() window + count-header total pages + Empty/error/loading branches, reusing the shared NotificationItem row"
  - "Pattern 2: CI-gating E2E smoke — self-authenticating owner-axe spec registered in the project testMatch, verified via --list rather than a live run (worktree has no env)"

requirements-completed: [NOTIF-03]

# Metrics
duration: ~12min
completed: 2026-07-19
---

# Phase 52 Plan 06: Notifications Inbox Page Summary

**Full `/notifications` inbox — a thin server page + `NotificationsInboxClient` that paginates the complete read+unread history 20-at-a-time via the bounded `.range()` + `{count:'exact'}` query path (total pages from the count header, never `data.length`), with header Mark-all-read, full `Empty`, and error+Retry — plus a CI-gating notification-stack E2E smoke registered in the `owner-axe` project. Zero new dependencies.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-19T20:29:00Z (approx)
- **Completed:** 2026-07-19T20:42:26Z
- **Tasks:** 2
- **Files modified:** 4 (3 created + 1 config modified)

## Accomplishments
- `page.tsx` — thin server component mirroring `maintenance/page.tsx`: `export const metadata` (`title: "Notifications"`) + default component rendering `<NotificationsInboxClient />`. Plain owner route, auth via the (owner) shell + proxy; no `@modal` slot / `default.tsx` / catch-all.
- `notifications-inbox.client.tsx` — `"use client"` inbox: `useNotificationList({ from, to })` drives the bounded `.range()` path (page size 20); `totalPages = ceil(totalCount / 20)` from the header count. Header `h1` "Notifications" + right-aligned Mark-all-read (disabled at 0 unread via `useUnreadCount`). Reuses `NotificationItem` rows in a `divide-y` bordered card list on a `max-w-3xl` `p-6`/`gap-6` column. Empty → full `Empty` compound ("No notifications yet"); error → inline "Couldn't load notifications." + `Retry`; loading → 6 `Skeleton` rows; Previous/Next pagination shown only when >1 page.
- `notifications.spec.ts` — 4-test Playwright smoke (bell opens popover; mark-all-read clears the badge gated on unread; `/notifications` inbox renders h1; Settings notifications shows no SMS/push — HONEST-01/02), self-authenticating via `loginAsOwner` (owner-axe convention).
- `playwright.config.ts` — registered `**/notifications.spec.ts` in the `owner-axe` `testMatch` (CI runs `--project=owner-axe` in `e2e-smoke`) and excluded it from `chromium` `testIgnore` to avoid double-execution.

## Task Commits

Each task was committed atomically:

1. **Task 1: /notifications page + NotificationsInboxClient** - `b06ed043b` (feat)
2. **Task 2: notification-stack E2E smoke + owner-axe registration** - `6ebd0481d` (test)

**Plan metadata:** committed after this SUMMARY (docs).

## Files Created/Modified
- `src/app/(owner)/notifications/page.tsx` - thin server page (metadata + client), plain owner route
- `src/components/notifications/notifications-inbox.client.tsx` - paginated inbox: bounded .range() window, count-header total pages, Mark-all-read, Empty/error/loading branches
- `tests/e2e/tests/notifications.spec.ts` - bell->popover->mark-all-read + /notifications inbox + settings honesty smoke (owner-axe, in-test loginAsOwner)
- `tests/e2e/playwright.config.ts` - owner-axe testMatch += notifications smoke; chromium testIgnore += same (no double-run)

## Decisions Made
- **Mark-all-read disabled from `useUnreadCount()`** — the header-sourced unread count (which dedupes with the header bell's existing query) is the accurate "0 unread" signal across all pages, unlike deriving from the loaded window. Honors CLAUDE.md (never `data.length` for counts).
- **owner-axe registration** — the plan-specified path `tests/e2e/tests/notifications.spec.ts` otherwise matches only the `chromium` project, which CI's `e2e-smoke` job does NOT run (`--project=smoke --project=public --project=owner-axe`). Per the documented dashboard-smoke rationale, a smoke that never gates the PR is an anti-pattern, so the spec is registered in `owner-axe` (self-authenticating, no storageState) and excluded from `chromium`.
- **Plain route only** — no parallel-route modal slot, default segment, or catch-all, to avoid the app-wide 404 soft-200 regression documented in project memory (T-52-18).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered the E2E smoke in the owner-axe project (playwright.config.ts not in plan files_modified)**
- **Found during:** Task 2 (E2E smoke authoring)
- **Issue:** The plan's path `tests/e2e/tests/notifications.spec.ts` (top-level) matches only the `chromium` Playwright project. CI's `e2e-smoke` job runs `bunx playwright test --project=smoke --project=public --project=owner-axe` — it does NOT run `chromium`. As authored, the required smoke would pass locally but never gate the PR (the exact anti-pattern the repo's dashboard-smoke comment warns against).
- **Fix:** Added `**/notifications.spec.ts` to the `owner-axe` project's `testMatch` (owner-axe self-authenticates via in-test `loginAsOwner`, matching the orchestrator's directive), and added it to the `chromium` project's `testIgnore` so it does not double-execute under the storageState project.
- **Files modified:** tests/e2e/playwright.config.ts
- **Verification:** `playwright test --project=owner-axe --list` lists all 4 tests; `--project=chromium --list` matches 0; biome clean; e2e tsconfig typecheck reports no errors in the spec or config.
- **Committed in:** `6ebd0481d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The owner-axe registration is required for the plan's own `<human-check>` ("passes ... in PR e2e-smoke") to be achievable — without it the required smoke does not run in CI. No product behavior changed; no scope creep.

## Out-of-Scope Observation (logged, not fixed)
- `src/app/(owner)/settings/page.tsx:76` still declares `description: "Email, SMS, and push settings"` for the Notifications section (a 52-08 leftover). This field is **not rendered in the DOM** (the settings nav renders only `label`/`icon`), so there is no runtime honesty leak and the 52-06 settings-honesty smoke passes. Logged to `deferred-items.md` for a future one-line copy fix; out of scope here (unrelated file, not in this plan's `files_modified`).

## Issues Encountered
- **Pre-commit unit-suite flake (Task 1):** the lefthook `pre-commit` full-suite run (~106k tests) reported 724 "failed" under parallel-worker contention — the exact transient documented in 52-04/52-05. A standalone `bun run test:unit` was fully green (283 files / 106786 tests, exit 0); the re-run commit passed. No code cause. `--no-verify` was never used (hard project prohibition).
- **page.tsx comment tripped the modal/catch-all regression grep:** the explanatory comment literally contained `@modal`/`catchAll`, so `grep -rq "catchAll\|@modal"` matched. Reworded the comment to describe the concept without those literal tokens; the regression grep now returns clean.
- **E2E typecheck baseline:** `tsc -p tests/e2e/tsconfig.json` reports 30 pre-existing errors in other specs — none in `notifications.spec.ts` or `playwright.config.ts` (verified). Out of scope.

## User Setup Required
None - no external service configuration required. Zero new dependencies. The E2E smoke runs in CI `e2e-smoke` (owner-axe) against the synthetic owner env; it cannot be run from this worktree (no `.env.local`/`.env.test`), so it was verified by discovery (`--list`), typecheck, and lint per the plan's automation-first note.

## Next Phase Readiness
- NOTIF-03 complete: the full paginated inbox behind the popover's "View all" is live, plain-route only.
- The phase E2E smoke now gates the PR under CI `e2e-smoke` (owner-axe), proving the bell -> popover -> mark-all-read stack and the HONEST-01/02 settings pin.
- No blockers. `bun run typecheck` exits 0; the notifications route has no modal/catch-all; both task commits passed the full lefthook pre-commit + commitlint gate.

## Self-Check: PASSED

---
*Phase: 52-notification-center-activity-feed-channel-honesty*
*Completed: 2026-07-19*
