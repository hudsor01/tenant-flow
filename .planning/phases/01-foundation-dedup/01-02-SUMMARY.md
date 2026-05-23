---
phase: 01-foundation-dedup
plan: 02
subsystem: ui
tags: [dashboard, currency, dedup, refactor, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Plan 1-01 dropped the `*100` round-trip in page.tsx — meant the dashboard callers now pass dollars; the swap to formatCurrency (expects dollars) is correct"
  - phase: 01-CONTEXT
    provides: "D-07, D-08, D-09a — atomic single-commit dedup + no-cents options-object call form"
  - phase: 01-PATTERNS
    provides: "Pattern S-1 (no-cents call form), S-3 (atomic commit per change), RC-7 (formatCurrency options object MANDATE)"
provides:
  - "formatDashboardCurrency no longer exists anywhere in the codebase"
  - "Dashboard subtree consumes the canonical formatCurrency from #lib/utils/currency"
  - "Display contract preserved (every dashboard dollar number still renders as `$1,234`, not `$1,234.00`)"
affects: [01-03, 03-kpi-row, 04-charts, 05-data-table]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canonical no-cents call form: formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })"
    - "Atomic single-commit for delete + swap pairs that share trust boundary (D-08)"

key-files:
  created: []
  modified:
    - src/components/dashboard/dashboard-types.ts
    - src/components/dashboard/dashboard.tsx
    - src/components/dashboard/components/portfolio-grid.tsx
    - src/components/dashboard/components/portfolio-table.tsx

key-decisions:
  - "D-07/D-08 implemented as atomic single commit: deleting formatDashboardCurrency without simultaneously swapping the 3 callers would leave an intermediate broken-import state. Tasks 1+2 ship in one refactor(01) commit per the plan's `Recommended (atomic single commit)` pattern."
  - "D-09a / RC-7 implemented at all 3 callsites: each formatCurrency call passes `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }`. Naive single-arg `formatCurrency(value)` would have visibly changed every dashboard money number from `$1,234` to `$1,234.00` — that regression is NOT in Phase 1 scope."
  - "D-03 cross-cutting `*100`/`/100` grep gate deferred to Plan 1-03 Task 5 (per the plan's INTENTIONAL OMISSION clause). owner-dashboard.tsx still carries `* 100` at lines 151/172/187 until Plan 1-03 Task 1 deletes it; running the Appendix A grep here would fail."

requirements-completed: [POLISH-02, POLISH-03]

# Metrics
duration: 5min
completed: 2026-05-23
---

# Phase 01 Plan 02: Foundation & Dedup — formatDashboardCurrency dedup + canonical formatCurrency swap Summary

**Deletes the duplicate `formatDashboardCurrency` helper from `dashboard-types.ts:23-30` and swaps all 3 callers (`dashboard.tsx:164`, `portfolio-grid.tsx:45`, `portfolio-table.tsx:137`) to the canonical `formatCurrency` from `#lib/utils/currency`, passing `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }` per D-09a / RC-7 to preserve `$1,234` display (no cents).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-23T14:38:43Z
- **Completed:** 2026-05-23T14:43:27Z
- **Tasks:** 3 (Tasks 1+2 atomic per D-08; Task 3 verification-only)
- **Files modified:** 4
- **Files created:** 0

## Accomplishments

- **POLISH-02 fully closed (formatter half):** The `cents / 100` divide inside `formatDashboardCurrency` is gone via whole-function deletion. Plan 1-01 already closed the chart-side `/100` at `revenue-overview-chart.tsx:41`; this plan retires the last currency `/100` site in the dashboard subtree.
- **POLISH-03 partial:** One duplicate utility (`formatDashboardCurrency`) deleted. Remaining dedup deletions land in Plan 1-03 (owner-dashboard.tsx + its test + dashboard-filters-*.tsx + portfolio-toolbar.tsx + skeletons.tsx).
- **Canonical formatCurrency adopted in dashboard subtree:** All 3 callers now import `formatCurrency` from `#lib/utils/currency` and pass `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }`. Matches the project-wide canonical call form (`analytics-stats-row.tsx:15-16`).
- **Display unchanged:** Every dashboard money number still renders as `$1,234` — the no-cents options object preserves the pre-PR rendering exactly.
- **PortfolioRow + chartConfig + quickActions + QuickActionType exports survive intact in dashboard-types.ts** (the 4 non-utility exports were untouched).

## Task Commits

Tasks 1 + 2 ship atomically per D-08 (`refactor(01)`); Task 3 is verification-only (no commit).

1. **Tasks 1 + 2 (atomic): Delete formatDashboardCurrency + swap 3 callers** — `47518f610` (refactor)
2. **Task 3: Repo-wide formatDashboardCurrency verification** — verification-only, evidence inlined below.

## Files Modified

- **Modified:** `src/components/dashboard/dashboard-types.ts` — deleted lines 23-30 (the `formatDashboardCurrency` function); kept all 4 other exports (`PortfolioRow`, `chartConfig`, `quickActions`, `QuickActionType`).
- **Modified:** `src/components/dashboard/dashboard.tsx` — dropped `formatDashboardCurrency` from `./dashboard-types` import, added `import { formatCurrency } from "#lib/utils/currency"`, swapped the line-164 callsite to `formatCurrency(metrics.totalRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })`.
- **Modified:** `src/components/dashboard/components/portfolio-grid.tsx` — replaced the dual `import type` + `import` from `../dashboard-types` with one type-only import + a new `import { formatCurrency } from "#lib/utils/currency"`. Swapped the line-45 callsite to the no-cents options form.
- **Modified:** `src/components/dashboard/components/portfolio-table.tsx` — same import restructure + the line-137 callsite swap to the no-cents options form. The surrounding `<TableCell className="text-right tabular-nums">` chrome left untouched (Phase 5 deletes this file).

## Decisions Made

- **D-07 / D-08 / D-09 (superseded by D-09a)** implemented as written. The whole-function deletion + 3-caller swap shipped as a single `refactor(01)` commit — deleting the function before swapping callers would have produced an intermediate broken-import state (no advantage and adds revert complexity).
- **D-09a / RC-7** enforced at every callsite: each of the 3 `formatCurrency` calls passes `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }`. The literal lives at each callsite (not extracted to a shared constant) because the call form matches the canonical no-cents form used across `(owner)/reports/analytics` and is self-documenting.
- **D-03 grep gate deferred** to Plan 1-03 Task 5 per the plan's INTENTIONAL OMISSION clause — `owner-dashboard.tsx` still on disk with `* 100` arithmetic until Plan 1-03 Task 1 deletes it; running the cross-cutting Appendix A grep here would always fail.
- **Biome auto-formatted the multi-line options object** — `formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })` wraps across 5 lines per biome's prettier-compatible format. The single-line `grep -c "formatCurrency.*minimumFractionDigits: 0, maximumFractionDigits: 0"` plan-verifier check finds 0 hits per file because the options object spans multiple lines; the multi-line check (independent `minimumFractionDigits: 0,` + `maximumFractionDigits: 0,` lines) returns 1 per file (3 total). Verified by reading the bytecode of each callsite (lines 164-167 dashboard.tsx, 45-48 portfolio-grid.tsx, 137-140 portfolio-table.tsx). The semantic intent is preserved; biome's wrap is non-negotiable per project lint rules.

## Deviations from Plan

**None of substance.** One mechanical note:

### Mechanical note (not a deviation): biome wraps the options object multi-line

- **Found during:** Task 2 verification (`grep -c "formatCurrency.*minimumFractionDigits: 0, maximumFractionDigits: 0" file`).
- **Issue:** The plan's `<verify>` block uses single-line grep regexes for the no-cents options object. Biome's auto-format wraps the options object across 5 lines, so the single-line grep returns 0 for each file.
- **Resolution:** Verified each callsite by reading the source (dashboard.tsx:164-167, portfolio-grid.tsx:45-48, portfolio-table.tsx:137-140) and by independent single-line greps for `minimumFractionDigits: 0,` (3 hits) + `maximumFractionDigits: 0,` (3 hits). Semantic intent: identical to the single-line form. No code change required.
- **Verification:** typecheck clean, biome clean, all 3 callsites confirmed to pass `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }`.

---

**Total deviations:** Zero auto-fix rules invoked. One mechanical note about plan grep regexes not matching biome-wrapped multi-line option objects (the wrap is mandatory under project biome config — no fix needed at the code level).

**Impact on plan:** None. All acceptance criteria met; both POLISH-02 and POLISH-03 closures land as specified.

## Issues Encountered

1. **Lefthook unit-tests false-positive flake on first commit attempt** — same pattern as Plan 1-01 SUMMARY.md `Issues Encountered #2`. First `git commit` lefthook run produced `Invalid hook call. Hooks can only be called inside of the body of a function component.` errors across many test files (table.test.tsx, main-nav.test.tsx, app-shell.test.tsx, lease-signature-status.test.tsx, etc.). Identical Vitest 4 project-isolation parallel-execution race documented by Plan 1-01. Retry succeeded clean (commit `47518f610`). No code changes required.
2. **macOS BSD grep does not support `-Pz` PCRE-multiline** — the multi-line grep gate `grep -Pzc "formatCurrency\([^)]*?\{[^}]*?minimumFractionDigits: 0..."` returns 0 even when the options object is present (because `-Pz` is GNU-specific). Worked around with independent single-line greps for each option key + source-read verification. Documented as a `Mechanical note` above so future plan-checkers using single-line grep regexes don't false-positive on biome-wrapped option objects.

## User Setup Required

None — purely a code refactor; no external service configuration.

## Next Phase Readiness

- **Plan 01-03 unblocked:** Dead-file deletions (`owner-dashboard.tsx` + `__tests__/owner-dashboard.test.tsx`, `dashboard-filters-compact.tsx`, `dashboard-filters.tsx`, `dashboard-filters-utils.ts`, top-level `portfolio-toolbar.tsx`, `skeletons.tsx`) per RC-2/RC-3/RC-4/RC-5/RC-6. Plan 01-03 Task 5 owns the canonical cross-subtree D-03 `*100`/`/100` grep sweep AFTER `owner-dashboard.tsx` is deleted — that is the gate this plan intentionally defers.
- **Phases 3-5 inherit a clean currency contract:** every dashboard money cell renders via `formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })` against dollar values. Phase 3 KPI tiles + Phase 4 chart axes + Phase 5 DataTable cells follow this same call form.
- **No blockers.** Typecheck clean, biome clean, 18/18 dashboard-scope unit tests pass.

## Task 3 Verification Evidence (the verification-only task)

```bash
# 1. Zero formatDashboardCurrency hits anywhere in the repo:
$ grep -rn "formatDashboardCurrency" src/ tests/ supabase/ 2>/dev/null
$ echo "exit=$?"
exit=1   # grep -r exits 1 when zero matches (correct)

# 2. typecheck clean:
$ bunx tsc --noEmit
$ echo "exit=$?"
exit=0

# 3. biome clean on all 4 modified files:
$ bunx biome check src/components/dashboard/dashboard-types.ts src/components/dashboard/dashboard.tsx src/components/dashboard/components/portfolio-grid.tsx src/components/dashboard/components/portfolio-table.tsx
Checked 4 files in 21ms. No fixes applied.

# 4. dashboard-scope unit tests pass:
$ bunx vitest --run --project unit src/components/dashboard/
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

## Self-Check

- [x] Commit `47518f610` exists with message `refactor(01): replace formatDashboardCurrency with canonical formatCurrency` (verified `git log --oneline -3`).
- [x] `grep -rn "formatDashboardCurrency" src/ tests/ supabase/` returns ZERO hits (verified).
- [x] All 3 callers contain `formatCurrency` import from `#lib/utils/currency` (verified at dashboard.tsx:10, portfolio-grid.tsx:1, portfolio-table.tsx:11).
- [x] All 3 callsites pass `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }` (verified by source-read at dashboard.tsx:164-167, portfolio-grid.tsx:45-48, portfolio-table.tsx:137-140).
- [x] `dashboard-types.ts` keeps `export type PortfolioRow`, `export const chartConfig`, `export const quickActions`, `export type QuickActionType` (verified `grep -c "export type PortfolioRow" dashboard-types.ts` = 1; `grep -c "export const chartConfig" dashboard-types.ts` = 1; `grep -c "export const quickActions" dashboard-types.ts` = 1).
- [x] No `// formatDashboardCurrency removed` placeholder comment left in dashboard-types.ts (verified by source-read — function block deleted cleanly with the surrounding whitespace preserved).
- [x] `bunx tsc --noEmit` exits 0.
- [x] `bunx biome check` clean on all 4 modified files.
- [x] 18/18 dashboard-scope unit tests pass.
- [x] No emojis introduced. No `any` types. No `as unknown as`. No string-literal query keys. No barrel files.
- [x] STATE.md and ROADMAP.md NOT modified (per agent invariant).

**Self-Check: PASSED**

---
*Phase: 01-foundation-dedup*
*Plan: 02*
*Completed: 2026-05-23*
