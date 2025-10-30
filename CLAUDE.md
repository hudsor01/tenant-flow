# TenantFlow Development Guide

When providing commit messages, never include attribution.

## BEFORE EVERY ACTION: USE MCP SERVER SERENA! Activate project if not available.


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


## Shared Packages

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

**Supabase migrations and auto gen types**
After any database migration, always run:
pnpm update-supabase-types


## Frontend

## Data Fetching Architecture
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


### Optimistic Updates
**Single Component (React 19 useOptimistic):**
Use `useOptimistic` + `useTransition` for component-scoped instant UI feedback:

**Multiple Components (TanStack Query Cache):**
Use `useMutation` with cache-based optimistic updates for cross-component synchronization:

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
**Output**: `class-transformer` + ClassSerializerInterceptor - `@Exclude()` for sensitive fields
**Validation Groups**: `.partial()`, `.pick()`, `.omit()` (Zod built-in, NOT custom)

**FORBIDDEN:**
- NO: Manual inline validation in controllers
- NO: `class-validator` decorators (`@IsString`, `@IsEmail`, etc.)
- NO: Custom decorators/pipes
- NO: DTO factories
- NO: Custom base classes
- NO: Wrappers around validation

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



## Infrastructure

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

**Validation**: `pnpm typecheck && pnpm lint && pnpm build`


## Reference Implementations

**Hooks**: `hooks/api/use-tenant.ts`, `hooks/use-tenant-form.ts`, `stores/tenant-store.ts`

**Server Components**: `manage/properties/page.tsx`, `manage/tenants/page.tsx`, `manage/maintenance/page.tsx`

**Client Components**: `manage/leases/page.tsx`, `manage/units/page.tsx`, `tenant/tenants-table.client.tsx`

## Critical Files

**Build**: shared → frontend/backend

**Frontend**: `stores/app-store.ts`, `hooks/api/`, `providers/`, `lib/supabase/`

**Backend**: `shared/`, `{domain}/` (auth, billing, properties, tenants, maintenance, dashboard)

**Shared**: `packages/shared/src/types/`, `packages/shared/src/validation/`, `packages/shared/src/utils/`
