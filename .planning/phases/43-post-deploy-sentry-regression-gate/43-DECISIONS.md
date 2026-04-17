---
phase: 43
phase_name: Post-Deploy Sentry Regression Gate
decisions_version: 1.0
decided_by: claude + codebase verification
decided_at: 2026-04-14
---

# Phase 43 Decisions

Resolves the 6 gray-zone decisions surfaced in `43-RESEARCH.md` + the 1 Wave-0 verification item. Planner should treat these as authoritative; deviations require a new decisions entry.

## Wave-0 Factual Verification

### D0. Sentry release tag format — RESOLVED

**Finding:** Tag is the **raw 40-char git SHA** (e.g., `ebfec563b9...`), NOT `project@sha`.

**Evidence:**
- `next.config.ts:65-70` — `withSentryConfig` sets only `release.setCommits.auto: true` with no explicit `release.name` override
- `sentry.client.config.ts:11-46` — `Sentry.init()` has no `release:` field
- `sentry.server.config.ts` / `sentry.edge.config.ts` — same (no `release:` field)
- No `SENTRY_RELEASE` env var override in `.github/workflows/**`

**Implication:** `@sentry/nextjs` SDK resolves release via `getSentryRelease()` fallback chain, which returns `VERCEL_GIT_COMMIT_SHA` unprefixed. Workflow should query Sentry with `release=<sha>` filter and expect raw SHA in event payloads.

**No Sentry API probe needed before planning.**

---

## Policy Decisions

### D1. Rollback behavior → alert-only + workflow-fail

- **Decision:** Gate fails the GitHub Actions workflow on regression + opens a GitHub issue. No Vercel API auto-rollback.
- **Rationale:** First shipment of the gate has unknown false-positive rate. Auto-rollback on day 1 risks unwanted production churn if thresholds are miscalibrated. Workflow failure is the correct CI signal; issue creation ensures the team sees it. Auto-rollback can be added in a follow-up once we have 30 days of baseline data to confirm the thresholds don't cause spurious rollbacks.
- **Out of scope:** Vercel rollback API integration (v1.8+ follow-up).

### D2. Threshold values → conservative defaults, all repo-var configurable

- **Decision:** Starting values:
  - `SENTRY_GATE_NEW_ISSUE_EVENT_THRESHOLD = 10` — any new unresolved issue must have > 10 events in the observation window to trigger
  - `SENTRY_GATE_ERROR_RATE_DELTA_PCT = 1.0` — error-rate increase > 1% absolute vs previous release triggers
  - `SENTRY_GATE_OBSERVATION_WINDOW_MINUTES = 30` — workflow waits 30 min post-deploy before querying Sentry
- **Rationale:** Project is pre-launch with low-moderate traffic. 10 events filters singleton browser-extension errors. 1% (vs research's 0.5%) is more conservative for low-traffic; tighten later when traffic grows. 30 min is the standard Sentry release-monitoring window and matches Vercel's typical propagation + warm-up time.
- **All three are repo variables (not secrets), not hardcoded.** The workflow reads them via `${{ vars.SENTRY_GATE_* }}` with literal fallbacks in the YAML.

### D3. Baseline comparison model → previous single release

- **Decision:** Compare current-release baseline against **the immediately previous production release** only. No rolling median, no absolute floor.
- **Rationale:** Simplest to implement; requires storing only 1 prior baseline. If noise shows up post-launch, upgrade to rolling 7-day median in a v1.8 follow-up — the artifact path (`post-deploy-baselines/<sha>.json`) makes that trivial to retrofit.
- **Trade-off accepted:** Previous-release baseline is noisier than rolling median when individual releases are atypical. Acceptable because the error-rate delta threshold (1%) already has headroom.

### D4. Alert channel → GitHub issue + workflow-fail

- **Decision:** On regression detection, workflow creates a GitHub issue (title: `Sentry regression detected in <sha>`, body: regression details, labels: `sentry-regression, deploy-gate`) AND exits non-zero.
- **Rationale:** Uses existing `GITHUB_TOKEN` (no new secrets). Team gets email notifications via GitHub's standard issue-assignment / watch mechanism. Slack webhook or PagerDuty can be added as a v1.8 follow-up if GitHub issue latency proves insufficient.
- **Out of scope:** Slack, PagerDuty, email direct-send.

### D5. Baseline artifact retention → 90 days

- **Decision:** `actions/upload-artifact@v4` with `retention-days: 90`.
- **Rationale:** Matches project's existing 90-day retention for `security_events_archive` and `user_errors_archive` per CLAUDE.md Data Retention section. Long enough for post-incident regression analysis; short enough that artifact storage costs stay bounded.

### D6. Smoke test approach → re-dispatch against last-known-good release

- **Decision:** Workflow supports `workflow_dispatch` trigger with an `input.release_sha` string. Smoke test is a manual run that dispatches against a known-good prior release SHA and asserts the gate returns PASS.
- **Rationale:** Tests the real code path with real Sentry API responses — no mock fixtures that can drift. Operator runs this once post-implementation to validate the pipeline, and re-runs on suspicion of gate drift.
- **Out of scope:** Synthetic fixture dry-run mode.

---

## Summary for Planner

Planner should produce ONE plan (`43-01-PLAN.md`) containing:

1. New file: `.github/workflows/post-deploy-sentry-gate.yml`
   - Trigger: `repository_dispatch` event type `vercel.deployment.success` + `workflow_dispatch` for smoke test
   - Job 1: observation window wait (30 min, configurable via `vars.SENTRY_GATE_OBSERVATION_WINDOW_MINUTES`)
   - Job 2: query Sentry API for new-release metrics, fetch previous-release baseline from artifact, compute deltas
   - Job 3: gate check — fail if any threshold breached, create GitHub issue on failure, always upload current snapshot as `post-deploy-baselines/<sha>.json` artifact (retention 90 days)

2. Repo secret: `SENTRY_AUTH_TOKEN` (project-scoped, read-only)

3. Repo variables (all configurable post-merge without code change):
   - `SENTRY_ORG` — Sentry org slug
   - `SENTRY_PROJECT` — Sentry project slug  
   - `SENTRY_GATE_NEW_ISSUE_EVENT_THRESHOLD` (default 10)
   - `SENTRY_GATE_ERROR_RATE_DELTA_PCT` (default 1.0)
   - `SENTRY_GATE_OBSERVATION_WINDOW_MINUTES` (default 30)

4. Optional step: install `vercel-dispatch-event-action` in the Vercel GitHub integration so production deploys emit `repository_dispatch` events (one-time config, documented in plan but not code).

5. Documentation: add a short README section explaining smoke-test invocation and threshold tuning.

**No source code changes. No DB migrations. No Edge Function changes.** Pure CI/CD addition.
