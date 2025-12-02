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
- **SRP**: Each layer owns ONE responsibility; violations require refactoring
- **NO GENERIC ABSTRACTIONS**: Avoid interfaces/repositories for abstraction's sake
- **NO EMOJIS**: Professional communication, use Lucide Icons for UI
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious

## Developer Tools
**Code Refactoring**: Use `ripgrep` (rg) + `sd` for fast, safe find-and-replace across codebase

### ripgrep (rg) - Fast Code Search
**Basic Search**:
- `rg 'pattern'` - Search all files
- `rg 'pattern' -g '*.tsx'` - Search specific file types
- `rg -l 'pattern'` - List files containing pattern (for piping)
- `rg -c 'pattern'` - Count matches per file
- `rg -i 'pattern'` - Case-insensitive search
- `rg -w 'word'` - Match whole words only
- `rg '\bword\b'` - Word boundary regex
- `rg -A 3 -B 3 'pattern'` - Show 3 lines of context (After/Before)

**Advanced Features**:
- `rg 'fn|function|const'` - Multiple patterns (regex alternation)
- `rg 'TODO|FIXME|XXX'` - Find tech debt markers
- `rg --type-list` - Show all supported file types
- `rg -t typescript 'pattern'` - Search by language type
- `rg --files-without-match 'pattern'` - Find files NOT containing pattern
- `rg --stats 'pattern'` - Show search statistics

**Why faster than grep**: Uses Rust, respects .gitignore by default, parallel search, smart defaults

### sd (modern sed) - Safe String Replacement
**Basic Replace**:
- `sd 'old' 'new' file.txt` - Replace in file
- `sd 'old' 'new' $(rg -l 'old')` - Replace in all matching files
- `sd -p 'old' 'new' files` - Preview changes before applying

**Advanced Features**:
- `sd -f 's' '\n' file.txt` - Fixed strings mode (no regex, faster)
- `sd 'v(\d+)' 'version $1'` - Capture groups with $1, $2, etc.
- `sd '(\w+)=(\w+)' '$2=$1'` - Swap patterns
- `sd 'color' 'colour' $(fd -e tsx)` - Combine with fd (find)

**Why better than sed**:
- Simpler syntax (no `/g` flags, no escaping hell)
- Safer (preview mode with `-p`)
- Works consistently across macOS/Linux
- Better error messages
- UTF-8 by default

### Combo Patterns (rg + sd)
```bash
# Pattern: Find files → Replace inline
rg -l 'className="text-sm text-muted-foreground"' -g '*.tsx' | xargs sd 'text-sm text-muted-foreground' 'text-muted'

# Count before/after
rg 'old-pattern' -g '*.tsx' | wc -l  # Before
rg -l 'old-pattern' -g '*.tsx' | xargs sd 'old' 'new'
rg 'new-pattern' -g '*.tsx' | wc -l  # After

# Preview changes across files
rg -l 'pattern' -g '*.ts' | xargs sd -p 'old' 'new'

# Replace in specific directory only
rg -l 'pattern' apps/frontend/src -g '*.tsx' | xargs sd 'old' 'new'
```

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

## Hosting & Cost Management - Vercel Deployment
**CRITICAL**: This project uses a separate NestJS backend (Railway) + Next.js frontend (Vercel). Certain Next.js features trigger metered billing on Vercel even though we have a separate backend.

### Vercel Cost Model
**FREE (Always use these):**
- Static pages (`generateStaticParams()` pre-rendered at build time)
- Client Components (`'use client'` - runs in browser)
- Static assets (images, CSS, JS served from CDN)
- Edge cached responses (served from CDN after first request)

**PAID (Avoid unless necessary and APPROVED explicitly by the User):**
- ❌ Server Components (async pages without `'use cache'`)
- ❌ Server Actions (`'use server'` functions)
- ❌ API Routes (`app/api/*/route.ts`)
- ❌ Middleware (runs on every request)
- ❌ On-demand ISR (revalidation without caching)

### Cost-Conscious Development Rules
**Rule 1: Prefer Client Components for Dynamic Data**
- Use `'use client'` with TanStack Query for all user-specific data
- Browser fetches directly from Railway backend (zero Vercel cost)
**Rule 2: Use Static Generation for Static Content**
- Implement `generateStaticParams()` for blogs, marketing pages, documentation
- Pages are pre-rendered at build time and served from CDN
**Rule 3: Use Long Cache Times for Shared Data (If Approved)**
- Only with explicit user approval
- Use `'use cache'` with `cacheLife({ stale: 3600, revalidate: 86400 })`
- Shared data like dashboard stats, analytics
**Rule 4: NO Server Actions for Mutations**
- All mutations must use client-side TanStack Query `useMutation`
- Never use `'use server'` functions
**Rule 5: Minimize Middleware Usage**
- Only run on specific protected routes via `matcher` config
- Keep logic minimal (auth checks only)

### Cache Components Pattern (When Approved)
**Cost-optimized pattern:**
- Page component serves as static shell (no 'use cache' directive)
- Extract cacheable sections into separate async server components with 'use cache', cacheLife(), and cacheTag()
- Wrap cached components in Suspense boundaries with skeleton fallbacks
- Use client components with TanStack Query for user-specific data (zero Vercel cost)
**Key principle:** Page layouts and shells should be static or minimal. Only apply caching to data-fetching components that benefit from it.

### When Paid Features Are Acceptable
**Requires Explicit User Approval:**
- Cache Components with long TTL for shared, infrequently-updated data
- API Routes for webhooks from external services (Stripe, etc.)
- ISR with long revalidation periods
- Server-side auth checks for routing (e.g., landing page getClaims for authenticated user routing)

### Cost Monitoring
**Monthly Budget:** $5/month serverless invocations (maximum)
**Warning Signs:**
- Serverless invocations exceeding 500,000/month
- Average function duration over 1 second
- Cache hit rate below 90% for cached routes

### Architecture Decision
**Current (Cost-Optimized):**
- Static HTML/JS served from Vercel CDN
- Client-side data fetching with TanStack Query hits Railway NestJS backend directly
- Minimal serverless invocations for auth routing and webhooks only
- Target: $0-5/month Vercel costs
