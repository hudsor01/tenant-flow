# Phase 1: Code Quality & Architecture Review

## Code Quality Findings

### CRITICAL

**CQ-1: Unsafe `userId` extraction — `undefined` passed to inserts (6 hooks)**
Files: `use-properties.ts`, `use-maintenance.ts`, `use-unit.ts`, `use-vendor.ts`, `use-lease.ts`, `use-inspections.ts`
Every create mutation extracts `userId` without guarding against `undefined`:
```typescript
const { data: user } = await supabase.auth.getUser()
const userId = user.user?.id  // Can be undefined if session expired
supabase.from('properties').insert({ ...data, owner_user_id: userId })  // undefined goes to DB
```
If session has expired, inserts either create orphaned rows (null owner) or fail with opaque DB errors.
Fix: Create shared `getAuthenticatedUserId(supabase)` helper that throws a clear auth error if user is null.

**CQ-2: Non-atomic "set default payment method" — loses all defaults on partial failure**
Files: `use-payments.ts`, `use-payment-methods.ts`
Two sequential PostgREST calls (clear all defaults → set new default) with no transaction. If step 2 fails, tenant has zero default payment methods. Fix: Use an RPC function with a single atomic `UPDATE ... SET is_default = (id = $1)`.

**CQ-3: Duplicate payment method implementations with different query keys**
Files: `use-payments.ts` (lines 630-803), `use-payment-methods.ts` (entire file)
Two complete, parallel implementations of `usePaymentMethods`, `useDeletePaymentMethod`, `useSetDefaultPaymentMethod` using different query keys (`['paymentMethods', 'list']` vs `['payment-methods', 'list']`). Cache invalidation from one won't propagate to the other. Fix: Delete payment method hooks from `use-payments.ts`, consolidate to `use-payment-methods.ts`.

### HIGH

**CQ-4: `handlePostgrestError` toast always says "Failed to update" regardless of operation**
File: `apps/frontend/src/lib/postgrest-error-handler.ts`
A failed SELECT shows "Failed to update X: Record not found". Fix: Accept an `operation` parameter (`'fetch' | 'create' | 'update' | 'delete'`).

**CQ-5: Double-toast from dual error handlers in same mutation**
Files: All 27 hook files — `use-maintenance.ts`, `use-unit.ts`, `use-vendor.ts`, `use-lease.ts`, others
`handlePostgrestError` in `mutationFn` fires toast #1 + Sentry capture, then `handleMutationError` in `onError` fires toast #2 + logger. User sees two notifications per error. Some hooks (like `use-properties.ts`) have no `onError` handler at all — inconsistent. Fix: Standardize on one handler per mutation; remove `onError: handleMutationError` from any hook that already calls `handlePostgrestError`.

**CQ-6: Pervasive `as unknown as Type` double casts suppress type safety (40+ instances)**
Files: 15+ hook files
Examples: `(data as unknown as Record<string, unknown>)?.totalRevenue as number ?? 0`, `return created as unknown as Lease`. These bypass TypeScript entirely. Fix: Use `Tables<'tablename'>` generated types directly; create typed RPC wrapper functions that map explicitly.

**CQ-7: `selectPaginatedData` helper copy-pasted in 3 hook files**
Files: `use-properties.ts`, `use-maintenance.ts`, `use-unit.ts`
Identical one-liner duplicated three times. Fix: Move to `apps/frontend/src/lib/query-utils.ts`.

**CQ-8: Stale `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` references in E2E tests**
Files: `apps/e2e-tests/scripts/preflight.ts`, `apps/e2e-tests/auth-helpers.ts`
Frontend migrated to `ANON_KEY` but E2E tests still reference old key name — will fail CI unless old var also set.

### MEDIUM

**CQ-9: Financial hooks return misleading stub data (income = revenue, expenses = 0)**
File: `apps/frontend/src/hooks/api/use-financials.ts`
Hooks look correct (typed as `IncomeStatementData` etc.) but return `netIncome = totalRevenue` with all expense fields = 0. Users see plausible-looking but wrong financial reports. Fix: Return `null` or add `isStub: true` flag so UI can show "Coming soon" state.

**CQ-10: `useExpensesByProperty` silently returns all expenses regardless of propertyId**
File: `apps/frontend/src/hooks/api/use-financials.ts`
`void propertyId` suppresses the unused param warning. Any consumer gets wrong data.

**CQ-11: Vendor and Expense types defined locally instead of in `packages/shared/`**
Files: `use-vendor.ts`, `use-financials.ts`
Project CLAUDE.md requires single source of truth in `packages/shared/src/types/`. Fix: Use `Tables<'vendors'>` from generated `supabase.ts` or add to `core.ts`.

**CQ-12: `Expense` interface has all-optional fields including required DB columns**
File: `apps/frontend/src/hooks/api/use-financials.ts`
`amount?: number` but `amount` is a required `numeric` column. Overly permissive.

**CQ-13: `usePaymentVerification` and `useSessionStatus` both stub with `throw` — prefetch fills cache with error**
File: `apps/frontend/src/hooks/api/use-payments.ts`
`usePrefetchSessionStatus` will prefetch an error into cache. Fix: Add `enabled: false` to stub query options.

**CQ-14: Legacy key aliases exported without `@deprecated` annotation**
Files: `use-payments.ts`, `use-financials.ts`
`export const paymentQueryKeys = paymentVerificationKeys` — no deprecation marker.

### LOW

**CQ-15: `void logger` dead code suppression**
File: `apps/frontend/src/hooks/api/use-payments.ts`
Logger imported and instantiated but never used. CLAUDE.md: "Remove dead code immediately."

**CQ-16: RLS integration tests only cover SELECT (read isolation)**
File: `apps/integration-tests/src/rls/properties.rls.test.ts` (and 6 others)
No INSERT/UPDATE/DELETE isolation tests. Since writes moved from NestJS to client-direct PostgREST, write isolation is now critical.

**CQ-17: Middleware file not found**
Could not locate `apps/frontend/src/middleware.ts`. If removed, Supabase auth session refresh is broken. Verify.

**CQ-18: `version: _version` unused in maintenance update but present in interface**
File: `apps/frontend/src/hooks/api/use-maintenance.ts`
Interface promises optimistic locking that doesn't exist. Either implement consistently or remove.

---

## Architecture Findings

### CRITICAL

**ARCH-1: `owner_user_id` set from client-side — potential trust boundary violation**
Files: `use-properties.ts`, `use-maintenance.ts`, `use-unit.ts`, `use-vendor.ts`, `use-lease.ts`
Client sends `owner_user_id: userId` in insert payload. An attacker can forge this to any UUID. Whether exploitable depends entirely on whether INSERT RLS policy uses `WITH CHECK ((select auth.uid()) = owner_user_id)`. If any policy is weaker, orphaned or hijacked records can be created.
Fix (DB): Ensure all INSERT policies check `(select auth.uid()) = owner_user_id`. Audit all tables.
Fix (App): Use DB column default: `ALTER TABLE properties ALTER COLUMN owner_user_id SET DEFAULT (select auth.uid())` — removes client's ability to set it.

**ARCH-2: `Access-Control-Allow-Origin: *` on all Edge Functions**
Files: All 7 Edge Functions
Any website can make cross-origin requests to authenticated Edge Functions. With `Access-Control-Allow-Headers: authorization`, a malicious site visited by a logged-in user could trigger Edge Function calls using their credentials. Fix: Set to `Deno.env.get('FRONTEND_URL')`. Webhook endpoints (`stripe-webhooks`, `docuseal-webhook`) should omit CORS headers entirely (server-to-server).

**ARCH-3: DocuSeal webhook signature verification is optional (fail-open)**
File: `supabase/functions/docuseal-webhook/index.ts`
```typescript
if (webhookSecret) { /* verify */ } else {
  console.warn('endpoint is unauthenticated')  // continues processing!
}
```
If `DOCUSEAL_WEBHOOK_SECRET` is not set, anyone can POST arbitrary payloads to flip lease statuses to `active`, modify signature timestamps. Fix: Fail-closed — return 500 if secret not configured.

### HIGH

**ARCH-4: PostgREST search ilike injection via string interpolation**
File: `apps/frontend/src/hooks/api/query-keys/property-keys.ts`
```typescript
q.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
```
User could inject PostgREST filter operators via search string (e.g., `%,owner_user_id.eq.other-uuid`). PostgREST parses the entire filter string and would honor injected clauses. Fix: Sanitize input — escape commas, dots, parentheses before interpolation. Audit all hooks that accept user search strings.

**ARCH-5: `getSession()` vs `getUser()` inconsistency for Edge Function auth**
Files: `use-stripe-connect.ts`, `use-billing.ts`, `use-lease.ts`
Edge Function callers use `getSession()` (reads local cache, can be stale). Mutations use `getUser()` (validates server-side). Fix: Standardize on `getUser()` for write-path Edge Function calls.

**ARCH-6: Non-atomic multi-table mutations**
Files: `use-tenant.ts` (mark moved out), `use-payments.ts` (set default)
Sequential DB operations without transactions. If step 2 fails, data is in inconsistent state. Fix: Move complex multi-step operations to Supabase RPC functions wrapped in a single transaction.

**ARCH-7: Batch operations are N sequential PostgREST requests**
File: `use-tenant.ts` — `useBatchTenantOperations()`
N tenants = N round-trips. Fix: RPC function accepting array parameters.

**ARCH-8: Client-side CSV export duplicates `export-report` Edge Function**
File: `use-payments.ts` — `exportPaymentsCSV()`
Fetches all records to browser, converts client-side. Edge Function exists for this. Fix: Route through `export-report` Edge Function.

### MEDIUM

**ARCH-9: Edge Function action routing is a hidden God-Object**
Files: `supabase/functions/stripe-connect/index.ts` (6 actions, 278 lines), `supabase/functions/docuseal/index.ts` (5 actions, 600 lines)
Monolithic if/else dispatch recreates what the NestJS removal was meant to eliminate. Fix: Split into individual Edge Functions per action (`stripe-connect-onboard`, `stripe-connect-balance`, etc.).

**ARCH-10: `callEdgeFunction` helper duplicated 3 times**
Files: `use-stripe-connect.ts`, `use-billing.ts`, `use-lease.ts`
Identical token retrieval + fetch + error handling pattern. Fix: Extract to `apps/frontend/src/lib/supabase/edge-function-client.ts`.

**ARCH-11: Edge Function error response shapes inconsistent**
Stripe-webhooks: `{ error: string }` JSON. Stripe-checkout 401: plain text `'Unauthorized'`. DocuSeal-webhook 400: plain text `'Invalid signature'`. Fix: Standardize all error responses to `{ error: string }` JSON with `Content-Type: application/json`.

**ARCH-12: `as unknown as Type` casts indicate divergence between Supabase generated types and shared types**
Same as CQ-6 — architectural root cause: `Tables<'tablename'>` shapes not aligned with domain types.

**ARCH-13: Redundant `getUser()` calls multiply auth round-trips per page load**
80+ `supabase.auth.getUser()` calls across hooks. Per-page with 5 queries: 5 auth calls on mount. Supabase client may not cache across `createClient()` instances. Fix: Cache userId at session level.

**ARCH-14: TODO stubs reference mix of completed and future phases (phase-54 through phase-57)**
Some stubs reference already-completed phases. Fix: Audit TODO inventory; create tracking issue.

### LOW

**ARCH-15: Inline query key definitions in some hooks (inconsistency)**
Files: `use-billing.ts`, `use-payments.ts`
Keys defined inline rather than in dedicated `*-keys.ts` files. Inconsistent with well-organized property/maintenance/lease keys.

**ARCH-16: RLS tests only cover SELECT — write isolation untested**
Same as CQ-16 from the write-path security perspective. Critical given client-direct writes.

---

## Critical Issues for Phase 2 Context

The following findings from Phase 1 should inform the security and performance review:

**Security-critical:**
1. **ARCH-1 / CQ-1**: `owner_user_id` set from client — RLS INSERT policy audit required
2. **ARCH-2**: CORS `*` on all Edge Functions — CSRF vector
3. **ARCH-3**: DocuSeal webhook unauthenticated if env var not set
4. **ARCH-4**: PostgREST ilike string interpolation injection
5. **CQ-8**: Stale auth key in E2E tests — affects security test CI

**Performance-critical:**
1. **ARCH-7**: Batch operations as N sequential requests
2. **ARCH-13**: 80+ `getUser()` calls — multiplied auth round-trips
3. **CQ-2 / ARCH-6**: Non-atomic multi-table mutations create consistency gaps that require compensating read operations
4. **ARCH-8**: Client-side CSV export loads unbounded data into browser memory
