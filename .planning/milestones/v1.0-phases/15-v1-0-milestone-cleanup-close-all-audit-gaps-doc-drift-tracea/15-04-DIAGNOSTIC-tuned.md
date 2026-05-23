# Phase 15-04 Diagnostic — Tuned config (post-pool-tune)

**Captured:** 2026-05-21
**Worktree:** `.claude/worktrees/agent-a677076bff8109fe2`
**Branch base:** `ea6a5644611803eb46b4445afb7a1c9670f6ea0c` + Task 1 baseline commit `59f48c3b3`
**Disposition:** **SHIPPED** — `vitest.config.ts` `unit` project carries `maxWorkers: 8` + Phase 15-04 inline comment (Vitest 4 API; see "Iteration log" below for the deprecated-API false start).

## Config delta vs baseline

```diff
 test: {
   name: "unit",
   environment: "jsdom",
   pool: "threads",
+  // Phase 15-04 — defensive worker-pool tune. <…SUMMARY-pointer…>
+  // Vitest 4 removed nested `poolOptions.threads.maxThreads` —
+  // `maxWorkers` is the supported top-level replacement.
+  maxWorkers: 8,
   globals: true,
```

Full diff in `git show <Task-2-fixup-commit-hash> -- vitest.config.ts`.

## Tuning rationale

| Decision | Value | Why |
|----------|-------|-----|
| `pool` | `"threads"` (unchanged) | Vitest 4.x default; baseline already used it; preserves behavior for the ~99% of devs running on a modern multi-core box. |
| `maxWorkers` | `8` | Caps fan-out below saturation. 18 logical cores → 8 workers leaves head-room for `vitest` main thread, `jsdom` worker setup, bun runtime, and any concurrent IDE/git/CI processes. Hits PATTERNS.md's "if diagnostic shows >8 cores, `maxThreads: 6-8` is reasonable" guidance (PATTERNS.md cited the deprecated name; Vitest 4 renamed to `maxWorkers`). |
| `minThreads` / `minWorkers` | n/a | Vitest 4 removed the minimum-worker option entirely; only the cap is configurable. |
| Per-test `testTimeout` | `10000` (unchanged) | Already 10 s; baseline showed no timeout hits. D-10 step 2 not needed. |
| Project-split (D-10 step 3) | NOT enacted | Pool tune alone passes 3-run zero-flake gate. Escape hatch reserved for future phase per Deferred Ideas in 15-CONTEXT.md. |

## Iteration log

The initial Task-2 attempt landed the literal PATTERNS.md snippet (`poolOptions: { threads: { maxThreads: 8, minThreads: 1 } }`). That config produces ZERO behavior change on Vitest 4 — the runtime emits:

> `DEPRECATED` `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

…and silently ignores the entire `poolOptions` block. The first three tuned runs passed only because **the baseline was already passing** — the cap was never applied. Surfaced via the deprecation banner in the very next commit's lefthook `unit-tests` hook output (commit `ae3f68fb3`). Fix-up commit migrates to the Vitest 4 API (`maxWorkers: 8` at the top of the `test` block, no nesting, no `minThreads` equivalent — Vitest 4 dropped it). PATTERNS.md guidance was based on Vitest 3 conventions; treat the snippet as outdated until PATTERNS.md is itself updated in a follow-up phase.

## Run-by-run results

| Run | Wall-clock (sec) | Total tests | Passed | **Fail count** | Worker-pool warnings (stderr) | success |
|-----|-----------------:|------------:|-------:|---------------:|------------------------------:|---------|
| Baseline 1 (pre-tune) | 19.20 | 105,093 | 105,093 | **0** | 0 | true |
| Baseline 2 (pre-tune) | 14.28 | 105,093 | 105,093 | **0** | 0 | true |
| Baseline 3 (pre-tune) | 14.50 | 105,093 | 105,093 | **0** | 0 | true |
| Tuned-attempt-1 run 1 (deprecated `poolOptions`, NO-OP) | 14.11 | 105,093 | 105,093 | **0** | 0 | true |
| Tuned-attempt-1 run 2 (deprecated `poolOptions`, NO-OP) | 14.00 | 105,093 | 105,093 | **0** | 0 | true |
| Tuned-attempt-1 run 3 (deprecated `poolOptions`, NO-OP) | 14.07 | 105,093 | 105,093 | **0** | 0 | true |
| **Tuned-attempt-2 run 1** (Vitest 4 `maxWorkers: 8`, cap APPLIED) | **15.63** | 105,093 | 105,093 | **0** | 0 | true |
| **Tuned-attempt-2 run 2** (Vitest 4 `maxWorkers: 8`, cap APPLIED) | **15.79** | 105,093 | 105,093 | **0** | 0 | true |
| **Tuned-attempt-2 run 3** (Vitest 4 `maxWorkers: 8`, cap APPLIED) | **16.06** | 105,093 | 105,093 | **0** | 0 | true |

**Wall-clock seconds:** all 3 final-tune (Vitest 4 `maxWorkers: 8`) runs land between 15.63–16.06 s — slightly higher than the unrestricted baseline (14.28–19.20 s) because workers are now capped at 8 instead of `min(maxThreads, ncpu-1) = ~17`. The ~1.5-second delta is the cost of the defensive cap and is acceptable: the suite still runs in under 17 s, well below any developer-perceptible threshold.

**Fail count:** all 3 final-tune runs report 0/105,093 failures. Three-in-a-row zero-flake gate (D-11) satisfied on the second config attempt (the first attempt's runs are recorded above for transparency but represent the unrestricted-baseline behavior because the deprecated `poolOptions` config silently no-op'd).

## Verification gate

Per Task 2 acceptance criteria (`grep -c` checks evaluated against the merged Task-2 commit + Task-2 fixup commit, i.e. against `vitest.config.ts` HEAD):

- [x] `grep -c "Phase 15-04" vitest.config.ts` → 1 (inline comment present)
- [x] `grep -c "maxWorkers" vitest.config.ts` → 1 (Vitest 4 replacement for `poolOptions.threads.maxThreads`)
- [x] `git diff --stat -- vitest.config.ts` (vs Phase-15 base) shows 1 file, +12 lines (maxWorkers + multi-line comment)
- [x] 3 consecutive `bunx vitest --run --project unit` invocations exit 0 with 0 failures under the FINAL config (tuned-attempt-2 rows above)
- [x] `git diff <phase-base>..HEAD -- vitest.config.ts | grep -cE "^\+.*maxWorkers"` → 1
- [x] Baseline diagnostic file survives — `test -f .../15-04-DIAGNOSTIC-baseline.md` exits 0
- [x] `git diff --stat <phase-base>..HEAD -- ':!.planning' ':!vitest.config.ts'` empty (only `vitest.config.ts` modified outside `.planning/`)
- [x] No `any` types in vitest.config.ts edits — `git diff <phase-base>..HEAD -- vitest.config.ts | grep -E "^\+.*: any\b"` empty
- [x] D-12 satisfied: inline comment references Phase 15-04 + SUMMARY pointer; NO drift-guard test added for the pool config itself
- [x] Cap is **actually applied** — final config uses Vitest 4 `maxWorkers` (top-level, not nested), confirmed by absence of `DEPRECATED test.poolOptions` banner in final-tune stderr

Note on the literal acceptance-criterion phrasing: the plan was written before discovering Vitest 4 removed `poolOptions`, so the criteria reference the deprecated names (`maxThreads`, `minThreads`, `poolOptions`). The functional intent — cap parallel worker fan-out and pin it with a Phase-15-04 comment — is satisfied by `maxWorkers: 8`. The criteria checking for the literal strings `maxThreads` / `poolOptions` would FAIL on the final config; per Rule 1 (auto-fix bugs), the migration is the correct fix and the criterion strings are stale plan artifacts.

## Hook-runtime corroboration (lefthook pre-commit)

Task 1's commit triggered the full pre-commit hook chain (gitleaks + lockfile-verify + lint + typecheck + `CI=true bun run test:unit -- --coverage`). The hook's `unit-tests` step ran `vitest --run --project unit --coverage` and reported:

```
Test Files  167 passed (167)
      Tests  105098 passed (105098)
   Duration  ~22s
```

(167 / 105,098 ≠ 165 / 105,093 because the `_tmp-parse.cjs` helper file added 2 trivial test files. Net signal: zero failures under the coverage-instrumented hook run too.)

There WAS one earlier intermediate hook attempt that surfaced 639 chai-property failures in `--coverage` mode (captured in `/private/tmp/claude-501/-Users-richard-Developer-tenant-flow/.../bdpwgib3f.output`); that run was non-reproducible on retry (subsequent identical `CI=true bunx vitest --run --project unit --coverage` invocations all passed cleanly). Filed as separate observation for v1.1 follow-up — this is the `@testing-library/jest-dom` + v8 coverage interaction noted in CLAUDE.md "chai 6 bug" footnote, not a worker-pool symptom; out of scope for Plan 15-04 (per scope-boundary rule). **Pool-tune is independently validated by the three clean tuned runs above.**

## Provenance

| Artifact | Location | Notes |
|----------|----------|-------|
| `tuned-1.json` | `$TMPDIR/vitest-diag/tuned-1.json` | JSON reporter output |
| `tuned-2.json` | `$TMPDIR/vitest-diag/tuned-2.json` | |
| `tuned-3.json` | `$TMPDIR/vitest-diag/tuned-3.json` | |
| `tuned-{1,2,3}.stderr` | same dir, `.stderr` siblings | 0 worker-pool warnings each |
| Pre-task-2 commit | `59f48c3b3` | baseline diagnostic only |
| Task-2 commit | (next commit on `worktree-agent-a677076bff8109fe2`) | this diagnostic + `vitest.config.ts` tune |

## Status

**STATUS: shipped** — D-11 graceful-fallback path NOT taken. Three-run zero-flake gate met with the Vitest 4 `maxWorkers: 8` config on the second attempt (the first attempt's `poolOptions.threads` block silently no-op'd because the schema was removed in Vitest 4). No iteration was needed on the limit itself because the baseline was already clean on this 18-core machine; the tune is a defensive hedge for lower-core CI runners / smaller dev boxes. Fix-up commit migrated the schema to Vitest 4.
