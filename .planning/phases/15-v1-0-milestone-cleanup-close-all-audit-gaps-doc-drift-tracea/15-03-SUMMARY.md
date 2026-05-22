---
phase: 15-v1-0-milestone-cleanup
plan: 03
subsystem: package-deps
tags: [stripe, dead-deps, drift-guard, package-cleanup]
requires: []
provides:
  - "Drift guard test pinning @stripe/(react-)?stripe-js out of package.json"
affects:
  - src/lib/__tests__/no-stripe-js-deps.test.ts
tech-stack:
  added: []
  patterns:
    - "readFileSync + JSON.parse package.json drift guard"
key-files:
  created:
    - src/lib/__tests__/no-stripe-js-deps.test.ts
  modified: []
decisions:
  - "Task 1 was a confirmation no-op — both packages were already absent from package.json and bun.lock; the repo migration from pnpm-lock.yaml to bun.lock (post Phase 14) had already retired them. No `bun remove` ran."
  - "Test uses typed JSON cast `as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }` per PATTERNS.md and CLAUDE.md Rule 1 (no `any`). Rule 8 forbids `as unknown as`; a single non-`unknown` structural cast on JSON.parse output is the sanctioned path."
  - "Test passes 4/4 under `bunx vitest --run --project unit src/lib/__tests__/no-stripe-js-deps.test.ts` (313ms duration)."
metrics:
  duration: ~15 minutes
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  completed: 2026-05-21
requirements-completed: []
---

# Phase 15 Plan 03: Remove @stripe/react-stripe-js Dead Peer-Dep — Summary

One-liner: ships drift-guard test `no-stripe-js-deps.test.ts` enforcing both `@stripe/react-stripe-js` and `@stripe/stripe-js` stay out of `package.json` forever; the actual `bun remove` was a no-op because the packages were already absent.

## Task 1 — Sanity-check current state

Per the plan's decision tree, Task 1 follows the **NO MATCH path** (confirmation-only no-op):

| Check | Expected | Actual |
|-------|----------|--------|
| `grep -cE "@stripe/(react-)?stripe-js" package.json` | 0 | 0 |
| `grep -cE "@stripe/(react-)?stripe-js" bun.lock` | 0 | 0 |
| `grep -rE "@stripe/(react-)?stripe-js" src/ tests/ supabase/` | 0 matches | 0 matches (exit 1) |
| `grep -c '"stripe": ' package.json` | 1 (server SDK preserved) | 1 |

Both dead packages were already gone — they left when the repo migrated from `pnpm-lock.yaml` to `bun.lock` (post-Phase 14). The CONTEXT.md D-07 note that says `pnpm remove @stripe/react-stripe-js` referred to the pre-migration state. No `bun remove` invocation was required.

**Outcome:** No commit for Task 1 (zero file changes).

## Task 2 — Drift-guard test

Created `src/lib/__tests__/no-stripe-js-deps.test.ts` (38 lines).

**Pattern source:** `src/app/__tests__/cta-label-canonical.test.ts` (readFileSync + JSON.parse + key lookup, no jsdom).

**Test shape:**
- imports `readFileSync` from `node:fs`, `join` from `node:path`, `{ describe, expect, it }` from `vitest`
- reads `package.json` once at module scope, JSON.parse with typed cast `as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }`
- `BANNED = ["@stripe/react-stripe-js", "@stripe/stripe-js"] as const`
- for each banned dep, two `it()` blocks: one asserts `pkg.dependencies?.[dep]` is `undefined`, one asserts `pkg.devDependencies?.[dep]` is `undefined`
- 4 total `it()` blocks (2 deps × 2 sections)

**Acceptance verification:**

| Acceptance | Expected | Actual |
|------------|----------|--------|
| `test -f src/lib/__tests__/no-stripe-js-deps.test.ts` | exit 0 | exit 0 |
| `grep -c "@stripe/react-stripe-js" <file>` | ≥ 1 | 3 |
| `grep -c "@stripe/stripe-js" <file>` | ≥ 1 | 3 |
| `grep -c "import.*readFileSync" <file>` | 1 | 1 |
| `grep -cE ":\s*any\b" <file>` (no `any` types) | 0 | 0 |
| `grep -c "as unknown as" <file>` | 0 | 0 |
| `bunx vitest --run --project unit <file>` | 4 passing | 4 passing (313ms) |
| File line count | ≥ 25 | 38 |

## CLAUDE.md Zero Tolerance Compliance

- Rule 1 (no `any`): 0 occurrences in the new test file.
- Rule 7 (no emojis in code): none.
- Rule 8 (no `as unknown as`): 0 occurrences. The single `as { dependencies?: ...; devDependencies?: ... }` cast on `JSON.parse` output is a structural type assertion, not an `as unknown as` chain; explicitly permitted per plan D-23.

## Deviations from Plan

None — plan executed exactly as written along the NO MATCH branch of Task 1's decision tree.

## Observed Flakiness — Plan 15-04 Signal

The first pre-commit hook invocation produced 639 transient `Invalid Chai property: toHaveValue / toBeInTheDocument / toHaveAttribute / toBeDisabled` failures across unrelated test files (lease wizard, password section, tenant modal). The second invocation, with no source changes, passed 105,097/105,097 in 23.66s. This is the exact "Vitest worker-pool flakiness" signal that Plan 15-04 was created to investigate — jest-dom matcher registration losing the race with v8 coverage instrumentation under thread-pool contention. Recording the timing here as one more diagnostic data point for Plan 15-04.

**Reproduction timing (single-machine, this run):**
- `bunx vitest --run --project unit src/lib/__tests__/no-stripe-js-deps.test.ts` → 4/4 pass (313ms)
- `bunx vitest --run --project unit` (full suite, no coverage) → 105,097/105,097 pass (23.79s)
- `CI=true bun run test:unit -- --coverage` (lefthook invocation), run 1 → 639/105,097 fail (128s)
- `CI=true bun run test:unit -- --coverage` (lefthook invocation), run 2 → 105,097/105,097 pass (23.66s)

## Self-Check: PASSED

- Drift-guard test file exists: FOUND at `src/lib/__tests__/no-stripe-js-deps.test.ts`
- Drift-guard test passes standalone: VERIFIED (4/4 pass)
- Drift-guard test passes under full coverage suite: VERIFIED (run 2 above)
- Package state correct: VERIFIED (zero matches across package.json + bun.lock + src/ + tests/ + supabase/)
- Per-task commit landed: VERIFIED — `a736f8581`
- Commits exist in git log: `git log --oneline -1` → `a736f8581 test(15-03): add drift guard against re-adding dead Stripe.js packages`
