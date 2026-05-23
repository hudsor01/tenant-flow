---
phase: 09-page-cleanup
plan: 01
subsystem: marketing-pages
tags: [regression-tests, audit-pins, vitest]
requires: []
provides:
  - "CONS-13 regression pin: logo-cloud consistent visual weight"
  - "CONS-14 regression pin: comparison-table de-duplication"
  - "CONS-04 verification: legal-page date drift guard confirmed green"
affects:
  - src/components/sections/__tests__/logo-cloud.test.tsx
  - src/app/__tests__/marketing-home.test.tsx
tech-stack:
  added: []
  patterns:
    - "render + container.querySelector positive/negative pin pairing (logo-cloud)"
    - "readFileSync source-text scan with word-boundary regexes (marketing-home)"
key-files:
  created:
    - src/components/sections/__tests__/logo-cloud.test.tsx
    - src/app/__tests__/marketing-home.test.tsx
  modified: []
decisions:
  - "Task 1 (CONS-04) is verify-only — existing sitemap.test.ts drift guard passes, no commit made (no file change)"
  - "Marketing-home test uses readFileSync source scan, not render — 'use client' component with 8 section imports would require mocking the whole tree"
metrics:
  duration: ~2min
  completed: 2026-05-21
---

# Phase 9 Plan 01: Page Cleanup Regression Pins Summary

Verify-and-pin phase: confirmed the CONS-04 legal-date drift guard stays green and added two new Vitest regression-pin test files locking the already-shipped CONS-13 (faded-logo) and CONS-14 (duplicate comparison-table) audit fixes against silent regression. Zero production-code change.

## What Was Built

All three production fixes (CONS-04, CONS-13, CONS-14) shipped earlier via PR #693 (`947299f19`, 2026-05-11). This plan delivers regression coverage only.

### Task 1 — CONS-04 verification (no file change)
Ran `bun run test:unit src/app/sitemap.test.ts` — 14 tests pass, including Test 4b's hardcoded `"2026-05-11"` assertions and the three drift-guard `it()` tests that `readFileSync` each legal page body and assert the extracted `Last Updated` date matches the emitted sitemap `lastModified`. CONS-04 is satisfied on `main`; no legal-date or sitemap file was modified. No commit made — verify-only task with no file change (per success criteria, skipped rather than making an empty commit).

### Task 2 — CONS-13 logo-cloud regression pin
Created `src/components/sections/__tests__/logo-cloud.test.tsx` (3 tests):
- Renders all 5 integration logos (asserts description strings: Payments, Database, Hosting, E-Signatures, Email).
- No `grayscale` class anywhere in rendered HTML (the exact pre-fix CONS-13 symptom).
- Exactly 5 logo wrappers carry the shared `opacity-90` class, zero carry the old `opacity-80`.
Commit `e0c2c047f`.

### Task 3 — CONS-14 marketing-home de-dup regression pin
Created `src/app/__tests__/marketing-home.test.tsx` (4 tests, `readFileSync` source-text scan):
- Homepage source does NOT contain a `<ComparisonTable>` JSX tag.
- Homepage source does NOT import `ComparisonTable`.
- Homepage retains the `CONS-14` removal-marker comment.
- `/features` (`features-client.tsx`) still renders `<ComparisonTable />` — the canonical kept instance.
Word-boundary / `<ComparisonTable\b` tag-form regexes avoid false-matching the unrelated `PricingComparisonTable` component.
Commit `77260cdb0`.

## Verification

| Check | Result |
|-------|--------|
| `bun run test:unit src/app/sitemap.test.ts` | 14 tests pass (CONS-04 drift guard) |
| `bun run test:unit src/components/sections/__tests__/logo-cloud.test.tsx` | 3 tests pass |
| `bun run test:unit src/app/__tests__/marketing-home.test.tsx` | 4 tests pass |
| `bun run typecheck` | clean |
| `bun run lint` | clean |
| Full unit suite + coverage (pre-commit hook, both commits) | green |
| `git status --porcelain` | only 2 new test files — zero production-code change |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed redundant `--run` from test commands**
- **Found during:** Task 1
- **Issue:** The plan's `<automated>` commands use `bun run test:unit -- --run <path>`, but the `test:unit` package.json script is already `vitest --run --project unit`. The duplicate `--run` crashes Vitest CAC with `Expected a single value for option "--run", received [true, true]`.
- **Fix:** Ran `bun run test:unit <path>` (no extra `--run`). Pure command-invocation correction — no source or test-file change.
- **Files modified:** none
- **Commit:** n/a

**2. [Rule 1 - Bug] Collapsed multi-line regex argument to one line for Biome**
- **Found during:** Task 3
- **Issue:** `bun run lint` (Biome) flagged the `homepage does NOT import ComparisonTable` assertion — Biome formats the single-argument `.not.toMatch(...)` call onto one line.
- **Fix:** Inlined the regex argument. No behavior change; test still passes 4/4.
- **Files modified:** src/app/__tests__/marketing-home.test.tsx
- **Commit:** 77260cdb0

## Authentication Gates

None.

## Self-Check: PASSED

- FOUND: src/components/sections/__tests__/logo-cloud.test.tsx
- FOUND: src/app/__tests__/marketing-home.test.tsx
- FOUND: commit e0c2c047f (CONS-13 logo-cloud pin)
- FOUND: commit 77260cdb0 (CONS-14 comparison-table pin)
