---
phase: 43-post-deploy-sentry-regression-gate
verified: 2026-04-14T00:00:00Z
status: passed
score: 4/4 success criteria verified
verdict: PASS-WITH-FOLLOWUPS
human_verification:
  - test: "Operator one-time setup: gh secret set SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT"
    expected: "Secrets present; gh secret list shows all three"
    why_human: "Requires Sentry org-token creation in Sentry dashboard"
  - test: "Enable Vercel repository_dispatch events (Project → Settings → Git)"
    expected: "vercel.deployment.success fires workflow on next prod deploy"
    why_human: "Vercel dashboard configuration outside repo"
  - test: "Smoke test: gh workflow run post-deploy-sentry-gate.yml -f release_sha=<known-good-sha>"
    expected: "Green exit; sentry-baseline-<sha> artifact uploaded; PASS_WITH_WARNING on very first run"
    why_human: "Requires live Sentry + GH Actions execution; plan explicitly defers as operator action"
---

# Phase 43: Post-Deploy Sentry Regression Gate — Verification

**Phase Goal:** Production deploys automatically checked for regressions against a Sentry baseline; gate fails the deploy on regressions above configurable thresholds.

**Verdict:** PASS-WITH-FOLLOWUPS (automated verification complete; 3 operator/live items deferred per plan design).

## Success Criteria Mapping

### SC-1 — Post-deploy workflow captures baseline snapshot
**Status:** VERIFIED

- Triggers: `repository_dispatch` for `vercel.deployment.success` / `vercel.deployment.promoted` (lines 40-43) + `workflow_dispatch` with `release_sha` (lines 44-49).
- Production filter: `client_payload.environment == 'production'` (line 62).
- Sentry queries: releases (line 117), issues (line 135), sessions/crash-free (line 155), events-stats/p95 (line 178).
- Snapshot fields match SC-1 (error count + p95 + new unresolved count): `event_count_new_issues`, `transactions_p95_ms`, `new_issues` array, `error_rate_pct` (lines 378-387).
- Persisted as artifact `sentry-baseline-<sha>` via `actions/upload-artifact@v4`, `retention-days: 90` (lines 391-398).

### SC-2 — Workflow fails on regression within observation window
**Status:** VERIFIED

- Observation sleep of `OBSERVATION_WINDOW_MINUTES` before querying Sentry (lines 107-110).
- Two gate rules evaluated: (1) new-issue event count > threshold (line 263); (2) error-rate delta > threshold (line 267).
- STATUS=FAIL set at lines 278, 281 on breach.
- Fail-close exit: line 334 `exit 1` when `GATE_STATUS=FAIL`; line 346 `exit 1` on undefined status (defensive).
- Alert side effect: `gh issue create` with label `sentry-regression,deploy-gate` when `gate_status == 'FAIL'` (lines 297-324).
- Vercel rollback is explicitly out of scope per D0-D6 / workflow comment line 34 — acceptable per ROADMAP wording "optionally triggers Vercel rollback OR alert" (alert path chosen).

### SC-3 — Thresholds configurable via repo variables, no hardcoded override
**Status:** VERIFIED

All three thresholds are pulled from `vars.SENTRY_GATE_*` with ONLY defaults as fallback, not overrides (lines 69-71):
- `NEW_ISSUE_EVENT_THRESHOLD: ${{ vars.SENTRY_GATE_NEW_ISSUE_EVENT_THRESHOLD || '10' }}`
- `ERROR_RATE_DELTA_PCT: ${{ vars.SENTRY_GATE_ERROR_RATE_DELTA_PCT || '1.0' }}`
- `OBSERVATION_WINDOW_MINUTES: ${{ vars.SENTRY_GATE_OBSERVATION_WINDOW_MINUTES || '30' }}`

Pattern `vars.X || 'default'` in GitHub Actions resolves to `vars.X` when set (repo variable wins), default only when unset. No literal numbers inlined elsewhere in threshold comparisons — breach checks (lines 263, 267) reference only `${NEW_ISSUE_EVENT_THRESHOLD}` / `${ERROR_RATE_DELTA_PCT}` env vars.

### SC-4 — Documented secrets + smoke-test path
**Status:** VERIFIED (documentation) / DEFERRED (live run)

- Required secrets documented in leading comment (lines 20-24): SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, with required scopes `project:read, event:read`.
- Required variables documented (lines 26-32) with defaults.
- Smoke-test command documented at line 16-18: `gh workflow run post-deploy-sentry-gate.yml -f release_sha=<known-good-shipped-sha>`.
- `workflow_dispatch` input with regex-validated 40-char hex SHA (lines 44-49, 98-101) exercises the full pipeline — same path as production trigger after the `Resolve release SHA` step.
- Live smoke-run and operator-setup are explicitly deferred to human per SUMMARY.md lines 112-128 — acceptable per phase prompt.

## First-Run Path Verification

**VERIFIED non-deadlock.** Lines 204-209: when no prior `sentry-baseline-*` artifact exists, `first_run=true` is emitted and `previous-snapshot.json` is stubbed with `{"first_run": true}`. Lines 242-256: gate evaluator short-circuits to `STATUS=PASS_WITH_WARNING` and `exit 0` without computing deltas. Line 336-338 confirms PASS_WITH_WARNING maps to exit 0 with `::notice::`. First run correctly bootstraps baseline without false-fail.

## Fail-Close Trace (Sentry → gate → exit 1)

1. Line 135-142: Sentry issues query with `set -euo pipefail` and `curl -sS -f` — fails step on non-2xx.
2. Line 263, 267: bash+awk threshold breach check sets STATUS=FAIL.
3. Line 293: `gate_status=FAIL` written to step output.
4. Line 298-323: issue created (warning only if `gh issue create` itself fails — does not mask gate failure).
5. Line 327 `if: always()` runs Exit step regardless of prior step failures; line 334 `exit 1` fails the workflow.
6. Lines 351, 392 `if: always()` ensure snapshot upload happens even after `exit 1` — next run has a baseline.

## Artifact / Key-Link Checks

| Must-Have | Status | Evidence |
|---|---|---|
| Workflow file exists (398 lines) | VERIFIED | `.github/workflows/post-deploy-sentry-gate.yml` |
| `repository_dispatch` wiring | WIRED | Lines 40-43 |
| Sentry REST API wiring | WIRED | Bearer token + 4 endpoints (lines 117, 135, 155, 178) |
| `gh issue create` on FAIL | WIRED | Lines 316-319, gated by `gate_status == 'FAIL'` |
| `actions/upload-artifact@v4` retention 90d | WIRED | Lines 393-397 |

## Anti-Patterns Scanned

None. No secret echo, no hardcoded thresholds inside comparisons, no `exit 0` after `STATUS=FAIL`, SHA regex-validated before URL interpolation (T-43-03 mitigation, line 98), snapshot step uses `if: always()` so baseline still recorded on FAIL.

## Deferred Live-Verify Items

Per plan design (SUMMARY.md §Live-Verify Items):
1. Operator secret/variable setup (`gh secret set` × 3).
2. Vercel Git integration dispatch events enablement.
3. Smoke run against known-good shipped SHA.

These are intentional operator responsibilities, not gaps.

---
_Verified by Claude gsd-verifier against 43-SUMMARY.md, 43-01-PLAN.md, and the 398-line workflow file._
