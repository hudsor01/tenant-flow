# Architecture Research: Phase Ordering for v8.0 Post-Migration Hardening

**Research date:** 2026-02-23
**Milestone:** v8.0 Post-Migration Hardening
**Starting phase:** 58 (v7.0 ended at Phase 57)

---

## Proposed 10-Phase Structure (Phases 58–67)

Designed to: (1) eliminate security risk earliest, (2) respect dependencies, (3) group related work, (4) minimize merge conflicts between phases.

---

### Phase 58: Pre-Merge Blockers + Critical Security

**Goal:** Make PR #520 safe to merge by resolving all 3 operational blockers and the highest-severity security vulnerabilities in one atomic batch.

**Work:**
- Blocker A: E2E preflight + auth-helpers → ANON_KEY, remove backend health check
- Blocker B: Remove Railway secrets from GitHub (RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID)
- Blocker C: Set NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel production
- SEC-01: DocuSeal webhook fail-closed (return 503 if DOCUSEAL_WEBHOOK_SECRET not set)
- SEC-02: DocuSeal Edge Function IDOR — ownership check before all lease actions
- SEC-06: Stripe webhook notification_type values fixed ('system', 'payment')
- SEC-04: generate-pdf IDOR — ownership check before buildLeasePreviewHtml()
- CQ-01: undefined userId guard before all 6 insert mutations

**Duration:** 2–3 days
**Risk:** Low (small targeted fixes, no architectural changes)
**Success gate:** PR #520 can safely merge; all E2E preflight checks pass

**Dependencies:** None — this is the entry point

---

### Phase 59: RLS Integration Project + Write-Path Isolation Tests

**Goal:** Establish the security foundation — a dedicated integration test project and comprehensive INSERT/UPDATE/DELETE isolation tests for all 7 data domains.

**Work:**
- CICD-01: Create dedicated integration-test Supabase project (separate from production)
- CICD-02: Add pull_request trigger to rls-security-tests.yml
- CICD-03: Update CI secrets (INTEGRATION_SUPABASE_URL, INTEGRATION_SERVICE_ROLE_KEY)
- TEST-01: RLS INSERT isolation tests — 7 domains (properties, units, tenants, leases, maintenance, vendors, inspections)
- TEST-02: RLS UPDATE isolation tests — 7 domains
- TEST-03: RLS DELETE isolation tests — 7 domains
- CICD-05: Remove @repo/backend from test pipeline (silence false-positive)

**Duration:** 4–5 days
**Risk:** Medium (new Supabase project, CI changes)
**Success gate:** All RLS write-path tests passing; PR gate enabled on rls-security-tests.yml

**Dependencies:** Phase 58 merged (production is stable before adding test gates)

---

### Phase 60: Error Handling Standardization

**Goal:** Eliminate double-toast bug across 20+ hooks and standardize Edge Function error responses.

**Work:**
- CQ-05/BP-X1: Remove `onError: handleMutationError` from all mutations that already call `handlePostgrestError` in mutationFn (20+ hooks)
- CQ-04: Add `operation` parameter to `handlePostgrestError` ('fetch' | 'create' | 'update' | 'delete')
- ARCH-11: Standardize all Edge Function error responses to `{ error: string }` JSON with Content-Type header
- Create `supabase/functions/_shared/responses.ts` helper
- CQ-13: Add `enabled: false` to `usePaymentVerification` and `useSessionStatus` stub queries
- BP-02: Remove optimistic update logic from stub mutations that unconditionally throw

**Duration:** 3–4 days
**Risk:** Low (targeted fixes, no logic changes)
**Success gate:** Zero double-toasts; all Edge Functions return consistent error JSON

**Dependencies:** Phase 58 (codebase stable)

---

### Phase 61: PostgREST Search Injection Sanitization

**Goal:** Fix all search injection vectors in PostgREST `.or()` filter expressions.

**Work:**
- SEC-03: Create `sanitizePostgrestSearch()` utility in `apps/frontend/src/lib/`
- Fix `property-keys.ts` — name/city search sanitization
- Fix `tenant-keys.ts` — full_name/email search sanitization
- Fix `unit-keys.ts` — unit number search sanitization
- Fix `use-vendor.ts` — vendor name search sanitization
- TEST-06: Add injection test cases (commas, dots, operator strings)
- SEC-09: Edge Function env vars fail-closed — replace all `?? ''` with explicit 503 returns

**Duration:** 3–4 days
**Risk:** Low (input sanitization, additive changes)
**Success gate:** Malicious search strings (`test,owner_user_id.eq.other`) are neutralized; tests pass

**Dependencies:** Phase 59 (RLS tests provide safety net for query changes)

---

### Phase 62: CLAUDE.md Modernization

**Goal:** Remove all NestJS content from the primary AI-facing reference document and replace with PostgREST/Edge Function patterns.

**Work:**
- DOC-01: Remove NestJS sections (Backend Structure, Ultra-Native NestJS Philosophy, Zod DTO Pattern, Route Ordering, Controller/Service Pattern, backend commands, Best Practices Reference table pointing to deleted files)
- DOC-02: Add "Security Model" section — RLS is the sole server-side authorization boundary; no middleware layer
- DOC-03: Add PostgREST query pattern, callEdgeFunction pattern, Edge Function authoring guide, queryOptions() factory examples
- DOC-09: Fix Testing section — remove deleted commands, update integration test path
- DOC-10: Fix Key Directories table — remove deleted paths, add new ones (supabase/functions/, apps/integration-tests/src/rls/)
- DOC-06: Fix Best Practices Reference table (deleted ADR links)
- DOC-07: Delete stale `roadmap.md` from repo root
- DOC-05: Create `.env.example` with all 8 Edge Function secrets documented

**Duration:** 4–5 days
**Risk:** None (documentation only, no code changes)
**Success gate:** CLAUDE.md contains zero NestJS references; new patterns are documented with working examples

**Dependencies:** Phase 60 (error handling patterns are finalized before documenting them)

---

### Phase 63: Auth Caching Refactor

**Goal:** Eliminate 86 per-query `getUser()` network calls by centralizing user auth in TanStack Query cache.

**Work:**
- PERF-01: Create `useCachedUser()` hook (queryKey: `['auth', 'user']`, staleTime: 10min)
- Migrate all 23 hook files from per-query `getUser()` to `useCachedUser()` dependency pattern
- Update query functions to accept `userId` parameter instead of calling `getUser()` internally
- Update `auth-provider.tsx` to use `getUser()` for initial state (not `getSession()`)
- CQ-08: E2E stale PUBLISHABLE_KEY references in preflight/auth-helpers (if not already done in Phase 58)

**Duration:** 5 days
**Risk:** High (touches 23 hook files; risk of regression if queries fire before user resolves)
**Success gate:** Dashboard mount shows ≤1 auth network call; all frontend tests pass

**Dependencies:** Phase 62 (CLAUDE.md documents the new pattern before implementing it)

---

### Phase 64: Batch Operations + Duplicate Hook Consolidation

**Goal:** Fix N+1 sequential patterns and eliminate duplicate payment method hook implementations.

**Work:**
- PERF-02: `useBatchTenantOperations` → single `.in('tenant_id', ids)` for deletes; RPC for heterogeneous updates
- CQ-03/BP-X3: Consolidate duplicate payment method hooks — remove from `use-payments.ts`, keep in `use-payment-methods.ts`
- CQ-02/ARCH-6: Create `set_default_payment_method` RPC for atomic single-UPDATE (removes 2-step race condition)
- ARCH-7: Convert `useBatchTenantOperations` update path to RPC accepting array params
- CQ-07: Move `selectPaginatedData` helper from 3 hook files to `apps/frontend/src/lib/query-utils.ts`
- CQ-14: Add `@deprecated` annotations to legacy key aliases

**Duration:** 4–5 days
**Risk:** Medium (query key changes can break cache invalidation; careful testing required)
**Success gate:** Zero payment method cache incoherence; batch deletes work in single request

**Dependencies:** Phase 63 (auth caching complete before touching hooks further)

---

### Phase 65: Performance + Data Safety

**Goal:** Fix unbounded queries, client-side data loading issues, and add missing database indexes.

**Work:**
- PERF-03: `exportPaymentsCSV()` → add `.limit(10000)` + truncation warning toast; route large exports through `export-report` Edge Function
- SEC-14: CSV formula injection — prefix `=`, `+`, `-`, `@` cells with single quote in `rowsToCsv()`
- PERF-06: Tenant portal 3-step serial lookup → single joined query (`users → tenants → data`)
- PERF-07: `useAllTenants` → add `.limit(100)` for dropdown population
- PERF-08: Lease stats → move SUM/AVG aggregation to RPC (eliminate client-side reduce)
- PERF-09: Maintenance stats → consolidate 7 HEAD count queries to single `get_maintenance_stats_by_status` RPC
- PERF-10: Add `.limit(100)` to urgent/overdue maintenance and expiring leases queries
- PERF-12: Add `CREATE INDEX idx_maintenance_requests_tenant_id` migration
- PERF-04: Replace `units(*)` wildcard with explicit column list in `property-keys.ts`
- SEC-08/SEC-10: HTML-escape dynamic values before template interpolation in PDF generation Edge Functions
- SEC-11: Restrict generate-pdf `{ html: string }` mode to service-role callers only

**Duration:** 4–5 days
**Risk:** Low (additive limits and helper refactors; SQL index is non-destructive)
**Success gate:** CSV export is bounded; tenant portal queries are 1 round-trip; index added

**Dependencies:** Phase 64 (hooks consolidated before adding query tweaks)

---

### Phase 66: Edge Function Hardening

**Goal:** Harden all Edge Functions for production: CORS restriction, dependency pinning, Stripe SDK, TODO stub resolution.

**Work:**
- SEC-05/ARCH-02: CORS `*` → `Deno.env.get('FRONTEND_URL')` on all browser-facing Edge Functions; strip CORS from webhook endpoints
- BP-03: Create `supabase/functions/deno.json` with exact version pins (`@supabase/supabase-js@2.45.0`, `stripe@14.27.0`)
- BP-08: Upgrade Stripe SDK from `@14` → `@17.18.0` (update API version if needed)
- DOC-04: Audit all 31 TODO(phase-57) stubs; fix 4 runtime-throw stubs in tenant/payments/new, use-tenant.ts, use-identity-verification.ts
- ARCH-05/SEC-07: Standardize on `getUser()` for write-path Edge Function calls (not `getSession()`)
- BP-01: Remove `CookieOptions` import from `@supabase/ssr` in `app/actions/auth.ts`
- SEC-15: Track Stripe retry count — mark as permanently failed after 3 attempts instead of deleting idempotency record
- BP-07: Delete/migrate orphaned backend spec file

**Duration:** 4–5 days
**Risk:** Medium (CORS changes affect all Edge Functions; test each after change)
**Success gate:** All Edge Functions use scoped CORS; deno.json exists; 0 runtime-throw stubs remain

**Dependencies:** Phase 65 (Edge Function changes from previous phases are merged)

---

### Phase 67: CI/CD Integration + E2E Test Modernization

**Goal:** Close all CI/CD gaps: E2E tests in pipeline, stale test cleanup, pnpm consistency.

**Work:**
- TEST-07: Rewrite `cache-behavior.spec.ts` and `error-handling.spec.ts` — replace NestJS `page.route()` intercepts with Supabase URL intercepts or delete and replace with PostgREST-aware tests
- CICD-06: Add `test:e2e:smoke` job to `ci-cd.yml` (smoke/ and public/ project suites against local Supabase)
- CICD-07: Fix `monitoring.prod.spec.ts` — remove backend health check, add Supabase REST + Edge Function health check
- TEST-03: Add Core Web Vitals threshold assertions to `performance.spec.ts` (`expect(metrics.lcp).toBeLessThan(2500)`)
- TEST-04: Fix `auth-redirect.test.ts` tautology — invoke actual middleware, create real request, assert redirect
- CICD-10: Update pnpm default to `10.29.3` in `lint.yml`, `tests.yml`, `typecheck.yml`
- DOC-08: Add n8n workflow README (import, activate, configure email nodes, required env vars)
- DOC-11: Complete Phase 57 closure — update STATE.md, verify v7.0 PROJECT.md requirements all checked
- DOC-12: Update PROJECT.md to reflect all v7.0 requirements as validated

**Duration:** 4–5 days
**Risk:** Medium (E2E test changes; CI pipeline changes)
**Success gate:** E2E smoke runs on every PR; performance tests gate on LCP < 2500ms; zero stale NestJS test intercepts

**Dependencies:** Phase 66 (Edge Functions stable before adding E2E coverage)

---

## Critical Path

```
Phase 58 (security fixes)
  → Phase 59 (RLS foundation)
    → Phase 60 (error handling)
      → Phase 61 (injection fix)
        → Phase 62 (docs)
          → Phase 63 (auth caching — HIGH RISK)
            → Phase 64 (batch + dedup)
              → Phase 65 (perf + data safety)
                → Phase 66 (edge function hardening)
                  → Phase 67 (CI/CD integration)
```

## Phase Summary Table

| Phase | Focus | Duration | Risk | Key Output |
|-------|-------|----------|------|-----------|
| 58 | Pre-merge blockers + critical security | 2–3d | Low | PR #520 merges safely |
| 59 | RLS integration project + write tests | 4–5d | Med | Security validation on every PR |
| 60 | Error handling standardization | 3–4d | Low | Zero double-toasts |
| 61 | PostgREST search injection | 3–4d | Low | Safe search inputs |
| 62 | CLAUDE.md modernization | 4–5d | None | Zero NestJS references |
| 63 | Auth caching refactor | 5d | High | 80% auth call reduction |
| 64 | Batch ops + hook dedup | 4–5d | Med | Single-request batch deletes |
| 65 | Performance + data safety | 4–5d | Low | Bounded queries, indexes |
| 66 | Edge function hardening | 4–5d | Med | CORS scoped, deps pinned |
| 67 | CI/CD + E2E integration | 4–5d | Med | E2E on every PR |

**Total estimated duration:** ~5–6 weeks (40–50 work days including review and testing)
