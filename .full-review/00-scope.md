# Review Scope

## Target

**PR #520: feat(57): remove NestJS backend entirely — complete v7.0 milestone**
Branch: `gsd/phase-57-cleanup-deletion-remove-nestjs-entirely` → `main`

This is a major architectural milestone: complete removal of the NestJS/Railway backend (~26k lines, 677 files deleted) and final migration of all data access to Supabase PostgREST + Edge Functions. Also includes migration of auth from `PUBLISHABLE_KEY` → `ANON_KEY`, cleanup of NestJS adapter files, and CI/CD updates.

**Stats:** +52,910 additions / -175,523 deletions across 1,172 files total (677 backend deletions + ~495 code changes)

## Key Changes

### Deletions
- `apps/backend/` — entire NestJS codebase (677 files, 23 modules)
- `.github/workflows/deploy-backend.yml` — Railway deploy workflow
- `Dockerfile`, `docker-compose.yml`, `railway.toml`, `.dockerignore` — infra files
- `apps/frontend/src/lib/api-request.ts`, `api-config.ts` — NestJS adapter
- `packages/eslint-config/nestjs.js`, `packages/typescript-config/nestjs.json` — NestJS configs

### Migrations / Updates
- **All frontend hooks** → Supabase PostgREST / Edge Function calls (direct `supabase.from(...)`)
- **Auth server files** → `ANON_KEY` replaces `PUBLISHABLE_KEY`
- **CI/CD** → Frontend-only test execution; RLS tests moved to `apps/integration-tests/`
- **New RLS integration tests** → `apps/integration-tests/src/rls/` (7 domains)
- **New DB migrations** → 14 new migration files (inspections, vendors, indexes, pg_cron, webhooks)
- **Supabase Edge Functions** → stripe-billing-portal, stripe-checkout, stripe-connect, stripe-webhooks, docuseal-webhook, export-report, generate-pdf
- **Unimplemented features stubbed** with `TODO(phase-57)` error messages

## Files Reviewed (Non-Backend Code Changes)

### CI/CD & Infrastructure
- `.github/workflows/ci-cd.yml` (modified)
- `.github/workflows/rls-security-tests.yml` (new)
- `pnpm-workspace.yaml`, `package.json`, `turbo.json`

### Frontend Hooks (data access migration)
- `apps/frontend/src/hooks/api/use-*.ts` (30+ hooks migrated)
- `apps/frontend/src/hooks/api/query-keys/*.ts`

### Frontend Pages & Components (apiRequest → PostgREST)
- 100+ frontend component/page files

### Auth & Supabase Clients
- `apps/frontend/src/lib/supabase/client.ts`, `server.ts`, `proxy.ts`
- `apps/frontend/src/app/actions/auth.ts`
- `apps/frontend/src/env.ts`

### Edge Functions
- `supabase/functions/stripe-*/index.ts`
- `supabase/functions/docuseal*/index.ts`
- `supabase/functions/export-report/index.ts`
- `supabase/functions/generate-pdf/index.ts`

### Database Migrations (14 new)
- `supabase/migrations/20260220*.sql` through `20260222*.sql`

### Shared Types & Validation
- `packages/shared/src/types/*.ts`
- `packages/shared/src/validation/*.ts`

### Integration Tests
- `apps/integration-tests/src/rls/*.rls.test.ts` (7 files)

### Stubs / TODOs (important for review)
- Features with `TODO(phase-57)` that throw errors instead of being implemented

## Flags

- Security Focus: no
- Performance Critical: no
- Strict Mode: no
- Framework: Next.js 15 + React 19 + TailwindCSS 4 + Supabase (PostgREST + Edge Functions) + TypeScript 5.9

## Review Phases

1. Code Quality & Architecture
2. Security & Performance
3. Testing & Documentation
4. Best Practices & Standards
5. Consolidated Report
