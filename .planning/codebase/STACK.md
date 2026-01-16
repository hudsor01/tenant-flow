# Technology Stack

**Analysis Date:** 2026-01-15

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`package.json`)
- Go 1.24+ - Backend-v2 API alternative (`apps/backend-v2/go.mod`)

**Secondary:**
- SQL - Database migrations and RLS policies (`supabase/migrations/`)
- JavaScript - Build scripts, config files

## Runtime

**Environment:**
- Node.js 24+ (`package.json` engines field)
- Bun 1.2+ (alternative runtime, `package.json` engines)
- Go 1.24+ (for backend-v2)

**Package Manager:**
- pnpm 10.23+ (`package.json` packageManager field)
- Lockfile: `pnpm-lock.yaml` present
- Workspaces: Turborepo monorepo (`turbo.json`)

## Frameworks

**Core:**
- Next.js 16.0 - Frontend SSR/SSG (`apps/frontend/package.json`)
- React 19.1.0 - UI framework
- NestJS 11.1.1 - Backend API (`apps/backend/package.json`)

**Testing:**
- Jest 30.0.2 - Backend unit tests (`apps/backend/package.json`)
- Vitest 3.0.7 - Frontend unit tests (`apps/frontend/package.json`)
- Playwright 1.50.0 - E2E tests (`apps/e2e-tests/package.json`)

**Build/Dev:**
- Turborepo 2.5.4 - Monorepo orchestration
- TypeScript 5.9.3 - Compilation
- SWC - Fast transpilation via NestJS

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.50.0 - Database client and auth (`apps/frontend/package.json`)
- `@supabase/ssr` 0.6.1 - Server-side auth handling
- `stripe` 18.0.0 - Payment processing (`apps/backend/package.json`)
- `bullmq` 5.52.0 - Job queue processing (`apps/backend/package.json`)
- `ioredis` 5.6.1 - Redis client for queues

**Infrastructure:**
- `@tanstack/react-query` 5.75.5 - Data fetching and caching
- `@tanstack/react-form` 1.12.2 - Form state management
- `zustand` 5.0.4 - Global UI state
- `zod` 4.0.5 - Schema validation (`packages/shared/package.json`)

**UI:**
- TailwindCSS 4.1.8 - Styling (`apps/frontend/package.json`)
- Radix UI - Headless components (shadcn/ui)
- Lucide React 0.511.0 - Icons

**Backend Services:**
- `@nestjs-modules/mailer` 2.0.2 + Resend - Email
- `winston` 3.17.0 - Logging
- `prom-client` 15.1.3 - Prometheus metrics
- `puppeteer` 24.9.0 - PDF generation
- `docuseal` integration - Document signing

## Configuration

**Environment:**
- Doppler for secrets management
- `.env.local` for local development (gitignored)
- Environment variables via `turbo.json` pipeline

**Build:**
- `turbo.json` - Monorepo task configuration
- `tsconfig.json` - TypeScript config (extends from `packages/typescript-config/`)
- `next.config.ts` - Next.js configuration
- `nest-cli.json` - NestJS CLI configuration

## Platform Requirements

**Development:**
- macOS/Linux/Windows (any platform with Node.js 24+)
- Docker for local Supabase (optional)
- pnpm 10+ required

**Production:**
- Frontend: Vercel (Next.js hosting)
- Backend: Railway (NestJS API, port 4650)
- Database: Supabase PostgreSQL
- Cache: Redis (Railway or Upstash)
- Queue: BullMQ workers on Railway

---

*Stack analysis: 2026-01-15*
*Update after major dependency changes*
