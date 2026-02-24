# Comprehensive Code Review Report

## Review Target

**PR #520: feat(57): remove NestJS backend entirely — complete v7.0 milestone**
Branch: `gsd/phase-57-cleanup-deletion-remove-nestjs-entirely` → `main`

This is a major architectural milestone: complete removal of the NestJS/Railway backend (~26k lines, 677 files deleted) and final migration of all data access to Supabase PostgREST + Edge Functions. Also includes migration from `PUBLISHABLE_KEY` → `ANON_KEY`, cleanup of NestJS adapter files, and CI/CD updates.

**Stats:** +52,910 additions / -175,523 deletions across 1,172 files total

---

## Executive Summary

This PR successfully completes the v7.0 architectural milestone by eliminating the NestJS/Railway layer and establishing a direct browser-to-Supabase architecture. The migration is structurally sound: Supabase SSR cookie handling is fully correct, the TanStack Query v5 `queryOptions()` factory pattern is applied consistently, and the RLS integration test suite covers the 7 primary data domains. The Turbo pipeline has been correctly simplified.

However, the migration introduces a critical security architecture shift that is not yet production-safe. With NestJS removed, **Supabase RLS is now the sole server-side authorization layer** for all direct PostgREST writes — but the RLS test suite only covers SELECT isolation and runs post-merge against production. Three critical security vulnerabilities in Edge Functions (DocuSeal fail-open, DocuSeal IDOR, and PostgREST filter injection) remain unresolved. Three operational blockers must be addressed before merge to prevent the Vercel deployment from breaking. The CLAUDE.md project reference document still describes the deleted architecture.

**Merge recommendation: Block — resolve Critical (P0) and pre-merge blockers before proceeding.**

---

## Findings by Priority

### Critical Issues (P0 — Must Fix Before Merge)

**[SEC-01] DocuSeal Webhook Fail-Open — Unauthenticated Lease Manipulation**
CVSS 9.1 | CWE-306 | OWASP A07
File: `supabase/functions/docuseal-webhook/index.ts`
If `DOCUSEAL_WEBHOOK_SECRET` is not set (common in staging/after env rotation), the webhook processes all requests unauthenticated using the service role key (bypasses RLS). Anyone can POST to flip any lease to `active`, forge `owner_signed_at` / `tenant_signed_at`.
Fix: Return 503 immediately if secret not configured (fail-closed, not fail-open).

**[SEC-02] DocuSeal Edge Function Missing Ownership Authorization (IDOR)**
CVSS 8.1 | CWE-639, CWE-862 | OWASP A01
File: `supabase/functions/docuseal/index.ts` (all action handlers)
Authenticates caller JWT but never verifies the caller owns or is party to the lease. All DB operations use service role key. Any authenticated user can send, sign, cancel, or resend any lease by supplying an arbitrary `leaseId`.
PoC: Owner B calls `{ action: 'sign-owner', leaseId: 'owner-a-lease-uuid' }` → succeeds.
Fix: After JWT validation, check `lease.owner_user_id === user.id` before any action.

**[SEC-03] PostgREST Filter Injection via Unsanitized Search Input**
CVSS 7.5 | CWE-943 | OWASP A03
Files: `property-keys.ts`, `tenant-keys.ts`, `unit-keys.ts`, `use-vendor.ts`
User-controlled strings interpolated directly into PostgREST `.or()` filter expressions. PostgREST parses the full string — injected clauses are honored. RLS provides secondary defense but injection can bypass application-level filters.
PoC: Search `%,owner_user_id.neq.00000000-0000-0000-0000-000000000000` modifies query semantics.
Fix: Strip PostgREST special characters from search input before interpolation.

**[ARCH-3 / CQ-1] Undefined `owner_user_id` Passed to Database Inserts**
Files: `use-properties.ts:279–284`, `use-inspections.ts:63–68` (+ 4 others)
`user.user?.id` returns `string | undefined`. On expired sessions, `undefined` is passed to `owner_user_id` in insert payloads, creating orphaned rows or opaque DB errors.
Fix: Explicit guard — `if (authError || !user) throw new Error('Not authenticated')` — before every insert.

**[TEST-04] RLS Write-Path Isolation — Zero Tests Across 7 Tables**
All 7 RLS test files test only SELECT isolation. Since NestJS middleware no longer enforces ownership, write isolation is enforced solely by RLS policies — these are now the primary security validation for mutations. There are no tests verifying Owner A cannot INSERT claiming Owner B, UPDATE Owner B's records, or DELETE Owner B's rows.
Fix: Add INSERT/UPDATE/DELETE isolation tests per domain to `apps/integration-tests/src/rls/`.

**[DOC-01] CLAUDE.md Contains Extensive NestJS Content That No Longer Applies**
File: `CLAUDE.md`
The primary AI-facing reference document still documents the deleted backend: NestJS module tree, controller/service patterns, backend commands, and search paths. This actively causes wrong code generation in all AI-assisted development sessions going forward.
Fix: Remove all NestJS-specific sections; add PostgREST/Edge Function patterns.

**[DOC-02] RLS-Only Security Model Is Undocumented**
The architectural shift from "NestJS middleware + RLS" to "RLS-only" is not documented anywhere. A developer could write code assuming a server-side authorization layer exists between browser and database.
Fix: Add a clear "Security Model" section to CLAUDE.md stating RLS is the sole authorization boundary.

**[CICD-01 / CICD-02] RLS Tests Run Post-Merge Against Production**
`rls-security-tests.yml` triggers only on push to `main` using production credentials. A migration breaking tenant isolation would pass all PR checks, merge, then fail against production. No guard prevents future mutation tests from running against production.
Fix: Add `pull_request` trigger; create a dedicated integration-test Supabase project.

---

### Pre-Merge Operational Blockers (P0 — Must Complete Before Merge)

**[Blocker A] E2E Preflight and Auth Helpers Reference Deleted Env Var**
Files: `apps/e2e-tests/scripts/preflight.ts`, `apps/e2e-tests/auth-helpers.ts`
Still reference `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (mandatory check, `warnOnly: false`). Will block all local E2E runs when old var is removed. Preflight also checks backend health at `localhost:4650` which no longer exists.
Action: Update both files to `NEXT_PUBLIC_SUPABASE_ANON_KEY`; remove backend health check.

**[Blocker B] Remove Railway Secrets from GitHub Before Merge**
`RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID` remain in GitHub secrets. The workflow consuming them is already deleted — no reason to retain them through the merge window.
Action: Remove all three secrets from GitHub repository secrets before merging.

**[Blocker C] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Before Merge Triggers Deploy**
The PR test plan lists this as a post-merge step, but `@t3-oss/env-nextjs` in `env.ts` will fail at build time if this variable is absent. The post-merge Vercel deployment will break.
Action: Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel production before merging.

---

### High Priority (P1 — Fix Before Next Release)

**[SEC-04] generate-pdf Edge Function IDOR via `leaseId`**
CVSS 6.5 | `supabase/functions/generate-pdf/index.ts`
Any authenticated user can generate a PDF of any lease (exposing rent, deposit, names, addresses) by supplying an arbitrary `leaseId`. No ownership check.
Fix: Verify `lease.owner_user_id === user.id` before `buildLeasePreviewHtml()`.

**[SEC-06] Stripe Webhook `notification_type` CHECK Constraint Mismatch**
CVSS 5.9 | `supabase/functions/stripe-webhooks/index.ts:170,244`
Inserts `notification_type: 'stripe_connect_verified'` and `'payment_failed'` — both fail DB CHECK constraint (`maintenance|lease|payment|system`). Line 170 fails silently (owner never notified); line 244 failure causes idempotency record deletion → Stripe 72-hour retry storm.
Fix: Map to allowed values: `'system'` for Connect verification, `'payment'` for payment failures.

**[CQ-2 / ARCH-6] Non-Atomic "Set Default Payment Method"**
Files: `use-payments.ts`, `use-payment-methods.ts`
Two sequential PostgREST calls with no transaction. If step 2 fails, tenant has zero default payment methods.
Fix: RPC function with single atomic `UPDATE ... SET is_default = (id = $1)`.

**[PERF-01] 86 Unshared `getUser()` Network Calls — Auth Round-Trip Fan-Out**
23 hook files call `supabase.auth.getUser()` independently per query function. Dashboard with 5 parallel queries = 5 auth round-trips on mount. Estimated 50–100ms added latency per parallel batch.
Fix: Use `auth.uid()` directly in RPC function bodies; read userId from TanStack Query auth cache for client-side needs.

**[PERF-02] Batch Tenant Operations — N Sequential HTTP Requests**
File: `use-tenant.ts` `useBatchTenantOperations()`
`batchUpdate` and `batchDelete` use `await` inside `for...of` — fully sequential. 10 tenants = 600–1200ms.
Fix: `batchDelete` → single `.in('tenant_id', ids)`; `batchUpdate` → RPC accepting array of pairs.

**[TEST-07] E2E Cache/Error Tests Permanently Broken — Stale NestJS Route Intercepts**
Files: `cache-behavior.spec.ts`, `error-handling.spec.ts`
Tests use `page.route('**/api/properties**')` — NestJS paths that no longer exist. Intercepts never fire; tests silently pass against the real Supabase endpoint. Provide false assurance about error handling.
Fix: Rewrite using Supabase URL intercepts or delete and replace with PostgREST-aware tests.

**[DOC-03] No PostgREST or Edge Function Patterns in CLAUDE.md**
The deleted NestJS "Backend Patterns" section has no replacement. No canonical examples for PostgREST query pattern, `callEdgeFunction` pattern, how to write a new Edge Function, or `queryOptions()` factory with a PostgREST-backed example.

**[DOC-04] 31 `TODO(phase-57)` Stubs With No Central Tracking**
2 stubs in `tenant/payments/new/page.tsx` cause runtime `throw` errors for tenant-facing features — P1 runtime regressions. `use-tenant.ts` and `use-identity-verification.ts` also contain stubs that throw in production.

**[DOC-05] Edge Function Environment Variables Undocumented**
8 Edge Functions require up to 8 distinct secrets with no consolidated reference. `FRONTEND_URL` (needed for the CORS wildcard fix) appears in no documentation file.

**[CICD-03] Zero Unit Tests for New Data Access Layer**
97 NestJS test files deleted with no compensating CI coverage for Edge Functions or PostgREST hooks. `pnpm test:unit` via Turbo silently passes with zero `@repo/backend` tests.

---

### Medium Priority (P2 — Plan for Next Sprint)

**[SEC-05 / ARCH-02] `Access-Control-Allow-Origin: *` on All 8 Edge Functions**
Wildcard CORS + `Access-Control-Allow-Headers: authorization` enables authenticated cross-origin requests. Webhook endpoints should have no CORS headers at all.
Fix: Restrict browser-facing functions to `FRONTEND_URL`; strip CORS from webhook functions.

**[SEC-09] Edge Function Env Vars Default to Empty String**
All Edge Functions use `?? ''` fallback for secrets. `STRIPE_SECRET_KEY ?? ''` initializes Stripe SDK with empty key.
Fix: Return 503 immediately if required vars are missing.

**[SEC-10] HTML Injection in PDF Report Generation**
Files: `export-report/index.ts`, `generate-pdf/index.ts`, `docuseal/index.ts`
Database values interpolated unescaped into HTML templates. Potential SSRF from the StirlingPDF rendering server.
Fix: HTML-escape all dynamic values before template interpolation.

**[PERF-03] CSV Export — Unbounded Client-Side Data Load**
File: `use-payments.ts:325`
No `.limit()` on PostgREST query. All matching rows fetched to browser. 50k+ rows can crash the tab.
Fix: Add `.limit(10000)` with truncation warning; route through `export-report` Edge Function.

**[PERF-06] Tenant Portal — 3-Step Serial Lookup Waterfall**
Files: `maintenance-keys.ts`, `use-payments.ts`, `use-tenant.ts`
Three sequential round-trips: `getUser()` → `tenants` row → actual data. 120–200ms overhead per tenant portal query.
Fix: Join through `users → tenants` in a single query or store `tenant_id` in JWT `app_metadata`.

**[CQ-4] `handlePostgrestError` Always Says "Failed to update" Regardless of Operation**
File: `apps/frontend/src/lib/postgrest-error-handler.ts`
A failed SELECT shows "Failed to update X". Accept an `operation` parameter.

**[CQ-5 / BP-X1] Double-Toast From Dual Error Handlers**
20+ hook files: `handlePostgrestError` in `mutationFn` + `onError: handleMutationError` = two toasts per error. Users see duplicate notifications.
Fix: Remove `onError: handleMutationError` from mutations that already call `handlePostgrestError`.

**[BP-01] `CookieOptions` Imported from `@supabase/ssr`**
File: `app/actions/auth.ts:3`
Fragile dependency on an internal type removed in `@supabase/ssr` v0.5+.

**[BP-03] Edge Function Dependencies Unpinned**
All 8 Edge Functions resolve `@supabase/supabase-js@2` and `stripe@14` on every cold start. Breaking patch = silent production regression.
Fix: Add `supabase/functions/deno.json` import map with exact version pins.

**[BP-05] `auth-provider.tsx` Uses `getSession()` for Initial Auth State**
Unvalidated session used to seed client-side auth store. Middleware validates server-side before render, so low practical risk — but revoked tokens are invisible until next auth event.

**[DOC-07] Root-Level `roadmap.md` Is a Stale Template**
Generic "solo developer roadmap" template with `[Insert your current focus here]` placeholders. Untracked by git. Should be deleted.

**[CICD-04] E2E Tests Not Wired into CI Pipeline**
Full Playwright suite exists but not in any workflow. PostgREST migration has no end-to-end validation in CI.

**[CICD-06] Production Monitoring Tests Reference Deleted Backend**
`monitoring.prod.spec.ts` calls `API_BASE_URL/api/v1/health` — will fail permanently when Railway is deleted.

---

### Low Priority (P3 — Track in Backlog)

**[SEC-11] Arbitrary HTML in `generate-pdf` Enables SSRF**
`{ html: string }` forwarded to StirlingPDF from any authenticated user. Attacker can probe internal services.

**[SEC-12] Incomplete RLS Integration Tests (SELECT Only)**
Addressed by TEST-04 (P0). No INSERT/UPDATE/DELETE isolation tests.

**[SEC-14] CSV Formula Injection**
`export-report/index.ts` does not prefix cells starting with `=`, `+`, `-`, `@`.

**[SEC-15] Stripe Webhook Retry Storm from Idempotency Record Deletion**
Deterministic failures (e.g., SEC-06) create 72-hour retry loops.

**[PERF-04] PostgREST `units(*)` Wildcard Fetches All Columns**
`property-keys.ts` `withUnits()` uses `'*, units(*)'`. Replace with explicit column list.

**[PERF-09] Maintenance Stats — 7 Parallel HEAD Queries**
7 `{ count: 'exact', head: true }` queries per refresh — one per status. Consolidate into single RPC.

**[PERF-12] Missing Index — `maintenance_requests(tenant_id)`**
Migration adds `(unit_id, status)` index but not `(tenant_id)`. Tenant portal queries do sequential scans.

**[CQ-9] Financial Hooks Return Misleading Stub Data**
`use-financials.ts` returns `netIncome = totalRevenue` with all expense fields = 0. Should return `null` or `isStub: true`.

**[CQ-13] `usePaymentVerification` and `useSessionStatus` Prefetch Errors Into Cache**
Stubs that throw are prefetched. Add `enabled: false`.

**[TEST-11] Performance Tests Are Observational, Not Gates**
Core Web Vitals collected but no `expect(metrics.lcp).toBeLessThan(2500)` assertion.

**[TEST-12] `auth-redirect.test.ts` Is a Tautology**
Tests assert arrays contain values that were just hard-coded into them. Cannot catch regressions.

**[BP-06 / DOC-01] CLAUDE.md Stale Content** *(P0 for content removal, P3 for full rewrite)*
Covered in Critical section for removal; full rewrite with Edge Function patterns is P3.

**[BP-07] Orphaned Backend Spec File**
`apps/backend/src/database/*.spec.ts` — only non-`.DS_Store` file in backend. Delete or migrate.

**[BP-08] Stripe SDK and API Version Stale**
`npm:stripe@14` → current stable `stripe@17`. API version `2024-06-20` is 18+ months old.

**[CICD-10] pnpm Version Inconsistency in Reusable Workflows**
`lint.yml`, `tests.yml`, `typecheck.yml` default to `pnpm@10.20.0`; root `package.json` requires `10.29.3`.

**[CICD-11] No Formal Rollback Plan**
Railway project should remain stopped (not deleted) for ≥48 hours post-merge. Archive `deploy-backend.yml`.

**[DOC-12] PROJECT.md Shows v7.0 Requirements as Unchecked**
All v7.0 requirements completed; checkboxes not updated.

**[DOC-13] n8n Workflow Files Have No README**
3 JSON workflows with no import/activation/configuration documentation.

---

## Findings by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Code Quality | 3 | 5 | 6 | 4 | **18** |
| Architecture | 3 | 5 | 6 | 2 | **16** |
| Security | 3 | 3 | 5 | 4 | **15** |
| Performance | 2 | 1 | 5 | 5 | **13** |
| Testing | 3 | 4 | 3 | 3 | **13** |
| Documentation | 2 | 4 | 5 | 3 | **14** |
| Framework/Language | 0 | 0 | 5 | 4 | **9** |
| CI/CD & DevOps | 2 | 1 | 5 | 2 | **10** |
| **Total** | **18** | **23** | **40** | **27** | **108** |

*Note: Some findings appear across multiple categories (e.g., undefined userId is in Code Quality, Architecture, and Security). The per-category counts include all instances; the total unique findings are lower. Key cross-cutting issues: undefined userId (CQ-1/ARCH-1/SEC-08), CORS wildcard (ARCH-2/SEC-05/CICD-09), DocuSeal fail-open (ARCH-3/SEC-01/TEST-01), duplicate payment hooks (CQ-3/ARCH-6/BP-X3), PUBLISHABLE_KEY (CQ-8/BP-X5/CICD-05).*

---

## Recommended Action Plan

### Pre-Merge (Must Complete Now)

1. **Blocker A**: Update `apps/e2e-tests/scripts/preflight.ts` and `auth-helpers.ts` — change `PUBLISHABLE_KEY` → `ANON_KEY`, remove backend health check. *(Small effort)*

2. **Blocker B**: Remove `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID` from GitHub secrets. *(Trivial — 2 minutes)*

3. **Blocker C**: Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel production environment. *(Trivial — Vercel dashboard)*

4. **SEC-01**: Fail-close DocuSeal webhook — return 503 if `DOCUSEAL_WEBHOOK_SECRET` not set. *(Small — 5 lines)*

5. **SEC-02**: Add ownership check to DocuSeal Edge Function — verify `lease.owner_user_id === user.id`. *(Small — 10 lines)*

6. **SEC-06**: Fix `notification_type` values in `stripe-webhooks/index.ts:170,244` — map to `'system'` and `'payment'`. *(Trivial — 2 lines)*

7. **DOC-01/02**: Strip NestJS content from CLAUDE.md; add "RLS is the sole authorization layer" security model note. *(Medium — 1–2 hours)*

### Sprint 1 (Before Next Release — Within 1 Week)

8. **SEC-03**: Sanitize search inputs before PostgREST `.or()` interpolation in 4 files. *(Small)*

9. **CQ-1 / BP-X2**: Add explicit `!user` guard before all `owner_user_id` inserts in 6 hook files. *(Small)*

10. **TEST-04**: Add INSERT/UPDATE/DELETE RLS isolation tests for all 7 domains. *(Medium — 1 day)*

11. **CICD-01/02**: Create integration-test Supabase project; add `pull_request` trigger to `rls-security-tests.yml`. *(Medium)*

12. **SEC-04**: Add ownership check to `generate-pdf` Edge Function. *(Small)*

13. **TEST-07**: Rewrite `cache-behavior.spec.ts` and `error-handling.spec.ts` for PostgREST architecture. *(Medium)*

14. **DOC-03**: Add PostgREST query pattern, `callEdgeFunction` pattern, and Edge Function authoring guide to CLAUDE.md. *(Medium)*

15. **DOC-04**: Track all 31 `TODO(phase-57)` stubs centrally; fix the 2 runtime `throw` stubs immediately. *(Small for tracking; medium for stub fixes)*

16. **CQ-5 / BP-X1**: Remove `onError: handleMutationError` from all mutations that already call `handlePostgrestError`. *(Small)*

17. **PERF-03**: Add `.limit(10000)` to `exportPaymentsCSV()` with truncation warning. *(Trivial)*

### Sprint 2 (Plan for Next Sprint)

18. **PERF-01**: Replace per-query `getUser()` calls with cached auth; use `auth.uid()` in RPC bodies. *(Large — architectural)*

19. **PERF-02**: Refactor `useBatchTenantOperations` to use `.in()` for deletes and RPC for updates. *(Medium)*

20. **CQ-3 / BP-X3**: Consolidate duplicate payment method hooks — remove from `use-payments.ts`. *(Medium)*

21. **CQ-2 / ARCH-6**: Create `set_default_payment_method` RPC for atomic updates. *(Medium)*

22. **BP-03**: Add `supabase/functions/deno.json` with pinned dependency versions. *(Small)*

23. **BP-08**: Upgrade Stripe SDK from `@14` to `@17` and update API version. *(Medium)*

24. **CICD-04**: Add `test:e2e:smoke` job to `ci-cd.yml`. *(Medium)*

25. **DOC-05**: Create `.env.example` with all 8 Edge Function secrets documented. *(Small)*

26. **PERF-06**: Eliminate tenant portal 3-step serial lookup with single joined query. *(Medium)*

### Backlog (P3)

27. **CICD-10**: Update pnpm default in reusable workflow files to `10.29.3`. *(Trivial)*
28. **CICD-11**: Keep Railway project stopped for 48h; document rollback procedure. *(Trivial)*
29. **SEC-14**: CSV formula injection prefix in `rowsToCsv()`. *(Small)*
30. **PERF-09**: Consolidate 7 maintenance count queries into single RPC. *(Medium)*
31. **PERF-12**: Add `CREATE INDEX idx_maintenance_requests_tenant_id`. *(Trivial)*
32. **DOC-07**: Delete stale `roadmap.md` from repository root. *(Trivial)*
33. **BP-06**: Full CLAUDE.md rewrite with Edge Function authoring patterns. *(Large)*

---

## Positive Findings

The following aspects of this PR are well-implemented and should be noted:

- **Supabase SSR**: `client.ts`, `server.ts`, `proxy.ts`, and `auth/callback/route.ts` all use `getAll()`/`setAll()` correctly — zero deprecated cookie patterns.
- **TanStack Query v5**: `queryOptions()` factory pattern consistently applied across all 4 query-key files. `useSuspenseQuery` used correctly with `Suspense` boundaries.
- **Turbo pipeline**: Correctly simplified — no dangling backend tasks, clean workspace configuration.
- **RLS test foundation**: The 7-domain RLS test suite in `apps/integration-tests/` is a strong foundation, needing only write-path isolation coverage to be comprehensive.
- **Auth key migration**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` used consistently in all Supabase client creation paths (the main source files are correct; only E2E test helpers are stale).
- **PostgREST error handling**: The `handlePostgrestError()` utility provides a consistent error surface — the double-toast issue is a wiring problem, not a design problem.

---

## Review Metadata

- **Review date**: 2026-02-23
- **Phases completed**: Scope, Code Quality, Architecture, Security, Performance, Testing, Documentation, Framework Best Practices, CI/CD & DevOps
- **Flags applied**: None (no `--security-focus`, `--performance-critical`, or `--strict-mode`)
- **Framework detected**: Next.js 15 + React 19 + TailwindCSS 4 + Supabase (PostgREST + Edge Functions) + TypeScript 5.9
- **Report files**:
  - `00-scope.md` — Review scope and target
  - `01-quality-architecture.md` — Code quality and architecture findings
  - `02-security-performance.md` — Security and performance findings
  - `03-testing-documentation.md` — Test coverage and documentation findings
  - `04-best-practices.md` — Framework standards and CI/CD findings
  - `05-final-report.md` — This consolidated report
