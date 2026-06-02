---
phase: 07-verification
plan: 01
subsystem: e2e-testing
tags: [e2e, playwright, smoke, dashboard, POLISH-09]
requires:
  - "loginAsOwner (tests/e2e/auth-helpers.ts) — in-test owner auth"
  - "get_dashboard_data_v2 RPC (prod) — RLS-scoped dashboard payload"
  - "owner-axe Playwright project — CI-run authed dashboard project"
provides:
  - "fetchDashboardDataAsOwner — authed RPC fetch for RPC-vs-DOM smoke assertions"
  - "dashboard-smoke.e2e.spec.ts — POLISH-09 /dashboard smoke under owner-axe"
  - "owner-axe collects the smoke spec so CI e2e-smoke gates it"
affects:
  - "CI e2e-smoke job (runs --project=owner-axe) now exercises the dashboard smoke"
tech-stack:
  added: []
  patterns:
    - "RPC-vs-DOM comparison (no hardcoded numbers) for data-shape-tolerant smoke"
    - "in-test loginAsOwner + reduced-motion contextOptions for deterministic KPI reads"
    - "empty-state .or() branch with honest empty assertions (no vacuous skips)"
key-files:
  created:
    - tests/e2e/dashboard-rpc-helpers.ts
    - tests/e2e/tests/owner/dashboard-smoke.e2e.spec.ts
  modified:
    - tests/e2e/playwright.config.ts
decisions:
  - "reducedMotion set via contextOptions (not a top-level use key) for this Playwright 1.60 TestOptions"
  - "search filter param confirmed as ?property= ; status faceted as ?status= ; sort as ?sort="
  - "owner-axe (not the storageState owner project) is the only CI-run authed dashboard project"
metrics:
  duration: "~25m"
  completed: 2026-06-02
  tasks: 3
  files: 3
---

# Phase 7 Plan 01: POLISH-09 /dashboard E2E Smoke Summary

Added the POLISH-09 `/dashboard` smoke for the v2.0 redesigned dashboard — KPI numbers and the occupancy donut assert against the live `get_dashboard_data_v2` RPC (RPC-vs-DOM, never hardcoded), DataTable sort/filter/column-visibility/preset-save+restore and the grid/table toggle are exercised — and wired it into the CI-run `owner-axe` Playwright project so the PR's `e2e-smoke` check gates it.

## What Each Task Produced

### Task 1 — `tests/e2e/dashboard-rpc-helpers.ts` (commit `d4757d43f`)
A reusable, page-less Node fetch helper `fetchDashboardDataAsOwner()`:
- Resolves Supabase URL/key + owner credentials from the SAME env vars `auth-helpers.ts` reads (`TEST_*` preferred, `NEXT_PUBLIC_*` fallback, `E2E_OWNER_EMAIL`/`E2E_OWNER_PASSWORD` with the `\!`→`!` un-escape).
- POSTs the password grant to `/auth/v1/token?grant_type=password`, then POSTs `{ p_user_id: <user.id> }` to `/rest/v1/rpc/get_dashboard_data_v2` with the **owner** Bearer token so RLS scopes the call identically to the in-app fetch.
- Narrows the response through a typed mapper (`mapDashboardSmokeData`) that validates every asserted field (`stats.units.{total,occupied,vacant,occupancyRate}`, `revenue.monthly`, `leases.{active,expiringSoon}`, `maintenance.open`, `properties.total`) and throws an actionable, path-tagged error on any missing/mistyped field. No `any`, no `as unknown as` — `unknown` + `isRecord`/`requireNumber`/`requireObject` type guards.
- Non-2xx token or RPC responses throw with the status + body, so a misconfigured run fails loud rather than as a confusing DOM mismatch.

### Task 2 — `tests/e2e/tests/owner/dashboard-smoke.e2e.spec.ts` (commit `49b303f73`)
The POLISH-09 smoke spec (7 tests), authenticating in-test via `loginAsOwner` (owner-axe pattern, no storageState), suppressing the onboarding tour, and tolerating the zero-data owner via the empty-state `.or()` branch with honest empty assertions:
1. **KPI numbers match the RPC** — reads each `[data-slot="stat-value"]` by its `[data-slot="stat-label"]` tile, strips `$`/`,`/`%`, asserts Revenue=`round(revenue.monthly)`, Occupancy=`round(units.occupancyRate)`, Active leases, Open maintenance, Properties, Units. Empty branch asserts the KPI row is absent.
2. **Occupancy donut matches stats.units** — exact `role="img"` aria-label `Occupancy donut: {pct} percent occupied ({occupied} of {total} units)`; `units.total===0` asserts the "No units yet" honesty branch.
3. **DataTable sort** — mouse-click "Monthly Rent" header trigger flips its `<th>` `aria-sort` from `none`; keyboard `Enter` on the focused "Property" trigger flips `ascending`→`descending`.
4. **Faceted status filter** — selecting "Vacant" writes `?status=`, surfaces "Reset filters"; Reset clears `?status=`.
5. **Column-visibility** — "Toggle columns" combobox toggles the hideable "Maintenance" column off (header removed) and back on.
6. **Preset save + restore across reload (DT-08)** — sets `?property=a`, saves a uniquely-named preset, clears the filter, re-applies the preset (param + input value restored), reloads, and confirms the persisted preset still appears in the menu.
7. **Grid/Table toggle** — Grid radio `aria-checked=true` + table removed; Table radio `aria-checked=true` + `aria-label="Property portfolio"` table returns.

Reduced motion is set via `test.use({ contextOptions: { reducedMotion: "reduce" } })` so `useReducedMotion()` returns true and `KpiNumberTicker` renders its final value immediately (avoids the IntersectionObserver stuck-0 read).

### Task 3 — `tests/e2e/playwright.config.ts` (commit `e68b511e1`)
- `owner-axe` `testMatch` broadened to `["**/owner/dashboard-a11y.e2e.spec.ts", "**/owner/dashboard-smoke.e2e.spec.ts"]`.
- `owner`, `firefox`, `mobile-chrome` `testIgnore` each add `"**/owner/dashboard-smoke.e2e.spec.ts"` (self-authenticating spec must not run under stale storageState).
- CI workflow command (`--project=smoke --project=public --project=owner-axe`) unchanged — widening the project testMatch is sufficient.

## `playwright --list` Result (owner-axe collects the smoke)

```
[owner-axe] › owner/dashboard-a11y.e2e.spec.ts:80  › has zero WCAG 2.1 A/AA violations
[owner-axe] › owner/dashboard-a11y.e2e.spec.ts:99  › has zero page-level horizontal scroll at 375px
[owner-axe] › owner/dashboard-smoke.e2e.spec.ts:150 › KPI numbers match get_dashboard_data_v2
[owner-axe] › owner/dashboard-smoke.e2e.spec.ts:179 › occupancy donut matches stats.units
[owner-axe] › owner/dashboard-smoke.e2e.spec.ts:204 › DataTable sort works (mouse + keyboard)
[owner-axe] › owner/dashboard-smoke.e2e.spec.ts:233 › faceted status filter writes the status param and Reset clears it
[owner-axe] › owner/dashboard-smoke.e2e.spec.ts:256 › column-visibility toggle hides and restores a column
[owner-axe] › owner/dashboard-smoke.e2e.spec.ts:282 › preset save + restore survives reload (DT-08)
[owner-axe] › owner/dashboard-smoke.e2e.spec.ts:331 › grid/table view toggle works
```

Negative checks: `owner`, `firefox`, and `mobile-chrome` each collect **0** `dashboard-smoke` tests.

## Deviations from Plan

**1. [Rule 3 — blocking issue] `reducedMotion` set via `contextOptions`, not a top-level `use` key.**
- **Found during:** Task 2 typecheck.
- **Issue:** The plan suggested `test.use({ ... })` reduced-motion emulation. In Playwright 1.60's `TestOptions`, `reducedMotion` is a **context-level** option — `test.use({ reducedMotion: "reduce" })` raised `TS2353` (not in `Fixtures`).
- **Fix:** Used the documented `test.use({ contextOptions: { reducedMotion: "reduce" } })` form (verified against `node_modules/playwright/types/test.d.ts`, which documents exactly this `contextOptions.reducedMotion: 'reduce'` pattern). Same runtime effect (`prefers-reduced-motion: reduce` on the context), so `useReducedMotion()` returns true. Docstring updated to match.
- **Files modified:** tests/e2e/tests/owner/dashboard-smoke.e2e.spec.ts
- **Commit:** 49b303f73

No other deviations — the plan executed as written. Selectors were taken verbatim from the component source (kpi-bento-row, occupancy-donut-chart, portfolio toolbar/columns/preset-menu, data-table-view-options, data-table-column-header). nuqs param names (`property`, `status`, `sort`) match the verified facts.

## Authentication Gates

None. The smoke's first BINDING run is on CI (live prod auth + secrets), identical to the Phase 6 a11y sweep. Local verification was `tsc --noEmit` + `playwright --list` (spec confirmed collected by owner-axe) — the full E2E was intentionally not run locally per the plan's constraints.

## Known Stubs

None. The helper and spec contain no hardcoded empty values, placeholder text, or unwired data sources — all expected values derive from the live RPC.

## Verification

- `bunx playwright test --project=owner-axe --list` → dashboard-a11y AND dashboard-smoke (9 matched lines). PASS.
- `bunx tsc --noEmit -p tests/e2e/tsconfig.json` → no errors attributable to the two new files (pre-existing `auth-helpers.ts` / legacy `owner-*` spec `noUnused*` errors are out of scope, as in Phase 6). PASS.
- `grep loginAsOwner` (3) and `grep fetchDashboardDataAsOwner` (2) present in the spec. PASS.
- Storage-state `owner`/`firefox`/`mobile-chrome` collect 0 smoke tests. PASS.
- lefthook pre-commit (gitleaks, lockfile, lint, typecheck, unit-tests) + commit-msg (commitlint) green on all three commits.

## Self-Check: PASSED

- FOUND: tests/e2e/dashboard-rpc-helpers.ts (233 lines, min 40)
- FOUND: tests/e2e/tests/owner/dashboard-smoke.e2e.spec.ts (349 lines, min 120)
- FOUND: tests/e2e/playwright.config.ts
- FOUND commit d4757d43f (Task 1)
- FOUND commit 49b303f73 (Task 2)
- FOUND commit e68b511e1 (Task 3)
