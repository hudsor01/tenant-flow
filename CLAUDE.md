# TenantFlow Development Guide

When providing commit messages, never include attribution.

## BEFORE EVERY ACTION: USE MCP SERVER SERENA! Activate project if not available.
## Then run coderabbit --prompt-only in the background and fix any issues.


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


## Database Migrations
**SUPABASE MCP Server**: All writes via `doppler run -- psql $DIRECT_URL -f file.sql`

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
- NO: TypeScript `enum` declarations (except `security.ts` for monitoring)
- NO: Duplicating database enum values
- NO: Union types mirroring database enums
- NO: String literals instead of generated types


## Frontend - Data Fetching Architecture
**ARCHITECTURE**: Separated deployment (Vercel frontend → Railway NestJS backend → Supabase)

**PHILOSOPHY**: Native platform features ONLY. Use `fetch()` directly per Next.js/TanStack Query official docs. NO abstraction layers, NO wrapper functions, NO api-client helpers.

**AUTHENTICATION**: Cookie-based (Supabase middleware sets cookies, NestJS reads from cookies OR Authorization header)

**API URLs**:
- Server Components: `process.env.API_BASE_URL` (internal Railway URL)
- Client Components: `process.env.NEXT_PUBLIC_API_BASE_URL` (public Railway URL)

### Patterns by Use Case

| Use Case | Pattern | Example |
|----------|---------|---------|
| **Initial page load** | Server Component + native `fetch()` | `const res = await fetch(\`\${process.env.API_BASE_URL}/api/v1/tenants\`, { headers: { Authorization: \`Bearer \${token}\` } }); const data = await res.json()` |
| **Client queries** | TanStack Query + native `fetch()` | `useQuery({ queryKey: ['tenants'], queryFn: () => fetch('/api/v1/tenants').then(r => r.json()) })` |
| **Simple mutations** | `useTransition` + native `fetch()` | `startTransition(async () => { await fetch(\`/api/v1/tenants/\${id}\`, { method: 'DELETE' }); router.refresh() })` |
| **Complex mutations** | `useMutation` + native `fetch()` | `useMutation({ mutationFn: (data) => fetch('/api/v1/properties', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()) })` |
| **Optimistic UI** (single component) | `useOptimistic` + `useTransition` | `const [optimistic, add] = useOptimistic(data, (state, item) => [...state, item])` |
| **Optimistic UI** (multi-component) | `useMutation` with cache updates | `onMutate: async () => { queryClient.setQueryData(['items'], old => [...old, newItem]) }` |
| **Polling/Real-time** | TanStack Query `refetchInterval` | `useQuery({ queryKey: ['stats'], queryFn: () => fetch('/api/v1/stats').then(r => r.json()), refetchInterval: 30000 })` |
| **Infinite scroll** | TanStack Query `useInfiniteQuery` | `useInfiniteQuery({ queryKey: ['tenants'], queryFn: ({ pageParam }) => fetch(\`/api/v1/tenants?page=\${pageParam}\`).then(r => r.json()) })` |
| **Prefetch on hover** | TanStack Query prefetch | `onMouseEnter={() => queryClient.prefetchQuery({ queryKey: ['tenant', id], queryFn: () => fetch(\`/api/v1/tenants/\${id}\`).then(r => r.json()) })}` |

### State Management
- **Remote State**: Server Components first, TanStack Query for client-side queries
- **URL State**: nuqs
- **Local State**: useState/useReducer
- **Shared State**: Prop drilling or Context
- **UI Preferences**: Zustand ONLY (theme, view density, form wizard state)

### Zustand Rules
- YES: **USE**: Theme, view density, multi-step form progress, UI layout preferences
- NO: **NEVER**: Entity data (tenants, properties, units, leases), API responses, computed state

### Server Components (Default)
Use for: Initial loads, dashboards, SEO pages, read-only data

### Client Components (When Required)
Use for: Forms, URL state, dialogs, filtering, real-time, infinite scroll, complex interactions



### TanStack Query (Client-Side Queries Only)
**USE FOR:**
- Polling/real-time updates (`refetchInterval`)
- Infinite scroll (`useInfiniteQuery`)
- Prefetching on hover
- Client-side dashboards
- Focus refetch
- Background refetching

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

**When in doubt:** Use `useMutation` - it's the TanStack Query v5 recommended pattern for mutations and provides better state management, error handling, and cache coordination.
### Decision Tree
```
Initial page load (SSR/SEO)?
├─ YES → Server Component + native fetch() with Authorization header
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
- NO: **api-client.ts** or any API wrapper/abstraction layer (use native `fetch()` directly)
- NO: **Custom HTTP utilities** (`apiClient`, `httpClient`, etc. - TanStack Query official docs use raw `fetch()`)
- NO: **Server Actions** (use direct API calls - frontend and backend are separated)
- NO: **Inline queries/mutations** (extract to hooks)
- NO: **`useEffect` + `fetch`** (use Server Components or TanStack Query)
- NO: **Mock data** (always call real API)
- NO: **Entity data in Zustand** (use TanStack Query cache)
- NO: **Route Handlers for mutations** (use direct API calls to Railway backend)

### Cache Configuration
- **Lists**: `staleTime: 10min`, `gcTime: 30min`
- **Details**: `staleTime: 5min`, `gcTime: 10min`
- **Stats/Analytics**: `staleTime: 1min`, `gcTime: 5min`
- **Real-time**: `refetchInterval: 30000` (30s)

### Hook Organization
- `hooks/api/use-{entity}.ts` - TanStack Query hooks
- `hooks/use-{entity}-form.ts` - TanStack Form hooks
- Hierarchical query keys: `entityKeys.all`, `entityKeys.list()`, `entityKeys.detail(id)`
- TanStack Form: `useEntityForm()`, `useEntityUpdateForm()`, `useEntityFieldTransformers()`, `useAsyncEntityValidation()`

### Custom Hooks vs Raw useQuery (2025 Best Practices)

**IMPORTANT**: The "NO ABSTRACTIONS" principle applies to **HTTP wrapper layers**, NOT React custom hooks.

**✅ ALLOWED - Custom TanStack Query Hooks**:
```typescript
// ✅ CORRECT - Custom hook using native platform features
export function useProperty(id: string) {
  return useQuery({
    queryKey: propertiesKeys.detail(id),
    queryFn: () => fetch(`/api/v1/properties/${id}`).then(r => r.json())
  })
}
```

**❌ FORBIDDEN - HTTP Abstraction Layers**:
```typescript
// ❌ WRONG - Wrapper around fetch (violates "NO ABSTRACTIONS")
class ApiClient {
  async get(url: string) {
    return fetch(url).then(r => r.json())
  }
}
```

**Why Custom Hooks Are Allowed**:
1. Official TanStack Query recommendation: "custom hooks that wrap around" built-in hooks
2. React official docs recommend custom hooks for "complex patterns with side effects"
3. TkDodo (React Query maintainer) uses custom hooks in all testing examples
4. Custom hooks use native `useQuery` + `fetch()` directly - no abstraction layer
5. Better testing, maintainability, and consistency

**Hook Pattern**:
- **READ**: `useEntity(id)` - wraps `useQuery`
- **LIST**: `useEntityList(filters)` - wraps `useQuery`
- **CREATE**: `useCreateEntity()` - wraps `useMutation`
- **UPDATE**: `useUpdateEntity()` - wraps `useMutation`
- **DELETE**: `useDeleteEntity()` - wraps `useMutation` (test cleanup only if legal constraints)
- **Special Operations**: `useMarkEntitySold()`, `useCompleteEntity()`, etc.

**Production Code Should**:
```typescript
// ✅ DO THIS - Use custom hooks consistently
const { data: property } = useProperty(id)
const { data: properties } = usePropertyList(filters)
const createMutation = useCreateProperty()

// ❌ NOT THIS - Raw useQuery scattered throughout components
const { data: property } = useQuery({
  queryKey: ['property', id],
  queryFn: () => fetch(`/api/v1/properties/${id}`).then(r => r.json())
})
```

## Routing - Intercepting Routes + Parallel Routes (2025 Best Practices)

**ARCHITECTURE**: Modal UX with full URL support using Next.js 15 intercepting routes + parallel routes pattern.

**WHY**: Best of both worlds - fast modal overlays that maintain context, with shareable URLs, browser back/forward support, and progressive enhancement.

### Pattern Overview

**Soft Navigation** (client-side): Opens as modal overlay
**Hard Navigation** (direct URL, refresh, new tab): Opens as full page

### File Structure
```plaintext
apps/frontend/src/app/(protected)/manage/{entity}/
├── layout.tsx                      # Enables parallel routes with @modal slot
├── page.tsx                        # List page
├── new/
│   └── page.tsx                   # Full-page create form (fallback)
├── [id]/
│   └── edit/
│       └── page.tsx               # Full-page edit form (fallback)
└── @modal/
    ├── default.tsx                # Required: returns null for unmatched routes
    ├── (.)new/
    │   └── page.tsx              # Intercepting route: create modal
    └── (.)[id]/
        └── edit/
            └── page.tsx          # Intercepting route: edit modal
```

### Key Components

**RouteModal** (`components/ui/route-modal.tsx`):
- Reusable wrapper for all intercepting routes
- Handles dialog open/close with `router.back()`
- Single source of truth for modal behavior

**Layout Pattern**:
```typescript
export default function EntityLayout({
  children,
  modal
}: {
  children: ReactNode
  modal: ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
```

**Intercepting Route Pattern (Create)**:
```typescript
import { EntityForm } from '#components/entity/entity-form.client'
import { RouteModal } from '#components/ui/route-modal'

export default function NewEntityModal() {
  return (
    <RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Create New Entity</h2>
          <p className="text-muted-foreground">Description</p>
        </div>
        <EntityForm mode="create" />
      </div>
    </RouteModal>
  )
}
```

**Intercepting Route Pattern (Edit)**:
```typescript
import { EntityForm } from '#components/entity/entity-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { clientFetch } from '#lib/api/client'
import type { Entity } from '@repo/shared/types/core'

export default async function EditEntityModal({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const entity = await clientFetch<Entity>(
    `${process.env.API_BASE_URL}/api/v1/entities/${id}`
  )

  return (
    <RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <EntityForm mode="edit" entity={entity} />
    </RouteModal>
  )
}
```

**Full-Page Route Pattern (Create)**:
```typescript
import { EntityForm } from '#components/entity/entity-form.client'
import { requireSession } from '#lib/auth'

export default async function NewEntityPage() {
  await requireSession()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create New Entity</h1>
        <p className="text-muted-foreground">Description</p>
      </div>
      <EntityForm mode="create" />
    </div>
  )
}
```

**List Page Navigation**:
```typescript
import Link from 'next/link'

// In your list page component:
<Link href="/manage/entities/new">
  <Button>Add Entity</Button>
</Link>
```

### Route Segment Matching Rules

**CRITICAL**: The `(.)` pattern matches **route segments**, NOT file system depth.

**What counts as a segment**:
- Regular folders: `properties`, `[id]`, `edit`
- Route groups: `(protected)`, `(.)new`

**What does NOT count**:
- `@modal` parallel route slot folders
- `app` directory

**Examples**:
```plaintext
/manage/properties/new
├── Route segments: ['manage', 'properties', 'new']
├── Intercept from /manage/properties/@modal/(.)new
└── (.) = up 0 segments (same level)

/manage/properties/[id]/edit
├── Route segments: ['manage', 'properties', '[id]', 'edit']
├── Intercept from /manage/properties/@modal/(.)[id]/edit
└── (.) = up 0 segments, then match [id]/edit
```

**Common Pattern**: `(.)` for same-level intercepting (used in this codebase)

### Consolidated Forms Pattern

Forms use a unified component with `mode` prop instead of separate create/edit components:

```typescript
interface EntityFormProps {
  mode: 'create' | 'edit'
  entity?: Entity // Required when mode='edit'
  showSuccessState?: boolean // Default true for full-page, false for modal
}

export function EntityForm({ mode, entity, showSuccessState = true }: EntityFormProps) {
  // Single form implementation handles both create and edit
  // Uses TanStack Form for state management
  // Uses TanStack Query mutations for API calls
  // Navigates with router.push() on success
}
```

### Migration from Inline Dialogs

**OLD** (Inline CreateDialog):
```typescript
// ❌ Inline component with CreateDialog base component
function EntityCreateDialog() {
  const form = useForm({ ... })
  return (
    <CreateDialog {...props}>
      {/* Inline form fields */}
    </CreateDialog>
  )
}

// Usage in list page
<EntityCreateDialog />
```

**NEW** (Intercepting Routes):
```typescript
// ✅ Extracted form component
export function EntityCreateForm() {
  const router = useRouter()
  const form = useForm({
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value)
      router.push('/manage/entities')
    }
  })
  return <form>{/* form fields */}</form>
}

// Modal route: apps/frontend/src/app/(protected)/manage/entities/@modal/(.)new/page.tsx
export default function NewEntityModal() {
  return (
    <RouteModal>
      <EntityCreateForm />
    </RouteModal>
  )
}

// Full-page route: apps/frontend/src/app/(protected)/manage/entities/new/page.tsx
export default async function NewEntityPage() {
  return <EntityCreateForm />
}

// Usage in list page
<Link href="/manage/entities/new">
  <Button>Add Entity</Button>
</Link>
```

### Current Implementation Status

**✅ Fully Migrated**:
- Properties (consolidated form)
- Tenants (separate forms, TODO: consolidate)
- Leases (consolidated form)
- Maintenance (consolidated form)
- Units (create form extracted)

**📦 Removed**:
- All inline CreateDialog components
- Dead code: CreateModal, EditModal, ViewDialog, ViewModal, DeleteDialog (~1,090 lines)

### PROHIBITIONS
- NO: Inline dialog components with form logic (extract to standalone components)
- NO: Base dialog components (CreateDialog, EditDialog) for new features (use intercepting routes)
- NO: Separate create/edit form components (use consolidated form with mode prop)
- NO: Modal-only routes (always provide full-page fallback)

### Benefits
1. **Modal UX**: Fast, maintains context, smooth transitions
2. **URL Support**: Shareable, bookmarkable, SEO-friendly
3. **Browser Navigation**: Back/forward works perfectly
4. **Progressive Enhancement**: Soft navigation → modal, hard navigation → full page
5. **Type Safety**: Same form component, consistent validation
6. **Code Reuse**: Single form for modal + full-page routes
7. **Testing**: Full-page routes are easier to test

## Testing - Integration Tests (2025 Best Practices)

### Philosophy
**Mirror production usage exactly** - test what the UI actually uses, not every hook that exists.

### Test Organization
```
apps/frontend/tests/integration/hooks/api/
├── use-properties-crud.test.tsx
├── use-units-crud.test.tsx
├── use-leases-crud.test.tsx
├── use-maintenance-crud.test.tsx
└── use-rent-payments-crud.test.tsx
```

### What to Test
**✅ Test hooks used in production**:
- If form uses `useCreateProperty()` → test it
- If detail page uses `useProperty(id)` → test it
- If list page uses `usePropertyList()` → test it

**❌ Don't test unused hooks**:
- Hook exists but no UI uses it → skip test
- Feature not implemented yet → skip test
- Legal constraints prevent usage → skip test (e.g., delete with 7-year retention)

### Audit Production Usage First
Before writing tests, search for actual usage:
```bash
# Find hook imports
grep -r "from '#hooks/api/use-entity'" apps/frontend/src/

# Find hook usage
grep -r "useEntity\|useCreateEntity\|useUpdateEntity" apps/frontend/src/
```

### Test Pattern (Custom Hooks)
```typescript
describe('Properties Integration Tests', () => {
  let createdPropertyIds: string[] = []

  afterEach(async () => {
    // Cleanup in reverse foreign key order
    for (const id of createdPropertyIds) {
      await fetch(`/api/v1/properties/${id}`, { method: 'DELETE' })
    }
    createdPropertyIds = []
  })

  function createWrapper() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false }
      }
    })
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  describe('CREATE Property', () => {
    it('creates property successfully', async () => {
      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createWrapper()
      })

      const newProperty: CreatePropertyInput = {
        name: `TEST Property ${Date.now()}`,
        propertyType: 'APARTMENT'
      }

      const created = await result.current.mutateAsync(newProperty)

      expect(created.version).toBe(1)
      createdPropertyIds.push(created.id)
    })
  })

  describe('UPDATE Property', () => {
    it('updates property with optimistic locking', async () => {
      const wrapper = createWrapper()

      // CRITICAL: Populate cache first for optimistic locking
      const { result: readResult } = renderHook(() => useProperty(testPropertyId), {
        wrapper
      })

      await waitFor(() => {
        expect(readResult.current.isSuccess).toBe(true)
      })

      // Now update has version in cache
      const { result } = renderHook(() => useUpdateProperty(), { wrapper })

      const updated = await result.current.mutateAsync({
        id: testPropertyId,
        data: { name: 'Updated Name' }
      })

      expect(updated.version).toBe(2) // Version incremented
    })
  })
})
```

### Critical Patterns

**1. Shared QueryClient for Cache Tests**
```typescript
// ❌ WRONG - Different QueryClients, cache won't coordinate
const { result: mutation } = renderHook(() => useMutation(), {
  wrapper: createWrapper() // QueryClient #1
})
const { result: query } = renderHook(() => useQuery(), {
  wrapper: createWrapper() // QueryClient #2 - different!
})

// ✅ CORRECT - Same QueryClient
const wrapper = createWrapper()
const { result: mutation } = renderHook(() => useMutation(), { wrapper })
const { result: query } = renderHook(() => useQuery(), { wrapper })
```

**2. Optimistic Locking Requires Cache Population**
```typescript
// ❌ WRONG - Cache empty, no version, 409 error
await updateMutation.mutateAsync({ id, data })

// ✅ CORRECT - Fetch first to populate cache
const { result } = renderHook(() => useProperty(id), { wrapper })
await waitFor(() => expect(result.current.isSuccess).toBe(true))
// Now cache has version field
await updateMutation.mutateAsync({ id, data })
```

**3. Never Use waitFor with Async Functions**
```typescript
// ❌ WRONG - Causes 30-second timeouts
await waitFor(async () => {
  const result = await mutation.mutateAsync(data)
})

// ✅ CORRECT - Direct await
const result = await mutation.mutateAsync(data)

// ✅ CORRECT - waitFor for sync assertions
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true)
})
```

**4. Foreign Key Cleanup Order**
```typescript
afterEach(async () => {
  // Delete children first, parents last
  for (const id of createdLeaseIds) { /* delete */ }
  for (const id of createdTenantIds) { /* delete */ }
  for (const id of createdUnitIds) { /* delete */ }
  for (const id of createdPropertyIds) { /* delete */ }
})
```

### Business Rules to Mirror

**Properties**:
- ❌ NO DELETE tests (7-year legal retention requirement)
- ✅ YES MARK SOLD tests (end-of-lifecycle operation)
- DELETE endpoint exists ONLY for test cleanup

**Rent Payments**:
- ✅ YES CREATE tests
- ✅ YES READ tests
- ❌ NO UPDATE tests (immutable - accounting best practice)
- ❌ NO DELETE tests (immutable - accounting best practice)

### Running Tests
```bash
# All integration tests
pnpm --filter @repo/frontend test:integration

# Specific entity
pnpm --filter @repo/frontend test:integration use-properties-crud

# With UI for debugging
pnpm --filter @repo/frontend test:integration --ui

# Prerequisites
doppler run -- pnpm --filter @repo/backend dev  # Backend must be running
```

### Test Configuration
**File**: `apps/frontend/vitest.integration.config.js`
- Environment: jsdom
- Setup: `apps/frontend/src/test/setup.ts` (authenticates before tests)
- Timeout: 30000ms
- Threads: false (serial execution)
- Retry: 1

### Documentation
- **TESTING-BEST-PRACTICES-ANALYSIS.md** - Official recommendations vs project principles
- **CRUD-TESTING-LESSONS-LEARNED.md** - Patterns, gotchas, performance improvements
- **PRODUCTION-HOOKS-AUDIT.md** - Which hooks are actually used in production
- **CRUD-TESTING-IMPLEMENTATION-SUMMARY.md** - Complete implementation overview

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

**Component Libraries**: ShadCN/UI, Magic UI, shadcn charts

## Backend - Ultra-Native NestJS
**PHILOSOPHY**: Follow official NestJS architectural patterns exactly as documented. Prefer platform idioms over custom abstractions.

**DECISION RULE**: Published on npm under @nestjs/* or in official NestJS docs = **ALLOWED**. Custom abstractions not in docs = **FORBIDDEN**.

**ALLOWED**:
- Official @nestjs/* packages
- Built-in pipes/guards/decorators
- Native exceptions (BadRequestException, NotFoundException, etc.)
- Direct Supabase RPC calls
- **Custom param decorators** (`@User()`, `@UserId()`) per [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- **Metadata decorators** (`@Roles()`, `@Public()`) using `SetMetadata()` per [NestJS Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- **Custom interceptors** (cache, timeout, logging) per [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- **Custom guards** (auth, roles, subscription) per [NestJS Guards](https://docs.nestjs.com/guards)
- **Custom pipes** (validation, transformation) per [NestJS Pipes](https://docs.nestjs.com/pipes)
- **Saga pattern** for distributed transactions (Supabase + Auth + Stripe coordination)
- **Transaction compensation** with rollback logic across multiple systems
- **Multi-step workflows** (invitation → onboarding → payment setup)

**FORBIDDEN**:
- Custom exception classes extending HttpException (use built-in exceptions)
- Wrapper functions around fetch/Supabase/Stripe (call directly)
- Helper utilities not following NestJS patterns
- Factory patterns for object creation
- Builder classes (except official NestJS patterns)
- Custom event emitters (use @nestjs/event-emitter)

### Validation (nestjs-zod ONLY)
**Method**: `nestjs-zod` + `createZodDto()` + `ZodValidationPipe` (globally configured in app.module.ts)
**Schemas**: Define in `packages/shared/src/validation/*.schemas.ts` using Zod
**DTOs**: Create classes with `createZodDto(schema)` in controller dto/ folders
**Why Classes**: Runtime existence, reflection metadata, decorator support (interfaces erased at runtime)
**Global Pipe**: `APP_PIPE` provider with `ZodValidationPipe` in app.module.ts
**Output**: `class-transformer` + ClassSerializerInterceptor - `@Exclude()` for sensitive fields
**Validation Groups**: `.partial()`, `.pick()`, `.omit()` (Zod built-in, NOT custom)

**VALIDATION FORBIDDEN:**
- NO: Manual inline validation in controllers
- NO: `class-validator` decorators (`@IsString`, `@IsEmail`, etc.)
- NO: DTO factories
- NO: Custom base classes for DTOs
- NO: Wrappers around Zod validation

### Architecture Patterns
- **SharedModule** (@Global()): Guards, pipes, Logger, Reflector, custom decorators
- **Domain Modules**: Controller + Service + Module (flat, no sub-modules)
- **Route Ordering**: Static before dynamic
- **Controllers**: Delegate to services, use custom param decorators (`@User()`, `@UserId()`)
- **Services**: Simple queries: Direct Supabase RPC <30 lines; Multi-system workflows: Saga pattern allowed <150 lines; Extract private methods for clarity
- **Guards**: Constructor init, Reflector metadata, cache lookups, composition via `applyDecorators()`
- **Interceptors**: Response transformation, logging, caching, timeout handling
- **Decorators**: Param extraction (`@User()`), metadata (`@Roles()`), composition (`@Auth()`)
- **Caching**: `@CacheKey()` + `@CacheTTL()` decorators
- **Context**: `@Request() req: AuthenticatedRequest` or custom `@User()` decorator
- **Errors**: Built-in NestJS exceptions only (BadRequestException, NotFoundException, etc.)

### DI Checklist
1. Service in `providers[]`?
2. Controller using service layer?
3. `@Injectable()` decorator?
4. Module imports dependencies?
5. No circular deps?
6. Constructor types match?

**Testing**: Every endpoint, all service logic, mock externals, SilentLogger, mirror production



## Code Quality

**Commands**:
- `pnpm lint:fix` - Fix linting errors
- `prettier --write .` - Format code
- `pnpm typecheck` - Check TypeScript
- `pnpm validate` - Run all checks

**ESLint**: Pre-commit validation only (no auto-fix)

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
- NO: NO Project References (conflicts with Turbo)
- YES: Independent tsconfig per package
- YES: Backend `composite: true`
- YES: Node.js `imports` over TS `paths`

**Frontend imports**: `#components/*`, `#lib/*`, `#hooks/*`, `#stores/*`, `#types/*`, `#providers/*`

**Caching**: `.turbo` cached in CI, 70-90% speedup

**Env Validation**: `eslint-config-turbo` validates `process.env.*` in `turbo.json`

**Doppler**: All env vars via `doppler run --`

**pnpm Catalogs**: Centralized versions in `pnpm-workspace.yaml`

**Tools**: `turbo ls`, `turbo query`, `syncpack`, `manypkg check`

### Pitfalls (AVOID)
1. NO: TypeScript Project References
2. NO: TypeScript `paths`
3. NO: Missing env vars in turbo.json
4. NO: Root file changes (invalidates caches)
5. NO: Nested packages (use `apps/*`, `packages/*` only)



## Reference Implementations

**Hooks**: `hooks/api/use-tenant.ts`, `hooks/use-tenant-form.ts`, `stores/tenant-store.ts`

**Server Components**: `manage/properties/page.tsx`, `manage/tenants/page.tsx`, `manage/maintenance/page.tsx`

**Client Components**: `manage/leases/page.tsx`, `manage/units/page.tsx`, `tenant/tenants-table.client.tsx`

## Critical Files

**Build**: shared → frontend/backend

**Frontend**: `stores/app-store.ts`, `hooks/api/`, `providers/`, `lib/supabase/`

**Backend**: `shared/`, `{domain}/` (auth, billing, properties, tenants, maintenance, dashboard)

**Shared**: `packages/shared/src/types/`, `packages/shared/src/validation/`, `packages/shared/src/utils/`
