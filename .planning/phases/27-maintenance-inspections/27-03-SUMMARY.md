---
phase: 27-maintenance-inspections
plan: 03
subsystem: ui
tags: [maintenance, stats, completed, this-month, local-zone, display-correctness]

# Dependency graph
requires: []
provides:
  - "the maintenance Completed stat counts only this-month completions, matching its 'this month' caption"
affects: [MAINT-07, maintenance overview stats]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Local-zone start-of-month via new Date(year, month, 1) — local midnight on the 1st, no UTC skew; compared against completed_at (timestamptz)"

key-files:
  created: []
  modified:
    - src/components/maintenance/maintenance-view.client.tsx

key-decisions:
  - "Kept the 'this month' caption (matches the dashboard-KPI intent) and scoped the count to it rather than relabelling"
  - "Used new Date(year, month, 1) local-midnight comparison (NOT parseLocalYmd — completed_at is a timestamptz, not a date-only string)"
  - "Guarded completed_at != null so all-time / null-completed rows never leak into the count; open/in_progress/urgent counts untouched"

requirements-completed: [MAINT-07]

# Metrics
duration: ~5min
completed: 2026-07-06
---

# Phase 27 Plan 03: Maintenance "Completed" stat scoped to this month (MAINT-07)

**The "Completed" tile now counts only requests completed since the local start of the current month, so its number and its "this month" caption describe the same period.**

## Accomplishments

- `maintenance-view.client.tsx`: computed a local-zone start-of-month once (`const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)`) and changed `completedCount` to count requests where `status === "completed"` AND `completed_at != null` AND `new Date(completed_at) >= startOfMonth`. Open / In Progress / Urgent counts are unchanged. No new date-utility dependency.

## Task Commits

1. **Task 1: Scope the Completed stat to this month (MAINT-07)** — `642691ca2` (fix)

## Verification

- `bun run typecheck` — clean (`completed_at` exists on `MaintenanceDisplayRequest` = `Tables<"maintenance_requests"> + embeds`).
- `grep -c 'completed_at'` — 2; `grep -c 'getMonth'` — 1.
- Commit passed the full pre-commit gate (gitleaks, lockfile-verify, lint, typecheck, unit+coverage, commitlint).

## Deviations

- None.

## Self-Check: PASSED
- Start-of-month computed in the local zone via `new Date(year, month, 1)`, not UTC slicing.
- Completed count gated on `completed_at >= startOfMonth`; caption "this month" now accurate.
- Other three stat counts unchanged.

---
*Phase: 27-maintenance-inspections*
*Completed: 2026-07-06*
