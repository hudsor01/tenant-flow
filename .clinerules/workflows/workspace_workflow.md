# TenantFlow Workspace Workflow

## Project-Specific Development Workflow

This workflow is tailored specifically for the TenantFlow monorepo and its current development priorities.

## Current Project Status

### 🔥 Critical Issues (Fix First)
1. **10 failing frontend test suites** - Blocking development
2. **Supabase migration incomplete** - Remove remaining Prisma dependencies
3. **Low backend test coverage** - Need 80%+ coverage

### 🚀 Active Features
1. **Tenant payment flow implementation** (#90)
2. **Notification automation system** (#92)
3. **Dashboard modernization** (React 19 migration)

## Development Environment Setup

### Required Node Environment
```bash
node --version  # Must be 22+
npm --version   # Must be 10+
```

### Essential Commands
```bash
# Development (ALWAYS use for React 19)
npm run dev

# Pre-commit validation (REQUIRED)
npm run claude:check

# Health checks
curl https://api.tenantflow.app/health
```

## Workspace-Specific Workflows

### 1. Frontend Development (React 19 + Next.js 15)

#### Starting Frontend Work
```bash
cd apps/frontend
npm run dev  # Uses Turbopack automatically
```

#### Frontend File Structure Navigation
```
src/
├─ app/              # Next.js 15 App Router
│  ├─ (dashboard)/   # Dashboard routes
│  └─ (public)/      # Public routes
├─ components/       # Reusable UI components
├─ hooks/           # Custom React hooks
├─ lib/             # Utilities and configs
├─ providers/       # Context providers
├─ stores/          # Zustand/Jotai state
└─ types/           # Frontend-specific types
```

#### Frontend Development Rules
- **Server Components First**: Default to server components
- **Turbopack Required**: React 19 breaks with webpack
- **State Management**: Zustand for global, Jotai for component state
- **UI Components**: Use Radix UI + Tailwind CSS
- **Type Safety**: Import types from `@repo/shared`

### 2. Backend Development (NestJS 11 + Fastify)

#### Starting Backend Work
```bash
cd apps/backend
npm run dev
```

#### Backend File Structure Navigation
```
src/
├─ auth/            # Authentication & authorization
├─ billing/         # Stripe integration
├─ config/          # App configuration
├─ database/        # Supabase services
├─ properties/      # Property management
├─ tenants/         # Tenant management
├─ shared/          # Guards, decorators, utils
└─ users/           # User management
```

#### Backend Development Rules
- **BaseCrudService**: All CRUD extends this pattern
- **Multi-tenant RLS**: Auto-filter by org_id
- **Fastify Adapter**: High-performance HTTP
- **Supabase Only**: No direct SQL, use repositories
- **Error Handling**: Comprehensive try-catch with typed errors

### 3. Shared Package Development

#### Shared Types (`packages/shared`)
```bash
cd packages/shared
npm run build  # Required for other packages
```

#### When to Update Shared
- Adding new entity types
- Creating cross-app utilities
- Defining validation schemas
- Adding constants or configurations

### 4. Database Development (Supabase)

#### Type Generation
```bash
npm run update-supabase-types
```

#### RLS Policy Pattern
```sql
-- Required for all tables
CREATE POLICY "org_access_policy" ON table_name
FOR ALL USING (org_id = auth.jwt() ->> 'org_id');
```

#### Migration Workflow
1. Create migration in Supabase dashboard
2. Export SQL to `supabase/migrations/`
3. Update types: `npm run update-supabase-types`
4. Update TypeScript interfaces in `packages/shared`

## Feature Development Workflow

### 1. New Feature Development
```bash
# 1. Start from main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Work on feature following patterns
# - Backend: Create service, controller, module
# - Frontend: Create components, hooks, pages
# - Shared: Add types, validation, utils

# 4. Test throughout development
npm run claude:check  # After each significant change

# 5. Final validation before commit
npm run claude:check
npm run test:e2e     # For critical flows
```

### 2. Bug Fix Workflow
```bash
# 1. Reproduce the bug
npm run dev
# Navigate to affected area

# 2. Identify root cause
# - Check console errors
# - Review logs at api.tenantflow.app/health
# - Use browser dev tools

# 3. Fix with minimal changes
# - Follow existing patterns
# - Update tests if needed

# 4. Validate fix
npm run claude:check
npm run test:unit
```

### 3. Test Fix Workflow (Priority)
```bash
# 1. Identify failing tests
npm run test:unit

# 2. Fix tests one by one
# - Update to React 19 patterns
# - Fix import paths
# - Update mock data

# 3. Run specific test file
npm run test:unit -- path/to/test.spec.ts

# 4. Verify all tests pass
npm run test:unit
```

## Code Review Workflow

### Before Requesting Review
```bash
# 1. Self-review checklist
npm run claude:check    # Must pass
npm run build          # Must succeed
npm run test:e2e       # For critical features

# 2. Code quality check
# - No hardcoded secrets
# - Proper TypeScript types
# - Multi-tenant security (org_id filtering)
# - Error handling implemented

# 3. Documentation updated
# - Update types if schema changed
# - Add comments for complex logic only
```

### Review Checklist for Others
- [ ] Follows existing patterns
- [ ] Uses shared types from `@repo/shared`
- [ ] Implements proper RLS filtering
- [ ] Includes adequate tests
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

## Deployment Workflow

### Pre-deployment Validation
```bash
# 1. Full test suite
npm run ci:full

# 2. Build verification
npm run build

# 3. Deployment simulation
npm run deploy:test
```

### Production Deployment
1. **Frontend** (Vercel): Auto-deploys from `main` branch
2. **Backend** (Railway): Auto-deploys from `main` branch
3. **Database** (Supabase): Managed service, migrations applied manually

### Post-deployment Verification
```bash
# Health checks
curl https://api.tenantflow.app/health
curl https://tenantflow.app/api/health

# Monitor logs
railway logs --service backend
```

## Troubleshooting Common Issues

### React 19 + Turbopack Issues
```bash
# If dev server fails to start
rm -rf .next node_modules
npm install
npm run dev
```

### TypeScript Errors
```bash
# Rebuild shared packages
cd packages/shared && npm run build
cd packages/database && npm run build

# Run typecheck
npm run typecheck
```

### Test Failures
```bash
# Clear test cache
npm run test -- --clearCache

# Run tests in watch mode
npm run test:unit -- --watch
```

### Memory Issues (Backend)
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

## Integration-Specific Workflows

### Supabase Integration
1. **Schema Changes**: Always update types after DB changes
2. **RLS Policies**: Test with different org_id values
3. **Real-time**: Use subscriptions for live data updates

### Stripe Integration
1. **Webhooks**: Test with Stripe CLI for local development
2. **Error Handling**: Implement retry logic for failed payments
3. **Subscription Management**: Handle all lifecycle events

### Vercel Deployment
1. **Edge Functions**: Use for auth middleware
2. **Image Optimization**: Always use Next.js Image component
3. **Build Optimization**: Monitor build times and bundle sizes

### Railway Deployment
1. **Health Checks**: Implement `/health` endpoint
2. **Environment Variables**: Use Railway's variable management
3. **Scaling**: Monitor resource usage and auto-scaling

## Performance Monitoring

### Frontend Performance
- Core Web Vitals monitoring via PostHog
- Bundle size analysis with `npm run analyze`
- Lighthouse CI in GitHub Actions

### Backend Performance
- Response time monitoring
- Database query optimization
- Memory usage tracking

### Database Performance
- Query performance monitoring in Supabase
- Connection pool optimization
- Index usage analysis

---

*This workspace workflow is specifically designed for TenantFlow's current architecture and development priorities. Always check the latest status in CLAUDE.md for any updates.*