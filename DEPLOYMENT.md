# Deployment Guide for TenantFlow

## Environment Setup

### Required Environment Variables

For the application to build and deploy successfully, ensure the following environment variables are set:

#### Essential Variables
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Optional Variables (for full functionality)
```bash
# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Cache/Queue (Redis)
REDIS_URL=redis://localhost:6379

# Payments
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Deployment Issues Fixed

### 1. Build Issues Resolved
- ✅ Fixed Jest configuration missing setup files
- ✅ Fixed Google Fonts network dependency causing build failures
- ✅ Fixed PostHog initialization without API key
- ✅ Created missing design token CSS files
- ✅ Fixed Supabase client creation during build

### 2. Environment Variable Handling
- ✅ Made PostHog optional when API key not provided
- ✅ Added graceful fallbacks for missing environment variables
- ✅ Created comprehensive .env.example file

### 3. Testing Infrastructure
- ✅ All `npm run claude:check` tests now pass
- ✅ Created proper Jest setup files with mocks
- ✅ Fixed TypeScript configuration issues

## Railway Deployment

The backend is configured for Railway deployment with:
- Optimized Dockerfile with multi-stage builds
- Health check endpoints at `/health` and `/ping`
- Proper error handling and fallbacks
- Memory-optimized settings

## Vercel Frontend Deployment

The frontend is configured for Vercel with:
- Next.js 15 + React 19 compatibility
- Turbopack bundler for fast builds
- Static generation for public pages
- Dynamic rendering for dashboard pages

## Quick Deployment Commands

```bash
# Lint and validate everything
npm run claude:check

# Build everything locally
npm run build

# Deploy backend to Railway
railway up

# Deploy frontend to Vercel
vercel --prod
```

## Troubleshooting

### Common Issues:
1. **PostHog API Key Error**: Set `NEXT_PUBLIC_POSTHOG_KEY` or leave empty to disable
2. **Supabase Connection**: Ensure all Supabase environment variables are correct
3. **Build Memory Issues**: Railway/Vercel have memory limits - builds are optimized
4. **Font Loading**: Removed Google Fonts dependency to avoid network issues in CI

### Build Requirements:
- Node.js 20+ (recommended 22+)
- npm 10+
- Minimum 4GB RAM for TypeScript compilation
- Internet connection for dependency installation

### Health Checks:
- Backend: `GET /health` - comprehensive health status
- Backend: `GET /ping` - simple connectivity check
- Frontend: All pages should build without errors