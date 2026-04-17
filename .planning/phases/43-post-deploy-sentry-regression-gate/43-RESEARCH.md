# Phase 43: Post-Deploy Sentry Regression Gate — Research

**Researched:** 2026-04-14
**Domain:** GitHub Actions CI, Vercel deploy integration, Sentry API
**Confidence:** HIGH (all primary claims verified against official docs; a handful of specific workflow snippets marked `[CITED]` / `[ASSUMED]` where authoritative source not pinned down)

## Summary

Phase 43 is CI-only. No application code, no DB migrations, no Edge Functions. It adds a single GitHub Actions workflow that fires after a Vercel production deploy, queries the Sentry API against the newly-deployed release tag, captures a baseline, and fails the workflow on regressions above configurable thresholds.

The project is already in good shape for this work: `@sentry/nextjs` 10.48 is wired with `setCommits: { auto: true, ignoreMissing: true }` (next.config.ts:65-70), Vercel auto-deploys from `main` (vercel.json:171-174), and Sentry Org Auth Tokens are the current recommended auth path. Release tags default to `VERCEL_GIT_COMMIT_SHA` via `@sentry/nextjs`'s `getSentryRelease()` fallback chain — so the same SHA that Vercel sets is the Sentry release version the workflow queries. No additional release-tagging step is required inside the app.

The trigger pattern that works with Vercel's managed deploy flow is `repository_dispatch` with type `vercel.deployment.success` (and optionally `vercel.deployment.promoted` for promoted preview → production). GitHub's native `deployment_status` event still works for backward compatibility, but Vercel's docs call it out for deprecation in favor of `repository_dispatch` because the dispatch payload carries enriched deployment data (project, environment, full git SHA, shortSha, deployment URL, deployment id) under `github.event.client_payload`.

**Primary recommendation:** Add one new workflow `.github/workflows/post-deploy-sentry-gate.yml` triggered by `repository_dispatch: vercel.deployment.success` filtered to `client_payload.environment == 'production'`. Inside, create a Sentry "deploy" record via the `/api/0/organizations/{org}/releases/{version}/deploys/` API for observability, sleep for a configurable observation window (default 15 min), then query Sentry's organization issues endpoint filtered by `release:{sha} is:unresolved` and the sessions endpoint for crash-free rate, persist a JSON baseline as a workflow artifact, and `exit 1` on threshold breach. Alert-only on this first shipment (no auto-rollback) because thresholds need to stabilize before wiring them into a destructive action.

## User Constraints

This phase has no CONTEXT.md yet (research runs before `/gsd-discuss-phase` is invoked). Constraints come from the ROADMAP.md and REQUIREMENTS.md phase spec:

### Locked Decisions (from requirements)
- **DEPLOY-01**: Must run after each production deploy to Vercel, query Sentry for the newly-deployed release tag, persist a baseline snapshot (error count, slow transactions above p95, new unresolved issue count) to a known artifact location.
- **DEPLOY-02**: Must fail the workflow on regression above configured thresholds (new unresolved issue with > N events, or error rate increase > X%) within the post-deploy observation window. Optional rollback/alert trigger.
- Thresholds (event count, error-rate delta, observation window) **must be configurable via workflow env vars / repo variables, not hardcoded**.
- Workflow must be documented with required secrets and **run green against a known-good release as a smoke test**.

### Claude's Discretion
- Exact threshold default values (N events, X% error rate, window length) — propose sensible defaults.
- Artifact storage mechanism (workflow artifact vs committed file vs external store).
- Single-release baseline vs rolling-window baseline.
- Alert mechanism (Slack webhook, GitHub issue, email, or just workflow failure) — on first shipment, workflow failure is the safest gate.
- Whether to auto-rollback (surface as gray-zone decision for human).

### Deferred Ideas (out of scope per requirement boundary)
- Frontend observability changes (no SDK config changes beyond what's already wired)
- Log aggregation (Datadog, Logtail, etc.)
- Preview deployment gates (this phase is production only)
- Source map verification (already handled by withSentryConfig)
- Sentry release creation workflow (already handled by setCommits: auto + sourcemaps auto-upload)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Post-deploy workflow queries Sentry, persists baseline | `repository_dispatch: vercel.deployment.success` trigger (Vercel docs) + Sentry `/api/0/organizations/{org}/issues/` and `/sessions/` endpoints (Sentry API docs) + GitHub Actions artifacts |
| DEPLOY-02 | Workflow fails on regression above thresholds | Query response parsed with `jq`, threshold comparison in shell, `exit 1` on breach. Vercel rollback endpoint documented as optional follow-up (`POST /v9/projects/{projectId}/rollback/{deploymentId}` or `vercel rollback` CLI) |

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `@sentry/nextjs` | 10.48.0 [VERIFIED: npm registry 2026-04-14] | Already installed; emits errors tagged with release=git SHA automatically | Already wired in `next.config.ts`, `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| `@sentry/cli` | 3.3.5 [VERIFIED: npm registry 2026-04-14] | Alternate read path via CLI (not strictly required if calling Sentry REST API directly) | Used internally by `getsentry/action-release` v3 |
| `getsentry/action-release@v3` | 3.6.0 [CITED: github.com/getsentry/action-release/releases] | Creates Sentry releases / deploys from GHA | Official Sentry-maintained action; v3 is current stable |
| GitHub Actions `repository_dispatch` | — | Trigger receiving `vercel.deployment.*` events from Vercel | Vercel's recommended replacement for deprecated `deployment_status` |
| `actions/checkout@v6` | — | Workflow code checkout | Already used in ci-cd.yml |
| `actions/upload-artifact@v4` | — | Persist baseline JSON snapshot | GitHub-provided, no secrets handling |

### Supporting (runtime in workflow)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `curl` + `jq` | Query Sentry REST API, parse response, extract counts | Lightweight — no Node dependency needed for a diff-only workflow |
| `actions/github-script@v7` | If complex JSON parsing gets unwieldy in bash | Fallback for readability; not strictly needed |
| Repo Variables (`vars.*`) | Store thresholds (N_EVENTS, ERROR_RATE_DELTA, WINDOW_MINUTES) | Non-sensitive config, editable in repo settings without workflow edit |
| Repo Secrets (`secrets.*`) | `SENTRY_AUTH_TOKEN` (org token), `SENTRY_ORG`, `SENTRY_PROJECT` | Already referenced in next.config.ts:50-51 and src/env.ts:67-69 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `repository_dispatch: vercel.deployment.success` | GitHub-native `deployment_status` event | `deployment_status` is slated for deprecation by Vercel; payload is thinner (no project id, no shortSha). Migration path is explicitly documented [CITED: vercel.com/docs/git/vercel-for-github]. |
| Custom curl/jq regression check | Sentry GitHub Deployment Gate app | The Sentry Deployment Gate requires GitHub Environments with Deployment Protection Rules, which presumes GitHub-native deploys — does not slot cleanly into Vercel's deploy flow. Also lacks configurable error-rate thresholds (only "new issues count"). [CITED: blog.sentry.io/freeze-bad-deployments-in-their-tracks-with-the-github-deployment-gate] |
| Manual baseline JSON artifact | Commit baseline to a tracked file | Artifact avoids polluting git history and avoids the "workflow committing to main" security pattern. Artifacts have 90-day default retention, which is enough for diff. |
| `sentry-cli` for queries | Direct REST API via curl | CLI adds a dependency install step; REST API is simpler and matches the lightweight-workflow goal. |
| Sleep in single job | GHA scheduled re-check | Scheduled re-check would need a separate workflow + state; sleep is simpler at window ≤ 30 min. Above 30 min, split to a cron follow-up workflow. |

**Installation:** None — all runtime dependencies are GitHub-provided actions + `curl`/`jq` which are pre-installed on `ubuntu-latest` runners.

**Version verification (performed 2026-04-14):**
- `@sentry/nextjs`: 10.48.0 is latest (project has ^10.46.0 — in range)
- `@sentry/cli`: 3.3.5 is latest (not pinned in project; would be pulled in by action-release@v3)
- `getsentry/action-release@v3`: v3.6.0 is current (released 2026-03-31 per release notes)

## Architecture Patterns

### Recommended Workflow File Layout

```
.github/
├── workflows/
│   ├── ci-cd.yml                    # existing: lint/typecheck/build + e2e-smoke
│   ├── rls-security-tests.yml       # existing: RLS tests on PR to main
│   ├── claude.yml                   # existing
│   ├── claude-code-review.yml       # existing
│   ├── dependabot-auto-merge.yml    # existing
│   └── post-deploy-sentry-gate.yml  # NEW: Phase 43 addition
```

No new directories needed. One new workflow file, no supporting scripts required (but a `scripts/sentry-regression-check.sh` is acceptable if the inline shell becomes hard to read — see Anti-Patterns).

### Pattern 1: `repository_dispatch` production-only trigger

**What:** Listen for Vercel's enriched deploy-status events, filter to production, drop everything else.
**When to use:** Always. This is the canonical 2026 Vercel pattern.

```yaml
# Source: https://vercel.com/docs/git/vercel-for-github (repository dispatch events section)
name: Post-Deploy Sentry Gate

on:
  repository_dispatch:
    types:
      - vercel.deployment.success
      - vercel.deployment.promoted
  workflow_dispatch:          # allows manual smoke-test runs against a known-good SHA
    inputs:
      release:
        description: 'Sentry release (git SHA) to audit'
        required: true
        type: string

jobs:
  gate:
    if: github.event_name == 'workflow_dispatch' || github.event.client_payload.environment == 'production'
    runs-on: ubuntu-latest
    timeout-minutes: 45      # window + 30 min slack
    steps:
      - name: Determine release SHA
        id: release
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            SHA="${{ inputs.release }}"
          else
            SHA="${{ github.event.client_payload.git.sha }}"
          fi
          echo "sha=$SHA" >> "$GITHUB_OUTPUT"
```

### Pattern 2: Create a Sentry deploy record (observability, not gating)

**What:** POST `/releases/{sha}/deploys/` to give Sentry's UI a "deployed at" marker for this release.
**When to use:** Always. Free; gives the team clear post-deploy context in Sentry's Releases view and enables regression detection that's keyed off deploy timestamp.

```yaml
# Source: https://docs.sentry.io/api/releases/create-a-deploy/
- name: Record Sentry deploy
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    RELEASE: ${{ steps.release.outputs.sha }}
  run: |
    curl -sS -f -X POST \
      "https://sentry.io/api/0/organizations/${SENTRY_ORG}/releases/${RELEASE}/deploys/" \
      -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
            "environment": "production",
            "name": "'"${RELEASE}"'",
            "url": "${{ github.event.client_payload.url || format('https://tenantflow.app') }}"
          }'
```

### Pattern 3: Observation window + bounded polling

**What:** After the deploy, wait long enough for errors to surface, then query. Don't poll in tight loops (rate limits).
**When to use:** Always. Single-sleep is simpler at a 15-min default; if the window grows beyond 30 min, split to a scheduled follow-up workflow.

```yaml
- name: Observation window
  run: sleep ${{ vars.OBSERVATION_MINUTES || 15 }}m
```

### Pattern 4: Fetch baseline + regression check via Sentry REST API

**What:** Hit the organization issues endpoint for new/unresolved issues filtered by `release:{sha}` and the sessions endpoint for error rate.
**When to use:** Always.

```yaml
# Source: https://docs.sentry.io/api/events/list-an-organizations-issues/ (GET)
#         https://docs.sentry.io/api/releases/retrieve-release-health-session-statistics/ (GET)
- name: Query Sentry for new issues in release
  id: issues
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
    RELEASE: ${{ steps.release.outputs.sha }}
    WINDOW: ${{ vars.OBSERVATION_MINUTES || 15 }}
  run: |
    ISSUES_JSON=$(curl -sS -f \
      "https://sentry.io/api/0/organizations/${SENTRY_ORG}/issues/" \
      -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
      --data-urlencode "project=${SENTRY_PROJECT}" \
      --data-urlencode "environment=production" \
      --data-urlencode "query=release:${RELEASE} is:unresolved age:-${WINDOW}m" \
      --data-urlencode "statsPeriod=1h" \
      --data-urlencode "sort=new" \
      --data-urlencode "limit=100" -G)
    echo "$ISSUES_JSON" > issues.json

- name: Query Sentry for crash-free rate
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
    RELEASE: ${{ steps.release.outputs.sha }}
  run: |
    SESSIONS_JSON=$(curl -sS -f \
      "https://sentry.io/api/0/organizations/${SENTRY_ORG}/sessions/" \
      -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
      --data-urlencode "project=${SENTRY_PROJECT}" \
      --data-urlencode "environment=production" \
      --data-urlencode "field=sum(session)" \
      --data-urlencode "field=crash_free_rate(session)" \
      --data-urlencode "statsPeriod=1h" \
      --data-urlencode "query=release:${RELEASE}" -G)
    echo "$SESSIONS_JSON" > sessions.json
```

### Pattern 5: Threshold gate + exit 1

**What:** Parse with `jq`, compare against configurable thresholds, fail the workflow on breach.
**When to use:** Always.

```yaml
- name: Threshold gate
  env:
    N_EVENTS: ${{ vars.REGRESSION_MAX_EVENTS || 10 }}
    ERR_DELTA: ${{ vars.REGRESSION_MAX_ERROR_RATE_PCT || 5 }}
  run: |
    HIGH_VOL_COUNT=$(jq --argjson n "$N_EVENTS" '[.[] | select(.count | tonumber > $n)] | length' issues.json)
    CRASH_FREE=$(jq '.groups[]? | select(.by | length == 0) | .totals["crash_free_rate(session)"] // 1' sessions.json)
    ERROR_RATE_PCT=$(awk -v cf="$CRASH_FREE" 'BEGIN { printf "%.2f", (1 - cf) * 100 }')
    {
      echo "release=${{ steps.release.outputs.sha }}"
      echo "high_volume_new_issues=$HIGH_VOL_COUNT"
      echo "error_rate_pct=$ERROR_RATE_PCT"
      echo "threshold_n_events=$N_EVENTS"
      echo "threshold_error_rate_pct=$ERR_DELTA"
    } | tee gate-summary.txt >> "$GITHUB_STEP_SUMMARY"
    if [ "$HIGH_VOL_COUNT" -gt 0 ]; then
      echo "::error::Regression: $HIGH_VOL_COUNT new unresolved issue(s) above $N_EVENTS events in release."
      exit 1
    fi
    if awk -v e="$ERROR_RATE_PCT" -v t="$ERR_DELTA" 'BEGIN { exit !(e > t) }'; then
      echo "::error::Regression: error rate ${ERROR_RATE_PCT}% exceeds threshold ${ERR_DELTA}%."
      exit 1
    fi

- name: Upload baseline
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: sentry-baseline-${{ steps.release.outputs.sha }}
    path: |
      issues.json
      sessions.json
      gate-summary.txt
    retention-days: 90
```

### Pattern 6: Secrets check fail-closed

**What:** Fail fast if tokens / org / project slug are missing.
**When to use:** Always — matches the existing `rls-security-tests.yml:32-47` pattern in this repo.

```yaml
- name: Check required secrets
  id: check-secrets
  run: |
    missing=()
    [ -z "${SENTRY_AUTH_TOKEN:-}" ] && missing+=(SENTRY_AUTH_TOKEN)
    [ -z "${SENTRY_ORG:-}" ]        && missing+=(SENTRY_ORG)
    [ -z "${SENTRY_PROJECT:-}" ]    && missing+=(SENTRY_PROJECT)
    if [ ${#missing[@]} -gt 0 ]; then
      echo "::error::Missing required secrets: ${missing[*]}"
      exit 1
    fi
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
```

### Anti-Patterns to Avoid

- **Hardcoded thresholds in the YAML:** Requirement 3 explicitly demands configurability via env vars / repo variables. Anything hardcoded will fail the acceptance criterion.
- **Running the gate on preview deploys:** Previews accumulate noise. Filter on `client_payload.environment == 'production'` (or rely on the `vercel.deployment.promoted` event).
- **Auto-rollback on first shipment:** Until the team has observed a week's worth of thresholds-not-breaching against real deploys, rollback is premature. Alert-only (workflow failure + GitHub status check) is the safer path. Add rollback as a follow-up.
- **Polling loops without backoff:** Sentry API has rate limits. A single poll at `sleep WINDOW && query` is cheaper and simpler than a poll-every-minute loop.
- **Using `actions/checkout@v4` in new workflows:** The existing `ci-cd.yml:39` uses `actions/checkout@v6`. Match the version to avoid drift.
- **Committing the baseline JSON to the repo:** Creates a race between workflow runs on concurrent deploys and pollutes git history. Use artifacts.
- **Using a user auth token for SENTRY_AUTH_TOKEN in CI:** Organization Tokens are purpose-built for CI per [docs.sentry.io/account/auth-tokens/] — they're scoped to the org and don't inherit individual user permissions.
- **Calling `sentry-cli` without `--json`:** If using the CLI instead of REST, always use `--json` so the gate logic parses deterministic output.
- **Inlining >100 lines of shell in the workflow YAML:** If the regression check grows past that, extract to `scripts/sentry-regression-check.sh` and call it from the step.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetch production deploy events from Vercel | Custom Vercel webhook receiver | `repository_dispatch` events | Vercel sends these natively, documented, enriched with deploy metadata |
| Release tagging on errors | Custom `SENTRY_RELEASE` injection | `@sentry/nextjs` auto-detect from `VERCEL_GIT_COMMIT_SHA` | Already working per `next.config.ts:65-70` + `getSentryRelease()` fallback chain |
| Source map upload | Custom `sentry-cli sourcemaps upload` step | `withSentryConfig(..., { sourcemaps: {...} })` | Already configured in `next.config.ts:53-59`; runs during `next build` |
| Git commit association | Manual commit list POST | `setCommits: { auto: true, ignoreMissing: true }` | Already configured in `next.config.ts:65-70` |
| Baseline storage | S3 / external DB | GitHub Actions artifacts | Free, 90-day retention, scoped to workflow run, no extra secrets |
| Slack/email alert | Custom webhook | Workflow failure + GitHub status check + branch protection | First shipment scope; alerts are deferred per Open Decisions below |

**Key insight:** The project already has Sentry release tagging wired through Vercel env vars. The only NEW thing this phase builds is the post-deploy gate workflow — everything else is already shipped.

## Runtime State Inventory

(This is a greenfield CI addition. No existing workflow is being renamed, no state is being migrated. Including an explicit "None" for completeness so the planner knows this was checked, not skipped.)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no DB or cache entries relate to this phase | None |
| Live service config | Sentry project `SENTRY_PROJECT` slug must be set as repo secret. Confirm the value matches what Vercel injects at build time (i.e. the project errors are being reported to). | Verify + copy existing secret |
| OS-registered state | None — GitHub-hosted runners are ephemeral | None |
| Secrets/env vars | `SENTRY_AUTH_TOKEN` (new, Organization Token scope), `SENTRY_ORG` (may already exist, referenced in `next.config.ts:50`), `SENTRY_PROJECT` (may already exist, `next.config.ts:51`). Confirm whether any current repo secret is a User Token rather than Org Token. | Audit current tokens; if User Token in place, rotate to Org Token for CI |
| Build artifacts | None — workflow produces artifacts, doesn't consume them | None |

**Canonical check:** After adding the workflow, what runtime systems will have the new string cached? None — this is pure CI orchestration.

## Common Pitfalls

### Pitfall 1: Release tag mismatch between Vercel and Sentry
**What goes wrong:** The workflow queries Sentry for `release:{VERCEL_GIT_COMMIT_SHA}` but Sentry has the release tagged under a different identifier (e.g., Next.js build ID, semver, or `@sentry/nextjs`'s auto-detected release).
**Why it happens:** `@sentry/nextjs` resolves the release via `getSentryRelease()`. When `SENTRY_RELEASE` env var is unset, it falls through to Vercel's `VERCEL_GIT_COMMIT_SHA`. If someone explicitly sets `SENTRY_RELEASE` in Vercel env vars, the workflow's SHA query misses the release.
**How to avoid:** Verify once: deploy with `NODE_ENV=production`, trigger an error, check Sentry's Releases page for the release version. Confirm it matches `VERCEL_GIT_COMMIT_SHA` (the `git.sha` field in the `repository_dispatch` payload). If it doesn't, either set `SENTRY_RELEASE` explicitly in Vercel or adjust the workflow to use whatever format Sentry is actually recording.
**Warning signs:** The first workflow run against a known-good release returns zero issues when you know the release surfaced some. (Smoke test in DEPLOY acceptance criterion 4 catches this.)

### Pitfall 2: `repository_dispatch` requires workflow to live on `main`
**What goes wrong:** The workflow file exists on a feature branch and the team expects it to fire during PR testing; it doesn't.
**Why it happens:** GitHub only fires `repository_dispatch` events for workflow files that exist on the default branch. This is documented behavior [CITED: vercel.com/docs/git/vercel-for-github].
**How to avoid:** Merge the workflow to `main` as a dedicated commit before testing. Use `workflow_dispatch` input (`inputs.release`) to smoke-test against a known-good SHA without needing a live deploy.

### Pitfall 3: `deployment_status` events silently deprecated
**What goes wrong:** Old tutorials suggest `on: deployment_status`. It still works today, but Vercel's docs flag it for eventual removal and its payload lacks the enriched git/project fields `repository_dispatch` provides.
**Why it happens:** Historical drift — `deployment_status` predates `repository_dispatch` enrichment.
**How to avoid:** Use `repository_dispatch` with `vercel.deployment.success` and `vercel.deployment.promoted`. Keep `workflow_dispatch` for manual runs.

### Pitfall 4: Organization Token permissions too narrow
**What goes wrong:** Token works for `releases:*` but 403s on `/organizations/{org}/issues/` or `/sessions/`.
**Why it happens:** Org Tokens have a fixed non-customizable permission set. `event:read` is required for issues; `org:read` required for sessions.
**How to avoid:** Generate the Org Token through Sentry UI (Settings → Developer Settings → Organization Tokens). Verify the token's scope includes what `getsentry/action-release` already uses for this project — if that action-release setup works for creating releases, it almost certainly has the needed scopes, but verify by doing a read-only smoke call (`curl .../issues/?limit=1`) in the workflow's first run.
**Warning signs:** 401 or 403 from Sentry API with an otherwise valid bearer token.

### Pitfall 5: Observation window too short vs. sampling rate
**What goes wrong:** Default `tracesSampleRate: 0.2` in production means 80% of transactions aren't recorded. A 5-minute window may capture fewer signals than needed.
**Why it happens:** Sentry SDK sampling is correct and intentional, but the gate needs enough volume to compute a meaningful error rate.
**How to avoid:** Default observation window to 15 minutes (not 5). Low-traffic projects may need 30+ minutes. Note: error events themselves are NOT sampled (that's `tracesSampleRate` which is transactions only), so issue counts are accurate immediately.
**Warning signs:** `sessions.json` has zero sessions for the release — query window too short or error rate calc cannot be computed.

### Pitfall 6: Baseline overwritten on concurrent deploys
**What goes wrong:** Two deploys race, two workflows run in parallel, they upload artifacts with the same name, one overwrites the other.
**Why it happens:** Artifacts are mutable within a workflow run but unique name = last write wins if two runs share a name.
**How to avoid:** Name artifact `sentry-baseline-${{ steps.release.outputs.sha }}` — unique per release SHA. GitHub's concurrency group already handles dupe cancellation:

```yaml
concurrency:
  group: sentry-gate-${{ github.event.client_payload.git.sha || inputs.release }}
  cancel-in-progress: false   # don't cancel; let first runner complete
```

### Pitfall 7: Vercel doesn't send `repository_dispatch` without opt-in
**What goes wrong:** Workflow is added but never fires.
**Why it happens:** Vercel's `repository_dispatch` integration needs to be active for the project. For projects that disabled `deployment_status` noise on PRs, this may require toggling the Git settings on Vercel [CITED: vercel.com/docs/git/vercel-for-github].
**How to avoid:** Confirm via Vercel dashboard: Project → Settings → Git → check deployment events are enabled. Fallback: verify by manually triggering `workflow_dispatch` to prove the gate logic works, then wait for next production deploy to prove the trigger works.

## Code Examples

### Full workflow skeleton

```yaml
# Source: composed from Vercel repository_dispatch docs + Sentry REST API docs
# File: .github/workflows/post-deploy-sentry-gate.yml

name: Post-Deploy Sentry Gate

on:
  repository_dispatch:
    types:
      - vercel.deployment.success
      - vercel.deployment.promoted
  workflow_dispatch:
    inputs:
      release:
        description: 'Git SHA to audit (for smoke testing against a known-good release)'
        required: true
        type: string

concurrency:
  group: sentry-gate-${{ github.event.client_payload.git.sha || inputs.release }}
  cancel-in-progress: false

permissions:
  contents: read
  actions: read

jobs:
  gate:
    if: github.event_name == 'workflow_dispatch' || github.event.client_payload.environment == 'production'
    runs-on: ubuntu-latest
    timeout-minutes: 45
    env:
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
      SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
      OBSERVATION_MINUTES: ${{ vars.OBSERVATION_MINUTES || 15 }}
      REGRESSION_MAX_EVENTS: ${{ vars.REGRESSION_MAX_EVENTS || 10 }}
      REGRESSION_MAX_ERROR_RATE_PCT: ${{ vars.REGRESSION_MAX_ERROR_RATE_PCT || 5 }}
    steps:
      # [secrets check — see Pattern 6 above]
      # [determine release SHA — see Pattern 1 above]
      # [record Sentry deploy — see Pattern 2 above]
      # [observation window sleep — see Pattern 3 above]
      # [query Sentry issues + sessions — see Pattern 4 above]
      # [threshold gate + exit 1 — see Pattern 5 above]
      # [upload artifact baseline — see Pattern 5 above]
```

### Sentry issues query (exact URL)

```bash
# Source: https://docs.sentry.io/api/events/list-an-organizations-issues/
# Filters: this release, unresolved, new in last 15 minutes, sorted by newest
curl -G "https://sentry.io/api/0/organizations/${SENTRY_ORG}/issues/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  --data-urlencode "project=${SENTRY_PROJECT}" \
  --data-urlencode "environment=production" \
  --data-urlencode "query=release:${RELEASE} is:unresolved age:-15m" \
  --data-urlencode "sort=new" \
  --data-urlencode "limit=100"
```

### Sentry sessions (crash-free rate) query (exact URL)

```bash
# Source: https://docs.sentry.io/api/releases/retrieve-release-health-session-statistics/
curl -G "https://sentry.io/api/0/organizations/${SENTRY_ORG}/sessions/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  --data-urlencode "project=${SENTRY_PROJECT}" \
  --data-urlencode "environment=production" \
  --data-urlencode "field=sum(session)" \
  --data-urlencode "field=crash_free_rate(session)" \
  --data-urlencode "statsPeriod=1h" \
  --data-urlencode "query=release:${RELEASE}"
```

### Create Sentry deploy record

```bash
# Source: https://docs.sentry.io/api/releases/create-a-deploy/
curl -sS -f -X POST \
  "https://sentry.io/api/0/organizations/${SENTRY_ORG}/releases/${RELEASE}/deploys/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"environment":"production","name":"'"${RELEASE}"'"}'
```

### Optional: Vercel rollback (NOT recommended for first shipment)

```bash
# Source: https://vercel.com/docs/cli/rollback (CLI) and
#         https://dev.to/philw_/using-vercels-instant-rollback-feature-in-your-own-cicd-pipeline-57oi (REST API)
# CLI path (requires VERCEL_TOKEN):
VERCEL_TOKEN="${{ secrets.VERCEL_TOKEN }}" \
  npx vercel@latest rollback --timeout 0 --yes

# REST API path (undocumented but functional):
curl -sS -f -X POST \
  "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/rollback/${PREVIOUS_DEPLOYMENT_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"
```

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|-------------------------|--------------|--------|
| GitHub `deployment_status` event | `repository_dispatch` with `vercel.deployment.*` types | Vercel migration path documented in current docs | Enriched payload with git SHA, project id, environment; fewer YAML conditionals |
| `getsentry/action-release@v1` | `getsentry/action-release@v3` | v3 released; includes Debug ID injection for source maps | Better source-map quality; `inject: false` to opt-out of Debug IDs |
| User auth tokens in CI | Organization Auth Tokens | Ongoing rollout | Scoped to org; cleaner security posture |
| Polling loops for error detection | Single observation window + one query | Always the preferred pattern | Simpler workflows, fewer rate-limit issues |
| Sentry Deployment Gate app | Still GitHub-Enterprise-and-Environments-only | No change | Not usable with Vercel-managed deploys unless migrating to GHA-driven deploy flow |

**Deprecated / outdated:**
- `github.event.deployment_status.*` payload fields: still work, but the payload is sparse and migration to `github.event.client_payload.*` is encouraged.
- `sentry-cli releases new` + `sentry-cli releases set-commits`: manual pattern, superseded by `action-release@v3` and `withSentryConfig({ release: { setCommits: { auto: true } } })`.
- Embedding `SENTRY_RELEASE` as a build-time env var in Vercel: no longer needed because `@sentry/nextjs` auto-detects `VERCEL_GIT_COMMIT_SHA`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `ubuntu-latest` GHA runner | Workflow execution | ✓ | GitHub-hosted | — |
| `curl` (on runner) | Sentry API calls | ✓ | pre-installed on runner | — |
| `jq` (on runner) | JSON parsing | ✓ | pre-installed on runner | — |
| `SENTRY_AUTH_TOKEN` (repo secret, Org Token scope) | Sentry API auth | ✗ (must be created) | — | workflow fails fast per Pattern 6 |
| `SENTRY_ORG` (repo secret) | Sentry org slug | ? (referenced in existing src/env.ts:67) | — | workflow fails fast per Pattern 6 |
| `SENTRY_PROJECT` (repo secret) | Sentry project slug | ? (referenced in existing src/env.ts:68) | — | workflow fails fast per Pattern 6 |
| Vercel `repository_dispatch` event | Workflow trigger | ? (need to confirm Vercel project setting) | — | `workflow_dispatch` manual trigger for smoke test |
| `VERCEL_TOKEN` (for optional rollback) | Vercel rollback API | ✗ | — | alert-only on first shipment |

**Missing dependencies with no fallback:**
- `SENTRY_AUTH_TOKEN` — must be created in Sentry org and added to GitHub repo secrets. This is the only hard blocker; user must complete this manually.

**Missing dependencies with fallback:**
- `SENTRY_ORG` / `SENTRY_PROJECT` — if missing from repo secrets, workflow fails fast with a helpful error message (matches the `rls-security-tests.yml:32-47` pattern).
- Vercel repository_dispatch active → if not, `workflow_dispatch` manual trigger path still proves the gate works (used for smoke test per DEPLOY success criterion 4).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | GitHub Actions workflow itself (no separate test framework needed) |
| Config file | `.github/workflows/post-deploy-sentry-gate.yml` |
| Quick run command | `gh workflow run post-deploy-sentry-gate.yml -f release=<known-good-sha>` |
| Full suite command | Same — there's one workflow with one job |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Workflow runs after production deploy, queries Sentry, persists baseline | smoke (manual) | `gh workflow run post-deploy-sentry-gate.yml -f release=<known-good-sha>` then `gh run view <run-id> --log` | ❌ Wave 0 |
| DEPLOY-01 | Baseline artifact contains error count, new issue count, sessions | smoke | Inspect uploaded artifact: `gh run download <run-id>` then `jq . issues.json sessions.json` | ❌ Wave 0 |
| DEPLOY-02 | Workflow fails on regression above thresholds | smoke | Trigger workflow against a release with known errors + set `vars.REGRESSION_MAX_EVENTS=0` so any issue breaches | ❌ Wave 0 |
| DEPLOY-02 | Thresholds are configurable via repo variables | smoke | `gh variable set REGRESSION_MAX_EVENTS --body 99`; re-run workflow; verify outputs use new threshold | ❌ Wave 0 |
| (success #4) | Workflow runs green against known-good release | smoke | `gh workflow run post-deploy-sentry-gate.yml -f release=<shipped-sha>` and confirm green status | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** nothing — CI-only phase, no unit tests to run per commit
- **Per wave merge:** `gh workflow run post-deploy-sentry-gate.yml -f release=<current-main-sha>` (smoke test)
- **Phase gate:** Workflow file exists on `main`, smoke-test run returns green against a known-good release, `workflow_dispatch` UI shows input for release SHA, repo variables `OBSERVATION_MINUTES` / `REGRESSION_MAX_EVENTS` / `REGRESSION_MAX_ERROR_RATE_PCT` are all set.

### Wave 0 Gaps
- [ ] Create Sentry Organization Token at Settings → Developer Settings → Organization Tokens; add as `SENTRY_AUTH_TOKEN` repo secret
- [ ] Confirm `SENTRY_ORG` and `SENTRY_PROJECT` repo secrets exist (referenced in `next.config.ts:50-51`); if not, add them
- [ ] Set repo variables: `OBSERVATION_MINUTES` (default 15), `REGRESSION_MAX_EVENTS` (default 10), `REGRESSION_MAX_ERROR_RATE_PCT` (default 5)
- [ ] Confirm Vercel sends `repository_dispatch` events for this project (Project Settings → Git → deployment events enabled)
- [ ] Verify Sentry releases page shows recent deploys with `release = VERCEL_GIT_COMMIT_SHA`-format identifier (not a different format)
- [ ] Decide (or escalate): alert-only vs. auto-rollback on first shipment

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Sentry Org Token authenticates gate workflow to Sentry API (bearer token). Stored in GitHub repo secret — encrypted at rest, redacted from logs |
| V3 Session Management | no | No user sessions in a CI workflow |
| V4 Access Control | yes | Org Token scope is fixed by Sentry (no elevated `org:admin` needed). GitHub repo secrets accessible only to repo collaborators with actions:write. Workflow has `permissions: contents: read, actions: read` — no write surface |
| V5 Input Validation | yes | `repository_dispatch` client_payload is attacker-controlled only in theory (Vercel-signed dispatch from Vercel's integration). Still, treat `client_payload.git.sha` as untrusted: regex-validate to `^[a-f0-9]{40}$` before passing to curl URL path to prevent command/URL injection |
| V6 Cryptography | no | No local crypto ops — TLS handled by curl/GitHub runner |

### Known Threat Patterns for GHA + Vercel + Sentry

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token leakage in workflow logs | Information Disclosure | GitHub Actions auto-redacts secrets from logs; never `echo` secrets; use `env:` not inline args |
| Malicious `repository_dispatch` (third-party spoofing) | Spoofing | `repository_dispatch` from Vercel is authenticated via GitHub's webhook signature verification — GitHub only fires the event if signed by an authorized app. Vercel's app is authorized; third parties can't spoof |
| Command injection via payload | Tampering | Regex-validate `client_payload.git.sha` to hex-40 chars; pass via env var (`env: RELEASE: ${{ ... }}`) not inline string interpolation in shell |
| Rate-limit abuse | Denial of Service | Single-query pattern (not polling); concurrency group prevents overlapping runs for same SHA |
| Auto-rollback weaponization | Tampering | If auto-rollback enabled later, gate the rollback on TWO independent signals (e.g., both new-issue count AND error-rate delta) to reduce false-positive rollback risk |

## Threshold Model & Configurability

### Proposed default thresholds

| Variable | Default | Rationale |
|----------|---------|-----------|
| `OBSERVATION_MINUTES` | 15 | Long enough for traffic to surface a real regression; short enough that a dev watching the deploy gets feedback before they context-switch. Accounts for `tracesSampleRate: 0.2`. |
| `REGRESSION_MAX_EVENTS` | 10 | An issue that fires 10+ times in 15 minutes across real users is almost certainly real, not a single flaky request. One-off transients filtered out. |
| `REGRESSION_MAX_ERROR_RATE_PCT` | 5 | 5% error rate (≡ 95% crash-free rate) is a standard Sentry Release Health floor. Below this on a fresh release usually means a real problem. |

### Repo variables vs secrets

| Name | Type | Reason |
|------|------|--------|
| `OBSERVATION_MINUTES` | Variable (`vars.*`) | Not sensitive; editable in repo settings |
| `REGRESSION_MAX_EVENTS` | Variable (`vars.*`) | Not sensitive |
| `REGRESSION_MAX_ERROR_RATE_PCT` | Variable (`vars.*`) | Not sensitive |
| `SENTRY_AUTH_TOKEN` | Secret (`secrets.*`) | Bearer token grants Sentry API access |
| `SENTRY_ORG` | Secret (`secrets.*`) | Conventionally kept as secret; matches pattern in `rls-security-tests.yml` |
| `SENTRY_PROJECT` | Secret (`secrets.*`) | Same reasoning |
| `VERCEL_TOKEN` (optional, if auto-rollback added later) | Secret (`secrets.*`) | Grants deploy-level mutations |

### Baseline: single-release vs rolling

Recommendation: **single-release baseline** for first shipment. Each workflow run uploads `issues.json` + `sessions.json` + `gate-summary.txt` for the release it ran against. Artifacts persist 90 days. If later work needs "compare to last N releases' average," the artifact list is queryable via `gh api repos/:owner/:repo/actions/artifacts` — upgrade path is clear, but YAGNI for now.

### Artifact storage

GitHub Actions artifacts. 90-day default retention. Named `sentry-baseline-<sha>`. Accessible via `gh run download <run-id>` or the Actions UI. Pros: free, no secrets, atomic, retained long enough for post-mortem review. Cons: disappears after 90 days (acceptable for a regression-gate use case; if long-term historical analysis is needed, add a follow-up to export to S3).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Project's Sentry releases are tagged with `VERCEL_GIT_COMMIT_SHA` (40-char git SHA) | Summary + Pattern 1 | [ASSUMED based on `getSentryRelease()` fallback chain + Vercel env var availability]. If actually tagged differently (e.g., Next.js build ID, or an explicit `SENTRY_RELEASE` env var overriding the default), the workflow queries will return zero issues. **Pitfall 1 prescribes the one-time verification step to catch this.** |
| A2 | `SENTRY_ORG` and `SENTRY_PROJECT` are already set in both Vercel env vars (for source-map upload at build) AND need to be replicated as GitHub repo secrets | Standard Stack + Environment Availability | [ASSUMED]. If they're only set in Vercel's dashboard and not yet as GitHub secrets, Wave 0 step must add them. |
| A3 | Vercel's `repository_dispatch` integration is active for this project | Pitfall 7 + Environment Availability | [ASSUMED]. Vercel documentation shows this is opt-in via project Git settings. First smoke test will reveal whether it's on — `workflow_dispatch` provides a non-blocking fallback. |
| A4 | 15-min observation window is appropriate for tenantflow.app's production traffic level | Threshold Model | [ASSUMED]. Low-traffic SaaS may need 30-60 min to surface enough signal; high-traffic may need less. The number is a repo variable so the team can tune without editing the workflow. |
| A5 | "New unresolved issue with > 10 events" is the right default per-issue threshold | Threshold Model | [ASSUMED, industry-typical]. Some teams use > 50; some use > 3. Configurable, so tuning is low-cost. |
| A6 | Sentry Org Token with default CI scope can read `/organizations/{org}/issues/` and `/sessions/` | Standard Stack + Security Domain | [CITED: docs.sentry.io/account/auth-tokens/ states Org Tokens have "most CI-related tasks" scopes, but the exact scope list is non-customizable and only partially documented]. Empirical verification is a Wave 0 step. |
| A7 | Auto-rollback is NOT wanted on first shipment | Threshold Model + Open Decisions | [ASSUMED]. ROADMAP.md phrases DEPLOY-02 as "optionally triggers a Vercel rollback or alert" — the "optionally" suggests this is team's-choice. Surfacing as open decision. |
| A8 | Artifact retention of 90 days is enough for post-mortem review | Threshold Model | [ASSUMED]. If the team wants historical trend analysis over a longer horizon, add a follow-up task to export to S3 or Supabase. |

**If all these assumptions hold, the research is accurate. If A1 is wrong, the whole gate returns false negatives. Verify A1 first.**

## Open Questions (for /gsd-discuss-phase)

1. **Auto-rollback vs. alert-only on first shipment?**
   - What we know: Rollback is achievable via `vercel rollback` CLI or undocumented `POST /v9/projects/{projectId}/rollback/{deploymentId}` REST endpoint.
   - What's unclear: First shipment risk tolerance — auto-rollback on a false-positive regression is disruptive; alert-only delays human response but has no false-positive blast radius.
   - Recommendation: Alert-only (workflow failure visible in branch protection / PR status). Add auto-rollback as a follow-up once thresholds stabilize over ~10 production deploys.

2. **Exact threshold values (N events per issue, error-rate delta percentage)?**
   - What we know: Industry-typical defaults are N=10 events in window, error-rate delta 5%.
   - What's unclear: The team's actual production traffic volume and acceptable noise floor.
   - Recommendation: Ship with defaults (N=10, rate=5%, window=15min) as repo variables. Monitor first 5 production deploys; adjust up if false-positive, down if missed real regression.

3. **Observation window length?**
   - What we know: Too short = insufficient signal; too long = slow feedback loop.
   - What's unclear: tenantflow.app's production traffic rate.
   - Recommendation: 15 min default. Configurable via `vars.OBSERVATION_MINUTES`.

4. **Single-release baseline or rolling-window comparison?**
   - What we know: Single-release is simpler; rolling requires artifact cross-lookup across runs.
   - What's unclear: Whether the team values trend analysis over simplicity.
   - Recommendation: Single-release for first shipment; artifacts are retained 90 days and queryable via `gh api` if trend analysis is wanted later.

5. **Alert delivery mechanism beyond GitHub status check?**
   - What we know: Workflow failure is automatically visible in GitHub UI, branch protection status, and email to repo watchers.
   - What's unclear: Whether the team wants a Slack notification or an on-call page.
   - Recommendation: Rely on workflow failure for v1. Add Slack integration via existing repository webhooks as a follow-up if the team needs faster-than-email response.

6. **Baseline storage lifetime?**
   - What we know: GitHub Actions artifacts default to 90 days.
   - What's unclear: Compliance or post-mortem requirements for longer retention.
   - Recommendation: 90 days for v1. Surface as follow-up if audit/compliance needs longer.

## Out of Scope

Per DEPLOY-01/02 requirement boundary and the ROADMAP.md phase description:

- **Frontend observability changes.** The project's Sentry SDK config (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) is already producing the right signal. This phase does not tune sample rates, add breadcrumbs, or change integrations.
- **Log aggregation.** Sentry is the single source of truth for error signal in this phase. Third-party log platforms (Datadog, Logtail, BetterStack) are out of scope.
- **Preview deploy gates.** The gate applies to production only. Preview deploys are noise.
- **Source-map verification.** Already handled by `withSentryConfig` during `next build`. This phase does not touch source-map flow.
- **Sentry release creation workflow.** Already handled by `setCommits: { auto: true, ignoreMissing: true }`. This phase uses the releases Sentry already has; it does not create new ones.
- **Performance/p95 transaction threshold enforcement (DEPLOY-01 mentions "slow transactions above p95 threshold" only as part of the baseline snapshot).** Writing the p95 value to the baseline artifact is in scope; enforcing a threshold against it is NOT in scope for this phase — a p95 regression is typically slower-moving than an error-rate regression and benefits from trend analysis that's out of scope here.
- **Rollback wiring.** Documented but deferred; first shipment is alert-only.
- **Historical trend dashboards.** Artifacts give 90-day post-mortem access; a UI dashboard is a follow-up concern.
- **GDPR / data-retention concerns on baseline artifacts.** Baseline JSON is metadata (counts, rates, release SHAs); no PII. Out of scope to document further.

## Recommended Approach

One workflow file at `.github/workflows/post-deploy-sentry-gate.yml`. Triggers on `repository_dispatch: vercel.deployment.success, vercel.deployment.promoted` filtered to `client_payload.environment == 'production'`. Also supports `workflow_dispatch` with a `release` input for manual smoke testing. Single job `gate` on `ubuntu-latest`:

1. **Check secrets** (fail-fast pattern from `rls-security-tests.yml:32-47`)
2. **Resolve release SHA** (from `client_payload.git.sha` or `inputs.release`; regex-validate to hex-40)
3. **Create Sentry deploy record** via POST `/releases/{sha}/deploys/` (observability, non-gating)
4. **Sleep `vars.OBSERVATION_MINUTES`** (default 15)
5. **Query Sentry issues** for `release:{sha} is:unresolved age:-${WINDOW}m` (scoped to project, production env)
6. **Query Sentry sessions** for `release:{sha}` with `field=sum(session)` and `field=crash_free_rate(session)` (scoped to project, production env)
7. **Threshold gate:** if any issue in response has `count > vars.REGRESSION_MAX_EVENTS`, fail. If `(1 - crash_free_rate) * 100 > vars.REGRESSION_MAX_ERROR_RATE_PCT`, fail.
8. **Upload baseline artifact** `sentry-baseline-<sha>` with `issues.json` + `sessions.json` + `gate-summary.txt` (retention 90 days)
9. **Summarize to job step summary** (threshold values, actual values, pass/fail)

Plus the following repo-level configuration (Wave 0):
- Secrets: `SENTRY_AUTH_TOKEN` (Org Token), `SENTRY_ORG`, `SENTRY_PROJECT`
- Variables: `OBSERVATION_MINUTES=15`, `REGRESSION_MAX_EVENTS=10`, `REGRESSION_MAX_ERROR_RATE_PCT=5`

Plus a one-time verification (Wave 0):
- Check Sentry Releases UI shows recent deploys tagged with `VERCEL_GIT_COMMIT_SHA`-format (40-char git SHA). If not, adjust workflow's release-resolution logic to match whatever format Sentry is actually recording.

### Expected phase structure (for planner)

This phase will likely be 1 plan:
- **43-01-PLAN.md** — Post-deploy Sentry regression gate workflow (create workflow, set secrets/variables, smoke-test against known-good release, verify release tag format, decide alert-only vs. rollback escalation)

Could optionally split to 2 plans if the team prefers:
- 43-01: workflow + secrets + smoke test (the MVP)
- 43-02: alert mechanism expansion (Slack, rollback wiring) — but this is likely out of scope per current requirements.

## Sources

### Primary (HIGH confidence — official docs, verified 2026-04-14)

- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github) — `repository_dispatch` event types, system environment variables (`VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV`, `VERCEL_DEPLOYMENT_ID`), migration from `deployment_status`
- [Vercel CLI: rollback](https://vercel.com/docs/cli/rollback) — `vercel rollback` command, hobby-plan limitation
- [Sentry API: List an Organization's Issues](https://docs.sentry.io/api/events/list-an-organizations-issues/) — endpoint, query parameters, response schema
- [Sentry API: Retrieve Release Health Session Statistics](https://docs.sentry.io/api/releases/retrieve-release-health-session-statistics/) — sessions endpoint, `crash_free_rate(session)` field
- [Sentry API: Create a Deploy](https://docs.sentry.io/api/releases/create-a-deploy/) — POST `/releases/{version}/deploys/`, required body params
- [Sentry: Auth Tokens](https://docs.sentry.io/account/auth-tokens/) — Organization Tokens vs. User Tokens vs. Internal Integration Tokens; Org Token CI scopes
- [Sentry: Searchable issue properties](https://docs.sentry.io/concepts/search/searchable-properties/issues/) — `release`, `firstSeen`, `age`, `is:unresolved`, `is:regressed`, `timesSeen`
- [getsentry/action-release](https://github.com/getsentry/action-release) — v3.6.0; required env vars; `set_commits`, `finalize`, `environment` params
- [Vercel repository-dispatch source](https://github.com/vercel/repository-dispatch) — `DispatchDataCommon` type (project/environment/git.{sha,ref,shortSha})

### Secondary (MEDIUM confidence — verified against official source for key claims)

- [Sentry for Next.js: Releases & Health](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/releases/) — `SENTRY_RELEASE` env var role
- [getsentry/sentry-javascript discussion #9195](https://github.com/getsentry/sentry-javascript/discussions/9195) — `getSentryRelease()` fallback chain (SENTRY_RELEASE → sentry-webpack-plugin → GITHUB_SHA → VERCEL_GIT_COMMIT_SHA → custom fallback)
- [Sentry: GitHub Deployment Gate integration blog post](https://blog.sentry.io/freeze-bad-deployments-in-their-tracks-with-the-github-deployment-gate/) — not suitable for Vercel-managed deploys (requires GitHub Environments w/ protection rules)
- [Vercel changelog: repository_dispatch enrichment](https://vercel.com/changelog/trigger-github-actions-with-enriched-deployment-data-from-vercel)
- [Vercel deployment protection rules (GitHub blog)](https://github.blog/news-insights/product-news/announcing-github-actions-deployment-protection-rules-now-in-public-beta/)

### Tertiary (LOW confidence — single-source; verify before use)

- [Using Vercel's instant rollback feature in CI/CD](https://dev.to/philw_/using-vercels-instant-rollback-feature-in-your-own-cicd-pipeline-57oi) — undocumented rollback REST endpoint `/v9/projects/{projectId}/rollback/{deploymentId}`. GitLab example, not GitHub Actions.
- [Sentry Release deploy API blog post](https://blog.sentry.io/release-deploys/) — release vs. deploy distinction

### Codebase references (HIGH confidence — verified by direct read)

- `/Users/richard/Developer/tenant-flow/next.config.ts` (lines 49-70) — `withSentryConfig` options including `org`, `project`, `sourcemaps`, `tunnelRoute: /monitoring`, `release: { setCommits: { auto: true, ignoreMissing: true } }`
- `/Users/richard/Developer/tenant-flow/sentry.client.config.ts` — `environment: process.env.NODE_ENV`, release auto-detection
- `/Users/richard/Developer/tenant-flow/sentry.server.config.ts` — same pattern
- `/Users/richard/Developer/tenant-flow/sentry.edge.config.ts` — same pattern
- `/Users/richard/Developer/tenant-flow/src/instrumentation.ts` — Sentry init glue via Next.js instrumentation hook
- `/Users/richard/Developer/tenant-flow/src/env.ts` (lines 66-69, 129-131) — `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` declared as optional server env vars
- `/Users/richard/Developer/tenant-flow/vercel.json` (lines 171-175) — `git.deploymentEnabled.main: true` (main-branch-only production deploy)
- `/Users/richard/Developer/tenant-flow/.vercel/project.json` — `projectId: prj_ZDkcxnOs69RnZ2xIdI8FZtfSHZVK`, `orgId: team_hHHBP2g1RyRcqEZlePKqViVa`
- `/Users/richard/Developer/tenant-flow/.github/workflows/ci-cd.yml` (lines 3-20, 68-108) — existing `on: push: branches: main` + `paths-ignore` pattern; existing `actions/checkout@v6`, `pnpm/action-setup@v5`, `actions/setup-node@v6` used — match these versions in the new workflow
- `/Users/richard/Developer/tenant-flow/.github/workflows/rls-security-tests.yml` (lines 32-47) — existing secrets-check fail-fast pattern to replicate
- `/Users/richard/Developer/tenant-flow/package.json` — `@sentry/nextjs: ^10.46.0` (latest: 10.48.0)

## Metadata

**Confidence breakdown:**
- Standard stack (Sentry API, GHA, Vercel integration): HIGH — all endpoints and payload shapes verified against official docs 2026-04-14
- Architecture patterns (workflow layout, trigger choice, threshold logic): HIGH — composed from current (not cached) official Vercel and Sentry docs
- Pitfalls: HIGH — drawn from known GHA + Vercel + Sentry integration gotchas, cross-referenced with official docs
- Default threshold values (N=10 events, 5% error rate, 15-min window): MEDIUM — industry-typical but configurable; not verified against tenantflow.app-specific traffic data
- `@sentry/nextjs` release auto-detection (A1): MEDIUM — documented fallback chain, but explicit verification in repo history / Sentry Releases UI is needed
- Vercel rollback REST API: LOW (undocumented per dev.to source); CLI path is HIGH

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (one month — stable infra, but Vercel/Sentry both publish API changes on a multi-month cadence; re-verify if phase execution slips)
