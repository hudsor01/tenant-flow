# TenantFlow Development Guide

When providing commit messages, never include attribution.

## BEFORE EVERY ACTION OR EXECUTING TASKS FUNCTIONS OR ANYTHING, BE SURE TO USE THE MCP SERVER SERENA! IF IT IS NOT AVAILABLE, BE SURE THE PROJECT IS ACTIVATED AND IF NOT, ACTIVATE THE PROJECT THEN TRY AGAIN! VERY GOOD AND VERY EFFICIENT MCP SERVER - ESSENTIAL TO THE SUCCESS OF THIS PROJECT!

You are required to maintain a .cursor/rules/learned-memories.md file where it records project‑specific knowledge, user preferences and technical decisions. When the user communicates a new preference or a change in technology, the model should identify the essential fact, examine the existing memory file to see whether the information already exists or conflicts with previous entries, and then propose a concise update to that file. Before generating any answer or code, the model must read from this memory file to ensure its response aligns with recorded decisions and to avoid asking for the same information again. This makes memory management an explicit part of the unified guidelines alongside the architectural, coding and project‑management conventions already described.

I want you to act as a full-stack software developer, who can provide guidance on designing, developing, and deploying full-stack applications. Share insights on working with various front-end technologies (like HTML, CSS, JavaScript, and frameworks like React), back-end technologies (like Node.js) and databases (like SQL). Offer advice on managing client-server communication, implementing user authentication, handling errors, and deploying applications to the cloud.

## Project Structure & Module Organization
Tenant Flow is a Turborepo monorepo. Application code lives in `apps/frontend` (Next.js 14/React 19) and `apps/backend` (NestJS). Shared types, validation, and utilities are in `packages/shared`, while lint, TypeScript, and database configs sit in `packages/eslint-config`, `packages/typescript-config`, and `packages/database`. Tests live alongside modules and in `tests/`, and long-form docs or assets belong under `docs/`. Favor centralizing reusable logic in `packages/shared` before duplicating code in an app.

## Rules
Always structure Next.js applications using the App Router: put a page.tsx file in each route directory, name directories with kebab‑case and components with PascalCase, and prefer named exports. Only include 'use client' at the top of a component when browser‑side interactivity is required; otherwise keep components as server components. Use React Server Components for data fetching and React Server Actions for form handling, minimise useState and useEffect, and expose shareable state via URL search parameters managed with a library like nuqs. Always use functional components with hooks, encapsulate reusable logic in custom hooks, employ the Context API sparingly for shared state, validate props with PropTypes and memoise components only when necessary. Compose UIs rather than relying on inheritance and use fragments to avoid unnecessary wrapper elements.

When styling, use Tailwind CSS utilities for a mobile‑first design: apply responsive prefixes (md:, lg:) to adjust layouts at different breakpoints and use state variants (hover:, focus:) for interactive states. Consolidate repeated utility combinations using @apply in a component layer, resort to arbitrary values for bespoke layout requirements (e.g., top-[117px] or grid-cols-[1fr_2fr]) and maintain consistent vertical spacing with utilities like space-y-4.

For Nest.js/Express back‑end code, enforce proper middleware ordering: register body parsers first, then custom middleware, then route handlers and finally a centralised error handler. Organise routes using express.Router() modules and ensure all asynchronous handlers use async/await with errors propagated to the error handler.

You must follow PostgreSQL conventions: write SQL keywords in lowercase, choose descriptive identifiers for tables and columns and format queries with consistent indentation. Use suitable data types, create indexes on columns involved in filters or joins, define foreign keys to maintain referential integrity and wrap related operations inside transactions for atomicity. Integrate a memory system by storing all project‑specific knowledge and preferences in .cursor/rules/learned-memories.mdc. Whenever the model learns a new decision or preference, it should extract the key information, check for existing entries that might conflict and propose a concise update to the memory file. Before answering questions or generating code, consult the memory file to ensure responses align with recorded decisions and avoid re‑asking for the same information. Finally, track ongoing work in a Markdown file such as TASKS.md using checkbox items (- [ ] for incomplete, - [x] for complete) and update it as tasks progress.

## Core Principles (Non-Negotiable)
- **DRY**: Search first (`rg -r "pattern"`), consolidate code reused ≥2 places
- **KISS**: Simplest solution wins, delete > add code
- **NO ABSTRACTIONS**: Use native platform features directly, no wrappers/factories/custom layers
- **NO EMOJIS**: Professional communication only, use Lucide Icons for UI elements
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious, reliability-focused

## Tech Stack
**Frontend (Vercel)**: Next.js 15 + React 19 + TailwindCSS 4 + ShadCN/UI + Magic UI + TanStack Query 5 + Zustand 5 + TanStack Form + Lucide Icons + Recharts

**Backend (Railway)**: Nest.js/Express.js + Supabase + Stripe + Resend

**Shared**: Node.js, pnpm, Turborepo, TypeScript strict, Zod

## Commands

**Development**: `pnpm dev`, `doppler run -- pnpm dev` (with secrets), `pnpm --filter @repo/pkg dev` (specific package)

**Quality Checks**: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`

**Build**: `pnpm build`, `pnpm build:frontend`, `pnpm build:backend`

**Testing**: `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:production`

**Database**: `pnpm update-supabase-types` (regenerate TypeScript types)

**Database Migrations**: Use psql with DIRECT_URL for DDL, DATABASE_URL for DML queries

## Data Fetching Architecture (October 2025 Best Practices)

**PHILOSOPHY**: Server-first with selective client-side hydration. No mock data, all data from API endpoints.

**📚 COMPLETE REFERENCE**: See [apps/frontend/API_PATTERNS.md](apps/frontend/API_PATTERNS.md) for comprehensive API architecture documentation.

### Universal API Client (Single Source of Truth)

**ALL API calls MUST use the standardized apiClient**:
- **Location**: `packages/shared/src/utils/api-client.ts`
- **Auto-detects environment**: Browser (session token) vs Server (passed token)
- **Response unwrapping**: Handles both `{data: {...}}` and `{...}` formats
- **Type-safe**: TypeScript generics for all responses

```typescript
// ✅ CORRECT - Use standardized client
import { propertiesApi } from '@/lib/api-client'
const properties = await propertiesApi.list()

// ❌ WRONG - Creates orphaned routes
const properties = await fetch('/api/v1/properties')
```

### Primary Pattern: Server Components + TanStack Query

**Data Fetching**: Server Components with `createServerApi(accessToken)` for initial loads
```typescript
// page.tsx (Server Component)
import { createServerApi } from '@/lib/api-client'
import { requireSession } from '@/lib/server-auth'

export default async function PropertiesPage() {
  const { accessToken } = await requireSession()
  const serverApi = createServerApi(accessToken)

  const [properties, stats] = await Promise.all([
    serverApi.properties.list(),
    serverApi.properties.getStats()
  ])

  return <PropertiesTableClient initialData={properties} stats={stats} />
}
```

**Mutations**: TanStack Query hooks in Client Components
```typescript
// Client Component
'use client'
import { useCreateProperty } from '@/hooks/api/use-properties'

export function PropertiesTableClient({ initialData }) {
  const { mutate: createProperty } = useCreateProperty()

  return (
    <Button onClick={() => createProperty({ name: 'New Property' })}>
      Create Property
    </Button>
  )
}
```

**Benefits**:
- Zero client JavaScript for data fetching
- SEO-friendly
- Automatic caching and invalidation via TanStack Query
- Type-safe end-to-end
- No orphaned API routes

### Secondary Pattern: Server Actions + useOptimistic (Optional)

**Use ONLY for**:
- Simple delete operations requiring instant UI feedback
- Toggle operations (mark as paid, complete task)
- Non-financial mutations where rollback is acceptable

**DON'T use for**: Complex forms, financial operations, bulk actions

### API Resource Organization

**ALL endpoints defined in ONE file**: `apps/frontend/src/lib/api-client.ts`

```typescript
// Client API (browser - auto session token)
export const propertiesApi = {
  list: () => apiClient<Property[]>(...),
  create: (body) => apiClient<Property>(...),
  update: (id, body) => apiClient<Property>(...),
  remove: (id) => apiClient<void>(...)
}

// Server API (RSC - requires accessToken)
export const createServerApi = (accessToken: string) => ({
  properties: {
    list: () => apiClient<Property[]>(..., { serverToken: accessToken }),
    get: (id) => apiClient<Property>(..., { serverToken: accessToken })
  }
})
```

**Covered Resources**: properties, tenants, units, leases, maintenance, dashboard, stripe, subscriptions, paymentMethods, lateFees, reports, users

## Remote State
Anything coming from a backend, API, database, etc., should be handled by Server Components first. Only use client-side data-fetching libraries (TanStack Query, SWR) for advanced scenarios: infinite scroll, polling, client-heavy dashboards. They solve caching, deduplication, invalidation, retries, pagination, but Server Components + Server Actions handle 90% of use cases more efficiently.

## Query params in URL state
Use nuqs and save yourself massive pain implementing that sync manually.

## Local State
A lot of the state doesn't need to be shared, actually. Use React's useState or useReducer in this case.

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

**Example**: Create SQL file → Apply with `psql $DIRECT_URL -f migration.sql` → Verify → Run `pnpm update-supabase-types`

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

1. Create migration SQL file with `CREATE TYPE` enum definition
2. Apply via `psql $DIRECT_URL -f migrations/file.sql` (DDL requires DIRECT_URL)
3. Run `pnpm update-supabase-types` to regenerate TypeScript types
4. Import from `@repo/shared/types/supabase-generated` as `Database['public']['Enums']['enum_name']`

**Type Usage**: Extract enum types from Database schema, use in Zod validation with exact database values

**FORBIDDEN**:
- ❌ Creating TypeScript enum definitions (`enum MyEnum { ... }`)
- ❌ Duplicating database enum values in code
- ❌ Creating union types that mirror database enums: `type Status = 'ACTIVE' | 'INACTIVE'`
- ❌ Using string literals instead of generated enum types
- ❌ Hardcoding enum values outside of Zod validation schemas

**EXCEPTION - Security Monitoring Enums**:
TypeScript enums ONLY allowed in `packages/shared/src/types/security.ts` for SecurityEventType and SecurityEventSeverity (runtime monitoring, not persisted to database)

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

## Frontend - Hook-First Architecture (October 2025)

**PHILOSOPHY**: TanStack Query for data fetching ONLY, not mutations. Use Server Actions + useOptimistic for mutations.

**File Organization**: `hooks/api/use-{entity}.ts` (TanStack Query for CLIENT-SIDE data fetching), `hooks/use-{entity}-form.ts` (TanStack Form)

**TanStack Query Hook Pattern** (Data Fetching Only):
- Query Keys: Hierarchical, typed (`entityKeys.all`, `entityKeys.list()`, `entityKeys.detail(id)`)
- Query Hooks: `useEntity(id)`, `useAllEntities()` with Zustand sync, proper stale/gc times
- Prefetch Hook: `usePrefetchEntity()` for hover prefetching
- **NO MUTATIONS**: Remove `useCreateEntity()`, `useUpdateEntity()`, `useDeleteEntity()` - use Server Actions instead

**TanStack Form Hook Pattern**:
- Basic form: `useEntityForm()` with defaultValues and validators
- Update form: `useEntityUpdateForm()` for nullable fields
- Field transformers: `useEntityFieldTransformers()` for auto-formatting
- Async validation: `useAsyncEntityValidation()` for uniqueness checks
- Conditional fields: `useConditionalEntityFields()` for show/hide logic

**ABSOLUTE PROHIBITIONS**:
- ❌ Inline queries/mutations (always use custom hooks or Server Actions)
- ❌ Duplicate hook logic (search first: `rg -r "useEntityName"`)
- ❌ Mix concerns (separate query hooks from form hooks)
- ❌ TanStack Query mutations (use Server Actions + useOptimistic instead)
- ❌ Mock/placeholder data (all data must come from API endpoints)
- ❌ Optimistic updates via TanStack Query (use React 19 useOptimistic instead)

**Required Features** (Data Fetching Only):
- Zustand store integration via select callback
- Prefetching on hover (list → detail navigation)
- Structural sharing enabled (`structuralSharing: true`)
- Proper cache config: Lists (10min stale/30min gc), Details (5min stale/10min gc)
- **NO placeholder data**: Remove all mock/sample data, fetch from endpoints only
- **NO optimistic updates**: Remove temp IDs and optimistic cache manipulation

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

**Pattern**: Server Component (page.tsx) fetches data with `await Promise.all()`, passes to Client Component (.client.tsx) for interactivity. Server handles initial data, client handles mutations.

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

**Pattern**: Client Component ('use client') with `useSearchParams()` for URL filters, `useState()` for dialogs, TanStack Query for data fetching with search params

**Examples:**
- ✅ Leases page - URL filters + renew/terminate/edit dialogs ([reference](apps/frontend/src/app/(protected)/manage/leases/page.tsx))
- ✅ Units page - Client-side filtering ([reference](apps/frontend/src/app/(protected)/manage/units/page.tsx))
- ✅ Financial pages - Period selectors (year/quarter dropdowns)
- ✅ Reports pages - Interactive report generation UI

### TanStack Query Usage Guidelines (October 2025 Best Practices)

**PHILOSOPHY**: Use Server Components + Server Actions as default. Only use TanStack Query for advanced client-side scenarios.

**Use TanStack Query When You Need:**
- ✅ Infinite scroll (useInfiniteQuery for paginated lists)
- ✅ Real-time polling (refetchInterval for status updates)
- ✅ Window focus refetching (dashboard auto-refresh)
- ✅ Client-side cache synchronization (shared state across components)
- ✅ Complex invalidation logic (multiple related queries)
- ✅ Background refetching (stale-while-revalidate pattern)
- ✅ Client-heavy dashboards with complex caching needs

**DON'T Use TanStack Query For:**
- ❌ Initial page data fetching (use Server Components with async/await)
- ❌ Mutations/optimistic updates (use React 19 useOptimistic + Server Actions)
- ❌ Static data (staleTime: Infinity → Server Component instead)
- ❌ Simple CRUD operations (Server Actions handle this better)

**Prefer Server Components When:**
- ✅ Initial page data fetching (SEO, faster initial load, 0 client JavaScript)
- ✅ Simple list/detail views (no client-side interactions)
- ✅ Dashboard stats (static data, no real-time updates)
- ✅ Content pages (blog posts, documentation, marketing)
- ✅ Any data that doesn't need client-side caching/invalidation

**Prefer Server Actions + useOptimistic When:**
- ✅ Mutations (POST/PUT/DELETE operations)
- ✅ Form submissions requiring instant UI feedback
- ✅ Simple CRUD operations with optimistic updates
- ✅ Operations requiring revalidation of Server Component data

**Migration Path**:
1. Convert `useQuery()` in Client Components → `await entityApi.list()` in Server Components for initial page loads
2. Convert TanStack Query mutations → Server Actions with `useOptimistic()` for instant feedback
3. Keep TanStack Query only for: infinite scroll, polling, focus refetching, client-heavy dashboards

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

**Complete Pattern**: Server Action (inline in page.tsx with 'use server', calls entityApi.remove(), uses revalidatePath() to refresh RSC data) → Client Component (useOptimistic + useTransition for instant UI updates, automatic rollback on error). Benefits: 0ms latency, no TanStack Query (~8KB saved), built-in React 19, server refresh via revalidatePath.

**Reference Implementations:**
- [DELETE TENANT](apps/frontend/src/app/(protected)/manage/tenants/page.tsx) - Complete useOptimistic pattern
- [DELETE MAINTENANCE](apps/frontend/src/app/(protected)/manage/maintenance/page.tsx) - Complete useOptimistic pattern
- [TenantsTable](apps/frontend/src/app/(protected)/tenant/tenants-table.client.tsx) - Client component with optimistic updates

### Decision Flowchart

**Decision Tree**: URL state/filters/pagination → Client Component | Interactive dialogs → Client Component | Real-time/infinite scroll → Client Component + TanStack Query | Just displaying data → Server Component (fetch with `await Promise.all()`)

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

**Tokens**: Brand colors (OKLCH format), semantic colors (success, destructive), typography (font-sans, font-mono), spacing scale (page, section), border radius (card, button), animation durations (fast, normal)

### Container Queries (Component-Aware Responsiveness)

**Use Case**: Component adapts to container width (not viewport). Wrap in `@container` div, use `@sm:` (≥384px), `@md:` (≥448px), `@lg:` (≥512px), `@xl:` (≥576px) prefixes. Use for: dashboard widgets, reusable cards, data tables.

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

**lint-staged.config.js** - Validation only (no auto-fix). Runs `eslint --cache --max-warnings 0` and `prettier --check`. Why? Developers see exactly what they're committing, no surprise changes. Run `pnpm lint:fix` manually for fixes.

### Playwright MCP (Programmatic Fixes)

**Installation**: `claude mcp add playwright npx -- @playwright/mcp@latest` (one-time). Use for: bulk refactoring, systematic fixes (convert enums to database types), visual regression testing.

### Manual Commands

**Formatting**: `pnpm lint:fix` (auto-fix ESLint), `prettier --write` (format files)

**Validation**: `pnpm typecheck` (TypeScript), `pnpm lint` (ESLint read-only), `pnpm test:unit`

**Complete**: `pnpm validate` (full pipeline: clean, build, typecheck, lint, test, health), `pnpm validate:quick` (fast: typecheck + lint + test)

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

### Known Warnings (Non-Breaking)

**Vercel Middleware Warning**: "Unable to find source file for page middleware with extensions: tsx, ts, jsx, js"
- **Status**: Cosmetic warning, does NOT affect functionality
- **Cause**: Vercel's internal source mapping issue with Turborepo monorepos
- **Impact**: None - middleware works correctly in production
- **Resolution**: Not fixable via configuration (attempted in commit eade2acf), documented as expected behavior

## Security Notes

**validator.js CVE-2025-56200** (CVSS 6.1 - Medium)
- **Vulnerability**: URL validation bypass in isURL() function (versions ≤13.15.15)
- **Status**: No vendor patch available (latest version 13.15.15 is vulnerable)
- **Our Risk**: LOW - Transitive dependency via @nestjs/terminus → class-validator → validator
- **Mitigation**: validator.js NOT used directly in application code, only in internal health check endpoints (no user input processed)
- **Action**: Monitor validator.js releases for patch, upgrade immediately when available