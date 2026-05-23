---
phase: 14-battle-test-findings-remediation
plan: 01
subsystem: ui

tags: [next-app-router, not-found, marketing-layout, accessibility, ux]

requires:
  - phase: 13-marketing
    provides: PageLayout marketing wrapper (navbar + footer + page-offset-navbar)
provides:
  - Public 404 wraps PageLayout so signed-out visitors see marketing nav + footer
  - NotFoundPage with dashboardLabel prop + inferLabel helper
  - Six-case unit test suite covering all label-resolution branches
affects: [public-marketing, signed-out-visitor-recovery]

tech-stack:
  added: []
  patterns:
    - "Reusable not-found component with smart href-derived button label"
    - "Server-Component public 404 wrapped in marketing PageLayout"

key-files:
  created: []
  modified:
    - src/components/shared/not-found-page.tsx
    - src/app/not-found.tsx
    - src/components/shared/not-found-page.test.tsx

key-decisions:
  - "Infer button label from dashboardHref via pure helper (/ -> Back to Home, /dashboard -> Back to Dashboard, else -> Go back) instead of forcing every caller to pass a label"
  - "Preserve /dashboard default so existing route-level (owner) not-found.tsx files don't regress"
  - "Add explicit dashboardHref='/dashboard' test case (W-1) so inferLabel is verified directly, not just transitively via the default prop"

patterns-established:
  - "Public 404 vs. nested route-level 404: public 404 wraps PageLayout and points home; route-level 404 inside an authenticated layout keeps the dashboard button"

requirements-completed: []

duration: 4min
completed: 2026-05-14
---

# Phase 14 Plan 01: Public 404 Wraps Marketing Layout + Smart Button Label Summary

**Signed-out visitors hitting a typo URL now land on the marketing navbar + footer with a "Back to Home" recovery button instead of a stranded auth-flavored 404 that bounced them to /login (D-01).**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-14T14:42:00Z
- **Completed:** 2026-05-14T14:46:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- `NotFoundPage` gained an `inferLabel` helper that resolves the recovery button label from `dashboardHref` (`/` → "Back to Home", `/dashboard` → "Back to Dashboard", else → "Go back"), with a `dashboardLabel` prop for explicit overrides.
- `src/app/not-found.tsx` now wraps `<NotFoundPage dashboardHref="/" />` inside `<PageLayout>` so the marketing navbar + footer render on the public 404. Stays a Server Component (no `'use client'`).
- Unit test suite extended from 5 to 6 cases, including the explicit `dashboardHref="/dashboard"` inference case required by W-1.
- Zero regression for the seven dashboard route-level `not-found.tsx` files under `src/app/(owner)/**` — they call `<NotFoundPage />` with no props, so the `/dashboard` default still wins and the button still reads "Back to Dashboard".

## Task Commits

1. **Task 1: Verify + finalize D-01 implementation** — `6933387` (feat)

## Files Created/Modified

- `src/components/shared/not-found-page.tsx` — Added `dashboardLabel` prop + `inferLabel` helper; label is now `dashboardLabel ?? inferLabel(dashboardHref)`.
- `src/app/not-found.tsx` — Wrapped `<NotFoundPage dashboardHref="/" />` in `<PageLayout>`.
- `src/components/shared/not-found-page.test.tsx` — Added the explicit `dashboardHref="/dashboard"` inference case (W-1); now covers six branches: default render, default href, explicit `/dashboard`, "/" inference, "/tenant" fallback, explicit override, plus alert title + description assertions.

## Decisions Made

- **Pure helper instead of a label map** — `inferLabel(href)` is a one-line function with three branches; a map/object would only obscure intent at this size.
- **Preserve `/dashboard` as the default `dashboardHref`** — keeps every route-level (owner) `not-found.tsx` working without touching them. Sole edit is to the public `src/app/not-found.tsx`, which passes `dashboardHref="/"`.
- **Explicit `/dashboard` test case (W-1)** — kept the default-render test (which proves the default-prop transitively) AND added an explicit `dashboardHref="/dashboard"` case so `inferLabel('/dashboard')` is verified directly. Reviewer flagged that the prior suite only proved the default-prop path, not the explicit input path.

## Deviations from Plan

None — plan executed exactly as written. The three files already had the locked D-01 design implemented on-branch from earlier session work; this plan added the missing explicit `dashboardHref="/dashboard"` test case (W-1) and committed the in-progress changes as a single atomic commit.

## Issues Encountered

**Lefthook pre-commit Node version mismatch (transient):** The first `git commit` attempt failed with `MODULE_NOT_FOUND` for eslint/tsc/vitest under `node_modules/...`. Root cause: the lefthook subprocess resolved to Node v25.9.0 (warning: `Unsupported engine: wanted: {"node":"24.x"}`), which evaluated module paths differently than the parent shell — the same `pnpm typecheck` / `pnpm lint` / `pnpm test:unit` commands passed cleanly when invoked directly. Re-running the commit immediately succeeded with all five hooks green (gitleaks, lockfile-verify, lint, typecheck, unit-tests). No code change required.

**Commitlint body-line length (fixed):** Initial commit body had lines >100 chars. Reformatted to wrap at ~80 chars and committed cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plans 14-02, 14-03, 14-04 remain. D-01 is closed; D-02/D-03/D-04 are independent of the public 404 work.
- No blockers introduced. PageLayout integration confirmed working at runtime (marketing nav + footer render through the existing wrapper used by every other marketing route).

## Self-Check: PASSED

- File `src/components/shared/not-found-page.tsx` — FOUND, contains `inferLabel` and `dashboardLabel` prop.
- File `src/app/not-found.tsx` — FOUND, wraps `<NotFoundPage dashboardHref="/" />` in `<PageLayout>`.
- File `src/components/shared/not-found-page.test.tsx` — FOUND, six `it(...)` cases including explicit `dashboardHref="/dashboard"`.
- Commit `6933387` — FOUND in `git log`.
- All 6 NotFoundPage tests pass under `npx vitest run src/components/shared/not-found-page.test.tsx`.
- `pnpm typecheck` and `pnpm lint` both clean.
- Lefthook pre-commit gate green (gitleaks + lockfile-verify + lint + typecheck + unit-tests, 99,534 tests passing).

---
*Phase: 14-battle-test-findings-remediation*
*Plan: 01*
*Completed: 2026-05-14*
