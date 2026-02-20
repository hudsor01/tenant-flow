---
phase: 32-frontend-test-restoration
plan: 01
type: summary
completed: 2026-01-21
duration: ~15 min
---

# Phase 32-01 Summary: Core Domain Hook Tests (Tenant & Lease)

## Objective

Add unit test coverage for the highest-value API hooks: tenant and lease management. These are core domain hooks with complex query patterns and mutations.

## Completed Tasks

### Task 1: Create use-tenant.test.tsx ✅

**Commit:** `9f5d13bff`

Created comprehensive test file with 22 tests covering:

**Query Hooks:**
- `useTenant` - fetches by ID, disabled when empty
- `useTenantWithLease` - fetches tenant with lease data
- `useTenantList` - fetches with pagination params
- `useAllTenants` - fetches all tenants
- `useTenantStats` - fetches stats endpoint
- `useNotificationPreferences` - fetches preferences
- `useInvitations` - fetches invitations list
- `usePrefetchTenantDetail` - prefetch utility

**Mutation Hooks:**
- `useCreateTenantMutation` - POST to correct endpoint
- `useUpdateTenantMutation` - PUT with ID
- `useDeleteTenantMutation` - DELETE with ID
- `useInviteTenantMutation` - POST invitation
- `useResendInvitationMutation` - resend invitation
- `useCancelInvitationMutation` - cancel invitation

**Error Handling:**
- Tests verify proper error responses are handled

### Task 2: Create use-lease.test.tsx ✅

**Commit:** `0b7321865`

Created comprehensive test file with 26 tests covering:

**Query Hooks:**
- `useLease` - fetches by ID, disabled when empty
- `useLeaseList` - fetches with filters
- `useLeaseStats` - fetches stats endpoint
- `useExpiringLeases` - fetches expiring leases
- `useCurrentLease` - fetches current lease
- `useLeaseSignatureStatus` - fetches signature status
- `useSignedDocumentUrl` - fetches signed document URL
- `usePrefetchLeaseDetail` - prefetch utility

**Mutation Hooks:**
- `useCreateLeaseMutation` - POST with lease data
- `useUpdateLeaseMutation` - PUT with ID
- `useDeleteLeaseMutation` - DELETE with ID
- `useTerminateLeaseMutation` - termination endpoint
- `useRenewLeaseMutation` - renewal endpoint
- `useSendLeaseForSignatureMutation` - send for signature
- `useSignLeaseAsOwnerMutation` - owner signs
- `useSignLeaseAsTenantMutation` - tenant signs
- `useCancelSignatureRequestMutation` - cancel signature request

**Error Handling:**
- Tests verify proper error responses are handled

### Task 3: Create api-test-utils.tsx ✅

**Commit:** `69363e901`

Created reusable test utilities module exporting:

- `createTestWrapper()` - Fresh QueryClient wrapper per test
- `createMockFetchResponse<T>()` - Mock Response for apiRequest
- `createSupabaseMocks()` - Standard Supabase mock functions
- `setupAuthenticatedSession()` - Mock authenticated session
- `setupUnauthenticatedSession()` - Mock unauthenticated session
- `createPaginatedResponse<T>()` - Paginated response structure
- `TEST_API_BASE_URL` - Consistent base URL constant
- `STANDARD_MOCKS_PATTERN` - Documentation pattern for standard mocks

## Test Statistics

| File | Tests |
|------|-------|
| use-tenant.test.tsx | 22 |
| use-lease.test.tsx | 26 |
| **Total** | **48** |

Total frontend unit tests: 976 passing (was 928 before this phase)

## Technical Decisions

1. **Mock Pattern:** Used `vi.stubGlobal('fetch', mockFetch)` instead of MSW as per existing codebase patterns
2. **Type Correctness:** Fixed test data to match actual Zod schema requirements (TenantCreate uses `user_id`/`stripe_customer_id`, LeaseCreate requires `auto_pay_enabled`/`lease_status`)
3. **File Extension:** Used `.tsx` for utilities file since it contains JSX in the wrapper component

## Files Created

- `apps/frontend/src/hooks/api/__tests__/use-tenant.test.tsx` (NEW)
- `apps/frontend/src/hooks/api/__tests__/use-lease.test.tsx` (NEW)
- `apps/frontend/src/test/api-test-utils.tsx` (NEW)

## Verification

- [x] `pnpm --filter @repo/frontend test:unit` passes (976 tests)
- [x] use-tenant.test.tsx has 22 tests (>15 required)
- [x] use-lease.test.tsx has 26 tests (>15 required)
- [x] api-test-utils.tsx exports reusable utilities
- [x] No TypeScript errors

## What's Next

Phase 32 complete. Ready for v4.0 milestone completion.
