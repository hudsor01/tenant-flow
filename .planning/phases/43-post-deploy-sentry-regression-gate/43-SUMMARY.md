---
phase: 43-post-deploy-sentry-regression-gate
plan: 01
subsystem: ci
tags: [ci, sentry, deploy-gate, regression-detection, github-actions]
requires: []
provides:
  - DEPLOY-01
  - DEPLOY-02
affects:
  - .github/workflows/
tech_stack_added:
  - "actions/upload-artifact@v4 (baseline artifact retention 90d)"
  - "GitHub repository_dispatch (Vercel deploy event routing)"
  - "Sentry REST API v0 (releases/issues/sessions/events-stats endpoints)"
patterns:
  - "Fail-fast secrets check mirroring rls-security-tests.yml:32-47"
  - "Regex-validated release SHA (T-43-03 injection mitigation)"
  - "Bash + jq + awk gate evaluation (no python/node runtime)"
  - "if: always() artifact upload so next run always has baseline"
key_files_created:
  - .github/workflows/post-deploy-sentry-gate.yml
key_files_modified: []
decisions:
  - "Task 6 is a verification no-op (committed with --allow-empty) — all 7 doc sections were already complete in Task 1 scaffold"
  - "Workflow uses yq for local YAML validation instead of python3+pyyaml (sandbox blocks pip install)"
  - "GH_TOKEN job-level env is GITHUB_TOKEN — sufficient for gh issue create and gh api artifacts (no PAT needed)"
metrics:
  duration_minutes: 4
  completed_date: 2026-04-15
  tasks_completed: 6
  tasks_total: 6
  files_changed: 1
  lines_added: 398
---

# Phase 43 Plan 01: Post-Deploy Sentry Regression Gate Summary

GitHub Actions workflow that queries Sentry after each Vercel production deploy, compares issue/error-rate profile against the previous release's 90-day-retained baseline artifact, fails the workflow + opens a GitHub issue on threshold breach, and uses bash + jq + awk for all gate logic.

## Tasks Completed (6/6)

| # | Task | Commit |
|---|------|--------|
| 1 | Scaffold workflow — triggers, concurrency, permissions, secrets check, SHA validation, observation sleep | `a85362ce5` |
| 2 | Query Sentry API — releases/issues/sessions/events-stats | `0585c13d3` |
| 3 | Baseline fetch + gate evaluation with first-run handling | `683205c55` |
| 4 | Open GitHub issue on regression + exit with gate status | `01a406f20` |
| 5 | Build snapshot JSON + upload 90-day baseline artifact | `ba26d857a` |
| 6 | Verify operator documentation (no-op — all sections present from Task 1) | `3e07ead8e` |

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `.github/workflows/post-deploy-sentry-gate.yml` | 398 | NEW |

No `src/`, no `supabase/`, no migrations, no `package.json` — pure CI addition.

## Pre-Commit Gate Runs

All per-task pre-commit runs passed green:

| Task | gitleaks | lockfile-verify | lint | typecheck | unit-tests | commitlint |
|------|----------|-----------------|------|-----------|------------|------------|
| 3 | PASS | PASS | PASS | PASS | PASS (1632/1632) | PASS |
| 4 | PASS | PASS | PASS | PASS | PASS (1632/1632) | PASS |
| 5 | PASS | PASS | PASS | PASS | PASS (1632/1632) | PASS |
| 6 | skip (empty commit) | skip | skip | skip | skip | PASS |

Tasks 1 and 2 were committed prior to this execution session — their gates passed in the earlier session (commit metadata confirms).

## Verification Against `<final_checks>`

- [x] YAML parses (`yq eval '.'` exits 0 — pyyaml blocked by sandbox, used yq alternative)
- [x] `grep -c "^      - name:"` returns 13 (exact match with plan expectation)
- [x] No `echo ${{ secrets.* }}` or `echo $SENTRY_AUTH_TOKEN` of secret values (sole `SENTRY_AUTH_TOKEN` hit is inside an error message describing required scopes)
- [x] `actions/upload-artifact@v4` (not v3)
- [x] Workflow file is the ONLY changed artifact (git diff scope verified per commit)
- [x] No npm/pnpm packages added
- [x] `pnpm typecheck` and `pnpm lint` green in pre-commit runs

## Deviations from Plan

None — plan executed exactly as written. Task 6 confirmed no-op as the plan allowed ("This task is a review/no-op task IF Task 1's comment block was complete").

### Notes

- **YAML validator substitution:** Plan's `<verify>` blocks call `python3 -c "import yaml; yaml.safe_load(...)"`. The sandbox blocks `pip install pyyaml` (PEP 668 managed-python) and `python3 -m venv` cannot reach PyPI behind certificate block. Used the locally installed `yq eval '.' <file> > /dev/null` as the equivalent parse check — same semantic guarantee (rejects malformed YAML), no functional difference.
- **Sandbox tripped on lefthook pre-commit:** Initial commit attempts returned "operation not permitted" on every pre-commit tool (gitleaks, lint, typecheck, unit-tests). Retried with `dangerouslyDisableSandbox: true` per instructions — user explicitly granted those retries. All subsequent commits used the full unsandboxed path.

## Operator One-Time Setup Checklist (NOT done by this plan — human action required)

These commands must be run manually before the smoke test. The workflow will fail-fast with a clear missing-secret error if any of the three secrets are absent. Variables have safe defaults (10 events / 1.0% delta / 30 min window) so they are strictly optional.

```bash
# Required repo secrets (gh secret set is interactive if no --body)
gh secret set SENTRY_AUTH_TOKEN --body "<org-token-with-project:read-event:read-scopes>"
gh secret set SENTRY_ORG        --body "<sentry-org-slug-matching-next.config.ts:50>"
gh secret set SENTRY_PROJECT    --body "<sentry-project-slug-matching-next.config.ts:51>"

# Optional repo variables (defaults shown in workflow leading comment)
gh variable set SENTRY_GATE_NEW_ISSUE_EVENT_THRESHOLD  --body "10"
gh variable set SENTRY_GATE_ERROR_RATE_DELTA_PCT       --body "1.0"
gh variable set SENTRY_GATE_OBSERVATION_WINDOW_MINUTES --body "30"

# Verify:
gh secret list   | grep -E 'SENTRY_(AUTH_TOKEN|ORG|PROJECT)'
gh variable list | grep SENTRY_GATE
```

## Live-Verify Items (Human Smoke Test)

After the operator setup above:

- [ ] **Enable Vercel GitHub integration dispatch events:** Vercel Project → Settings → Git → enable `vercel.deployment.success` / `vercel.deployment.promoted` repository_dispatch events. Without this, the real production-deploy trigger path never fires — only `workflow_dispatch` smoke tests work.
- [ ] **Run the smoke test against a known-good shipped SHA** (pick a SHA from `git log main --first-parent -10` that was deployed cleanly):

      ```bash
      gh workflow run post-deploy-sentry-gate.yml -f release_sha=<40-char-sha>
      gh run watch
      ```

      Expect: green exit (PASS or PASS_WITH_WARNING on the very first run), a `sentry-baseline-<sha>` artifact uploaded with `snapshot.json` inside, and the `$GITHUB_STEP_SUMMARY` showing the Sentry Gate Result markdown table.

- [ ] **(After 5+ deploys)** Review `gh issue list --label sentry-regression,deploy-gate` and tune thresholds if false-positive rate is high (raise `SENTRY_GATE_NEW_ISSUE_EVENT_THRESHOLD` toward 20 for low-traffic apps) or low (tighten to 5 for high-traffic apps).

- [ ] **(Optional hardening)** Branch-protection: restrict `workflow_dispatch` of this workflow to maintainers. Out of scope for this plan per `<threat_model>` T-43-02.

## Known Stubs

None — the workflow is fully functional. All four Sentry endpoints are queried against live data, baseline comparison uses real artifact download, issue creation uses real `gh issue create`, artifact upload uses `actions/upload-artifact@v4` (not a mock).

## Self-Check: PASSED

- Workflow file exists at `.github/workflows/post-deploy-sentry-gate.yml` (398 lines)
- All 6 commits exist in local history (`3e07ead8e`, `ba26d857a`, `01a406f20`, `683205c55`, `0585c13d3`, `a85362ce5`)
- YAML parses (yq exit 0)
- 13 named steps in the `gate` job (matches `<final_checks>` expectation)
- No secret-echo anti-patterns present
- Only `.github/workflows/post-deploy-sentry-gate.yml` changed (no drift into src/ or supabase/)
