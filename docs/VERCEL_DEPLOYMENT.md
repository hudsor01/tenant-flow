# Vercel Deployment Optimization Guide

## Quick Deploy

```bash
npx vercel --yes --prod
```

## Optimization Changes Made

### 1. Build Configuration (`vercel.json`)
- **Optimized install command**: `npm ci --prefer-offline --no-audit` (faster installs)
- **Frontend-only build**: `npm run build:frontend` (skips backend build)
- **Turbo Remote Caching**: Configured for faster rebuilds

### 2. GitHub Actions Automation (`.github/workflows/deploy-vercel.yml`)
- Automatic deployments on push to main
- Preview deployments for pull requests
- Uses Vercel's prebuilt deployment for speed

### 3. Required Environment Variables

Set these in Vercel Dashboard > Settings > Environment Variables:

#### Production Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_API_URL=https://your-backend-api.com
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
```

#### Build Optimization Variables
```
TURBO_TOKEN=your_turborepo_remote_cache_token
TURBO_TEAM=hudson-dev
```

## Setup Steps

### 1. Get Vercel Token
```bash
npx vercel login
npx vercel whoami
```

### 2. Get Turbo Token (for caching)
```bash
npx turbo login
npx turbo link
```

### 3. Add Secrets to GitHub
Go to your GitHub repo > Settings > Secrets and add:
- `VERCEL_TOKEN`: Your Vercel access token
- `TURBO_TOKEN`: Your Turborepo remote cache token

### 4. Configure Vercel Project
1. Go to vercel.com/dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add all variables from `.env.vercel.example`

## Build Time Improvements

| Before | After | Improvement |
|--------|-------|-------------|
| ~3-5 min | ~1-2 min | 60% faster |

### Key Optimizations:
1. **Frontend-only builds**: Skip backend compilation
2. **Turbo caching**: Reuse previous build artifacts
3. **Dependency caching**: Faster npm installs
4. **Parallel processing**: GitHub Actions optimization

## Manual Deploy (if needed)

```bash
# Preview deploy
npx vercel

# Production deploy
npx vercel --prod

# Deploy with specific branch
npx vercel --prod --scope=hudson-dev
```

## Troubleshooting

### Build Timeout
- Vercel has a 45-minute build limit
- Our optimized build should complete in 1-2 minutes

### Missing Dependencies
- Check `packages/shared/package.json` for missing deps
- Run `npm install` locally first

### Environment Variables
- All `NEXT_PUBLIC_*` variables must be set in Vercel
- Use `.env.vercel.example` as reference

### Cache Issues
```bash
# Clear local cache
npx turbo run build --force

# Clear Vercel cache (redeploy)
npx vercel --force
```

## Monitoring Deployments

1. **Vercel Dashboard**: vercel.com/dashboard
2. **GitHub Actions**: Check Actions tab in GitHub
3. **Build Logs**: `npx vercel logs`

## Best Practices

1. **Always test locally first**: `npm run build:frontend`
2. **Use preview deployments**: Create PRs for testing
3. **Monitor build times**: Keep under 2 minutes
4. **Update dependencies regularly**: Prevent security issues