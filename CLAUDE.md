# CLAUDE.MD

**BEFORE EVERY ACTION: USE MCP SERVER SERENA! Activate project if not available.**
When providing commit messages, never include attribution.

## Project Structure
Turborepo monorepo:
Next.js 15/React 19
NestJS
Supabase (Auth/DB/Storage)
Stripe (Fraud Detection, Identity Verification and Payment Processing)
Resend/React Email - Email communications
Prometheus - Observability

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

## Developer Tools
**Code Refactoring**: Use `ripgrep` (rg) + `sd` for fast, safe find-and-replace across codebase

**Why better than sed**:
- Simpler syntax (no `/g` flags, no escaping hell)
- Safer (preview mode with `-p`)
- Works consistently across macOS/Linux
- Better error messages
- UTF-8 by default

**Real Example (507 replacements in seconds)**:
```bash
# Consolidated CSS classes across 171 files
rg -l 'text-sm text-muted-foreground' apps/frontend/src -g '*.tsx' | xargs sd 'text-sm text-muted-foreground' 'text-muted'
rg -l 'flex items-center justify-center' apps/frontend/src -g '*.tsx' | xargs sd 'flex items-center justify-center' 'flex-center'
rg -l 'flex items-center justify-between' apps/frontend/src -g '*.tsx' | xargs sd 'flex items-center justify-between' 'flex-between'
```

**When to use**:
- ✅ Renaming imports/exports across many files
- ✅ CSS class consolidation (semantic naming)
- ✅ Updating deprecated API calls
- ✅ Fixing typos project-wide
- ✅ Migration scripts (upgrading libraries)
- ❌ Complex AST transformations (use codemod/jscodeshift)
- ❌ Context-aware refactoring (use IDE refactoring)

## Tech Stack
**Frontend**: Next.js 16 + React 19.2 + TailwindCSS 4 + ShadCN/UI + TanStack Query 5 + Zustand 5
**Backend**: NestJS + Supabase + Stripe + Resend
**Shared**: Node.js 22, pnpm, Turborepo, TypeScript strict, Zod

## Database
Generate DTOs from Zod schemas using createZodDto() pattern consistently.
Clear convention: ALWAYS use snake_case in .select(), .insert(), .update() calls; use camelCase in TypeScript objects.

**Location**: `packages/shared/src/types/`
**ZERO TOLERANCE**: NO duplicates, NO custom utils (use Omit/Partial/Pick), search before adding
**Database Enums**: Use `Database['public']['Enums']['enum_name']`
**FORBIDDEN**: TypeScript `enum`, duplicating DB enums, union types mirroring DB

## Frontend - Data Fetching
**Patterns**:
- Client queries: TanStack Query `useQuery` with native `fetch()`
- Simple mutations: `useTransition + fetch()`
- Complex mutations: `useMutation` (retries, versioning, multi-cache, global errors)
- Optimistic UI: Single component = `useOptimistic`, Multi-component = `useMutation` cache updates

**State Management**:
- URL: nuqs
- React 19.2
- Tanstack React Query
- Zustand

**Custom Hooks**: ALLOWED - wraps `useQuery`/`useMutation`, NO HTTP abstraction layer
**Cache**: Lists 10min, Details 5min, Stats 1min, Real-time 3min refetch

## Frontend - Routing
**ARCHITECTURE**: Intercepting Routes + Parallel Routes for modal UX with URL support

## Frontend - Testing
**Philosophy**: Test production usage ONLY, not every hook that exists

**Critical**:
- Share QueryClient between mutation and query hooks
- Populate cache before testing optimistic locking
- Never `waitFor(async () => ...)` - causes 30s timeouts
- Cleanup in reverse foreign key order

## CSS - Tailwindcss v4 | Shadcn UI
**TailwindCSS 4.1**: 90% utilities, 10% design tokens
**Touch-first**: 44px min height (`min-h-11`)
**Colors**: OKLCH

## Backend - NestJS
**PHILOSOPHY**: Official NestJS patterns, native platform features, direct Supabase calls, minimal abstractions.

### NestJS Dependency Injection (Official Pattern)
**Three-Step Process** (from official docs):
1. **@Injectable()** marks a class as manageable by NestJS IoC container
2. **Constructor injection** declares dependencies (e.g., `constructor(private supabase: SupabaseService)`)
3. **Module registration** associates tokens with implementations in `providers` array

**Provider Patterns** (use sparingly, only when needed):
- **useValue**: Inject constants, mocks for testing, external library instances
  ```typescript
  { provide: SupabaseService, useValue: mockSupabaseService } // Testing only
  ```
- **useFactory**: Dynamic provider creation with dependencies
  ```typescript
  {
    provide: SUPABASE_ADMIN_CLIENT,
    useFactory: (config: AppConfigService) => createClient(config.url, config.key),
    inject: [AppConfigService]
  }
  ```
- **useClass**: Environment-based implementation swapping
  ```typescript
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard  // Global guard registration
  }
  ```

**When to use custom providers**:
- ✅ **useFactory**: Dynamic config-based initialization (SupabaseModule, ThrottlerModule)
- ✅ **useClass**: Global providers (APP_GUARD, APP_PIPE, APP_INTERCEPTOR)
- ✅ **useValue**: Testing ONLY (mock dependencies)
- ❌ **DON'T** use for normal services (let NestJS auto-wire via @Injectable)
- ❌ **DON'T** create abstractions "for DIP's sake" (NestJS DI IS your abstraction)

### Responsibility Assignment (SRP)
**Controllers** (HTTP layer): Route requests to services, validate parameters via pipes, return responses. NOTHING ELSE—no business logic, no data transformation, no Supabase calls.

**DTOs** (Input boundary - VALIDATION ONLY):
- **Purpose**: Validate HTTP request shape via `nestjs-zod` + `createZodDto()`
- **Pattern**: `export class CreatePropertyDto extends createZodDto(propertyCreateSchema) {}`
- **Zod schema location**: `packages/shared/src/validation/*.ts` (single source of truth)
- **What DTOs should NOT do**:
  - ❌ Business logic (belongs in services)
  - ❌ Data transformation (use Zod `.transform()` in schema if needed)
  - ❌ Computed properties (services handle this)
  - ❌ Database calls (services only)
- **Current pattern is CORRECT**: Thin wrappers around Zod schemas for automatic validation + OpenAPI generation
- **Type hints**: Add `private __type?: SchemaType` for IDE autocomplete (cosmetic only)

**Services** (Business logic): Implement domain rules, orchestrate multi-step operations, decide what data to fetch/persist. Inject `SupabaseService` directly (official pattern for non-ORM databases). Receive validated DTOs, output typed responses. Maximum 150 lines; break into smaller composed services if exceeding.

**Guards/Pipes** (Cross-cutting): Authorization checks, global validation, request enrichment. Use Reflector metadata and composition via applyDecorators().

**Caching**: Apply decorators at controller level only. Use @CacheKey() + @CacheTTL() with ZeroCacheService.

**Validation**: Zod schema (packages/shared) → DTO (nestjs-zod wrapper) → ValidationPipe. Services assume valid input.

**Errors**: Native NestJS exceptions only. Guards/controllers/services throw appropriate exceptions; interceptors handle serialization.

**Testing**: Mock services via `useValue` in test modules. No repository/data layer needed—mock `SupabaseService` directly.

**Refactoring**: If service exceeds 150 lines, extract cohesive logic into helper service and compose via constructor injection.

### Webhooks
**Pattern**: Use official `RawBodyRequest<Request>` from `@nestjs/common`
**Controller**: Import from @nestjs/common and express, use for signature verification

### TypeScript Config
**Current** (`packages/typescript-config/nestjs.json`):
- `isolatedModules: false` - No benefit for `nest build` (uses tsc)
- `emitDecoratorMetadata: true` - REQUIRED for NestJS DI
- `experimentalDecorators: true` - REQUIRED for decorators

**Doppler**: All env vars via `doppler run --`
**Env Validation**: `eslint-config-turbo` validates `process.env.*` in `turbo.json`

### SharedModule & Module Structure
**SharedModule** (@Global()): Guards, pipes, Logger, Reflector, custom decorators. Add new shared functionality here ONLY if used by 3+ modules. Otherwise, keep in domain modules.
**Domain Modules**: Flat structure—one controller, one or more services, one module. NO sub-modules! Each module owns its DTOs, services, data layer.
**Module imports**: Import services/guards from other modules' providers only. Never cross-import controllers or internal utilities.

### Data Fetching & Persistence Patterns
**Official NestJS Pattern for Supabase** (non-ORM database):
```typescript
@Injectable()
export class PropertiesService {
  constructor(private readonly supabase: SupabaseService) {} // Direct injection

  async findAll(token: string) {
    const client = this.supabase.getUserClient(token) // RLS enforcement
    return client.from('properties').select('*') // Direct Supabase call
  }
}
```

**NO Data Layer/Repository Pattern**: Official NestJS docs only recommend repositories for TypeORM/Sequelize. For Supabase (like Prisma), inject client service directly. NestJS DI IS your abstraction layer.

**Service Decomposition** (NOT data layer):
- Split bloated services (>150 lines) into focused services
- Compose via constructor injection
- Each service injects SupabaseService directly
- Example: `PropertyCreationService`, `PropertyQueryService`, `PropertyAnalyticsService`

**Complex workflows**: Compose multiple services via orchestrator pattern
```typescript
@Injectable()
export class PropertiesService { // Orchestrator
  constructor(
    private creation: PropertyCreationService,
    private query: PropertyQueryService
  ) {}
}
```

**N+1 Prevention**: Load related data in single Supabase query with `.select('*, related_table(*)')`. Never loop calling RPC.

**Caching policy**: Cache reads via @CacheKey()/@CacheTTL() at controller level. Invalidate on mutations.

**Multi-step operations**: Use explicit sequential service calls. For external services (Stripe, Resend), use event-driven: persist intent, return success, background job processes asynchronously. For database-only operations, prefer Supabase RPC functions for atomicity.

### Logging & Observability
**What to log**: Authentication attempts, authorization failures, external service calls (Stripe, Resend), data mutations, errors with context.
**What NOT to log**: Request/response bodies containing PII, passwords, API keys, tokens. Use Logger.debug() for development details, Logger.warn() for recoverable issues, Logger.error() for unrecoverable.
**Context**: Always include user_id, operation name, relevant IDs. Format: `{ operation: 'create_property', user_id: '...', property_id: '...' }`.

### Security & RLS
**Every RPC call must be user-scoped**: Use SupabaseService.getUserClient(token) to enforce RLS. No admin client in services.
**Input validation**: Zod schema validates shape/type. Services re-validate business rules (e.g., "user owns property"). Never trust DTO; check permissions.
**Error responses**: Never expose internal errors to client. Catch specific exceptions, log details, return generic "Operation failed" message.

### Performance Rules
**Query optimization**: Select only needed columns. Use Supabase filters (eq, lt, etc.) not JavaScript filters. Load relationships in single query.
**Service size limit**: 150 lines max. Exceeding indicates: mixed concerns (split into focused services), missing composition (extract helper service), or overly complex logic (simplify).
**Service organization**: One service per concern. Compose via constructor injection. NO data layer files—inject SupabaseService directly per official NestJS pattern.
**Frontend loading states**: Always show skeleton/loading UI while TanStack Query fetches. Never block with loading overlays.

### Error Handling Strategy
**Controllers**: Catch service errors, map to NestJS exceptions. Let pipes/guards throw their own exceptions.
**Services**: Throw NestJS exceptions (BadRequestException, NotFoundException, etc.). Include descriptive message for logging.
**Guards**: Throw UnauthorizedException/ForbiddenException immediately. Reflector.get() retrieves metadata; no service calls.
**Testing**: Mock dependencies via `useValue` provider pattern in test modules. No data layer to mock—mock SupabaseService directly.
**Frontend**: TanStack Query catches HTTP errors, stores in state. Components render error UI or retry. Mutations show toast on failure.

## Development Servers
**Frontend**: http://localhost:3000 (Next.js 16 dev server)
**Backend**: http://localhost:4600 (NestJS dev server)

Start both servers with:
```bash
# Terminal 1: Backend
doppler run -- pnpm --filter @repo/backend dev

# Terminal 2: Frontend
pnpm --filter @repo/frontend dev
```