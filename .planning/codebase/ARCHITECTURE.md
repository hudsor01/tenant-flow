# Architecture

**Analysis Date:** 2026-01-15

## Pattern Overview

**Overall:** Full-Stack TypeScript Monorepo with Turborepo

**Key Characteristics:**
- Monorepo with pnpm workspaces (apps + packages)
- Server-side rendered frontend (Next.js App Router)
- REST API backend (NestJS with modular architecture)
- Shared TypeScript types and Zod validation schemas
- Multi-tenant SaaS with Supabase RLS for data isolation
- Background job processing via BullMQ/Redis

## Layers

**Frontend Layer (Next.js):**
- Purpose: Server-rendered UI with client interactivity
- Contains: React components, App Router pages, API routes
- Location: `apps/frontend/src/`
- Depends on: Backend API, Supabase client, shared types
- Used by: End users (browsers)

**Backend API Layer (NestJS):**
- Purpose: REST API, business logic, external integrations
- Contains: Controllers, services, guards, modules
- Location: `apps/backend/src/modules/`
- Depends on: Supabase database, Stripe, Redis, shared types
- Used by: Frontend, webhooks, external integrations

**Shared Package Layer:**
- Purpose: Type definitions and validation schemas
- Contains: TypeScript types, Zod schemas, utilities
- Location: `packages/shared/src/`
- Depends on: Zod only
- Used by: Both frontend and backend

**Database Layer (Supabase):**
- Purpose: Data persistence with RLS security
- Contains: PostgreSQL tables, RLS policies, functions
- Location: `supabase/migrations/`
- Depends on: Nothing
- Used by: Backend services, direct frontend queries (limited)

## Data Flow

**HTTP Request (Frontend → Backend):**

1. User action triggers React component
2. TanStack Query hook calls API endpoint
3. Request hits NestJS controller (`@Controller`)
4. Guards validate JWT auth (`JwtAuthGuard`)
5. Validation pipe checks DTO (`ValidationPipe` + Zod)
6. Service executes business logic
7. Supabase client queries database
8. Response returned through layers

**Webhook Processing (Stripe → Backend):**

1. Stripe sends webhook to `/api/v1/billing/webhook`
2. Controller validates signature via `stripe.webhooks.constructEvent`
3. Event routed to appropriate handler by type
4. Service updates database via Supabase
5. BullMQ job queued for async work (emails, etc.)
6. 200 response returned to Stripe

**State Management:**
- Server state: TanStack Query (caching, revalidation)
- Global UI state: Zustand stores
- Form state: TanStack Form
- URL state: nuqs (query string state)
- Auth state: Supabase session in httpOnly cookies

## Key Abstractions

**NestJS Modules:**
- Purpose: Domain-bounded feature groupings
- Examples: `apps/backend/src/modules/properties/`, `apps/backend/src/modules/billing/`, `apps/backend/src/modules/tenants/`
- Pattern: Each module has controller, service, DTOs, module file
- Count: 27 modules currently (billing module is oversized)

**Services:**
- Purpose: Business logic encapsulation
- Examples: `PropertiesService`, `StripeService`, `EmailService`
- Pattern: Injectable class with Supabase/external service dependencies
- Location: `apps/backend/src/modules/*/`

**DTOs (Data Transfer Objects):**
- Purpose: Request/response validation and typing
- Pattern: Zod schema in shared package → `createZodDto()` wrapper
- Location: `apps/backend/src/modules/*/dto/`

**TanStack Query Hooks:**
- Purpose: Data fetching with caching
- Examples: `useProperties()`, `useTenant()`, `useLeases()`
- Pattern: `queryOptions()` factory pattern
- Location: `apps/frontend/src/hooks/api/`

**React Components:**
- Purpose: UI rendering
- Pattern: Server Components by default, `'use client'` when needed
- Location: `apps/frontend/src/components/`

## Entry Points

**Frontend Entry:**
- Location: `apps/frontend/src/app/layout.tsx` (root layout)
- Triggers: HTTP request to any route
- Responsibilities: Render React tree, provide context

**Backend Entry:**
- Location: `apps/backend/src/main.ts`
- Triggers: Server startup
- Responsibilities: Bootstrap NestJS app, configure middleware, set global prefix `/api/v1`

**API Routes:**
- Location: `apps/frontend/src/app/api/` (Next.js API routes)
- Note: Most API calls go to backend, not Next.js API routes

## Error Handling

**Strategy:** Built-in NestJS exceptions, catch at controller boundaries

**Patterns:**
- Services throw NestJS exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`
- Global exception filter formats error responses
- Frontend handles via TanStack Query error states
- User-friendly error messages (no technical jargon)

**Error Types:**
- Validation: Zod schema errors → 400 Bad Request
- Auth: JWT invalid/expired → 401 Unauthorized
- Permission: RLS/guard failure → 403 Forbidden
- Not Found: Missing resources → 404 Not Found
- Server: Unexpected errors → 500 Internal Server Error

## Cross-Cutting Concerns

**Logging:**
- Winston logger service (`apps/backend/src/shared/logger/`)
- Structured JSON format
- Request/response logging middleware

**Validation:**
- Zod schemas as single source of truth (`packages/shared/src/validation/`)
- NestJS ValidationPipe with ZodDto
- Validated at API boundary

**Authentication:**
- Supabase Auth with JWT tokens
- Backend: `JwtAuthGuard` on protected routes
- Frontend: Middleware checks session, redirects to login

**Rate Limiting:**
- NestJS throttler module
- Per-route configuration

**Metrics:**
- Prometheus metrics via `prom-client`
- HTTP request duration, queue job counts

---

*Architecture analysis: 2026-01-15*
*Update when major patterns change*
