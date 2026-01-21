# Roadmap: TenantFlow

## Overview

This roadmap tracks the evolution of TenantFlow from initial health remediation through production-ready Stripe integration to backend architecture excellence. Each milestone builds on the previous foundation.

**Current Milestone:** Planning next milestone

## Milestones

- ✅ [**v1.0 Health Remediation**](milestones/v1.0-ROADMAP.md) — Phases 1-5 (shipped 2026-01-15)
- ✅ [**v1.1 Tech Debt Resolution**](milestones/v1.1-ROADMAP.md) — Phases 6-10 (shipped 2026-01-15)
- ✅ [**v2.0 Stripe Integration Excellence**](milestones/v2.0-ROADMAP.md) — Phases 11-17 (shipped 2026-01-17)
- ✅ [**v3.0 Backend Architecture Excellence**](milestones/v3.0-ROADMAP.md) — Phases 18-25 (shipped 2026-01-20)
- 🚧 **v4.0 Production-Parity Testing & Observability** — Phases 26-32 (in progress)

## Domain Expertise

- Official Stripe Documentation (https://docs.stripe.com)
- Stripe API Reference (https://stripe.com/docs/api)
- Stripe.js & Elements (https://stripe.com/docs/js)
- Stripe Connect (https://stripe.com/docs/connect)
- Stripe Webhooks (https://stripe.com/docs/webhooks)
- Supabase Documentation (https://supabase.com/docs)
- PostgreSQL Performance (https://www.postgresql.org/docs/current/performance-tips.html)
- NestJS Documentation (https://docs.nestjs.com)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 Health Remediation (Phases 1-5) — SHIPPED 2026-01-15</summary>

- [x] **Phase 1: Critical Security** — Fix RLS vulnerabilities in active_entitlements and UPDATE policies (2/2 plans)
- [x] **Phase 2: Database Stability** — Consolidate 35 skipped migrations and fix duplicate functions (2/2 plans)
- [x] **Phase 3: Test Coverage** — Add tests for payment/lease systems, enable skipped E2E tests (3/3 plans)
- [x] **Phase 4: Code Quality** — Split StripeModule god module, delete dead code, refactor large files (6/6 plans)
- [x] **Phase 5: DevOps** — Type-safe env validation, backend CI/CD automation (4/4 plans)

**Total:** 5 phases, 17 plans

</details>

<details>
<summary>✅ v1.1 Tech Debt Resolution (Phases 6-10) — SHIPPED 2026-01-15</summary>

**Milestone Goal:** Resolve remaining large controller/service files documented in TECH_DEBT.md

- [x] **Phase 6: Stripe Controller Split** — stripe.controller.ts: 760 → 116 lines (-85%) (1/1 plan)
- [x] **Phase 7: Reports Controller Split** — reports.controller.ts: 703 → 176 lines (-75%) (1/1 plan)
- [x] **Phase 8: Service Decomposition** — utility.service.ts: 590 → 286 lines (-52%), PDF assessed acceptable (1/1 plan)
- [x] **Phase 9: Connect Payouts** — connect.controller.ts: 605 → 460 lines (-24%) (1/1 plan)
- [x] **Phase 10: Final Polish** — TECH_DEBT.md updated, documentation complete (1/1 plan)

**Total:** 5 phases, 4 plans

</details>

<details>
<summary>✅ v2.0 Stripe Integration Excellence (Phases 11-17) — SHIPPED 2026-01-17</summary>

**Milestone Goal:** Achieve production-perfect Stripe integration across the full stack — fix all backend issues, implement proper frontend UI, and align everything with official Stripe documentation best practices.

**Issues Addressed:**
- TEST-002: Payment services lack unit test coverage (HIGH) → RESOLVED
- Pagination hard limit of 1,000 items causing data truncation (HIGH) → RESOLVED
- Webhook race conditions and missing transaction wrapping (MEDIUM) → RESOLVED
- RLS bypass in webhook handlers without tenant verification (MEDIUM) → RESOLVED
- Stripe Sync Engine missing monitoring/observability (MEDIUM) → DOCUMENTED
- Idempotency key generation untested (LOW) → RESOLVED
- Console.log debug statements in production scripts (LOW) → RESOLVED

- [x] **Phase 11: Stripe Backend Hardening** — Fix pagination, monitoring, debug logging (4/4 plans)
- [x] **Phase 12: Webhook Security & Reliability** — Fix race conditions, RLS enforcement, transactions (3/3 plans)
- [x] **Phase 13: Frontend Checkout & Subscriptions** — Checkout UI, subscription management, payment methods (3/3 plans)
- [x] **Phase 14: Stripe Connect & Payouts UI** — Connect onboarding, payout dashboard (2/2 plans)
- [x] **Phase 15: Stripe Documentation Alignment** — Align all code with official Stripe best practices (1/1 plan)
- [x] **Phase 16: Stripe Backend Test Coverage** — Add comprehensive unit tests for payment services (3/3 plans)
- [x] **Phase 17: Stripe E2E & Production Readiness** — E2E tests, production verification (2/2 plans)

**Total:** 7 phases, 18 plans

</details>

<details>
<summary>✅ v3.0 Backend Architecture Excellence (Phases 18-25) — SHIPPED 2026-01-20</summary>

**Milestone Goal:** Apply Supabase and Stripe best practices to NestJS backend for performance, scalability, and maintainability.

- [x] **Phase 18: Supabase Client & Connection Patterns** — Three-tier client strategy (ADR-0004) (1/1 plan)
- [x] **Phase 19: Query Performance & RPC Consolidation** — N+1 prevention, RPC guidelines (ADR-0005) (1/1 plan)
- [x] **Phase 20: API Request/Response Standardization** — Zod validation, response formats (ADR-0006) (1/1 plan)
- [x] **Phase 21: Module Architecture Audit** — Service boundaries (ADR-0007) (1/1 plan)
- [x] **Phase 22: Cold Start & Performance Optimization** — Performance baselines (ADR-0008) (1/1 plan)
- [x] **Phase 23: Documentation & Best Practices Guide** — Inline comments referencing ADRs (1/1 plan)
- [x] **Phase 24: Admin Client RLS Security Audit** — 52 files audited, 55 SEC-024 comments (1/1 plan)
- [x] **Phase 25: Migrate from Doppler to Native dotenv** — Zero CLI wrappers, full t3-env integration (1/1 plan)

**Total:** 8 phases, 8 plans

</details>

### 🚧 v4.0 Production-Parity Testing & Observability (In Progress)

**Milestone Goal:** Tests run against real services (Supabase, Stripe test mode) in production-equivalent environments, with comprehensive Sentry observability, so passing tests = confidence it works in production.

**Key Principle:** Testing should mirror production as closely as possible. Not just "tests pass" but "tests prove production readiness."

#### Phase 26: Test Environment Parity ✅ COMPLETE

**Goal**: Docker Compose setup mirroring production exactly—real Supabase, real Stripe test mode, same env structure
**Depends on**: v3.0 complete
**Research**: Complete ✅
**Status**: Complete ✅

**Research Findings:**
- PostgreSQL 17 already pinned in `supabase/config.toml` ✅
- Use `docker-compose.yml` with service health checks (`condition: service_healthy`)
- Environment variable parity: `.env.development`, `.env.test`, `.env.production` hierarchy
- Supabase local via `supabase start` (ports 54321-54327) matches production RLS
- Network config: Internal Docker DNS for service discovery (`http://supabase-api:3000`)
- Key gotchas: JWT secret mismatch, localhost vs 127.0.0.1 inconsistency, service startup race conditions

**Implementation Pattern:**
```yaml
services:
  postgres:
    image: postgres:17-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
  backend:
    depends_on:
      postgres:
        condition: service_healthy
```

**Plans**: TBD

Plans:
- [x] 26-01: Docker Compose Infrastructure (postgres, redis, backend)
- [x] 26-02: Environment Variable Parity

---

#### Phase 27: Production-Like Seed Data ✅ COMPLETE

**Goal**: Realistic test data reflecting actual usage patterns—multi-tenant isolation, realistic volumes, temporal distribution
**Depends on**: Phase 26
**Research**: Complete ✅
**Status**: Complete ✅

**Research Findings:**
- Three-tier seed strategy: Smoke (2 owners, CI fast), Development (10 owners, realistic), Performance (100+ owners, 50K+ records)
- Multi-tenant pattern: Owner A/B/C with isolation boundaries + 50-tenant pool
- Stripe sync: Create real Stripe test customers/payment methods, link via database
- Temporal distribution: Spread dates across 24 months using `NOW() - random() * interval`
- Idempotency: Use `ON CONFLICT DO UPDATE` for re-runnable seeds
- Test cards: 4242 (success), 4000000000000002 (decline), 4000002500003155 (3DS)

**Implementation Pattern:**
```sql
-- Versioned, idempotent seed structure
INSERT INTO seed_version (version, notes)
VALUES ('v3-payment-methods', 'Added payment methods')
ON CONFLICT (version) DO NOTHING;
```

Plans:
- [x] 27-01: Three-Tier Seed Data System (smoke/dev/perf)

---

#### Phase 28: Real Service Integration Tests ✅ COMPLETE

**Goal**: Replace mocks with real Supabase RLS verification, real Stripe test mode API calls
**Depends on**: Phase 27
**Research**: Complete ✅
**Status**: Complete ✅

**Research Findings:**
- Stripe test mode: Use `sk_test_*` keys, never mock in integration tests
- Test clocks: `stripe.testHelpers.testClocks.create()` for subscription lifecycle without 30-day wait
- Webhook testing: `stripe listen --forward-to localhost:4600/api/v1/webhooks/stripe` in CI
- Cleanup strategy: `StripeTestFixtures` class with `cleanup()` method tracking all created resources
- Idempotency: Test with same idempotency key returns identical response
- Rate limits: 100 req/sec in test mode, implement `StripeRateLimiter` for bulk operations
- Connect testing: Create test connected accounts with `stripe.accounts.create({ type: 'express' })`

**Implementation Pattern:**
```typescript
// Test clock for subscription lifecycle
const testClock = await stripe.testHelpers.testClocks.create({
  frozen_time: Math.floor(Date.now() / 1000)
})
await stripe.testHelpers.testClocks.advance(testClock.id, {
  frozen_time: futureTimestamp
})
```

Plans:
- [x] 28-01: StripeTestFixtures Infrastructure
- [x] 28-02: Real Stripe Integration Tests

---

#### Phase 29: Sentry Backend Integration ✅ COMPLETE

**Goal**: Error tracking, performance monitoring, release health for NestJS with tenant context
**Depends on**: Phase 28
**Research**: Complete ✅
**Status**: Complete ✅

**Research Findings:**
- Current setup is solid: `instrument.ts` imports early, `SentryModule.forRoot()`, `SentryGlobalFilter` ✅
- Enhancement: Add `SentryContextMiddleware` for automatic tenant_id/user_id tagging
- Data scrubbing: `beforeSend` to remove `authorization`, `x-stripe-signature`, card data
- Webhook integration: Capture to Sentry on DLQ with `alertType: 'webhook_dlq'` tag
- Transaction naming: Auto-names from routes, manual for background jobs (`webhook.${eventType}.process`)
- Distributed tracing: `tracePropagationTargets` already configured for Supabase/Stripe ✅
- Source maps: `sentry-cli releases files upload-sourcemaps dist/apps/backend`
- Alert rules: Critical (webhook_dlq) → Slack + PagerDuty, Warning → Slack only

**Implementation Pattern:**
```typescript
// SentryContextMiddleware
Sentry.setUser({ id: userId, tenant_id: tenantId })
Sentry.setTag('tenant_id', tenantId)
Sentry.setContext('http_request', { method, path, ip })
```

**Plans**: 1 plan

Plans:
- [x] 29-01: Sentry Backend Integration Enhancement (context middleware, data scrubbing, transaction naming)

---

#### Phase 30: Sentry Frontend Integration ✅ COMPLETE

**Goal**: Source maps, user context, session replay, performance traces for Next.js 15+
**Depends on**: Phase 29
**Research**: Complete ✅
**Status**: Complete ✅

**Research Findings:**
- Three config files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Source maps: `withSentryConfig` in `next.config.ts` with `widenClientFileUpload: true`
- Tunnel to avoid ad-blockers: `tunnelRoute: '/monitoring'` creates `/api/monitoring` proxy
- Session replay: `replayIntegration({ replaysSessionSampleRate: 0.1, replaysOnErrorSampleRate: 1.0 })`
- Web Vitals: INP (replaced FID in March 2024), LCP, CLS auto-captured with BrowserTracing
- User context limitation: `setUser()` on server doesn't propagate to client—call both places
- Error boundaries: `app/global-error.tsx` + `<Sentry.ErrorBoundary>` for component-level
- TanStack Query: Subscribe to `queryClient.getQueryCache()` and `getMutationCache()` for error capture
- Vercel integration: `automaticVercelMonitorings: true` for release tracking

**Implementation Pattern:**
```typescript
// TanStack Query error capture
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'error') {
    Sentry.captureException(event.error, {
      contexts: { react_query: { queryKey: event.query.queryKey } }
    })
  }
})
```

**Plans**: 1 plan

Plans:
- [x] 30-01: Sentry Frontend Integration Enhancement (data scrubbing, query error capture, user context)

---

#### Phase 31: Synthetic Monitoring & Production Smoke Tests ✅ COMPLETE

**Goal**: Post-deployment verification, scheduled health checks, alerting integration
**Depends on**: Phase 30
**Research**: Complete ✅
**Status**: Complete ✅

**Research Findings:**
- Current health endpoints are solid: `/health/ping`, `/health/ready`, `/health`, `/health/stripe-sync` ✅
- Post-deploy smoke script: Bash script hitting all critical endpoints within 30s of deploy
- Critical paths to verify: Auth flow, property CRUD, payment intent creation, RLS isolation
- Tool recommendation: Checkly for synthetics ($100-500/mo), integrates with Playwright
- Multi-region testing: US East (primary, 5min), US West/EU (10min) for CDN verification
- SSL monitoring: Daily cron checking cert expiration, alert at 30/7 days
- Alert thresholds: DB response <100ms warning/<500ms critical, API p95 <200ms
- Escalation: Warning → Slack, Critical → Slack + PagerDuty, Payment critical → faster escalation

**Implementation Pattern:**
```bash
# Post-deploy smoke test
curl -sf "$BACKEND_URL/health/ping" || exit 1
curl -sf "$BACKEND_URL/health/ready" || exit 1
curl -sf "$BACKEND_URL/health/stripe-sync" | grep -q "healthy" || exit 1
```

**Plans**: 1 plan

Plans:
- [x] 31-01: Smoke test script, package.json integration, monitoring runbook

---

#### Phase 32: Frontend Test Coverage Restoration

**Goal**: Restore 70+ deleted frontend tests running against real QueryClient/stores with MSW
**Depends on**: Phase 31
**Research**: Complete ✅

**Research Findings:**
- Test production parity: Real `QueryClient` (not mocked), real Zustand stores, MSW for network layer
- QueryClient config: `retry: false`, `gcTime: 0`, `staleTime: 0` for predictable testing
- MSW setup: `setupServer(...handlers)` in `beforeAll`, `server.resetHandlers()` in `afterEach`
- Handler pattern: `http.get('/api/v1/properties', () => HttpResponse.json([...]))`
- Zustand testing: Direct `useStore.getState()` access, reset function in `beforeEach`
- TanStack Form + Zod: Test validation errors via `form.getFieldInfo('name').errors`
- React 19 `use()`: Test with resolved/rejected promises, wrap in ErrorBoundary
- Server Components: Async RSC not supported in Vitest—use Playwright instead
- Skip: Snapshot tests (brittle), implementation details, 100% coverage chasing

**Implementation Pattern:**
```typescript
// Real QueryClient per test (no caching between tests)
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

**Priority order for restoration:**
1. API hooks (useProperties, useTenants, etc.) - highest value
2. Zustand stores with business logic
3. Form components with validation
4. Dashboard components - use E2E instead

**Plans**: TBD

Plans:
- [ ] 32-01: TBD

---

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Health Remediation | 1-5 | 17 | Complete | 2026-01-15 |
| v1.1 Tech Debt Resolution | 6-10 | 4 | Complete | 2026-01-15 |
| v2.0 Stripe Integration Excellence | 11-17 | 18 | Complete | 2026-01-17 |
| v3.0 Backend Architecture Excellence | 18-25 | 8 | Complete | 2026-01-20 |
| v4.0 Production-Parity Testing & Observability | 26-32 | 5/? | In Progress | - |

**Total:** 27 phases, 52 plans shipped across 4 milestones

**Current:** v4.0 in progress. Phase 30 complete. Phase 31 ready to plan.
