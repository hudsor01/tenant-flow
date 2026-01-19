---
phase: 05-devops
plan: 04
type: summary
---

# Phase 05-04: Railway Auto-Deploy Workflow

## Status: COMPLETE

## Objective

Add automated backend deployment to Railway via GitHub Actions.

- Eliminate manual deploys
- Ensure consistent deployment process on merge to main
- Run tests before deployment

## Files Created

### `.github/workflows/deploy-backend.yml`

New workflow for Railway deployment:

```yaml
name: Deploy Backend to Railway

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'
      - 'packages/shared/**'
      - 'pnpm-lock.yaml'
  workflow_dispatch: # Manual trigger

jobs:
  test:
    uses: ./.github/workflows/tests.yml
    with:
      test-script: 'pnpm --filter @repo/backend test:unit'

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @railway/cli
      - run: railway up --service backend --environment production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Key Features:**
- Path filtering: Only triggers on backend/shared changes
- Tests first: Reuses `tests.yml` workflow before deployment
- Concurrency control: Won't cancel in-progress deploys
- Manual dispatch: Allows forced deployment when needed
- Environment protection: Uses `production` environment

### `docs/DEPLOYMENT.md`

Comprehensive deployment documentation covering:

1. **Architecture Overview**: Platform deployment topology
2. **CI/CD Strategy**: Separation of ci-cd.yml (PR checks) and deploy-backend.yml (production)
3. **Setup Instructions**: Railway, GitHub secrets, environment variables
4. **Manual Deploy**: Commands for emergency manual deployment
5. **Monitoring**: Links to all dashboards
6. **Troubleshooting**: Common issues and solutions

## CI/CD Strategy Decision

**Chosen: Separate Workflows (Option A from plan)**

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| ci-cd.yml | PR quality gates | PRs, push to main/develop |
| deploy-backend.yml | Production deployment | Push to main (backend changes) |

**Rationale:**
- Clear separation of concerns
- Independent workflow management
- Focused job responsibility
- Easier debugging and monitoring

## Verification

- [x] `.github/workflows/deploy-backend.yml` exists
- [x] `docs/DEPLOYMENT.md` exists
- [x] YAML syntax valid (verified with yaml-lint)
- [x] Documentation explains all setup steps

## Action Required

The workflow is created but **will not run** until the `RAILWAY_TOKEN` secret is configured:

1. Go to GitHub repository: Settings > Secrets and variables > Actions
2. Add new secret: `RAILWAY_TOKEN`
3. Get token from Railway: Settings > Account > Tokens

## Deployment Flow After Activation

```
Developer merges PR to main
         |
         v
+--------+--------+
|                 |
v                 v
ci-cd.yml    deploy-backend.yml (if backend changed)
     |                |
     v                v
  All checks      tests.yml
     |                |
     v                v
  Complete      Railway deploy
```

## Future Enhancements (Not in Scope)

- Slack/Discord notifications on deploy success/failure
- Automatic rollback on health check failure
- Staging environment deployment
- Database migration automation in deploy pipeline
