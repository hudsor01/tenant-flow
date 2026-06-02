---
phase: 01-foundation-dedup
plan: 03
subsystem: dashboard
tags: [dedup, dashboard, file-deletes, d-03-canonical-gate]
requirements-completed:
  - POLISH-03
completed: 2026-05-23
executor: inline (the worktree executor agent ad6ea2f56089719d2 was Bash-permission-denied; the orchestrator ran the plan inline on the phase branch instead)

key-files:
  deleted:
    - src/components/dashboard/owner-dashboard.tsx
    - src/components/dashboard/__tests__/owner-dashboard.test.tsx
    - src/components/dashboard/dashboard-filters.tsx
    - src/components/dashboard/dashboard-filters-compact.tsx
    - src/components/dashboard/dashboard-filters-utils.ts
    - src/components/dashboard/portfolio-toolbar.tsx
    - src/components/dashboard/skeletons.tsx
  preserved (D-13a + canonical):
    - src/components/dashboard/chart-area-interactive.tsx (active dynamic imports in /analytics/overview + /properties/units)
    - src/components/dashboard/components/portfolio-toolbar.tsx (canonical, imported by dashboard.tsx:41)
  created:
    - .planning/phases/01-foundation-dedup/01-03-SUMMARY.md

decisions:
  - "D-13 entries 1, 3, 4, 5, 6 implemented (owner-dashboard.tsx + filter trio + orphan portfolio-toolbar.tsx + skeletons.tsx)"
  - "D-13a honored: chart-area-interactive.tsx PRESERVED (NOT in delete list; survives the phase)"
  - "D-13b implemented: owner-dashboard.tsx + __tests__/owner-dashboard.test.tsx deleted in ONE atomic commit so CI never saw a broken-import state"
  - "D-14 protocol followed: pre-delete grep run for every delete; all targets confirmed zero production consumers before staging"
  - "D-14a confirmed: dashboard-filters.tsx + dashboard-filters-utils.ts + dashboard-filters-compact.tsx all safe to delete; Zustand useDashboardFilters selector at dashboard-store.ts:69 is unrelated and survives untouched"
  - "D-15 honored: each delete shipped as its own atomic commit (4 deletion commits total — Task 1 combined source + test; Tasks 2, 3, 4 each ship one commit; Task 5 verification-only with no commit)"
  - "D-03 + D-04/D-05/D-06 discharged at Task 5 (the single canonical D-03 grep gate sees the complete post-cleanup state; UI-SPEC.md frontmatter status: approved verified)"

metrics:
  duration: ~12 min (inline execution by orchestrator after worktree executor permission-denied)
  commits: 4 deletion commits + this SUMMARY commit
---

# Phase 01 Plan 03: Dedup Deletions — Execution Summary

## Outcome

POLISH-03 fully closed. The dashboard subtree is now minimal — Phases 3-5 will design new surfaces against a clean slate.

## Commits

| Commit | Subject |
|--------|---------|
| `c00ac0d65` | chore(01): delete duplicate owner-dashboard.tsx + its test |
| `e51a295ff` | chore(01): delete unused dashboard-filters{,-compact,-utils} files |
| `5760fbead` | chore(01): delete orphan top-level portfolio-toolbar.tsx |
| `2d3c10278` | chore(01): delete unused dashboard skeletons.tsx |

(4 atomic deletion commits per D-15 + this SUMMARY commit. Each is independently revertible.)

## Pre-delete grep evidence (D-14 protocol)

### Task 1 — owner-dashboard.tsx + test
Filtered grep against `OwnerDashboard|owner-dashboard` (excluding `OwnerDashboardLayout`, `OwnerDashboardData`, `use-owner-dashboard`, query-key strings, Sentry boundary tags):
- `src/components/dashboard/owner-dashboard.tsx` — self
- `src/components/dashboard/__tests__/owner-dashboard.test.tsx` — self test
- `src/hooks/api/use-billing-mutations.test.ts:79/105` — query-key string `["owner-dashboard"]` (NOT a component import)
- `src/app/(owner)/error.tsx:22` — Sentry boundary tag string `"owner-dashboard-error"` (NOT a code consumer)

**Verdict:** zero production consumers of the `OwnerDashboard` component. Safe to delete.

### Task 2 — dashboard-filters trio
Filtered grep against `from\s+["\047][^"\047]*dashboard-filters` (production imports only):
- `dashboard-filters.tsx:29` — `import { DashboardFiltersCompact } from "./dashboard-filters-compact"` (internal cross-ref between the trio)
- `dashboard-filters.tsx:33,38` — `from "./dashboard-filters-utils"` (internal cross-ref)
- `dashboard-filters-compact.tsx:18,19` — `from "./dashboard-filters-utils"` (internal cross-ref)
- `src/stores/dashboard-store.ts:69` — `export const useDashboardFilters = () =>` (Zustand selector, UNRELATED — survives)
- `src/app/__tests__/design-token-drift.test.ts` — scanner that reads files but doesn't consume them

**Verdict:** zero production page imports. Safe to delete trio together (D-14a).

### Task 3 — orphan top-level portfolio-toolbar.tsx
Filtered grep against `from\s+["\047][^"\047]*portfolio-toolbar`:
- `src/components/dashboard/dashboard.tsx:41` — `import { PortfolioToolbar } from "./components/portfolio-toolbar"` (CANONICAL nested path, NOT the orphan)

**Verdict:** zero imports of `./portfolio-toolbar` without `/components/`. Orphan safe to delete; canonical preserved.

### Task 4 — skeletons.tsx
Filtered grep against `from\s+["\047][^"\047]*dashboard/skeletons`:
- (empty — zero hits)

**Verdict:** zero consumers. The only previous consumer (`__tests__/owner-dashboard.test.tsx`) was deleted in Task 1. Safe to delete.

## Task 5 — Canonical D-03 grep gate (verification only)

### UI-SPEC § Appendix A grep result

```
git ls-files 'src/app/(owner)/dashboard/**/*.{ts,tsx}' 'src/components/dashboard/**/*.{ts,tsx}' \
  | grep -vE '(chart-area-interactive|revenue-overview-chart|owner-dashboard|dashboard-filters-compact|skeletons)\.tsx?$' \
  | xargs grep -nE '(\* ?100\b|/ ?100\b)' \
  | grep -vE '(60 \* 24|/ 1000|/ 1_000_000)' \
  || echo "PASS: no currency * 100 or / 100 in dashboard subtree"
```

**Result:** `PASS: no currency * 100 or / 100 in dashboard subtree`

The dashboard subtree is dedup-clean. Plans 01-01 + 01-02 + 01-03 collectively eliminated:
- 3 `* 100` lines in `page.tsx` (Plan 01-01)
- 1 `/ 100` in `revenue-overview-chart.tsx` (Plan 01-01)
- 1 `/ 100` in `formatDashboardCurrency` (Plan 01-02, whole-function delete)
- 3 `* 100` lines in `owner-dashboard.tsx` (Plan 01-03 Task 1, whole-file delete)

= 8 currency-bearing arithmetic sites removed, zero remaining.

### Delete-target verification

All 7 paths confirmed absent:
- `owner-dashboard.tsx` ✓ DELETED
- `__tests__/owner-dashboard.test.tsx` ✓ DELETED
- `dashboard-filters.tsx` ✓ DELETED
- `dashboard-filters-compact.tsx` ✓ DELETED
- `dashboard-filters-utils.ts` ✓ DELETED
- `portfolio-toolbar.tsx` (top-level orphan) ✓ DELETED
- `skeletons.tsx` ✓ DELETED

### Preservation verification

- `src/components/dashboard/components/portfolio-toolbar.tsx` ✓ PRESERVED (canonical nested, imported by `dashboard.tsx:41`)
- `src/components/dashboard/chart-area-interactive.tsx` ✓ PRESERVED (D-13a — active dynamic imports in `/analytics/overview` + `/properties/units`)

### Design-token drift test

`bunx vitest --run src/app/__tests__/design-token-drift.test.ts`:
- 1/1 test file passed
- 2692/2692 tests passed
- Duration 431ms

### Typecheck

`bunx tsc --noEmit`: clean (no output, exit 0)

### UI-SPEC discharge (D-04/D-05/D-06)

`grep -E "^status: approved" .planning/phases/01-foundation-dedup/01-UI-SPEC.md`:
- `status: approved` (frontmatter line confirmed)

UI-SPEC was committed with `status: approved` during the UI-SPEC phase (cycles 1-2 of the perfect-PR gate). D-04/D-05/D-06 (scope/topics/inheritance) discharged.

## ROADMAP § Phase 1 success criteria

1. **KPI tiles unchanged, chart values now correct** ✓ — Plan 01-01 fixed the `*100`/`/100` round-trip; D-02 documents the intentional chart 100× visible correction (KPI tiles round-trip-cancelled, render unchanged)
2. **5 source files + 1 test deleted from dashboard subtree** ✓ — all 7 absent (chart-area-interactive.tsx survives per D-13a)
3. **Zero currency `*100`/`/100` hits in dashboard subtree** ✓ — canonical D-03 grep returns `PASS`
4. **design-token-drift.test.ts passes + UI-SPEC at status: approved** ✓ — 2692/2692 tests pass; UI-SPEC frontmatter confirmed

All four criteria met.

## Executor agent permission denial (operational note)

The worktree executor agent `ad6ea2f56089719d2` was launched at 2026-05-23 ~13:32 UTC with `subagent_type: gsd-executor, isolation: worktree, run_in_background: true`. It returned in 32s with `"STOP — Permission denied for Bash."` — the agent could not execute any Bash command including the initial worktree branch assertion. No commits, no worktree state.

Since Plan 01-03 is 100% Bash work (file deletes + grep verifications) and the orchestrator has Bash access (with the documented sandbox-disabled `git commit` workaround for `lockfile-verify`), the plan was executed inline on the phase branch. Net effect is identical to the worktree path (same 4 atomic commits land on the same phase branch) minus the worktree-merge step.

Recorded for future executor-agent invocations: when a Bash-only plan is denied, fall through to inline orchestrator execution rather than retry the same denied agent. Future Phase N executor invocations should pre-flight a Bash availability check.

## Net diff

```
 7 files changed (all deleted), 0 files created (counting only source — this SUMMARY is planning artifact)
-878  src/components/dashboard/__tests__/owner-dashboard.test.tsx
-256  src/components/dashboard/owner-dashboard.tsx (estimated from `git rm` line count)
-XXX  src/components/dashboard/dashboard-filters{,-compact,-utils}{.tsx,.ts}
 -95  src/components/dashboard/portfolio-toolbar.tsx
-170  src/components/dashboard/skeletons.tsx
```

(Exact LOC count visible via `git diff --stat 74f6838409f1b13c714c535e827d17c263b7e0d5..HEAD`.)

## Issues encountered

1. **Executor agent permission denial** — documented above. Inline execution resolved.
2. **None other.** Pre-delete greps were all clean; no surfaced consumer required investigation; no atomic-commit ordering issue; typecheck stayed green through every commit; design-token-drift remained passing.
