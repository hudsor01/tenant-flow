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
- **Data**: TanStack Query (see CUSTOM HOOKS section) | **Forms**: TanStack Form | **State**: Zustand
- **Styles**: Tailwind css variables | **Components**: Radix/ShadCN | **Dates**: date-fns

### UI COMPONENT PATTERNS
- **Buttons**: Radix Button + Tailwind | **Forms**: Radix Form + TanStack Form (see CUSTOM HOOKS section)
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
**State Management** (See CUSTOM HOOKS section for complete patterns)
- Zustand: Global UI state, session, notifications, theme
- TanStack Query: Server state, caching, optimistic updates
- TanStack Form: Form state
- URL State: Navigation, filters via Next.js router

**Frontend Structure**
- `components/`: Pure UI (MagicUI + ShadCN)
- `hooks/api/`: Custom query hooks (see CUSTOM HOOKS section)
- `hooks/`: Custom form hooks (see CUSTOM HOOKS section)
- `lib/`: Utilities, API clients, validation
- `stores/`: Zustand global state
- `providers/`: React context providers

## CUSTOM HOOKS - STANDARDIZED PATTERNS

### MANDATORY HOOK ARCHITECTURE
**This section defines ALL patterns for TanStack Query and TanStack Form hooks.**

**ABSOLUTE PROHIBITIONS - ZERO TOLERANCE**
- **NEVER create inline queries/mutations** - always use custom hooks
- **NEVER duplicate hook logic** - search for existing hooks with `rg -r "useEntityName"`
- **NEVER mix concerns** - separate query hooks from form hooks
- **NEVER skip optimistic updates** - mutations must update cache immediately
- **NEVER skip prefetching** - list views must prefetch detail views

### HOOK FILE ORGANIZATION
```
hooks/
├── api/                    # TanStack Query hooks (server state)
│   ├── use-tenant.ts      # CRUD + advanced patterns
│   ├── use-property.ts    # Follow same pattern
│   └── use-{entity}.ts    # One file per domain entity
└── use-{entity}-form.ts   # TanStack Form hooks (one per entity)
```

### TANSTACK QUERY HOOK PATTERN - MANDATORY STRUCTURE

**File Template: `hooks/api/use-{entity}.ts`**
```typescript
/**
 * {Entity} Hooks
 * TanStack Query hooks for {entity} management with Zustand integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@repo/shared/utils/api-client'
import { use{Entity}Store } from '@/stores/{entity}-store'
import type { Entity, EntityInput, EntityUpdate } from '@repo/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

// 1. QUERY KEYS (hierarchical, typed)
export const {entity}Keys = {
  all: ['{entities}'] as const,
  list: () => [...{entity}Keys.all, 'list'] as const,
  detail: (id: string) => [...{entity}Keys.all, 'detail', id] as const,
  // Add more as needed
}

// 2. QUERY HOOKS (fetch data)
export function use{Entity}(id: string) {
  const add{Entity} = use{Entity}Store((state) => state.add{Entity})
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: {entity}Keys.detail(id),
    queryFn: async () => {
      const response = await apiClient<Entity>(`${API_BASE_URL}/api/v1/{entities}/${id}`)
      return response
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,     // 5 minutes
    gcTime: 10 * 60 * 1000,        // 10 minutes
    retry: 2,
    placeholderData: () => {       // Instant loading with cached data
      const cachedList = queryClient.getQueryData<Entity[]>({entity}Keys.list())
      return cachedList?.find(e => e.id === id)
    },
    select: (entity) => {          // Update Zustand on success
      add{Entity}(entity)
      return entity
    }
  })
}

export function useAll{Entities}() {
  const set{Entities} = use{Entity}Store((state) => state.set{Entities})
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: {entity}Keys.list(),
    queryFn: async () => {
      const response = await apiClient<Entity[]>(`${API_BASE_URL}/api/v1/{entities}/all`)
      // Prefetch individual details for instant navigation
      response.forEach((entity) => {
        queryClient.setQueryData({entity}Keys.detail(entity.id), entity)
      })
      return response
    },
    staleTime: 10 * 60 * 1000,     // 10 minutes - list data rarely changes
    gcTime: 30 * 60 * 1000,         // 30 minutes cache
    retry: 2,
    structuralSharing: true,        // Prevent re-renders on identical data
    select: (data) => {
      set{Entities}(data)
      return data
    }
  })
}

// 3. MUTATION HOOKS (modify data)
export function useCreate{Entity}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: EntityInput) => {
      return await apiClient<Entity>(`${API_BASE_URL}/api/v1/{entities}`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onMutate: async (newEntity) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: {entity}Keys.list() })
      const previous = queryClient.getQueryData<Entity[]>({entity}Keys.list())

      // Optimistic update - instant UI feedback
      const tempId = `temp-${Date.now()}`
      const optimistic = { id: tempId, ...newEntity }
      queryClient.setQueryData<Entity[]>({entity}Keys.list(), (old) =>
        old ? [optimistic, ...old] : [optimistic]
      )

      return { previous }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData({entity}Keys.list(), context.previous)
      }
    },
    onSettled: () => {
      // Refetch in background (don't await)
      queryClient.invalidateQueries({ queryKey: {entity}Keys.list() })
    }
  })
}

export function useUpdate{Entity}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EntityUpdate }) => {
      return await apiClient<Entity>(`${API_BASE_URL}/api/v1/{entities}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: {entity}Keys.detail(id) })
      const previous = queryClient.getQueryData<Entity>({entity}Keys.detail(id))

      // Optimistically update detail cache
      queryClient.setQueryData<Entity>({entity}Keys.detail(id), (old) =>
        old ? { ...old, ...data } : undefined
      )

      // Also update list cache
      queryClient.setQueryData<Entity[]>({entity}Keys.list(), (old) =>
        old?.map(e => e.id === id ? { ...e, ...data } : e)
      )

      return { previous }
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData({entity}Keys.detail(id), context.previous)
      }
    }
  })
}

export function useDelete{Entity}(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient<void>(`${API_BASE_URL}/api/v1/{entities}/${id}`, {
        method: 'DELETE',
      })
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: {entity}Keys.list() })
      const previous = queryClient.getQueryData<Entity[]>({entity}Keys.list())

      // Optimistically remove from list
      queryClient.setQueryData<Entity[]>({entity}Keys.list(), (old) =>
        old?.filter(e => e.id !== id)
      )

      return { previous }
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData({entity}Keys.list(), context.previous)
      }
      options?.onError?.(err as Error)
    },
    onSuccess: () => {
      options?.onSuccess?.()
    }
  })
}

// 4. ADVANCED HOOKS (prefetching, polling, batch)
export function usePrefetch{Entity}() {
  const queryClient = useQueryClient()

  return {
    prefetch{Entity}: (id: string) => {
      return queryClient.prefetchQuery({
        queryKey: {entity}Keys.detail(id),
        queryFn: async () => {
          return await apiClient<Entity>(`${API_BASE_URL}/api/v1/{entities}/${id}`)
        },
        staleTime: 5 * 60 * 1000
      })
    }
  }
}

// 5. COMBINED HOOK (convenience)
export function use{Entity}Operations() {
  const create{Entity} = useCreate{Entity}()
  const update{Entity} = useUpdate{Entity}()
  const delete{Entity} = useDelete{Entity}()

  return {
    create{Entity},
    update{Entity},
    delete{Entity},
    isLoading: create{Entity}.isPending || update{Entity}.isPending || delete{Entity}.isPending,
    error: create{Entity}.error || update{Entity}.error || delete{Entity}.error,
  }
}
```

### TANSTACK FORM HOOK PATTERN - MANDATORY STRUCTURE

**File Template: `hooks/use-{entity}-form.ts`**
```typescript
/**
 * {Entity} Form Hooks
 * TanStack Form hooks with validation and transformers
 */

import { useForm } from '@tanstack/react-form'
import { {entity}FormSchema } from '@repo/shared/validation/{entities}'
import type { EntityInput, EntityUpdate } from '@repo/shared'
import { useCallback } from 'react'

// 1. BASIC FORM HOOK
export function use{Entity}Form(initialValues?: Partial<EntityInput>) {
  return useForm({
    defaultValues: {
      field1: '',
      field2: '',
      ...initialValues
    } as EntityInput,
    validators: {
      onSubmit: {entity}FormSchema
    }
  })
}

// 2. UPDATE FORM HOOK (nullable fields)
export function use{Entity}UpdateForm(initialValues?: Partial<EntityUpdate>) {
  return useForm({
    defaultValues: {
      field1: null,
      field2: null,
      ...initialValues
    } as EntityUpdate,
    validators: {
      onSubmit: {entity}FormSchema
    }
  })
}

// 3. FIELD TRANSFORMERS (auto-formatting)
export function use{Entity}FieldTransformers() {
  const formatField = useCallback((value: string): string => {
    // Format logic here
    return value.trim().toLowerCase()
  }, [])

  return {
    formatField,
    // Add more transformers
  }
}

// 4. ASYNC VALIDATION (uniqueness checks)
export function useAsync{Entity}Validation() {
  const checkUniqueness = useCallback(async (value: string): Promise<boolean> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''
    const response = await fetch(`${API_BASE_URL}/api/v1/{entities}/check?value=${value}`)
    const data = await response.json() as { available: boolean }
    return data.available
  }, [])

  return {
    validateAsync: async (value: string) => {
      const isAvailable = await checkUniqueness(value)
      return isAvailable ? undefined : { field: 'Value already exists' }
    }
  }
}

// 5. CONDITIONAL FIELDS (show/hide logic)
export function useConditional{Entity}Fields(formData: Partial<EntityInput>) {
  return {
    shouldShowField: !!formData.field1,
    isComplete: !!formData.field1 && !!formData.field2
  }
}
```

### HOOK USAGE PATTERNS - MANDATORY CONVENTIONS

**Pattern 1: List View with Prefetching**
```typescript
function {Entity}List() {
  const { data: {entities} } = useAll{Entities}()
  const { prefetch{Entity} } = usePrefetch{Entity}()

  return (
    <ul>
      {{entities}?.map(entity => (
        <Link
          key={entity.id}
          href={`/{entities}/${entity.id}`}
          onMouseEnter={() => prefetch{Entity}(entity.id)}
        >
          {entity.name}
        </Link>
      ))}
    </ul>
  )
}
```

**Pattern 2: Detail View with Caching**
```typescript
function {Entity}Detail({ id }: { id: string }) {
  const { data: entity, isLoading } = use{Entity}(id)

  if (isLoading) return <Skeleton />
  return <div>{entity.name}</div>
}
```

**Pattern 3: Create Form with Transformers**
```typescript
function Create{Entity}Form() {
  const form = use{Entity}Form()
  const { formatField } = use{Entity}FieldTransformers()
  const create{Entity} = useCreate{Entity}()

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      create{Entity}.mutateAsync(form.state.values)
    }}>
      <form.Field name="field1">
        {(field) => (
          <input
            value={field.state.value || ''}
            onChange={(e) => {
              const formatted = formatField(e.target.value)
              field.handleChange(formatted)
            }}
          />
        )}
      </form.Field>
    </form>
  )
}
```

**Pattern 4: Update Form with Optimistic UI**
```typescript
function Edit{Entity}Form({ id }: { id: string }) {
  const { data: entity } = use{Entity}(id)
  const form = use{Entity}UpdateForm(entity)
  const update{Entity} = useUpdate{Entity}()

  const handleSubmit = async (data: EntityUpdate) => {
    await update{Entity}.mutateAsync({ id, data })
    // UI already updated optimistically
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### HOOK IMPLEMENTATION CHECKLIST

**Before Creating a New Hook:**
- [ ] Search for existing hook: `rg -r "use{Entity}"`
- [ ] Check if entity has Zustand store
- [ ] Verify API endpoints exist
- [ ] Review validation schema in `@repo/shared`

**Required Components for Each Entity:**
- [ ] Query keys factory with hierarchical structure
- [ ] Query hooks: `use{Entity}`, `useAll{Entities}`
- [ ] Mutation hooks: `useCreate`, `useUpdate`, `useDelete`
- [ ] Prefetch hook: `usePrefetch{Entity}`
- [ ] Form hook: `use{Entity}Form`
- [ ] Field transformers if needed
- [ ] Async validation if needed

**Required Features:**
- [ ] Optimistic updates on all mutations
- [ ] Placeholder data from cache
- [ ] Zustand store integration
- [ ] Proper error handling with rollback
- [ ] Prefetching for list → detail navigation
- [ ] Structural sharing enabled
- [ ] Appropriate stale/gc times

**Documentation Requirements:**
- [ ] JSDoc comments on all exported functions
- [ ] Usage examples in comments
- [ ] Reference implementation guide
- [ ] Migration notes if replacing old patterns

### PERFORMANCE REQUIREMENTS

**Cache Configuration:**
- List queries: 10-minute stale time, 30-minute gc time
- Detail queries: 5-minute stale time, 10-minute gc time
- Always enable `structuralSharing: true`
- Always use `placeholderData` from cache

**Optimistic Updates:**
- REQUIRED for all mutations (create, update, delete)
- Must include rollback on error
- Must update both detail and list caches
- Must cancel in-flight queries before updating

**Prefetching:**
- REQUIRED on list views (hover on links)
- Prefetch detail when list item is hovered
- Cache prefetched data with same stale time
- Use `queryClient.prefetchQuery()` not `fetchQuery()`

### REFERENCE IMPLEMENTATIONS
**Production Examples:**
- `apps/frontend/src/hooks/api/use-tenant.ts` - Complete TanStack Query hook pattern
- `apps/frontend/src/hooks/use-tenant-form.ts` - Complete TanStack Form hook pattern
- `apps/frontend/src/stores/tenant-store.ts` - Zustand store pattern
- `apps/frontend/src/contexts/tenant-context.tsx` - Context provider pattern

**Documentation:**
- `apps/frontend/src/hooks/api/TENANT_HOOKS_GUIDE.md` - Comprehensive usage guide
- `apps/frontend/ARCHITECTURE_DIAGRAM.md` - Architecture patterns
- `apps/frontend/IMPLEMENTATION_SUMMARY.md` - Implementation details

### VIOLATIONS AND FIXES

**❌ WRONG - Inline Query:**
```typescript
const { data } = useQuery({
  queryKey: ['entities'],
  queryFn: () => fetch('/api/entities')
})
```

**✅ CORRECT - Custom Hook:**
```typescript
const { data } = useAllEntities()
```

**❌ WRONG - No Optimistic Update:**
```typescript
const mutation = useMutation({
  mutationFn: createEntity,
  onSuccess: () => {
    queryClient.invalidateQueries(['entities'])
  }
})
```

**✅ CORRECT - With Optimistic Update:**
```typescript
const createEntity = useCreateEntity()
// Optimistic update built-in, UI updates instantly
```

**❌ WRONG - No Prefetching:**
```typescript
<Link href={`/entities/${id}`}>View</Link>
```

**✅ CORRECT - With Prefetching:**
```typescript
const { prefetchEntity } = usePrefetchEntity()
<Link onMouseEnter={() => prefetchEntity(id)}>View</Link>
```

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
- `apps/frontend/src/hooks/api/`: Custom query hooks (see CUSTOM HOOKS section)
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
