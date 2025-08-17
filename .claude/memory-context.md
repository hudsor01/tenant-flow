# TenantFlow Project Memory Context

## Project Overview
TenantFlow is a production-ready multi-tenant SaaS property management platform currently live at:
- Frontend: tenantflow.app (Vercel)
- Backend: api.tenantflow.app (Railway)

## Tech Stack (January 2025)
- **Frontend**: React 19.1.1 + Next.js 15.4.6 + Turbopack (REQUIRED) + TypeScript 5.9.2
- **Backend**: NestJS 11.1.6 + Fastify + PostgreSQL via Supabase
- **Auth**: Supabase Auth 2.55.0 + JWT + RLS
- **Payments**: Stripe 18.4.0
- **State**: Zustand 5.0.7 + TanStack Query 5.85.3 + Jotai 2.13.1
- **Requirements**: Node.js 22+, npm 10+

## Critical Knowledge
1. **MUST use Turbopack**: React 19 + Next.js 15 compatibility requires `--turbo` flag
2. **Repository Pattern**: Migrating from Prisma to BaseSupabaseRepository
3. **Multi-tenancy**: All queries filtered by organization via Supabase RLS
4. **Test Status**: 10/30 frontend test suites failing (33% failure rate)

## Current Priorities
1. Fix failing frontend tests
2. Complete Supabase migration (remove Prisma)
3. Server/client component separation
4. Implement tenant payment system

## Essential Commands
```bash
npm run dev              # Start with Turbopack
npm run claude:check     # Auto-fix lint/type errors
npm run test            # Run all tests
npm run deploy:test     # Validate before deployment
```

## Architecture Rules
- Frontend NEVER queries Supabase directly
- All CRUD operations use BaseCrudService
- Shared types from @repo/shared package
- Error handling via ErrorHandlerService

## Known Issues
- Frontend tests: 33% failure rate
- Backend: Minimal test coverage
- TypeScript: Requires 4-8GB memory for compilation
- Component architecture refactoring in progress

Last Updated: January 17, 2025