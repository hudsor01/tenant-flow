# Phase 4: Best Practices & Standards

## Framework & Language Best Practices Findings

### HIGH (Cross-References to Earlier Phases)

The following High-severity framework issues were independently confirmed by the framework review agent. They overlap with findings from Phases 1 and 2 and are listed here for completeness with cross-references:

**BP-X1: Double-Toast Error Handling** *(See also: CQ-5)*
Files: 20+ hook files including `use-lease.ts`, `use-inspections.ts`, `use-tenant.ts`, `use-billing.ts`
`handlePostgrestError` in `mutationFn` fires `toast.error()` + throws; `onError: handleMutationError` fires a second `toast.error()`. Users see two notifications per error. The correct pattern keeps a single error surface inside `mutationFn` and reserves `onError` for optimistic-update rollback only.

**BP-X2: Undefined `userId` in `owner_user_id` Insert** *(See also: CQ-1, SEC-08)*
Files: `use-properties.ts:279–284`, `use-inspections.ts:63–68`
`user.user?.id` returns `string | undefined`. No null-guard before insert. Requires explicit check: `if (authError || !user) throw new Error('Not authenticated')`.

**BP-X3: Duplicate Payment Method Hooks** *(See also: CQ-3)*
Files: `use-payments.ts`, `use-payment-methods.ts`
Two complete parallel implementations with different query keys. Cache invalidation from one never propagates to the other. Consolidate to `use-payment-methods.ts`.

**BP-X4: `getSession()` for Token Extraction** *(See also: SEC-07, ARCH-5)*
Files: `stripe-client.ts`, `use-billing.ts:65`
`getSession()` reads locally-cached JWT without server validation. `use-billing.ts:65` calls `getSession()` without a preceding `getUser()` validation — this is the true risk. `stripe-client.ts` is safe because `getUser()` validates first.

**BP-X5: Stale `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in E2E Tests** *(See also: CQ-8)*
Files: `apps/e2e-tests/scripts/preflight.ts:85–88,102`, `apps/e2e-tests/auth-helpers.ts:36–47`
Pre-merge blocker. See CI/CD section CICD-07.

---

### MEDIUM

**BP-01: `CookieOptions` Imported from `@supabase/ssr` (Fragile API)**
File: `apps/frontend/src/app/actions/auth.ts:3`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
```
`CookieOptions` was removed from the public API of `@supabase/ssr` v0.5+. The correct pattern (per CLAUDE.md) infers the `options` type inline from `cookiesToSet` — no explicit import needed. This creates fragile coupling to an internal type that may disappear in a future minor release.
Fix: Remove the `CookieOptions` import; type inference from the `setAll` callback is sufficient.

**BP-02: Stub Mutations With Unnecessary Optimistic Update Logic**
File: `apps/frontend/src/hooks/api/use-payments.ts:487–527`
`useCreateRentPaymentMutation` has `onMutate` optimistic state setup for a `mutationFn` that unconditionally throws (`throw new Error('Stripe payment processing requires Edge Function...')`). Every invocation triggers an optimistic update then an immediate rollback — the UI flickers on every call for a stub that always fails. Either remove `onMutate`/`onError` optimistic logic from stubs, or remove the stub mutation entirely.

**BP-03: Edge Function Dependencies Unpinned (Major Version Only)**
Files: All 8 Edge Functions in `supabase/functions/*/index.ts`
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  // ← unresolved on each cold start
```
Supabase-js is pinned to `@2` (major only) and Stripe to `npm:stripe@14` (14 versions behind current stable `stripe@17`). On every cold start the Edge Function resolves to the latest 2.x patch release — a breaking patch within v2 would silently affect all Edge Functions simultaneously. The Supabase-recommended practice for Deno 2.x is a `deno.json` import map with exact version pins.
Recommended fix: Create `supabase/functions/deno.json` with exact pinned versions for `@supabase/supabase-js` and `stripe`.

**BP-04: `as unknown as T` Casts Bypass Type System** *(See also: CQ-6, ARCH-12)*
Files: 20+ hook files with 60+ instances (e.g., `use-payments.ts:148,181,202`, `use-lease.ts:241,285`, `use-reports.ts:145,389,730`)
Pattern: `return (data ?? []) as unknown as UpcomingPayment[]`. While technically not `any`, this pattern provides equivalent type-safety bypass. Root cause: `Tables<'tablename'>` shapes diverge from domain types in `core.ts`. Recommended: create explicit typed mapping functions per domain rather than casting entire objects.

**BP-05: `auth-provider.tsx` Uses `getSession()` for Initial Auth State**
File: `apps/frontend/src/providers/auth-provider.tsx:79`
The central `AuthStoreProvider` initializes its `['auth', 'user']` query using `getSession()`, which reads the locally-cached JWT without server validation. For the initial page load (where middleware has already validated server-side), this is acceptable in practice. However, it means the client-side can't distinguish a valid from a revoked session until `onAuthStateChange` fires. The Supabase recommended pattern is `getUser()` for initial load, then `getSession()` only for token extraction after validation.

---

### LOW

**BP-06: CLAUDE.md Not Updated for NestJS Removal** *(See also: DOC-01)*
File: `CLAUDE.md`
The project's primary AI-facing reference document still documents the deleted NestJS backend: `apps/backend/src/modules/` directory tree, NestJS controller/service patterns, `rg "functionName" apps/backend/src/` search commands, `pnpm --filter @repo/backend dev`, and backend utility location. Misleading for any developer or AI session working on the post-v7.0 codebase.

**BP-07: Orphaned Backend Spec File**
File: `apps/backend/src/database/supabase.service.credential-masking.property.spec.ts`
The only non-`.DS_Store` file remaining in `apps/backend/`. If the test logic remains relevant, it should be migrated to an integration test or deleted. Leaving it in place may cause `pnpm test:unit` via Turbo to report success for `@repo/backend` with zero tests.

**BP-08: Stripe SDK and API Version Stale**
Files: All 4 Stripe Edge Functions
```typescript
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })  // 18+ months old
```
`npm:stripe@14` is 3 major versions behind current stable `stripe@17`. The API version `2024-06-20` is internally consistent with `stripe@14`, but `stripe@17` includes improved TypeScript types and newer event payloads. Not imminently breaking, but a scheduled upgrade is advisable.

---

### COMPLIANT (Positive Findings)

**BP-C1: TanStack Query v5 `queryOptions()` Pattern — Correct**
All query-key files (`property-keys.ts`, `maintenance-keys.ts`, `tenant-keys.ts`, `lease-keys.ts`) correctly use the `queryOptions()` factory. `useSuspenseQuery` is used with proper `Suspense` boundary expectations. No deprecated `onSuccess`/`onError` at the query level.

**BP-C2: Supabase SSR Cookie Implementation — Correct**
`client.ts`, `server.ts`, `proxy.ts`, and `auth/callback/route.ts` all use `getAll()`/`setAll()` exclusively. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is used consistently. Middleware correctly calls `supabase.auth.getUser()` and returns the `supabaseResponse` object unmodified. This is a full compliance with CLAUDE.md requirements.

**BP-C3: Turbo Pipeline — Correct**
`turbo.json` has been correctly simplified. No dangling backend-specific pipeline tasks. Root `package.json` no longer references deleted backend scripts.

---

## CI/CD & DevOps Findings

### HIGH

**CICD-01: RLS Security Tests Run Against Production Supabase**
File: `.github/workflows/rls-security-tests.yml`
The workflow passes `secrets.NEXT_PUBLIC_SUPABASE_URL` and `secrets.SUPABASE_SERVICE_ROLE_KEY` to the test runner — these are production credentials. The tests currently perform read-only SELECT isolation checks, which is acceptable, but there is no structural guard preventing future mutation tests from running against production. The `concurrency: cancel-in-progress: true` setting can orphan authenticated sessions mid-test.
Fix: Create a dedicated Supabase integration-test project. Prefix secrets `INTEGRATION_SUPABASE_URL` / `INTEGRATION_SERVICE_ROLE_KEY`. Add a `@readonly` guard in `jest.config.ts`.

**CICD-02: RLS Security Tests Do Not Gate Pull Requests (Post-Merge Only)**
File: `.github/workflows/rls-security-tests.yml:on`
```yaml
on:
  push:
    branches: [main]
```
RLS tests only execute after merge. A migration breaking tenant isolation would pass all PR checks, merge, then fail against production. There is no dependency or reference to `rls-security-tests.yml` from `ci-cd.yml`.
Fix: Add `pull_request` trigger with the same `paths` filter. Requires a test-isolated Supabase project (see CICD-01).

**CICD-03: Zero Backend Unit Tests With No Compensating Coverage Gate**
File: `.github/workflows/ci-cd.yml`
The PR deletes 97 NestJS test files. The CI pipeline now runs only frontend unit tests, lint, and typecheck. The `apps/backend/` directory still exists in the workspace and `turbo.json` still has `test:unit` defined — running `pnpm test:unit` will silently find zero tests in `@repo/backend` and pass, creating false confidence. All Edge Function and PostgREST data-access paths have zero unit test coverage in CI.
Fix: Either remove `@repo/backend` from `pnpm-workspace.yaml` or explicitly enumerate tested workspaces. Document the coverage gap and create a tracking issue for Edge Function unit tests.

---

### MEDIUM

**CICD-04: E2E Tests Not Wired into CI Pipeline**
File: `.github/workflows/ci-cd.yml`
A full Playwright suite exists in `apps/e2e-tests/` (multi-browser, multi-role: owner, tenant, smoke) but no E2E job exists in `ci-cd.yml`. For the NestJS-era this was acceptable; for a direct-to-Supabase architecture, E2E tests are the only full-path verification that PostgREST/Edge Function replacements work end-to-end. The `playwright.config.ts` already handles CI gracefully (retries, workers, GitHub reporter, local webServer).
Fix: Add a `test:e2e:smoke` job running only `smoke/` and `public/` project suites against a local Supabase instance.

**CICD-05: Stale `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in E2E Preflight and Auth Helpers** *(Pre-merge blocker — see Blocker A)*
Files: `apps/e2e-tests/scripts/preflight.ts:85–88,144–148`, `apps/e2e-tests/auth-helpers.ts:36–47`
Preflight's `check('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', ...)` uses `warnOnly: false` — it will block all local E2E runs when the old env var is removed post-merge. `auth-helpers.ts` falls back to undefined silently. The preflight also checks for a backend health endpoint at `localhost:4650/health/ping` which no longer exists.
Fix: Update both files to use `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Remove the backend health check.

**CICD-06: Production Monitoring Tests Reference Deleted Backend**
File: `apps/e2e-tests/tests/production/monitoring.prod.spec.ts`
Contains `test('backend health check should respond')` calling `${API_BASE_URL}/api/v1/health`. When the Railway project is deleted, this will fail permanently. If wired into a scheduled monitoring workflow, it generates indefinite false alarms.
Fix: Remove backend health check and database connection tests; replace with Supabase REST endpoint check and Edge Function health check.

**CICD-07: `RAILWAY_TOKEN` Should Be Removed Pre-Merge, Not Post-Merge** *(Pre-merge blocker — see Blocker B)*
The PR test plan lists Railway secret removal as a post-merge operational step. The `deploy-backend.yml` workflow consuming these secrets is already deleted — there is no reason to retain them. Keeping them in place between merge and manual cleanup creates a needless exposure window.
Fix: Remove `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, and `RAILWAY_SERVICE_ID` from GitHub repository secrets before merging.

**CICD-08: `NEXT_PUBLIC_SUPABASE_ANON_KEY` Must Be Set in Vercel Before Merge** *(Pre-merge blocker — see Blocker C)*
The PR test plan lists adding `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel as a post-merge step. The `@t3-oss/env-nextjs` validation in `env.ts` requires this variable. If the Vercel deploy runs (triggered by merge) before the env var is set, the Next.js build will fail at the env validation boundary and the deployment will break.
Fix: Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel production environment before merging.

**CICD-09: Edge Function CORS Set to `*` on Webhook Receivers** *(See also: SEC-05, ARCH-02)*
Files: `supabase/functions/stripe-webhooks/index.ts`, `supabase/functions/docuseal-webhook/index.ts`
Webhook endpoints are exclusively server-to-server calls and should never have browser CORS headers. `Access-Control-Allow-Origin: *` is unnecessarily permissive and indicates the CORS headers were copied from the browser-facing Edge Functions without systematic review. Not a merge blocker but should be addressed in a follow-up security pass.

---

### LOW

**CICD-10: pnpm Version Inconsistency in Reusable Workflows**
Files: `.github/workflows/lint.yml`, `tests.yml`, `typecheck.yml`
All three reusable workflows default to `pnpm-version: '10.20.0'`. The root `package.json` specifies `pnpm@10.29.3`. `ci-cd.yml` correctly overrides to `10.29.3`, but the stale default means any future caller invoking the reusable workflows without the override will silently use the wrong pnpm version.
Fix: Update defaults to `10.29.3` in all three workflow files.

**CICD-11: No Formal Rollback Plan for PostgREST Migration**
The PR removes the Railway deployment workflow. Once the Railway project is deleted (post-merge), rollback requires reprovisioning Railway, restoring `deploy-backend.yml`, and redeploying. There is no documented rollback procedure. The 5-minute Sentry observation window is insufficient for latent failures (e.g., RPC functions that only fail under authenticated load).
Recommendation: Keep Railway project in a stopped (not deleted) state for ≥48 hours post-merge. Archive `deploy-backend.yml` in a gist or tagged commit rather than permanently deleting it. Document the rollback window in the PR body.

---

## Pre-Merge Blockers (3 items)

**Blocker A — E2E preflight and auth-helpers reference deleted env var and endpoint**
- `apps/e2e-tests/scripts/preflight.ts`: Change `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (lines 85–88, 102); remove backend health check at lines 144–148
- `apps/e2e-tests/auth-helpers.ts`: Change `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (lines 36–47)

**Blocker B — Remove Railway secrets from GitHub before merging**
Remove `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, and `RAILWAY_SERVICE_ID` from GitHub repository secrets. The `deploy-backend.yml` workflow that consumed them is already deleted.

**Blocker C — Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel before merge triggers deploy**
Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel production environment variables before merging. Without this, the post-merge Vercel deployment will fail at the `@t3-oss/env-nextjs` validation boundary.

---

## Critical Issues for Phase 5 Context

1. **Three pre-merge blockers** (Blocker A/B/C) must be resolved before this PR can be safely merged
2. **CICD-01/02**: RLS security tests run post-merge against production — a structural operational risk introduced by this PR
3. **CICD-03**: Deletion of 97 NestJS tests with no compensating CI coverage gate for Edge Functions/PostgREST paths
4. **BP-03**: All 8 Edge Functions have unpinned dependency resolution — operational stability risk on cold starts
5. **BP-C2**: Supabase SSR implementation is fully compliant — positive signal for auth correctness
