# Phase 9: Testing & CI Pipeline - Research

**Researched:** 2026-03-06
**Domain:** Testing infrastructure, CI/CD pipelines, security scanning, TypeScript strictness
**Confidence:** HIGH

## Summary

Phase 9 is a testing and CI infrastructure hardening phase covering seven distinct domains: CI pipeline enhancement (add `next build`, RLS on every PR, E2E smoke on main), security scanning (gitleaks in lefthook pre-commit), Edge Function testing (Deno test runner for 4 critical functions), RLS test gap filling (7 new table domains + tenant-role isolation), shared validation/utility tests, TypeScript strictness flags (4 flags + fixes), and E2E suite trimming (57 files down to 15-20). No new features -- purely hardening.

The project already has substantial infrastructure: Vitest 4.0.18 with 3 projects (unit/component/integration), lefthook with parallel pre-commit hooks, GitHub Actions CI with lint + typecheck, a separate RLS security test workflow, Playwright E2E with auth setup projects, and 80% coverage thresholds configured in vitest.config.ts. The work is extending and filling gaps in this existing infrastructure.

**Primary recommendation:** Organize into 6-8 plans grouped by domain -- CI changes, gitleaks, Edge Function tests, RLS tests, shared validation/utility tests, TypeScript strictness, E2E cleanup, and CLAUDE.md update. Many are independent and can be parallelized.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PRs run: lint + typecheck + next build (clean build, no cache). Tests and coverage stay local.
- RLS security tests run on every PR to main (not just migration-touching PRs). Remove path filter from rls-security-tests.yml.
- Unit tests + coverage enforcement stay local only via lefthook pre-commit. CI trusts local hooks.
- No trivy -- rely on GitHub Dependabot for dependency vulnerability alerts.
- next build uses clean build every time (no .next/cache between runs). Simple and deterministic.
- Gitleaks in lefthook pre-commit -- secrets caught before they ever reach the repo. No gitleaks in CI.
- Edge Function tests follow official Supabase documentation: Deno's built-in test runner (deno test --allow-all).
- Tests live in supabase/functions/tests/ directory per official recommended structure.
- Integration-style tests: create Supabase client, invoke functions, assert responses.
- Comprehensive coverage for 4 critical Edge Functions: stripe-webhooks, stripe-rent-checkout, stripe-autopay-charge, tenant-invitation-accept. All paths tested (~10-15 tests per function).
- Edge Function tests run locally only (manual or pre-push). Not in CI.
- E2E: pre-commit + CI on merge to main. CI runs smoke tests only (critical-paths.smoke.spec.ts, minimal.smoke.spec.ts).
- Fix stale monorepo references: cd apps/frontend in playwright.config.ts webServer, pnpm --filter @repo/e2e-tests in playwright.config.prod.ts.
- Trim E2E suite to 15-20 tests: audit all 57 files, remove/archive broken, outdated, or redundant tests.
- Create .env.test template for E2E test configuration (TEST-21).
- Enable all 4 TypeScript strictness flags in a single plan: noUnusedLocals, noUnusedParameters, isolatedModules, checkJs.
- Fix all resulting errors in one sweep. Use underscore prefix for intentionally unused callback params.
- New RLS tests for: rent_payments, payment_methods, documents, notifications, notification_settings, subscriptions, tenant_invitations.
- Tenant-role isolation tests (TEST-09): verify tenants cannot access other tenants' data.
- Match existing RLS test pattern: dual-client (ownerA/ownerB), test SELECT/INSERT/UPDATE/DELETE isolation.
- TEST-05/06: Claude assesses value of each shared validation schema and utility function. Write tests for valuable ones, remove dead code.
- TEST-15: Fix skipped tests in bulk-import-upload-step.test.tsx. Investigate root cause and make them pass.

### Claude's Discretion
- RLS test infrastructure for tenant-role testing (test user setup, credentials)
- Coverage enforcement mechanism in lefthook (whether --coverage flag with thresholds or just run tests)
- .env.test template contents and whether committed or gitignored
- Which of the 57 E2E files to keep vs trim (based on audit of broken/redundant/critical)
- Specific test cases for each Edge Function (determined during research of function logic)
- Assessment of which shared validation schemas and utility functions deserve tests vs removal
- TEST-13 (attach-payment-method API route test) and TEST-14 (Supabase client utility tests) approach
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | next build added as CI pipeline step | CI workflow modification -- add step after lint/typecheck, use `SKIP_ENV_VALIDATION=true` |
| TEST-02 | --coverage flag added to CI -- 80% threshold enforced | User decided: coverage stays local via lefthook, not CI. Threshold already in vitest.config.ts. |
| TEST-03 | E2E playwright.config.ts webServer path fixed | Stale `cd apps/frontend` on line 263, needs removal |
| TEST-04 | Tests for critical Edge Functions (4 functions) | Deno test runner in supabase/functions/tests/, integration-style |
| TEST-05 | Tests for shared validation schemas | Assess 10 validation files (2190 lines total), test valuable ones |
| TEST-06 | Tests for shared utility functions | 3 utility files: currency.ts, api-error.ts, optimistic-locking.ts |
| TEST-07 | RLS tests for rent_payments, payment_methods, payment_transactions | New test file following dual-client pattern |
| TEST-08 | RLS tests for documents, notifications, notification_settings, subscriptions, tenant_invitations | New test files following dual-client pattern |
| TEST-09 | Tenant-role RLS isolation tests | New test infrastructure for tenant credentials, verify cross-tenant isolation |
| TEST-10 | Security scanning (gitleaks) wired into CI | User decided: gitleaks in lefthook pre-commit only, not CI |
| TEST-11 | RLS tests added to PR CI pipeline | Remove paths: filter from rls-security-tests.yml |
| TEST-12 | E2E tests added to CI (at least on merge to main) | Smoke tests run on push to main branch |
| TEST-13 | Tests for attach-payment-method API route | Unit test with mocked Supabase + Stripe |
| TEST-14 | Tests for Supabase client utilities | getCachedUser and server.ts createClient |
| TEST-15 | Skipped tests in bulk-import-upload-step.test.tsx resolved | jsdom FileList limitation -- investigate workaround |
| TEST-16 | noUnusedLocals and noUnusedParameters enabled in tsconfig | Lines 30-31 currently false, change to true + fix errors |
| TEST-17 | isolatedModules: true set in tsconfig | Line 17 currently false, change to true |
| TEST-18 | Lefthook pre-commit changed to not run RLS integration tests | Already done in Phase 6: RLS moved to pre-push |
| TEST-19 | checkJs: true set in tsconfig for .js/.cjs files | Line 12 currently false, only 5 JS/CJS files in project |
| TEST-20 | Stale monorepo references removed from playwright.config.prod.ts, E2E READMEs | Fix pnpm --filter @repo/e2e-tests reference |
| TEST-21 | .env.test template created for E2E test configuration | Template with placeholder values, committed to repo |
| DOC-01 | CLAUDE.md updated to reflect phase 9 changes | Add testing conventions and CI pipeline docs |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.0.18 | Unit/component/integration tests | Already configured with 3 projects |
| @vitest/coverage-v8 | 4.0.18 | Code coverage | Already configured with 80% thresholds |
| Playwright | 1.58.2 | E2E tests | Already configured with auth projects |
| Deno test runner | Built-in | Edge Function tests | Official Supabase recommendation |
| gitleaks | 8.30.0 | Secret scanning | Already installed at /opt/homebrew/bin/gitleaks |
| lefthook | 2.1.1 | Git hooks management | Already configured with pre-commit/pre-push |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | 16.3.2 | Component test rendering | Already installed |
| @testing-library/user-event | 14.6.1 | User interaction simulation | Already installed |
| @testing-library/jest-dom | 6.9.1 | DOM assertions | Already installed |
| @std/assert (Deno) | 1.x | Edge Function test assertions | For Deno tests only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gitleaks in lefthook | gitleaks GitHub Action | User decided: pre-commit catches secrets earlier |
| Vitest coverage in CI | Local-only coverage | User decided: CI trusts local hooks |
| trivy | GitHub Dependabot | User decided: Dependabot sufficient |

## Architecture Patterns

### Test Directory Structure
```
supabase/
  functions/
    tests/                          # NEW: Edge Function tests
      stripe-webhooks-test.ts
      stripe-rent-checkout-test.ts
      stripe-autopay-charge-test.ts
      tenant-invitation-accept-test.ts
tests/
  integration/
    rls/
      [existing 14 files]
      rent-payments.rls.test.ts     # NEW
      payment-methods.rls.test.ts   # NEW
      documents.rls.test.ts         # EXISTS (extended)
      notifications.rls.test.ts     # NEW
      notification-settings.rls.test.ts # NEW
      subscriptions.rls.test.ts     # NEW
      tenant-invitations.rls.test.ts    # NEW
      tenant-isolation.rls.test.ts  # NEW: cross-tenant tests
  e2e/
    tests/
      [trimmed from 57 to ~15-20 files]
```

### Pattern 1: RLS Test Dual-Client Pattern (Existing)
**What:** Each RLS test file creates two authenticated Supabase clients (ownerA, ownerB) and verifies cross-owner isolation for SELECT/INSERT/UPDATE/DELETE.
**When to use:** All owner-role RLS tests.
**Example:**
```typescript
// Source: tests/integration/rls/properties.rls.test.ts (existing pattern)
import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('TableName RLS -- cross-tenant isolation', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let ownerAId: string
  let ownerBId: string
  const testInsertedIds: string[] = []

  beforeAll(async () => {
    const { ownerA, ownerB } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
    clientB = await createTestClient(ownerB.email, ownerB.password)
    // ...get user IDs
  })

  afterAll(async () => {
    // Clean up test-inserted rows
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  it('owner A can only read their own rows', async () => {
    const { data, error } = await clientA
      .from('table_name')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    data!.forEach(row => expect(row.owner_user_id).toBe(ownerAId))
  })
})
```

### Pattern 2: Tenant-Role RLS Testing (New)
**What:** Extends the dual-client pattern with tenant credentials to verify tenants cannot access other tenants' data.
**When to use:** TEST-09 tenant-role isolation tests.
**Implementation notes:**
- Requires tenant test credentials (E2E_TENANT_EMAIL, E2E_TENANT_PASSWORD, or second tenant pair)
- Existing `getTestCredentials()` returns only owner credentials -- needs extension
- Tenant-scoped tables: rent_payments, payment_methods, documents (tenant subset), notifications
- Key assertion: Tenant A cannot see Tenant B's rent_payments, notifications, etc.

### Pattern 3: Supabase Edge Function Testing (Official)
**What:** Deno test runner with integration-style tests that invoke Edge Functions via `supabase.functions.invoke()`.
**When to use:** All Edge Function tests (TEST-04).
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/functions/unit-test
import { assert, assertEquals } from 'jsr:@std/assert@1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import 'jsr:@std/dotenv/load'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''

Deno.test('function returns expected response', async () => {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  })
  const { data, error } = await client.functions.invoke('function-name', {
    body: { key: 'value' }
  })
  assertEquals(error, null)
  assert(data)
})
```

### Pattern 4: CI Workflow Structure
**What:** GitHub Actions parallel job execution.
**When to use:** ci-cd.yml modifications.
**Current state:** Single `checks` job with `pnpm lint & pnpm typecheck & wait` (background parallel).
**Target state:** Add `pnpm build` step after lint/typecheck (sequential, build requires type correctness). Add E2E smoke job on push-to-main only.

### Anti-Patterns to Avoid
- **Running coverage in CI when user decided local-only:** Coverage enforcement is in lefthook pre-commit, not CI.
- **Adding gitleaks to CI:** User explicitly decided pre-commit is the enforcement point.
- **Adding Edge Function tests to CI:** User decided local-only execution.
- **Using `--cache` in CI builds:** User decided clean builds every time for determinism.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret scanning | Custom regex patterns | gitleaks with default rules | 900+ built-in rules, actively maintained |
| Coverage enforcement | Custom coverage checker | Vitest `thresholds` in config | Already configured at 80% in vitest.config.ts |
| Git hook management | .git/hooks scripts | lefthook | Already used, team-shared, declarative |
| E2E auth setup | Custom login helpers per test | Playwright auth setup projects | Already configured with setup-owner/setup-tenant |

**Key insight:** The infrastructure already exists. This phase fills gaps and extends patterns, not builds new systems.

## Common Pitfalls

### Pitfall 1: Supabase Auth Rate Limiting in Tests
**What goes wrong:** RLS tests sign in via `signInWithPassword` -- Supabase rate-limits to ~30 requests/minute per IP.
**Why it happens:** Each test file creates 2 clients, and running many test files in parallel exhausts the rate limit.
**How to avoid:** RLS tests already use `pool: 'forks'` + `fileParallelism: false` (sequential execution). Keep this setting.
**Warning signs:** `429 Too Many Requests` errors in test output.

### Pitfall 2: next build Requires Environment Variables (RESOLVED)
**What goes wrong:** `next build` fails in CI because env vars (SUPABASE_URL, STRIPE keys) are not available.
**Why it happens:** `@t3-oss/env-nextjs` validates env vars at build time.
**How to avoid:** `src/env.ts` already supports `SKIP_ENV_VALIDATION=true` (line 149-151). Use `SKIP_ENV_VALIDATION=true` in the CI build step to bypass env validation. This is the cleanest approach since CI only needs to verify the build compiles, not that env vars are correct.
**Warning signs:** Build fails with "Missing required environment variable" errors.

### Pitfall 3: jsdom FileList Limitation
**What goes wrong:** The 2 skipped tests in `bulk-import-upload-step.test.tsx` fail because jsdom's `input.files` is read-only.
**Why it happens:** The `fireEvent.drop()` with `dataTransfer: { files: [file] }` doesn't properly set the FileList.
**How to avoid:** Use `userEvent.upload()` which works around this limitation, or restructure the component to test the callback directly. The comment in the test file explains: "jsdom cannot set input.files via assignment (read-only FileList)".
**Warning signs:** Tests pass with `it.skip` but fail when `.skip` is removed.

### Pitfall 4: E2E Smoke Tests Need Auth Credentials
**What goes wrong:** `critical-paths.smoke.spec.ts` requires `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD` env vars.
**Why it happens:** The smoke test performs real login via the UI.
**How to avoid:** Ensure CI secrets include E2E credentials, or restructure smoke tests to be auth-independent (test only public routes like homepage/pricing).
**Warning signs:** Smoke tests fail with undefined email/password.

### Pitfall 5: Deno Import Map for Edge Function Tests
**What goes wrong:** Edge Function tests fail to resolve imports like `../shared/cors.ts`.
**Why it happens:** Edge Functions use Deno import maps (`supabase/functions/deno.json`), but tests may not pick them up automatically.
**How to avoid:** Run tests with `--import-map` flag or ensure the test runner resolves the import map from `supabase/functions/deno.json`.
**Warning signs:** `Module not found` errors in Deno test output.

### Pitfall 6: checkJs Scope
**What goes wrong:** Enabling `checkJs: true` could introduce many errors across JS files.
**Why it happens:** JS files aren't type-checked by default.
**How to avoid:** Only 5 JS/CJS files in the project: `eslint.config.js`, `color-tokens.eslint.js`, `postcss.config.mjs`, `public/sw.js`, `rules/no-admin-client-bypass.cjs`. The tsconfig `include` covers `src/**/*.ts`, `scripts/**/*.ts`, `proxy.ts`, `next.config.ts` but has no `*.js` glob pattern. The 5 JS files are in root or `rules/` or `public/` -- none in `src/`. Since `checkJs` only applies to files matched by `include`, the impact should be minimal or zero. However, `allowJs: true` is already set (line 11), so if any included path resolves JS files, they would be checked. Verify with `pnpm typecheck` after enabling.
**Warning signs:** New type errors appearing in files that were previously ignored.

## Code Examples

### Gitleaks in lefthook.yml
```yaml
# Source: gitleaks docs + lefthook pattern
pre-commit:
  parallel: true
  commands:
    gitleaks:
      run: gitleaks protect --staged --redact --no-banner
    duplicate-types:
      run: ./scripts/check-duplicate-types.sh
    # ... other existing commands
```

### CI next build Step
```yaml
# Source: existing ci-cd.yml pattern + env.ts SKIP_ENV_VALIDATION
- name: Lint & Typecheck
  run: pnpm lint & pnpm typecheck & wait

- name: Build
  run: pnpm build
  env:
    SKIP_ENV_VALIDATION: 'true'
```

### RLS Test for rent_payments
```typescript
// Source: existing properties.rls.test.ts pattern
import { createTestClient, getTestCredentials } from '../setup/supabase-client'

describe('rent_payments RLS -- cross-owner isolation', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient

  beforeAll(async () => {
    const { ownerA, ownerB } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
    clientB = await createTestClient(ownerB.email, ownerB.password)
  })

  it('owner A can only read rent payments for their properties', async () => {
    // rent_payments RLS checks via lease -> property -> owner_user_id chain
    const { data, error } = await clientA
      .from('rent_payments')
      .select('id, tenant_id, lease_id')
    expect(error).toBeNull()
    // All returned payments should belong to leases owned by ownerA
  })
})
```

### Edge Function Test Pattern (Deno)
```typescript
// Source: https://supabase.com/docs/guides/functions/unit-test
import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import 'jsr:@std/dotenv/load'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''

const createTestSupabaseClient = () =>
  createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  })

Deno.test('tenant-invitation-accept: rejects missing auth header', async () => {
  const client = createTestSupabaseClient()
  const { data, error } = await client.functions.invoke('tenant-invitation-accept', {
    body: { code: 'test-code' },
    headers: {} // No Authorization header
  })
  assertEquals(error?.context?.status, 401)
})
```

### Playwright Config Fix
```typescript
// Before (stale monorepo reference):
command: `cd apps/frontend && rm -rf .next && ...`

// After (correct flat layout):
command: `rm -rf .next && rm -f .env.local && ...`
// cwd already points to project root via path.resolve(__dirname, '../..')
```

### TypeScript Strictness Fixes
```typescript
// noUnusedLocals / noUnusedParameters fix pattern:
// Before:
array.map((item, index) => item.name)  // 'index' is unused

// After:
array.map((item, _index) => item.name) // underscore prefix = intentionally unused

// Or simply:
array.map((item) => item.name)         // remove unused param entirely
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monorepo layout | Flat Next.js layout | 2026-03-03 | E2E configs still reference old paths |
| RLS tests on migration PRs only | RLS tests on every PR | Phase 9 decision | Catches policy drift regardless of change type |
| Tests + coverage in CI | Tests local, CI = lint+typecheck+build | Phase 9 decision | Faster CI, trust local hooks |
| No secret scanning | gitleaks pre-commit | Phase 9 | Prevents secrets from reaching repo |
| checkJs: false | checkJs: true | Phase 9 | Only 5 JS files, minimal scope |

**Deprecated/outdated:**
- `cd apps/frontend` in playwright.config.ts -- legacy monorepo path
- `pnpm --filter @repo/e2e-tests` in playwright.config.prod.ts -- legacy workspace filter
- `paths:` filter in rls-security-tests.yml -- being removed to run on all PRs

## Shared Validation & Utility Assessment (TEST-05/06)

### Validation Schemas Worth Testing (HIGH value)
| File | Lines | Usage Count | Recommendation |
|------|-------|-------------|----------------|
| `auth.ts` | 101 | 2 imports (login, signup) | Test loginZodSchema, registerZodSchema, signupFormSchema -- used in auth flows |
| `lease-wizard.schemas.ts` | 438 | 8 imports | Already has test coverage via wizard component tests -- skip |
| `properties.ts` | 233 | 2 imports | Test propertyFormSchema -- used in property creation |
| `tenants.ts` | 285 | 4 imports | Test inviteTenantRequest, tenantUpdateSchema -- used in tenant CRUD |
| `maintenance.ts` | 268 | 2 imports | Test maintenance form schema -- used in maintenance CRUD |
| `common.ts` | 274 | 1 import (isValidUrl in security.ts) | Test isValidUrl, emailSchema -- security-critical |

### Validation Schemas Lower Priority (test if time)
| File | Lines | Usage Count | Recommendation |
|------|-------|-------------|----------------|
| `contact.ts` | 43 | 0 direct imports (referenced in auth.ts comment) | Low priority -- simple schema |
| `inspections.ts` | 97 | 2 imports | Medium -- used in inspections |
| `leases.ts` | 286 | 1 import (type only) | Low -- mostly types, not schemas |
| `units.ts` | 165 | 1 import | Low priority |

### Utility Functions (TEST-06)
| File | Lines | Usage Count | Recommendation |
|------|-------|-------------|----------------|
| `currency.ts` | 287 | 1 import (via formatters/currency.ts) | HIGH: Core financial display logic, 10+ exported functions |
| `api-error.ts` | 194 | 2 imports | HIGH: Error classification used throughout app |
| `optimistic-locking.ts` | 117 | 2 imports | MEDIUM: Used in unit/tenant mutations |

### Recommendation
- **Write tests for:** auth.ts schemas, common.ts (isValidUrl, emailSchema), currency.ts (all formatters), api-error.ts (ApiError class, createApiErrorFromResponse)
- **Skip tests for:** lease-wizard.schemas.ts (already tested via component tests), contact.ts (trivial), units.ts (low usage)
- **Investigate for dead code:** authResponseZodSchema, userProfileResponseZodSchema in auth.ts (may not be used anywhere in frontend)

## E2E Test Audit (57 files to ~15-20)

### Current E2E Files (57 total)
Categorized by likely keep/remove:

**Keep (critical user journeys):**
1. `smoke/critical-paths.smoke.spec.ts` -- core smoke test
2. `smoke/minimal.smoke.spec.ts` -- auth validation
3. `owner/owner-authentication.e2e.spec.ts` -- login/logout
4. `owner/owner-dashboard.e2e.spec.ts` -- primary landing page
5. `owner/owner-properties.e2e.spec.ts` -- core CRUD
6. `owner/owner-leases.e2e.spec.ts` -- core CRUD
7. `owner/owner-tenants.e2e.spec.ts` -- core CRUD
8. `owner/owner-maintenance.e2e.spec.ts` -- core CRUD
9. `owner/owner-navigation.e2e.spec.ts` -- navigation works
10. `tenant/tenant-authentication.e2e.spec.ts` -- tenant login
11. `tenant/tenant-dashboard.e2e.spec.ts` -- tenant home
12. `tenant/tenant-payments.e2e.spec.ts` -- rent payment flow
13. `tenant/tenant-maintenance.e2e.spec.ts` -- maintenance requests
14. `homepage.spec.ts` -- public landing page
15. `health-check.spec.ts` -- API health

**Likely remove/archive (broken, redundant, or low value):**
- `auth-guard-error-messages.spec.ts` -- may duplicate owner-auth
- `auth-jwt-validation.spec.ts` -- low-level auth testing better in unit
- `auth-nextjs16-complete-flow.spec.ts` -- duplicate of auth tests
- `auth-nextjs16-dal.spec.ts` -- implementation detail
- `auth-nextjs16-middleware.spec.ts` -- middleware tested in unit
- `dashboard-comprehensive-validation.spec.ts` -- duplicates owner-dashboard
- `full-application-diagnostic.spec.ts` -- overly broad
- `examples/auth-fixture-example.spec.ts` -- example file, not real test
- `integration/react-query-production.spec.ts` -- implementation detail
- `performance.spec.ts` -- lighthouse better run separately
- `pricing-premium.spec.ts` -- low priority
- `properties-header-visual.spec.ts` -- visual regression
- `properties/bulk-import.spec.ts` -- complex setup, fragile
- `properties/property-image-upload.spec.ts` -- file upload fragile
- `property-csv-template.spec.ts` -- low value
- `route-verification.spec.ts` -- covered by navigation tests
- `seed.spec.ts` -- dev utility, not real test
- `staging/tenant-portal.staging.spec.ts` -- staging-specific
- `production/health.prod.spec.ts` -- prod monitoring, separate
- `production/monitoring.prod.spec.ts` -- prod monitoring, separate
- `stripe-disputes-fraud.e2e.spec.ts` -- requires Stripe test mode
- `stripe-payment-flow.e2e.spec.ts` -- requires Stripe test mode
- `tanstack-query/cache-behavior.spec.ts` -- implementation detail
- `tanstack-query/error-handling.spec.ts` -- unit test material
- `tanstack-query/real-user-workflows.spec.ts` -- may duplicate others
- `tenant-invitation/tenant-invitation-flow.e2e.spec.ts` -- complex setup
- `tenant-management/*.spec.ts` (3 files) -- duplicates tenant CRUD tests
- `tenant/tenant-documents.e2e.spec.ts` -- low priority
- `tenant/tenant-lease.e2e.spec.ts` -- may duplicate tenant-dashboard
- `tenant/tenant-navigation.e2e.spec.ts` -- low value
- `tenant/tenant-profile.e2e.spec.ts` -- low priority
- `tenant/tenant-settings.e2e.spec.ts` -- low priority

**Final audit should be done during implementation** -- each file needs a quick review to confirm keep/remove decision.

## Bulk Import Upload Step Skipped Tests (TEST-15)

### Root Cause
The 2 skipped tests at lines 129 and 147 of `bulk-import-upload-step.test.tsx` are skipped because:
- jsdom's `FileList` is read-only -- `fireEvent.drop()` with `dataTransfer: { files: [file] }` does not properly set files on the input element
- The component uses react-dropzone which reads `event.dataTransfer.files`

### Fix Options
1. **Use `userEvent.upload()`:** Works around FileList limitation. The non-skipped test at line 73 already uses `userEvent.upload()` successfully.
2. **Mock react-dropzone's onDrop callback:** Test the handler directly instead of simulating DOM events.
3. **Create a DataTransfer polyfill:** Override DataTransfer constructor in test setup.

**Recommendation:** Option 1 or 2. The existing test at line 73 proves `userEvent.upload()` works. Restructure the drop tests to use the same pattern or test the file validation logic directly.

## TEST-18 Status: Already Complete

TEST-18 requires moving RLS tests from pre-commit to pre-push. Per the accumulated decisions in STATE.md: "Phase 06: Moved rls-tests from pre-commit to pre-push (Supabase auth rate limiting prevention)". The current `lefthook.yml` confirms: RLS tests are in `pre-push`, not `pre-commit`. **TEST-18 is already satisfied.**

## env.ts Build-Time Validation (RESOLVED)

The `src/env.ts` file (line 149-151) already supports `SKIP_ENV_VALIDATION=true`:

```typescript
skipValidation:
  process.env.SKIP_ENV_VALIDATION === 'true' ||
  process.env.npm_lifecycle_event === 'lint',
```

**For CI `next build` (TEST-01):** Use `SKIP_ENV_VALIDATION=true` as an env var in the build step. This is the cleanest approach -- CI validates the build compiles, not env var correctness. No need for placeholder env vars.

**Required server env vars** (would need placeholders if NOT using SKIP_ENV_VALIDATION):
- `STRIPE_SECRET_KEY` (must start with `sk_`)
- 6 Stripe price IDs (must start with `price_`)

**Required client env vars:**
- `NEXT_PUBLIC_APP_URL` (must be valid URL)
- `NEXT_PUBLIC_SUPABASE_URL` (must contain supabase.co/localhost)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (must start with `pk_`)

Using `SKIP_ENV_VALIDATION=true` avoids all of these requirements.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + Playwright 1.58.2 + Deno test |
| Config file | `vitest.config.ts`, `tests/e2e/playwright.config.ts` |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test:unit && pnpm test:integration` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | CI runs next build | manual verify | `pnpm build` | N/A (CI config) |
| TEST-02 | Coverage threshold enforced | unit | `pnpm test:unit -- --coverage` | vitest.config.ts thresholds exist |
| TEST-03 | E2E config path fixed | manual verify | `npx playwright test --config tests/e2e/playwright.config.ts` | exists, needs fix |
| TEST-04 | Edge Function tests | deno test | `deno test --allow-all supabase/functions/tests/` | Wave 0 |
| TEST-05 | Shared validation tests | unit | `pnpm test:unit -- --run src/shared/validation/__tests__/` | Wave 0 |
| TEST-06 | Shared utility tests | unit | `pnpm test:unit -- --run src/shared/utils/__tests__/` | Wave 0 |
| TEST-07 | RLS rent_payments/payment_methods | integration | `pnpm test:integration` | Wave 0 |
| TEST-08 | RLS documents/notifications/etc | integration | `pnpm test:integration` | Wave 0 |
| TEST-09 | Tenant-role isolation | integration | `pnpm test:integration` | Wave 0 |
| TEST-10 | gitleaks in pre-commit | manual verify | `gitleaks protect --staged --redact --no-banner` | N/A (config) |
| TEST-11 | RLS on every PR | manual verify | Check rls-security-tests.yml | N/A (CI config) |
| TEST-12 | E2E smoke in CI | manual verify | Check ci-cd.yml | N/A (CI config) |
| TEST-13 | API route test | unit | `pnpm test:unit -- --run src/app/api/` | Wave 0 |
| TEST-14 | Supabase client tests | unit | `pnpm test:unit -- --run src/lib/supabase/` | Wave 0 |
| TEST-15 | Skipped tests resolved | unit | `pnpm test:unit -- --run src/components/properties/__tests__/bulk-import-upload-step.test.tsx` | exists, has skips |
| TEST-16 | noUnusedLocals/Parameters | typecheck | `pnpm typecheck` | N/A (tsconfig) |
| TEST-17 | isolatedModules: true | typecheck | `pnpm typecheck` | N/A (tsconfig) |
| TEST-18 | RLS not in pre-commit | N/A | Already done | Already satisfied |
| TEST-19 | checkJs: true | typecheck | `pnpm typecheck` | N/A (tsconfig) |
| TEST-20 | Stale refs removed | manual verify | review configs | exists, needs fix |
| TEST-21 | .env.test template | N/A | file existence check | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm test:unit`
- **Per wave merge:** `pnpm typecheck && pnpm test:unit && pnpm test:integration`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `supabase/functions/tests/` directory + 4 test files -- Edge Function tests
- [ ] `src/shared/validation/__tests__/` directory + test files -- validation schema tests
- [ ] `src/shared/utils/__tests__/` directory + test files -- utility function tests
- [ ] `tests/integration/rls/rent-payments.rls.test.ts` -- new RLS test
- [ ] `tests/integration/rls/payment-methods.rls.test.ts` -- new RLS test
- [ ] `tests/integration/rls/notifications.rls.test.ts` -- new RLS test
- [ ] `tests/integration/rls/notification-settings.rls.test.ts` -- new RLS test
- [ ] `tests/integration/rls/subscriptions.rls.test.ts` -- new RLS test
- [ ] `tests/integration/rls/tenant-invitations.rls.test.ts` -- new RLS test
- [ ] `tests/integration/rls/tenant-isolation.rls.test.ts` -- tenant-role tests
- [ ] `src/app/api/stripe/__tests__/` directory -- API route test
- [ ] `src/lib/supabase/__tests__/get-cached-user.test.ts` -- client utility test
- [ ] `.env.test` template -- E2E test configuration template

## Open Questions

1. **Tenant test credentials for TEST-09**
   - What we know: Current setup has ownerA/ownerB credentials for RLS tests. The E2E Playwright config has setup-tenant project that authenticates a tenant user.
   - What's unclear: Are there dedicated tenant test credentials as env vars (E2E_TENANT_EMAIL/PASSWORD)? Need at least one, ideally two tenant users for cross-tenant isolation testing.
   - Recommendation: Check existing E2E auth setup files for tenant credential patterns. If no tenant test vars exist, extend `getTestCredentials()` and add E2E_TENANT_EMAIL/PASSWORD to .env.example and GitHub secrets.

2. **Coverage enforcement in lefthook**
   - What we know: vitest.config.ts has 80% thresholds configured; lefthook runs `CI=true pnpm test:unit`
   - What's unclear: Whether `pnpm test:unit` (without `--coverage` flag) actually enforces thresholds
   - Recommendation: Vitest only enforces coverage thresholds when `--coverage` is passed. To enforce in pre-commit, change to `CI=true pnpm test:unit --coverage` in lefthook.yml. This adds ~10-15 seconds to pre-commit. Given user decided coverage enforcement is local-only (not CI), this tradeoff is worth making.

## Sources

### Primary (HIGH confidence)
- Existing project files: vitest.config.ts, lefthook.yml, ci-cd.yml, rls-security-tests.yml, tsconfig.json, playwright configs, src/env.ts
- Existing test files: 14 RLS test files, 80+ unit test files, 57 E2E test files
- [Supabase Edge Function Testing Docs](https://supabase.com/docs/guides/functions/unit-test) -- official test structure and runner

### Secondary (MEDIUM confidence)
- [gitleaks GitHub repository](https://github.com/gitleaks/gitleaks) -- `gitleaks protect --staged` command
- [Supabase testing and linting docs](https://supabase.com/docs/guides/local-development/cli/testing-and-linting) -- Deno test integration

### Tertiary (LOW confidence)
- E2E file keep/remove recommendations -- requires individual file review during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools already installed and configured in the project
- Architecture: HIGH - extending well-established existing patterns (RLS dual-client, Vitest projects, lefthook)
- Pitfalls: HIGH - identified from direct code inspection (env validation, jsdom FileList, auth rate limiting)
- Edge Function testing: HIGH - verified against official Supabase docs
- E2E audit: MEDIUM - keep/remove recommendations need per-file review during implementation

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable infrastructure, no fast-moving dependencies)
