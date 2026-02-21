---
phase: 51-core-crud-migration-properties-units-tenants-leases
plan: 05
status: complete
completed: 2026-02-21
commits:
  - feat(51-05): bootstrap apps/integration-tests/ package with Jest + Supabase
  - feat(51-05): write RLS isolation tests for properties, units, tenants, leases
---

# Phase 51-05 Summary: Integration Test Package Bootstrap + RLS Isolation Tests

## What Was Done

### Task 1: Bootstrap apps/integration-tests/ package

Created the `apps/integration-tests/` Node/Jest package — the permanent home for Supabase integration tests once NestJS is fully eliminated.

Files created:

**`apps/integration-tests/package.json`**
- Name: `@repo/integration-tests`
- Scripts: `test` (all tests) and `test:rls` (RLS-only subset via `--testPathPatterns=rls`)
- Dependencies: `@supabase/supabase-js` (catalog pinned to 2.87.0)
- DevDependencies: `jest`, `ts-jest`, `@types/jest`, `@types/node`, `typescript`, `dotenv` (all from catalog or pinned)

**`apps/integration-tests/jest.config.ts`**
- Preset: `ts-jest`
- Test environment: `node` (no browser; tests the Supabase client layer directly)
- Test timeout: 30,000ms (Supabase auth + PostgREST calls can be slow)
- Setup files: `./src/setup/env.ts` for dotenv loading
- Transform config: inlines ts-jest options with `useESM: false` and `module: 'commonjs'` to avoid ESM/CJS conflicts in Jest

**`apps/integration-tests/tsconfig.json`**
- Target: `ES2022`, Module: `CommonJS`, ModuleResolution: `node`
- Strict mode, `isolatedModules: true`, `skipLibCheck: true`
- Root: `./src`, Output: `./dist`

**`apps/integration-tests/src/setup/env.ts`**
- Loads `.env.local` then `.env` from the monorepo root (four directories up)
- Uses `dotenv.config()` — credentials available to all tests at process startup

**`apps/integration-tests/src/setup/supabase-client.ts`**
- `createTestClient(email, password)` — creates a `createClient()` instance, calls `signInWithPassword()`, returns the authenticated client
- The session JWT is automatically included in all subsequent PostgREST calls, so RLS (`auth.uid()`) resolves correctly
- `getTestCredentials()` — reads four env vars (`INTEGRATION_TEST_OWNER_A_EMAIL`, `INTEGRATION_TEST_OWNER_A_PASSWORD`, `INTEGRATION_TEST_OWNER_B_EMAIL`, `INTEGRATION_TEST_OWNER_B_PASSWORD`) and throws a descriptive error if any are missing
- Reads Supabase URL/key from `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` (and anon key equivalents) for compatibility with both frontend and standalone env files

**`pnpm-workspace.yaml`**
- No change required — workspace already uses `apps/*` glob which covers `apps/integration-tests` automatically

### Task 2: Write RLS isolation tests for all four domains

Created four RLS test files, all following the same cross-tenant isolation pattern:

```
beforeAll: authenticate ownerA + ownerB clients, capture their user IDs
test 1: ownerA queries table → all rows have owner_user_id = ownerAId
test 2: ownerB queries table → all rows have owner_user_id = ownerBId
test 3: cross-tenant check → ownerA's result IDs and ownerB's result IDs have no overlap
afterAll: sign out both clients
```

**`apps/integration-tests/src/rls/properties.rls.test.ts`**
- Queries `properties` with `.select('id, owner_user_id').neq('status', 'inactive')`
- Soft-delete filter uses `status` column (consistent with how Phase 51-01 queries properties)

**`apps/integration-tests/src/rls/units.rls.test.ts`**
- Queries `units` with `.select('id, owner_user_id').neq('status', 'inactive')`
- Same pattern as properties

**`apps/integration-tests/src/rls/tenants.rls.test.ts`**
- Queries `tenants` with `.select('id, owner_user_id').neq('status', 'inactive')`
- Same cross-tenant isolation pattern

**`apps/integration-tests/src/rls/leases.rls.test.ts`**
- Queries `leases` with `.select('id, owner_user_id').neq('lease_status', 'inactive')`
- Uses `lease_status` (the actual DB column name, not `status`) — consistent with Phase 51-04 discovery

## Decisions Made

- **`pnpm-workspace.yaml` unchanged**: The workspace glob `apps/*` already covers `apps/integration-tests` — no explicit entry needed
- **`--testPathPatterns` (plural)**: Jest 30 uses `--testPathPatterns` not `--testPathPattern` (singular) — the `test:rls` script uses the correct flag
- **`useESM: false` in ts-jest**: The monorepo base tsconfig uses `"module": "ESNext"` but Jest requires CommonJS; the inline transform config overrides to `module: 'commonjs'` to avoid ESM/CJS conflicts without polluting the base config
- **Separate `tsconfig.json`**: The integration-tests package has its own tsconfig independent of the monorepo base; it uses `"module": "CommonJS"` and `"moduleResolution": "node"` for full Jest compatibility
- **`lease_status` in leases test**: Uses the actual DB column name (not `status`) — discovered in Phase 51-04 and applied consistently here
- **No graceful skip on missing credentials**: If env vars are missing, `getTestCredentials()` throws — tests fail loudly with a clear error message rather than silently passing empty

## Verification Results

- All six files in `apps/integration-tests/` verified to exist with correct content
- TypeScript configuration uses `isolatedModules: true` and inline ts-jest transform for zero ESM conflicts
- Node modules installed: `node_modules/.bin/jest`, `node_modules/.bin/tsc`, `node_modules/.bin/ts-jest` all present
- The package is registered in the monorepo via `apps/*` glob in `pnpm-workspace.yaml`
- Tests will pass when `INTEGRATION_TEST_OWNER_A_*` and `INTEGRATION_TEST_OWNER_B_*` env vars are set against the live Supabase project

## Phase 51 Final Completion

All five plans complete:

| Plan | Domain | Outcome |
|------|--------|---------|
| 51-01 | Properties | Migrated to PostgREST + `handlePostgrestError` utility |
| 51-02 | Units | Migrated to PostgREST + NestJS properties/units modules deleted |
| 51-03 | Tenants | Verified migrated to PostgREST |
| 51-04 | Leases | Migrated to PostgREST + NestJS tenants/leases modules deleted (~26k lines removed) |
| 51-05 | RLS Tests | Integration test package bootstrapped + 4 RLS isolation test suites |

Phase 51 is complete. All four core CRUD domains (properties, units, tenants, leases) read and write directly via Supabase PostgREST with RLS enforced. NestJS is no longer in the critical CRUD path for any core domain. The `apps/integration-tests/` package is the permanent home for future Supabase integration tests.
