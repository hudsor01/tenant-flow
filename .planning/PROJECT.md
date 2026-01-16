# TenantFlow Health Remediation

## What This Is

TenantFlow is a multi-tenant property management SaaS platform (Next.js 16 + NestJS 11 + Supabase) with significant technical debt accumulated during rapid development. This project systematically addresses critical security vulnerabilities, database migration issues, low test coverage, and code complexity identified in the comprehensive health audit.

## Core Value

**Stabilize the foundation before shipping features** — fix security vulnerabilities in RLS policies, consolidate broken migrations, and increase test coverage on critical payment/lease paths to enable confident feature development.

## Requirements

### Validated

(Existing production codebase with:)
- Property management workflows (CRUD, multi-tenant)
- Tenant portal and lease management
- Stripe integration (subscriptions, Connect)
- Supabase Auth with RLS policies
- E2E test suite (66 tests, though 51 skipped)

### Active

- [ ] Phase 1: Fix critical RLS security vulnerabilities (active_entitlements, missing WITH CHECK)
- [ ] Phase 2: Consolidate database migrations (35 skipped files, 9 duplicate functions)
- [ ] Phase 3: Increase test coverage on payment/lease systems (31% → 70% backend target)
- [ ] Phase 4: Refactor god module and reduce code complexity
- [ ] Phase 5: Standardize DevOps (env vars, CI/CD, Go backend decision)

### Out of Scope

- New features — technical debt must be cleared first
- Go backend production use — 0% test coverage, decision pending
- Greenfield rewrite — incremental improvements only
- Perfect coverage — target 70% backend, 50% frontend, not 100%

## Context

**Health Report:** `CODEBASE_HEALTH_REPORT.md` documents all issues comprehensively.

**Codebase Map:** `.planning/codebase/` contains 7 analysis documents:
- STACK.md — TypeScript 5.9.3, Node 24+, Next.js 16, NestJS 11
- ARCHITECTURE.md — 27 backend modules, layered architecture
- STRUCTURE.md — Monorepo with apps/ and packages/
- CONVENTIONS.md — Prettier tabs, no semicolons, no barrel files
- TESTING.md — Jest (backend), Vitest (frontend), Playwright (E2E)
- INTEGRATIONS.md — Supabase, Stripe, Resend, Redis/BullMQ
- CONCERNS.md — Summary of all technical debt items

**Critical Issues:**
- 35 skipped migrations with security vulnerabilities
- `USING (true)` in active_entitlements grants all users access
- 5 UPDATE policies missing WITH CHECK clause
- 9 duplicate function definitions across migrations
- 15+ services in single StripeModule (god module)
- 181 admin client usages bypassing RLS

**Current Coverage:**
- Backend: 31% (target 70%)
- Frontend: 12% (target 50%)
- E2E: 66 tests, 51 skipped
- Go backend: 0%

## Constraints

- **Tech Stack**: Must use existing stack (Next.js, NestJS, Supabase) — no rewrites
- **Security**: RLS vulnerabilities must be fixed before any feature work
- **Timeline**: 6-phase plan, roughly 1-2 weeks per phase
- **Testing**: All changes must have tests; no decreasing coverage
- **Doppler**: Current secret management; .env.local fallback needed for offline dev

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix security first | active_entitlements vulnerability exposes all entitlements | — Pending |
| Consolidate migrations | 35 skipped files blocking schema stability | — Pending |
| Split StripeModule | 15+ services in god module is unmaintainable | — Pending |
| Go backend status | 0% test coverage, orphaned from CI/CD | — Pending |

---
*Last updated: 2026-01-15 after initial project setup*
