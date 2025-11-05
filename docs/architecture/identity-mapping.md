# TenantFlow Identity Mapping

## Overview

TenantFlow uses a **three-tier identity system** to bridge Supabase Auth, application logic, and database row-level security (RLS) policies.

## The Triple-ID System

```
┌─────────────────────────────────────────────────────────────┐
│                     Identity Flow                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Supabase Auth Layer (auth.users.id)                      │
│    └─> Cryptographic UUID from Supabase Auth service        │
│         Referenced as: auth.uid()                            │
│         Location: Managed by Supabase Auth                   │
│         Example: 550e8400-e29b-41d4-a716-446655440000        │
│                                                              │
│ 2. Application Layer (public.users.supabaseId)              │
│    └─> Stores auth.uid() for identity resolution            │
│         Foreign key to Supabase Auth                         │
│         Purpose: Maps auth identity to app identity          │
│         Column: users.supabaseId (TEXT, UNIQUE, NOT NULL)    │
│                                                              │
│ 3. RLS Policy Layer (public.users.id)                       │
│    └─> Internal UUID for ownership/relationships            │
│         Used in: ownerId, tenantId, landlordId, userId       │
│         Column: users.id (UUID, PRIMARY KEY)                 │
│         Purpose: Database relationships and RLS filtering    │
└─────────────────────────────────────────────────────────────┘
```

## Why Three IDs?

### Problem Statement

Supabase Auth (`auth.uid()`) and application database (`users.id`) use different identity schemes:

- **Supabase Auth UID**: Cryptographic UUID managed by Supabase Auth service
- **Application User ID**: Database UUID for foreign key relationships

RLS policies run in the context of `auth.uid()`, but application tables use `users.id` for ownership. We need a way to resolve between them.

### Solution: Dual-ID Mapping

1. **Backend converts at authentication boundary** (`auth.uid()` → `users.id`)
2. **RLS policies use lookup pattern** (`auth.uid()` → `users.supabaseId` → `users.id`)
3. **Application code uses internal ID** (`users.id` everywhere in backend/frontend)

## Backend Implementation

### Identity Resolution (Passport Strategy)

**File:** `apps/backend/src/shared/auth/supabase.strategy.ts:152-158`

```typescript
// JWT arrives with sub = auth.uid()
// Backend resolves to users.id for RLS compatibility
const internalUserId = await this.utilityService.ensureUserExists(userToEnsure)

const user: authUser = {
  id: internalUserId,        // ✅ users.id (NOT auth.uid())
  supabaseId: payload.sub,   // ✅ auth.uid() for reference
  email: payload.email,
  role: payload.user_metadata?.role || 'OWNER',
  // ...
}
```

**Key Points:**
- Passport strategy validates JWT and extracts `payload.sub` (auth UID)
- Calls `ensureUserExists()` to get or create `users.id`
- Sets `req.user.id = users.id` (NOT auth.uid())
- All controllers use `req.user.id` which is already resolved

### User Existence Check

**File:** `apps/backend/src/shared/services/utility.service.ts:268-372`

```typescript
async ensureUserExists(userData: EnsureUserData): Promise<string> {
  // 1. Check cache first (30min TTL)
  const cached = this.userCache.get(userData.supabaseId)
  if (cached) return cached

  // 2. Query database for existing user
  const { data: existingUser } = await this.supabase
    .getClient()
    .from('users')
    .select('id')
    .eq('supabaseId', userData.supabaseId)
    .single()

  if (existingUser) {
    this.userCache.set(userData.supabaseId, existingUser.id)
    return existingUser.id
  }

  // 3. Create new user if doesn't exist
  const { data: newUser } = await this.supabase
    .getClient()
    .from('users')
    .insert({
      supabaseId: userData.supabaseId,
      email: userData.email,
      role: userData.role || 'OWNER',
      // ...
    })
    .select('id')
    .single()

  this.userCache.set(userData.supabaseId, newUser.id)
  return newUser.id
}
```

**Features:**
- Idempotent (safe to call multiple times)
- Race condition handling (retry logic)
- 30-minute cache to reduce DB queries
- Automatic role assignment from JWT claims

### Custom Decorators

**File:** `apps/backend/src/shared/decorators/user.decorator.ts`

```typescript
// Extract full user object
@User() user: authUser

// Extract just the user ID
@UserId() userId: string

// Extract JWT token
@JwtToken() token: string
```

**Usage in Controllers:**

```typescript
@Get()
async findAll(@UserId() userId: string) {
  // userId is already users.id (not auth.uid())
  return this.service.findAll(userId)
}
```

## RLS Policy Patterns

### Pattern 1: Direct Ownership Check

**Use case:** User owns the resource directly (e.g., documents, notifications)

```sql
CREATE POLICY "documents_user_select"
ON documents FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);
```

**Flow:**
1. `auth.uid()` returns Supabase Auth UID from JWT
2. Subquery finds matching `users.id` via `supabaseId` lookup
3. Check if `document.user_id` matches resolved `users.id`

### Pattern 2: Helper Functions (Recommended)

**Use case:** Complex ownership chains, prevent infinite recursion

**Helper Function:**
```sql
CREATE OR REPLACE FUNCTION public.user_owns_property(property_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
COST 100
AS $$
  SELECT EXISTS (
    SELECT 1 FROM property
    WHERE id = property_id
    AND "ownerId" IN (
      SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
    )
  );
$$;
```

**Policy Using Helper:**
```sql
CREATE POLICY "unit_owner_select"
ON unit FOR SELECT TO authenticated
USING (
  user_owns_property("propertyId")  -- Simple, no recursion
);
```

**Benefits:**
- Breaks circular dependencies (`unit ↔ lease` recursion)
- Cleaner policy syntax
- Centralized ownership logic
- Better query plan optimization

### Pattern 3: Multi-Role Access

**Use case:** Landlords and tenants both need access (e.g., leases, maintenance)

```sql
CREATE POLICY "lease_owner_or_tenant_select"
ON lease FOR SELECT TO authenticated
USING (
  -- Landlords can see leases for their properties
  EXISTS (
    SELECT 1 FROM unit
    WHERE unit.id = lease."unitId"
    AND user_owns_property(unit."propertyId")
  )
  OR
  -- Tenants can see their own lease
  "tenantId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);
```

**Key:** Use `OR` to combine ownership checks for multiple roles.

## Frontend Implementation

### Authentication State

**Middleware:** `apps/frontend/src/lib/supabase/middleware.ts`

```typescript
// 1. Extract JWT from cookies
const { data: { user } } = await supabase.auth.getUser()

// 2. Read custom claims from JWT
const userRole = user?.user_metadata?.role || 'OWNER'

// 3. Route based on role
if (userRole === 'TENANT') {
  return NextResponse.redirect(new URL('/tenant', request.url))
} else {
  return NextResponse.redirect(new URL('/manage', request.url))
}
```

### API Calls

**Client Components:**
```typescript
// Use NEXT_PUBLIC_API_BASE_URL for client-side
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/tenants/${id}`,
  {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'  // Include cookies for auth
  }
)
```

**Server Components:**
```typescript
// Use API_BASE_URL (internal Railway URL) for server-side
const response = await fetch(
  `${process.env.API_BASE_URL}/api/v1/tenants/${id}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
)
```

## Common Pitfalls

### ❌ WRONG: Using auth.uid() Directly in Application

```typescript
// ❌ BAD: auth.uid() is not the same as users.id
@Get(':id')
async findOne(@Param('id') id: string) {
  // What if id is auth.uid()? Won't match users.id!
  return this.service.findOne(id)
}
```

### ✅ CORRECT: Using Resolved users.id

```typescript
// ✅ GOOD: Always use users.id from authenticated context
@Get()
async findAll(@UserId() userId: string) {
  // userId is already users.id
  return this.service.findAll(userId)
}
```

### ❌ WRONG: Accepting User ID from Client

```typescript
// ❌ SECURITY RISK: Client can supply any userId
@Get()
async findAll(@Query('userId') userId: string) {
  return this.service.findAll(userId)
}
```

### ✅ CORRECT: Extracting from Authenticated Context

```typescript
// ✅ SECURE: userId comes from verified JWT
@Get()
async findAll(@UserId() userId: string) {
  return this.service.findAll(userId)
}
```

### ❌ WRONG: RLS Policy Using auth.uid() Directly

```sql
-- ❌ BAD: ownerId is users.id, but auth.uid() is different!
CREATE POLICY "property_select"
ON property FOR SELECT TO authenticated
USING ("ownerId" = auth.uid()::text);
```

### ✅ CORRECT: RLS Policy with Lookup

```sql
-- ✅ GOOD: Resolve auth.uid() to users.id first
CREATE POLICY "property_select"
ON property FOR SELECT TO authenticated
USING (
  "ownerId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);
```

## Verification Checklist

When adding new features, verify:

- [ ] ✅ Backend uses `@UserId()` decorator, not client-supplied ID
- [ ] ✅ RLS policies use `users.supabaseId = auth.uid()::text` lookup pattern
- [ ] ✅ All foreign keys reference `users.id`, not `supabaseId`
- [ ] ✅ Frontend never sends user ID in request body/params
- [ ] ✅ Service layer uses `users.id` for all queries
- [ ] ✅ RLS helper functions use `SECURITY DEFINER` + `search_path`

## Database Schema

### Users Table Structure

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "supabaseId" TEXT UNIQUE NOT NULL,  -- Links to auth.users.id
  email TEXT NOT NULL,
  role "UserRole" NOT NULL,
  "stripeCustomerId" TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Critical index for RLS performance
CREATE INDEX idx_users_supabase_id ON users("supabaseId");
```

### Foreign Key Pattern

```sql
-- ✅ ALWAYS reference users.id, not supabaseId
CREATE TABLE property (
  id UUID PRIMARY KEY,
  "ownerId" UUID NOT NULL REFERENCES users(id),  -- users.id
  name TEXT NOT NULL,
  -- ...
);

CREATE TABLE lease (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL REFERENCES users(id),  -- users.id
  "unitId" UUID NOT NULL REFERENCES unit(id),
  -- ...
);
```

## Testing Identity Resolution

### Test RLS Policies

```sql
-- Set auth context to tenant user
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "550e8400-e29b-41d4-a716-446655440000"}';

-- Should only return tenant's own data
SELECT * FROM lease;
SELECT * FROM rent_payment;
SELECT * FROM tenant_payment_method;

-- Reset
RESET ROLE;
```

### Test Backend Identity Resolution

```typescript
describe('Identity Resolution', () => {
  it('converts auth.uid() to users.id', async () => {
    const authUid = 'test-auth-uid'
    const userId = await utilityService.ensureUserExists({
      supabaseId: authUid,
      email: 'test@example.com'
    })

    expect(userId).not.toBe(authUid)  // Different IDs
    expect(userId).toMatch(/^[0-9a-f-]{36}$/)  // Valid UUID

    // Verify mapping
    const user = await db.from('users').select().eq('id', userId).single()
    expect(user.supabaseId).toBe(authUid)
  })
})
```

## References

- **Supabase RLS Docs:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **Custom Claims Hook:** `supabase/migrations/20251031_auth_hook_custom_claims.sql`
- **Helper Functions:** `supabase/migrations/20250111_fix_unit_lease_rls_infinite_recursion.sql`
- **Backend Strategy:** `apps/backend/src/shared/auth/supabase.strategy.ts`
- **Utility Service:** `apps/backend/src/shared/services/utility.service.ts`

---

**Last Updated:** 2025-02-15
**Status:** ✅ Production-Ready
**Review Date:** 2025-03-15
