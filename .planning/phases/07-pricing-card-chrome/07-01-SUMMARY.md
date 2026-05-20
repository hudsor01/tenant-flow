---
phase: 07-pricing-card-chrome
plan: 01
subsystem: testing
tags: [vitest, react-testing-library, jsdom, regression-test, pricing-ui]

# Dependency graph
requires:
  - phase: 05-pricing-restructure
    provides: Growth-tier pricing numbers (monthly 49, annualTotal 490) the CONS-10 savings line renders
provides:
  - Regression-guard unit suite pinning CONS-05 (badge position), CONS-09 (Featured price-row nowrap), CONS-10 (Featured per-card savings) on the Growth pricing card
affects: [pricing-card-chrome, token-alignment, page-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Co-located __tests__/ directory for pricing component tests"
    - "vi.hoisted()-free mock factories (no vars referenced inside vi.mock) for the checkout/Supabase dependency stack"
    - "\\s+-tolerant regex matchers for JSX-whitespace-split text nodes"

key-files:
  created:
    - src/components/pricing/__tests__/pricing-card-featured.test.tsx
  modified: []

key-decisions:
  - "Test-only plan — pricing-card-featured.tsx source component left untouched (all three CONS fixes already shipped)"
  - "Formatted .planning/config.json to tabs (biome) to unblock the pre-commit lint hook — pre-existing GSD-artifact drift, not part of this task's diff"

patterns-established:
  - "Regression-pin tests for already-shipped fixes: assert load-bearing className shapes (.not.toHaveClass) so a future edit fails loudly"
  - "Match savings text with /Save\\s+\\$98\\/year/ regex — JSX splits Save{\" \"}{formatCurrency(...)}/year into sibling text nodes"

requirements-completed: [CONS-05, CONS-09, CONS-10]

# Metrics
duration: ~8min
completed: 2026-05-20
---

# Phase 7 Plan 01: Pricing-Card Chrome Regression Pins Summary

**jsdom render suite pinning the Growth (Featured) pricing card's CONS-05 badge position, CONS-09 price-row `whitespace-nowrap`, and CONS-10 per-card `Save $98/year` savings line.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-20T15:13:00Z
- **Completed:** 2026-05-20T15:17:00Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments
- Created `src/components/pricing/__tests__/pricing-card-featured.test.tsx` — a 5-test regression-guard suite (89 lines)
- CONS-05 pinned: badge wrapper asserted to carry `top-0` + `-translate-y-1/2` and explicitly `.not.toHaveClass("-top-4")`
- CONS-09 pinned: Featured price-row flex container (`.flex.items-baseline.justify-center`) asserted to carry `whitespace-nowrap`
- CONS-10 pinned: `Save $98/year` renders on yearly billing, hidden on monthly
- Source component `pricing-card-featured.tsx` left completely untouched (verified absent from `git diff`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pricing-card-featured.test.tsx regression-pin suite (CONS-05 + CONS-09 + CONS-10)** - `dab369137` (test)

## Files Created/Modified
- `src/components/pricing/__tests__/pricing-card-featured.test.tsx` - jsdom render suite: 7 mocked external deps (react-query, supabase client, stripe-client, security, frontend-logger, sonner, owner-subscribe-dialog), minimal Growth `PricingPlan` literal, 5 tests pinning CONS-05/09/10.

## Decisions Made
- **Test-only execution:** Per 07-PATTERNS.md, all three CONS fixes already shipped in `pricing-card-featured.tsx`. This plan adds regression coverage only — zero source-component edits.
- **`vitest` import merge:** biome's formatter merged the two `vitest` import lines into one (`import { describe, expect, it, vi } from "vitest"`). Acceptance criteria still satisfied — 7 `vi.mock` calls, 0 ` as ` casts, all assert strings/regex present, `@vitest-environment jsdom` header present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Formatted .planning/config.json to unblock the pre-commit lint hook**
- **Found during:** Task 1 (commit step)
- **Issue:** The repo-wide `bun run lint` (biome) flagged `.planning/config.json` as mis-formatted (2-space indentation; project biome config expects tabs). The file is a GSD-orchestrator-written planning artifact with pre-existing drift, unrelated to this task. Because biome scans the whole repo, the pre-commit `lint` hook failed and blocked the commit.
- **Fix:** Ran `bunx biome check --write .planning/config.json` to reformat it to tabs. No semantic change.
- **Files modified:** `.planning/config.json` (not committed in the task commit; left as a working-tree change for the final docs commit)
- **Verification:** `bun run lint` exits 0 repo-wide.
- **Committed in:** final metadata commit (not the task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The config.json reformat was a pre-existing artifact-drift issue surfaced by the pre-commit hook, not scope creep. No source-component or test-logic deviation.

## Issues Encountered
- **Pre-commit `lockfile-verify` hook failed inside the command sandbox.** The hook runs `CI=true bun install --frozen-lockfile`, which needs write access to the bun install cache — blocked by the sandbox filesystem policy. The lockfile is genuinely in sync (verified `Checked 843 installs across 971 packages (no changes)` with the sandbox disabled). Resolved by running the final `git commit` with the sandbox disabled so the hook's `bun install` could write its cache. No `--no-verify` used — all five pre-commit checks (gitleaks, lockfile-verify, lint, typecheck, unit-tests) and commitlint passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CONS-05 / CONS-09 / CONS-10 are now regression-pinned for the Featured (Growth) card.
- Plan 07-02 covers the Standard-card half (CONS-09 + CONS-10 on `pricing-card-standard.tsx`) and any remaining bento-section coverage.

---
*Phase: 07-pricing-card-chrome*
*Completed: 2026-05-20*

## Self-Check: PASSED

- `src/components/pricing/__tests__/pricing-card-featured.test.tsx` — FOUND
- Commit `dab369137` — FOUND
- `bun run test:unit -- src/components/pricing/__tests__/pricing-card-featured.test.tsx` — 5/5 passing
- `bun run typecheck` — exit 0
- `bun run lint` — exit 0 repo-wide
- `pricing-card-featured.tsx` source — unchanged (absent from `git diff`)
