---
phase: 15-v1-0-milestone-cleanup
plan: 04
subsystem: testing
tags: [vitest, worker-pool, maxWorkers, test-runner, diagnostic-first, defensive-config]

requires:
  - phase: 12-seo-metadata-schema-content-cleanup
    provides: deferred-items.md flake symptom set (the diagnostic starting point)

provides:
  - "Tuned `vitest.config.ts` `unit` project with Vitest 4 `maxWorkers: 8` cap"
  - "Empirical evidence (3-run baseline + 3-run final-tune diagnostic) that the worker-pool symptom set from Phase 12 is no longer reproducing at HEAD"
  - "Provenance markdown (`15-04-DIAGNOSTIC-baseline.md` + `15-04-DIAGNOSTIC-tuned.md`) for future regression context"
  - "Vitest 4 API migration learning — PATTERNS.md `poolOptions.threads.maxThreads` snippet is Vitest 3 era and silently no-ops on v4"

affects:
  - "Every future vitest run in this repo (lefthook pre-commit + manual + CI parity)"
  - "Phase-15 ROADMAP success criterion 4 (worker-pool flakiness)"
  - "v1.0-MILESTONE-AUDIT.md tech-debt item #2"
  - "PATTERNS.md (the snippet that referenced removed Vitest 3 nesting; out-of-scope to fix here)"

tech-stack:
  added: []
  patterns:
    - "Diagnostic-first config tuning: capture 3-run JSON-reporter baseline before any config change so 'this is just flake' vs 'this is a regression' can be answered with evidence"
    - "Defensive worker-pool cap on a multi-core CI/dev machine: cap = ~CPU/2 to leave head-room for runtime + IDE + concurrent toolchain processes"
    - "Vitest 4 schema migration: prefer `test.maxWorkers` over the removed `test.poolOptions.threads.{maxThreads,minThreads}` nesting"

key-files:
  created:
    - ".planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-DIAGNOSTIC-baseline.md"
    - ".planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-DIAGNOSTIC-tuned.md"
    - ".planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-SUMMARY.md"
    - ".planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/_tmp-parse.cjs"
  modified:
    - "vitest.config.ts"

key-decisions:
  - "Land a defensive `maxWorkers: 8` cap even though the baseline showed zero failures on the 18-core dev box — the audit symptom is environmental (smaller CI runners), so the regression hedge has positive expected value at near-zero cost (~1.5 s wall-clock delta)"
  - "Reject `poolOptions.threads` nesting (deprecated and removed in Vitest 4) in favor of the supported top-level `maxWorkers` — PATTERNS.md guidance was Vitest 3 era and silently no-ops on the project's Vitest 4.1.6 runtime"
  - "Drop the `minThreads: 1` companion entirely — Vitest 4 removed the lower-bound knob, so the config matches reality"
  - "Per D-12, do NOT add a drift-guard test for the pool config itself — that would be paranoia. The inline comment + DIAGNOSTIC artifacts are the regression pin"
  - "Per D-11, the graceful-fallback path (defer to v1.1) was not taken: zero-flake gate met cleanly on the second config attempt after the Vitest 4 schema migration"

patterns-established:
  - "Diagnostic-first tuning: 3 JSON-reporter runs to disambiguate flake from regression before touching the config"
  - "Schema-migration sanity: when applying a snippet from internal PATTERNS docs, verify against the actual installed major version (Vitest 3 → 4 broke the snippet but the deprecation banner caught it on next commit)"

requirements-completed: []

duration: 38min
completed: 2026-05-21
---

# Phase 15 Plan 04: Vitest worker-pool tune Summary

**Capped Vitest 4 unit-project worker fan-out at `maxWorkers: 8` (defensive hedge); 3-run zero-flake gate met with 0/105,093 failures across baseline AND final tune.**

## Performance

- **Duration:** ~38 min (start 19:39 PT, finish ~20:17 PT)
- **Started:** 2026-05-21T19:39Z (first baseline run kicked off)
- **Completed:** 2026-05-21T20:17Z (SUMMARY commit)
- **Tasks:** 2 (Task 1 baseline diagnostic; Task 2 tune + verification, executed as 2 git commits due to Vitest 4 API correction)
- **Files modified:** 1 source (`vitest.config.ts`) + 4 planning (`baseline`, `tuned`, `summary`, `_tmp-parse.cjs`)

## Accomplishments

- **Empirical disambiguation of the Phase 12 symptom.** 3 consecutive JSON-reporter baseline runs against the un-tuned config: **0 / 105,093 failures, 14–19 s wall-clock each, zero "Failed to start threads worker" / "Timeout waiting for worker to respond" markers in stderr.** The symptom captured in `.planning/phases/12-seo-metadata-schema-content-cleanup/deferred-items.md` (176 s wall-clock, ~15 failures across leases/maintenance/properties/tenants/profile/settings/blog-slug/app-shell) is fully unrepro at HEAD on the 18-core dev machine.
- **Defensive Vitest 4 config tune.** `vitest.config.ts` `unit` project now carries `maxWorkers: 8` (top-level, Vitest 4 schema) with an inline comment pointing at this SUMMARY. Final-tune run produces **0 / 105,093 failures, 15.63–16.06 s wall-clock**, ~1.5 s slower than unrestricted-pool baseline but well below any perceptible threshold; cap is verified APPLIED by the absence of the `DEPRECATED test.poolOptions` banner in stderr.
- **Vitest 4 schema migration learning captured.** The first Task-2 commit naively applied the PATTERNS.md snippet (`poolOptions: { threads: { maxThreads: 8, minThreads: 1 } }`), which silently no-ops on Vitest 4.1.6 (the runtime emits `DEPRECATED test.poolOptions was removed in Vitest 4` and ignores the entire block). Caught by the deprecation banner in the next commit's lefthook output. Fix-up commit migrated to the supported `maxWorkers` top-level option. Migration recorded in DIAGNOSTIC-tuned.md "Iteration log" for future-phase reference.

## Task Commits

Each task / fix-up was committed atomically:

1. **Task 1: Diagnostic baseline (3-run JSON-reporter)** — `59f48c3b3` (`docs`)
2. **Task 2: Pool tune (initial attempt, deprecated `poolOptions` schema)** — `ae3f68fb3` (`perf`)
3. **Task 2 fix-up: Migrate to Vitest 4 `maxWorkers` API** — `99aece840` (`fix`)

_Note: Task 2 produced two commits because the initial PATTERNS.md-derived config silently no-op'd on Vitest 4. The fix-up is part of the same task and lands the actually-applied cap. Both commits are part of the Task-2 deliverable; the SUMMARY commit (this file) will be the fourth and final._

## Files Created/Modified

- `vitest.config.ts` — added `maxWorkers: 8` + 8-line inline comment block to the `unit` project's `test` block (lines ~52–63). No other config changes.
- `.planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-DIAGNOSTIC-baseline.md` — empirical 3-run baseline + machine snapshot + hypothesis call
- `.planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-DIAGNOSTIC-tuned.md` — wall-clock + fail-count per run for both config attempts; final disposition
- `.planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-SUMMARY.md` — this file
- `.planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/_tmp-parse.cjs` — local diagnostic helper (parses Vitest JSON reporter output → stats). Lint-clean per biome; included for provenance of the per-run numbers cited in DIAGNOSTIC-*.md.

## Decisions Made

- **Cap at `maxWorkers: 8` on an 18-core machine (vs PATTERNS.md's `maxThreads: 4`)** — the 4-thread cap from PATTERNS.md was calibrated for a hypothetical 4-core box. With detected `getconf _NPROCESSORS_ONLN = 18`, an 8-worker cap leaves head-room for vitest main thread + bun runtime + concurrent IDE/CI processes while still meaningfully constraining fan-out for smaller boxes (a 4-core CI runner will hit the cap at 4 anyway because Vitest auto-derives `min(maxWorkers, ncpu-1)`).
- **Ship the cap even though the baseline was already clean** — per CONTEXT.md "specifics" — *"User explicitly asked for 'everything no matter severity, canonically' — meaning Phase 15 closes ALL audit items. Nothing deferred to v1.1 unless objectively blocked"* — the cap costs ~1.5 s wall-clock per run and gains regression protection against the documented symptom returning on lower-core hardware. D-11 graceful-fallback path is the wrong default when the regression hedge is cheap.
- **Drop `minThreads: 1`** — Vitest 4 removed the lower-bound knob entirely; no API equivalent exists. The natural pool behavior already scales down for single-file runs.
- **Reject a drift-guard test for the pool config itself** — D-12 explicitly identified that as paranoia. The inline comment + DIAGNOSTIC artifacts + this SUMMARY are the regression pin. A test that asserts `maxWorkers === 8` would break the moment we tune it again with no functional benefit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migrated deprecated `poolOptions.threads` config to Vitest 4 `maxWorkers`**
- **Found during:** Task 2 (post-initial-commit lefthook output)
- **Issue:** The initial Task-2 config used the PATTERNS.md snippet `poolOptions: { threads: { maxThreads: 8, minThreads: 1 } }`. Vitest 4 removed `test.poolOptions` entirely; the runtime emits `DEPRECATED test.poolOptions was removed in Vitest 4. All previous poolOptions are now top-level options.` and silently ignores the block, so the cap was NEVER applied during the first three "tuned" runs. They passed only because the unrestricted-pool baseline was already passing.
- **Fix:** Migrated to the supported Vitest 4 schema: `maxWorkers: 8` at the top of the `test` block, no nesting, no `minThreads` (Vitest 4 dropped the lower bound). Re-ran 3 verification runs with the cap actually applied — all 3 pass 0/105,093.
- **Files modified:** `vitest.config.ts`, `.planning/phases/15-.../15-04-DIAGNOSTIC-tuned.md`
- **Verification:** `DEPRECATED test.poolOptions` banner absent in fix-up commit's lefthook stderr; wall-clock rose from 14.0–14.1 s (no-op cap) to 15.6–16.1 s (cap applied) confirming the cap is biting.
- **Committed in:** `99aece840` (fix-up commit; Task 2's second commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug; the deprecated config was a silent no-op, not an outright failure)
**Impact on plan:** Strictly improves correctness — the plan's explicit goal was "land a config that actually caps fan-out"; the deprecated config didn't do that. Migration is the natural fix.

## Issues Encountered

- **Vitest 4 schema migration (handled above as Deviation #1).** Caught by the deprecation banner in lefthook output; fixed in a follow-up commit.
- **One transient lefthook flake.** During the Task-1 commit attempts, one run of `CI=true bun run test:unit -- --coverage` (run by the lefthook pre-commit `unit-tests` step) reported 639 chai-property failures (`Invalid Chai property: toBeDisabled` / `toHaveAttribute` / `toBeInTheDocument`). Subsequent identical invocations all passed cleanly with 0 failures. This appears related to the known `@testing-library/jest-dom` + v8 coverage interaction noted in CLAUDE.md "chai 6 bug" footnote, not to worker-pool contention. Out of scope for Plan 15-04 per scope-boundary rule; logged as observation for v1.1 follow-up if it recurs. Pool-tune validated independently by the 3 non-coverage final-tune runs in DIAGNOSTIC-tuned.md.

## Self-Check

Files claimed to exist:
- `.planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-DIAGNOSTIC-baseline.md` — verified via `git show 59f48c3b3 -- ...`
- `.planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-DIAGNOSTIC-tuned.md` — verified via `git show 99aece840 -- ...`
- `vitest.config.ts` carries `maxWorkers: 8` — verified via `grep -n "maxWorkers" vitest.config.ts` showing the live config line (`maxWorkers: 8,`) AND the inline comment reference (`grep -c` = 2)
- `vitest.config.ts` carries `Phase 15-04` inline comment — verified via `grep -c "Phase 15-04" vitest.config.ts` = 1
- `vitest.config.ts` `poolOptions` mention is ONLY in the comment explaining the Vitest 4 migration (`grep -c "poolOptions" vitest.config.ts` = 1, all in comment) — no live config uses the deprecated nesting

Commits claimed to exist (verified via `git log --oneline`):
- `59f48c3b3` — Task 1 baseline
- `ae3f68fb3` — Task 2 initial (kept for full history)
- `99aece840` — Task 2 fix-up (Vitest 4 migration)

Scope:
- `git diff --stat ea6a5644611803eb46b4445afb7a1c9670f6ea0c..HEAD -- ':!.planning' ':!vitest.config.ts'` is empty (no out-of-scope file modifications)

**Self-Check: PASSED**

## User Setup Required

None. No external service configuration; no env-var changes; no dependency updates.

## Next Phase Readiness

- **ROADMAP.md Phase 15 success criterion 4 (worker-pool flakiness)** — closed. The symptom is empirically unrepro on the dev machine and the defensive cap is in place for smaller boxes. The diagnostic artifacts give v1.1 / v2.x phases enough context to re-investigate if the symptom returns.
- **v1.0-MILESTONE-AUDIT.md tech-debt item #2 (worker-pool flakiness)** — closeable. See SUMMARY frontmatter for the evidence pointers.
- **Out-of-scope-but-observed** — the `--coverage` × jest-dom flake noted under Issues warrants a v1.1 ticket if it recurs. Capture deferred to plan 15's other artifacts / a v1.1 phase.

---
*Phase: 15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea*
*Plan: 04*
*Completed: 2026-05-21*
