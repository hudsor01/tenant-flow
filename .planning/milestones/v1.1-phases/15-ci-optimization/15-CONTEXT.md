# Phase 15: CI Optimization - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the CI workflow so `checks` only runs on pull requests and `e2e-smoke` runs independently on push to main. Single requirement (INFRA-04). No new workflows, no new jobs -- just reconfigure existing ones.

</domain>

<decisions>
## Implementation Decisions

### Workflow file structure
- Keep single `ci-cd.yml` file with `if:` conditionals per job
- `checks` job gets `if: github.event_name == 'pull_request'`
- `e2e-smoke` job gets `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
- Remove `needs: [checks]` from `e2e-smoke` -- runs independently
- RLS security tests remain in separate `rls-security-tests.yml` (no consolidation)

### Concurrency
- Move from workflow-level concurrency to per-job concurrency groups
- `checks` job: `group: checks-${{ github.ref }}`, `cancel-in-progress: true`
- `e2e-smoke` job: `group: e2e-${{ github.ref }}`, `cancel-in-progress: true`
- Prevents PR merges from canceling in-progress e2e-smoke runs on main

### E2E build dependency
- e2e-smoke does NOT include a build step -- tests run against live deployed app
- e2e-smoke only needs: checkout, pnpm install, Playwright install, run tests
- `continue-on-error: true` stays -- e2e-smoke is informational only

### Claude's Discretion
- Whether to keep or adjust `paths-ignore` filters
- Exact concurrency group naming convention
- Any cleanup of comments or formatting in the workflow file

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/ci-cd.yml`: Single CI workflow (103 lines) with two jobs
- `.github/workflows/rls-security-tests.yml`: Separate RLS test workflow (unchanged)

### Established Patterns
- `pnpm/action-setup@v4` + `actions/setup-node@v6` for Node.js setup
- `pnpm install --frozen-lockfile --prefer-offline` for deterministic installs
- `SKIP_ENV_VALIDATION=true` for build in CI (no runtime env vars)
- `continue-on-error: true` for informational-only jobs

### Integration Points
- `checks` job: lint, typecheck, build (PR gate)
- `e2e-smoke` job: Playwright smoke + public tests against live Supabase
- Both share the same `paths-ignore` trigger filters

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- straightforward CI restructuring per INFRA-04.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 15-ci-optimization*
*Context gathered: 2026-03-08*
