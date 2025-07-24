# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SUPERMEMORY INTEGRATION - USE THIS FIRST!

**CRITICAL**: Before asking questions or requesting clarification about this project, ALWAYS:
1. Search Supermemory using `mcp__memory__search_nodes` with relevant keywords (e.g., "TenantFlow", "architecture", "commands")
2. Check for existing project knowledge, configurations, and past decisions
3. Only ask for clarification if the information is not in Supermemory

**Automatic Memory Management**:
- Store new learnings about the project using `mcp__memory__create_entities` 
- Update existing memories with `mcp__memory__add_observations` when details change
- Link related concepts with `mcp__memory__create_relations`

This ensures continuous context without requiring repeated explanations of project structure, commands, or decisions.

---

TenantFlow property management system - Turbo monorepo with React 19 + NestJS + TypeScript.

## Architecture
- **Frontend**: React 19 + TanStack Router + shadcn/ui + Tailwind v4
- **Backend**: NestJS + Prisma ORM + TRPC + PostgreSQL (Supabase-hosted)
- **Auth**: JWT + Google OAuth via Supabase
- **Deployment**: Vercel (Frontend), Serverless (Backend)
- **Node**: 22.x+ required
- **Database**: PostgreSQL with Prisma ORM
- **Payment**: Stripe integration
- **Email**: Resend for transactional emails

## Quick Start
```bash
npm install       # Install all dependencies
npm run dev       # Start both frontend + backend
npm run build     # Build entire monorepo
npm run typecheck # Type check all workspaces
npm run test:all  # Run all tests (unit + e2e)
```

## Essential Commands
```bash
# Development (Turbo optimized)
npm run dev                         # Start all services in parallel
cd apps/frontend && npm run dev     # Frontend only (port 5173)
cd apps/backend && npm run dev      # Backend only (port 3002)

# Database Operations
cd apps/backend && npm run generate # Generate Prisma client (required after schema changes)
cd apps/backend && npm run prisma:studio # Open Prisma Studio GUI
npx prisma migrate dev              # Create and apply migration

# Testing (Multi-layered)
npm run test:unit                   # Unit tests (Vitest)
npm run test:e2e                    # E2E tests (Playwright)
npm run test:e2e:headed             # E2E with browser UI
npm run test:e2e:ui                 # Playwright test UI
npm run test:setup                  # Setup test environment
npm run test:seed                   # Seed test database
npm run test:cleanup                # Cleanup test data

# Code Generation (Turbo Generators)
npm run generate                    # Interactive generator menu
npm run gen:component               # Generate React component with hooks
npm run gen:module                  # Generate NestJS module (controller + service + TRPC)
npm run gen:type                    # Generate shared TypeScript types

# Quality Assurance (CI Pipeline)
npm run check                       # Run lint + typecheck
npm run lint && npm run typecheck   # Must pass before commits
npm run format                      # Format all code with Prettier

# Claude-specific Commands
npm run claude:typecheck            # Pipe TypeScript errors to Claude
npm run claude:lint                 # Pipe linting errors to Claude
npm run claude:check                # Pipe all errors to Claude with type rules
npm run claude:review               # Code review for git changes
npm run claude:security             # Security audit for changes
npm run claude:pr                   # Review pull request changes
```

## Monorepo Structure
```
tenant-flow/
├── apps/
│   ├── frontend/           # React 19 + TanStack Router
│   └── backend/            # NestJS + TRPC API
├── packages/
│   ├── shared/             # Shared types, constants, utils
│   ├── types/              # Legacy shared TypeScript definitions
│   └── typescript-config/  # Shared TS configurations
├── turbo/generators/       # Code generation templates
├── scripts/                # Build and utility scripts
└── tests/                  # E2E test suite (Playwright)
```

## TRPC Architecture Pattern
The backend uses a modular TRPC setup with dependency injection:

```typescript
// Backend: Factory functions for routers
export const createPropertiesRouter = (
  propertiesService: PropertiesService,
  storageService: StorageService
) => router({
  list: protectedProcedure.query(({ ctx }) => 
    propertiesService.findAllByOwner(ctx.user.id)
  ),
  create: protectedProcedure
    .input(createPropertySchema)
    .mutation(({ input, ctx }) => 
      propertiesService.create(input, ctx.user.id))
})

// Centralized router creation with dependency injection
export const createAppRouter = (services: AppServices) => 
  router({
    auth: createAuthRouter(services.authService),
    properties: createPropertiesRouter(
      services.propertiesService,
      services.storageService
    ),
    // ... other routers
  })

// Frontend: React Query integration
const { data: properties } = trpc.properties.list.useQuery()
const createProperty = trpc.properties.create.useMutation()
```

## Database Schema Architecture
- **Multi-tenant**: Properties owned by Users, contain Units, house Tenants
- **Billing**: Stripe subscriptions with usage tracking
- **Activity**: Comprehensive audit logging
- **Maintenance**: Request workflow with status tracking
- **Relations**: Proper foreign keys with cascade rules

## Component Organization
```
src/components/
├── modals/           # All modal dialogs (BaseFormModal pattern)
├── layout/           # Navigation, sidebars, layout shells
├── billing/          # Stripe integration components
├── properties/       # Property management features
├── tenant-management/ # Tenant-related functionality
└── ui/              # shadcn/ui components
```

## Code Standards
- **Naming**: camelCase (functions/vars), PascalCase (components/types)
- **Components**: Max 150 lines, decompose if larger
- **Imports**: Direct imports only (no barrel files)
- **Equality**: Always use `===` and `!==`
- **Tabs**: 4-space width for indentation
- **Never use the `any`, `never`, or `unknown` types** - All types must be traceable to actual types in the codebase
- **TRPC**: Use service injection pattern in routers
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query for server state, React state for UI

## Environment Configuration
```bash
# Frontend (.env.local)
VITE_BACKEND_URL=http://localhost:3002
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=

# Backend (.env)
DATABASE_URL=postgresql://...
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
```

## Testing Strategy
- **Unit**: Vitest for utilities and hooks
- **Component**: React Testing Library
- **E2E**: Playwright with test user management
- **API**: TRPC procedure testing via supertest

## Key Development Patterns
1. **Feature Modules**: Each domain (properties, tenants, etc.) has its own module
2. **TRPC Procedures**: Use `protectedProcedure` for authenticated endpoints
3. **Form Handling**: React Hook Form + Zod schemas + TRPC mutations
4. **File Uploads**: Multipart handling with Fastify + direct cloud storage
5. **Error Handling**: Consistent error responses across TRPC + frontend
6. **Type Safety**: Shared types package ensures frontend/backend sync
7. **TRPC Type Generation**: Run `scripts/generate-trpc-types.ts` for router types

## Turbo Pipeline Configuration
- **Strict Environment Mode**: All env vars must be declared in turbo.json
- **Optimized Caching**: Using wildcards for environment variable groups
- **Task Dependencies**: `generate` task runs before `build` for Prisma
- **Persistent Tasks**: Dev servers configured with `persistent: true`
- **Cloud Provider Support**: Pass-through env vars for AWS/Vercel deployment

## Service Layer Pattern
All backend services follow the pattern in `src/common/patterns/service.pattern.ts`:

```typescript
@Injectable()
export class EntityService {
  constructor(
    private prisma: PrismaService,
    private errorHandler: ErrorHandlerService,
    private logger: Logger
  ) {}

  async create(dto: CreateDto, userId: string) {
    return this.errorHandler.handleAsync(async () => {
      // 1. Input validation
      // 2. Permission checks
      // 3. Business rules
      // 4. Database operation
      // 5. Success logging
      return result;
    }, {
      operation: 'EntityService.create',
      context: { userId }
    });
  }
}
```

## Error Handling Architecture
Centralized error handling with `ErrorHandlerService`:
- **Validation Errors**: Field-level details with Zod integration
- **Not Found**: Resource-specific error messages
- **Permission Denied**: Operation context included
- **Business Errors**: Custom error codes and metadata
- **Automatic Logging**: All errors logged with context

## Frontend Hook Patterns
Three-layer hook architecture:

```typescript
// 1. Base TRPC hooks
export function useProperties() {
  return trpc.properties.list.useQuery()
}

// 2. Mutation hooks with error handling
export function useCreateProperty() {
  return trpc.properties.create.useMutation({
    onSuccess: () => toast.success('Property created'),
    onError: (error) => toast.error(error.message)
  })
}

// 3. Composite action hooks
export function usePropertyActions() {
  const list = useProperties()
  const create = useCreateProperty()
  const update = useUpdateProperty()
  
  return {
    data: list.data,
    loading: list.isLoading,
    create: create.mutate,
    update: update.mutate,
    anyLoading: list.isLoading || create.isPending || update.isPending
  }
}
```

## TRPC Type System
**IMPORTANT**: TRPC types flow from backend → shared package → frontend
- Backend types are generated when running `npm run build` in the backend
- The `packages/shared/src/trpc.generated.ts` file provides type stubs
- Run `npx tsx scripts/generate-trpc-types.ts` to regenerate TRPC type stubs
- The actual runtime types come from the backend build

## Common Development Tasks
```bash
# Fix a specific TypeScript error
cd apps/frontend && npm run typecheck  # See the error
# Fix the file, then verify
npm run typecheck                       # Check all packages

# Add a new API endpoint
1. Add router method in apps/backend/src/trpc/routers/[domain].router.ts
2. Add service method in apps/backend/src/[domain]/[domain].service.ts
3. Run npm run build in backend to generate types
4. Use in frontend: trpc.[domain].[method].useQuery()

# Debug API issues
1. Check browser console for request/response logs
2. Backend logs: cd apps/backend && npm run dev
3. Check CORS: API_BASE_URL must match backend URL
4. Verify auth token in request headers
```

## Rate Limiting
Built into TRPC middleware:
- **Auth endpoints**: 5 requests per minute
- **Read endpoints**: 100 requests per minute  
- **Write endpoints**: 20 requests per minute
- **File uploads**: 10 requests per minute
- Rate limits are per user ID

## Authentication Flow
1. User signs up/logs in via Supabase (frontend)
2. Frontend gets Supabase session token
3. Token sent as Bearer token to backend
4. Backend validates with Supabase
5. User synced to Prisma DB on first request
6. Role-based access: ADMIN, OWNER, TENANT, MANAGER

## File Upload Pattern
- Frontend converts to base64
- Sends via TRPC mutation
- Backend validates size (10MB) and MIME type
- Stores in cloud storage bucket
- Returns public URL

## Performance Monitoring
- Request duration logged for all TRPC calls
- Slow query warnings > 1 second
- Memory usage tracked in development
- Network state monitoring in frontend