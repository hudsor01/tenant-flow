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

**PHILOSOPHY**: Server-first. No mock data. See `apps/frontend/API_PATTERNS.md`.

**Universal API Client**: `packages/shared/src/utils/api-client.ts` - auto-detects browser/server, type-safe

**ALL endpoints**: `apps/frontend/src/lib/api-client.ts`

**Primary**: Server Components with `createServerApi(accessToken)` for initial loads

**Secondary**: Server Actions + `useOptimistic` for deletes/toggles/simple updates (NOT forms/financial/bulk)

**State Management**:
- Remote: Server Components first, TanStack Query only for infinite scroll/polling/dashboards
- URL state: nuqs
- Local: useState/useReducer
- Shared: Prop drilling or Context
- **Zustand**: ONLY for UI preferences (theme, view density, form wizard state). NEVER for entity data (tenants, units, properties)

**Zustand Usage Rules**:
- ✅ **USE FOR**: Theme preferences, view density, multi-step form progress, UI layout preferences
- ❌ **NEVER USE FOR**: Entity data (tenants, properties, units, leases), API response caching, computed entity state
- **WHY**: TanStack Query cache already provides normalized entity storage with deduplication, loading states, and invalidation
- **Stores**: `preferences-store.ts` (theme/view), `ui-store.ts` (form wizard), `auth-store.ts` (session metadata only)

**Server Components (default)**: Initial loads, dashboards, SEO pages, read-only data

**Client Components (when required)**: URL state, dialogs, filtering, form inputs, real-time, infinite scroll, complex interactions

**TanStack Query**: ONLY for infinite scroll, polling, focus refetch, client-heavy dashboards. NOT for initial loads, mutations, or simple CRUD.

**useOptimistic**: Deletes, toggles, simple updates. NOT for complex forms, financial ops, bulk actions.

**Decision**: URL state/filters/pagination → Client | Dialogs → Client | Real-time/infinite scroll → Client + TanStack Query | Just displaying data → Server

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

## Backend - Ultra-Native NestJS

**ALLOWED**: Official @nestjs/* packages, built-in pipes/guards/decorators, native exceptions, direct Supabase RPC

**FORBIDDEN**: Custom decorators/pipes/interceptors/events, wrappers, helpers, factories, builders, custom errors

**DECISION**: Published on npm under @nestjs/* or official docs = allowed. You're creating it = forbidden.

### DTOs
**Why Classes**: Runtime existence, reflection metadata, decorator support (interfaces erased at runtime)

**Input**: `nestjs-zod` + `createZodDto()` + ZodValidationPipe - schemas in `packages/shared/src/validation/`

**Output**: `class-transformer` + ClassSerializerInterceptor - `@Exclude()` for sensitive fields

**Validation Groups**: `.partial()`, `.pick()`, `.omit()` (Zod built-in, NOT custom)

**FORBIDDEN**: Custom decorators, custom pipes, DTO factories, custom base classes, wrappers

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

**PHILOSOPHY**: TanStack Query for data ONLY. Server Actions + useOptimistic for mutations.

**Organization**: `hooks/api/use-{entity}.ts` (TanStack Query), `hooks/use-{entity}-form.ts` (TanStack Form)

### TanStack Query (Data Only)
- Keys: Hierarchical (`entityKeys.all`, `entityKeys.list()`, `entityKeys.detail(id)`)
- Hooks: `useEntity(id)`, `useAllEntities()` (TanStack Query cache is single source of truth)
- Prefetch: `usePrefetchEntity()` for hover
- **NO MUTATIONS** - use Server Actions

### TanStack Form
- Basic: `useEntityForm()`
- Update: `useEntityUpdateForm()`
- Transformers: `useEntityFieldTransformers()`
- Async validation: `useAsyncEntityValidation()`

### PROHIBITIONS
- ❌ Inline queries/mutations
- ❌ Duplicate hooks (search first)
- ❌ Mix concerns
- ❌ TanStack Query mutations
- ❌ Mock data
- ❌ Optimistic via TanStack Query

### Required
- Hover prefetching
- Structural sharing
- Cache: Lists (10min/30min), Details (5min/10min)
- NO placeholder data
- NO optimistic via TanStack Query
- TanStack Query cache is single source of truth (NO entity stores)

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
