# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Development Status

**Branch**: `vercel-json-cleanup`
**Recent Major Changes**:
- Consolidated authentication system for production readiness
- Migrated from Hono to pure NestJS backend
- Implemented React 19 concurrent features (useActionState, useOptimistic)
- Enhanced deployment configuration for production
- Optimized Node.js deployment settings
- **✅ COMPLETED**: Major UI/UX cleanup - removed all duplicate/enhanced components
- **✅ COMPLETED**: Eliminated dual API layer - all data access now goes through backend

**Active Development Areas**:
- **✅ COMPLETED**: BaseCrudService refactoring (eliminated 680+ lines of duplicated code)
- **✅ COMPLETED**: UI/UX redundancy cleanup (removed 13 duplicate files)
- React 19 form actions and optimistic UI
- Multi-tenant connection pooling optimization
- Enhanced error handling and type safety
- Performance monitoring and observability

## Project Overview

TenantFlow is a multi-tenant SaaS property management platform built with:
- **Frontend**: React 19 + Vite + TanStack Router + TypeScript + Zustand
- **Backend**: NestJS + Fastify + Prisma + PostgreSQL (Supabase)
- **Infrastructure**: Turborepo monorepo, Custom backend hosting, Vercel (frontend)
- **Auth**: Supabase Auth with JWT + Row-Level Security (RLS)
- **Payments**: Stripe subscriptions with webhook processing

## Critical Commands

### Development
```bash
# Start everything
npm run dev

# Start specific apps
npm run dev --filter=@tenantflow/frontend
npm run dev --filter=@tenantflow/backend

# Code quality - ALWAYS RUN BEFORE COMMITTING
npm run check              # Runs lint + typecheck
npm run claude:check       # Auto-fix lint & type errors

# Build
npm run build              # Build all packages
npm run build:backend      # Build backend only
```

### Testing
```bash
# Unit tests
npm run test:unit          # Run unit tests
npm run test:unit:watch    # Watch mode
npm run test:coverage      # With coverage

# E2E tests
npm run test:e2e           # Run Playwright tests
npm run test:e2e:headed    # With browser visible
npm run test:e2e:ui        # Playwright UI
npm run test:visual        # Visual regression tests

# Test data
npm run test:seed          # Seed test database
npm run test:cleanup       # Clean test data

# Specialized test scripts
./scripts/test-payment-customer-flows.sh
./scripts/test-subscription-lifecycle.sh
./scripts/test-rls-policies.sh
./scripts/test-security-compliance.sh
```

### Database & Prisma
```bash
# Generate Prisma client (from backend dir)
cd apps/backend && npx prisma generate

# Migrations
cd apps/backend && npx prisma migrate dev

# Open Prisma Studio
npm run prisma:studio

# RLS testing
npm run rls:test           # Test RLS policies
npm run rls:audit          # Security audit
```

### Code Generation
```bash
npm run generate           # Interactive generator
npm run gen:component      # React component
npm run gen:module         # NestJS module
npm run gen:type           # Shared type
npm run gen:crud           # Full CRUD module
```

### Performance & Monitoring
```bash
npm run build:analyze      # Bundle analysis
npm run accelerate:monitor # Prisma Accelerate monitoring
npm run loaders:analyze    # Router loader performance
```

### Cache Management
```bash
npm run cache:setup        # Setup Turbo remote cache
npm run cache:test         # Test cache
npm run cache:clear        # Clear local cache
npm run cache:status       # Check cache status
```

## Architecture Patterns

### Frontend Structure
```
apps/frontend/src/
├── routes/               # TanStack Router file-based routing
│   ├── _authenticated/   # Protected routes
│   ├── _public/          # Public routes  
│   └── _tenant-portal/   # Tenant-specific routes
├── components/           # React components
│   ├── ui/               # Radix UI primitives
│   ├── modals/           # Modal components
│   └── [feature]/        # Feature-specific components
├── hooks/                # Custom React hooks
├── stores/               # Zustand stores
├── lib/                  # Utilities and configs
│   ├── api/              # API client setup
│   ├── loaders/          # TanStack Router loaders
│   └── query/            # React Query utilities
└── services/             # API service layers
```

### Backend Structure
```
apps/backend/src/
├── [feature]/            # Feature modules (DDD)
│   ├── dto/              # Data Transfer Objects
│   ├── *.controller.ts   # HTTP endpoints
│   ├── *.service.ts      # Business logic
│   ├── *.repository.ts   # Database access
│   └── *.module.ts       # Module definition
├── common/               # Shared utilities
│   ├── prisma/           # Multi-tenant Prisma service
│   ├── security/         # Security utilities
│   ├── errors/           # Error handling
│   └── middleware/       # Global middleware
├── stripe/               # Stripe integration
│   ├── webhook.service.ts
│   └── handlers/         # Event handlers
└── auth/                 # Authentication
    ├── guards/           # Auth guards
    └── decorators/       # Custom decorators
```

### Key Architectural Decisions

1. **Multi-tenancy**: Row-Level Security (RLS) in Supabase with automatic tenant context injection
2. **State Management**: Zustand for client state, React Query for server state with optimistic updates
3. **Error Handling**: Centralized error handling with custom exceptions and global filters
4. **Type Safety**: Shared types package ensures frontend/backend consistency
5. **Performance**: Prisma Accelerate for database caching, TanStack Router loaders for data preloading

## Development Workflow

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Configure Supabase credentials
3. Configure Stripe keys
4. Run `npm install` from root
5. Generate Prisma client: `cd apps/backend && npx prisma generate`
6. Start dev servers: `npm run dev`

### Pre-commit Checklist
1. Run `npm run claude:check` to fix lint/type errors
2. Test your changes locally
3. Update shared types if API changed
4. Remove console.logs and debug code
5. Check for hardcoded values

### Common Patterns

#### BaseCrudService Pattern (NEW - Recommended)
```typescript
// Service extending BaseCrudService
@Injectable()
export class PropertiesService extends BaseCrudService<
  Property,           // T - Entity type
  CreatePropertyDto,  // TCreate - Creation DTO
  UpdatePropertyDto,  // TUpdate - Update DTO
  PropertyQueryDto    // TQuery - Query parameters
> {
  constructor(
    repository: PropertyRepository,
    errorHandler: ErrorHandlerService
  ) {
    super(repository, errorHandler, new Logger(PropertiesService.name))
  }

  // Implement required abstract methods
  protected async validateCreate(data: CreatePropertyDto): Promise<void> {
    if (!data.name?.trim()) {
      throw new ValidationException('Property name is required', 'name')
    }
  }

  protected async verifyOwnership(id: string, ownerId: string): Promise<void> {
    const exists = await this.repository.exists({ id, ownerId })
    if (!exists) {
      throw new NotFoundException(`Property with ID ${id} not found`)
    }
  }

  // Inherited methods: getByOwner, getByIdOrThrow, create, update, delete, getStats
}

// Controller (unchanged - same interface)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('properties')
export class PropertiesController {
  @Get()
  @Roles(Role.PROPERTY_OWNER, Role.ADMIN)
  async findAll(@CurrentUser() user: User, @Query() query: PropertyQueryDto) {
    return this.service.getByOwner(user.organizationId, query);
  }
  
  @Post()
  async create(@Body() data: CreatePropertyDto, @CurrentUser() user: User) {
    return this.service.create(data, user.organizationId);
  }
}
```

#### Frontend Data Fetching Pattern
```typescript
// Hook with React Query
export function useProperties() {
  const { organizationId } = useAuth();
  
  return useQuery({
    queryKey: ['properties', organizationId],
    queryFn: () => api.properties.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Component usage
function PropertiesPage() {
  const { data, isLoading, error } = useProperties();
  
  if (error) return <ErrorBoundary error={error} />;
  if (isLoading) return <LoadingSpinner />;
  
  return <PropertyList properties={data} />;
}
```

#### BaseCrudService Pattern (RECOMMENDED)
```typescript
// Service extending BaseCrudService for consistent CRUD operations
@Injectable()
export class TenantsService extends BaseCrudService<
  Tenant,
  TenantCreateDto,
  TenantUpdateDto,
  TenantQueryDto,
  TenantsRepository
> {
  protected readonly entityName = 'tenant'
  protected readonly repository: TenantsRepository

  constructor(
    private readonly tenantsRepository: TenantsRepository,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler)
    this.repository = tenantsRepository
  }

  // Implement required abstract methods
  protected async findByIdAndOwner(id: string, ownerId: string): Promise<Tenant | null> {
    return await this.tenantsRepository.findByIdAndOwner(id, ownerId, true)
  }

  protected async calculateStats(ownerId: string): Promise<BaseStats> {
    return await this.tenantsRepository.getStatsByOwner(ownerId)
  }

  protected prepareCreateData(data: TenantCreateDto, _ownerId: string): unknown {
    return { ...data }
  }

  protected prepareUpdateData(data: TenantUpdateDto): unknown {
    return { ...data, updatedAt: new Date() }
  }

  protected createOwnerWhereClause(id: string, ownerId: string): unknown {
    return {
      id,
      Lease: {
        some: {
          Unit: {
            Property: { ownerId }
          }
        }
      }
    }
  }
}
```

#### Multi-tenant Query Pattern
```typescript
// Repository with automatic tenant filtering
@Injectable()
export class PropertyRepository extends BaseRepository<Property> {
  async findMany(where: Prisma.PropertyWhereInput) {
    // BaseRepository automatically adds organizationId filter
    return super.findMany(where);
  }
}
```

## BaseCrudService Migration (COMPLETED)

### Final Status
- ✅ **Infrastructure**: Complete BaseCrudService implementation (487 lines)
- ✅ **Tenants Service**: Successfully migrated with all features
- ✅ **Units Service**: Successfully migrated with all features  
- ✅ **Properties Service**: Successfully migrated and type errors resolved
- ✅ **Leases Service**: Successfully migrated
- ✅ **Maintenance Service**: Successfully migrated

### Migration Benefits Achieved
- **Code Reduction**: Eliminated 680+ lines of duplicated CRUD code
- **Type Safety**: Unified interface contracts across all services
- **Consistency**: Standardized error handling and ownership validation
- **Maintainability**: Single source of truth for CRUD operations

### Implementation Examples
- `/src/tenants/tenants.service.ts` - Complete working implementation
- `/src/units/units.service.ts` - Complete working implementation
- `/src/properties/properties.service.ts` - Complete working implementation
- `/src/leases/leases.service.ts` - Complete working implementation
- `/src/common/services/README.md` - Implementation guide

## Security Considerations

1. **Authentication**: All endpoints protected by default, use `@Public()` for exceptions
2. **Multi-tenancy**: RLS policies enforce data isolation at database level  
3. **BaseCrudService Security**: Built-in ownership validation prevents data leakage
4. **Input Validation**: DTOs with class-validator on all endpoints
5. **Rate Limiting**: Configured per endpoint with Throttler
6. **CORS**: Strict origin validation in production

## Performance Optimizations

1. **Database**: Indexes on foreign keys and commonly queried fields
2. **Caching**: Prisma Accelerate for read-heavy queries
3. **Frontend**: Code splitting, lazy loading, React Query cache
4. **Build**: Turborepo caching for faster builds

## Troubleshooting

### Common Issues
- **Prisma Client Error**: Run `cd apps/backend && npx prisma generate`
- **Type Errors**: Build shared package first: `npm run build --filter=@tenantflow/shared`
- **Auth Issues**: Check Supabase service role key and JWT secret
- **RLS Errors**: Run `npm run rls:test` to validate policies
- **Webhook Failures**: Verify Stripe webhook secret and endpoint URL
- **Zod + React Hook Form Types**: See "Zod v4 Compatibility" section below

### Debug Tools
```bash
turbo run build --graph    # Visualize task dependencies
turbo run build --dry-run  # Check what would be cached
npm run claude:review      # Review git changes
npm run claude:security    # Security audit changes
```

### Zod v4 Compatibility (IMPORTANT - DO NOT CHANGE)

The project uses Zod v4 with @hookform/resolvers v5.x, which has a known type incompatibility issue. **The use of `as any` in the zod-resolver-helper.ts file is REQUIRED and INTENTIONAL.**

#### The Issue
- @hookform/resolvers expects Zod v3 types but receives Zod v4 types
- This causes TypeScript errors about 'unknown' not being assignable to 'FieldValues'
- The project has both Zod v3 (from @tanstack/router deps) and v4 installed

#### The Solution
A helper function at `/apps/frontend/src/lib/zod-resolver-helper.ts` centralizes the type casting:

```typescript
export function zodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>
): Resolver<TFieldValues> {
  // Cast schema to any to handle the type mismatch between
  // @hookform/resolvers and zod v4 - this is a known issue
  return originalZodResolver(schema as any) as Resolver<TFieldValues>
}
```

#### Usage Pattern
```typescript
// ✅ CORRECT - Import from helper
import { zodResolver } from '@/lib/zod-resolver-helper'

const form = useForm({
  resolver: zodResolver(schema), // No 'as any' needed here
})

// ❌ INCORRECT - Don't import directly
import { zodResolver } from '@hookform/resolvers/zod'
```

**CRITICAL**: Do NOT remove the `as any` from zod-resolver-helper.ts. This is the accepted workaround for a known ecosystem issue until @hookform/resolvers fully supports Zod v4 types.

## Deployment

### Frontend (Vercel)
- Automatic deployment on push to main
- Environment variables set in Vercel dashboard
- All VITE_* variables required

### Backend (Production)
- Deployment via GitHub Actions
- Database migrations run automatically
- Health checks at `/health` and `/api/health`

## Testing Strategy

1. **Unit Tests**: Business logic isolation with Vitest
2. **Integration Tests**: API endpoint testing with Supertest
3. **E2E Tests**: Critical user journeys with Playwright
4. **Visual Tests**: UI regression with Playwright screenshots
5. **Performance Tests**: Load testing with k6

## React 19 Features

### Concurrent Features
The codebase leverages React 19's concurrent features:
- **useTransition**: For non-blocking UI updates
- **useOptimistic**: Optimistic UI updates in forms
- **useActionState**: Form actions with built-in state management
- **startTransition**: Prioritize urgent vs non-urgent updates

### Form Actions Pattern
```typescript
// React 19 Server Action pattern (client-side implementation)
async function createPropertyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const data = Object.fromEntries(formData)
  const response = await api.properties.create(data)
  return { success: true, data: response.data }
}

// Usage with useActionState
const [state, action] = useActionState(createPropertyAction, initialState)
```

## Multi-Tenant Architecture Details

### Prisma Client Pool Management
- **Connection Pooling**: Separate Prisma clients per tenant with RLS
- **Pool Size**: Maximum 10 concurrent tenant connections
- **TTL**: Clients auto-disconnect after 5 minutes of inactivity
- **Admin Client**: Dedicated BYPASSRLS connection for admin operations

### RLS Implementation
```sql
-- Example RLS policy
CREATE POLICY "tenant_isolation" ON properties
  FOR ALL USING (organization_id = current_setting('app.organization_id')::uuid);
```

### Request Context Propagation
1. JWT validation extracts user/organization
2. Context injected into AsyncLocalStorage
3. Prisma middleware adds tenant filters
4. RLS enforces at database level

## State Management Architecture

### Zustand Stores
- **app-store**: UI state, modals, navigation
- **auth-store**: User session, permissions
- **property-store**: Property data, filters
- **workflow-store**: Multi-step form workflows
- **global-store**: Notifications, feature flags

### Store Patterns
```typescript
// Zustand with persistence and devtools
export const usePropertyStore = create<PropertyStore>()(
  devtools(
    persist(
      (set, get) => ({ ... }),
      { name: 'property-store' }
    )
  )
)
```

## API Layer Architecture

### Axios Client Configuration
- **Base URL**: Environment-specific
- **Interceptors**: Auth token injection, error handling
- **Retry Logic**: Exponential backoff for failed requests
- **Type Safety**: Generated from OpenAPI spec

### Error Handling Pattern
```typescript
// Centralized error handling
export class ErrorHandlerService {
  handleError(error: unknown): AppError {
    if (error instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(error)
    }
    // ... other error types
  }
}
```

## Stripe Integration

### Subscription Management
- **Products**: Defined in Stripe dashboard
- **Webhooks**: Handled via dedicated webhook service
- **Customer Portal**: Self-service subscription management
- **Usage-Based Billing**: Track property/tenant counts

### Webhook Processing
```typescript
@Post('webhook')
async handleWebhook(@Body() body: Buffer, @Headers('stripe-signature') sig: string) {
  const event = this.stripe.webhooks.constructEvent(body, sig, webhookSecret)
  await this.webhookService.processEvent(event)
}
```

## Performance Patterns

### Query Optimization
- **Prisma Includes**: Minimize N+1 queries
- **Accelerate**: Edge caching for read queries
- **Pagination**: Cursor-based for large datasets
- **Indexes**: Composite indexes on common filters

### Frontend Performance
- **Route Preloading**: TanStack Router loaders
- **React Query**: 5-minute stale time, background refetch
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Next-gen formats, lazy loading

## Security Implementation

### Defense in Depth
1. **Network**: Cloudflare WAF, DDoS protection
2. **Application**: Rate limiting, CORS, CSP headers
3. **Authentication**: Supabase Auth, JWT validation
4. **Authorization**: Role-based guards, permission checks
5. **Database**: RLS policies, encrypted at rest

### Security Headers
```typescript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      // ... other directives
    }
  }
}))
```

## Monitoring & Observability

### Logging Strategy
- **Winston**: Structured logging with levels
- **Correlation IDs**: Request tracing
- **Error Tracking**: Sentry integration
- **Performance**: OpenTelemetry metrics

### Health Checks
```typescript
@Get('health')
health() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: this.checkDatabase(),
      redis: this.checkRedis(),
      stripe: this.checkStripe()
    }
  }
}
```

## UI/UX Architecture Cleanup (December 2024)

### Overview
Major cleanup completed to eliminate all UI/UX redundancy and establish single-responsibility component architecture aligned with React 19 patterns.

### Files Removed
**Enhanced/Duplicate Components (5 files)**:
- `/components/ui/enhanced-button.tsx` - Redundant button with extra features
- `/components/ui/enhanced-card.tsx` - Duplicate card component
- `/components/ui/enhanced-badge.tsx` - Unnecessary badge variant
- `/components/ui/variants.ts` - Shared variant system (only used by enhanced files)
- `/lib/context/enhanced-router-context.ts` - Router context enhancement

**Direct Database Access Hooks (8 files)**:
- `/hooks/useSupabaseProperties.ts` - Direct Supabase queries
- `/hooks/useSupabaseTenants.ts` - Bypassed backend API
- `/hooks/useSupabaseUnits.ts` - Direct DB access
- `/hooks/useSupabaseLeases.ts` - Skipped business logic layer
- `/hooks/useSupabaseMaintenance.ts` - Direct queries
- `/hooks/useSupabaseForm.ts` - Form helpers for direct DB
- `/hooks/use-infinite-query.ts` - Infrastructure for direct access
- `/hooks/useLeaseStore.ts` - Unused store import

### Architecture Improvements
1. **Single API Layer**: All data access now goes through backend API
2. **No Direct DB Access**: Frontend never queries Supabase directly
3. **Consistent Component Library**: One component per responsibility
4. **Type Safety**: Using shared types from `@tenantflow/shared`
5. **Proper Separation**: Business logic stays in backend

### Migration Pattern
```typescript
// ❌ OLD - Direct Supabase access
import { useSupabaseProperties } from '@/hooks/useSupabaseProperties'
const { data } = useSupabaseProperties()

// ✅ NEW - Proper API access
import { useProperties } from '@/hooks/useProperties'
const { data } = useProperties()
```

### Important Notes
- Supabase Auth UI components (prefixed/suffixed with 'supabase') are preserved
- All data operations must go through the backend API
- No duplicate or "enhanced" versions of components
- Follow React 19 patterns for forms and state management

## Additional Resources

- Turbo docs: https://turbo.build/repo/docs
- TanStack Router: https://tanstack.com/router/latest
- Prisma RLS: https://www.prisma.io/docs/guides/database/supabase#row-level-security
- Stripe webhooks: https://stripe.com/docs/webhooks
- React 19 Docs: https://react.dev/blog/2024/12/05/react-19