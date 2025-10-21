# TenantFlow Development Guide

When providing commit messages, never include attribution.

## Core Principles (Non-Negotiable)
- **DRY**: Search first (`rg -r "pattern"`), consolidate code reused ≥2 places
- **KISS**: Simplest solution wins, delete > add code
- **NO ABSTRACTIONS**: Use native platform features directly, no wrappers/factories/custom layers
- **NO EMOJIS**: Professional communication only, use Lucide Icons for UI elements
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious, reliability-focused

## Tech Stack
**Frontend (Vercel)**: Next.js 15.5.0 + React 19.1.1 + TailwindCSS 4.1.12 + ShadCN/UI + Magic UI + TanStack Query 5.85.5 + Zustand 5.0.8 + TanStack Form + Lucide Icons 0.540.0 + Recharts 3.1.2

**Backend (Railway)**: NestJS 11.1.6 + Fastify 11.x + Supabase 2.56.0 + Stripe 18.4.0 + Resend 6.0.1 + In-memory cache

**Shared**: Node.js 22.x (Railway: 24.x Docker), npm 11.5.2, Turborepo 2.5.6, TypeScript 5.9.2 strict, Zod 4.0.17

## Commands
```bash
# Development
pnpm dev                       # Start all services
doppler run -- pnpm dev        # With secrets (local only, NO CI/prod)
pnpm --filter @repo/pkg dev    # Specific package

# Quality Checks
pnpm typecheck | pnpm lint | pnpm test:unit

# Build
pnpm build | pnpm build:frontend | pnpm build:backend

# Testing
pnpm test:integration | pnpm test:e2e | pnpm test:production

# Database
pnpm update-supabase-types                    # Regenerate TypeScript types from schema

# Database Migrations (psql ONLY - MCP server is read-only)
doppler run -- psql $DATABASE_URL -f migration.sql   # Apply migration (preferred)
doppler run -- psql $DIRECT_URL -f migration.sql     # Direct connection (if pooler fails)
```

## Remote State
Anything coming from a backend, API, database, etc., could be handled by a data-fetching library. TanStack Query or SWR are the most popular choices these days. They solve caching, deduplication, invalidation, retries, pagination, optimistic updates, and many more, and likely much better than any manual implementation.

## Query params in URL state
If your router doesn't support syncing those with local state, use nuqs and save yourself massive pain implementing that sync manually.

## Local State
A lot of the state doesn't need to be shared, actually. It's just something that comes from overusing Redux in the past. Use React's useState or useReducer in this case.

## Shared State
This is the state that you want to share between different loosely related components. You can use simple prop drilling techniques for that, or Context when prop drilling becomes a nuisance. Only when Context is not enough do the state management libraries become useful.

## Database Migrations - psql Method
**IMPORTANT**: The Supabase MCP server is **READ-ONLY**. All database writes (DDL/DML) MUST use psql with Doppler secrets.

**Migration Workflow**:
1. Create migration SQL file (descriptive name, not timestamp-based)
2. Apply via psql: `doppler run -- psql $DATABASE_URL -f your-migration.sql`
3. Verify success with MCP read tools: `mcp__supabase-mcp__execute_sql`
4. Regenerate types: `pnpm update-supabase-types`
5. Commit migration file to repo for team/deployment tracking

**Connection Strings** (via Doppler):
- `DATABASE_URL` - Pooled connection (preferred, handles concurrency)
- `DIRECT_URL` - Direct Postgres connection (use if pooler has issues)

**Example**:
```bash
# Create migration file
cat > add-sale-fields.sql <<'EOF'
ALTER TABLE property ADD COLUMN date_sold TIMESTAMPTZ;
EOF

# Apply migration
doppler run -- psql $DATABASE_URL -f add-sale-fields.sql

# Verify
doppler run -- psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='property';"

# Regenerate types
pnpm update-supabase-types
```

## TypeScript Types - ZERO TOLERANCE POLICY

**Structure** (`packages/shared/src/types/`):
- `core.ts` - PRIMARY: API patterns (ApiResponse, QueryParams), entities (Property, Tenant, Unit), utilities (DeepReadonly, Result<T,E>), dashboard stats
- `domain.ts` - Contact forms, storage uploads, websocket messages, session/user management, theme types, webhooks
- `backend-domain.ts` - authUser, Context, AuthenticatedContext, router outputs, config, performance metrics, health checks
- `auth.ts` - authUser, LoginCredentials, RegisterCredentials, JWT payloads, permissions, security validation
- `supabase-generated.ts` - Database types (GENERATED, never modify manually)
- `frontend.ts` - UI-specific types ONLY
- `index.ts` - EXPORT HUB: Single import source

**ABSOLUTE PROHIBITIONS**:
1. **NEVER create new type files** without explicit approval
2. **NEVER duplicate type definitions** - search first: `rg -r "TypeName" packages/shared/src/`
3. **NEVER import from removed/legacy paths**
4. **NEVER use custom utility types** when native TS 5.9.2 equivalents exist (use Omit, Partial, Pick, etc.)
5. **NEVER break single source of truth** - consolidation is permanent

**Before Adding Any Type**:
1. Search existing: `rg -r "NewTypeName" packages/shared/src/`
2. Check if native TypeScript utility exists
3. Verify it belongs in existing consolidated file
4. Follow naming: `PascalCase` for types, `camelCase` for properties

**Before Modifying Types**:
1. Run: `pnpm typecheck`
2. Check breaking changes across frontend/backend
3. Update with backward compatibility when possible
4. Document migration path if breaking

**Performance Requirements**:
- Single import rule: `import type { A, B, C } from '@repo/shared'`
- Build speed: TypeScript compilation ≤3 seconds for shared package
- IDE performance: Instant intellisense, no lag
- Zero circular dependencies (violations break build)

**Violation Consequences**: PR rejection, mandatory refactor before merge

## Enum Standardization
**SINGLE SOURCE OF TRUTH**: Database enums via Supabase generated types ONLY

**FORBIDDEN**:
- Creating TypeScript enum definitions (`enum MyEnum { ... }`)
- Duplicating database enum values in code
- Creating union types that mirror database enums
- Using string literals instead of generated enum types

## Backend - Ultra-Native NestJS (75% Code Reduction)

**CORE PHILOSOPHY**: Use official NestJS ecosystem packages directly, never create custom abstractions

**ALLOWED**:
- Official @nestjs/* packages (@nestjs/cache-manager, @nestjs/event-emitter, @nestjs/throttler, nestjs-cls)
- Built-in NestJS pipes (ParseUUIDPipe, ParseIntPipe, DefaultValuePipe, ParseBoolPipe, ParseArrayPipe, ParseEnumPipe)
- Built-in guards/interceptors from @nestjs/* packages
- Native decorators (@CacheKey, @CacheTTL, @OnEvent, @Request)
- Direct module configuration (ClsModule.forRoot, CacheModule.register)
- Built-in exceptions (BadRequestException, NotFoundException, ForbiddenException, UnauthorizedException)
- Direct PostgreSQL RPC via Supabase, JSON Schema definitions

**FORBIDDEN**:
- Custom service layers, repositories, custom DTOs
- Custom decorators (@CurrentUserId, @CurrentContext)
- Custom validation pipes, custom interceptors
- Custom event definitions and listeners
- Wrappers, helper classes, factories, builders, custom error handlers

**DECISION CRITERIA**: If published on npm under @nestjs/* or has official NestJS docs = allowed. If you're creating it = forbidden.

**Module Structure**:
- SharedModule (@Global()): Guards, pipes, core services, Logger, Reflector
- Domain Modules: Controller + Service + Module only (flat, no sub-modules)
- Import SharedModule for shared functionality

**Implementation Patterns**:
- **Route Ordering**: Static before dynamic (`/properties/stats` BEFORE `/properties/:id`)
- **Controllers**: Delegate to services, use built-in pipes
- **Services**: Direct Supabase RPC, <30 lines per method, single responsibility
- **Guards**: Initialize clients in constructor, use Reflector for metadata, cache user lookups per request
- **Caching**: `@CacheKey('key') @CacheTTL(30)` for methods
- **Request Context**: `@Request() req: AuthenticatedRequest` then `req.user?.id`
- **Error Handling**: Built-in exceptions only

**Dependency Injection - 6-Point Failure Checklist**:
1. Service registered in module `providers[]`?
2. Controller using service layer (not direct DB access)?
3. Service has `@Injectable()` decorator?
4. Module imports required dependencies?
5. No circular dependencies? (use @Global() modules)
6. Constructor parameter types match injection?

**Coffee Shop Rule**: Controller=Cashier (takes orders), Service=Barista (makes coffee), Database=Machine (does work)
❌ WRONG: Cashier making coffee | ✅ RIGHT: Cashier→Barista→Machine

**Testing Requirements**:
- Every controller endpoint (auth + validation + errors)
- All service business logic (edge cases + error scenarios)
- Mock external dependencies (Supabase, Stripe, Email)
- Use SilentLogger for clean test output
- Mirror production behavior exactly

Protected file: `apps/backend/ULTRA_NATIVE_ARCHITECTURE.md`

## Frontend - Hook-First Architecture

**File Organization**:
```
hooks/
├── api/use-{entity}.ts       # TanStack Query hooks (server state)
└── use-{entity}-form.ts      # TanStack Form hooks (one per entity)
```

**TanStack Query Hook Pattern** (Mandatory Structure):
```typescript
// 1. Query Keys (hierarchical, typed)
export const entityKeys = {
  all: ['entities'] as const,
  list: () => [...entityKeys.all, 'list'] as const,
  detail: (id: string) => [...entityKeys.all, 'detail', id] as const,
}

// 2. Query Hooks (fetch data)
export function useEntity(id: string) {
  // Must include: placeholderData from cache, Zustand sync, proper stale/gc times
}

export function useAllEntities() {
  // Must include: prefetch individual items, structuralSharing: true, Zustand sync
}

// 3. Mutation Hooks (modify data)
export function useCreateEntity() {
  // Must include: onMutate (optimistic update), onError (rollback), onSettled (refetch)
}

export function useUpdateEntity() {
  // Must include: optimistic updates to both detail and list caches
}

export function useDeleteEntity(options?: { onSuccess, onError }) {
  // Must include: optimistic removal from list
}

// 4. Prefetch Hook
export function usePrefetchEntity() {
  // For hover prefetching on list views
}

// 5. Combined Hook (convenience)
export function useEntityOperations() {
  // Combines all mutation hooks
}
```

**TanStack Form Hook Pattern**:
```typescript
// 1. Basic form hook
export function useEntityForm(initialValues?: Partial<EntityInput>) {
  return useForm({
    defaultValues: { ...initialValues },
    validators: { onSubmit: entityFormSchema }
  })
}

// 2. Update form hook (nullable fields)
export function useEntityUpdateForm(initialValues?: Partial<EntityUpdate>) { }

// 3. Field transformers (auto-formatting)
export function useEntityFieldTransformers() { }

// 4. Async validation (uniqueness checks)
export function useAsyncEntityValidation() { }

// 5. Conditional fields (show/hide logic)
export function useConditionalEntityFields(formData) { }
```

**ABSOLUTE PROHIBITIONS**:
- ❌ Inline queries/mutations (always use custom hooks)
- ❌ Duplicate hook logic (search first: `rg -r "useEntityName"`)
- ❌ Mix concerns (separate query hooks from form hooks)
- ❌ Skip optimistic updates (REQUIRED on all mutations)
- ❌ Skip prefetching (REQUIRED on list views)

**Required Features**:
- Optimistic updates on ALL mutations (create, update, delete) with rollback
- Placeholder data from cache for instant loading
- Zustand store integration via select callback
- Prefetching on hover (list → detail navigation)
- Structural sharing enabled (`structuralSharing: true`)
- Proper cache config: Lists (10min stale/30min gc), Details (5min stale/10min gc)
- Cancel in-flight queries before optimistic updates

**Reference Implementations**:
- `apps/frontend/src/hooks/api/use-tenant.ts` - Complete Query hook pattern
- `apps/frontend/src/hooks/use-tenant-form.ts` - Complete Form hook pattern
- `apps/frontend/src/stores/tenant-store.ts` - Zustand store pattern
- `apps/frontend/src/hooks/api/TENANT_HOOKS_GUIDE.md` - Comprehensive usage guide

## Server Component vs Client Component Decision Tree

**PHILOSOPHY**: "Right tool for the right job" - Use Next.js 15 RSC for 95% of pages, React 19 for interactive UI, TanStack Query ONLY for <1% edge cases.

### When to Use Server Components (Default Choice)

✅ **USE SERVER COMPONENTS FOR:**
- Initial page loads (list views, detail views)
- Dashboard/analytics pages (read-only data)
- SEO-critical pages (landing, pricing, documentation)
- Read-heavy pages without interactivity
- Any page that just displays server data

**Pattern:**
```typescript
// page.tsx (Server Component - no 'use client')
import type { Metadata } from 'next'
import { entityApi } from '@/lib/api-client'
import { EntityTable } from './entity-table.client'

export const metadata: Metadata = {
  title: 'Entities | TenantFlow',
  description: 'Manage your entities'
}

export default async function EntityPage() {
  // ✅ Fetch data on server during RSC render
  const [entities, stats] = await Promise.all([
    entityApi.list(),
    entityApi.stats()
  ])

  return <EntityTable initialEntities={entities} initialStats={stats} />
}
```

**Client Component Pattern:**
```typescript
// entity-table.client.tsx
'use client'
import type { Entity, EntityStats } from '@repo/shared'

interface EntityTableProps {
  initialEntities: Entity[]
  initialStats: EntityStats
}

export function EntityTable({ initialEntities, initialStats }: EntityTableProps) {
  // ✅ Use server-fetched data, only client logic for mutations
  const deleteEntity = useDeleteEntity() // Mutation stays client-side

  return <Table data={initialEntities} onDelete={deleteEntity.mutate} />
}
```

**Examples:**
- ✅ Properties page - Server Component ([reference](apps/frontend/src/app/(protected)/manage/properties/page.tsx))
- ✅ Tenants page - Server Component ([reference](apps/frontend/src/app/(protected)/manage/tenants/page.tsx))
- ✅ Maintenance page - Server Component ([reference](apps/frontend/src/app/(protected)/manage/maintenance/page.tsx))
- ✅ All analytics/* pages - Already Server Components

### When to Use Client Components (Justified Use Cases)

❌ **MUST USE CLIENT COMPONENTS FOR:**
1. **URL State Management** - Search params, filters, pagination that sync with URL
2. **Interactive Dialogs** - Modal forms, confirmation dialogs, multi-step wizards
3. **Client-Side Filtering** - Dropdown filters without URL updates
4. **Form Input State** - Text inputs, dropdowns, checkboxes with useState
5. **Real-Time Updates** - Polling, WebSocket connections
6. **Infinite Scroll** - TanStack Query useInfiniteQuery
7. **Complex Interactions** - Drag-and-drop, canvas, rich text editors

**Pattern (URL State + Dialogs):**
```typescript
// page.tsx (Client Component - HAS 'use client')
'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useLeaseList } from '@/hooks/api/use-lease'

export default function LeasesPage() {
  const searchParams = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)

  // ✅ Justified: URL-synced filters + interactive dialogs
  const { data } = useLeaseList({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all'
  })

  return (
    <>
      <FilterBar /> {/* Updates URL params */}
      <RenewDialog open={dialogOpen} /> {/* Interactive modal */}
    </>
  )
}
```

**Examples:**
- ✅ Leases page - URL filters + renew/terminate/edit dialogs ([reference](apps/frontend/src/app/(protected)/manage/leases/page.tsx))
- ✅ Units page - Client-side filtering ([reference](apps/frontend/src/app/(protected)/manage/units/page.tsx))
- ✅ Financial pages - Period selectors (year/quarter dropdowns)
- ✅ Reports pages - Interactive report generation UI

### TanStack Query Usage Guidelines

**KEEP TanStack Query For (<1% of use cases):**
- ✅ Infinite scroll (useInfiniteQuery for 1000+ items)
- ✅ Real-time polling (refetchInterval for payment status)
- ✅ Window focus refetching (dashboard auto-refresh)
- ✅ Mutations with optimistic updates (delete, toggle, simple updates)

**REMOVE TanStack Query For (Use RSC Instead):**
- ❌ Initial page data fetching (use async Server Components)
- ❌ Simple list/detail views (use server-side fetch)
- ❌ Dashboard stats (use RSC with Promise.all)

**Migration Path:**
```typescript
// ❌ BEFORE: Client-side fetch
'use client'
export default function Page() {
  const { data } = useQuery({ queryKey: ['entities'], queryFn: fetchEntities })
  return <Table data={data} />
}

// ✅ AFTER: Server Component
export default async function Page() {
  const data = await entityApi.list()
  return <Table data={data} />
}
```

### React 19 useOptimistic for Mutations

**Use useOptimistic For:**
- ✅ Delete operations (instant removal from UI)
- ✅ Toggle operations (mark as paid, complete task)
- ✅ Simple updates (change status, update field)
- ✅ User-initiated actions expecting instant feedback

**DON'T Use For:**
- ❌ Complex forms (too many fields to rollback)
- ❌ Financial operations (must be server-confirmed)
- ❌ Bulk operations (confusing if fails)
- ❌ Rare actions (users expect wait time)

**Complete Pattern (Server Action + Client Component):**

**Step 1: Create Server Action** (inline in page.tsx or separate actions.ts)
```typescript
// apps/frontend/src/app/(protected)/manage/entities/page.tsx
import { revalidatePath } from 'next/cache'
import { entityApi } from '@/lib/api-client'

async function deleteEntity(entityId: string) {
  'use server'
  try {
    await entityApi.remove(entityId)
    revalidatePath('/manage/entities') // ✅ Refresh RSC data
    return { success: true }
  } catch (error) {
    console.error('Failed to delete entity:', error)
    throw error // Let client handle error
  }
}

export default async function EntityPage() {
  const entities = await entityApi.list()
  return <EntityTable initialEntities={entities} deleteEntityAction={deleteEntity} />
}
```

**Step 2: Client Component with useOptimistic**
```typescript
// entity-table.client.tsx
'use client'
import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'

interface EntityTableProps {
  initialEntities: Entity[]
  deleteEntityAction: (id: string) => Promise<{ success: boolean }>
}

export function EntityTable({ initialEntities, deleteEntityAction }: EntityTableProps) {
  // ✅ React 19 useOptimistic for instant delete feedback
  const [optimisticEntities, removeOptimistic] = useOptimistic(
    initialEntities,
    (state, entityId: string) => state.filter(e => e.id !== entityId)
  )
  const [isPending, startTransition] = useTransition()

  const handleDelete = (entityId: string) => {
    startTransition(async () => {
      removeOptimistic(entityId) // ✅ Instant UI update (removed from list)
      try {
        await deleteEntityAction(entityId) // Server action with revalidatePath
        toast.success('Entity deleted successfully')
      } catch (error) {
        toast.error('Failed to delete entity')
        // ✅ React automatically reverts optimistic update on error
      }
    })
  }

  return <Table data={optimisticEntities} onDelete={handleDelete} isPending={isPending} />
}
```

**Benefits:**
- 0ms perceived latency (instant UI update)
- Automatic rollback on error (React handles revert)
- No TanStack Query needed (~8KB bundle saved per entity)
- Built-in React 19 (no library overhead)
- Server data refresh via revalidatePath

**Reference Implementations:**
- [DELETE TENANT](apps/frontend/src/app/(protected)/manage/tenants/page.tsx) - Complete useOptimistic pattern
- [DELETE MAINTENANCE](apps/frontend/src/app/(protected)/manage/maintenance/page.tsx) - Complete useOptimistic pattern
- [TenantsTable](apps/frontend/src/app/(protected)/tenant/tenants-table.client.tsx) - Client component with optimistic updates

### Decision Flowchart

```
START: Creating a new page?
  │
  ├─ Does it need URL state, filters, or pagination?
  │  └─ YES → Client Component (use 'use client')
  │
  ├─ Does it have interactive dialogs/modals?
  │  └─ YES → Client Component
  │
  ├─ Does it need real-time updates or infinite scroll?
  │  └─ YES → Client Component + TanStack Query
  │
  └─ Is it just displaying data?
     └─ YES → Server Component (default, no 'use client')
        └─ Fetch with: await Promise.all([api.list(), api.stats()])
```

### Key Metrics (Phase 2A Results)

- ✅ Server Components: 9/21 pages (43% of protected pages)
- ✅ Bundle reduction: 120KB saved (Properties + Tenants + Maintenance)
- ✅ Pattern established: All analytics pages already optimal
- ✅ 12 pages justified as Client Components (interactivity required)

**Bottom Line**: Default to Server Components. Only use 'use client' when you need interactivity, URL state, or real-time updates. When in doubt, start with Server Component and only add 'use client' if you hit limitations.

## UI/UX Standards (globals.css Compliant)

**Core Requirements**:
- **Touch-First**: 44px minimum height for ALL interactive elements
- **Loading States**: <200ms = no indicator, 200-1000ms = spinner, >1000ms = progress bar
- **Data Density**: Three modes (compact/comfortable/spacious) with user preference persistence
- **Form Sections**: Maximum 5 fields per section (cognitive load management)
- **Mobile Simplification**: Apply `.simplified-mobile` below 640px breakpoint
- **Typography**: Roboto Flex scale, 5 hierarchy levels maximum
- **Colors**: OKLCH color space ONLY for perceptual uniformity
- **Animations**: 200-300ms duration for micro-interactions

**Implementation Principles**:
- Reuse existing pages/layouts/components first
- Import ShadCN/Magic UI components then customize inline
- Use shadcn components vs creating custom
- Flat component organization in existing folders
- Central Zustand store instead of component state
- Direct store access via hooks - NO prop drilling
- Sync Shadcn/ui and Magic UI themes for primary color
- Use shadcn charts for charting needs

**Component Patterns**:
- Buttons: Radix Button + Tailwind
- Forms: Radix Form + TanStack Form
- Modals: Radix Dialog
- Dropdowns: Radix Select
- Loading: Radix Progress
- Layouts: CSS Grid + Tailwind
- Animations: Tailwind transitions + Framer Motion

See `.claude/rules/ui-ux-standards.md` for complete 15-point implementation guide

## State Management Architecture

**Zustand**: Global UI state, session, notifications, theme (persistent)
**TanStack Query**: Server state, caching, optimistic updates (ephemeral, request-scoped)
**TanStack Form**: Form state (component-scoped)
**URL State**: Navigation, filters via Next.js router (shareable)

## Project Structure

```
apps/
├── frontend/src/
│   ├── app/              # Next.js 15 app directory
│   ├── components/       # Pure UI (ShadCN + Magic UI)
│   ├── hooks/api/        # TanStack Query hooks
│   ├── hooks/            # TanStack Form hooks
│   ├── lib/              # Utils, API client, validation
│   ├── stores/           # Zustand global state
│   └── providers/        # React context providers
└── backend/src/
    ├── shared/           # Guards, filters, utilities
    └── {domain}/         # Controller + Service + Module (flat)

packages/
├── shared/               # Build FIRST (types, utils, validation)
├── emails/               # Email templates
├── eslint-config/        # Shared ESLint config
└── typescript-config/    # Shared tsconfig
```

**Build Dependencies**: shared → frontend/backend

## Critical Files Reference

**Frontend**:
- `stores/app-store.ts` - Main Zustand store
- `lib/api-client.ts` - Core API client with auth
- `hooks/api/` - Custom TanStack Query hooks
- `providers/` - React context providers

**Backend**:
- `shared/` - Guards, decorators, filters, utilities
- `{domain}/` - Domain modules (auth, billing, properties, tenants, maintenance, dashboard)

**Shared**:
- `packages/shared/src/types/` - All TypeScript types
- `packages/shared/src/validation/` - Zod schemas
- `packages/shared/src/utils/` - Shared utilities

## Pre-Change Checklist (Run Before Every Code Change)

1. **Does this exist?** Search codebase first! (`rg -r "pattern"`)
2. **Native platform feature available?** Use it instead of building
3. **Can I delete code instead?** Prefer deletion over addition
4. **Is this the simplest solution?** No clever abstractions
5. **Understandable immediately?** Clear, obvious code
6. **Accessible?** WCAG 2.1 AA compliance
7. **Consistent?** Matches existing patterns

## Deployment

**Frontend**: Vercel (https://tenantflow.app) - Auto-deploys from main branch
**Backend**: Railway (https://api.tenantflow.app) - Dockerfile, startCommand = `node apps/backend/dist/main.js`

## Success Metric

**Your success = Production-ready code with zero duplication**

Every line must justify its existence. When in doubt, delete it.
