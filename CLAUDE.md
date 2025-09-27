## MANDATORY RULES - NO EXCEPTIONS

### NO EMOJIS RULE
- Never use emojis in communication unless user explicitly requests them
- Never use emojis in code, comments, or file content
- Use Lucide Icons instead for visual elements in UI components
- Keep all responses professional and emoji-free
- Focus on clear, direct technical communication

### MODERN SAAS DESIGN PRINCIPLES
- **Ultra-Clean Minimalism**: Abundant white space, typography hierarchy, subtle shadows, neutral color palettes
- **Conversion-Focused Layout**: Hero above fold, social proof early, progressive disclosure, multiple CTAs
- **Performance & Polish**: Fast animations (200-300ms), micro-interactions, perfect mobile, accessibility first
- **Clear Copywriting**: Benefit-focused headlines, scannable content, numbers & specifics, action-oriented CTAs
- **Visual Consistency**: Design tokens, limited color palette (2-3 colors max), icon consistency, button hierarchy
- **Component-Based Architecture**: Reusable blocks, consistent spacing, scalable system

### CORE PRINCIPLES
- **DRY**: Search before writing (`rg -r "functionName"`). Consolidate code reused ≥2 places
- **KISS**: Choose simplest solution. Delete code instead of adding when possible
- **NO ABSTRACTIONS**: Use native platform features directly. No wrappers, factories, or custom layers
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious, reliability-focused

### MONOREPO SCRIPT STANDARDIZATION
- **pnpm**: No "run" keyword → `pnpm dev`, `pnpm build`, `pnpm lint`
- **turbo**: Requires "run" → `turbo run dev`, `turbo run build`
- **doppler**: Only for local dev → `doppler run -- <cmd>`
- **CI/prod**: No doppler (Railway/Vercel/GitHub provide env vars)
- **Filter syntax**: `pnpm --filter @repo/package <script>`

### TYPESCRIPT SHARED TYPES ARCHITECTURE - MANDATORY COMPLIANCE
**ABSOLUTE PROHIBITIONS - ZERO TOLERANCE**
- **NEVER create new type files** without explicit approval and architectural review
- **NEVER duplicate type definitions** - search existing types first with `rg -r "TypeName"`
- **NEVER import from removed paths** - all legacy type paths are forbidden
- **NEVER use custom utility types** when native TypeScript 5.9.2 equivalents exist
- **NEVER break the single source of truth** - consolidation is permanent

**MANDATORY TYPE IMPORT PATTERNS**
CORRECT - Single source imports:
- import type { ApiResponse, DashboardStats, PropertyStats } from '@repo/shared'
- import type { User, Property, Unit, Tenant } from '@repo/shared'
- import type { authUser, authUser } from '@repo/shared'

FORBIDDEN - Legacy/removed paths:
- import type { ApiResponse } from '@repo/shared/types/common' - REMOVED
- import type { TenantStats } from '@repo/shared/types/stats' - REMOVED
- import type { authUser } from '@repo/shared/types/backend' - REMOVED
- import type { StorageUploadResult } from '@repo/shared/types/storage' - REMOVED

**CONSOLIDATED TYPE ARCHITECTURE - IMMUTABLE STRUCTURE**
File Structure:
- core.ts - PRIMARY: All shared types, utilities, patterns
- index.ts - EXPORT HUB: Single import source
- domain.ts - CONSOLIDATED: Contact, storage, websocket, theme
- backend-domain.ts - CONSOLIDATED: Backend context, config, performance
- auth.ts - AUTH DOMAIN: User management, authentication
- supabase-generated.ts - SUPABASE: Generated database types
- frontend.ts - FRONTEND: UI-specific types only
- Only minimal essential files allowed

**NATIVE TYPESCRIPT 5.9.2 PATTERNS - USE THESE ONLY**
Required Patterns:
- Native Result Pattern: ApiResponse with success/error discriminated union
- Native Template Literals: CamelCase string manipulation types
- Native Conditional Types: DeepReadonly using recursive conditional logic
- Native Utility Types: CreateInput using Omit, UpdateInput using Partial
- Use built-in TypeScript utilities instead of custom implementations

**TYPE LOCATION RULES - STRICT ENFORCEMENT**
1. **Core Types** (`types/core.ts`):
   - All shared API patterns (ApiResponse, QueryParams, Pagination)
   - Entity types from Supabase (User, Property, Unit, Tenant, etc.)
   - Common utilities (DeepReadonly, DeepPartial, Result<T,E>)
   - Dashboard statistics (DashboardStats, PropertyStats, etc.)

2. **Domain Types** (`types/domain.ts`):
   - Contact forms, storage uploads, websocket messages
   - Session management, user management configs
   - Theme types, webhook event types

3. **Backend Types** (`types/backend-domain.ts`):
   - authUser, Context, AuthenticatedContext
   - Router output interfaces, config types
   - Performance metrics, health checks

4. **Auth Types** (`types/auth.ts`):
   - authUser, LoginCredentials, RegisterCredentials
   - JWT payload types, authentication flows
   - Permission enums, security validation

**MODIFICATION RULES - BREAKING CHANGE PROTOCOL**
**Before Adding ANY Type:**
1. Search existing: `rg -r "NewTypeName" packages/shared/src/`
2. Check if native TypeScript utility exists
3. Verify it belongs in existing consolidated file
4. Follow naming conventions: `PascalCase` for types, `camelCase` for properties

**Before Modifying Existing Types:**
1. Run full typecheck: `npm run typecheck`
2. Check breaking changes across frontend/backend
3. Update with backward compatibility when possible
4. Document migration path if breaking

**PERFORMANCE & DEVELOPER EXPERIENCE ENFORCEMENT**

- **Single Import Rule**: `import type { A, B, C } from '@repo/shared'` - never scatter imports
- **Build Performance**: Modifications must not increase TypeScript compilation time
- **IDE Performance**: Types must provide instant intellisense without lag
- **Zero Circular Dependencies**: Violations break the build immediately

**VALIDATION REQUIREMENTS**
**MIGRATION ENFORCEMENT - NO LEGACY SUPPORT**

- **Zero Legacy Compatibility**: Old import paths must fail compilation
- **Forced Migration**: Developers MUST use new consolidated patterns
- **Documentation**: All legacy patterns removed from examples/docs
- **Training**: New developers start with modern patterns only

**SUCCESS METRICS - CONTINUOUS MONITORING**

- **File Count**: Shared types directory capped at ≤20 essential files
- **Duplication**: Zero tolerance for duplicate type definitions
- **Build Speed**: TypeScript compilation ≤3 seconds for shared package
- **Developer Velocity**: New types added to existing files, not new files

**VIOLATION CONSEQUENCES**: Code that violates these rules will be rejected in PR reviews and must be refactored before merge. This architecture is production-tested and performance-optimized - deviations compromise system stability.

**QUICK REFERENCE - COMMON TYPE TASKS**

Search before creating:
- rg -r "UserProfile|DashboardData|ApiResponse" packages/shared/src/

Add to existing files:
- Edit packages/shared/src/types/core.ts for new shared types
- Use consolidated imports from '@repo/shared'

Test immediately:
- npm run typecheck
- npm run build:backend

**MIGRATION GUIDE FOR EXISTING CODE**

OLD to NEW Migration Examples:

Before - Scattered imports:
- import { ApiResponse } from '@repo/shared/types/common'
- import { TenantStats } from '@repo/shared/types/stats'
- import { authUser } from '@repo/shared/types/backend'

After - Single consolidated import:
- import type { ApiResponse, TenantStats, authUser } from '@repo/shared'

Before - Custom utility types:
- type MyDeepPartial<T> = { [P in keyof T]?: MyDeepPartial<T[P]> }

After - Native TypeScript utilities:
- import type { DeepPartial } from '@repo/shared'

### ENUM STANDARDIZATION - MANDATORY COMPLIANCE
**SINGLE SOURCE OF TRUTH**: Database enums via Supabase generated types only

**FORBIDDEN - NO EXCEPTIONS**:
- Creating TypeScript enum definitions (enum MyEnum { ... })
- Duplicating database enum values in code
- Creating union types that mirror database enums
- Using string literals instead of generated enum types

**REQUIRED PATTERNS**:
```typescript
// CORRECT - Direct usage from generated types
import type { Database } from '@repo/shared'
type UnitStatus = Database['public']['Enums']['UnitStatus']

// CORRECT - Inline type extraction
const status: Database['public']['Enums']['LeaseStatus'] = 'ACTIVE'

// CORRECT - In function parameters
function updateUnit(status: Database['public']['Enums']['UnitStatus']) { }
```

**ENUM CATEGORIES**:
1. **Database Enums** (Use Supabase generated types):
   - All domain enums that exist in database
   - Examples: UnitStatus, LeaseStatus, PropertyType, RequestStatus

2. **UI-Only Enums** (String literals only):
   - Frontend-specific values never stored in database
   - Use const objects with 'as const' assertion
   - Example: `const SortOrder = { ASC: 'asc', DESC: 'desc' } as const`

3. **External API Enums** (Type from API response):
   - Stripe, third-party service enums
   - Import from SDK types or define as string literals

### BACKEND RULES (Ultra-Native + Official NestJS Ecosystem)
**CORE PHILOSOPHY**: Use official NestJS ecosystem packages directly, never create custom abstractions. Maintain 75% code reduction by avoiding unnecessary layers.

**ALLOWED - Official NestJS Ecosystem**:
- Official NestJS modules (@nestjs/cache-manager, @nestjs/event-emitter, @nestjs/throttler, nestjs-cls)
- Built-in NestJS pipes, guards, interceptors from @nestjs/* packages
- Native NestJS decorators (@CacheKey, @CacheTTL, @OnEvent, @Request)
- Direct module configuration (ClsModule.forRoot, CacheModule.register)
- Built-in exceptions (BadRequestException, NotFoundException)
- Direct PostgreSQL RPC via Supabase, JSON Schema definitions

**FORBIDDEN - Custom Abstractions**:
- Custom service layers, repositories, custom DTOs
- Custom decorators (@CurrentUserId, @CurrentContext)
- Custom validation pipes, custom interceptors
- Custom event definitions and listeners
- Wrappers, helper classes, factories, builders, custom error handlers

**DECISION CRITERIA**: If it's published on npm under @nestjs/* or has official NestJS documentation, it's allowed. If you're creating it yourself, it's forbidden.

Protected files: `apps/backend/ULTRA_NATIVE_ARCHITECTURE.md`

## NestJS Dependency Injection Crisis Prevention

### Coffee Shop Rule
Controller=Cashier (takes orders), Service=Barista (makes coffee), Database=Machine (does work) | WRONG: Cashier making coffee | RIGHT: Cashier→Barista→Machine

### 6-Point DI Failure Checklist
When you get "Cannot read properties of undefined (reading 'X')":
1. **Missing Service in Module providers[]** - Service not registered in @Module providers
2. **Wrong Injection Pattern** - Controller directly accessing database instead of service layer
3. **Missing @Injectable()** - Service class needs @Injectable() decorator
4. **Missing Module Imports** - Service needs another service but module doesn't import it
5. **Circular Dependencies** - Services importing each other, use @Global() modules instead
6. **Parameter Mismatch** - Constructor parameter name/type doesn't match injection

### Emergency Commands
Check logs: `doppler run -- npm run dev` | Find modules: `rg -A5 "@Module" --type ts` | Check providers: `rg "providers.*\[" --type ts`

### Ultra-Native Patterns
**Controller**: Service layer + NestJs Logger only, delegate to services, use built-in pipes | **Service**: SupabaseService + NestJs Logger only, direct RPC calls under 30 lines | **Module**: imports/providers/exports arrays, @Global() for shared services

### Critical Rules
**No Abstractions**: Direct PostgreSQL RPC via Supabase, no repositories/DTOs/wrappers | **Built-in NestJS**: ParseUUIDPipe, exceptions, guards only | **Error Handling**: Simple logging + NestJS exceptions

### Mandatory Testing
**Every update/action/implementation requires test proving production functionality** | **Test Coverage**: Controllers, Services, Critical paths with edge cases | **Production Mirroring**: Tests must replicate actual production behavior exactly

### Success Verification
Server starts with "dependencies initialized" | Public endpoints work | Protected endpoints work with auth | No undefined property errors

### BACKEND IMPLEMENTATION RULES - BATTLE-TESTED PATTERNS
#### ROUTE ORDERING - CRITICAL FOR CORRECT BEHAVIOR
- Static routes MUST come before dynamic parameter routes
- Order: /resource/static-path → /resource/:id
- Example: /properties/stats BEFORE /properties/:id
- Violation causes 404s when static paths match dynamic patterns

#### NESTJS NATIVE PIPES - REQUIRED PATTERNS
- ParseUUIDPipe - for required UUID params
- ParseIntPipe - for numeric params
- DefaultValuePipe - for optional params with defaults
- ParseBoolPipe, ParseArrayPipe, ParseEnumPipe - all built-in pipes

#### DEPENDENCY INJECTION - ULTRA-NATIVE PATTERN
```typescript
constructor(@Optional() private readonly service?: ServiceClass) {}
// Check: if (!this.service) return fallback
```

#### GUARDS - SECURITY WITHOUT ABSTRACTION
- Initialize clients directly in constructor to avoid circular dependencies
- Use Reflector for decorator metadata access
- getAllAndOverride() for merged metadata from handler + class
- Cache user lookups within request lifecycle
- Minimize database calls per request

#### MODULE STRUCTURE - FLAT AND FOCUSED
SharedModule (@Global()):
- Guards (AuthGuard, UsageLimitsGuard)
- Common Pipes (ParseOptionalUUIDPipe)
- Core Services (TokenValidation, Security, Resilience)
- Logger, Reflector

Domain Modules:
- Controller + Service + Module only
- No sub-modules or complex hierarchies
- Import SharedModule for guards, pipes, and core services

#### REQUEST HANDLING - NATIVE PATTERNS
Accessing User Context:
```typescript
@Request() req: AuthenticatedRequest
const userId = req.user?.id || 'fallback-id'
```

#### CACHING - NESTJS NATIVE DECORATORS
```typescript
@CacheKey('custom-key') @CacheTTL(30) async method() { }
// Global: CacheModule.register({ ttl: 30 * 1000, max: 1000 })
```

#### ERROR HANDLING - SIMPLE AND DIRECT
Use Built-in Exceptions:
- BadRequestException(message)
- NotFoundException(message)
- ForbiddenException(message)
- UnauthorizedException(message)

#### PARAMETER VALIDATION
Query Parameters:
```typescript
@Query('param', ParseIntPipe) param: number
@Query('optional', new DefaultValuePipe('default')) optional: string
```
Path Parameters:
```typescript
@Param('id', ParseUUIDPipe) id: string
```
Body Validation:
- Use JSON Schema via @RouteSchema decorator

#### SERVICE METHODS - KEEP IT SIMPLE
- Each method < 30 lines
- Single responsibility (one RPC call)
- Direct return of database results
- Simple error handling only
- No orchestration or complex logic

#### TESTING - MATCH PRODUCTION BEHAVIOR
Required Test Coverage:
- All controller endpoints
- Auth scenarios (authenticated/unauthenticated)
- Invalid input handling
- Service error scenarios

Test Patterns:
- Mock at service level, not database
- Use SilentLogger in tests
- Test actual edge cases from production

#### PERFORMANCE - MEASURE THEN OPTIMIZE
Database Calls:
- One RPC call per service method
- Use database functions for complex logic
- Let Postgres handle aggregations

Request Pipeline:
- Guards run first (fail fast)
- Minimize middleware
- Cache user context per request

### UI/UX RULES - GLOBALS.CSS COMPLIANT IMPLEMENTATION
**CRITICAL**: Full UI/UX implementation standards
These rules are MANDATORY and directly align with the production globals.css implementation.

**Core Requirements**:
- **Touch-First**: 44px minimum height for ALL interactive elements
- **Loading States**: Protocol based on operation duration (< 200ms = no indicator)
- **Data Density**: Three modes with user preference persistence
- **Form Sections**: Maximum 5 fields per section for cognitive load management
- **Mobile Simplification**: Apply `.simplified-mobile` below 640px breakpoint
- **Typography**: Strict Roboto Flex scale with 5 hierarchy levels maximum
- **Colors**: OKLCH color space only for perceptual uniformity

**Implementation Principles**:
- Reuse existing pages/layouts/components first
- Import components/ui components then customize inline to meet use case
- Use shadcn components vs creating custom
- Flat component organization in existing folders
- Central Zustand store instead of component state
- Direct store access via hooks - no prop drilling
- Sync Shadcn/ui and Magic UI themes for primary color
- Use shadcn charts for charting needs

**See `.claude/rules/ui-ux-standards.md` for complete 15-point implementation guide**

### NATIVE PLATFORM REPLACEMENTS
- **Auth**: Supabase Auth | **Storage**: Supabase Storage | **Real-time**: Supabase Realtime
- **Email**: Resend API | **Validation**: Zod schemas
- **Data**: TanStack Query | **Forms**: React Hook Form | **State**: Zustand
- **Styles**: Tailwind css variables | **Components**: Radix/ShadCN | **Dates**: date-fns
- **HTTP**: next.js/react-query

### UI COMPONENT PATTERNS
- **Buttons**: Radix Button + Tailwind | **Forms**: Radix Form + React Hook Form
- **Modals**: Radix Dialog | **Dropdowns**: Radix Select | **Tooltips**: Radix Tooltip
- **Loading**: Radix Progress | **Layouts**: CSS Grid + Tailwind
- **Animations**: Tailwind transitions + Framer Motion | **Themes**: CSS variables
- **Responsive**: Tailwind prefixes | **Focus**: Radix utilities | **Keyboard**: Radix handlers

### BEFORE EVERY CHANGE
1. Think: Does this exist? (Search first!)
2. Think: Can I use native platform feature?
3. Think: Can I delete code instead?
4. Think: Is this the simplest solution?
5. Think: Will another developer understand immediately?
6. Think: Does this follow accessibility standards?
7. Think: Is this predictable and consistent?

## Tech Stack

**Frontend (Vercel)**
- Next.js 15.5.0 + React 19.1.1
- TailwindCSS 4.1.12 + ShadCN/UI + Magic UI
- TanStack Query 5.85.5, Zustand 5.0.8, Zod 4.0.0, TanStack Form
- React-Spring/Web, Lucide Icons 0.540.0, Recharts 3.1.2

**Backend (Railway)**
- NestJS 11.1.6 + Fastify 11.x
- Supabase 2.56.0, Stripe 18.4.0, Resend 6.0.1
- In-memory cache + Database query cache
- Health: `/health`

**Shared**
- Node.js 22.x (Railway: 24.x Docker), npm 11.5.2, Turborepo 2.5.6
- TypeScript 5.9.2 strict, Zod 4.0.17

## Commands
**Dev**: `npm run dev` | **Clean**: `npm run dev:clean`
**Quality**: `npm run lint` | `npm run typecheck` | `npm run test:unit`
**Build**: `npm run build` | `build:frontend` | `build:backend`
**Test**: `test:integration` | `test:e2e` | `test:production`
**Database**: `npm run update-supabase-types`
**Secrets**: prefix commands with doppler

## Architecture
**State Management**
- Zustand: Global UI state, session, notifications, theme
- TanStack Query: Server state, caching, optimistic updates
- TanStack Form: Form state
- URL State: Navigation, filters via Next.js router

**Frontend Structure**
- `components/`: Pure UI (MagicUI + ShadCN)
- `hooks/api/`: TanStack Query hooks
- `lib/`: Utilities, API clients, validation
- `stores/`: Zustand global state
- `providers/`: React context providers

**Backend Structure**
- `shared/`: Guards, decorators, filters, types
- `auth/`, `billing/`, `properties/`, `tenants/`, `maintenance/`, `dashboard/`: Domain modules

## Monorepo
- `apps/`: frontend, backend
- `packages/`: shared (build first), emails, eslint-config, typescript-config

Build dependencies: shared → frontend/backend

## Deployment
**Frontend (Vercel)**: https://tenantflow.app - Auto-deploys from main
**Backend (Railway)**: https://api.tenantflow.app - Dockerfile, startCommand = `node apps/backend/dist/main.js`

## Critical Files
- `apps/frontend/src/stores/app-store.ts`: Main Zustand store
- `apps/frontend/src/lib/api-client.ts`: Core API client
- `apps/frontend/src/lib/query-keys.ts`: TanStack Query cache keys
- `apps/backend/src/shared/`: Backend utilities
- `packages/shared/src/types/`: Shared TypeScript types

## Testing Strategy
### MANDATORY TEST COVERAGE
- **Controllers**: All endpoints with auth, validation, error handling
- **Services**: All business logic with edge cases and error scenarios
- **Critical Paths**: Auth, billing, user management, core business entities

### TEST QUALITY STANDARDS
- **Edge Cases**: Invalid inputs, missing data, network failures
- **Security**: Authorization, input validation, data sanitization
- **Performance**: Concurrent requests, timeout handling
- **Integration**: Database operations, external service calls

### TEST ORGANIZATION
- Unit tests: `/src/**/*.spec.ts`
- Integration tests: `/src/**/*.integration.spec.ts`
- Use SilentLogger for clean test output
- Mock external dependencies (Supabase, Stripe, Email)

### TESTING REQUIREMENTS
- Controllers: All endpoints with auth validation
- Services: Business logic with edge cases
- Mock external dependencies (Supabase, Stripe, Email)
- Mirror production behavior exactly

## Success Metrics
Your success = Production-ready code with zero duplication
Every line must justify its existence
When in doubt, delete it
