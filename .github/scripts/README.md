# CI/CD and Deployment Scripts

This directory contains scripts for validating, testing, and deploying the TenantFlow application.

## Available Scripts

### 🔍 `test-ci-build.sh`
**Purpose**: Comprehensive local build validation before pushing to CI/CD

```bash
# Run full CI build validation
./.github/scripts/test-ci-build.sh
```

**What it does:**
- Validates Node.js and npm versions
- Cleans previous builds
- Installs dependencies with `npm ci`
- Builds all packages in correct order
- Runs TypeScript and ESLint checks
- Tests Docker build (if Docker available)
- Verifies all build outputs

**Use when:**
- Before pushing to main/develop branches
- After major dependency updates
- When troubleshooting CI failures locally

### 🔐 `validate-env.sh`
**Purpose**: Validate environment variables for different deployment targets

```bash
# Validate for specific environment
./.github/scripts/validate-env.sh vercel   # Frontend env vars
./.github/scripts/validate-env.sh railway  # Backend env vars
./.github/scripts/validate-env.sh ci       # CI/CD env vars
./.github/scripts/validate-env.sh local    # Local dev env vars
```

**What it does:**
- Checks for required environment variables
- Validates optional variables
- Shows masked values for sensitive data
- Generates `.env.example` if missing

**Use when:**
- Setting up new deployment environment
- Debugging deployment failures
- Onboarding new team members

### 🚀 `test-deployment.sh`
**Purpose**: Test deployment configurations locally

```bash
# Test all deployment targets
./.github/scripts/test-deployment.sh all

# Test specific target
./.github/scripts/test-deployment.sh vercel   # Frontend deployment
./.github/scripts/test-deployment.sh railway  # Backend deployment
./.github/scripts/test-deployment.sh env      # Environment vars
./.github/scripts/test-deployment.sh optimize # Build optimization
```

**What it does:**
- Simulates Vercel build process
- Tests Docker container build and startup
- Validates environment configurations
- Checks build optimizations

**Use when:**
- Before deploying to production
- Testing deployment configuration changes
- Validating Docker health checks

## Quick Start Guide

1. **First-time setup:**
   ```bash
   # Make scripts executable
   chmod +x .github/scripts/*.sh
   
   # Create environment files
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Before pushing code:**
   ```bash
   # Run full validation
   ./.github/scripts/test-ci-build.sh
   ```

3. **Before deployment:**
   ```bash
   # Validate environment
   ./.github/scripts/validate-env.sh vercel
   ./.github/scripts/validate-env.sh railway
   
   # Test deployment
   ./.github/scripts/test-deployment.sh all
   ```

## Environment Variables

See `.env.example` for all required environment variables.

### Critical Variables

**Frontend (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

**Backend (Railway):**
- `DATABASE_URL`
- `JWT_SECRET`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`

## Troubleshooting

### Build Failures

1. **TypeScript errors:**
   ```bash
   npm run typecheck
   ```

2. **Missing dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Docker build issues:**
   ```bash
   docker build --no-cache -t test .
   ```

### Deployment Failures

1. **Vercel:**
   - Check build command: `npm run build:shared && npx turbo run build --filter=@repo/frontend`
   - Verify environment variables in Vercel dashboard

2. **Railway:**
   - Check health endpoint: `/health/ping`
   - Verify Docker logs: `docker logs <container-id>`

## CI/CD Workflow

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

**Workflow stages:**
1. Validate - Check configurations
2. Build & Test - Multiple Node versions
3. Docker Build - Container validation
4. Security Scan - Dependency audit
5. Deploy Check - Readiness verification

## Best Practices

1. **Always use `npm ci`** for production installs
2. **Build shared packages first** in monorepo
3. **Validate environment** before deployment
4. **Test locally** before pushing
5. **Monitor build times** and optimize as needed

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review GitHub Actions logs
3. Check deployment platform logs (Vercel/Railway)
4. Open an issue with error details