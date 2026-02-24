# Post-Migration Hardening Pitfalls: Supabase PostgREST + Deno Edge Functions

**Context:** TenantFlow migrated from NestJS → Supabase PostgREST direct + Deno Edge Functions (v7.0). Now hardening 108 security and quality findings (v8.0).

**Scope:** Common failure modes when adding security fixes to an existing PostgREST/Edge Function system, with prevention strategies and test patterns.

---

## 1. IDOR in Edge Functions — Ownership Check Timing

### The Problem

Edge Functions using `SUPABASE_SERVICE_ROLE_KEY` bypass RLS entirely. Adding ownership checks *after* the fact is error-prone because:

- **Silent failures:** Service role operations don't hit RLS policies, so tests pass but production fails
- **Authorization leakage:** Missing ownership checks in one code path leaves a gap
- **Race conditions:** Checking ownership in a separate query, then operating on old data
- **Inconsistent patterns:** Different functions implement ownership checks differently

### Warning Signs

```typescript
// ❌ PATTERN: Service role read + hardcoded ownership assumption
const supabase = createClient(url, SUPABASE_SERVICE_ROLE_KEY)
const { data: lease } = await supabase
  .from('leases')
  .select('id, owner_user_id')
  .eq('id', leaseId)
  .single()

// Assumes owner_user_id exists. If not present in SELECT, crashes silently
if (lease.owner_user_id !== userId) {
  throw new Error('Unauthorized')  // Occurs AFTER mutation is queued
}

// Mutation happens AFTER check — data race if owner_user_id is tampered
await supabase.from('leases').update({ lease_status: 'active' }).eq('id', leaseId)
```

### Prevention Strategy

**Pattern 1: Ownership Check + Atomic Update**
```typescript
// ✅ CORRECT: Combined check + update in single RPC
const { data, error } = await supabase.rpc('activate_lease_if_owner', {
  p_lease_id: leaseId,
  p_owner_user_id: userId
})

if (error) {
  if (error.message.includes('ownership')) {
    throw new ForbiddenException('Not your lease')
  }
  throw error
}
```

**Pattern 2: Service Role Read + RLS Update**
```typescript
// ✅ CORRECT: Service role read, RLS-enforced update
const adminClient = createClient(url, SUPABASE_SERVICE_ROLE_KEY)
const userClient = createClient(url, token)  // Has RLS enforced

const { data: lease } = await adminClient.from('leases').select('id').single()
if (!lease) throw new NotFoundError()

// Update via user client — RLS enforces ownership
const { error } = await userClient.from('leases').update({ status: 'active' }).eq('id', leaseId)
if (error) throw new ForbiddenException('Not authorized')
```

**Pattern 3: Explicit Ownership Field in SELECT**
```typescript
// ✅ CORRECT: Always include owner field, assert before mutations
const { data: lease } = await serviceRoleClient
  .from('leases')
  .select('id, owner_user_id, lease_status')
  .eq('id', leaseId)
  .single()

if (!lease) throw new NotFoundError()
if (lease.owner_user_id !== userId) throw new ForbiddenException()
// Now safe to mutate — ownership verified
```

### Test Pattern for RLS Write Isolation

Run on **dedicated integration project** (separate Supabase instance) with fresh test data:

```typescript
describe('DocuSeal Edge Function IDOR', () => {
  it('should reject signature update from non-owner', async () => {
    // Setup: Create 2 owners, 1 lease for owner A
    const ownerA = await createTestUser()
    const ownerB = await createTestUser()
    const leaseForA = await createTestLease(ownerA.id)

    // Attack: Try to sign lease as owner B via Edge Function
    const response = await fetch(DOCUSEAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'x-docuseal-signature': WEBHOOK_SECRET },
      body: JSON.stringify({
        event_type: 'form.completed',
        submission_id: leaseForA.docuseal_submission_id,
        role: 'owner',
        completed_at: new Date().toISOString()
      })
    })

    expect(response.status).toBe(200)  // Webhook always returns 200 (idempotent)

    // Verify: Check lease was NOT modified
    const { data: lease } = await supabaseAdmin
      .from('leases')
      .select('owner_signed_at')
      .eq('id', leaseForA.id)
      .single()

    // Ownership check should have silently rejected — no signature recorded
    expect(lease.owner_signed_at).toBeNull()
  })
})
```

### Phase Recommendation

**Phase 01 (Critical Security):** Add ownership checks to Edge Functions *before* moving any feature to production. Defer full RLS test coverage to Phase 02 if needed, but ownership checks are mandatory.

### Files to Update (v8.0)

1. `supabase/functions/docuseal-webhook/index.ts` — Check `lease.owner_user_id` before updating signature fields
2. `supabase/functions/generate-pdf/index.ts` — Verify user owns the lease/report before PDF generation
3. `supabase/functions/stripe-connect/index.ts` — Verify user owns the Stripe account before mutations

---

## 2. PostgREST `.or()` Filter Injection

### The Problem

PostgREST's `.or(string)` method parses operators inline. Unsanitized user input can inject PostgreSQL operators:

```typescript
const search = req.query.search  // User input: "name,city.like.%admin%"

// ❌ VULNERABLE: Direct interpolation
q = q.or(`name.ilike.%${search}%,city.ilike.%${search}%`)
// Becomes: or=name.ilike.%name,city.like.%admin%,city.ilike.%...%
// Attacker controls the operators — could bypass filters
```

### Warning Signs

- User input used directly in `.or()` argument without encoding
- Multiple `.or()` calls without validation
- Search filters accepting special characters `.,*,`
- No unit tests for filter edge cases

### Prevention Strategy

**Pattern 1: Supabase-Recommended Encoding**
```typescript
// ✅ CORRECT: Escape all special characters in user input
const sanitizeSearchInput = (input: string): string => {
  // PostgREST uses these as operators: . , * % ~
  // Escaping ensures user input is treated as literal strings
  return input
    .replace(/\./g, '\\.')   // Period → literal dot
    .replace(/,/g, '\\,')    // Comma → literal comma
    .replace(/\*/g, '\\*')   // Asterisk → literal asterisk
}

const search = req.query.search
const safe = sanitizeSearchInput(search)
q = q.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
```

**Pattern 2: Array-Based Construction (Safest)**
```typescript
// ✅ CORRECT: Build filter array, PostgREST handles escaping
const search = req.query.search

let q = supabase.from('properties').select('*')

// OR by building separate conditions
if (search) {
  q = q.or(`name.ilike.%${encodeURIComponent(search)}%,city.ilike.%${encodeURIComponent(search)}%`)
}
```

**Pattern 3: RPC Instead of PostgREST Filter**
```typescript
// ✅ CORRECT: Push filtering to RPC, SQL parameterization handles escaping
const { data } = await supabase.rpc('search_properties', {
  p_search_term: search,  // SQL parameter — impossible to inject
  p_user_id: userId
})
```

### Test Pattern

```typescript
describe('Property search injection', () => {
  const injectionPayloads = [
    "name.like.%",          // PostgREST operator
    "name,city",            // Comma separator
    "name.ilike.test,city.eq.true",  // Multiple operators
    "name.ov.{1,2,3}",      // Array overlap
    "name.cs.%27",          // SQL comment (URL-encoded)
  ]

  injectionPayloads.forEach(payload => {
    it(`should treat "${payload}" as literal search text`, async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .or(`name.ilike.%${encodeFilterValue(payload)}%`)

      // Should not parse operators, just literal search
      expect(error).toBeNull()
      expect(data?.length).toBe(0)  // No matches because payload is literal
    })
  })
})
```

### Phase Recommendation

**Phase 02 (Database Stability):** Audit all 4 `.or()` calls in frontend (property-keys.ts, tenant-keys.ts). Implement sanitization function and add injection tests.

### Files to Audit (v8.0)

1. `apps/frontend/src/hooks/api/query-keys/property-keys.ts` (line 95-96)
2. `apps/frontend/src/hooks/api/query-keys/tenant-keys.ts` — Check for similar pattern
3. Any custom API hooks using `.or()` directly

---

## 3. RLS Write-Path Isolation Tests — Silent Failures

### The Problem

INSERT/UPDATE/DELETE policies have two parts: `USING` (row visibility) and `WITH CHECK` (mutation allowability). Tests can pass while policies are broken because:

- **Duplicate key constraint mask RLS failures:** INSERT with duplicate key returns 409, not 403 (authorization)
- **Cached query plans:** PostgreSQL caches policy checks; repeated tests see stale plans
- **Mock interception:** Tests with API mocking don't hit RLS at all
- **No negative tests:** Only testing happy path (authorized access) misses denial cases

### Warning Signs

- Unit tests mock PostgREST responses (never actually test RLS)
- E2E tests don't verify 403 Forbidden for cross-user mutations
- RLS tests run against shared Supabase project (policies cached across tests)
- `WITH CHECK` clauses not separately tested from `USING`
- Tests that INSERT duplicates pass even if RLS is broken

### Prevention Strategy

**Pattern 1: Dedicated Integration Project**

Create separate Supabase project for RLS testing. Start fresh for each test suite:

```bash
# Create test project (one-time)
supabase projects create --name "tenant-flow-rls-testing"

# Environment variable for test
export SUPABASE_RLS_TEST_PROJECT_ID="test-xyz123"
```

**Pattern 2: Explicit Negative Tests (Test Denial, Not Just Access)**

```typescript
describe('Leases RLS Isolation', () => {
  let ownerA: AuthUser
  let ownerB: AuthUser
  let leaseForA: Lease

  beforeEach(async () => {
    // Create fresh test data
    ownerA = await createTestUser()
    ownerB = await createTestUser()
    leaseForA = await createLeaseAs(ownerA)
  })

  describe('SELECT isolation', () => {
    it('should allow owner to read own lease', async () => {
      const client = createClientAs(ownerA)
      const { data, error } = await client
        .from('leases')
        .select('*')
        .eq('id', leaseForA.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('should deny other owner from reading lease', async () => {
      const client = createClientAs(ownerB)
      const { data, error } = await client
        .from('leases')
        .select('*')
        .eq('id', leaseForA.id)

      expect(error).toBeNull()  // Query succeeds (no error)
      expect(data).toHaveLength(0)  // But returns 0 rows (RLS hid it)
    })
  })

  describe('UPDATE isolation — USING clause', () => {
    it('should prevent other owner from updating lease status', async () => {
      const client = createClientAs(ownerB)
      const { error } = await client
        .from('leases')
        .update({ lease_status: 'active' })
        .eq('id', leaseForA.id)

      // RLS USING clause blocks the row — update returns 0 affected
      expect(error).toBeNull()
      // Verify lease not actually updated
      const { data: lease } = await createAdminClient()
        .from('leases')
        .select('lease_status')
        .eq('id', leaseForA.id)
        .single()
      expect(lease.lease_status).toBe('pending')  // Unchanged
    })
  })

  describe('UPDATE isolation — WITH CHECK clause', () => {
    it('should prevent owner from changing owner_user_id on update', async () => {
      const client = createClientAs(ownerA)
      const { error } = await client
        .from('leases')
        .update({ owner_user_id: ownerB.id })  // Try to steal lease
        .eq('id', leaseForA.id)

      // WITH CHECK blocks because new owner_user_id !== auth.uid()
      expect(error).toBeNull()  // Query completes
      // Verify lease owner unchanged
      const { data: lease } = await createAdminClient()
        .from('leases')
        .select('owner_user_id')
        .eq('id', leaseForA.id)
        .single()
      expect(lease.owner_user_id).toBe(ownerA.id)
    })
  })

  describe('INSERT isolation', () => {
    it('should allow owner to create lease for self', async () => {
      const client = createClientAs(ownerA)
      const { data, error } = await client
        .from('leases')
        .insert({
          id: randomUUID(),
          owner_user_id: ownerA.id,
          primary_unit_id: leaseForA.primary_unit_id,
          primary_tenant_id: leaseForA.primary_tenant_id,
          lease_status: 'pending'
        })

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('should prevent owner from creating lease with other owner as owner_user_id', async () => {
      const client = createClientAs(ownerA)
      const { error } = await client
        .from('leases')
        .insert({
          id: randomUUID(),
          owner_user_id: ownerB.id,  // Try to create as ownerB
          primary_unit_id: leaseForA.primary_unit_id,
          primary_tenant_id: leaseForA.primary_tenant_id,
          lease_status: 'pending'
        })

      // WITH CHECK blocks because owner_user_id !== auth.uid()
      expect(error).not.toBeNull()
      expect(error?.code).toBe('PGRST301')  // Permission denied
    })
  })

  describe('DELETE isolation', () => {
    it('should allow owner to delete own lease', async () => {
      const client = createClientAs(ownerA)
      const { error } = await client
        .from('leases')
        .delete()
        .eq('id', leaseForA.id)

      expect(error).toBeNull()
    })

    it('should prevent other owner from deleting lease', async () => {
      const client = createClientAs(ownerB)
      const { error } = await client
        .from('leases')
        .delete()
        .eq('id', leaseForA.id)

      expect(error).toBeNull()  // Query completes (no error)
      // Verify lease still exists
      const { data } = await createAdminClient()
        .from('leases')
        .select('id')
        .eq('id', leaseForA.id)
      expect(data).toHaveLength(1)  // Lease was NOT deleted
    })
  })
})
```

**Pattern 3: Clear Test Error Messages**

```typescript
// ❌ BAD: Assertion message doesn't explain RLS expectation
expect(data.length).toBe(0)

// ✅ GOOD: Clear why zero rows is correct
expect(data.length).toBe(0) // RLS USING clause hides rows from unauthorized users
```

### Phase Recommendation

**Phase 02 (Database Stability):** Set up dedicated RLS integration project. Write isolation tests for 7 domains (properties, units, leases, tenants, maintenance, payments, inspections). Gate PR merges on RLS test results.

### Files to Create (v8.0)

1. `apps/backend/test/integration/rls/[domain].rls-isolation.spec.ts` for each domain
2. `apps/backend/test/fixtures/rls-test-helpers.ts` — Auth helpers, data builders
3. `apps/backend/.env.test.rls-project` — Separate Supabase project credentials

---

## 4. Caching Auth After Migration — Race Conditions

### The Problem

Moving from `getUser()` per-query to cached auth introduces subtle races:

```typescript
// ❌ WRONG: Cache across multiple independent operations
const { data: { user } } = await supabase.auth.getUser()
const client = createClient(url, token)  // Reuse across mutations

// If user logs out/token expires mid-operation, mutation succeeds with stale auth
await client.from('properties').insert({ owner_user_id: user.id })
await client.from('properties').insert({ owner_user_id: user.id })  // Auth could be invalid
```

### Warning Signs

- Auth cached at function level, reused across multiple queries
- No expiration on cached auth (relies on manual invalidation)
- Same client used for sequential operations
- No error handling for auth state changes between operations

### Prevention Strategy

**Pattern 1: Fresh Auth Per Mutation**
```typescript
// ✅ CORRECT: Get fresh auth before each mutation
async function createProperty(data: PropertyInput) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new UnauthorizedException()

  const { data: property, error } = await supabase
    .from('properties')
    .insert({ ...data, owner_user_id: user.id })

  return property
}
```

**Pattern 2: Auth with TTL Cache**
```typescript
// ✅ CORRECT: Cache with expiration
class AuthCache {
  private cache: { user: AuthUser, exp: number } | null = null
  private ttl = 5 * 60 * 1000  // 5 minutes

  async getUser(): Promise<AuthUser> {
    const now = Date.now()
    if (this.cache && this.cache.exp > now) {
      return this.cache.user
    }

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new UnauthorizedException()

    this.cache = { user, exp: now + this.ttl }
    return user
  }

  clear() {
    this.cache = null
  }
}
```

**Pattern 3: Error Recovery in Edge Functions**
```typescript
// ✅ CORRECT: Catch stale auth errors and retry
async function callDatabaseWithFreshAuth() {
  try {
    return await supabase.from('leases').insert(data)
  } catch (error) {
    if (error.code === 'PGRST301' || error.message.includes('JWT')) {
      // Auth is stale, get fresh token and retry once
      const newToken = await refreshAuthToken()
      const freshClient = createClient(url, newToken)
      return await freshClient.from('leases').insert(data)
    }
    throw error
  }
}
```

### Test Pattern

```typescript
describe('Cached Auth Race Condition', () => {
  it('should use fresh auth for each mutation in series', async () => {
    const userId = testUser.id

    // Mock auth expiry after 1st query
    let callCount = 0
    mockSupabaseAuth({
      getUser: async () => {
        callCount++
        if (callCount > 1) {
          return { error: new Error('Token expired') }
        }
        return { data: { user: { id: userId } } }
      }
    })

    // First mutation succeeds
    const prop1 = await createProperty({ name: 'Prop 1', owner_user_id: userId })
    expect(prop1).toBeDefined()

    // Second mutation should get fresh auth (not use cached token)
    // If cached, would fail with PGRST301
    const prop2 = await createProperty({ name: 'Prop 2', owner_user_id: userId })
    expect(prop2).toBeDefined()  // Succeeds because fresh auth obtained
  })
})
```

### Phase Recommendation

**Phase 04 (Code Quality):** Profile getUser() calls. Cache strategically in request lifecycle, not globally. Add auth expiration handling to Edge Functions.

---

## 5. Pinning Deno Edge Function Dependencies

### The Problem

Unpinned imports in Deno Edge Functions can break when upstream modules update:

```typescript
// ❌ WRONG: Unpinned imports drift versions
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
// Today: v2.39.1
// Tomorrow: v2.40.0 with breaking API change
// Function cold-starts randomly get different versions
```

**Cold start behavior:**
- Function not called for hours → cache expires
- Next call pulls latest from esm.sh
- Might be a breaking version upgrade
- Function crashes in production, only on cold starts

### Warning Signs

- Import URLs without version pinning (`@supabase/supabase-js` instead of `@supabase/supabase-js@2.39.1`)
- esm.sh used without commit hash pinning
- Different Edge Functions using different versions of same library
- Inconsistent npm version specs (one uses `^`, another unpinned)

### Prevention Strategy

**Pattern 1: Version-Pinned Imports**
```typescript
// ✅ CORRECT: Explicit versions in import URL
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1'
import Stripe from 'https://esm.sh/stripe@14.0.0'

// All imports pinned — reproducible cold starts
```

**Pattern 2: Import Map (deno.json)**
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.1",
    "stripe": "npm:stripe@14.0.0",
    "#types/": "https://esm.sh/@supabase/supabase-js@2.39.1/dist/module"
  }
}
```

```typescript
// ✅ CORRECT: Uses pinned version from import map
import { createClient } from '@supabase/supabase-js'
```

**Pattern 3: npm: Scheme with Lockfile**
```typescript
// ✅ CORRECT: npm: scheme with deno.lock for reproducibility
import Stripe from 'npm:stripe@14'
```

Deno.lock captures exact versions:
```json
{
  "npm": {
    "stripe@14": "stripe@14.0.0"
  }
}
```

### Test Pattern

```bash
# Verify all imports are pinned
grep -r "https://esm.sh" supabase/functions/ | grep -v "@.*@" | \
  grep -v "// pinned"

# Should return 0 matches
```

### Phase Recommendation

**Phase 05 (DevOps):** Create deno.json with pinned import map. Add pre-commit check: `grep -r "esm.sh.*[^@]\"" supabase/functions/` must return 0. Update CLAUDE.md with dependency pinning guidelines.

---

## 6. Stripe SDK Major Version Upgrade — Event Payload Shape Changes

### The Problem

Stripe SDK v14 → v15 changes webhook event payload shapes:

```typescript
// v14: event.data.object is flat
const charge = event.data.object as Stripe.Charge
console.log(charge.customer)  // String ID

// v15: Some fields become nested objects
// charge.customer might be Customer object instead of string
if (typeof event.data.object.customer === 'string') {
  const customerId = event.data.object.customer
} else {
  const customerId = event.data.object.customer?.id  // v15 shape
}
```

**Silent failures:**
- Code assumes flat structure, gets object
- Crashes when accessing properties on undefined
- Logs don't surface the shape change
- Only fails on specific event types

### Warning Signs

- Stripe SDK version bump with no code changes
- Webhook processing crashes on random event types
- Type assertions (`as Stripe.Charge`) without shape validation
- No version compatibility matrix in code

### Prevention Strategy

**Pattern 1: Shape Validation Before Processing**
```typescript
// ✅ CORRECT: Validate shape before assuming structure
async function processStripeEvent(event: Stripe.Event) {
  const charge = event.data.object
  
  // Type guard validates shape
  if (!isValidCharge(charge)) {
    console.error(`Unexpected charge shape for SDK version`, charge)
    throw new Error('Invalid event payload shape')
  }

  const customerId = charge.customer  // Safe now
}

function isValidCharge(obj: unknown): obj is Stripe.Charge {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'customer' in obj &&
    (typeof obj.customer === 'string' || obj.customer === null)
  )
}
```

**Pattern 2: SDK Version Pinning + CHANGELOG Review**
```typescript
// stripe@14.0.0 pinned in deno.json
// CHANGELOG review required before upgrade
// Breaking changes documented in commit message
```

**Pattern 3: Event-Type-Specific Handlers**
```typescript
// ✅ CORRECT: Each event type has explicit schema
const eventHandlers: Record<string, (data: any) => Promise<void>> = {
  'charge.created': async (charge) => {
    if (typeof charge.customer !== 'string') {
      throw new Error(`Unexpected customer shape in v${STRIPE_SDK_VERSION}`)
    }
    // Process charge
  },
  'customer.created': async (customer) => {
    // Different shape validation
  }
}
```

### Test Pattern

```typescript
describe('Stripe webhook payload compatibility', () => {
  it('should handle charge with string customer ID (v14 shape)', async () => {
    const event = {
      type: 'charge.created',
      data: {
        object: {
          id: 'ch_123',
          customer: 'cus_456'  // String, not object
        }
      }
    }

    const result = await processEvent(event)
    expect(result.customerId).toBe('cus_456')
  })

  it('should handle charge with customer object (v15 shape)', async () => {
    const event = {
      type: 'charge.created',
      data: {
        object: {
          id: 'ch_123',
          customer: { id: 'cus_456' }  // Object, not string
        }
      }
    }

    const result = await processEvent(event)
    expect(result.customerId).toBe('cus_456')
  })
})
```

### Phase Recommendation

**Phase 06 (Stripe Controller Split):** Document Stripe SDK version compatibility in code. Add event payload shape validation. Create CHANGELOG review checklist for version upgrades.

---

## 7. E2E Tests After NestJS Removal — Mock Interception Patterns

### The Problem

NestJS backend was a proxy. Tests mocked API responses. After removing NestJS, tests now hit PostgREST directly, but old mock patterns remain:

```typescript
// ❌ OLD PATTERN: Mock NestJS endpoint
server.use(
  http.get('/api/v1/properties', () => {
    return HttpResponse.json([{ id: '1', name: 'Prop' }])
  })
)

// Test passes, thinks it's testing real behavior
const { data } = await fetch('/api/v1/properties')
expect(data).toHaveLength(1)

// But in production: PostgREST returns RLS-filtered rows
// Test never actually called PostgREST — mock hid bugs
```

### Warning Signs

- E2E tests mock `/api/v1/*` endpoints (old NestJS routes)
- Mock responses don't include RLS filtering logic
- Tests pass locally but fail in production
- No actual database seeding for E2E — all mocked
- Different mocks in different test files (inconsistent shapes)

### Prevention Strategy

**Pattern 1: Mock PostgREST Directly (if mocking needed)**
```typescript
// ✅ CORRECT: Mock PostgREST shape, not old NestJS proxy
server.use(
  http.get('*/rest/v1/properties*', ({ request }) => {
    // Validate RLS filters present in URL
    const url = new URL(request.url)
    const rlsFilter = url.searchParams.get('owner_user_id')
    if (!rlsFilter) {
      // RLS not enforced — test is wrong
      throw new Error('Test must include RLS filter in query')
    }

    return HttpResponse.json([
      { id: '1', name: 'Prop', owner_user_id: 'user-123' }
    ])
  })
)
```

**Pattern 2: Skip Mocking — Use Real Database**
```typescript
// ✅ CORRECT: Seed real test data, query real PostgREST
beforeEach(async () => {
  const adminClient = createAdminSupabase()
  await adminClient.from('properties').insert({
    id: 'test-prop-1',
    owner_user_id: testUser.id,
    name: 'Test Property'
  })
})

test('should load properties with RLS filter', async () => {
  const userClient = createSupabaseClientAs(testUser)
  const { data } = await userClient.from('properties').select('*')
  expect(data).toHaveLength(1)
  expect(data[0].owner_user_id).toBe(testUser.id)
})
```

**Pattern 3: Stale Test Detection**
```typescript
// ✅ CORRECT: Test verifies it's not using old NestJS routes
it('should NOT mock /api/v1 endpoints', () => {
  const handlers = server.getHandlers()
  const nestJsRoutes = handlers.filter(h => h.info.path.includes('/api/v1'))
  
  expect(nestJsRoutes).toHaveLength(0, 'E2E tests should not mock old NestJS routes')
})
```

### Test Pattern for Real PostgREST

```typescript
describe('Property CRUD (real PostgREST)', () => {
  let ownerToken: string

  beforeAll(async () => {
    const { user, session } = await createTestUserWithSession()
    ownerToken = session.access_token
  })

  beforeEach(async () => {
    // Seed test data as admin
    const adminClient = createAdminSupabase()
    await adminClient.from('properties').insert({
      id: 'test-prop-1',
      owner_user_id: testUser.id,
      name: 'Test Property',
      address_line1: '123 Main St'
    })
  })

  it('should list properties with RLS filtering', async () => {
    // Use real supabase-js client, not mocked
    const client = createSupabaseClient(ownerToken)
    const { data, error } = await client
      .from('properties')
      .select('*')
      .neq('status', 'inactive')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].owner_user_id).toBe(testUser.id)  // RLS enforced
  })

  it('should not list other owner properties', async () => {
    const otherOwner = await createTestUser()
    const otherClient = createSupabaseClient(otherOwner.token)

    const { data } = await otherClient
      .from('properties')
      .select('*')

    // Should return 0 — RLS hidden our test property
    expect(data).toHaveLength(0)
  })
})
```

### Phase Recommendation

**Phase 33 (Smoke Test) + Phase 32 (Frontend Test Restoration):** Audit all E2E test mocks. Remove `/api/v1/*` mocks (old NestJS). Switch to real PostgREST queries where possible. Add RLS filter validation to remaining mocks.

### Files to Update (v8.0)

1. `apps/frontend/tests/**/*.spec.ts` — Remove old NestJS endpoint mocks
2. `apps/e2e-tests/**/*.spec.ts` — Seed real data, query real PostgREST
3. Create `apps/e2e-tests/helpers/test-database.ts` — Centralized seeding

---

## 8. Stripe Webhook Idempotency — Race Condition on First Delivery

### The Problem

Webhook processing inserts event ID to database for idempotency. But on first delivery, insertion can race:

```typescript
// Edge Function: stripe-webhooks/index.ts

// ❌ RACE CONDITION:
// 1. Two identical webhook requests arrive simultaneously
// 2. Both reach INSERT before either completes
// 3. Both INSERTs succeed (not actually checking for dupes yet)
// 4. Both process event, causing double-charging

const { error: idempotencyError } = await supabase
  .from('stripe_webhook_events')
  .insert({
    id: event.id,
    event_type: event.type,
    data: event.data
  })

// By the time we check error, it's too late — both processed
if (idempotencyError?.code === '23505') {
  return { received: true, duplicate: true }
}
```

### Warning Signs

- Race condition in webhook handling (reread Stripe docs)
- Payment doubled on Stripe retries
- No transaction wrapping idempotency check + event processing
- Idempotency record inserted after processing (wrong order)

### Prevention Strategy

**Pattern 1: INSERT First, Then Process (Database Atomicity)**
```typescript
// ✅ CORRECT: Insert idempotency record BEFORE processing
const { error: idempotencyError } = await supabase
  .from('stripe_webhook_events')
  .insert({
    id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    data: event.data
  })

// ON CONFLICT (PK): If duplicate, return immediately
// This is atomic — either we insert (our first delivery)
// or PK violation (duplicate delivery)
if (idempotencyError?.code === '23505') {
  return new Response(JSON.stringify({ received: true, duplicate: true }), {
    status: 200
  })
}

// Only process if INSERT succeeded (first delivery guaranteed)
try {
  await processEvent(event)
} catch (error) {
  // Delete idempotency record so retry can re-process
  await supabase.from('stripe_webhook_events').delete().eq('id', event.id)
  throw error
}
```

**Pattern 2: Upsert with Check Flag**
```typescript
// ✅ CORRECT: Use UPSERT to handle race atomically
const { data, error } = await supabase
  .from('stripe_webhook_events')
  .upsert(
    { id: event.id, event_type: event.type, processed: false },
    { onConflict: 'id' }
  )
  .select()

if (error) throw error

// If this record already existed, skip processing
if (data[0].processed === true) {
  return { received: true, duplicate: true }
}

try {
  await processEvent(event)
  // Mark as processed
  await supabase
    .from('stripe_webhook_events')
    .update({ processed: true })
    .eq('id', event.id)
} catch (error) {
  // Leave processed=false so retry can retry
  throw error
}
```

### Test Pattern

```typescript
describe('Stripe webhook idempotency', () => {
  it('should handle simultaneous duplicate deliveries', async () => {
    const event = { id: 'evt_123', type: 'charge.created', data: {...} }

    // Simulate Stripe delivering same event twice simultaneously
    const [result1, result2] = await Promise.all([
      fetch(STRIPE_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(event),
        headers: { 'stripe-signature': signature }
      }),
      fetch(STRIPE_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(event),
        headers: { 'stripe-signature': signature }
      })
    ])

    expect(result1.status).toBe(200)
    expect(result2.status).toBe(200)

    // Verify event processed only once
    const { data: records } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('*')
      .eq('id', event.id)

    expect(records).toHaveLength(1)  // Only one record inserted

    // Verify payment/charge recorded only once
    const { data: charges } = await supabaseAdmin
      .from('charges')  // Assuming charges table
      .select('*')
      .eq('stripe_event_id', event.id)

    expect(charges).toHaveLength(1)  // Payment not doubled
  })
})
```

### Phase Recommendation

**Phase 06 (Stripe Controller Split):** Review stripe-webhooks Edge Function. Ensure idempotency record inserted before processing. Add race condition test.

---

## 9. undefined owner_user_id in Insert Mutations

### The Problem

RLS policies check `owner_user_id = (SELECT auth.uid())`. If code doesn't explicitly set `owner_user_id`, it defaults to NULL, bypassing RLS:

```typescript
// ❌ WRONG: Forget to set owner_user_id
const { data } = await supabase
  .from('properties')
  .insert({
    name: 'My Property',
    address: '123 Main'
    // owner_user_id missing!
  })

// WITH CHECK policy: owner_user_id = (SELECT auth.uid())
// NULL = auth.uid() → FALSE → INSERT blocked ✓ (actually safe by accident)

// But if policy is buggy:
// CREATE POLICY allows INSERT WHERE true  // ✗ Opens IDOR
```

### Warning Signs

- INSERT statements missing owner_user_id field
- Comments like "TODO: Add owner_user_id"
- RLS tests don't verify WITH CHECK rejects NULL owner_user_id
- Multiple INSERT locations with inconsistent field inclusion

### Prevention Strategy

**Pattern 1: Type-Safe Insert via Zod**
```typescript
// ✅ CORRECT: Zod ensures owner_user_id included
const propertyInsertSchema = z.object({
  name: z.string(),
  address: z.string(),
  owner_user_id: z.string().uuid()  // Required!
})

const { data: { user } } = await supabase.auth.getUser()
const { data } = await supabase
  .from('properties')
  .insert(
    propertyInsertSchema.parse({
      name, address,
      owner_user_id: user.id  // Zod validates present
    })
  )
```

**Pattern 2: Helper Function**
```typescript
// ✅ CORRECT: Centralized insert function ensures owner_user_id always present
async function insertPropertyForCurrentUser(
  data: Omit<Property, 'id' | 'owner_user_id' | 'created_at' | 'updated_at'>
) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new UnauthorizedException()

  return supabase
    .from('properties')
    .insert({
      ...data,
      owner_user_id: user.id  // Always set
    })
}

// Usage: can't forget owner_user_id
const property = await insertPropertyForCurrentUser({ name, address })
```

**Pattern 3: Audit for Missing Fields**
```bash
# Find all INSERT statements, flag those without owner_user_id
grep -n "\.insert(" apps/frontend/src --include="*.ts" -A 5 | \
  grep -B 5 "}" | \
  grep -v "owner_user_id" > potential_missing_owner_user_id.txt
```

### Test Pattern

```typescript
describe('Property insert RLS enforcement', () => {
  it('should reject INSERT with missing owner_user_id', async () => {
    const client = createSupabaseClient(testUser.token)
    const { error } = await client
      .from('properties')
      .insert({
        name: 'Test',
        address: '123 Main'
        // owner_user_id missing — should fail WITH CHECK
      })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('PGRST301')  // Permission denied
  })

  it('should reject INSERT with different owner_user_id', async () => {
    const client = createSupabaseClient(testUser.token)
    const otherUser = await createTestUser()

    const { error } = await client
      .from('properties')
      .insert({
        name: 'Test',
        address: '123 Main',
        owner_user_id: otherUser.id  // Not current user — should fail WITH CHECK
      })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('PGRST301')
  })
})
```

### Phase Recommendation

**Phase 01 (Critical Security):** Audit all 6 insert mutations in frontend (properties, units, leases, tenants, maintenance, inspections). Add guard: `if (!owner_user_id) throw new Error('owner_user_id required')`.

---

## Summary Table: Pitfalls by Phase

| Pitfall | Phase | Risk | Prevention |
|---------|-------|------|-----------|
| IDOR in Edge Functions | 01 | Critical | Ownership checks before mutations, RLS write tests |
| PostgREST filter injection | 02 | High | Sanitize user input, encode special chars, test injection |
| RLS write isolation silent fails | 02 | High | Dedicated integration project, negative tests, explicit denial tests |
| Cached auth race conditions | 04 | Medium | Fresh auth per mutation, TTL cache, error recovery |
| Unpinned Deno dependencies | 05 | Medium | Import map, version pinning, lock file |
| Stripe SDK version changes | 06 | Medium | Shape validation, version pinning, CHANGELOG review |
| E2E mock interception | 32-33 | Medium | Real database seeding, remove old mocks, RLS filter validation |
| Webhook idempotency races | 06 | High | Insert before process, atomic transactions, race testing |
| Missing owner_user_id | 01 | Critical | Zod validation, helper functions, field audit |

---

## Key Prevention Principles

1. **Explicit RLS tests:** Don't assume policies work — test ownership enforcement explicitly
2. **Dedicated test infrastructure:** RLS tests need fresh database (not shared project)
3. **Service role is risky:** Always pair with explicit ownership checks
4. **PostgREST filtering needs sanitization:** Special characters are operators
5. **Webhook idempotency is atomic:** Insert BEFORE process, handle race atomically
6. **Dependencies matter:** Pin versions, review changes before upgrades
7. **Caching has costs:** Fresh auth per mutation, TTL for cached values
8. **Tests must reflect architecture:** Real PostgREST queries, not old mocks

