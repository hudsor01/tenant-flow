---
phase: 06-polish-a11y
plan: 02
subsystem: ui
tags: [design-tokens, dark-mode, tailwind, accessibility, status-utilities]

# Dependency graph
requires:
  - phase: 01-foundation-dedup
    provides: "globals.css status-* @utilities (status-active/-pending/-inactive) + --color-{success,warning,destructive} tokens (light+dark via color-mix)"
  - phase: 05-dashboard-portfolio-datatable
    provides: "lease-status-badge.tsx, portfolio-columns.tsx, portfolio-grid.tsx (DiceUI DataTable render path the badges flow through)"
provides:
  - "Lease status badges render via canonical status-* utilities (guaranteed light+dark contrast, no invisible badge)"
  - "Maintenance-open, expiring-days, and trend colors render via --color-* tokens (zero raw Tailwind palette class in the dashboard subtree)"
  - "POLISH-04 landmine grep returns zero across src/components/dashboard + src/app/(owner)/dashboard"
affects: [07-dashboard-verification, dashboard-dark-mode-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw Tailwind palette class -> canonical status-* utility / --color-* token (the drift guard does NOT catch palette classes; this is the explicit landmine grep's job)"
    - "Shared-primitive blast-radius documentation: StatTrend consumer grep recorded in the SUMMARY (mirrors NumberTicker discipline)"

key-files:
  created: []
  modified:
    - src/components/dashboard/components/lease-status-badge.tsx
    - src/components/dashboard/components/portfolio-columns.tsx
    - src/components/dashboard/components/portfolio-grid.tsx
    - src/components/ui/stat.tsx
    - src/components/dashboard/expiring-leases-widget.tsx

key-decisions:
  - "status-* utilities own color + background-color + border-color for both modes via color-mix, so every dark: palette variant was dropped from the CHIP record (no manual dark-mode pairing)"
  - "statIndicatorVariants in stat.tsx (lines 45-56) left byte-for-byte unchanged — its green-500/blue-500/orange-500 palette classes are an app-wide Phase-7 concern outside the dashboard StatTrend render path (KPI tiles use <StatTrend>, not <StatIndicator color=...>)"
  - "StatTrend is a shared primitive consumed by the dashboard KPI bento row + 3 analytics surfaces; the token swap is color-equivalent (token oklch values match the palette colors) per UI-SPEC 3.3"

patterns-established:
  - "Pattern 1: dashboard color landmine fix is a one-line className swap (raw palette -> status-* utility OR --color-* token), both of which carry guaranteed light+dark contrast"
  - "Pattern 2: shared-primitive edits document their full consumer list in the SUMMARY for the perfect-PR reviewer"

requirements-completed: [POLISH-04]

# Metrics
duration: 7min
completed: 2026-06-01
---

# Phase 6 Plan 02: Dashboard Dark-Mode Landmine Migration Summary

**Eliminated all six raw-Tailwind-palette dark-mode landmines in the `/dashboard` subtree by swapping them to canonical `status-*` utilities and `--color-*` tokens, closing the gap the design-token-drift guard silently allows (it scans hex/rgb/bg-white/inline-ms only, never palette classes like `text-red-600` / `bg-emerald-100`).**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-01T15:43:58Z
- **Completed:** 2026-06-01T15:50:24Z
- **Tasks:** 3 (2 implementation + 1 verification-only)
- **Files modified:** 5

## Accomplishments
- `lease-status-badge.tsx` CHIP record now maps `active -> status-active`, `expiring -> status-pending`, `vacant -> status-inactive`; every `bg-emerald-*` / `bg-amber-*` / `dark:*` palette variant dropped (the utilities own color + background-color + border-color for both modes via `color-mix`). This single change covers BOTH the portfolio table cell and the grid card (one badge definition, no view drift).
- `portfolio-columns.tsx` (MaintenanceCell) + `portfolio-grid.tsx` (maintenance-count) open-count text now uses `text-[var(--color-destructive)]` (was `text-red-600 dark:text-red-500`).
- `stat.tsx` StatTrend renders `up -> text-[var(--color-success)]`, `down -> text-[var(--color-destructive)]`, `neutral`/unset unchanged (`text-muted-foreground`); `statIndicatorVariants` left untouched.
- `expiring-leases-widget.tsx` both Clock icons + non-urgent days-badge branch now use `text-[var(--color-warning)]` (was `text-amber-600` / `text-amber-700 dark:text-amber-400`); the urgent branch keeps `text-destructive`.
- POLISH-04 landmine grep over the full dashboard subtree returns **zero**; `design-token-drift.test.ts` stays green (2724/2724).

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate lease-status-badge + maintenance cells to status-* utilities and tokens (D-05)** - `d81bbfc1f` (fix)
2. **Task 2: Migrate StatTrend (shared primitive) + expiring-leases-widget to tokens (POLISH-04)** - `c838c89a1` (fix)
3. **Task 3: Confirm POLISH-04 landmine grep returns zero + drift guard green** - verification-only, no edits (validation captured below)

**Plan metadata:** committed separately (docs: complete plan)

_Note: Tasks 1 and 2 carried `tdd="true"`. The work is presentational className swaps with no new behavior to test-drive (RED/GREEN), so the TDD gate here is "the existing render tests stay green": `portfolio-columns.test.tsx` (9/9) renders the badge through a real table, and the design-token-drift guard (2724/2724) pins the no-drift invariant. No new test file was authored because no new behavior was introduced — see Issues Encountered for the `stat.test.tsx` skip-branch note._

## Files Created/Modified
- `src/components/dashboard/components/lease-status-badge.tsx` - CHIP record swapped to status-active/-pending/-inactive; all dark: palette variants dropped
- `src/components/dashboard/components/portfolio-columns.tsx` - MaintenanceCell open-count -> text-[var(--color-destructive)]
- `src/components/dashboard/components/portfolio-grid.tsx` - maintenance-count conditional -> text-[var(--color-destructive)]
- `src/components/ui/stat.tsx` - StatTrend up/down -> --color-success / --color-destructive tokens (statIndicatorVariants untouched)
- `src/components/dashboard/expiring-leases-widget.tsx` - Clock icons + non-urgent days badge -> text-[var(--color-warning)]

## StatTrend Shared-Primitive Blast Radius

Per the Task 2 action, `StatTrend` is a shared primitive whose token swap propagates to every consumer. Documented for the perfect-PR reviewer (`grep -rln "StatTrend" src --include="*.tsx"`):

- `src/components/ui/stat.tsx` (definition — the edited file)
- `src/components/dashboard/components/kpi-bento-row.tsx` (dashboard KPI tiles)
- `src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx` (test for the above)
- `src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx`
- `src/app/(owner)/analytics/property-performance/performance-stat-cards.tsx`
- `src/app/(owner)/analytics/overview/analytics-stat-cards.tsx`
- `src/components/analytics/components/overview-stats-grid.tsx`

The swap is **visually equivalent** — the `--color-success` / `--color-destructive` oklch token values match the prior `text-green-600 dark:text-green-400` / `text-red-600 dark:text-red-400` palette colors (UI-SPEC 3.3 mandates the token form). No consumer requires a follow-up change.

## Validation (Task 3)

- `grep -rnE "bg-white|text-(red|amber|emerald|green|blue|yellow|rose)-[0-9]|bg-(red|amber|emerald|green)-[0-9]|dark:(bg|text)-(emerald|amber|red|green)" src/components/dashboard "src/app/(owner)/dashboard"` (excluding `statIndicatorVariants`) → **0 hits**. Note: even WITHOUT the exclusion the grep returns 0, because `statIndicatorVariants` lives in `src/components/ui/stat.tsx` (under `src/components/ui`, not `src/components/dashboard`) and never surfaces in the dashboard-subtree path.
- `design-token-drift.test.ts` → **2724/2724 passing**.
- `bg-white` remains zero across the dashboard subtree (it was already zero; no `bg-white` introduced).

## Decisions Made
- Dropped every `dark:` variant from the CHIP record rather than mapping each mode by hand — the `status-*` utilities are the single source of light+dark contrast (color-mix on a token), which is exactly why they exist.
- Left `statIndicatorVariants` byte-for-byte unchanged. It carries `green-500`/`blue-500`/`orange-500` palette classes, but the dashboard KPI path uses `<StatTrend>`, not `<StatIndicator color=...>`, so these are an app-wide Phase-7 concern outside this plan's dashboard blast radius (PATTERNS Open Question 3).

## Deviations from Plan

None - plan executed exactly as written. No code-level deviation rules (1-4) were triggered; all edits are the planned one-line className swaps.

## Issues Encountered

Three tooling/environment frictions, all resolved without changing plan intent:

1. **Verify-command `wc -l | grep -qx 0` is whitespace-fragile on macOS.** BSD `wc -l` emits leading whitespace (`       0`), so the plan's `grep -qx 0` exact-line match fails even when the count is genuinely 0. Resolved by piping through `tr -d ' '` before the comparison. The static landmine checks themselves were correct on first pass (0 hits); only the shell comparison needed the trim. No file change.

2. **Verify-command `bun run test:unit -- --run <path>` duplicates `--run`.** The `test:unit` package script is already `vitest --run --project unit`, so appending `-- --run <path>` passes `--run` twice and vitest crashes with `Expected a single value for option "--run"`. Resolved by invoking the path without the redundant flag (`bun run test:unit -- <path>`). `portfolio-columns.test.tsx` then ran green (9/9). No file change.

3. **`src/components/ui/__tests__/stat.test.tsx` does not exist**, so Task 2's verify correctly took the `STAT-SKIPPED-NO-TEST-FILE` branch (the verify is conditional on the file's existence by design). The StatTrend swap is instead covered transitively by `kpi-bento-row.test.tsx` (a StatTrend consumer) and the design-token-drift guard. No file change.

4. **Biome reflowed the `<Clock>` JSX.** The `text-amber-600 -> text-[var(--color-warning)]` edit pushed the `<Clock>` element past the print-width, so Biome split it across lines. Applied `biome check --write` to format it canonically before staging — purely cosmetic whitespace; the className change is unchanged. (This is the lint step the pre-commit hook would have flagged anyway.)

5. **commitlint `body-max-line-length` (100).** The first Task 1 commit attempt had a body bullet over 100 chars; the pre-commit hook passed fully (gitleaks/lockfile/lint/typecheck/unit-tests all green) but the commit-msg hook rejected it. Rewrapped the body and re-committed. No file or code change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase success criterion #1 (no white-on-white, no invisible badges, zero `bg-white` in the dashboard subtree) is provably satisfied: the landmine grep returns zero and the canonical utilities/tokens carry guaranteed dual-mode contrast.
- Ready for Plan 06-03 / 06-04 (Wave 1) and the eventual Phase 7 dark-mode verification. No blockers introduced.
- Out-of-scope reminder for Phase 7: `statIndicatorVariants` (stat.tsx:45-56) still carries app-wide `green-500`/`blue-500`/`orange-500` palette classes — intentionally deferred, not a dashboard render path.

## Self-Check: PASSED

- Created file present: `.planning/phases/06-polish-a11y/06-02-SUMMARY.md`
- All 5 modified files present on disk.
- Task commits exist in git history: `d81bbfc1f` (Task 1), `c838c89a1` (Task 2).
- Task 3 was verification-only (no commit, by design).

---
*Phase: 06-polish-a11y*
*Completed: 2026-06-01*
