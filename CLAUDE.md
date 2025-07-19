# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

TenantFlow property management system - Turbo monorepo with React 19 + NestJS + TypeScript.

## Architecture
- **Frontend**: React 19 + TanStack Router + shadcn/ui + Tailwind v4
- **Backend**: NestJS + Prisma ORM + TRPC + PostgreSQL (Supabase-hosted)
- **Auth**: JWT + Google OAuth via Supabase
- **Deployment**: Vercel (Frontend), Serverless (Backend)
- **Node**: 22.x+ required
- **Database**: PostgreSQL with Prisma ORM
- **Payment**: Stripe integration
- **Email**: Resend for transactional emails

## Quick Start
```bash
npm install       # Install all dependencies
npm run dev       # Start both frontend + backend
npm run build     # Build entire monorepo
npm run typecheck # Type check all workspaces
npm run test:all  # Run all tests (unit + e2e)
```

## Essential Commands
```bash
# Development (Turbo optimized)
npm run dev                         # Start all services in parallel
cd apps/frontend && npm run dev     # Frontend only (port 5173)
cd apps/backend && npm run dev      # Backend only (port 3002)

# Database Operations
cd apps/backend && npm run generate # Generate Prisma client (required after schema changes)
cd apps/backend && npm run prisma:studio # Open Prisma Studio GUI
npx prisma migrate dev              # Create and apply migration

# Testing (Multi-layered)
npm run test:unit                   # Unit tests (Vitest)
npm run test:e2e                    # E2E tests (Playwright)
npm run test:e2e:headed             # E2E with browser UI
npm run test:e2e:ui                 # Playwright test UI

# Code Generation (Turbo Generators)
npm run generate                    # Interactive generator menu
npm run gen:component               # Generate React component with hooks
npm run gen:module                  # Generate NestJS module (controller + service + TRPC)
npm run gen:type                    # Generate shared TypeScript types

# Quality Assurance (CI Pipeline)
npm run check                       # Run lint + typecheck
npm run lint && npm run typecheck   # Must pass before commits
npm run format                      # Format all code with Prettier
```

## Monorepo Structure
```
tenant-flow/
├── apps/
│   ├── frontend/           # React 19 + TanStack Router
│   └── backend/            # NestJS + TRPC API
├── packages/
│   ├── types/              # Shared TypeScript definitions
│   └── typescript-config/  # Shared TS configurations
├── turbo/generators/       # Code generation templates
└── tests/                  # E2E test suite (Playwright)
```

## TRPC Architecture Pattern
The backend uses a modular TRPC setup with dependency injection:

```typescript
// Backend: Service-based routers
export const createPropertiesRouter = (services: { propertiesService: PropertiesService }) =>
  router({
    list: protectedProcedure.query(({ ctx }) => 
      services.propertiesService.findAllByOwner(ctx.user.id)
    ),
    create: protectedProcedure
      .input(createPropertySchema)
      .mutation(({ input, ctx }) => services.propertiesService.create(input, ctx.user.id))
  })

// Frontend: React Query integration
const { data: properties } = trpc.properties.list.useQuery()
const createProperty = trpc.properties.create.useMutation()
```

## Database Schema Architecture
- **Multi-tenant**: Properties owned by Users, contain Units, house Tenants
- **Billing**: Stripe subscriptions with usage tracking
- **Activity**: Comprehensive audit logging
- **Maintenance**: Request workflow with status tracking
- **Relations**: Proper foreign keys with cascade rules

## Component Organization
```
src/components/
├── modals/           # All modal dialogs (BaseFormModal pattern)
├── layout/           # Navigation, sidebars, layout shells
├── billing/          # Stripe integration components
├── properties/       # Property management features
├── tenant-management/ # Tenant-related functionality
└── ui/              # shadcn/ui components
```

## Code Standards
- **Naming**: camelCase (functions/vars), PascalCase (components/types)
- **Components**: Max 150 lines, decompose if larger
- **Imports**: Direct imports only (no barrel files)
- **Equality**: Always use `===` and `!==`
- **Tabs**: 4-space width for indentation
- **Never use the `any` or `never` types**
- **TRPC**: Use service injection pattern in routers
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query for server state, React state for UI

## Environment Configuration
```bash
# Frontend (.env.local)
VITE_BACKEND_URL=http://localhost:3002
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=

# Backend (.env)
DATABASE_URL=postgresql://...
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
```

## Testing Strategy
- **Unit**: Vitest for utilities and hooks
- **Component**: React Testing Library
- **E2E**: Playwright with test user management
- **API**: TRPC procedure testing via supertest

## Key Development Patterns
1. **Feature Modules**: Each domain (properties, tenants, etc.) has its own module
2. **TRPC Procedures**: Use `protectedProcedure` for authenticated endpoints
3. **Form Handling**: React Hook Form + Zod schemas + TRPC mutations
4. **File Uploads**: Multipart handling with Fastify + direct cloud storage
5. **Error Handling**: Consistent error responses across TRPC + frontend
6. **Type Safety**: Shared types package ensures frontend/backend sync