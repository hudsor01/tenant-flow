# 🚀 Deployment Testing Guide

This guide explains how to test your deployments locally before pushing to Vercel and Railway, preventing deployment failures and saving time.

## 📋 Quick Commands

### Fast Pre-Deployment Testing
```bash
# Quick Docker build test (30s-2min)
npm run deploy:test:docker

# Complete deployment readiness (5-10min)
npm run deploy:test

# Test only frontend (Vercel simulation)
npm run deploy:test:vercel

# Test only backend (Railway simulation)  
npm run deploy:test:railway
```

## 🔧 Available Test Scripts

### 1. `npm run deploy:test:docker` ⚡
**Fastest test - Run this before every commit**

- Tests Docker build stages (builder + production)
- Validates Dockerfile syntax and dependencies
- Catches build failures early (~1-2 minutes)
- **Use for**: Quick validation before git push

### 2. `npm run deploy:test:vercel` 🌐
**Frontend deployment simulation**

- Simulates exact Vercel build process
- Tests Next.js production build
- Validates environment variables
- Tests production server startup
- **Use for**: Frontend-specific changes

### 3. `npm run deploy:test:railway` 🚂
**Backend deployment simulation**

- Full Docker build with Railway environment
- Tests container startup and health checks
- Validates API endpoints
- Checks resource usage and logs
- **Use for**: Backend-specific changes

### 4. `npm run deploy:test` 🎯
**Complete deployment validation**

- Runs both Vercel and Railway simulations
- Global type checking and linting
- Security audits and bundle analysis
- Environment variable validation
- **Use for**: Full confidence before deployment

## 🛠️ What Each Test Catches

### Docker Build Test
- ✅ Dockerfile syntax errors
- ✅ Missing dependencies
- ✅ Build stage failures
- ✅ Production image issues

### Vercel Simulation
- ✅ Next.js build failures
- ✅ TypeScript compilation errors
- ✅ Missing environment variables
- ✅ Bundle size issues
- ✅ Server startup problems

### Railway Simulation  
- ✅ Docker container issues
- ✅ Runtime dependency problems
- ✅ API endpoint failures
- ✅ Health check issues
- ✅ Resource constraint problems

## 🚨 Common Issues Caught

### Frontend Issues
- Missing `NEXT_PUBLIC_*` environment variables
- TypeScript compilation errors
- Bundle size too large
- Image optimization failures
- API route build issues

### Backend Issues
- Missing database connection strings
- Docker build memory issues
- Missing environment variables
- Prisma client generation failures
- Port binding issues

### Integration Issues
- API endpoint mismatches
- Authentication configuration
- CORS configuration
- Database connection failures

## 📊 Test Results Interpretation

### ✅ All Tests Pass
```bash
🎉 DEPLOYMENT READY!
Both frontend and backend are ready for deployment.
```
→ Safe to deploy! Push to main branch.

### ❌ Tests Fail
```bash
❌ DEPLOYMENT NOT READY
Please fix the failed tests before deploying.
```
→ Fix issues before deploying to avoid downtime.

## 🔄 Recommended Workflow

### Daily Development
```bash
# Before every commit
npm run deploy:test:docker

# Before pushing major changes
npm run deploy:test
```

### Pre-Release
```bash
# Run comprehensive tests
npm run deploy:test

# If all pass, deploy
git push origin main
```

### Debugging Failed Deployments
```bash
# Test specific platform
npm run deploy:test:vercel  # If Vercel failed
npm run deploy:test:railway # If Railway failed

# Get detailed logs
docker logs tenantflow-test  # After railway test
```

## 🌍 Environment Variables

### Required for Vercel (Frontend)
```bash
NEXT_PUBLIC_API_URL=https://api.tenantflow.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Required for Railway (Backend)
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=your_32_char_secret
RESEND_API_KEY=your_resend_key
```

## 🐛 Troubleshooting

### Docker Build Fails
1. Check available disk space
2. Restart Docker Desktop
3. Clear Docker cache: `docker system prune -a`
4. Check memory allocation in Docker settings

### Vercel Build Fails
1. Check Node.js version compatibility
2. Verify all environment variables
3. Test build locally: `cd apps/frontend && npm run build`
4. Check bundle analyzer for large files

### Railway Build Fails
1. Check Railway memory limits
2. Verify database connection string
3. Test Docker build locally
4. Check Railway logs for OOM issues

## 💡 Pro Tips

1. **Run `deploy:test:docker` frequently** - It's fast and catches most issues
2. **Set up environment variables properly** - Most failures are env-related
3. **Use the full test suite before major releases** - Prevents production issues
4. **Keep Docker Desktop running** - Required for backend tests
5. **Monitor resource usage** - Railway has memory limits

## 📱 CI/CD Integration

These tests can be integrated into GitHub Actions:

```yaml
- name: Test Deployment Readiness
  run: npm run deploy:test
```

This ensures all deployments are tested before they reach production.