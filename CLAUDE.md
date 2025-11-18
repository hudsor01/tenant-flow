# CLAUDE.MD

**BEFORE EVERY ACTION: USE MCP SERVER SERENA! Activate project if not available.**

When providing commit messages, never include attribution.

## Project Structure
Turborepo monorepo:
Next.js 15/React 19
NestJS
Supabase (Auth/DB/Storage)
Stripe (Fraud Detection, Identity Verification and Payment Processing)
Resend/React Email - Email communications
Prometheus - Observability

## Core Principles
- **DRY**: Search first (`rg -r "pattern"`), consolidate code reused ≥2 places
- **KISS**: Simplest solution wins, delete > add code
- **NO ABSTRACTIONS**: Use native platform features directly aligning with official documentation sources only
- **NO EMOJIS**: Professional communication, use Lucide Icons for UI
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious

## Tech Stack
**Frontend**: Next.js 16 + React 19.2 + TailwindCSS 4 + ShadCN/UI + TanStack Query 5 + Zustand 5
**Backend**: NestJS + Supabase + Stripe + Resend
**Shared**: Node.js 22, pnpm, Turborepo, TypeScript strict, Zod

## Database
Generate DTOs from Zod schemas using createZodDto() pattern consistently.
Clear convention: ALWAYS use snake_case in .select(), .insert(), .update() calls; use camelCase in TypeScript objects.


**Location**: `packages/shared/src/types/`
**ZERO TOLERANCE**: NO duplicates, NO custom utils (use Omit/Partial/Pick), search before adding
**Database Enums**: Use `Database['public']['Enums']['enum_name']`
**FORBIDDEN**: TypeScript `enum`, duplicating DB enums, union types mirroring DB

## Frontend - Data Fetching
**Patterns**:
- Client queries: TanStack Query `useQuery` with native `fetch()`
- Simple mutations: `useTransition + fetch()`
- Complex mutations: `useMutation` (retries, versioning, multi-cache, global errors)
- Optimistic UI: Single component = `useOptimistic`, Multi-component = `useMutation` cache updates

**State Management**:
- URL: nuqs
- React 19.2
- Tanstack React Query
- Zustand

**Custom Hooks**: ALLOWED - wraps `useQuery`/`useMutation`, NO HTTP abstraction layer
**Cache**: Lists 10min, Details 5min, Stats 1min, Real-time 3min refetch

## Frontend - Routing
**ARCHITECTURE**: Intercepting Routes + Parallel Routes for modal UX with URL support

## Frontend - Testing
**Philosophy**: Test production usage ONLY, not every hook that exists

**Critical**:
- Share QueryClient between mutation and query hooks
- Populate cache before testing optimistic locking
- Never `waitFor(async () => ...)` - causes 30s timeouts
- Cleanup in reverse foreign key order

## CSS - Tailwindcss v4 | Shadcn UI
**TailwindCSS 4.1**: 90% utilities, 10% design tokens
**Touch-first**: 44px min height (`min-h-11`)
**Colors**: OKLCH

## Backend - NestJS
**PHILOSOPHY**:
- Official NestJS patterns, published under @nestjs/*
- Built-in decorators/pipes/guards
- Native exceptions (BadRequestException, etc.)
- Direct Supabase RPC calls
- Custom param decorators (`@User()`, `@UserId()`)

### Validation

**Method**: `nestjs-zod` + `createZodDto()` + global `ZodValidationPipe`
**DTOs**: Create classes in controller `dto/` folders using `createZodDto(schema)`

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
**Controller**: Import from @nestjs/common and express, use for signature verification

### TypeScript Config
**Current** (`packages/typescript-config/nestjs.json`):
- `isolatedModules: false` - No benefit for `nest build` (uses tsc)
- `emitDecoratorMetadata: true` - REQUIRED for NestJS DI
- `experimentalDecorators: true` - REQUIRED for decorators

**Doppler**: All env vars via `doppler run --`
**Env Validation**: `eslint-config-turbo` validates `process.env.*` in `turbo.json`