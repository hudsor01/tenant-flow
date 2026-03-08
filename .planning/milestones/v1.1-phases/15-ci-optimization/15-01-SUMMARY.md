---
phase: 15-ci-optimization
plan: 01
subsystem: infra
tags: [github-actions, ci, concurrency, workflow]

# Dependency graph
requires: []
provides:
  - "Decoupled CI workflow: checks on PR-only, e2e-smoke independent on push to main"
  - "Per-job concurrency groups preventing cross-event cancellation"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-job concurrency groups instead of workflow-level concurrency"
    - "Job-level if: conditionals for event-specific execution"

key-files:
  created: []
  modified:
    - ".github/workflows/ci-cd.yml"

key-decisions:
  - "Per-job concurrency groups (checks-$ref, e2e-$ref) replace workflow-level group"
  - "checks gated with if: github.event_name == 'pull_request' to skip on push to main"
  - "needs: [checks] removed from e2e-smoke so it runs independently"

patterns-established:
  - "Per-job concurrency: each job defines its own concurrency group for isolated cancellation"

requirements-completed: [INFRA-04]

# Metrics
duration: 1min
completed: 2026-03-08
---

# Phase 15 Plan 01: CI Workflow Restructure Summary

**Decoupled CI checks (PR-only) and e2e-smoke (push-to-main independent) with per-job concurrency groups**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-08T01:14:56Z
- **Completed:** 2026-03-08T01:16:03Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 1

## Accomplishments
- Eliminated wasted CI minutes by gating checks to PR events only (no longer runs on push to main after merge)
- Unblocked e2e-smoke from checks dependency chain so it runs independently on push to main
- Replaced workflow-level concurrency with per-job concurrency groups preventing cross-event cancellation

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure CI workflow with per-job conditionals and concurrency** - `7e599264d` (chore)
2. **Task 2: Verify CI behavior in GitHub Actions** - Auto-approved (checkpoint, no commit)

## Files Created/Modified
- `.github/workflows/ci-cd.yml` - Restructured with per-job conditionals and concurrency groups

## Decisions Made
- Per-job concurrency groups (`checks-${{ github.ref }}` and `e2e-${{ github.ref }}`) replace the single workflow-level group to prevent cross-event cancellation
- All existing job steps, permissions, triggers, and continue-on-error preserved unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CI workflow restructure complete, ready for PR and merge verification
- Behavioral validation will occur naturally when PR is opened (checks runs) and merged (e2e-smoke runs on push to main)

## Self-Check: PASSED

- FOUND: .github/workflows/ci-cd.yml
- FOUND: 15-01-SUMMARY.md
- FOUND: commit 7e599264d

---
*Phase: 15-ci-optimization*
*Completed: 2026-03-08*
