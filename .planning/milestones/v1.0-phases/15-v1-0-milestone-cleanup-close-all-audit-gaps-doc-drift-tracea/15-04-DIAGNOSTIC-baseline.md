# Phase 15-04 Diagnostic — Baseline (pre-tuning)

**Captured:** 2026-05-21
**Worktree:** `.claude/worktrees/agent-a677076bff8109fe2`
**Branch base:** `ea6a5644611803eb46b4445afb7a1c9670f6ea0c` (`docs(state): begin Phase 15 execution`)
**Vitest config:** Untouched — pre-tuning baseline.

## Purpose

D-09 calls for three consecutive `bunx vitest --run --project unit --reporter=json` runs to identify whether the ~15 failures documented in `.planning/phases/12-seo-metadata-schema-content-cleanup/deferred-items.md` are:

- (a) deterministic test bugs (same failures, every run) → escalate, not pool-tuning's job; or
- (b) flake-only worker-pool contention (different failures per run; same hot-spot files) → Task 2 pool-tuning is the appropriate fix.

## Machine snapshot

| Metric | Value | Source |
|--------|-------|--------|
| Logical CPU count | 18 | `getconf _NPROCESSORS_ONLN` |
| Configured CPU count | 18 | `getconf _NPROCESSORS_CONF` |
| `sysctl` memory | unavailable (sandbox blocked `sysctl -n hw.memsize`) | n/a |
| `vm_stat` page size | 16384 bytes (16 KiB) | `vm_stat \| head -1` |
| `vm_stat` pages free at run-time start | 309,814 (~4.7 GiB) | `vm_stat \| head -3` |
| `vm_stat` pages active | 1,001,942 (~15.3 GiB) | same |
| `vm_stat` pages inactive | 988,218 (~15.1 GiB) | same |
| `vm_stat` pages wired | 318,884 (~4.9 GiB) | same |

Machine: 18-core CPU with ample free + reclaimable memory. Even an aggressive `pool: 'threads'` default (≈ `min(maxThreads, cpu_count - 1)`) would only spawn ~17 threads — well within capacity.

## Run 1 — `/tmp/claude-501/vitest-diag/baseline-1.json`

| Metric | Value |
|--------|-------|
| Total test suites | 6,966 |
| Total tests | 105,093 |
| Passed | 105,093 |
| Failed | 0 |
| Pending | 0 |
| Todo | 0 |
| `success` | `true` |
| Wall-clock | **19.20 s** |
| Failed entries | 0 |
| stderr worker-pool warnings | 0 (`grep -iE "(failed to start\|timeout waiting\|worker)"` empty) |
| stderr line count | 53 (all `DeprecationWarning` / `ExperimentalWarning` noise — `module.register`, `localStorage`) |

## Run 2 — `/tmp/claude-501/vitest-diag/baseline-2.json`

| Metric | Value |
|--------|-------|
| Total test suites | 6,966 |
| Total tests | 105,093 |
| Passed | 105,093 |
| Failed | 0 |
| `success` | `true` |
| Wall-clock | **14.28 s** |
| Failed entries | 0 |
| stderr worker-pool warnings | 0 |
| stderr line count | 53 |

## Run 3 — `/tmp/claude-501/vitest-diag/baseline-3.json`

| Metric | Value |
|--------|-------|
| Total test suites | 6,966 |
| Total tests | 105,093 |
| Passed | 105,093 |
| Failed | 0 |
| `success` | `true` |
| Wall-clock | **14.50 s** |
| Failed entries | 0 |
| stderr worker-pool warnings | 0 |
| stderr line count | 53 |

## Failure overlap analysis

| Hot-spot file (from `deferred-items.md`) | Run 1 fail | Run 2 fail | Run 3 fail | Verdict |
|------------------------------------------|-----------|-----------|-----------|---------|
| `src/components/leases/__tests__/*` | none | none | none | clean |
| `src/components/maintenance/__tests__/*` | none | none | none | clean |
| `src/components/properties/__tests__/*` (incl. `property-form.test.tsx`) | none | none | none | clean |
| `src/components/tenants/__tests__/*` | none | none | none | clean |
| `src/app/(owner)/profile/__tests__/*` | none | none | none | clean |
| `src/app/(owner)/settings/__tests__/*` | none | none | none | clean |
| `src/app/blog/[slug]/page.test.tsx` | none | none | none | clean |
| `src/components/shell/__tests__/app-shell.test.tsx` | none | none | none | clean |
| Unhandled "Failed to start threads worker" | not present | not present | not present | clean |
| Unhandled "Timeout waiting for worker to respond" | not present | not present | not present | clean |

**Deterministic-fail vs flake-only intersection set:** **empty** (∅). No failures occurred in ANY of the three baseline runs — the prior-phase symptom set is fully un-reproduced on this machine + this branch base.

## Hypothesis

**Primary hypothesis (chosen):** **The Phase 12-02-era flakiness is no longer reproducible at HEAD on this 18-core machine, with the current `vitest.config.ts` (`pool: 'threads'`, no `poolOptions`, `testTimeout: 10000`, `hookTimeout: 10000`).** Three consecutive baseline runs went **0 failed / 105,093 passed in 14-19 s each** — over **9× faster** than the 176 s wall-clock recorded in `12/deferred-items.md` AND with zero "Failed to start threads worker" / "Timeout waiting for worker to respond" markers in stderr.

Possible explanations (not mutually exclusive):

1. **Bigger / fresher machine** — 18 logical cores with free memory; the Phase 12 capture was almost certainly on a more constrained box (probably the user's Mac during a more loaded session).
2. **Phase 13-15 churn** — between Phase 12 (12-02 finalized in PR #741, merged at `4328e09db`) and Phase 15 (this branch base at `ea6a56446`), the test bodies of every documented hot-spot may have been adjusted (Phase 13 perf + Phase 14 battle-test followups). Several of the named files (e.g. `app-shell.test.tsx`, `blog/[slug]/page.test.tsx`) were touched in Phase 13 / 14 PRs.
3. **Vitest 4.x runtime regression already fixed** — bunx fetches the lockfile-pinned `vitest@4.x` patch level; that patch may have shipped a worker-pool fix.

**Pool-contention vs deterministic-fail call (per plan acceptance):** **Neither.** No fails, no contention. The expected-symptom set in `deferred-items.md` is empirically unrepro on this machine, this branch base, this vitest version. There is no flake to chase and no determinist bug to escalate.

## Implication for Task 2

Per D-11, **shipping pool config changes that don't fix a real symptom is a documented anti-pattern.** With the baseline showing the symptom is already absent, Task 2 has three honest paths:

1. **Defensive tune anyway** — land conservative `poolOptions.threads.{maxThreads, minThreads}` with an inline comment that documents "no-op in current environment; future-proof against constrained CI / lower-core dev boxes." This pre-empts the symptom returning on a smaller machine, AND satisfies ROADMAP.md success criterion 4 (worker-pool flakiness mitigated). The Phase 15-04 inline comment + the captured 3-run-zero-flake gate cleanly satisfies D-12.
2. **Defer (D-11 graceful fallback)** — skip the config edit, write `STATUS: deferred-to-v1.1` into `15-04-DIAGNOSTIC-tuned.md`, point at this baseline as evidence the symptom isn't reproducing right now. Tracked-issue ref required.
3. **Hybrid** — land the defensive tune AND document the baseline-was-clean situation in the SUMMARY so the milestone audit reflects truth.

Per CONTEXT.md "specifics" section — *"User explicitly asked for 'everything no matter severity, canonically' — meaning Phase 15 closes ALL audit items… Nothing deferred to v1.1 unless objectively blocked"* — option **(1) defensive tune** is the right call. The baseline is the evidence that the symptom isn't actively biting; the defensive config is the regression hedge against the symptom returning on a smaller box. Task 2 will land the conservative `poolOptions` (`maxThreads: 8`, `minThreads: 1` — half of detected CPU count, well below saturation) plus the inline Phase 15-04 comment, and the 3-run zero-flake gate on the tuned config will be the disposition.

## Provenance

| Artifact | Location | Bytes |
|----------|----------|-------|
| `baseline-1.json` | `$TMPDIR/vitest-diag/baseline-1.json` (`/tmp/claude-501/vitest-diag/`) | 43,255,158 |
| `baseline-1.stderr` | `$TMPDIR/vitest-diag/baseline-1.stderr` | 4,531 |
| `baseline-2.json` | `$TMPDIR/vitest-diag/baseline-2.json` | comparable |
| `baseline-2.stderr` | `$TMPDIR/vitest-diag/baseline-2.stderr` | 4,531 |
| `baseline-3.json` | `$TMPDIR/vitest-diag/baseline-3.json` | comparable |
| `baseline-3.stderr` | `$TMPDIR/vitest-diag/baseline-3.stderr` | 4,531 |
| Parser | `.planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/_tmp-parse.cjs` (deleted post-Task-2; checked-in only during Task 1 execution) | n/a |

**This file must survive on disk regardless of Task 2's disposition** (per plan-checker Warning #4) — it's the empirical evidence that the 3-run baseline actually ran.
