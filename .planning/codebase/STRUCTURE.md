# Codebase Structure

**Analysis Date:** 2026-01-15

## Directory Layout

```
tenant-flow/
├── apps/
│   ├── frontend/          # Next.js 16 app (port 3050)
│   ├── backend/           # NestJS 11 API (port 4650)
│   ├── backend-v2/        # Go alternative backend (experimental)
│   └── e2e-tests/         # Playwright E2E tests
├── packages/
│   ├── shared/            # Types, validation, utilities
│   └── typescript-config/ # Shared TSConfig
├── supabase/
│   ├── migrations/        # SQL migration files
│   └── seed.sql           # Seed data
├── .github/
│   └── workflows/         # CI/CD pipelines
├── .claude/
│   └── rules/             # Claude Code instructions
├── turbo.json             # Turborepo config
├── pnpm-workspace.yaml    # Workspace definition
└── package.json           # Root package
```

## Directory Purposes

**apps/frontend/**
- Purpose: Next.js frontend application
- Contains: React components, App Router pages, hooks, stores
- Key files: `src/app/layout.tsx`, `src/middleware.ts`, `next.config.ts`
- Subdirectories:
  - `src/app/` - Next.js App Router (pages, layouts, API routes)
  - `src/components/` - React components (ui/, domain-specific/)
  - `src/hooks/` - Custom hooks (api/, utility hooks)
  - `src/stores/` - Zustand state stores
  - `src/lib/` - Utilities, Supabase client, API client

**apps/backend/**
- Purpose: NestJS REST API
- Contains: Controllers, services, modules, guards
- Key files: `src/main.ts`, `src/app.module.ts`, `nest-cli.json`
- Subdirectories:
  - `src/modules/` - Domain modules (27 total)
  - `src/shared/` - Global shared code (guards, middleware, logger)
  - `src/database/` - Supabase client configuration
  - `test/` - Integration tests

**apps/backend-v2/**
- Purpose: Go alternative backend (experimental)
- Contains: Go modules, Chi router, handlers
- Key files: `main.go`, `go.mod`
- Status: Incomplete, 0% test coverage

**apps/e2e-tests/**
- Purpose: End-to-end tests
- Contains: Playwright test specs
- Key files: `playwright.config.ts`
- Subdirectories: `tests/` - Test files

**packages/shared/**
- Purpose: Shared TypeScript code between apps
- Contains: Types, Zod schemas, utilities
- Key files: `src/types/core.ts`, `src/validation/index.ts`
- Subdirectories:
  - `src/types/` - TypeScript type definitions
  - `src/validation/` - Zod schemas

**packages/typescript-config/**
- Purpose: Shared TypeScript configuration
- Contains: Base tsconfig files
- Key files: `base.json`, `nextjs.json`, `nestjs.json`

**supabase/**
- Purpose: Database schema and migrations
- Contains: SQL migration files, seed data
- Key files: `migrations/*.sql`, `seed.sql`
- Note: 82 migration files, 35 skipped (.sql.skip)

## Key File Locations

**Entry Points:**
- `apps/frontend/src/app/layout.tsx` - Frontend root layout
- `apps/backend/src/main.ts` - Backend server startup
- `apps/e2e-tests/playwright.config.ts` - E2E test config

**Configuration:**
- `turbo.json` - Turborepo task configuration
- `packages/typescript-config/*.json` - Shared TS configs
- `apps/frontend/next.config.ts` - Next.js config
- `apps/backend/nest-cli.json` - NestJS CLI config
- `.env.local` - Local environment (gitignored)

**Core Logic:**
- `apps/backend/src/modules/` - All backend domain logic
- `apps/frontend/src/hooks/api/` - Data fetching hooks
- `packages/shared/src/types/` - Type definitions
- `packages/shared/src/validation/` - Zod schemas

**Testing:**
- `apps/backend/src/**/*.spec.ts` - Backend unit tests (co-located)
- `apps/frontend/src/**/__tests__/` - Frontend unit tests
- `apps/e2e-tests/tests/` - Playwright E2E tests
- `apps/backend/test/` - Backend integration tests

**Documentation:**
- `CLAUDE.md` - Project coding standards
- `.claude/rules/` - Additional Claude instructions
- `CODEBASE_HEALTH_REPORT.md` - Technical debt analysis

## Naming Conventions

**Files:**
- `kebab-case.ts` for modules (`property-card.tsx`, `use-tenant.ts`)
- `PascalCase.tsx` for React components in some areas
- `*.spec.ts` for backend tests, `*.test.ts` for frontend tests
- `*.dto.ts` for NestJS DTOs
- `*.module.ts`, `*.controller.ts`, `*.service.ts` for NestJS

**Directories:**
- `kebab-case` for all directories
- Plural for collections (`components/`, `hooks/`, `modules/`)

**Special Patterns:**
- NO barrel files (`index.ts` re-exports forbidden per CLAUDE.md)
- `#` path alias for frontend (`#components/`, `#hooks/`, `#lib/`)
- `@repo/` for package imports (`@repo/shared/types/core`)

## Where to Add New Code

**New Feature (Backend):**
- Primary code: `apps/backend/src/modules/{feature}/`
- Create: `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`
- DTOs: `apps/backend/src/modules/{feature}/dto/`
- Tests: `apps/backend/src/modules/{feature}/*.spec.ts`

**New Feature (Frontend):**
- Pages: `apps/frontend/src/app/{route}/page.tsx`
- Components: `apps/frontend/src/components/{feature}/`
- Hooks: `apps/frontend/src/hooks/api/{feature}.ts`
- Tests: `apps/frontend/src/hooks/__tests__/{feature}.test.ts`

**New Shared Type:**
- Definition: `packages/shared/src/types/core.ts` or domain-specific file
- Validation: `packages/shared/src/validation/{schema}.ts`
- Never duplicate types between frontend/backend

**New Database Table:**
- Migration: `supabase/migrations/{timestamp}_{description}.sql`
- RLS policies: Include in same migration
- Regenerate types: `pnpm db:types`

**Utilities:**
- Frontend: `apps/frontend/src/lib/`
- Backend: `apps/backend/src/shared/`
- Shared: `packages/shared/src/utils/`

## Special Directories

**.vercel/**
- Purpose: Vercel build cache and output
- Source: Auto-generated during deployment
- Committed: No (gitignored)

**node_modules/**
- Purpose: Dependencies
- Source: pnpm install
- Committed: No (gitignored)

**supabase/migrations/*.sql.skip**
- Purpose: Skipped/problematic migrations
- Source: Manual rename to skip execution
- Note: 35 files skipped due to RLS policy issues (see CODEBASE_HEALTH_REPORT.md)

---

*Structure analysis: 2026-01-15*
*Update when directory structure changes*
