# Phase 62: Code Quality + Performance — Plan Index

## Plans

| Plan | Title | Wave | Depends On | Est. |
|------|-------|------|------------|------|
| 62-01 | Error Handling: Eliminate Double-Toast Pattern | 1 | — | 25min |
| 62-02 | Hook Consolidation + TODO Stub Replacement | 1 | — | 30min |
| 62-03 | Auth Caching + Performance Optimizations | 2 | 62-01 | 25min |

## Wave Strategy

**Wave 1** (parallel): 62-01 and 62-02 can run in parallel — they touch different files.
- 62-01: `postgrest-error-handler.ts`, `mutation-error-handler.ts`, and toast calls in ~19 hook files
- 62-02: `use-payments.ts`, `use-payment-methods.ts`, and ~10 stub files across the codebase

**Wave 2** (sequential): 62-03 depends on 62-01 because the error handler changes must be stable before refactoring auth calls in the same hook files.

## Research Summary

### Finding 1: Double-Toast Pattern (SC-1)
`handlePostgrestError()` shows a toast AND throws. When this throw reaches TanStack Query's `onError`, `handleMutationError()` shows ANOTHER toast. This is the root cause of all double-toasts.

**Affected hooks**: 19 files with 209 handlePostgrestError calls + 105 handleMutationError calls across mutation hooks.

**Fix**: Remove the toast from `handlePostgrestError` (make it throw-only + Sentry). The single `handleMutationError` in `onError` becomes the sole toast source. No individual hook changes needed for the toast fix itself.

### Finding 2: Duplicate Payment Method Hooks (SC-2)
Two files define identical hooks:
- `use-payments.ts`: `usePaymentMethods`, `useSetDefaultPaymentMethodMutation`, `useDeletePaymentMethodMutation` (lines 642-808)
- `use-payment-methods.ts`: `usePaymentMethods`, `useDeletePaymentMethod`, `useSetDefaultPaymentMethod`, `useAddPaymentMethodMutation`

Consumers split between both files. The `use-payment-methods.ts` version is more complete (has `useAddPaymentMethodMutation`, proper `handleMutationSuccess` calls, `queryOptions` pattern).

**Fix**: Delete duplicates from `use-payments.ts`, keep `use-payment-methods.ts` as canonical, update all imports.

### Finding 3: TODO Stubs (SC-3)
Found 13 runtime-throw stubs across the codebase:

| # | File | Stub | Fix Strategy |
|---|------|------|-------------|
| 1 | `use-payments.ts:616` | Payment reminder | Implement via Resend Edge Function call |
| 2 | `use-payments.ts:830` | Payment verification | Remove dead code — replaced by Stripe Checkout flow |
| 3 | `use-payments.ts:858` | Session status | Remove dead code — replaced by Stripe Checkout flow |
| 4 | `bulk-import-stepper.tsx:63` | Bulk import Edge Function | Show "not available" UI with disabled state |
| 5 | `use-template-pdf.ts:41` | PDF preview | Show "not available" UI |
| 6 | `use-template-pdf.ts:59` | PDF export | Show "not available" UI |
| 7 | `template-definition.ts:73` | Template save | Show "not available" UI |
| 8 | `use-identity-verification.ts:60` | Identity verification session | Show "not available" UI |
| 9 | `invite-tenant-form.tsx:52` | Tenant invitation email | Implement: create invitation record (already works in useInviteTenantMutation) |
| 10 | `onboarding-step-tenant.tsx:36` | Tenant invitation email | Implement: create invitation record |
| 11 | `contact-form.tsx:96` | Contact form submission | Implement via Resend Edge Function |
| 12 | `use-tenant-portal.ts:1232` | Autopay setup | Keep as Phase 64 placeholder with explicit toast |
| 13 | `use-tenant-portal.ts:1258` | Autopay cancel | Keep as Phase 64 placeholder with explicit toast |

### Finding 4: Tenant Portal Serial Requests (SC-4)
`amountDue` query does 5 serial requests: getUser -> tenants -> leases -> stripe_connected_accounts -> rent_due (+ optional rent_payments check).
`dashboard` query does 3 serial requests: getUser -> tenants -> leases.
`payments` query does 3 serial requests: getUser -> tenants -> leases -> rent_payments.

**Fix**: Combine tenant lookup + lease into a single PostgREST query with relation joins. Parallelize independent queries.

### Finding 5: Auth Fan-out (SC-5)
86 `supabase.auth.getUser()` calls across 23 hook files. Each makes a network round-trip to Supabase auth server.

**Fix**: `useCurrentUser` hook already exists and is backed by TanStack Query cache. Problem is that `getUser()` is called inside `queryFn`/`mutationFn` (non-React contexts) where hooks can't be used. Solution: Create a `getCachedUser()` utility that reads from the auth provider's TanStack Query cache, falling back to `getUser()` only on cache miss.

### Finding 6: Unbounded CSV Export (SC-5)
`exportPaymentsCSV()` in `use-payments.ts` has no `.limit()` — fetches all payments.

**Fix**: Add `.limit(10000)` cap.

### Finding 7: Batch Tenant N+1 (SC-4)
`useBatchTenantOperations` iterates with individual `for` loop calls. PostgREST supports `.in('id', [...ids])` for batch operations.

**Fix**: Replace loops with single `.in()` queries.
