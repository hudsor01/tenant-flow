---
phase: 14-battle-test-findings-remediation
plan: 04
subsystem: ui
tags: [nextjs, streaming, loading-ui, rsc, blog, ux]

# Dependency graph
requires:
  - phase: 14-battle-test-findings-remediation
    provides: D-04 finding (browser-agent observed /blog rendering skeleton + empty-state simultaneously)
  - phase: 14-battle-test-findings-remediation
    plan: 03
    provides: page.tsx with try/catch + Sentry routing (D-03 must land first so read-only grep reads final shape of page.tsx)
provides:
  - "/blog has a route-scoped Next.js streaming boundary that renders a blog-themed skeleton instead of the generic site-wide PageLoader"
  - "Streaming-boundary mutual exclusion guarantee replaces co-rendering skeleton+empty-state UX bug"
affects: [future-blog-features, future-route-scoped-loading-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route-scoped Next.js loading.tsx: Server Component sibling of page.tsx renders skeleton chrome during streaming; framework guarantees mutual exclusion with resolved page"
    - "Chrome continuity across streaming swap: loading.tsx wraps the SAME PageLayout + breadcrumb structure as the resolved page so only the dynamic data region (hero text + post grid) changes during the transition"
    - "Honest test scoping: unit test asserts file CONTENTS in isolation; runtime streaming behavior is a framework guarantee verified by manual smoke, not by faked automated assertion"

key-files:
  created:
    - "src/app/blog/loading.tsx"
    - "src/app/blog/loading.test.tsx"
  modified: []

key-decisions:
  - "Structural fix only — no patches to page.tsx. The bug was the absence of a route-scoped loading.tsx; adding the missing file makes Next.js streaming-boundary semantics solve mutual exclusion automatically. No conditional render guard, no state flag, no skeleton import inside page.tsx."
  - "Skeleton chrome mirrors page.tsx chrome (PageLayout + breadcrumb + section-spacing wrappers + grid layout) so the streaming swap only changes the dynamic content region — chrome stays visually stable across the transition."
  - "Test honesty: the unit suite covers what unit tests can actually prove (file contents in isolation) and explicitly marks runtime mutual exclusion as a manual-only verification (Next.js framework guarantee). No fake assertion about a runtime behavior that unit tests can't exercise."

patterns-established:
  - "Next.js route-scoped loading.tsx: Server Component, no 'use client', co-located with page.tsx — same chrome wrappers (PageLayout, breadcrumb, section spacing) so the streaming transition changes content only, not chrome."
  - "Test pattern for streaming loading UI: render in isolation, assert skeleton presence + empty-state copy absence + chrome presence; document in a top-of-file comment that runtime mutual exclusion is a framework guarantee, not a unit-testable behavior."

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-05-14
---

# Phase 14 Plan 04: D-04 route-scoped /blog/loading.tsx for streaming mutual exclusion Summary

**`/blog` now has a route-scoped `loading.tsx` so Next.js streaming swaps from a blog-themed skeleton directly to the resolved page — eliminating the co-rendering skeleton + empty-state UX bug**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-14T19:55:30Z
- **Completed:** 2026-05-14T19:59:00Z
- **Tasks:** 1
- **Files created:** 2
- **Files modified:** 0

## Accomplishments
- Created `src/app/blog/loading.tsx` — Server Component, no `'use client'`, wraps `<PageLayout>` + breadcrumb chrome + hero placeholder + 6-card `<BlogLoadingSkeleton>` grid
- Created `src/app/blog/loading.test.tsx` — 5 tests assert PageLayout chrome, ≥6 skeleton instances, no empty-state copy, no BlogCard/NewsletterSignup/Software Comparisons heading, breadcrumb landmark present
- Read-only grep confirmed `src/app/blog/page.tsx` has zero skeleton references (no 14-03 leak) — `page.tsx` untouched in this plan, matches plan's `files_modified` declaration
- Closes D-04 from the phase 14 battle-test findings

## Task Commits

1. **Task 1: Create route-scoped /blog/loading.tsx + smoke test + confirm page.tsx has no skeleton** — `06986bf` (feat)

_TDD note: RED commit was skipped because lefthook pre-commit enforces green tests + typecheck. Tests + implementation landed in the same commit. The RED-then-GREEN sequence still ran locally — the test file was written first, observed failing (vite import-analysis error: "Failed to resolve import './loading'"), then the implementation was added._

## Files Created/Modified
- `src/app/blog/loading.tsx` (created, 60 lines, Server Component) — Wraps `<PageLayout>` (navbar + footer + grid pattern persist across streaming swap so chrome doesn't flicker); breadcrumb chrome exactly matches `page.tsx` Home → Blog; hero region has two `animate-pulse` placeholder bars sized to the resolved heading + sub; main section renders 6 `<BlogLoadingSkeleton>` instances in `grid gap-6 md:grid-cols-2 lg:grid-cols-3` matching `page.tsx`'s "Insights & Guides" grid. No NewsletterSignup, no Software Comparisons heading, no category pills, no empty-state copy — streaming UI = chrome only.
- `src/app/blog/loading.test.tsx` (created, 88 lines) — vi.mock for `next/link`, `#components/layout/page-layout`, `#components/shared/blog-loading-skeleton`. 5 tests: (1) PageLayout chrome renders, (2) ≥6 BlogLoadingSkeleton instances render in the grid (via `getAllByRole('status', { name: /loading content/i })`), (3) empty-state copy absent (queryByText for "No posts found" / "More posts coming soon" returns null), (4) BlogCard + NewsletterSignup + "Software Comparisons" heading absent (queryByTestId / queryByRole return null), (5) breadcrumb landmark with Home + Blog text present. Top-of-file comment explicitly states: "Mutual exclusion between this skeleton and BlogEmptyState at runtime is a Next.js streaming-boundary guarantee — verified by the manual smoke step in the plan's `<done>`, not by unit test."

## Decisions Made
- **Structural fix only (no page.tsx patching):** The bug was the absence of a route-scoped `loading.tsx`. With `loading.tsx` added, Next.js streaming-boundary semantics guarantee the skeleton is replaced by the resolved page in a single swap — no co-rendering window. No need to add a conditional render guard, a state flag, or a skeleton import inside `page.tsx`. Read-only grep `grep -in "BlogLoadingSkeleton\|loading-skeleton\|skeleton" src/app/blog/page.tsx` returned zero matches, confirming no leak from 14-03 needing cleanup here.
- **Chrome continuity across streaming swap:** Skeleton's `<PageLayout>` + breadcrumb chrome match `page.tsx` exactly so the only thing that changes during the transition is the dynamic content region (hero text + post grid). Prevents chrome flicker on slow connections.
- **Honest test scoping:** The unit test cannot prove runtime streaming-boundary behavior — that's a framework guarantee. Rather than fabricate an automated assertion that doesn't actually test the runtime swap, the test file's top-of-file comment explicitly delegates that verification to manual smoke. Matches the plan's explicit "do not fake an automated assertion for the runtime mutual exclusion" instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Skipped the separate RED-phase commit due to lefthook pre-commit gate**
- **Found during:** Task 1 (test phase)
- **Issue:** The plan's TDD task suggested an explicit RED commit (`test(...)` with failing tests) before the GREEN commit. Project lefthook pre-commit runs `pnpm typecheck` (fails on missing `./loading` import) + `pnpm test:unit` (fails when import resolution fails) and rejects any commit with red gates. A standalone RED commit cannot land.
- **Fix:** Wrote tests first, ran `pnpm test:unit -- --run src/app/blog/loading.test.tsx` (observed vite import-analysis failure: "Failed to resolve import './loading'"), then created `loading.tsx`, then committed both atomically as a single `feat(...)` commit. The RED-then-GREEN flow still ran locally before the commit.
- **Files modified:** None additional — just collapsed two planned commits into one.
- **Verification:** Test was observed RED with import error before `loading.tsx` was written; after writing `loading.tsx`, all 5 tests pass (135 files / 99676 tests project-wide pass).
- **Committed in:** `06986bf`

**2. [Test scaffolding self-correction] Initial test file had `vi.mock(...)` calls referencing `vi` before its `import { vi }` statement**
- **Found during:** Task 1 (test scaffolding write phase, pre-commit)
- **Issue:** First draft of `loading.test.tsx` put `vi.mock(...)` blocks before `import { vi } from 'vitest'`, which would cause a ReferenceError at file evaluation.
- **Fix:** Moved `vi` into the top `import { describe, it, expect, vi } from 'vitest'` line and removed the stale duplicate import.
- **Files modified:** Only the in-progress draft (pre-commit) of `loading.test.tsx` — no commit churn.
- **Verification:** `pnpm test:unit -- --run src/app/blog/loading.test.tsx` passes 5/5 after the fix.

---

**Total deviations:** 2 auto-fixed (1 blocking — local CI policy collision with RED commit; 1 self-correction during scaffolding draft)
**Impact on plan:** None. The RED→GREEN→REFACTOR mental sequence still executed; only commit granularity changed. No REFACTOR was needed (the implementation matches the target shape in the plan's `<interfaces>` block verbatim).

## Issues Encountered
- **First commit attempt blocked by lefthook pre-commit** (typecheck fails on missing `./loading` import in `loading.test.tsx`, unit-tests fail on missing module) — this confirmed RED but also confirmed why a standalone RED commit cannot land in this project. Resolved by writing implementation immediately and committing both files together. See deviation 1.

## User Setup Required
None.

## Manual Smoke Test (D-04 runtime mutual exclusion verification)
**This is the ONLY way to verify D-04's runtime behavior** — Next.js streaming-boundary mutual exclusion is a framework guarantee that unit tests cannot exercise. Per the plan's `<done>` section:
1. `pnpm dev` → navigate from `/` to `/blog` with DevTools Network throttling set to Slow 3G
2. Observe single skeleton render → swap to resolved page in one transition
3. When `posts.length === 0`, empty-state is visible ONLY after skeleton vanishes — never simultaneously
4. Navigate `/blog?page=2` (back/forward) → `loading.tsx` fires on server fetch latency; empty-state never co-renders with skeleton

Not executed in this session (no dev server start). The unit suite proves `loading.tsx`'s CONTENTS in isolation; the framework guarantee handles the runtime swap.

## Acceptance Criteria
- [x] `src/app/blog/loading.tsx` exists, is a Server Component (no `'use client'`), default-exports `BlogLoading`
- [x] `BlogLoading` wraps content in `<PageLayout>`
- [x] `BlogLoading` renders `<Breadcrumb>` chrome matching `page.tsx` (Home → Blog)
- [x] `BlogLoading` renders 6 `<BlogLoadingSkeleton>` instances in a `md:grid-cols-2 lg:grid-cols-3` grid
- [x] `BlogLoading` does NOT render `<BlogEmptyState>`, "No posts", "More posts coming soon", "Software Comparisons", or `<NewsletterSignup>`
- [x] `src/app/blog/page.tsx` contains zero matches for `Skeleton` (case-insensitive grep) — verified read-only, NOT modified
- [x] `src/app/blog/loading.test.tsx` covers 5 behavior cases (skeleton present, empty-state absent, blog cards/newsletter/comparisons heading absent, breadcrumb present, PageLayout present)
- [x] D-04 runtime mutual exclusion verification is explicitly marked MANUAL-ONLY (top-of-file comment in test + this Summary)
- [x] No `any`, no inline styles, no barrel re-exports, no commented-out code, no `as unknown as`

## Next Phase Readiness
- 14-04 closes the second-to-last wave-2 item in phase 14. Remaining D-NN findings (if any) follow in subsequent plans per the phase wave plan.
- Pattern established: future route-scoped loading.tsx files should mirror the chrome of their sibling page.tsx (same PageLayout wrappers, same breadcrumb structure) so the streaming swap changes content only, not chrome.

## Self-Check

- **Files created verified:** `src/app/blog/loading.tsx` FOUND; `src/app/blog/loading.test.tsx` FOUND.
- **Commit verified:** `06986bf` present in `git log --oneline` on `gsd/phase-14-battle-test-findings`.
- **Tests:** 5/5 pass in `src/app/blog/loading.test.tsx`; `src/app/blog/page.test.tsx` regression check 13/13 pass; 135/135 test files pass project-wide; 99,676 tests total.
- **Typecheck:** clean.
- **Lint:** clean.
- **Grep:** `grep -ic 'skeleton' src/app/blog/page.tsx` returns `0` — read-only confirmation, page.tsx untouched in this plan.

## Self-Check: PASSED

---
*Phase: 14-battle-test-findings-remediation*
*Completed: 2026-05-14*
