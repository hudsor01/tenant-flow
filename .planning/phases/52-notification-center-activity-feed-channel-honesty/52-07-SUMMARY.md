---
phase: 52-notification-center-activity-feed-channel-honesty
plan: 07
subsystem: ui
tags: [react, tanstack-query, dashboard, activity-feed, lucide, vitest]

# Dependency graph
requires:
  - phase: 52 (Plan 02 — activity event triggers)
    provides: activity rows for property/lease/document/maintenance events (makes the card non-empty for active owners)
  - phase: prior dashboard work
    provides: get_dashboard_data_v2 unified RPC already returning the activity slice + DASHBOARD_BASE_QUERY_OPTIONS shared cache
provides:
  - selectActivity + useDashboardActivity selector hook (activity slice from the shared dashboard cache, zero new fetch)
  - DashboardActivityCard (audit-trail card with the deliberate ACT-02 attention-vs-audit visual asymmetry)
  - 2-col dashboard grid pairing ExpiringLeasesWidget (attention) with DashboardActivityCard (audit)
  - mapDashboardActivityRow boundary mapper fixing the latent snake_case/camelCase activity mismatch
affects: [notification center rows (ACT-02 contrast reference), future dashboard widgets consuming the activity slice]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Selector-over-shared-cache: useDashboardActivity reuses DASHBOARD_BASE_QUERY_OPTIONS via `select` — N+1 prevention (T-52-20)"
    - "ACT-02 asymmetry: activity rows omit dot/badge/chevron/read-state so they never read as notification duplicates"
    - "Typed PostgREST boundary mapper for the activity slice (CLAUDE.md rule #8, no `as unknown as`)"

key-files:
  created:
    - src/components/dashboard/dashboard-activity-card.tsx
    - src/components/dashboard/__tests__/dashboard-activity-card.test.tsx
  modified:
    - src/hooks/api/use-dashboard-hooks.ts
    - src/hooks/api/use-owner-dashboard.ts
    - src/app/(owner)/dashboard/page.tsx
    - src/app/(owner)/dashboard/__tests__/dashboard-page-branch.test.tsx

key-decisions:
  - "Activity rows are non-interactive `<li>` (no Link) — the absence of a deep-link chevron IS the ACT-02 audit-vs-attention distinction"
  - "Mapped the RPC's snake_case activity keys to ActivityItem at the fetcher boundary rather than changing the ActivityItem type or the card's field access"
  - "Icon glyph uses the vivid icon-chip utility (activity-*/icon-bg-info) + AA-safe -text companion per 52-UI-SPEC; document -> FileUp is one of the four launch events"

patterns-established:
  - "Dashboard slice hooks derive from the unified cache via `select`; no per-slice queryFn"
  - "Audit surfaces (activity) vs attention surfaces (notifications) are disambiguated purely by row affordances"

requirements-completed: [ACT-01, ACT-02]

# Metrics
duration: 12min
completed: 2026-07-19
---

# Phase 52 Plan 07: Dashboard Activity Card Summary

**Recent Activity dashboard card sourced from the unified dashboard cache via a `useDashboardActivity` selector (zero new fetch), rendered with the deliberate ACT-02 audit-vs-attention asymmetry — no unread dot, badge, read control, or deep-link chevron — paired beside ExpiringLeasesWidget in a 2-col grid.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-19T19:22:00Z
- **Completed:** 2026-07-19T19:34:02Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `selectActivity` + `useDashboardActivity` derive the activity slice from `DASHBOARD_BASE_QUERY_OPTIONS` via `select` — reuses the single get_dashboard_data_v2 query, no additional network call (ACT-01, T-52-20/N+1 prevention).
- `DashboardActivityCard` renders up to 10 activity rows with the semantic type-icon palette (property->Building2, lease->FileText, document->FileUp, maintenance/maintenance_request->Wrench, tenant->User), Empty compound zero-state ("No activity yet"), and a 3-row Skeleton loading branch.
- ACT-02 disambiguation: activity rows deliberately carry no unread dot, count badge, mark-read control, deep-link chevron, or read state — the visual contrast with notification rows.
- Card shipped in a `grid grid-cols-1 lg:grid-cols-2 gap-6` dashboard container beside ExpiringLeasesWidget (attention vs audit, D-07); no `/activity` route added (D-09).
- 4-case unit test (10-row cap, ACT-02 absence assertions, empty state, document->FileUp glyph) mocking `useDashboardActivity` via `vi.hoisted`.

## Task Commits

Each task was committed atomically:

1. **Task 1: selectActivity + useDashboardActivity** - `7f441a1c1` (feat) — includes the Rule 1 boundary-mapper fix
2. **Task 2: DashboardActivityCard (TDD test + component)** - `391fbb9b4` (feat)
3. **Task 3: dashboard 2-col grid placement** - `49e147db9` (feat) — includes the Rule 3 test-mock fix

_TDD note: Task 2's RED (failing import) and GREEN (passing component) were verified sequentially and committed together as one atomic `feat` since the component and its test were both new files created in the same task._

## Files Created/Modified
- `src/components/dashboard/dashboard-activity-card.tsx` - Audit-trail card; semantic icon palette; ACT-02 asymmetry; Empty/Skeleton states.
- `src/components/dashboard/__tests__/dashboard-activity-card.test.tsx` - 4 behaviors: 10-row cap, no dot/chevron/link/button, empty state, document->FileUp.
- `src/hooks/api/use-dashboard-hooks.ts` - Added `selectActivity` + `useDashboardActivity` (select over the shared cache).
- `src/hooks/api/use-owner-dashboard.ts` - Added `mapDashboardActivityRow` + `RawDashboardActivityRow`; fetcher now maps the RPC's snake_case activity rows into `ActivityItem`.
- `src/app/(owner)/dashboard/page.tsx` - Replaced the single full-width ExpiringLeasesWidget div with the 2-col grid; imported DashboardActivityCard.
- `src/app/(owner)/dashboard/__tests__/dashboard-page-branch.test.tsx` - Stubbed DashboardActivityCard (mirrors the existing ExpiringLeasesWidget stub).

## Decisions Made
- **Activity rows are non-interactive** (`<li>`, no `Link`): the plan/UI-SPEC define the ACT-02 asymmetry as the notification row having a deep-link chevron and the activity row having none. Rendering the row non-navigational is the cleanest expression of "pure audit."
- **Boundary mapper over type/site changes**: the runtime activity shape is snake_case, `ActivityItem` is camelCase — mapping at the fetcher boundary (CLAUDE.md-mandated "typed mapper at every boundary") keeps the declared `OwnerDashboardData.activity: ActivityItem[]` contract honest and the card's field access (`action`/`entityName`/`entityType`) correct at runtime.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Activity fetcher cast produced all-`undefined` fields at runtime**
- **Found during:** Task 1 (selector hook)
- **Issue:** `get_dashboard_data_v2` emits activity rows with the DB's snake_case columns (`title`, `description`, `activity_type`, `entity_type`, `entity_id`, `created_at` — see `20260301070000_unified_dashboard_rpc.sql`), but the fetcher cast them as `activities: ActivityItem[]` (camelCase `action`/`entityType`/`entityName`). This plan is the first consumer of `data.activity`; without a fix the card would render "undefined · undefined" and always hit the fallback icon.
- **Fix:** Added `RawDashboardActivityRow` type + `mapDashboardActivityRow` mapper in `use-owner-dashboard.ts`; `activity` now maps each raw row (`action <- title`, `entityType <- entity_type ?? ""`, `entityId <- entity_id ?? ""`, `entityName <- description ?? ""`, `created_at <- created_at ?? ""`). No `as unknown as` (CLAUDE.md rule #8).
- **Files modified:** src/hooks/api/use-owner-dashboard.ts
- **Verification:** `bun run typecheck` exits 0; card renders real `action`/`entityName` text and the correct entity-type icon.
- **Committed in:** `7f441a1c1` (Task 1 commit)

**2. [Rule 3 - Blocking] Pre-existing dashboard branch test had an incomplete hook mock**
- **Found during:** Task 3 (grid placement)
- **Issue:** Adding `DashboardActivityCard` to the dashboard page made `dashboard-page-branch.test.tsx` fail — it mocks `#hooks/api/use-dashboard-hooks` without `useDashboardActivity`, so the new grid child threw "No 'useDashboardActivity' export is defined on the mock" in the two content-state cases.
- **Fix:** Added a `vi.mock("#components/dashboard/dashboard-activity-card", () => ({ DashboardActivityCard: () => null }))` stub, mirroring the test's existing `ExpiringLeasesWidget: () => null` leaf stub (the test deliberately stubs heavy sibling leaves).
- **Files modified:** src/app/(owner)/dashboard/__tests__/dashboard-page-branch.test.tsx
- **Verification:** That test file passes 8/8; full pre-commit unit suite exits 0.
- **Committed in:** `49e147db9` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required for correctness — #1 makes the card display real data, #2 keeps the existing regression test green after the new grid child was added. No scope creep; no architectural changes.

## Issues Encountered
- The `test:unit` script injects `--run`, so the plan's `bun run test:unit -- --run <file>` verify command errors with a CAC duplicate-flag error (known MEMORY gotcha). Ran `bun run test:unit -- <file>` instead. No code impact.

## Known Stubs
None. The card wires directly to the live activity slice; the empty state is the intended zero-data rendering, not a placeholder.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ACT-01 and ACT-02 delivered and behind the shared dashboard cache. The card is populated by Plan 02's activity triggers for active owners.
- The ACT-02 asymmetry in this card is the reference contrast for the notification-center rows (dot/badge/chevron/read-state), which live in the other Plan(s) of this phase.

## Self-Check: PASSED

- Created files verified present: `dashboard-activity-card.tsx`, `dashboard-activity-card.test.tsx`, `52-07-SUMMARY.md`.
- Task commits verified in git: `7f441a1c1`, `391fbb9b4`, `49e147db9`.

---
*Phase: 52-notification-center-activity-feed-channel-honesty*
*Completed: 2026-07-19*
