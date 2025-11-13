# Agent Notes - TenantFlow Backend

## Compile-Time Config Constants
- Source of truth: `apps/backend/src/config/config.constants.ts`.
- Exposes readonly tuples for `NODE_ENVIRONMENTS`, `LOG_LEVELS`, `STORAGE_PROVIDERS`.
- `CONFIG_DEFAULTS` stores every static env default (PORT, FRONTEND_URL, Stripe sync toggles, Supabase project ref, etc.).
- Always import from this file instead of retyping literals to keep bundles tree-shakable and avoid drift.

## Schema + Services
- `config.schema.ts` now pulls defaults/enums directly from `config.constants`.
- `AppConfigService` relies on `CONFIG_DEFAULTS` for fallback logic (Supabase project ref, Stripe country) and exports typed getters.
- Bootstrapping (`main.ts`) references `CONFIG_DEFAULTS.PORT` so runtime logic matches schema defaults.

## Testing Guidance
- Use the helper in `config.schema.spec.ts` (`createValidConfig()`) when validating new env fields. Extend the base config rather than redefining mocks.
- When adding constants, update both `CONFIG_DEFAULTS` and the spec helper, then run `pnpm --filter @repo/backend test:unit -- config.schema.spec.ts`.

# TenantFlow Development Guide

**BEFORE EVERY ACTION: USE MCP SERVER SERENA! Activate project if not available.**

When providing commit messages, never include attribution.

## Project Structure
Turborepo monorepo: `apps/frontend` (Next.js 15/React 19), `apps/backend` (NestJS), `packages/shared` (types/validation/utils)

## Core Principles
- **DRY**: Search first (`rg -r "pattern"`), consolidate code reused ≥2 places
- **KISS**: Simplest solution wins, delete > add code
- **NO ABSTRACTIONS**: Use native platform features directly (fetch, NestJS decorators, TanStack Query)
- **NO EMOJIS**: Professional communication, use Lucide Icons for UI
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious

## Tech Stack
**Frontend**: Next.js 15 + React 19 + TailwindCSS 4 + ShadCN/UI + TanStack Query 5 + Zustand 5 (UI preferences only)
**Backend**: NestJS + Supabase + Stripe + Resend
**Shared**: Node.js 22, pnpm, Turborepo, TypeScript strict, Zod

## Database
**Migrations**: `mcp__supabase__apply_migration` → `pnpm update-supabase-types` → commit
**CRITICAL**: `public.users.id` is `text`, NOT `uuid` - use `auth.uid()::text`
**Connections**: `DIRECT_URL` (DDL), `DATABASE_URL` (DML)

## TypeScript Types
**Location**: `packages/shared/src/types/`
**ZERO TOLERANCE**: NO duplicates, NO custom utils (use Omit/Partial/Pick), search before adding
**Database Enums**: Use `Database['public']['Enums']['enum_name']` (23 types)
**FORBIDDEN**: TypeScript `enum`, duplicating DB enums, union types mirroring DB

## Frontend - Data Fetching

**PHILOSOPHY**: Native `fetch()` ONLY. NO wrappers, NO api-client, NO abstractions.

**Patterns**:
- Initial load: Server Component + `fetch(process.env.API_BASE_URL)`
- Client queries: TanStack Query `useQuery` with native `fetch()`
- Simple mutations: `useTransition + fetch()`
- Complex mutations: `useMutation` (retries, versioning, multi-cache, global errors)
- Optimistic UI: Single component = `useOptimistic`, Multi-component = `useMutation` cache updates

**State Management**:
- Remote: Server Components first, TanStack Query for client
- URL: nuqs
- Local: useState/useReducer
- Shared: Prop drilling or Context
- UI Preferences: Zustand ONLY (theme, density, wizard state)

**Custom Hooks**: ALLOWED - wraps `useQuery`/`useMutation`, NO HTTP abstraction layer

**FORBIDDEN**:
- NO: api-client.ts, HTTP wrappers, custom fetch utilities
- NO: Server Actions (use direct API calls)
- NO: Inline queries (extract to hooks)
- NO: `useEffect + fetch` (use Server Components or TanStack Query)
- NO: Entity data in Zustand

**Cache**: Lists 10min, Details 5min, Stats 1min, Real-time 30s refetch

**Hook Organization**: `hooks/api/use-{entity}.ts` - Query hooks, `hooks/use-{entity}-form.ts` - Form hooks

## Frontend - Routing

**ARCHITECTURE**: Intercepting Routes + Parallel Routes for modal UX with URL support

**File Structure**: `manage/{entity}/layout.tsx` (enables @modal), `page.tsx` (list), `new/page.tsx` (full-page), `[id]/edit/page.tsx` (full-page), `@modal/default.tsx` (null), `@modal/(.)new/page.tsx` (modal), `@modal/(.)[id]/edit/page.tsx` (modal)

**Pattern**:
- Soft nav (Link) → Modal overlay via `RouteModal`
- Hard nav (direct URL) → Full page
- Consolidated forms: `mode: 'create' | 'edit'` prop

**FORBIDDEN**: Inline dialogs, CreateDialog base components, separate create/edit forms

## Frontend - Testing
**Philosophy**: Test production usage ONLY, not every hook that exists
**Pattern**: Integration tests with `renderHook`, cleanup in `afterEach`, shared QueryClient for cache tests
**Critical**:
- Share QueryClient between mutation and query hooks
- Populate cache before testing optimistic locking
- Never `waitFor(async () => ...)` - causes 30s timeouts
- Cleanup in reverse foreign key order

**Business Rules**:
- Properties: NO DELETE tests (7-year retention), YES MARK SOLD
- Rent Payments: YES CREATE/READ, NO UPDATE/DELETE (immutable)

**Run**: `pnpm --filter @repo/frontend test:integration`
**Config**: `vitest.integration.config.js`, jsdom, 30s timeout, serial execution

## CSS
Implement globals.css for marketing pages and dashboard.css for the (protected) route.
**TailwindCSS 4.1**: 90% utilities, 10% design tokens
**NEVER**: Inline styles, CSS modules, custom classes, pixel values
**Touch-first**: 44px min height (`min-h-11`)
**Colors**: OKLCH only
**Component Libraries**: ShadCN/UI, Magic UI

## Backend - NestJS
**PHILOSOPHY**: Official NestJS patterns ONLY. Published under @nestjs/* = ALLOWED. Custom abstractions = FORBIDDEN.
**ALLOWED**:
- Built-in decorators/pipes/guards
- Native exceptions (BadRequestException, etc.)
- Direct Supabase RPC calls
- Custom param decorators (`@User()`, `@UserId()`)
- Saga pattern for multi-system workflows

**FORBIDDEN**:
- Custom exception classes
- Wrappers around fetch/Supabase/Stripe
- Factory patterns, builders
- Custom event emitters (use @nestjs/event-emitter)

### Validation

**Method**: `nestjs-zod` + `createZodDto()` + global `ZodValidationPipe`
**Schemas**: `packages/shared/src/validation/*.schemas.ts`
**DTOs**: Create classes in controller `dto/` folders using `createZodDto(schema)`
**FORBIDDEN**: DTO factories, manual validation

### Architecture

- **SharedModule** (@Global()): Guards, pipes, Logger, Reflector, custom decorators
- **Domain Modules**: Controller + Service + Module (flat, no sub-modules)
- **Controllers**: Delegate to services, use `@User()` decorator
- **Services**: Simple queries <30 lines direct RPC, Complex workflows <150 lines Saga pattern
- **Guards**: Constructor init, Reflector metadata, cache lookups, composition via `applyDecorators()`
- **Caching**: `@CacheKey() + @CacheTTL()` decorators (ZeroCacheService)
- **Context**: `@Request() req: AuthenticatedRequest` or custom `@User()` decorator
- **Errors**: Built-in NestJS exceptions ONLY

### Webhooks

**Pattern**: Use official `RawBodyRequest<Request>` from `@nestjs/common`
**Setup**: `rawBody: true` in main.ts when creating NestApp
**Controller**: Import from @nestjs/common and express, use for signature verification
**FORBIDDEN**: Custom RawBodyRequest types, central webhook router

### TypeScript Config

**Current** (`packages/typescript-config/nestjs.json`):
- `isolatedModules: false` - No benefit for `nest build` (uses tsc)
- `emitDecoratorMetadata: true` - REQUIRED for NestJS DI
- `experimentalDecorators: true` - REQUIRED for decorators

**Why**: Prevents TS1272 error, allows official NestJS patterns without custom type workarounds
**Alternative Considered**: `verbatimModuleSyntax` - Rejected (requires `.js` extensions in ~2000+ imports)
**AVOID**: Project References, TypeScript `paths`, missing env vars in turbo.json, root file changes (invalidates caches)