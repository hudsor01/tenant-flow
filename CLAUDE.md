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

## Development Servers
**Frontend**: http://localhost:3000 (Next.js 16 dev server)
**Backend**: http://localhost:4600 (NestJS dev server)

Start both servers with:
```bash
# Terminal 1: Backend
doppler run -- pnpm --filter @repo/backend dev

# Terminal 2: Frontend
pnpm --filter @repo/frontend dev
```

## Hosting & Cost Management - Vercel Deployment

**CRITICAL**: This project uses a separate NestJS backend (Railway) + Next.js frontend (Vercel). Certain Next.js features trigger metered billing on Vercel even though we have a separate backend.

### Vercel Cost Model

**FREE (Always use these):**
- Static pages (`generateStaticParams()` pre-rendered at build time)
- Client Components (`'use client'` - runs in browser)
- Static assets (images, CSS, JS served from CDN)
- Edge cached responses (served from CDN after first request)

**PAID (Avoid unless necessary and APPROVED explicitly by the User):**
- ❌ Server Components (async pages without `'use cache'`)
- ❌ Server Actions (`'use server'` functions)
- ❌ API Routes (`app/api/*/route.ts`)
- ❌ Middleware (runs on every request)
- ❌ On-demand ISR (revalidation without caching)

### Cost-Conscious Development Rules

**Rule 1: Prefer Client Components for Dynamic Data**
- Use `'use client'` with TanStack Query for all user-specific data
- Browser fetches directly from Railway backend (zero Vercel cost)

**Rule 2: Use Static Generation for Static Content**
- Implement `generateStaticParams()` for blogs, marketing pages, documentation
- Pages are pre-rendered at build time and served from CDN

**Rule 3: Use Long Cache Times for Shared Data (If Approved)**
- Only with explicit user approval
- Use `'use cache'` with `cacheLife({ stale: 3600, revalidate: 86400 })`
- Shared data like dashboard stats, analytics

**Rule 4: NO Server Actions for Mutations**
- All mutations must use client-side TanStack Query `useMutation`
- Never use `'use server'` functions

**Rule 5: Minimize Middleware Usage**
- Only run on specific protected routes via `matcher` config
- Keep logic minimal (auth checks only)

### Cache Components Pattern (When Approved)

**Cost-optimized pattern:**
- Page component serves as static shell (no 'use cache' directive)
- Extract cacheable sections into separate async server components with 'use cache', cacheLife(), and cacheTag()
- Wrap cached components in Suspense boundaries with skeleton fallbacks
- Use client components with TanStack Query for user-specific data (zero Vercel cost)

**Key principle:** Page layouts and shells should be static or minimal. Only apply caching to data-fetching components that benefit from it.

### When Paid Features Are Acceptable

**Requires Explicit User Approval:**
- Cache Components with long TTL for shared, infrequently-updated data
- API Routes for webhooks from external services (Stripe, etc.)
- ISR with long revalidation periods
- Server-side auth checks for routing (e.g., landing page getClaims for authenticated user routing)

### Cost Monitoring

**Monthly Budget:** $5/month serverless invocations (maximum)

**Warning Signs:**
- Serverless invocations exceeding 500,000/month
- Average function duration over 1 second
- Cache hit rate below 90% for cached routes

### Architecture Decision

**Current (Cost-Optimized):**
- Static HTML/JS served from Vercel CDN
- Client-side data fetching with TanStack Query hits Railway NestJS backend directly
- Minimal serverless invocations for auth routing and webhooks only
- Target: $0-5/month Vercel costs