# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenantFlow is a SaaS property management platform built as a Turborepo monorepo with:
- **Frontend**: React 19 + Vite + TanStack Router + TypeScript
- **Backend**: NestJS + Fastify + Prisma + PostgreSQL (Supabase)
- **Shared**: Common types, validation schemas, and utilities
- **Auth**: Supabase Auth with JWT
- **Payments**: Stripe integration for subscriptions

## Common Development Commands

### Running the Application
```bash
# Start all services (frontend + backend)
npm run dev

# Start individual services
npm run dev --filter=@tenantflow/frontend  # Frontend only
npm run dev --filter=@tenantflow/backend   # Backend only

# Build commands
npm run build               # Build all packages
npm run build:backend       # Build backend only
```

### Code Quality Commands
```bash
# Run all checks (lint + typecheck) - ALWAYS RUN BEFORE COMMITTING
npm run check

# Individual checks
npm run lint             # Lint all packages
npm run lint:fix         # Fix linting issues
npm run typecheck        # Type check all packages
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without fixing

# Claude-specific helpers for fixing issues
npm run claude:check     # Fix all lint & type errors
npm run claude:lint      # Fix linting issues
npm run claude:typecheck # Fix TypeScript errors
npm run claude:review    # Review git changes
npm run claude:security  # Security audit of changes
npm run claude:pr        # Review PR changes
```

### Testing Commands
```bash
# Unit tests (Vitest)
npm run test:unit        # Run unit tests
npm run test:unit:watch  # Watch mode

# E2E tests (Playwright)
npm run test:e2e         # Run Playwright tests
npm run test:e2e:headed  # Run with browser visible
npm run test:e2e:ui      # Open Playwright UI

# All tests
npm run test:all         # Run all tests

# Test utilities
npm run test:setup       # Setup test environment
npm run test:seed        # Seed test data
npm run test:cleanup     # Cleanup test data

# Specialized test scripts
./scripts/test-payment-customer-flows.sh    # Test payment flows
./scripts/test-subscription-lifecycle.sh    # Test subscriptions
./scripts/test-error-handling.sh           # Test error handling
./scripts/test-security-compliance.sh      # Security tests
./scripts/test-webhooks.sh                 # Webhook tests
```

### Database Commands
```bash
# Prisma operations (run from apps/backend)
cd apps/backend
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open Prisma Studio GUI
npx prisma db push       # Push schema without migrations

# From root
npm run prisma:studio    # Open Prisma Studio
npm run generate         # Run Prisma generate for backend

# Supabase migrations
cd apps/backend
npx supabase migration up
```

### Code Generation
```bash
npm run generate         # Interactive generator menu
npm run gen:component    # Generate React component
npm run gen:module       # Generate NestJS module
npm run gen:type         # Generate shared type
```

## Architecture Overview

### Monorepo Structure
```
├── apps/
│   ├── backend/         # NestJS API server
│   └── frontend/        # React 19 SPA
├── packages/
│   ├── shared/          # Shared types & utilities
│   └── tailwind-config/ # Shared Tailwind config
├── turbo/generators/    # Code generation templates
└── scripts/             # Deployment & utility scripts
```

### Frontend Architecture
- **Routing**: TanStack Router with file-based routing
  - Public routes: `apps/frontend/src/routes/_public.tsx`
  - Authenticated: `apps/frontend/src/routes/_authenticated.tsx`
  - Tenant portal: `apps/frontend/src/routes/_tenant-portal.tsx`
- **State Management**: 
  - Zustand for global state (`apps/frontend/src/stores/app-store.ts`)
  - TanStack Query for server state with optimistic updates
- **Components**: 
  - UI primitives: Radix UI + Tailwind in `components/ui/`
  - Feature components organized by domain
  - Modals in `components/modals/`
- **API Integration**: 
  - Axios client with auth interceptors
  - Type-safe API calls using shared types
  - Error boundary for graceful error handling

### Backend Architecture
- **Module Structure**: Domain-driven design
  - Core modules: `auth`, `properties`, `tenants`, `units`, `leases`, `maintenance`
  - Support modules: `stripe`, `subscriptions`, `users`
  - Common modules: `errors`, `security`, `prisma`
- **Request Pipeline**:
  1. Content-Type middleware validation
  2. Rate limiting (Throttler)
  3. JWT authentication (JwtAuthGuard)
  4. Role-based access (RolesGuard)
  5. Request validation (DTOs)
  6. Business logic (Services)
  7. Database operations (Prisma)
  8. Response transformation
- **Multi-tenancy**: 
  - Row-level security (RLS) in Supabase
  - Tenant context injection via middleware
  - Automatic tenant filtering in queries

### Database Schema (Key Models)
- **User**: Auth users with roles and organization links
- **Organization**: Multi-tenant organizations
- **Property**: Properties owned by organizations
- **Unit**: Units within properties
- **Tenant**: Tenant profiles
- **Lease**: Lease agreements linking tenants to units
- **MaintenanceRequest**: Maintenance tickets
- **Subscription**: Stripe subscription data
- **WebhookEvent**: Stripe webhook processing

### API Patterns

#### Endpoint Structure
```typescript
// Standard REST endpoints
GET    /api/properties          // List with pagination
GET    /api/properties/:id      // Get single
POST   /api/properties          // Create
PATCH  /api/properties/:id      // Update
DELETE /api/properties/:id      // Delete

// Nested resources
GET    /api/properties/:id/units
POST   /api/properties/:id/units
```

#### Error Handling
```typescript
// Standardized error response
{
  error: {
    message: string,
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | etc,
    statusCode: number,
    details?: any
  }
}
```

#### Authentication Flow
1. User signs in via Supabase Auth
2. Frontend receives session token
3. Token sent in Authorization header
4. Backend validates with Supabase
5. User context available via `@CurrentUser()` decorator

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `refactor/*`: Major refactoring work
- `feature/*`: New features
- `fix/*`: Bug fixes

### Pre-commit Checklist
1. Run `npm run check` (lint + typecheck)
2. Run relevant tests
3. Update types if API changes
4. Check for console.logs and debugging code
5. Verify no hardcoded values

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Configure Supabase credentials
3. Configure Stripe keys
4. Set up database URLs
5. Run `npm install` from root
6. Run `cd apps/backend && npx prisma generate`
7. Run `npm run dev`

## Stripe Integration Architecture

### Services Structure
```
apps/backend/src/stripe/
├── stripe.service.ts                   # Main service
├── stripe-billing.service.ts           # Billing operations
├── stripe-subscription-lifecycle.ts    # Subscription management
├── webhook.service.ts                  # Webhook processing
├── webhook-enhanced.service.ts         # Enhanced webhook handling
├── webhook-dead-letter.service.ts      # Failed webhook handling
├── handlers/                           # Event-specific handlers
└── testing/                            # Test utilities
```

### Webhook Processing Flow
1. Stripe sends webhook to `/api/stripe/webhook`
2. Signature validation
3. Event dedupe check
4. Handler routing based on event type
5. Database updates in transaction
6. Dead letter queue for failures

## Security Considerations

### Authentication & Authorization
- All endpoints protected by default
- Use `@Public()` decorator for public endpoints
- Role-based access with `@Roles()` decorator
- Multi-tenant isolation via RLS

### Input Validation
- DTOs with class-validator for all inputs
- Query parameter validation middleware
- File upload restrictions
- Rate limiting on all endpoints

### Environment Variables
- Strict mode in Turborepo
- No secrets in code
- Use `.env.local` for local development
- Production secrets in deployment platform

## Performance Optimizations

### Frontend
- Code splitting with React.lazy
- Route-based chunking
- Image optimization with lazy loading
- React Query caching strategies
- Optimistic updates for better UX

### Backend
- Database query optimization with indexes
- Prisma query batching
- Response caching where appropriate
- Connection pooling via Supabase

### Build & Deploy
- Turborepo caching for faster builds
- Parallel task execution
- Docker layer caching
- Vercel/Railway deployment optimizations

## Troubleshooting

### Common Issues
1. **Prisma Client Generation**: Run `cd apps/backend && npx prisma generate`
2. **Type Errors**: Ensure `npm run build` in packages/shared first
3. **Auth Issues**: Check Supabase service role key
4. **CORS Errors**: Verify CORS_ORIGINS env var
5. **Webhook Failures**: Check Stripe webhook secret

### Debug Commands
```bash
# Check Turborepo task graph
turbo run build --graph

# Run without cache
turbo run build --force

# Inspect cache status
turbo run build --dry-run

# Clean all build artifacts
npm run clean
```

## Testing Guidelines

### Unit Tests (Vitest)
- Located in `*.test.ts` files
- Mock external dependencies
- Test business logic isolation
- Run with `npm run test:unit`

### E2E Tests (Playwright)
- Located in `tests/e2e/`
- Test full user flows
- Use test utilities for setup
- Run with `npm run test:e2e`

### Test Data Management
- Seed scripts in `tests/`
- Isolated test database
- Cleanup after test runs
- Consistent test user accounts