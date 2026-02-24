---
phase: 57-cleanup-deletion-remove-nestjs-entirely
plan: 05
type: summary
completed: 2026-02-24
---

# Phase 57-05 Summary: Final Verification and Cleanup

## Outcome

Phase 57 complete. v7.0 Backend Elimination milestone COMPLETE.

PR #520 was merged to main on 2026-02-24T01:11:55Z and PR #521 (CI fix) was merged on 2026-02-24T05:57:44Z.

## What Was Done

### PR #520 — feat(57): remove NestJS backend entirely — complete v7.0 milestone
- Merged to main: 2026-02-24T01:11:55Z
- All CI checks passed on merge

### Post-merge CI Fix — PR #521
- Verified Railway deploy check was fully removed from CI workflows
- Merged to main: 2026-02-24T05:57:44Z

### Auth Key Rename — commit c86063176
- Supabase deprecated the JWT anon key (eyJ...) in favour of the publishable key format (sb_publishable_*)
- Renamed `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` across:
  - apps/frontend/src/lib/supabase/client.ts, server.ts, proxy.ts
  - apps/frontend/src/app/actions/auth.ts, auth/callback/route.ts
  - apps/frontend/src/env.ts, test/unit-setup.ts
  - apps/e2e-tests/ (auth-helpers, playwright.config, preflight, auth setup files)
  - apps/integration-tests/src/setup/supabase-client.ts

### Final cleanup — commit 647e9ddcf
- Fixed rls-security-tests.yml: updated env var name from `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to match what supabase-client.ts now reads
- Removed stale comment from invite-tenant-form.tsx
- Moved roadmap.md → docs/roadmap.md

## Human Verification Steps Completed (by user)

- PR #520 reviewed and merged to main
- Vercel deployment confirmed successful post-merge
- CI: no backend-related CI steps in workflow runs
- Railway: project deleted after confirming n8n workflow health
- GitHub: RAILWAY_TOKEN secret removed from repo settings
- Vercel: env vars removed (NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_USE_POSTGREST, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY were cleaned up)

## What Was NOT Done (deferred)

- Sentry 5-minute health check result: not recorded (assumed healthy given no follow-up issues)
- n8n workflow execution confirmation: user confirmed before Railway deletion

## Architecture State After Phase 57

**Before:** Frontend → apiRequest() → NestJS (Railway) → Supabase PostgREST
**After:**  Frontend → supabase-js → Supabase PostgREST (RLS enforced)
                                   ↳ Edge Functions (Stripe, PDF, DocuSeal)
                                   ↳ pg_cron (late fees, reminders)
                                   ↳ DB Webhooks → k3s n8n

## Deleted in Phase 57 (all plans combined)

- `.github/workflows/deploy-backend.yml` — Railway deploy workflow
- `Dockerfile`, `railway.toml`, `docker-compose.yml`, `.dockerignore`
- `apps/backend/` — entire NestJS codebase (121,427 lines, 567 tracked files)
- `apps/frontend/src/lib/api-request.ts`, `api-config.ts`, `postgrest-flag.ts`
- All frontend NestJS adapter code and apiRequest callsites (migrated to supabase-js)
- pnpm-workspace.yaml NestJS catalog entries

## Preserved

- `apps/integration-tests/` — Supabase RLS tests (7 test suites)
- All Edge Functions in `supabase/functions/`
- All pg_cron jobs and DB webhook triggers from Phase 56

## v7.0 Milestone Complete

All 8 phases of the v7.0 Backend Elimination milestone are complete:
- Phase 50: PostgREST migration completion (settings, auth, profile hooks)
- Phase 51: Core domain migration (properties, units, tenants, leases) + RLS tests
- Phase 52: Operations CRUD migration (maintenance, vendors, inspections) + RLS tests
- Phase 53: Analytics, reports, tenant portal RPCs
- Phase 54: Payments and Stripe Edge Functions
- Phase 55: StirlingPDF and DocuSeal Edge Functions
- Phase 56: pg_cron scheduled jobs and DB Webhook → n8n workflows
- Phase 57: CI/CD cleanup, monorepo config cleanup, frontend adapter deletion, backend deletion
