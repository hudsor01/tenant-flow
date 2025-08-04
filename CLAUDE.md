# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Status

**Branch**: `fix-react-children-and-lint-errors`
**Production**: Backend at api.tenantflow.app, Frontend on Vercel
**Active Work**: React.Children error resolution, Navigation fixes, lint cleanup

## Tech Stack & Architecture

TenantFlow is a production-ready multi-tenant SaaS property management platform with enterprise-grade architecture:

- **Frontend**: React 19 + Vite + TanStack Router + Zustand + TypeScript
- **Backend**: NestJS + Fastify + Prisma + PostgreSQL (Supabase)
- **Auth**: Supabase Auth + JWT + Row-Level Security (RLS)
- **Payments**: Stripe subscriptions + webhooks
- **Infrastructure**: Turborepo monorepo, Vercel frontend, custom backend hosting

## Essential Commands

**Development**: `npm run dev` starts all apps, `npm run claude:check` auto-fixes lint/type errors (ALWAYS run before commit)

**Testing**: `npm run test` for all tests, `npm run test:e2e` for Playwright, `cd apps/frontend && npm run test:unit:watch` for frontend test watch

**Database**: `cd apps/backend && npm run generate` for Prisma client, `npm run migrate:dev` for migrations, `npm run prisma:studio` for database GUI

**Build**: `npm run build` for all packages, `npm run build:frontend` and `npm run build:backend` for individual apps

## Major Architectural Implementations

### BaseCrudService Revolution
The codebase underwent a major refactoring implementing a unified BaseCrudService pattern that eliminated 680+ lines of duplicated CRUD code. This service provides:
- Multi-tenant security with automatic ownership validation
- Built-in rate limiting (100 reads/min, 10 writes/min) 
- Type-safe generic abstractions across all business entities
- Centralized error handling with retry mechanisms
- Performance monitoring and audit logging

All business services (Properties, Tenants, Units, Leases, Maintenance) extend this base pattern ensuring consistency and security.

### Multi-Tenant Row-Level Security
Sophisticated RLS implementation with:
- Prisma client pooling with separate admin (BYPASSRLS) and tenant-scoped connections
- Dynamic JWT claims injection for database-level tenant isolation
- Connection pool management (max 10 concurrent, 5-min TTL)
- Multiple security validation layers preventing data leakage

### React 19 Concurrent Features
Full adoption of React 19's concurrent capabilities:
- useTransition for non-blocking UI updates
- useOptimistic for instant UI feedback in forms
- useActionState for form actions with built-in state management
- Suspense boundaries with error recovery

## Frontend Architecture

### TanStack Router Implementation
File-based routing organized by authentication (`_authenticated`, `_public`, `_tenant-portal`) with enhanced router context, route preloading, and edge-based cache warming.

### State Management Strategy
Modular Zustand stores with persistence, Immer integration, and real-time synchronization. Separate stores for app state, properties, tenants, workflows, and navigation.

### Component System
Radix UI foundation with accessibility-first components, comprehensive error boundary system, memory-safe wrappers, and React Query integration for server state.

## Backend Services Architecture

### Core Business Services
Each service follows the BaseCrudService pattern:
- **Properties**: CRUD with document management, image uploads, analytics
- **Tenants**: Lifecycle management with lease associations and communication tracking  
- **Units**: Occupancy status, maintenance scheduling, rent tracking
- **Leases**: Document generation, reminders, expiration tracking
- **Maintenance**: Work orders with priority queuing, contractor assignment, cost tracking

### Infrastructure Services
- **Multi-Tenant Prisma**: Connection pooling, RLS context, performance monitoring
- **Error Handler**: Centralized processing with retry logic and structured logging
- **Security Audit**: Event tracking, anomaly detection, compliance logging

## Critical Integrations

### Supabase Integration
JWT-based authentication with RBAC, PostgreSQL with RLS policies and triggers, real-time WebSocket connections, and file storage with signed URLs.

### Stripe Payment Processing
Complete subscription lifecycle management with plan changes, proration, idempotent webhook processing, automated payment recovery, and self-service billing portal.

### Communication System
Resend integration for transactional emails, automated reminders (lease expiration, rent), and email tracking with engagement analytics.

## Security & Performance

### Security Implementation
- All endpoints protected by default (use @Public() decorator for exceptions)
- Database-level tenant isolation via RLS policies
- API versioning middleware with backward compatibility
- Rate limiting with tenant-specific quotas
- Comprehensive input validation with DTOs and class-validator

### Performance Optimizations
- **Database**: Prisma Accelerate edge caching, strategic composite indexing, selective field loading
- **Frontend**: Route-based code splitting, React Query 5-min stale time, image optimization
- **Infrastructure**: Turborepo build caching, Vercel edge functions, geographic distribution

## Development Workflow

1. **Environment Setup**: Copy `.env.example` to `.env.local`, configure Supabase/Stripe credentials
2. **Installation**: `npm install` from root, then `cd apps/backend && npm run generate`
3. **Development**: `npm run dev` to start all services
4. **Quality Checks**: `npm run claude:check` before every commit (auto-fixes lint/type errors)
5. **Testing**: Comprehensive Vitest unit tests, Supertest integration tests, Playwright E2E tests

## Critical Architectural Rules

1. **No Direct Database Access**: Frontend NEVER queries Supabase directly - always through backend API
2. **BaseCrudService Usage**: All CRUD operations must extend BaseCrudService for consistency and security
3. **Type Safety**: All API contracts use shared types from `@tenantflow/shared` package
4. **Multi-tenancy**: All database queries automatically filtered by organization via RLS
5. **Error Handling**: Use ErrorHandlerService with structured exceptions throughout

## Common Issues & Solutions

- **Prisma Client Error**: Run `cd apps/backend && npm run generate`
- **Type Errors**: Build shared package first with `npm run build --filter=@tenantflow/shared`
- **Port Conflicts**: Use `npm run dev:clean` in frontend to kill existing processes
- **Zod v4 Compatibility**: Use helper at `/apps/frontend/src/lib/zod-resolver-helper.ts` (DO NOT remove type casting)

## Deployment Architecture

- **Frontend**: Vercel with automatic deployment on main branch, requires all VITE_* environment variables
- **Backend**: Custom hosting at api.tenantflow.app with health checks at `/health` endpoint
- **Database**: Supabase with Prisma Accelerate for connection pooling and edge caching
- **Monitoring**: Comprehensive logging, error tracking, and performance monitoring

## Testing Strategy

Multi-layered testing approach:
- **Unit**: Vitest with React Testing Library for components and services
- **Integration**: Supertest for API endpoints with database isolation
- **E2E**: Playwright with visual regression testing for critical user journeys
- **Performance**: k6 load testing and bundle analysis

The codebase represents a mature, enterprise-ready SaaS application with sophisticated multi-tenancy, comprehensive security, and performance optimization throughout the stack. Recent architectural improvements have eliminated significant technical debt while establishing scalable development patterns.