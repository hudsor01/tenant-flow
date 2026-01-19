# TenantFlow

## What This Is

TenantFlow is a production-ready multi-tenant property management SaaS platform (Next.js 16 + NestJS 11 + Supabase) with enterprise-grade Stripe integration and documented architectural best practices. Property managers and owners can manage properties, tenants, leases, maintenance requests, payments, and financial reporting with automated rent collection and Stripe Connect payouts.

## Core Value

**Production-ready Stripe integration with proper observability** — comprehensive payment flows, atomic webhook processing, ACH-first tenant payments, and Connect-based owner payouts with full test coverage.

## Requirements

### Validated

- ✓ RLS security vulnerabilities fixed — v1.0 (active_entitlements, UPDATE policies)
- ✓ Database migrations consolidated — v1.0 (35 skipped files resolved, 9 duplicate functions fixed)
- ✓ Test coverage increased on payment/lease systems — v1.0 (backend coverage improved)
- ✓ StripeModule god module split — v1.0 (15+ services organized into focused modules)
- ✓ DevOps standardized — v1.0 (type-safe env validation, CI/CD automation)
- ✓ Large controllers split — v1.1 (stripe.controller -85%, reports.controller -75%)
- ✓ Large services decomposed — v1.1 (utility.service -52%, connect.controller -24%)
- ✓ Stripe SDK monitoring — v2.0 (request IDs, slow request warnings, rate limit detection)
- ✓ Pagination data loss fixed — v2.0 (SDK auto-pagination replaces 1,000 item hard limit)
- ✓ Webhook race conditions fixed — v2.0 (atomic RPC functions with transactions)
- ✓ Webhook observability — v2.0 (Prometheus metrics, DLQ alerting via Sentry)
- ✓ Checkout UI implemented — v2.0 (pricing page, plan selection, upgrade dialogs)
- ✓ Payment methods UI — v2.0 (ACH-first ordering, cost savings messaging, Express Checkout)
- ✓ Stripe Connect dashboard — v2.0 (account status, requirements, payout details, CSV export)
- ✓ Stripe documentation alignment — v2.0 (429 rate limits, idempotency keys)
- ✓ Payment service test coverage — v2.0 (212 unit tests for all Stripe services)
- ✓ Stripe E2E tests — v2.0 (Connect onboarding flow with mock-based testing)
- ✓ Supabase client patterns documented — v3.0 (ADR-0004: three-tier strategy)
- ✓ RPC usage patterns codified — v3.0 (ADR-0005: 40+ functions inventoried)
- ✓ API response standards defined — v3.0 (ADR-0006: consistent formats)
- ✓ Module architecture audited — v3.0 (ADR-0007: oversized modules identified)
- ✓ Cold start baseline established — v3.0 (ADR-0008: 0.87s for 53 modules)

### Active

(No active requirements — awaiting next milestone definition)

### Out of Scope

- New features without security/stability foundation — addressed in v1.0
- Greenfield rewrite — incremental improvements only
- Perfect coverage — practical targets (70% backend, 50% frontend)
- Mobile app — web-first approach, PWA works well
- Video chat — use external tools

## Context

**Current State (v3.0 shipped):**
- Backend: 121,619 LOC TypeScript
- Frontend: 130,892 LOC TypeScript/TSX
- Shared: 22,354 LOC TypeScript
- 212 payment service unit tests
- 66 E2E tests + 15 Connect E2E tests
- Full Stripe integration with observability
- 5 ADRs documenting architectural patterns (0004-0008)
- 0.87s cold start for 53 NestJS modules

**Tech Stack:**
- Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand
- NestJS 11 + PostgreSQL via Supabase + Stripe + BullMQ
- TypeScript 5.9 strict mode + Zod 4 validation
- pnpm 10 workspaces monorepo

**Codebase Map:** `.planning/codebase/` contains 7 analysis documents

**Known Issues:**
- Billing module oversized (14k lines) — decomposition deferred (ADR-0007)
- Tenant module has 16 services — consolidation deferred (ADR-0007)
- 7 API response inconsistencies logged — cleanup deferred (ADR-0006)

## Constraints

- **Tech Stack**: Must use existing stack (Next.js, NestJS, Supabase) — no rewrites
- **Security**: RLS policies enforced on all tables
- **Testing**: All changes must have tests; no decreasing coverage
- **Stripe**: API version pinned to 2025-11-17.clover
- **Doppler**: Current secret management; .env.local fallback for offline dev

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix security first | active_entitlements vulnerability exposes all entitlements | ✓ Good — v1.0 |
| Consolidate migrations | 35 skipped files blocking schema stability | ✓ Good — v1.0 |
| Split StripeModule | 15+ services in god module is unmaintainable | ✓ Good — v1.0 |
| Go backend removed | Never had one, user clarified | ✓ Closed — v3.0 |
| SDK auto-pagination | Eliminates 1,000 item hard limit data loss | ✓ Good — v2.0 |
| RPC-first webhook handlers | Atomic transactions without manual BEGIN/COMMIT | ✓ Good — v2.0 |
| Audit logging over RLS | Webhook handlers use admin client | ✓ Good — v2.0 |
| ACH-first payment ordering | Saves $39+ per rent payment vs cards | ✓ Good — v2.0 |
| Customer Portal for upgrades | Leverage Stripe's proration UX | ✓ Good — v2.0 |
| Mock-based E2E for Connect | Express requires manual identity verification | ✓ Good — v2.0 |
| 429 for rate limits | Proper HTTP status enables client backoff | ✓ Good — v2.0 |
| Three-tier Supabase clients | Admin/user pool/RPC separation clarifies security | ✓ Good — v3.0 |
| No lazy loading | All candidates have controllers (NestJS limitation) | ✓ Good — v3.0 |
| Inline docs over BEST_PRACTICES.md | Documentation at point of use more discoverable | ✓ Good — v3.0 |
| Defer billing decomposition | 0.87s startup excellent, refactoring not urgent | — Pending |

---
*Last updated: 2026-01-18 after v3.0 milestone*
