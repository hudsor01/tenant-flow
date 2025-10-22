# TenantFlow Development Guide

When providing commit messages, never include attribution.

## BEFORE EVERY ACTION OR EXECUTING TASKS FUNCTIONS OR ANYTHING, BE SURE TO USE THE MCP SERVER SERENA! IF IT IS NOT AVAILABLE, BE SURE THE PROJECT IS ACTIVATED AND IF NOT, ACTIVATE THE PROJECT THEN TRY AGAIN! VERY GOOD AND VERY EFFICIENT MCP SERVER - ESSENTIAL TO THE SUCCESS OF THIS PROJECT!

## Core Principles (Non-Negotiable)
- **DRY**: Search first (`rg -r "pattern"`), consolidate code reused ≥2 places
- **KISS**: Simplest solution wins, delete > add code
- **NO ABSTRACTIONS**: Use native platform features directly, no wrappers/factories/custom layers
- **NO EMOJIS**: Professional communication only, use Lucide Icons for UI elements
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious, reliability-focused

## Tech Stack
**Frontend (Vercel)**: Next.js 15.5.0 + React 19.1.1 + TailwindCSS 4.1.12 + ShadCN/UI + Magic UI + TanStack Query 5.85.5 + Zustand 5.0.8 + TanStack Form + Lucide Icons 0.540.0 + Recharts 3.1.2

**Backend (Railway)**: NestJS 11.1.6 + Express 4.x + Supabase 2.56.0 + Stripe 18.4.0 + Resend 6.0.1 + In-memory cache

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
2. Apply via psql with DIRECT_URL: `doppler run -- psql $DIRECT_URL -f your-migration.sql`
3. Verify success with MCP read tools: `mcp__supabase-mcp__execute_sql`
4. Regenerate types: `pnpm update-supabase-types`
5. Commit migration file to repo for team/deployment tracking

**Connection Strings** (via Doppler):
- `DIRECT_URL` - Direct Postgres connection (REQUIRED for DDL migrations - CREATE, ALTER, DROP)
- `DATABASE_URL` - Pooled connection (use for DML queries - SELECT, INSERT, UPDATE)

**Example**:
```bash
# Create migration file
cat > add-sale-fields.sql <<'EOF'
ALTER TABLE property ADD COLUMN date_sold TIMESTAMPTZ;
EOF

# Apply migration (MUST use DIRECT_URL for DDL)
doppler run -- psql $DIRECT_URL -f add-sale-fields.sql

# Verify (can use either)
doppler run -- psql $DIRECT_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='property';"

# Regenerate types
pnpm update-supabase-types
```

## TypeScript Types - ZERO TOLERANCE POLICY

**PHILOSOPHY**: Domain-based organization with single source of truth per domain

### Current Structure (`packages/shared/src/types/`)

**Core Files** (Always Present):
- `index.ts` - EXPORT HUB: Single import source for all types
- `supabase-generated.ts` - Database types (GENERATED, never modify manually)

**Domain Files** (Organize by feature area):
- `core.ts` - API patterns (ApiResponse, QueryParams), utilities (DeepReadonly, Result<T,E>)
- `entities.ts` - Business entities (Property, Tenant, Unit, Lease, Maintenance)
- `auth.ts` - Authentication (LoginCredentials, JWT payloads, permissions, security)
- `backend-domain.ts` - Backend-specific (Context, router outputs, config, metrics)
- `frontend.ts` - UI-specific types ONLY (component props, client state)
- `domain.ts` - Cross-cutting concerns (uploads, websockets, webhooks, theme)

**When to Create New File**:
1. New domain area emerges (e.g., `billing.ts`, `analytics.ts`, `notifications.ts`)
2. Existing file exceeds 300 lines (split by sub-domain)
3. Clear domain boundary exists (no cross-domain dependencies)
4. Types are used by both frontend AND backend (shared package only)

**Organization Principles**:
- **Domain Cohesion**: Related types in same file (Lease + LeaseInput + LeaseUpdate)
- **Dependency Direction**: Core ← Domain ← UI (imports flow one way)
- **File Size**: Aim for 100-200 lines, max 300 lines before splitting
- **Naming Convention**: `{domain}.ts` (lowercase, singular)

### ABSOLUTE PROHIBITIONS

1. **NEVER duplicate type definitions** - search first: `rg -r "TypeName" packages/shared/src/`
2. **NEVER import from removed/legacy paths** - use `@repo/shared` only
3. **NEVER use custom utility types** when native TS 5.9.2 equivalents exist (Omit, Partial, Pick, etc.)
4. **NEVER break single source of truth** - one definition, many imports
5. **NEVER create circular dependencies** between type files

### Before Adding Any Type

1. **Search existing**: `rg -r "NewTypeName" packages/shared/src/`
2. **Check native TypeScript**: Does `Omit<T, K>`, `Partial<T>`, `Pick<T, K>` solve this?
3. **Verify domain**: Which file does this belong in? (Follow domain cohesion)
4. **Naming convention**: `PascalCase` for types, `camelCase` for properties

### Before Modifying Types

1. **Type check**: Run `pnpm typecheck` before AND after changes
2. **Breaking changes**: Check impact across frontend/backend with `rg -r "TypeName"`
3. **Backward compatibility**: Prefer adding optional fields over removing required ones
4. **Migration path**: Document breaking changes in PR description

### Performance Requirements

- **Single import rule**: `import type { A, B, C } from '@repo/shared'`
- **Build speed**: TypeScript compilation ≤3 seconds for shared package
- **IDE performance**: Instant intellisense, no lag (test with 50+ imports)
- **Zero circular dependencies**: Violations break build immediately

### Violation Consequences

PR rejection, mandatory refactor before merge. No exceptions.

## Enum Standardization

**SINGLE SOURCE OF TRUTH**: Supabase database enums ONLY

**Current Database Enums (22 types)**:
- `ActivityEntityType`, `BlogCategory`, `BlogStatus`, `customer_invoice_status`
- `DocumentType`, `LateFeeType`, `LeaseStatus`, `LeaseType`
- `MaintenanceCategory`, `PlanType`, `Priority`, `PropertyStatus`, `PropertyType`
- `ReminderStatus`, `ReminderType`, `RentChargeStatus`, `RentPaymentStatus`
- `RequestStatus`, `SubStatus`, `TenantStatus`, `UnitStatus`, `UserRole`

**Workflow for New Enums**:

1. **Create migration SQL file** with enum definition:
```sql
-- migrations/add-payment-method-enum.sql
CREATE TYPE payment_method AS ENUM ('CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'CASH', 'OTHER');

-- Add to table
ALTER TABLE rent_payments ADD COLUMN payment_method payment_method DEFAULT 'BANK_TRANSFER';
```

2. **Apply migration** via psql with DIRECT_URL (required for DDL):
```bash
doppler run -- psql $DIRECT_URL -f migrations/add-payment-method-enum.sql
```

3. **Regenerate TypeScript types**:
```bash
pnpm update-supabase-types
```

4. **Use in TypeScript**:
```typescript
import type { Database } from '@repo/shared/types/supabase-generated'

// Extract enum type
type PaymentMethod = Database['public']['Enums']['payment_method']

// Use in interfaces
interface Payment {
  method: PaymentMethod
}
```

**Type Usage Examples**:
```typescript
// ✅ CORRECT: Using database enum types
import type { Database } from '@repo/shared/types/supabase-generated'

type LeaseStatus = Database['public']['Enums']['LeaseStatus']
type Priority = Database['public']['Enums']['Priority']

// Use in validation schemas
import { z } from 'zod'
const leaseSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'] as const)
  // Values must match database enum exactly
})
```

**FORBIDDEN**:
- ❌ Creating TypeScript enum definitions (`enum MyEnum { ... }`)
- ❌ Duplicating database enum values in code
- ❌ Creating union types that mirror database enums: `type Status = 'ACTIVE' | 'INACTIVE'`
- ❌ Using string literals instead of generated enum types
- ❌ Hardcoding enum values outside of Zod validation schemas

**EXCEPTION - Security Monitoring Enums**:
TypeScript enums are ONLY allowed for runtime security monitoring in `packages/shared/src/types/security.ts`:
```typescript
// ✅ ALLOWED: Security monitoring (not persisted to database)
export enum SecurityEventType {
  AUTH_ATTEMPT = 'AUTH_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT'
}

export enum SecurityEventSeverity {
  LOW = 'LOW',
  CRITICAL = 'CRITICAL'
}
```

**Violation Consequences**: Build failures, PR rejection, mandatory refactor to use database enums

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

**PHILOSOPHY**: "Right tool for the right job" - Default to Next.js 15 Server Components for data fetching, use Client Components for interactivity, and leverage TanStack Query for advanced client-side data synchronization when needed.

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

**Use TanStack Query When You Need:**
- ✅ Infinite scroll (useInfiniteQuery for paginated lists)
- ✅ Real-time polling (refetchInterval for status updates)
- ✅ Window focus refetching (dashboard auto-refresh)
- ✅ Optimistic updates (instant UI feedback with rollback)
- ✅ Client-side cache synchronization (shared state across components)
- ✅ Complex invalidation logic (multiple related queries)
- ✅ Background refetching (stale-while-revalidate pattern)

**Prefer Server Components When:**
- ✅ Initial page data fetching (SEO, faster initial load)
- ✅ Simple list/detail views (no client-side interactions)
- ✅ Dashboard stats (static data, no real-time updates)
- ✅ Content pages (blog posts, documentation, marketing)

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

## CSS Design System (TailwindCSS 4.1)

**PHILOSOPHY**: 90% Tailwind utility classes, 10% design tokens via `@theme` for brand consistency

### When to Use What

**Use Tailwind Utilities (90% of cases)**:
- Layout (flex, grid, spacing)
- Typography (text-sm, font-medium)
- Standard colors (bg-muted, text-foreground)
- Responsive design (md:flex-row)
- Container queries (@container syntax)
- States (hover:, focus:, disabled:)

**Use @theme Design Tokens (10% of cases)**:
- Brand colors (primary, accent)
- Custom fonts (--font-geist-sans)
- Semantic color system (destructive, success)
- Consistent spacing scale
- Border radius tokens
- Animation durations

**NEVER Use**:
- ❌ Inline styles (`style={{ color: 'red' }}`)
- ❌ CSS modules for new components
- ❌ Custom CSS classes (use Tailwind composition)
- ❌ Pixel values (use Tailwind scale: `w-4` = 16px)

### Design Token Definition (@theme directive)

**Location**: `apps/frontend/src/app/globals.css`

```css
@theme {
  /* Brand Colors (OKLCH for perceptual uniformity) */
  --color-primary: oklch(0.50 0.20 250);
  --color-primary-foreground: oklch(0.98 0.02 250);

  /* Semantic Colors */
  --color-success: oklch(0.55 0.15 145);
  --color-destructive: oklch(0.55 0.22 25);

  /* Typography */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Spacing Scale */
  --spacing-page: 2rem;
  --spacing-section: 4rem;

  /* Border Radius */
  --radius-card: 0.75rem;
  --radius-button: 0.5rem;

  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
}
```

### Container Queries (Component-Aware Responsiveness)

**Use Case**: Component adapts to container width, not viewport

```typescript
// Container setup
<div className="@container">
  <PropertyCard property={property} />
</div>

// PropertyCard adapts to container width
<div className="@sm:flex-row @lg:grid-cols-3">
  <Image className="@sm:w-32 @lg:w-48" />
  <Content className="@sm:flex-1" />
</div>
```

**Syntax**:
- `@sm:` - Container ≥384px
- `@md:` - Container ≥448px
- `@lg:` - Container ≥512px
- `@xl:` - Container ≥576px

**When to Use**:
- Dashboard widgets (grid items with varying widths)
- Reusable cards (same component in sidebar vs main content)
- Data tables (columns adjust to available space)

### Core Requirements

- **Touch-First**: 44px minimum height for ALL interactive elements (`min-h-11`)
- **Loading States**: <200ms = no indicator, 200-1000ms = spinner, >1000ms = progress bar
- **Data Density**: Three modes (compact/comfortable/spacious) via Zustand preference
- **Typography**: 5 hierarchy levels maximum (text-xs to text-2xl)
- **Colors**: OKLCH color space ONLY for perceptual uniformity
- **Animations**: 200-300ms duration for micro-interactions (`duration-200`)

### Implementation Principles

- Reuse existing pages/layouts/components first
- Import ShadCN/Magic UI components then customize inline
- Use shadcn components vs creating custom
- Flat component organization in existing folders
- Central Zustand store instead of component state
- Direct store access via hooks - NO prop drilling
- Sync Shadcn/ui and Magic UI themes for primary color
- Use shadcn charts for charting needs

### Component Patterns

- Buttons: Radix Button + Tailwind utilities
- Forms: Radix Form + TanStack Form + Tailwind
- Modals: Radix Dialog + Tailwind
- Dropdowns: Radix Select + Tailwind
- Loading: Radix Progress + Tailwind
- Layouts: CSS Grid + Tailwind utilities
- Animations: Tailwind transitions (duration-200, ease-in-out)

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

## Code Quality Enforcement

**PHILOSOPHY**: Strict enforcement via automated tools prevents architectural drift

### ESLint Rules (ERRORS, not warnings)

**Custom Architecture Rules** (eslint.config.js):
1. **no-typescript-enums** - Enforce database-first enum pattern (Supabase PostgreSQL enums only)
2. **no-client-fetch-on-mount** - Prevent `useEffect + fetch` anti-pattern (use Server Components or TanStack Query)
3. **no-factory-patterns** - Block abstraction layers (use libraries directly)

**Exception**: `packages/shared/src/types/security.ts` - Only file allowed to use TypeScript enums (SecurityEventType, SecurityEventSeverity for monitoring)

### Pre-commit Hooks (Read-Only Validation)

**lint-staged.config.js** - NO auto-fix, validation only:
```javascript
// ✅ READ-ONLY validation
'eslint --cache --max-warnings 0'  // Check for errors, do NOT modify
'prettier --check'                  // Check formatting, do NOT modify

// ❌ REMOVED auto-fix commands
// 'eslint --fix'                   // Would modify before commit
// 'prettier --write'                // Would modify before commit
```

**Why Read-Only?**
- Developers see EXACTLY what they're committing
- No surprise changes right before commit
- Explicit intent: run `pnpm lint:fix` or `pnpm prettier:write` manually

### Playwright MCP (Programmatic Fixes)

**Installation** (one-time setup):
```bash
claude mcp add playwright npx -- @playwright/mcp@latest
```

**Usage**: After updating CLAUDE.md rules, use Playwright MCP to programmatically fix violations across codebase

**When to Use**:
- Bulk refactoring (rename patterns, update imports)
- Systematic fixes (convert all enums to database types)
- Visual regression testing (UI component changes)

### Manual Commands

**Formatting**:
```bash
pnpm lint:fix        # Auto-fix ESLint errors
pnpm prettier:write  # Format all files (not available, run prettier --write manually)
```

**Validation**:
```bash
pnpm typecheck       # TypeScript type checking
pnpm lint            # ESLint validation (read-only)
pnpm test:unit       # Run unit tests
```

**Complete Validation**:
```bash
pnpm validate        # Full pipeline: clean, build, typecheck, lint, test, health check
pnpm validate:quick  # Fast: typecheck + lint + test
```

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
