# TenantFlow Development Guide

When providing commit messages, never include attribution.

## BEFORE EVERY ACTION: USE MCP SERVER SERENA! Activate project if not available.

Maintain `.cursor/rules/learned-memories.md` for project knowledge and user preferences. Check before answering, update when user shares new decisions.

## Project Structure
Turborepo monorepo: `apps/frontend` (Next.js 15/React 19), `apps/backend` (NestJS), `packages/shared` (types/validation/utils), `packages/eslint-config`, `packages/typescript-config`, `packages/database`.

## Core Principles
- **DRY**: Search first (`rg -r "pattern"`), consolidate code reused ≥2 places
- **KISS**: Simplest solution wins, delete > add code
- **NO ABSTRACTIONS**: Use native platform features directly, no wrappers/factories/custom layers
- **NO EMOJIS**: Professional communication only, use Lucide Icons for UI
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious

## Tech Stack
**Frontend (Vercel)**: Next.js 15 + React 19 + TailwindCSS 4 + ShadCN/UI + TanStack Query 5 + Zustand 5 (UI/preferences only) + Lucide Icons

**Backend (Railway)**: NestJS + Supabase + Stripe + Resend

**Shared**: Node.js, pnpm, Turborepo, TypeScript strict, Zod

## Commands

| Category | Command |
|----------|---------|
| **Dev** | `pnpm dev` / `doppler run -- pnpm dev` |
| **Quality** | `pnpm typecheck` / `pnpm lint` / `pnpm test:unit` |
| **Build** | `pnpm build` / `pnpm build:frontend` / `pnpm build:backend` |
| **Test** | `pnpm test:integration` / `pnpm test:e2e` |
| **DB** | `pnpm update-supabase-types` |
| **Migration** | `doppler run -- psql $DIRECT_URL -f file.sql` |

## Data Fetching Architecture

**ARCHITECTURE**: Separated deployment (Vercel frontend → Railway NestJS backend → Supabase)

**PHILOSOPHY**: Server-first. No mock data. Direct API calls. See `apps/frontend/API_PATTERNS.md`.

**Universal API Client**: `packages/shared/src/utils/api-client.ts` - auto-detects browser/server, type-safe

**ALL endpoints**: `apps/frontend/src/lib/api-client.ts`

### Patterns by Use Case

| Use Case | Pattern | Example |
|----------|---------|---------|
| **Initial page load** | Server Component + `createServerApi()` | `async function Page() { const api = createServerApi(token); const data = await api.tenants.list() }` |
| **Simple mutations** (single API call, no retries, single component) | Direct API + `useTransition` | `startTransition(async () => { await tenantsApi.delete(id); router.refresh() })` |
| **Complex mutations** (retries, versioning, multi-cache, global errors) | `useMutation` + cache invalidation | `useMutation({ mutationFn: api.create, onSuccess: () => queryClient.invalidateQueries(), retry: 3 })` |
| **Optimistic UI** (single component) | `useOptimistic` + `useTransition` | `const [optimistic, add] = useOptimistic(data, (state, item) => [...state, item])` |
| **Optimistic UI** (multi-component) | `useMutation` with cache updates | `onMutate: async () => { queryClient.setQueryData(['items'], old => [...old, newItem]) }` |
| **Polling/Real-time** | TanStack Query `useQuery` + `refetchInterval` | `useQuery({ queryKey: ['stats'], queryFn: api.stats, refetchInterval: 30000 })` |
| **Infinite scroll** | TanStack Query `useInfiniteQuery` | `useInfiniteQuery({ queryKey: ['tenants'], queryFn: ({ pageParam}) => api.list(pageParam) })` |
| **Prefetch on hover** | TanStack Query `usePrefetchQuery` | `onMouseEnter={() => queryClient.prefetchQuery({ queryKey: ['tenant', id] })}` |

### State Management

- **Remote State**: Server Components first, TanStack Query for client-side queries
- **URL State**: nuqs
- **Local State**: useState/useReducer
- **Shared State**: Prop drilling or Context
- **UI Preferences**: Zustand ONLY (theme, view density, form wizard state)

### Zustand Rules

- ✅ **USE**: Theme, view density, multi-step form progress, UI layout preferences
- ❌ **NEVER**: Entity data (tenants, properties, units, leases), API responses, computed state
- **Files**: `preferences-store.ts`, `ui-store.ts`, `auth-store.ts` (session metadata only)

### Server Components (Default)

Use for: Initial loads, dashboards, SEO pages, read-only data

```tsx
// Pattern: Async Server Component
export default async function TenantsPage() {
  const { accessToken } = await requireSession()
  const serverApi = createServerApi(accessToken)
  const tenants = await serverApi.tenants.list({ limit: 50 })
  return <TenantsClient initialTenants={tenants} />
}
```

### Client Components (When Required)

Use for: Forms, URL state, dialogs, filtering, real-time, infinite scroll, complex interactions

```tsx
// Pattern A: Simple Mutation (Direct API + useTransition)
// Use when: Single API call, no retries, single component affected
'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { tenantsApi } from '#lib/api-client'
import { toast } from 'sonner'

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      try {
        await tenantsApi.delete(id)
        router.refresh()
        toast.success('Deleted')
      } catch (error) {
        toast.error('Failed to delete')
      }
    })
  }

  return <Button onClick={handleDelete} disabled={isPending}>Delete</Button>
}
```

```tsx
// Pattern B: Complex Mutation (useMutation)
// Use when: Need retries, versioning, multi-cache coordination, or global error handling
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi } from '#lib/api-client'
import { toast } from 'sonner'

export function CreatePropertyForm() {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: (data) => propertiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Created')
    },
    retry: 3,
    onError: (error) => {
      if (error.status === 409) {
        // Handle version conflict
        queryClient.invalidateQueries({ queryKey: ['properties'] })
        toast.error('Data changed, please refresh')
      } else {
        toast.error(error.message)
      }
    }
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate(formData) }}>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Property'}
      </Button>
    </form>
  )
}
```

### Optimistic Updates

**Single Component (React 19 useOptimistic):**

Use `useOptimistic` + `useTransition` for component-scoped instant UI feedback:

```tsx
'use client'
import { useOptimistic, useTransition } from 'react'
import { tenantsApi } from '#lib/api-client'

export function TenantsList({ initialTenants }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticTenants, updateOptimistic] = useOptimistic(
    initialTenants,
    (state, action: { type: 'add' | 'remove', tenant?: Tenant, id?: string }) => {
      if (action.type === 'add') return [...state, action.tenant]
      if (action.type === 'remove') return state.filter(t => t.id !== action.id)
      return state
    }
  )

  function handleDelete(id: string) {
    startTransition(async () => {
      updateOptimistic({ type: 'remove', id })
      await tenantsApi.delete(id)
      // React auto-rollbacks on error
    })
  }

  return <ul>{optimisticTenants.map(t => ...)}</ul>
}
```

**Multiple Components (TanStack Query Cache):**

Use `useMutation` with cache-based optimistic updates for cross-component synchronization:

```tsx
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantsApi } from '#lib/api-client'
import { toast } from 'sonner'

export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tenantsApi.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['tenants'] })

      // Snapshot for rollback
      const previousTenants = queryClient.getQueryData(['tenants'])

      // Optimistic update
      queryClient.setQueryData(['tenants'], (old) =>
        old?.filter(t => t.id !== id)
      )

      return { previousTenants }
    },
    onError: (err, id, context) => {
      // Rollback on error
      queryClient.setQueryData(['tenants'], context.previousTenants)
      toast.error('Failed to delete')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    }
  })
}
```

### TanStack Query (Client-Side Queries Only)

**USE FOR:**
- Polling/real-time updates (`refetchInterval`)
- Infinite scroll (`useInfiniteQuery`)
- Prefetching on hover
- Client-side dashboards
- Focus refetch
- Background refetching

**Query Keys (Hierarchical):**
```tsx
export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters: string) => [...tenantKeys.lists(), { filters }] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const
}
```

**Query Pattern:**
```tsx
const { data, isLoading } = useQuery({
  queryKey: tenantKeys.detail(id),
  queryFn: () => tenantsApi.get(id),
  staleTime: 5 * 60 * 1000, // 5min
  gcTime: 10 * 60 * 1000 // 10min
})
```

**Mutations Decision Criteria:**

**Use Direct API + useTransition when ALL are true:**
- Single API call
- No retry logic needed
- No optimistic locking/versioning (no 409 conflict handling)
- Single component uses the result
- No complex cache coordination (e.g., just invalidate one query key)

**Use useMutation when ANY are true:**
- Need retry logic (network failures, rate limiting)
- Optimistic locking with version conflict detection (409 errors)
- Multiple cache keys need coordination (list + detail + stats)
- Used by multiple components (need centralized logic)
- Background mutations (fire-and-forget with error tracking)
- Global error handling patterns (centralized toast notifications)

```tsx
// ✅ SIMPLE: Direct API + useTransition
// Delete from table view - single API call, no retries, toast on error
function handleDelete(id: string) {
  startTransition(async () => {
    try {
      await tenantsApi.delete(id)
      router.refresh()
      toast.success('Deleted')
    } catch (error) {
      toast.error('Failed to delete')
    }
  })
}

// ✅ COMPLEX: useMutation
// Create property with version tracking, multi-cache invalidation
const createProperty = useMutation({
  mutationFn: (data) => propertiesApi.create(data),
  onSuccess: () => {
    // Invalidate multiple related caches
    queryClient.invalidateQueries({ queryKey: ['properties'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  },
  retry: 3,
  onError: (error) => {
    if (error.status === 409) {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.error('Data changed, please refresh and try again')
    } else {
      toast.error(error.message)
    }
  }
})
```

**When in doubt:** Use `useMutation` - it's the TanStack Query v5 recommended pattern for mutations and provides better state management, error handling, and cache coordination.

### Decision Tree

```
Initial page load (SSR/SEO)?
├─ YES → Server Component + createServerApi()
└─ NO  → Continue ↓

Mutation (POST/PUT/DELETE)?
├─ YES → Complex mutation? (ANY true: retries, versioning, multi-cache, global errors)
│   ├─ YES → useMutation + queryClient.invalidateQueries()
│   │         • Centralized error handling
│   │         • Retry logic
│   │         • Cache coordination
│   │
│   └─ NO  → Direct API + useTransition
│             • Simpler code
│             • Less overhead
│             • Good for simple CRUD
│
└─ NO  → Continue ↓

Need optimistic UI?
├─ Single component? → useOptimistic + useTransition + Direct API
│                       • Component-scoped
│                       • Automatic rollback
│
└─ Multiple components? → useMutation with cache-based optimistic updates
                          • Cross-component sync
                          • TanStack Query cache

Need polling/infinite scroll? → TanStack Query useQuery/useInfiniteQuery

Simple client data? → useState/useReducer
```

### PROHIBITIONS

- ❌ Server Actions (use direct API calls - frontend and backend are separated)
- ❌ Inline queries/mutations (extract to hooks)
- ❌ `useEffect` + `fetch` (use Server Components or TanStack Query)
- ❌ Mock data (always call real API)
- ❌ Entity data in Zustand (use TanStack Query cache)
- ❌ Route Handlers for mutations (use direct API calls to Railway backend)

### Cache Configuration

- **Lists**: `staleTime: 10min`, `gcTime: 30min`
- **Details**: `staleTime: 5min`, `gcTime: 10min`
- **Stats/Analytics**: `staleTime: 1min`, `gcTime: 5min`
- **Real-time**: `refetchInterval: 30000` (30s)

## Database Migrations

**READ-ONLY MCP**: All writes via `doppler run -- psql $DIRECT_URL -f file.sql`

**Workflow**: Create SQL → Apply with DIRECT_URL → Verify → `pnpm update-supabase-types` → Commit

**Connection Strings**:
- `DIRECT_URL`: DDL (CREATE, ALTER, DROP)
- `DATABASE_URL`: DML (SELECT, INSERT, UPDATE)

## TypeScript Types - ZERO TOLERANCE

**Location**: `packages/shared/src/types/`

**Core Files**: `index.ts` (export hub), `supabase-generated.ts` (GENERATED, don't modify)

**Domain Files**: `core.ts`, `entities.ts`, `auth.ts`, `backend-domain.ts`, `frontend.ts`, `domain.ts`

**Create new file when**: New domain, >300 lines, clear boundary, used by frontend AND backend

**Organization**: Domain cohesion, Core ← Domain ← UI, 100-200 lines, `{domain}.ts`

### PROHIBITIONS
1. NEVER duplicate types - search first: `rg -r "TypeName" packages/shared/src/`
2. NEVER import from removed paths - use `@repo/shared` only
3. NEVER use custom utility types when native TS exists (Omit, Partial, Pick)
4. NEVER break single source of truth
5. NEVER create circular dependencies

### Before Adding
1. Search: `rg -r "NewTypeName" packages/shared/src/`
2. Check native TypeScript
3. Verify domain
4. PascalCase for types, camelCase for properties

### Before Modifying
1. `pnpm typecheck` before AND after
2. Check impact: `rg -r "TypeName"`
3. Prefer optional fields over removing required
4. Document breaking changes

**Performance**: Single import, ≤3s compilation, instant intellisense, zero circular deps

**Violation**: PR rejection, mandatory refactor

## Type Constants (October 2025)

**Database Enums (23 types)**: Use `Database['public']['Enums']['enum_name']`

ActivityEntityType, BlogCategory, BlogStatus, customer_invoice_status, DocumentType, invitation_status, LateFeeType, LeaseStatus, LeaseType, MaintenanceCategory, PlanType, Priority, PropertyStatus, PropertyType, ReminderStatus, ReminderType, RentChargeStatus, RentPaymentStatus, RequestStatus, SubStatus, TenantStatus, UnitStatus, UserRole

**New Enums**: SQL migration → `psql $DIRECT_URL` → `pnpm update-supabase-types`

**App Constants**: `const STATUS = { ACTIVE: 'active' } as const; type Status = typeof STATUS[keyof typeof STATUS]`

### FORBIDDEN
- ❌ TypeScript `enum` declarations (except `security.ts` for monitoring)
- ❌ Duplicating database enum values
- ❌ Union types mirroring database enums
- ❌ String literals instead of generated types

**Supabase migrations and auto gen types**
After any database migration, always run:
pnpm update-supabase-types

## Backend - Ultra-Native NestJS

**ALLOWED**: Official @nestjs/* packages, built-in pipes/guards/decorators, native exceptions, direct Supabase RPC

**FORBIDDEN**: Custom decorators/pipes/interceptors/events, wrappers, helpers, factories, builders, custom errors

**DECISION**: Published on npm under @nestjs/* or official docs = allowed. You're creating it = forbidden.

### Validation (nestjs-zod ONLY)

**Method**: `nestjs-zod` + `createZodDto()` + `ZodValidationPipe` (globally configured in app.module.ts)

**Schemas**: Define in `packages/shared/src/validation/*.schemas.ts` using Zod

**DTOs**: Create classes with `createZodDto(schema)` in controller dto/ folders

**Why Classes**: Runtime existence, reflection metadata, decorator support (interfaces erased at runtime)

**Global Pipe**: `APP_PIPE` provider with `ZodValidationPipe` in app.module.ts

**Pattern:**
```typescript
// 1. Define schema in packages/shared/src/validation/tenant.schemas.ts
export const createTenantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email()
})

// 2. Create DTO in apps/backend/src/modules/tenants/dto/create-tenant.dto.ts
export class CreateTenantDto extends createZodDto(createTenantSchema) {}

// 3. Use in controller
@Post()
create(@Body() dto: CreateTenantDto) {
  return this.tenantsService.create(dto)
}
```

**Output**: `class-transformer` + ClassSerializerInterceptor - `@Exclude()` for sensitive fields

**Validation Groups**: `.partial()`, `.pick()`, `.omit()` (Zod built-in, NOT custom)

**FORBIDDEN:**
- ❌ Manual inline validation in controllers
- ❌ `class-validator` decorators (`@IsString`, `@IsEmail`, etc.)
- ❌ Custom decorators/pipes
- ❌ DTO factories
- ❌ Custom base classes
- ❌ Wrappers around validation

### Patterns
- SharedModule (@Global()): Guards, pipes, Logger, Reflector
- Domain Modules: Controller + Service + Module (flat, no sub-modules)
- Route Ordering: Static before dynamic
- Controllers: Delegate to services
- Services: Direct Supabase RPC, <30 lines/method
- Guards: Constructor init, Reflector metadata, cache lookups
- Caching: `@CacheKey` + `@CacheTTL`
- Context: `@Request() req: AuthenticatedRequest`
- Errors: Built-in exceptions only

### DI Checklist
1. Service in `providers[]`?
2. Controller using service layer?
3. `@Injectable()` decorator?
4. Module imports dependencies?
5. No circular deps?
6. Constructor types match?

**Testing**: Every endpoint, all service logic, mock externals, SilentLogger, mirror production

## Frontend - Hook-First

**PHILOSOPHY**: Direct API calls for mutations. TanStack Query for client-side data fetching only.

**Organization**: `hooks/api/use-{entity}.ts` (TanStack Query), `hooks/use-{entity}-form.ts` (TanStack Form)

### TanStack Query Hooks (Read-Only)

- **Keys**: Hierarchical (`entityKeys.all`, `entityKeys.list()`, `entityKeys.detail(id)`)
- **Hooks**: `useEntity(id)`, `useAllEntities()`, `useEntityList(filters)`
- **Prefetch**: `usePrefetchEntity()` for hover
- **Cache**: Single source of truth for client-side queries

```tsx
// hooks/api/use-tenant.ts
export const useTenant = (id: string) =>
  useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => tenantsApi.get(id),
    staleTime: 5 * 60 * 1000
  })

export const usePrefetchTenant = () => {
  const queryClient = useQueryClient()
  return (id: string) =>
    queryClient.prefetchQuery({
      queryKey: tenantKeys.detail(id),
      queryFn: () => tenantsApi.get(id)
    })
}
```

### Mutations

**Pattern Selection:** Choose based on complexity (per TanStack Query v5 official guidance)

**Simple Mutations** (Direct API + `useTransition`):
- Single API endpoint
- No retry requirements
- Single component affected
- No optimistic locking/versioning
- Example: Delete button in table row

```tsx
const [isPending, startTransition] = useTransition()
const router = useRouter()

function handleDelete(id: string) {
  startTransition(async () => {
    try {
      await tenantsApi.delete(id)
      router.refresh()
      toast.success('Deleted')
    } catch (error) {
      toast.error('Failed to delete')
    }
  })
}
```

**Complex Mutations** (`useMutation`):
- Needs retry logic
- Optimistic locking with version conflict detection
- Multiple cache keys to coordinate
- Used across multiple components
- Background mutations
- Global error handling patterns
- Examples: Create with versioning, Update with 409 handling, Image upload with retries

```tsx
const queryClient = useQueryClient()
const { mutate, isPending } = useMutation({
  mutationFn: (data) => propertiesApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    toast.success('Created')
  },
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  onError: (error) => {
    if (error.status === 409) {
      // Version conflict - refresh and notify
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.error('Data changed, please refresh and try again')
    } else {
      toast.error(error.message)
    }
  }
})
```

**When in doubt:** Use `useMutation` - it's the TanStack Query v5 recommended pattern for mutations and provides better state management, error handling, and cache coordination out of the box.

### TanStack Form

- Basic: `useEntityForm()`
- Update: `useEntityUpdateForm()`
- Transformers: `useEntityFieldTransformers()`
- Async validation: `useAsyncEntityValidation()`

### REQUIREMENTS

- ✅ Hover prefetching
- ✅ Structural sharing
- ✅ Hierarchical query keys
- ✅ Cache configuration (staleTime/gcTime)
- ✅ TanStack Query cache as single source of truth

### PROHIBITIONS

- ❌ Inline queries/mutations (extract to hooks)
- ❌ Duplicate hooks (search first: `rg "useTenant"`)
- ❌ Mix concerns (separate query/form/validation hooks)
- ❌ Mock data (always call real API)
- ❌ Entity data in Zustand (use TanStack Query cache)
- ❌ `useEffect` + `fetch` (use TanStack Query or Server Components)

## CSS - TailwindCSS 4.1

**90% Tailwind utilities**, 10% design tokens (`@theme`)

**Utilities**: Layout, typography, colors, responsive, container queries, states

**Tokens**: Brand colors, fonts, semantic colors, spacing, border radius, animations (in `globals.css`)

**NEVER**: Inline styles, CSS modules, custom classes, pixel values

**Container Queries**: `@container` div + `@sm:`, `@md:`, `@lg:`, `@xl:` prefixes

**Requirements**:
- Touch-first: 44px min height (`min-h-11`)
- Loading: <200ms none, 200-1000ms spinner, >1000ms progress
- Typography: 5 levels max (text-xs to text-2xl)
- Colors: OKLCH only
- Animations: 200-300ms

**Principles**: Reuse first, ShadCN/Magic UI, flat organization, Zustand for UI preferences only (NOT entity data), direct hooks (no prop drilling), shadcn charts

## Code Quality

**ESLint Rules (ERRORS)**:
1. `no-typescript-enums` - Database enums only (except `security.ts`)
2. `no-client-fetch-on-mount` - No `useEffect + fetch`
3. `no-factory-patterns` - No abstraction layers

**Pre-commit**: Validation only (no auto-fix). `pnpm lint:fix` for manual fixes.

**Playwright MCP**: `claude mcp add playwright npx -- @playwright/mcp@latest`

**Commands**: `pnpm lint:fix`, `prettier --write`, `pnpm typecheck`, `pnpm validate`

### Pre-Change Checklist
1. Does this exist? (`rg -r "pattern"`)
2. Native platform feature?
3. Can I delete instead?
4. Simplest solution?
5. Immediately understandable?
6. Accessible? (WCAG 2.1 AA)
7. Consistent?

## Deployment

**Frontend**: Vercel (https://tenantflow.app) - auto-deploy from main

**Backend**: Railway (https://api.tenantflow.app) - Dockerfile, `node apps/backend/dist/main.js`

**Known Warning**: Vercel middleware warning (cosmetic, non-breaking)

**Security**: validator.js CVE-2025-56200 - LOW risk (transitive dep, not used directly)

## Turborepo

**TypeScript**:
- ❌ NO Project References (conflicts with Turbo)
- ✅ Independent tsconfig per package
- ✅ Backend `composite: true`
- ✅ Node.js `imports` over TS `paths`

**Frontend imports**: `#components/*`, `#lib/*`, `#hooks/*`, `#stores/*`, `#types/*`, `#providers/*`

**Caching**: `.turbo` cached in CI, 70-90% speedup

**Env Validation**: `eslint-config-turbo` validates `process.env.*` in `turbo.json`

**Doppler**: All env vars via `doppler run --`

**pnpm Catalogs**: Centralized versions in `pnpm-workspace.yaml`

**Tools**: `turbo ls`, `turbo query`, `syncpack`, `manypkg check`

### Pitfalls (AVOID)
1. ❌ TypeScript Project References
2. ❌ TypeScript `paths`
3. ❌ Missing env vars in turbo.json
4. ❌ Root file changes (invalidates caches)
5. ❌ Nested packages (use `apps/*`, `packages/*` only)

**Validation**: `pnpm typecheck && pnpm lint && pnpm build`

**Results**: 30-50% faster local, 70-90% faster CI, zero conflicts, better IDE

## Reference Implementations

**Hooks**: `hooks/api/use-tenant.ts`, `hooks/use-tenant-form.ts`, `stores/tenant-store.ts`

**Server Components**: `manage/properties/page.tsx`, `manage/tenants/page.tsx`, `manage/maintenance/page.tsx`

**Client Components**: `manage/leases/page.tsx`, `manage/units/page.tsx`, `tenant/tenants-table.client.tsx`

## Critical Files

**Build**: shared → frontend/backend

**Frontend**: `stores/app-store.ts`, `lib/api-client.ts`, `hooks/api/`, `providers/`

**Backend**: `shared/`, `{domain}/` (auth, billing, properties, tenants, maintenance, dashboard)

**Shared**: `packages/shared/src/types/`, `packages/shared/src/validation/`, `packages/shared/src/utils/`
