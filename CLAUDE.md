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
