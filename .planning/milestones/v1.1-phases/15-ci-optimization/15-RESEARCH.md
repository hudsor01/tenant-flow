# Phase 15: CI Optimization - Research

**Researched:** 2026-03-08
**Domain:** GitHub Actions CI workflow restructuring
**Confidence:** HIGH

## Summary

This phase restructures the existing `ci-cd.yml` workflow to decouple the `checks` and `e2e-smoke` jobs. Currently both jobs trigger on both `push` and `pull_request` events, with `e2e-smoke` chained behind `checks` via `needs: [checks]`. The requirement (INFRA-04) is to gate `checks` to PR-only and let `e2e-smoke` run independently on push to main.

The change is small and well-scoped: add `if:` conditionals to each job, remove the `needs` dependency, and move from workflow-level concurrency to per-job concurrency groups. The existing workflow is 103 lines and only two jobs are affected. No new workflows, no new jobs, no new dependencies.

**Primary recommendation:** Add `if:` conditionals to each job, remove `needs: [checks]` from `e2e-smoke`, replace workflow-level `concurrency` with per-job concurrency groups using distinct group names.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep single `ci-cd.yml` file with `if:` conditionals per job
- `checks` job gets `if: github.event_name == 'pull_request'`
- `e2e-smoke` job gets `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
- Remove `needs: [checks]` from `e2e-smoke` -- runs independently
- RLS security tests remain in separate `rls-security-tests.yml` (no consolidation)
- Move from workflow-level concurrency to per-job concurrency groups
- `checks` job: `group: checks-${{ github.ref }}`, `cancel-in-progress: true`
- `e2e-smoke` job: `group: e2e-${{ github.ref }}`, `cancel-in-progress: true`
- e2e-smoke does NOT include a build step -- tests run against live deployed app
- e2e-smoke only needs: checkout, pnpm install, Playwright install, run tests
- `continue-on-error: true` stays -- e2e-smoke is informational only

### Claude's Discretion
- Whether to keep or adjust `paths-ignore` filters
- Exact concurrency group naming convention
- Any cleanup of comments or formatting in the workflow file

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-04 | CI workflow: gate `checks` job to PR-only, `e2e-smoke` runs independently on push | Job-level `if:` conditionals, removal of `needs` dependency, per-job concurrency groups |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| GitHub Actions | N/A (platform) | CI/CD orchestration | Already in use, no alternatives needed |

### Actions Used
| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | `v6` | Repository checkout |
| `pnpm/action-setup` | `v4` | pnpm installation |
| `actions/setup-node` | `v6` | Node.js setup with pnpm cache |

No new dependencies needed. This phase modifies existing workflow configuration only.

## Architecture Patterns

### Current Workflow Structure (BEFORE)
```yaml
# ci-cd.yml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:                          # Workflow-level (shared)
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:                             # Runs on BOTH push and PR
    # lint, typecheck, build
  e2e-smoke:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [checks]                   # Blocked by checks
    # playwright smoke tests
```

### Target Workflow Structure (AFTER)
```yaml
# ci-cd.yml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# No workflow-level concurrency

jobs:
  checks:
    if: github.event_name == 'pull_request'
    concurrency:                      # Job-level
      group: checks-${{ github.ref }}
      cancel-in-progress: true
    # lint, typecheck, build

  e2e-smoke:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    # No needs: [checks]
    concurrency:                      # Job-level
      group: e2e-${{ github.ref }}
      cancel-in-progress: true
    # playwright smoke tests
```

### Key Design Facts

**Event flow on PR merge:** When a PR is merged to main, GitHub fires a `push` event to `refs/heads/main`. This means:
- `checks` will NOT run (its `if:` requires `pull_request`)
- `e2e-smoke` WILL run (its `if:` matches `push` + `refs/heads/main`)
- This is the correct behavior -- checks already passed on the PR

**Event flow on PR open/sync:** When a PR is opened or updated:
- `checks` WILL run (its `if:` matches `pull_request`)
- `e2e-smoke` will NOT run (its `if:` requires `push` + `refs/heads/main`)
- This is the correct behavior -- smoke tests only run after merge

### Concurrency Group Isolation

Moving from workflow-level to job-level concurrency is necessary because:
- Workflow-level concurrency uses a single group for all jobs
- When a PR merges (push event), the push-triggered workflow would cancel any in-progress PR-triggered workflow (and vice versa)
- Per-job groups (`checks-${{ github.ref }}` vs `e2e-${{ github.ref }}`) prevent cross-job interference

The `cancel-in-progress: true` on each job means:
- Rapid PR pushes cancel the previous `checks` run for the same branch
- Rapid merges to main cancel the previous `e2e-smoke` run (rare but safe)

### Anti-Patterns to Avoid
- **Shared concurrency group for independent jobs:** Would cause push-to-main events to cancel in-progress PR checks and vice versa
- **Keeping `needs: [checks]` on e2e-smoke:** When `checks` is skipped (push event), `e2e-smoke` would also be skipped because its dependency was not satisfied
- **Using `if: always()` with `needs`:** Overly complex workaround when the real fix is removing `needs` entirely

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job-level event filtering | Custom shell script checking event type | `if:` conditional on job | Native GitHub Actions feature, evaluated before job starts (no runner cost) |
| Concurrency isolation | External locking mechanism | Per-job `concurrency` groups | Native feature, handles pending/running job limits automatically |

## Common Pitfalls

### Pitfall 1: needs + skipped dependency = skipped dependent
**What goes wrong:** If `e2e-smoke` keeps `needs: [checks]` and `checks` is skipped via `if:`, then `e2e-smoke` is also skipped.
**Why it happens:** GitHub Actions treats a skipped job's `needs` as not satisfied by default.
**How to avoid:** Remove `needs: [checks]` from `e2e-smoke` entirely.
**Warning signs:** e2e-smoke never runs after merging to main.

### Pitfall 2: paths-ignore blocking e2e-smoke on main
**What goes wrong:** If a merge commit only touches files matching `paths-ignore` (e.g., only `.md` files), the workflow does not trigger at all, so e2e-smoke never runs.
**Why it happens:** `paths-ignore` is evaluated at the workflow trigger level, before any job `if:` conditions.
**How to avoid:** This is actually acceptable behavior -- if only docs changed, there is nothing to smoke test. Keep `paths-ignore` as-is.
**Warning signs:** None -- this is expected and safe.

### Pitfall 3: Workflow-level concurrency canceling cross-event runs
**What goes wrong:** With a shared workflow-level concurrency group keyed on `github.ref`, a push to `main` (merge) cancels an in-progress PR `checks` job for a different PR that also targets main.
**Why it happens:** All PRs targeting main share the same `github.ref` in concurrency group evaluation when workflow-level concurrency uses `github.ref`.
**How to avoid:** Use per-job concurrency groups. For `checks`, `github.ref` resolves to `refs/pull/N/merge` (unique per PR). For `e2e-smoke`, `github.ref` resolves to `refs/heads/main` (shared, but this is correct -- only one e2e run on main at a time).
**Warning signs:** PR checks randomly canceled when another PR merges.

### Pitfall 4: Concurrency group naming collision
**What goes wrong:** If both jobs use the same concurrency group prefix (or no prefix), they interfere with each other.
**Why it happens:** Concurrency groups are global across the repository, not scoped to a workflow or job.
**How to avoid:** Use distinct prefixes: `checks-` vs `e2e-`.
**Warning signs:** Jobs in different workflows being canceled unexpectedly.

## Code Examples

### The Complete Target Workflow
```yaml
# Source: GitHub Actions docs - workflow syntax, concurrency, job conditions
name: CI

on:
  push:
    branches: [main]
    paths-ignore:
      - "**.md"
      - ".planning/**"
      - ".vscode/**"
      - "docs/**"
      - "LICENSE"
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
    paths-ignore:
      - "**.md"
      - ".planning/**"
      - ".vscode/**"
      - "docs/**"
      - "LICENSE"

permissions:
  contents: read

jobs:
  checks:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    concurrency:
      group: checks-${{ github.ref }}
      cancel-in-progress: true
    env:
      CI: true
    steps:
      # ... (unchanged steps)

  e2e-smoke:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    concurrency:
      group: e2e-${{ github.ref }}
      cancel-in-progress: true
    env:
      CI: true
    steps:
      # ... (unchanged steps, no build step)
```

### Job-Level If Syntax
```yaml
# Source: GitHub Actions docs - workflow syntax
# Both formats are valid, bare form preferred for readability:
if: github.event_name == 'pull_request'
# Equivalent:
if: ${{ github.event_name == 'pull_request' }}
```

### Per-Job Concurrency
```yaml
# Source: GitHub Actions docs - concurrency
# Job-level concurrency replaces workflow-level concurrency
jobs:
  my-job:
    concurrency:
      group: my-prefix-${{ github.ref }}
      cancel-in-progress: true
```

## State of the Art

| Old Approach (Current) | New Approach (Target) | Impact |
|------------------------|----------------------|--------|
| Workflow-level concurrency | Per-job concurrency groups | Prevents cross-event cancellation |
| `needs: [checks]` on e2e-smoke | Independent jobs | e2e-smoke runs on push even when checks is skipped |
| `checks` runs on push + PR | `checks` runs on PR only | No wasted CI minutes on main push |

## Specific Changes Required

The diff is minimal. Here is the exact list of changes to `.github/workflows/ci-cd.yml`:

1. **Remove** the workflow-level `concurrency:` block (lines 22-24)
2. **Add** `if: github.event_name == 'pull_request'` to the `checks` job
3. **Add** per-job `concurrency:` block to `checks` job with `group: checks-${{ github.ref }}`
4. **Remove** `needs: [checks]` from `e2e-smoke` job (line 68)
5. **Add** per-job `concurrency:` block to `e2e-smoke` job with `group: e2e-${{ github.ref }}`
6. The `e2e-smoke` job already has the correct `if:` conditional (line 67) -- no change needed

Total: 5 edits to a single file. No new files, no new dependencies.

## Discretion Recommendations

### paths-ignore: Keep as-is
The current `paths-ignore` filters are sensible. Both jobs benefit from skipping on doc-only changes. No adjustment needed.

### Concurrency group naming: Use the user's chosen convention
The user specified `checks-${{ github.ref }}` and `e2e-${{ github.ref }}`. These are clear, distinct, and follow the standard pattern from GitHub docs. Use as specified.

### Formatting cleanup: Minimal
The existing file is clean (103 lines). No comments need updating beyond what the structural changes require.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | GitHub Actions (platform-level, no test framework) |
| Config file | `.github/workflows/ci-cd.yml` |
| Quick run command | Push a test branch, open a PR, verify `checks` runs and `e2e-smoke` does not |
| Full suite command | Merge PR to main, verify `e2e-smoke` runs and `checks` does not |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-04a | `checks` runs only on PR events | manual-only | Open PR, verify in GitHub Actions UI | N/A |
| INFRA-04b | `e2e-smoke` runs independently on push to main | manual-only | Merge PR to main, verify in GitHub Actions UI | N/A |
| INFRA-04c | `e2e-smoke` does not depend on `checks` | manual-only | Verify no `needs:` in workflow file | N/A |

**Manual-only justification:** CI workflow behavior can only be verified by triggering actual GitHub Actions runs. There is no local test framework for workflow syntax beyond YAML linting.

### Sampling Rate
- **Per task commit:** YAML lint check (optional, `actionlint` if installed)
- **Per wave merge:** Verify workflow runs in GitHub Actions UI after PR open and merge
- **Phase gate:** Observe one successful PR checks run + one successful push e2e-smoke run

### Wave 0 Gaps
None -- no test infrastructure needed. Validation is observational via GitHub Actions UI.

## Open Questions

None. The scope is fully defined by CONTEXT.md locked decisions. The existing workflow file is well-understood, and the changes are minimal.

## Sources

### Primary (HIGH confidence)
- [GitHub Actions docs - Control the concurrency of workflows and jobs](https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs) - per-job concurrency syntax, group expressions
- [GitHub Actions docs - Workflow syntax for GitHub Actions](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions) - `jobs.<job_id>.if`, `jobs.<job_id>.concurrency`, expression syntax
- [GitHub community discussion - push event on PR merge](https://github.com/orgs/community/discussions/26558) - confirms push event fires to `refs/heads/main` when PR merges

### Secondary (MEDIUM confidence)
- [GitHub community discussion - Does a pull_request merge always trigger the push event?](https://github.com/orgs/community/discussions/27017) - confirms dual-event behavior
- Direct inspection of existing `.github/workflows/ci-cd.yml` (103 lines, fully read)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new tools, only reconfiguring existing GitHub Actions workflow
- Architecture: HIGH - patterns verified against official GitHub Actions documentation
- Pitfalls: HIGH - known GitHub Actions behaviors verified via docs and community discussions

**Research date:** 2026-03-08
**Valid until:** 2026-06-08 (stable -- GitHub Actions workflow syntax changes infrequently)
