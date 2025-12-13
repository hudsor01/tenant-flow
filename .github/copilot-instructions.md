# AI Coding Agent Instructions for TenantFlow

## Project Overview
TenantFlow is a property management SaaS platform built as a Turborepo monorepo with Next.js 15/React 19 frontend, NestJS backend, and Supabase database. Core features include tenant management, lease administration, rent collection via Stripe, maintenance tracking, and analytics dashboards.

## Core Principles

- **DRY**: Search first (`rg -r "pattern"`), consolidate code reused ≥2 places
- **KISS**: Simplest solution wins, delete > add code
- **NO GENERIC ABSTRACTIONS**: Avoid interfaces/repositories for abstraction's sake
- **NO EMOJIS**: Professional communication, use Lucide Icons for UI
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious
- **YAGNI (You Aren't Gonna Need It)**: Do not implement features, functionality, or infrastructure that is not immediately required for the current requirements. No speculative coding, no "just in case" implementations, no premature optimization. If it's not needed now, it will not be developed. This rule applies to libraries, frameworks, database schemas, API endpoints, and business logic.
- **Composition Over Inheritance**: All system components must be built using composition rather than inheritance hierarchies. Avoid deep inheritance trees. Prefer building functionality by combining smaller, independent components rather than creating parent-child class relationships. This ensures flexibility, testability, and prevents brittle code that breaks when parent classes change.
- **Explicit Data Flow & Type Safety**: All data must have clearly defined, strongly typed interfaces. No dynamic types, no implicit conversions, no untyped objects passed between functions. All inputs, outputs, and transformations must be explicitly declared with proper type annotations. Any data that crosses module boundaries must be validated and typed.
- **Small, Focused Modules (High Cohesion, Low Coupling)**: Each module, class, function, and component must have a single, well-defined purpose. Modules must not exceed reasonable size limits and should only contain code directly related to their primary responsibility. Dependencies between modules must be minimal and clearly defined through explicit interfaces.
- **Fail Fast, Log Precisely**: Systems must validate inputs immediately and throw clear, specific errors when invalid data is encountered. Do not attempt to recover from invalid states silently. All error conditions must be logged with sufficient context to identify the root cause without requiring additional debugging. Error messages must be actionable.
- **Idempotency Everywhere**: All operations, especially those that modify state or interact with external systems, must be idempotent. Running the same operation multiple times must produce the same result as running it once. This applies to database operations, API calls, file operations, and any state-changing functions.
- **Predictable State Management**: All application state must be managed in a deterministic, traceable manner. No hidden global state, no implicit side effects, no shared mutable state between components. State changes must follow clear, predictable patterns with no race conditions or unexpected interactions.
- **Single Responsibility**: Every function, class, module, and service must have exactly one reason to change. If a component handles multiple concerns or domains, it must be split into separate components. This applies to business logic, data access, presentation, and infrastructure concerns.
- **Prefer Readability Over Cleverness**: Code must be written for human understanding first, performance second. No clever tricks, no overly compact syntax, no "smart" solutions that sacrifice clarity. The codebase must be understandable by any team member without requiring extensive documentation or explanation.

## Architecture & Data Flow
- **Frontend**: Next.js App Router with intercepting/parallel routes for modal UX. Uses TanStack Query for server state, Zustand for client state, nuqs for URL state.
- **Backend**: NestJS with direct Supabase client injection (no repository pattern). Services handle business logic, controllers are thin HTTP layer.
- **Database**: Supabase with Row Level Security (RLS). Always use `snake_case` in `.select()/.insert()/.update()` calls, `camelCase` in TypeScript objects.
- **External Services**: Stripe for payments/fraud detection, Resend for emails, Prometheus for observability.

## Critical Developer Workflows

### Environment & Secrets
All environment variables loaded via Doppler. Never commit secrets.
```bash
# Start development servers
doppler run -- pnpm --filter @repo/backend dev  # Backend: http://localhost:4600
pnpm --filter @repo/frontend dev                 # Frontend: http://localhost:3000

# Run tests with secrets
doppler run -- pnpm test:integration
doppler run -- pnpm test:e2e
```

### Data Fetching Patterns
**Destination determines vehicle** - choose based on data location:

| Data Location | Pattern | Example |
|---------------|---------|---------|
| Supabase tables (CRUD) | `createClient().from().select()` | Properties, tenants, leases |
| NestJS business logic | `apiRequest()` with auth header | Analytics, Stripe operations |
| Server components | Direct Supabase client | SEO-critical static content only |

**Query caching**: Lists 10min, Details 5min, Stats 1min. Invalidate on mutations.

### Database Conventions
- **Enums**: Use `Database['public']['Enums']['enum_name']` - never duplicate
- **DTOs**: `createZodDto(schema)` from `packages/shared/src/validation/`
- **RPC functions**: Use for complex multi-step operations requiring atomicity
- **Optimistic locking**: Only `leases` table has `version` field

### Code Organization
- **Frontend components**: `apps/frontend/src/components/` - reusable UI
- **Frontend pages**: `apps/frontend/src/app/` - App Router structure
- **Backend modules**: `apps/backend/src/modules/` - one controller + services per domain
- **Shared types**: `packages/shared/src/types/` - single source of truth
- **Validation schemas**: `packages/shared/src/validation/` - Zod schemas

### Testing Strategy
- **Unit**: Jest for isolated logic, mock SupabaseService
- **Integration**: Real Supabase calls with test data, RLS enforced
- **E2E**: Playwright for full user flows, uses Doppler secrets
- **Philosophy**: Test production usage only, not implementation details

### Build & Deployment
- **Turborepo**: Caches builds, `turbo.json` defines task dependencies
- **Validation**: `pnpm validate` runs full CI pipeline locally
- **TypeScript**: Strict mode, no `any`, explicit types everywhere
- **Linting**: ESLint with custom rules, auto-fix with `pnpm lint:fix`

## Project-Specific Patterns

### Frontend Data Fetching
**Native fetch only** - no axios, ky, or custom wrappers:
```typescript
// apiRequest utility injects Supabase auth token
const data = await apiRequest<Property[]>('/api/v1/properties')
```

**Query patterns**:
```typescript
// Query options factory pattern
export const propertyQueries = {
  list: (filters) => queryOptions({
    queryKey: ['properties', filters],
    queryFn: () => apiRequest('/api/v1/properties'),
    ...QUERY_CACHE_TIMES.LIST
  })
}

// Hook usage
const { data } = useQuery(propertyQueries.list(filters))
```

**Mutations**:
```typescript
// Optimistic updates with rollback
useMutation({
  mutationFn: (input) => apiRequest('/api/v1/properties', {
    method: 'POST',
    body: JSON.stringify(input)
  }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['properties'] })
})
```

### Frontend Routing
**Intercepting routes + parallel routes** for modal UX:
```
properties/
├── page.tsx                    # List page
├── @modal/
│   ├── default.tsx            # Null for modal slot
│   ├── (.)new/page.tsx        # Create modal
│   └── (.)[id]/edit/page.tsx  # Edit modal
└── [id]/
    └── edit/page.tsx          # Full edit page (fallback)
```

**RouteModal component** handles modal overlay behavior.

### Backend Architecture
**Direct Supabase injection** - no repository pattern:
```typescript
@Injectable()
export class PropertiesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(token: string) {
    const client = this.supabase.getUserClient(token)
    return client.from('properties').select('*')
  }
}
```

**Service decomposition**: Max 150 lines, compose via constructor injection.

**Validation pipeline**:
```typescript
// 1. Zod schema in packages/shared/src/validation/
export const propertyCreateSchema = z.object({ name: z.string() })

// 2. DTO extends createZodDto
export class CreatePropertyDto extends createZodDto(propertyCreateSchema) {}

// 3. Controller uses DTO
@Post()
async create(@Body() dto: CreatePropertyDto) { /* ... */ }
```

### Error Handling
- **Frontend**: TanStack Query catches HTTP errors, shows toast notifications
- **Backend**: Throw NestJS exceptions, log with context, never expose internals
- **Validation**: Zod schemas → DTOs → business logic re-validation

### Authentication & Security
- **Supabase Auth**: Direct client calls, RLS on all queries
- **Backend**: `SupabaseService.getUserClient(token)` enforces RLS
- **Webhooks**: Raw body for signature verification

### Performance
- **N+1 prevention**: Single Supabase query with `select('*, related(*)')`
- **Caching**: `@CacheKey()/@CacheTTL()` at controller level
- **Service limits**: 150 lines max, decompose into focused services

### Status Types & Constants
**Centralized in `packages/shared/src/constants/status-types.ts`**:
```typescript
export const PROPERTY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SOLD: 'SOLD'
} as const

export type PropertyStatus = (typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS]
```

**Never duplicate enums** - always import from this file.

### Configuration
**Compile-time constants** in `apps/backend/src/config/config.constants.ts`:
```typescript
export const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number]
```

**Runtime config** uses these constants for validation.

### Testing Patterns
**Integration tests** - full HTTP pipeline:
```typescript
describe('PropertiesController (Integration)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      // Full module setup with mocks
    }).compile()
    app = module.createNestApplication()
    await app.init()
  })

  it('should create property', () => {
    return request(app.getHttpServer())
      .post('/properties')
      .send(validPropertyData)
      .expect(201)
  })
})
```

**E2E tests** - full browser flows with Playwright.

### Refactoring Tools
- **Find/replace**: `ripgrep` + `sd` for safe bulk changes
- **Code search**: `rg -r "pattern"` before implementing to avoid duplication
- **Symbol management**: Serena tools for precise edits

## Key Files & Directories
- `CLAUDE.md`: Comprehensive development guidelines
- `packages/shared/src/types/core.ts`: Main domain models
- `packages/shared/src/validation/`: Zod schemas
- `apps/frontend/src/data/`: TanStack Query hooks
- `apps/backend/src/modules/`: Domain-specific business logic
- `supabase/migrations/`: Database schema changes
- `packages/shared/src/constants/status-types.ts`: All status enumerations
- `apps/frontend/src/lib/api-request.ts`: API request utility
- `apps/frontend/src/hooks/api/queries/`: Query factories
- `apps/backend/src/config/config.constants.ts`: Compile-time config constants</content>
<parameter name="filePath">/Users/richard/Developer/tenant-flow/.github/copilot-instructions.md