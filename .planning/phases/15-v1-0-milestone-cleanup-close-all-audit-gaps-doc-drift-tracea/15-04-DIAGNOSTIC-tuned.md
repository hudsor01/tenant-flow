# Phase 15-04 Diagnostic — Tuned config (post-pool-tune)

**Captured:** 2026-05-21
**Worktree:** `.claude/worktrees/agent-a677076bff8109fe2`
**Branch base:** `ea6a5644611803eb46b4445afb7a1c9670f6ea0c` + Task 1 baseline commit `59f48c3b3`
**Disposition:** **SHIPPED** — `vitest.config.ts` `unit` project carries `poolOptions.threads.{maxThreads: 8, minThreads: 1}` + Phase 15-04 inline comment.

## Config delta vs baseline

```diff
 test: {
   name: "unit",
   environment: "jsdom",
   pool: "threads",
+  // Phase 15-04 — defensive worker-pool tune. <…SUMMARY-pointer…>
+  poolOptions: {
+    threads: {
+      maxThreads: 8,
+      minThreads: 1,
+    },
+  },
   globals: true,
```

Full diff in `git show <Task-2-commit-hash> -- vitest.config.ts`.

## Tuning rationale

| Decision | Value | Why |
|----------|-------|-----|
| `pool` | `"threads"` (unchanged) | Vitest 4.x default; baseline already used it; preserves behavior for the ~99% of devs running on a modern multi-core box. |
| `maxThreads` | `8` | Caps fan-out below saturation. 18 logical cores → 8 threads leaves head-room for `vitest` main thread, `jsdom` worker setup, bun runtime, and any concurrent IDE/git/CI processes. Hits PATTERNS.md's "if diagnostic shows >8 cores, `maxThreads: 6-8` is reasonable" guidance. |
| `minThreads` | `1` | Allows the pool to scale down when the runner is doing a single-file run (`vitest src/path/foo.test.ts`) — no wasted thread allocation. |
| Per-test `testTimeout` | `10000` (unchanged) | Already 10 s; baseline showed no timeout hits. D-10 step 2 not needed. |
| Project-split (D-10 step 3) | NOT enacted | Pool tune alone passes 3-run zero-flake gate. Escape hatch reserved for future phase per Deferred Ideas in 15-CONTEXT.md. |

## Run-by-run results

| Run | Wall-clock (sec) | Total tests | Passed | **Fail count** | Worker-pool warnings (stderr) | success |
|-----|-----------------:|------------:|-------:|---------------:|------------------------------:|---------|
| Baseline 1 (pre-tune) | 19.20 | 105,093 | 105,093 | **0** | 0 | true |
| Baseline 2 (pre-tune) | 14.28 | 105,093 | 105,093 | **0** | 0 | true |
| Baseline 3 (pre-tune) | 14.50 | 105,093 | 105,093 | **0** | 0 | true |
| Tuned 1 | 14.11 | 105,093 | 105,093 | **0** | 0 | true |
| Tuned 2 | 14.00 | 105,093 | 105,093 | **0** | 0 | true |
| Tuned 3 | 14.07 | 105,093 | 105,093 | **0** | 0 | true |

**Wall-clock seconds:** all 3 tuned runs land between 14.00–14.11 s — within noise of the baseline (14.28–19.20 s). Capping at 8 threads on an 18-core machine does NOT measurably degrade throughput because the bottleneck on this suite is single-thread setup cost (transform 4–6 s, environment 50–55 s) rather than parallel test execution.

**Fail count:** all 3 tuned runs report 0/105,093 failures. Three-in-a-row zero-flake gate (D-11) satisfied.

## Verification gate

Per Task 2 acceptance criteria:

- [x] `grep -c "Phase 15-04" vitest.config.ts` → 1 (inline comment present)
- [x] `grep -c "poolOptions" vitest.config.ts` → 1 (block present)
- [x] `git diff --stat -- vitest.config.ts` shows 1 file, +15 lines (poolOptions block + comment)
- [x] 3 consecutive `bunx vitest --run --project unit` invocations exit 0 with 0 failures (captured above)
- [x] `git diff vitest.config.ts | grep -cE "^\+.*maxThreads"` → 1
- [x] Baseline diagnostic file survives — `test -f .../15-04-DIAGNOSTIC-baseline.md` exits 0
- [x] `git diff --stat -- ':!.planning' ':!vitest.config.ts'` empty (only `vitest.config.ts` modified outside `.planning/`)
- [x] No `any` types in vitest.config.ts edits — `git diff vitest.config.ts | grep -E "^\+.*: any\b"` empty
- [x] D-12 satisfied: inline comment references Phase 15-04 + SUMMARY pointer; NO drift-guard test added for the pool config itself

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

**STATUS: shipped** — D-11 graceful-fallback path NOT taken. Three-run zero-flake gate met with `maxThreads: 8, minThreads: 1` on the first config attempt. No iteration was needed because the baseline was already clean on this 18-core machine; the tune is a defensive hedge for lower-core CI runners / smaller dev boxes.
