# Phase 51-01 Summary: PostgREST Error Handler + Properties Migration

**Phase**: 51-core-crud-migration-properties-units-tenants-leases
**Plan**: 01
**Completed**: 2026-02-21
**Status**: DONE

## What Was Done

Completed the shared PostgREST error handler utility (already existed from prior work) and fully migrated the properties domain from NestJS `apiRequest` calls to Supabase PostgREST direct calls.

### Task 1: handlePostgrestError shared utility

File `apps/frontend/src/lib/postgrest-error-handler.ts` already existed with the correct implementation:
- Imports `PostgrestError` from `@supabase/supabase-js`
- Maps error codes to user-friendly messages: `23505` (duplicate), `23503` (FK violation), `42501` (RLS block), `PGRST116` (not found)
- Shows `toast.error()` with domain context
- Captures to Sentry via `Sentry.captureException()`
- Returns `never` (always throws the original error)

No changes needed for Task 1.

### Task 2: Migrate property-keys.ts to PostgREST

Rewrote `apps/frontend/src/hooks/api/query-keys/property-keys.ts`:
- Removed `apiRequest` import entirely
- Added `handlePostgrestError` and `createClient` imports
- `propertyQueries.list()`: Uses `supabase.from('properties').select(columns, { count: 'exact' })`, defaults to `.neq('status', 'inactive')`, supports search via `.or()`, returns `PaginatedResponse<Property>` with correct `pagination` shape
- `propertyQueries.withUnits()`: Uses `supabase.from('properties').select('*, units(*)')` with inactive filter
- `propertyQueries.detail(id)`: Uses `.eq('id', id).single()`
- `propertyQueries.stats()`: Aggregates via three parallel PostgREST head queries (active properties, total properties, occupied units)
- `propertyQueries.performance()`: Returns `[]` with TODO comment (RPC requires `p_user_id` — to be wired in Phase 53)
- `propertyQueries.analytics.*`: All three return empty `{}` with TODO comments (RPCs need user context)
- `propertyQueries.images()`: Unchanged (was already using Supabase directly)

### Task 3: Migrate use-properties.ts mutations to PostgREST

Rewrote `apps/frontend/src/hooks/api/use-properties.ts`:
- Removed `apiRequest` and `handleMutationError` imports
- Added `handlePostgrestError` import
- `useCreatePropertyMutation`: Gets userId via `supabase.auth.getUser()`, inserts with `owner_user_id`
- `useUpdatePropertyMutation`: Uses `supabase.from('properties').update(payload).eq('id', id).select().single()`
- `useDeletePropertyMutation`: Soft-delete via `update({ status: 'inactive' })` — no hard delete per 7-year retention policy
- `useMarkPropertySoldMutation`: Updates `status: 'sold'`, `date_sold`, `sale_price` via PostgREST
- `useDeletePropertyImageMutation`: Unchanged (was already using Supabase directly)
- All query hooks unchanged (delegate to property-keys.ts)

### Test Updates

Updated two test files to match the new PostgREST implementation:
- `src/hooks/api/__tests__/use-properties.test.tsx`: Removed `mockFetch`/NestJS URL assertions, switched to Supabase mock chains, analytics hooks now assert empty return values
- `src/hooks/api/__tests__/property-mutations.test.tsx`: Replaced `mockFetch` + `handleMutationError` assertions with Supabase mock chain assertions and `handlePostgrestError` verification

## Verification Results

- `pnpm --filter @repo/frontend typecheck`: Zero errors
- `grep "apiRequest" property-keys.ts use-properties.ts`: Only in comments
- `pnpm --filter @repo/frontend test:unit -- --run`: 969 passed, 8 skipped, 0 failed

## Key Decisions

- **Soft-delete confirmed**: `useDeletePropertyMutation` sets `status: 'inactive'` (not hard delete) per 7-year retention policy
- **Analytics deferred**: Performance, occupancy, financial, maintenance analytics RPCs all require `p_user_id` which is not available as a hook param. Returning empty stubs with TODO comments; to be wired in Phase 53
- **PaginatedResponse shape**: The type requires `pagination: { page, limit, total, totalPages }` not flat `limit`/`offset` fields
- **owner_user_id on insert**: Fetched via `supabase.auth.getUser()` in the mutation — RLS still enforces it server-side but the column requires an explicit value on INSERT

## Files Modified

| File | Change |
|------|--------|
| `apps/frontend/src/lib/postgrest-error-handler.ts` | Already complete, no changes |
| `apps/frontend/src/hooks/api/query-keys/property-keys.ts` | Full rewrite — PostgREST migration |
| `apps/frontend/src/hooks/api/use-properties.ts` | Mutations rewritten — PostgREST migration |
| `apps/frontend/src/hooks/api/__tests__/use-properties.test.tsx` | Updated to match PostgREST implementation |
| `apps/frontend/src/hooks/api/__tests__/property-mutations.test.tsx` | Updated to match PostgREST implementation |

## Next Steps

Plan 51-02: Migrate units (query keys + mutations) + delete NestJS properties/units modules
