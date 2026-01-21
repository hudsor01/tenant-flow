# TenantFlow Deployment Guide

## Architecture

| Component | Platform | Deploy Method |
|-----------|----------|---------------|
| Frontend | Vercel | Auto (GitHub integration) |
| Backend | Railway | Auto (GitHub Actions on merge to main) |
| Database | Supabase | Managed |

## Deployment Flow

```
PR merged to main
       |
       v
+------+-------+
|              |
v              v
Frontend    Backend
(Vercel)   (Railway)
   |           |
   |    +------+------+
   |    |             |
   |    v             v
   |  tests.yml    deploy
   |  (unit tests)   |
   |                 v
   +-----> Railway deploy
```

## CI/CD Strategy

We use **separate workflows** for PR checks and deployment:

- **ci-cd.yml**: Runs on all PRs and pushes to main/develop
  - Lint, typecheck, tests, migrations validation
  - Acts as quality gate for all changes

- **deploy-backend.yml**: Runs only on push to main
  - Triggered by changes to: `apps/backend/**`, `packages/shared/**`, `pnpm-lock.yaml`
  - Runs backend unit tests first
  - Deploys to Railway production environment

This separation keeps concerns isolated and allows independent workflow management.

## Setup Instructions

### Railway (Backend)

1. Create Railway project at https://railway.app
2. Add a service named "backend"
3. Configure environment variables in Railway dashboard
4. Connect to your Supabase database
5. Get Railway token:
   ```bash
   railway login
   railway whoami
   # Copy the token from: Settings > Account > Tokens
   ```
6. Add `RAILWAY_TOKEN` to GitHub repository secrets:
   - Go to: Repository > Settings > Secrets and variables > Actions
   - Add new secret: `RAILWAY_TOKEN`

### Vercel (Frontend)

Frontend deploys automatically via Vercel's GitHub integration. No additional setup required after initial Vercel project connection.

### GitHub Actions

Required secrets in GitHub repository settings:

| Secret | Purpose |
|--------|---------|
| `RAILWAY_TOKEN` | Railway deployment token |
| `TURBO_TOKEN` | Turborepo remote cache (optional) |
| `TURBO_TEAM` | Turborepo team name (optional) |

### Environment Variables

See example files for required variables:

- `apps/frontend/.env.example` - Frontend variables
- `apps/backend/.env.example` - Backend variables

## Manual Deploy

If automated deployment fails or you need to deploy manually:

### Backend (Railway)

```bash
# Login to Railway (if not already logged in)
railway login

# Deploy backend service
cd apps/backend
railway up --service backend --environment production
```

### Frontend (Vercel)

Frontend auto-deploys via Vercel. Manual deploy is rarely needed:

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy to production
vercel --prod
```

## Monitoring

| Dashboard | URL |
|-----------|-----|
| Railway | https://railway.app/dashboard |
| Vercel | https://vercel.com/dashboard |
| Supabase | https://supabase.com/dashboard |

## Troubleshooting

### Railway Deploy Fails

1. Check Railway dashboard for build logs
2. Verify `RAILWAY_TOKEN` secret is set correctly
3. Ensure Railway service is named "backend"
4. Check that environment variables are configured

### Workflow Not Triggering

The deploy workflow only triggers when:
- Push is to `main` branch
- Changes are in: `apps/backend/**`, `packages/shared/**`, or `pnpm-lock.yaml`

To force a deploy, use the manual workflow dispatch:
1. Go to: Actions > Deploy Backend to Railway
2. Click "Run workflow"
3. Select `main` branch and run

### Tests Failing in Deploy

The deploy job requires tests to pass first. Check the test output in the workflow run logs to identify and fix failing tests before the deploy can proceed.
