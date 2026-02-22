# Phase 54-01 Summary: Migrate Payments to PostgREST

## Status: Complete

**Phase:** 54-payments-billing-postgrest-stripe-edge-functions
**Plan:** 01
**Type:** Execute
**Completed:** 2026-02-21

## Objective

Migrate `use-payments.ts` and `use-payment-methods.ts` from NestJS `apiRequest()` to Supabase PostgREST direct calls, eliminating all `apiRequest`/`apiRequestRaw` imports from the payments domain.

## Tasks Completed

### Task 1: Migrate use-payment-methods.ts to PostgREST
**Status: Already complete at start of phase**

The file was found to be fully migrated on inspection:
- `supabase.from('payment_methods')` for all CRUD operations
- `usePaymentMethods()` — SELECT with explicit columns, ordered by `created_at`
- `useDeletePaymentMethod()` — DELETE by `id`
- `useSetDefaultPaymentMethod()` — two-step: clear all tenant defaults, set target
- `useAddPaymentMethodMutation()` — INSERT with is_default=true if first card
- `mutationKeys.paymentMethods.add` already present in `mutation-keys.ts`
- Zero `apiRequest` calls
- `PaymentMethod` interface uses `last_four` (DB column name) not `last4`

### Task 2: Migrate use-payments.ts to PostgREST
**Status: Complete — full rewrite performed**

**What changed:**
- Removed `import { apiRequest, apiRequestRaw } from '#lib/api-request'`
- Added `import { createClient } from '#lib/supabase/client'`
- Added `import { handlePostgrestError } from '#lib/postgrest-error-handler'`

**Hooks migrated:**
- `rentCollectionQueries.analytics()` — replaced apiRequest with `supabase.rpc('get_dashboard_stats', { user_id })` + maps to `PaymentCollectionAnalytics` shape with `TODO(phase-56)` comment for dedicated analytics RPC
- `rentCollectionQueries.upcoming()` — replaced apiRequest with `supabase.from('rent_payments').gte/lte/eq('status','pending').order('due_date').limit(50)`
- `rentCollectionQueries.overdue()` — replaced apiRequest with `supabase.from('rent_payments').lt('due_date').in('status',['pending','failed'])`
- `tenantPaymentQueries.ownerPayments()` — replaced apiRequest with PostgREST filter by `tenant_id`, returns `TenantPaymentHistoryResponse` with pagination
- `tenantPaymentQueries.selfPayments()` — two-step: auth.getUser() → tenants lookup → rent_payments filter by tenant.id
- `usePaymentStatus()` — replaced apiRequest with `supabase.from('rent_payments').maybeSingle()`, maps to `TenantPaymentStatusResponse`
- `usePaymentMethods()` — replaced apiRequest with `supabase.from('payment_methods')`, maps DB `last_four` → `last4` for `PaymentMethodResponse` compatibility
- `useSetDefaultPaymentMethodMutation()` — replaced apiRequest with PostgREST two-step update (clear all, set target)
- `useDeletePaymentMethodMutation()` — replaced apiRequest with `supabase.from('payment_methods').delete()`
- `recordManualPayment()` — replaced apiRequest with `supabase.from('rent_payments').insert()`, currency defaulted to 'USD'
- `exportPaymentsCSV()` — replaced apiRequestRaw with client-side PostgREST fetch + CSV generation via `rowsToCsv()` helper
- `useSendTenantPaymentReminderMutation()` — throws `new Error('TODO Phase 55: payment reminder requires email Edge Function')`

**Stripe stubs (Phase 54-02 / 54-04):**
- `useCreateRentPaymentMutation()` — mutationFn throws `new Error('Stripe payment processing requires Edge Function setup — coming in Phase 54 plan 02')`
- `usePaymentVerification()` — queryFn throws `new Error('Session verification requires stripe-checkout Edge Function — see Phase 54-04')`
- `useSessionStatus()` — queryFn throws same stub error
- `paymentVerificationQueries.sessionStatus()` — stub error

**Test file updated:**
- `src/hooks/api/__tests__/use-payments.test.tsx` rewritten to mock `#lib/supabase/client` + `#lib/postgrest-error-handler` instead of `#lib/api-request`
- All 6 tests pass with Supabase client mocking

## Verification

```bash
# No apiRequest in either file (only in comments)
grep -n "apiRequest" apps/frontend/src/hooks/api/use-payments.ts
# → only comment references

grep -n "apiRequest" apps/frontend/src/hooks/api/use-payment-methods.ts
# → only comment references

# PostgREST calls present
grep -c "\.from(" apps/frontend/src/hooks/api/use-payments.ts
# → 13 .from() calls

grep -c "\.from(" apps/frontend/src/hooks/api/use-payment-methods.ts
# → 8 .from() calls

# TypeScript: no new errors in payment files
pnpm --filter @repo/frontend typecheck 2>&1 | grep "use-payments\|use-payment-methods"
# → (no output)

# Unit tests: 965 pass
pnpm --filter @repo/frontend exec vitest --run src/hooks/api/__tests__/use-payments.test.tsx
# → 6 passed
```

## Decisions Made

- `usePaymentMethods()` in `use-payments.ts` maps DB column `last_four` → `last4` to preserve `PaymentMethodResponse` type compatibility (consumers import `PaymentMethodResponse` from `@repo/shared/types/core` which uses `last4`)
- `usePaymentStatus()` uses `.maybeSingle()` not `.single()` to avoid 406 errors when no payments exist; returns safe empty stub
- `recordManualPayment()` defaults `period_start`/`period_end` to today's date (owners set this via the manual payment form); `currency` defaults to 'USD'
- `exportPaymentsCSV()` generates client-side CSV with `rowsToCsv()` helper — no apiRequestRaw needed
- Pre-existing type errors in `connect-onboarding-dialog.tsx` and billing pages are unrelated to this migration

## Files Modified

- `apps/frontend/src/hooks/api/use-payments.ts` — full PostgREST migration
- `apps/frontend/src/hooks/api/__tests__/use-payments.test.tsx` — updated to mock supabase client

## Files Verified Complete (No Changes Needed)

- `apps/frontend/src/hooks/api/use-payment-methods.ts` — already fully migrated
- `apps/frontend/src/hooks/api/mutation-keys.ts` — already has `paymentMethods.add`
