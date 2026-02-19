# TenantFlow: Comprehensive Architecture Research

> Synthesized from 54 parallel research agents. Last updated: February 2026.

This document covers every layer of TenantFlow's architecture with production-tested patterns, critical bugs found, and implementation guidance. It is the definitive reference for building this platform correctly.

---

## Table of Contents

1. [Executive Summary — Critical Issues](#1-executive-summary--critical-issues)
2. [Architecture Overview](#2-architecture-overview)
3. [Authentication: Full JWT Flow](#3-authentication-full-jwt-flow)
4. [Database Schema & RLS](#4-database-schema--rls)
5. [Property Creation: End-to-End Analysis](#5-property-creation-end-to-end-analysis)
6. [Image Upload Pipeline](#6-image-upload-pipeline)
7. [Stripe: Subscriptions + Connect](#7-stripe-subscriptions--connect)
8. [Automated Rent Collection](#8-automated-rent-collection)
9. [Frontend Patterns](#9-frontend-patterns)
10. [Financial Reporting](#10-financial-reporting)
11. [Playwright E2E Testing](#11-playwright-e2e-testing)
12. [NestJS Module Architecture](#12-nestjs-module-architecture)
13. [Deployment: Vercel + Railway](#13-deployment-vercel--railway)
14. [Pricing Strategy](#14-pricing-strategy)
15. [Feature Roadmap](#15-feature-roadmap)

---

## 1. Executive Summary — Current Status

### ✅ Schema & RLS: Correctly Implemented (After Migrations)

The property creation architecture went through several migrations that resolved earlier confusion:

| Migration | What It Did |
|-----------|------------|
| `20251101000000_base_schema.sql` | Initial schema with `property_owner_id` FK to `property_owners` |
| `20251215000000_fix_properties_owner_reference.sql` | Added `owner_user_id` to properties, populated from `property_owners.user_id`, **dropped `property_owner_id`** |
| `20260103120000_fix_properties_rls_comprehensive.sql` | Dropped all old policies, created clean policies using `owner_user_id = (SELECT auth.uid())` |

**Current `properties` table**: Has `owner_user_id` (NOT NULL, FK to `public.users.id`). No `property_owner_id` column.

**Current RLS policies**: `owner_user_id = (SELECT auth.uid())` — correct.

**Backend service** (`properties.service.ts:120`): Sends `owner_user_id: user_id` where `user_id = req.user.id` from JWT — correct.

**The data flow should work.** If property creation is still failing, check these likely culprits:

### ⚠️ Potential Issue: Missing `public.users` Row for Test Users

The `properties.owner_user_id` FK references `public.users.id`. If the `handle_new_user()` trigger failed during test user signup, the user exists in `auth.users` but NOT in `public.users`. The FK constraint will reject every INSERT to `properties`.

**Verify:**
```sql
-- In Supabase SQL Editor: check if test user exists in public.users
SELECT id, email FROM public.users WHERE email = 'your-test-email@example.com';
-- If empty, trigger failed. Re-run manually:
SELECT public.handle_new_user_manually('your-user-uuid');
```

### ⚠️ Other Potential Failure Points

| Symptom | Root Cause |
|---------|-----------|
| `violates foreign key constraint "properties_owner_user_id_fkey"` | `public.users` row missing — `handle_new_user()` trigger failed |
| `42501 new row violates row-level security` | `owner_user_id` ≠ `auth.uid()` — check JWT extraction in NestJS |
| `401 Unauthorized` before reaching Supabase | `SUPABASE_JWT_SECRET` env var mismatch |
| No error but property not visible in UI | RLS SELECT policy filtering — `getSession()` vs `getUser()` mismatch |
| `column "property_owner_id" does not exist` | Old code referencing dropped column — run `pnpm db:types` |

### ✅ What Is Correctly Implemented

- Auth token flow: `getSession()` → `Authorization: Bearer` → `adminClient.auth.getUser()` → user-scoped client pool
- `accessToken` async callback pattern for per-user Supabase clients (ADR-0004)
- `Promise.allSettled()` for partial-failure image uploads
- TanStack Query cache invalidation (`propertyQueries.lists()` + `ownerDashboardKeys.all`)
- Playwright storageState with correct Base64URL encoding and 3180-byte chunking
- Three-tier Supabase client: admin / user pool / RPC

---

## 2. Architecture Overview

### Stack

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 16 + React 19 + TailwindCSS 4 | `apps/frontend/` → Vercel, port 3050 |
| Backend | NestJS 11 + Supabase + Stripe | `apps/backend/` → Railway, port 4650 |
| Database | PostgreSQL via Supabase | Supabase hosted |
| Auth | Supabase Auth + `@supabase/ssr` | Frontend middleware |
| Shared | TypeScript 5.9, Zod 4, types, validation | `packages/shared/` |
| Tests | Playwright (E2E) + Jest/Vitest (unit) | `apps/e2e-tests/` |

### Three-Tier Supabase Client (ADR-0004)

```
Tier 1: ADMIN CLIENT
  - Key: SUPABASE_SERVICE_ROLE_KEY (service role)
  - Bypasses RLS completely
  - Use for: webhooks, background jobs, health checks, adminClient.auth.getUser()
  - NEVER use for user-initiated data queries without explicit .eq('user_id', userId)

Tier 2: USER CLIENT POOL
  - Key: SUPABASE_PUBLISHABLE_KEY (anon key) + accessToken callback
  - Enforces RLS (database sees auth.uid() from the user's JWT)
  - LRU cache: 50 clients, 5-minute TTL, keyed by first 16 chars of JWT
  - Use for: ALL user-initiated requests
  - Pattern: this.supabase.getUserClient(token)

Tier 3: RPC SERVICE
  - Wraps admin client with retries + caching
  - Use for: complex queries, >3 JOINs, reporting aggregations
```

### The `accessToken` Callback Pattern (CRITICAL — NOT DEPRECATED)

```typescript
// supabase-user-client-pool.ts
const client = createClient<Database>(
  this.options.supabaseUrl,
  this.options.supabasePublishableKey,  // anon key, NOT service role
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    accessToken: async () => userToken  // THIS makes auth.uid() work in RLS
  }
)
```

The deprecated approach (do not use):
```typescript
// DEPRECATED
global: { headers: { Authorization: `Bearer ${userToken}` } }
```

### Monorepo Import Rules

```typescript
// ✅ CORRECT: Direct path imports (no barrel files)
import type { Property } from '@repo/shared/types/core'
import type { AuthUser } from '@repo/shared/types/auth'
import { propertyCreateSchema } from '@repo/shared/validation/properties'

// ❌ FORBIDDEN: Barrel imports
import type { Property } from '@repo/shared'
```

---

## 3. Authentication: Full JWT Flow

### End-to-End Flow

```
1. User logs in via Supabase Auth (Next.js frontend)
   → Supabase issues JWT (HS256 or ES256, 1-hour expiry)
   → @supabase/ssr stores session in cookies (Base64URL encoded, chunked at 3180 bytes)
   → Cookie names: sb-{projectRef}-auth-token.0, .1, .2, ...

2. Frontend fetches protected page
   → Next.js middleware (edge) calls createServerClient with getAll/setAll cookies
   → supabase.auth.getUser() validates session (DO NOT use getSession() in middleware)
   → If invalid: redirect to /login
   → If valid: refreshes token if near expiry, sets updated cookies in response

3. Frontend calls NestJS API
   → supabase.auth.getSession() → access_token
   → fetch('/api/v1/properties', { headers: { Authorization: `Bearer ${access_token}` } })

4. NestJS receives request
   → JwtAuthGuard runs
   → Extracts Bearer token from Authorization header
   → adminClient.auth.getUser(token) → validates against Supabase Auth server
   → Attaches user to req.user (type: AuthenticatedRequest)
   → Request proceeds to controller

5. NestJS service executes database query
   → getUserClient(token) creates/retrieves user-scoped Supabase client
   → Client uses accessToken callback → auth.uid() = user's UUID in PostgreSQL session
   → RLS policies enforce: owner_user_id = (SELECT auth.uid())
   → Data returned only for this user
```

### JWT Validation: Three Approaches

**Approach A: Supabase SDK delegation (TenantFlow's approach — most correct)**
```typescript
// jwt-auth.guard.ts
const { data: { user }, error } = await this.adminClient.auth.getUser(token)
```
- Pros: Catches revoked tokens, handles key rotation automatically, returns fresh User object
- Cons: Makes a network call to Supabase Auth on every uncached request
- Mitigation: Request-level cache via `reqWithCache.authUserCache` prevents N+1

**Approach B: passport-jwt with SUPABASE_JWT_SECRET**
```typescript
// Local crypto validation — no network call
secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET')
```
- Pros: Zero latency (local crypto)
- Cons: Cannot detect revoked tokens; must manually rotate secret

**Approach C: JWKS endpoint (best for high-traffic)**
```typescript
secretOrKeyProvider: passportJwtSecret({
  jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
})
```
- Pros: Local crypto, auto-key-rotation via JWKS, no network call per request
- Cons: Slightly more complex setup

### Supabase JWT Payload Structure

```json
{
  "sub": "user-uuid",          // = auth.users.id = auth.uid()
  "email": "user@example.com",
  "role": "authenticated",
  "iss": "https://project.supabase.co/auth/v1",
  "aud": "authenticated",
  "exp": 1234567890,
  "app_metadata": {
    "provider": "email",
    "user_type": "OWNER"       // Set by custom_access_token_hook or trigger
  },
  "user_metadata": {}
}
```

### Multi-Role Auth: OWNER vs TENANT

**Security rule**: `user_metadata` can be changed by ANY authenticated user. NEVER use it for auth decisions. Use `app_metadata` (server-only) or a `public.users` table.

```sql
-- Trigger syncs public.users.user_type → auth.users.raw_app_meta_data
-- This ensures JWT app_metadata always reflects the database truth
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('user_type', NEW.user_type)
WHERE id = NEW.id;
```

**Middleware role-based routing** (using `getClaims()` — faster than `getUser()`):
```typescript
const { data: claimsData } = await supabase.auth.getClaims()
const userType = claimsData?.claims.app_metadata?.user_type

// Route tenants to /tenant, owners to /dashboard
if (pathname.startsWith('/tenant') && userType !== 'TENANT') {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
if (pathname.startsWith('/dashboard') && userType === 'TENANT') {
  return NextResponse.redirect(new URL('/tenant', request.url))
}
```

### Supabase Client in NestJS: Key Helper

```typescript
// ✅ Used throughout all services
async getUser(req: Request): Promise<AuthUser | null> {
  // Request-level cache — prevents multiple round-trips per request
  const reqWithCache = req as Request & { authUserCache?: AuthUser | null }
  if (typeof reqWithCache.authUserCache !== 'undefined') {
    return reqWithCache.authUserCache
  }

  const token = this.getTokenFromRequest(req)
  if (!token) return null

  const { data: { user }, error } = await this.adminClient.auth.getUser(token)
  if (error || !user) return null

  reqWithCache.authUserCache = user
  return user
}
```

---

## 4. Database Schema & RLS

### Core Schema (from `20251101000000_base_schema.sql`)

```sql
-- auth.users (Supabase managed)
--   ↓
-- property_owners (one-to-one, stores Stripe Connect account)
--   ↓
-- properties (one-to-many, has owner_user_id for RLS performance)
--   ↓
-- units (one-to-many)
--   ↓
-- leases (units → primary_tenant_id)
--   ↓
-- rent_payments, maintenance_requests, lease_tenants

-- MONEY: always stored as INTEGER cents (not NUMERIC, not FLOAT)
-- STATUS: always TEXT with CHECK constraints (not PostgreSQL ENUM)
-- SOFT DELETE: properties.status = 'inactive' (never physical delete)
```

### Key Tables

```sql
-- property_owners: Stripe Connect account for landlord payouts
create table property_owners (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null,           -- auth.users.id
    stripe_account_id   text not null,
    business_name       text,
    charges_enabled     boolean default false,
    payouts_enabled     boolean default false,
    onboarding_status   text default 'not_started',
    constraint property_owners_onboarding_status_check
        check (onboarding_status in ('not_started', 'in_progress', 'completed'))
);

-- properties: central entity
create table properties (
    id              uuid primary key default gen_random_uuid(),
    property_owner_id uuid not null,             -- FK to property_owners.id
    owner_user_id   uuid,                        -- DENORMALIZED: auth.users.id directly
    name            text not null,
    address_line1   text not null,
    city            text not null,
    state           text not null,
    postal_code     text not null,
    country         text default 'US' not null,
    property_type   text not null,
    status          text default 'active' not null,
    constraint properties_status_check
        check (status in ('active', 'inactive', 'sold'))
);
-- KEY: owner_user_id = auth.users.id (denormalized for fast RLS without joins)

-- units: rentable spaces
create table units (
    id              uuid primary key default gen_random_uuid(),
    property_id     uuid not null references properties(id),
    owner_user_id   uuid,                        -- denormalized for RLS
    unit_number     text,
    bedrooms        integer,
    bathrooms       numeric(3,1),
    square_feet     integer,
    rent_amount     integer not null,            -- CENTS
    status          text default 'available',
    constraint units_status_check
        check (status in ('available', 'occupied', 'maintenance'))
);

-- leases
create table leases (
    id                      uuid primary key default gen_random_uuid(),
    unit_id                 uuid not null references units(id),
    primary_tenant_id       uuid not null references tenants(id),
    rent_amount             integer not null,    -- CENTS
    start_date              date not null,
    end_date                date not null,
    security_deposit        integer not null,    -- CENTS
    payment_day             integer default 1,
    late_fee_amount         integer,             -- CENTS
    late_fee_days           integer default 5,   -- grace period
    lease_status            text default 'active',
    stripe_subscription_id  text,               -- recurring billing
    auto_pay_enabled        boolean default false,
    constraint leases_status_check
        check (lease_status in ('draft', 'pending_signature', 'active', 'ended', 'terminated'))
);

-- rent_payments: every Stripe payment intent
create table rent_payments (
    id                          uuid primary key default gen_random_uuid(),
    lease_id                    uuid not null references leases(id),
    tenant_id                   uuid not null references tenants(id),
    stripe_payment_intent_id    text not null,
    amount                      integer not null,    -- CENTS
    status                      text not null,
    period_start                date not null,
    period_end                  date not null,
    due_date                    date not null,
    paid_date                   timestamptz,
    constraint rent_payments_status_check
        check (status in ('pending', 'processing', 'succeeded', 'failed', 'canceled'))
);
```

### RLS Policy Pattern (Correct)

```sql
-- For tables with owner_user_id column (fast, no joins):
CREATE POLICY "properties_select_owner" ON public.properties
FOR SELECT TO authenticated
USING ((select auth.uid()) = owner_user_id);

CREATE POLICY "properties_insert_owner" ON public.properties
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = owner_user_id);

CREATE POLICY "properties_update_owner" ON public.properties
FOR UPDATE TO authenticated
USING ((select auth.uid()) = owner_user_id)
WITH CHECK ((select auth.uid()) = owner_user_id);

CREATE POLICY "properties_delete_owner" ON public.properties
FOR DELETE TO authenticated
USING ((select auth.uid()) = owner_user_id);

-- Service role bypass (for backend admin operations)
CREATE POLICY "service_role_all" ON public.properties
FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

### RLS Key Rules

1. **Always wrap `auth.uid()` in `(select ...)`**: `(select auth.uid())` caches the result per query; `auth.uid()` evaluates per row
2. **SELECT**: `USING` only (no `WITH CHECK`)
3. **INSERT**: `WITH CHECK` only (no `USING`)
4. **UPDATE**: Both `USING` and `WITH CHECK`
5. **DELETE**: `USING` only
6. **Never use `FOR ALL`**: Split into 4 separate policies
7. **Never use `user_metadata` in RLS**: Users can modify it; use `app_metadata`

### Denormalized `owner_user_id` — Why It Exists

Rather than joining `properties → property_owners → auth.users` in every RLS check, `owner_user_id` stores `auth.users.id` directly on each row. This turns:

```sql
-- SLOW (join per row)
USING (auth.uid() = (SELECT user_id FROM property_owners WHERE id = property_owner_id))

-- FAST (indexed lookup)
USING ((select auth.uid()) = owner_user_id)
```

**Set it on INSERT, never update it.** The backend service must populate it from the JWT user ID.

### RLS Debugging

```sql
-- 1. Check active policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'properties'
ORDER BY cmd;

-- 2. Check RLS is enabled
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'properties';

-- 3. Simulate user context in SQL Editor (use ROLLBACK after!)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"role": "authenticated", "sub": "your-user-uuid"}';

INSERT INTO properties (name, address_line1, city, state, postal_code, property_type, owner_user_id)
VALUES ('Test', '123 Main St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'your-user-uuid');

ROLLBACK;  -- Always rollback test data

-- 4. Debug auth context function
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS json LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT json_build_object(
    'uid', auth.uid(),
    'role', auth.role(),
    'email', auth.jwt() ->> 'email',
    'aud', auth.jwt() ->> 'aud'
  );
$$;
-- Call from SQL editor: SELECT debug_auth_context();
```

**Error codes:**
- `42501`: RLS policy violation (policy denied)
- `PGRST116`: No rows found (or RLS filtered all rows)
- `23505`: Unique constraint violation
- `23503`: Foreign key violation

### The `handle_new_user()` Trigger Pattern

```sql
-- Critical: SECURITY DEFINER + empty search_path prevents privilege escalation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''    -- REQUIRED since Supabase 2024
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'OWNER',
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = COALESCE(EXCLUDED.email, public.users.email),
        updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger fires AFTER INSERT so NEW.id is committed in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**IMPORTANT**: If this trigger throws an exception, the user signup fails. Wrap risky code in `EXCEPTION WHEN OTHERS THEN` if signup must succeed regardless.

### PostgreSQL Performance Tips

```sql
-- Index every column used in RLS policies
CREATE INDEX idx_properties_owner_user_id ON properties(owner_user_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_owner_created ON properties(owner_user_id, created_at DESC);

-- For soft-delete queries: partial index
CREATE INDEX idx_properties_active ON properties(owner_user_id)
  WHERE status != 'inactive';

-- Never use PostgreSQL ENUM types
-- ❌ CREATE TYPE property_status AS ENUM ('active', 'inactive');
-- ✅ text NOT NULL DEFAULT 'active' with CHECK constraint
-- Reason: Adding ENUM values requires ALTER TYPE (slow, locks table)
```

---

## 5. Property Creation: End-to-End Analysis

### Complete Data Flow

```
FRONTEND (property-form.client.tsx)
  ↓
  Form submits: { name, address_line1, city, state, postal_code, property_type }
  NOTE: owner info NOT sent from frontend — backend extracts from JWT
  ↓
useCreatePropertyMutation.mutateAsync(createData)
  ↓
apiRequest<Property>('/api/v1/properties', { method: 'POST', body: JSON })
  ↓
Gets supabase.auth.getSession() → access_token
  ↓
fetch with Authorization: Bearer {access_token}
  ↓
NestJS BACKEND: POST /api/v1/properties
  ↓
JwtAuthGuard: adminClient.auth.getUser(token) → attaches user to req
  ↓
PropertiesController.create(dto, req): calls propertiesService.create(req, dto)
  ↓
PropertiesService.create():
  - token = getTokenFromRequest(req)   // extracts Bearer token
  - user_id = req.user.id              // from JWT, not request body
  - client = getUserClient(token)      // user-scoped, enforces RLS
  - INSERT { name, address_line1, ..., owner_user_id: user_id }
  ↓
Supabase Database:
  - auth.uid() = user_id (from accessToken callback)
  - RLS WITH CHECK: owner_user_id = (select auth.uid()) ✅ matches
  - INSERT succeeds → returns property record with id
  ↓
BACKEND returns property to frontend
  ↓
Frontend: uploads images using property.id as storage path
```

### Frontend Form Data (Correct — Do Not Send `owner_user_id`)

```typescript
// property-form.client.tsx
const createData = {
  name: value.name,
  address_line1: value.address_line1,
  city: value.city,
  state: value.state,
  postal_code: value.postal_code,
  country: value.country,
  property_type: value.property_type,
  // DO NOT include owner_user_id here — backend sets it from JWT
}
const newProperty = await createPropertyMutation.mutateAsync(createData)
```

### Backend Service (Currently Correct)

```typescript
// properties.service.ts — CURRENT (CORRECT)
const insertData: PropertyInsert = {
  name: request.name,
  address_line1: request.address_line1,
  city: request.city,
  owner_user_id: user_id,  // ✅ Column exists, references public.users.id
  // ...
}
// user_id = req.user.id = auth.users.id (from JWT via adminClient.auth.getUser())
// owner_user_id FK → public.users.id
// RLS WITH CHECK: owner_user_id = (SELECT auth.uid()) → matches ✅
```

**The INSERT will fail if**: `public.users` does not have a row for this user (FK violation). The `handle_new_user()` trigger creates this row on auth signup. If the trigger failed, manually insert or re-trigger.

### Mutation Hook Pattern

```typescript
// use-properties.ts
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PropertyCreate) =>
      apiRequest<Property>('/api/v1/properties', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      // Invalidate BOTH — new property affects dashboard stats too
      queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
      toast.success('Property created successfully')
    },
    onError: error => handleMutationError(error, 'Create property')
  })
}
```

### Common Failure Modes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| `column "owner_user_id" does not exist` | Column mismatch in service | Fix service or add migration |
| `42501 RLS policy violation` | Wrong column name or missing auth context | Check `owner_user_id` matches `auth.uid()` |
| `401 Unauthorized` | JWT validation failed in guard | Check `SUPABASE_JWT_SECRET` matches dashboard |
| `auth.uid()` returns null | Token not forwarded via `accessToken` callback | Check `getUserClient(token)` usage |
| Empty response (200 but no data) | RLS filtered everything with SELECT policy | User's JWT doesn't match any rows |
| Property created but images fail | Storage RLS denies path | Check `property-images` bucket policies |

---

## 6. Image Upload Pipeline

### Architecture: Create Record First, Upload Second

```typescript
// STEP 1: Create property record (get the ID)
const newProperty = await createPropertyMutation.mutateAsync(createData)

// STEP 2: Upload images using property ID as folder path
const uploadPromises = filesWithStatus.map(({ file }) => {
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `${newProperty.id}/${fileName}`

  return supabase.storage
    .from('property-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })
})

// STEP 3: Use allSettled — never all() — for graceful partial failures
const results = await Promise.allSettled(uploadPromises)
const successCount = results.filter(r => r.status === 'fulfilled').length
const errorCount = results.filter(r => r.status === 'rejected').length

// STEP 4: User-friendly feedback based on result mix
if (errorCount === 0) {
  toast.success(`Property created with ${successCount} image(s)`)
} else if (successCount > 0) {
  toast.warning(`Property created. ${successCount} uploaded, ${errorCount} failed`)
} else {
  toast.error('Property created but all images failed to upload')
}
```

**Why create record first?**
1. Storage path includes `{property_id}/{filename}` — need the ID first
2. Storage RLS validates path against the `properties` table — property must exist
3. Property without images is a valid state; user can retry uploads on the edit page
4. No atomic cross-storage+database transactions in Supabase (by design)

### Storage RLS Policies

```sql
-- Public read (property images shown on listings)
CREATE POLICY "Public can view property images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'property-images');

-- Owner can upload (path-based ownership check)
CREATE POLICY "Owners can upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (select auth.uid()) = (
    SELECT owner_user_id
    FROM public.properties
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Owner can delete their images
CREATE POLICY "Owners can delete property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (select auth.uid()) = (
    SELECT owner_user_id
    FROM public.properties
    WHERE id::text = (storage.foldername(name))[1]
  )
);
```

### Auto-Sync Trigger: Storage → Database

```sql
-- Trigger: when a file is uploaded to storage, auto-create property_images record
CREATE OR REPLACE FUNCTION public.handle_property_image_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  property_uuid uuid;
  image_path text;
BEGIN
  -- Extract property_id from path: {property_id}/{filename}
  property_uuid := (storage.foldername(NEW.name))[1]::uuid;
  image_path := NEW.name;  -- relative path

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_images (property_id, image_url, display_order)
    VALUES (property_uuid, image_path, 0)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.property_images
    WHERE image_url = OLD.name;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_property_image_upload
  AFTER INSERT OR DELETE ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'property-images')
  EXECUTE FUNCTION public.handle_property_image_upload();
```

### Object URL Memory Leak Fix

```typescript
// useRef to track object URLs — cleanup on unmount and when files change
const objectUrlsRef = useRef<Map<File, string>>(new Map())

useEffect(() => {
  return () => {
    // Revoke all object URLs on unmount to prevent memory leaks
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    objectUrlsRef.current.clear()
  }
}, [])

function getObjectUrl(file: File): string {
  if (!objectUrlsRef.current.has(file)) {
    objectUrlsRef.current.set(file, URL.createObjectURL(file))
  }
  return objectUrlsRef.current.get(file)!
}
```

### Client-Side Image Compression (TODO — Not Yet Integrated)

```typescript
// Install: pnpm add browser-image-compression
import imageCompression from 'browser-image-compression'

const options = {
  maxSizeMB: 1,           // Max 1MB after compression
  maxWidthOrHeight: 1920, // Resize to max 1920px
  useWebWorker: true,     // Non-blocking
  fileType: 'image/webp', // Convert to WebP for ~30% smaller than JPEG
}

const compressedFile = await imageCompression(file, options)
// Then upload compressedFile instead of file
```

---

## 7. Stripe: Subscriptions + Connect

### Platform Architecture

```
TenantFlow (Platform)
  ├── Stripe Platform Account (your stripe account)
  │   ├── Subscriptions: Landlords pay TenantFlow for access
  │   └── Connected Accounts: Express accounts for rent collection
  │
  └── Connected Accounts (each landlord)
      └── Destination Charges: Tenant rent → platform → landlord
```

### Landlord Onboarding: Express Connected Account

```typescript
// Step 1: Create Express account
const account = await stripe.accounts.create({
  controller: {
    fees: { payer: 'application' },        // Platform pays Stripe fees
    losses: { payments: 'application' },   // Platform bears losses
    stripe_dashboard: { type: 'express' }, // Landlord gets Express Dashboard
  },
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
    us_bank_account_ach_payments: { requested: true },
  },
  email: landlord.email,
  country: 'US',
});
// Save account.id as landlord.stripeAccountId

// Step 2: Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: landlord.stripeAccountId,
  refresh_url: `${APP_URL}/landlord/stripe/refresh`,
  return_url: `${APP_URL}/landlord/stripe/return`,
  type: 'account_onboarding',
  collection_options: { fields: 'eventually_due' },
});
// Redirect landlord to accountLink.url (single-use, expires quickly)

// Step 3: Handle return URL — check actual status, not just return
const account = await stripe.accounts.retrieve(landlord.stripeAccountId)
if (account.charges_enabled && account.payouts_enabled) {
  // Fully onboarded
} else {
  // Generate new account link for completion
}
```

### Destination Charge: Rent Collection

```typescript
// Landlord receives rent, platform takes fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: 200000,                    // $2,000.00 in cents
  currency: 'usd',
  customer: tenant.stripeCustomerId,
  payment_method: tenant.savedPaymentMethodId,
  payment_method_types: ['us_bank_account'], // ACH
  confirm: true,

  // Platform fee: 2.5% = $50
  application_fee_amount: 5000,      // $50.00 in cents

  // Route funds to landlord's connected account
  transfer_data: {
    destination: landlord.stripeAccountId, // 'acct_xxxxx'
  },

  metadata: {
    tenantId: tenant.id,
    landlordId: landlord.id,
    propertyId: property.id,
    leaseId: lease.id,
    rentMonth: '2026-02',
  },
})
```

**Money flow:**
- Tenant pays $2,000 → Platform account
- Platform transfers $2,000 to landlord account
- Platform extracts $50 fee → platform keeps $50
- Landlord's pending balance: $1,950

### Platform Subscription for Landlords

```typescript
// When landlord upgrades plan
const subscription = await stripe.subscriptions.create({
  customer: landlord.stripeCustomerId,  // Platform customer (different from Connect account)
  items: [{ price: priceId }],          // Price ID from your products
  metadata: {
    userId: landlord.userId,
    planName: 'growth',
  },
  trial_period_days: 14,                // Free trial
})
```

### Property Limit Guard

```typescript
@Injectable()
export class PropertyLimitGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const userId = req.user.id

    // Check current subscription plan
    const { data: sub } = await this.supabase.getAdminClient()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single()

    const limit = PLAN_LIMITS[sub?.plan ?? 'free'].properties
    if (limit === -1) return true  // Unlimited

    // Count active properties (must filter soft-deleted)
    const { count } = await this.supabase.getAdminClient()
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .neq('status', 'inactive')

    if ((count ?? 0) >= limit) {
      throw new ForbiddenException(
        `Property limit reached. Upgrade to ${getNextPlan(sub?.plan)} to add more.`
      )
    }

    return true
  }
}
```

### Webhook Processing (BullMQ Queue)

```typescript
// Webhook controller: validate → enqueue → acknowledge immediately
@Post('webhooks/stripe')
async handleWebhook(@Headers('stripe-signature') sig: string, @Body() rawBody: Buffer) {
  let event: Stripe.Event
  try {
    event = this.stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    throw new BadRequestException('Invalid webhook signature')
  }

  // Enqueue for async processing — don't block the webhook response
  await this.webhookQueue.add(event.type, event, {
    jobId: event.id,        // Idempotency: Stripe may retry, same ID = deduplicated
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })

  return { received: true }  // Respond 200 to Stripe within 30 seconds
}

// Queue processor handles events asynchronously
@Processor('stripe-webhooks')
export class StripeWebhookProcessor {
  @Process('payment_intent.succeeded')
  async handlePaymentSucceeded(job: Job<Stripe.PaymentIntentSucceededEvent>) {
    const paymentIntent = job.data.data.object
    const { leaseId, tenantId } = paymentIntent.metadata

    await this.supabase.getAdminClient()
      .from('rent_payments')
      .update({ status: 'succeeded', paid_date: new Date().toISOString() })
      .eq('stripe_payment_intent_id', paymentIntent.id)
  }
}
```

### Critical Webhook Events to Handle

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Mark rent payment succeeded, update lease |
| `payment_intent.payment_failed` | Mark failed, notify tenant, attempt retry |
| `account.updated` | Update landlord's `charges_enabled`, `payouts_enabled` |
| `customer.subscription.created` | Create subscription record, set plan limits |
| `customer.subscription.updated` | Update plan, adjust property limits |
| `customer.subscription.deleted` | Downgrade to free tier, enforce limits |
| `invoice.payment_succeeded` | Record successful subscription payment |
| `invoice.payment_failed` | Suspend account if payment fails N times |

---

## 8. Automated Rent Collection

### ACH Setup Flow (Stripe Financial Connections)

```typescript
// 1. Create SetupIntent for saving bank account
const setupIntent = await stripe.setupIntents.create({
  customer: tenant.stripe_customer_id,
  payment_method_types: ['us_bank_account'],
  payment_method_options: {
    us_bank_account: {
      financial_connections: {
        permissions: ['payment_method', 'balances'],
      },
    },
  },
})

// 2. Frontend: collect bank account
const { setupIntent: si } = await stripe.collectBankAccountForSetup({
  clientSecret: clientSecret,
  params: {
    payment_method_type: 'us_bank_account',
    payment_method_data: {
      billing_details: { name: accountHolderName, email: tenantEmail },
    },
  },
})

// 3. After tenant confirms NACHA mandate, save payment method
// NACHA mandate text (REQUIRED by law):
// "By clicking confirm, you authorize [Company] to debit your bank account
//  on or after [due date] each month for the rent amount in your lease."

// 4. Monthly charge (off-session)
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(lease.monthly_rent * 100),
  currency: 'usd',
  customer: tenant.stripe_customer_id,
  payment_method: tenant.stripe_payment_method_id,
  payment_method_types: ['us_bank_account'],
  confirm: true,
  off_session: true,
  application_fee_amount: platformFeeAmount,
  transfer_data: { destination: landlord.stripeAccountId },
  metadata: { lease_id: lease.id, billing_period: '2026-02' },
})
// NOTE: ACH takes 2-5 business days to settle
// PaymentIntent status = 'processing' until settlement
```

### Rent Due Date Logic

```typescript
// Grace period + business day adjustment
function getEffectiveDueDate(year: number, month: number, dayOfMonth: number): Date {
  let dueDate = new Date(year, month - 1, dayOfMonth)
  // Shift forward if falls on weekend or federal holiday
  while (isWeekend(dueDate) || isFederalHoliday(dueDate)) {
    dueDate.setDate(dueDate.getDate() + 1)
  }
  return dueDate
}

function isRentLate(paymentDate: Date, dueDate: Date, gracePeriodDays: number): boolean {
  const graceEnd = new Date(dueDate)
  graceEnd.setDate(graceEnd.getDate() + gracePeriodDays)
  return paymentDate > graceEnd
}
// Standard: Due 1st, 5-day grace → late fee posts 6th
```

### Late Fee Processing

```typescript
// Cron job runs nightly to check for late payments
async function processLateFees() {
  const today = new Date()

  // Find all active leases where rent is overdue
  const { data: overdueLeases } = await supabase.getAdminClient()
    .from('leases')
    .select('*, units(properties(owner_user_id))')
    .eq('lease_status', 'active')
    .eq('auto_pay_enabled', false)  // Manual pay leases only

  for (const lease of overdueLeases) {
    const dueDate = getEffectiveDueDate(today.getFullYear(), today.getMonth() + 1, lease.payment_day)
    const gracePeriodEnd = new Date(dueDate)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + lease.late_fee_days)

    if (today > gracePeriodEnd) {
      // Check if late fee already charged this month
      const { data: existingFee } = await supabase.getAdminClient()
        .from('rent_payments')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('period_start', dueDate.toISOString().split('T')[0])
        .eq('status', 'late_fee')
        .single()

      if (!existingFee) {
        await chargeLateFee(lease)
        await notifyTenantOfLateFee(lease)
      }
    }
  }
}
```

### ACH Test Numbers (Stripe Sandbox)

| Routing | Account | Behavior |
|---------|---------|----------|
| `110000000` | `000123456789` | Succeeds |
| `110000000` | `000111111113` | Account closed (R02) |
| `110000000` | `000222222227` | Insufficient funds (R01) |
| `110000000` | `000333333335` | Debits not authorized (R10) |

---

## 9. Frontend Patterns

### TanStack Query: `queryOptions()` Factory Pattern

```typescript
// hooks/api/query-keys/property-keys.ts
export const propertyQueries = {
  all: () => ['properties'] as const,
  lists: () => [...propertyQueries.all(), 'list'] as const,

  list: (filters?: PropertyFilters) =>
    queryOptions({
      queryKey: [...propertyQueries.lists(), filters],
      queryFn: () => fetchProperties(filters),
      staleTime: QUERY_CACHE_TIMES.STANDARD,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...propertyQueries.all(), 'detail', id],
      queryFn: () => fetchProperty(id),
      enabled: !!id,
    }),
}

// Usage (fully type-safe, works with useQuery, useSuspenseQuery, prefetchQuery)
const { data } = useQuery(propertyQueries.detail(id))
const { data } = useSuspenseQuery(propertyQueries.list({ status: 'active' }))
queryClient.prefetchQuery(propertyQueries.detail(id))
```

### Error Handling with `ApiError`

```typescript
// api-request.ts
export class ApiError extends Error {
  get isClientError(): boolean { return this.status >= 400 && this.status < 500 }
  get isServerError(): boolean { return this.status >= 500 }
  get isRetryable(): boolean { return this.isServerError || this.isNetworkError }
  get isAuthError(): boolean { return this.status === 401 || this.status === 403 }
}

// TanStack Query retry strategy
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false
  if (isApiError(error) && error.isClientError) return false  // Never retry 4xx
  return true
}

// Global 401 handler (missing — should add)
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        supabase.auth.signOut()
        router.push('/login')
      }
    }
  })
})
```

### State Management Rules

| State Type | Tool | Where |
|-----------|------|-------|
| Server state | TanStack Query `useQuery`/`useMutation` | `hooks/api/` |
| Global UI state | Zustand | `stores/` |
| Form state | TanStack Form with Zod | Component-level |
| URL state | `nuqs` `useQueryState` | Component-level |

```typescript
// ❌ WRONG: useState for server data
const [properties, setProperties] = useState([])
useEffect(() => { fetchProperties().then(setProperties) }, [])

// ✅ CORRECT
const { data: properties } = useProperties()       // Server state
const theme = useAppStore(state => state.theme)     // UI state
const [search, setSearch] = useQueryState('search') // URL state
```

### Next.js 15 App Router Decisions

```typescript
// Server Components by default — no 'use client' unless needed
// 'use client' required for: hooks (useState, useEffect), event handlers, browser APIs

// Server Component: prefetch for immediate data
// TanStack Query: prefetch + HydrationBoundary
async function PropertiesPage() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery(propertyQueries.list())

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PropertiesList />  {/* client component, hydrates instantly */}
    </HydrationBoundary>
  )
}

// Streaming with Suspense
function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
      <Suspense fallback={<PropertiesListSkeleton />}>
        <PropertiesList />
      </Suspense>
    </div>
  )
}
```

### Zustand v5 Patterns

```typescript
// stores/app-store.ts
interface AppStore {
  dataDensity: 'compact' | 'comfortable' | 'spacious'
  setDataDensity: (density: AppStore['dataDensity']) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      dataDensity: 'comfortable',
      setDataDensity: (dataDensity) => set({ dataDensity }),
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: 'tenantflow-app-store' }
  )
)

// Usage: always select specific slice (prevents unnecessary re-renders)
const dataDensity = useAppStore(state => state.dataDensity)
```

### TanStack Table v8 for Data Tables

```typescript
// Pattern for server-side pagination + filtering
const table = useReactTable({
  data: properties ?? [],
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),

  // Server-side: pagination state controlled externally
  manualPagination: true,
  pageCount: Math.ceil(totalCount / pageSize),
  state: { pagination: { pageIndex, pageSize }, sorting, columnFilters },
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
})

// Server-side pagination with Supabase
const { data, count } = await supabase
  .from('properties')
  .select('*', { count: 'exact' })  // { count: 'exact' } required for total
  .neq('status', 'inactive')
  .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)
// ALWAYS use `count` from response, NEVER `data.length` for pagination totals
```

---

## 10. Financial Reporting

### Core Metrics

```
NOI = Potential Rental Income - Vacancy Losses - Operating Expenses
      (Excludes: mortgage, depreciation, capital improvements)

Cap Rate = NOI / Property Market Value

Vacancy Rate = (Vacant Units / Total Units) × 100

Collection Rate = Total Collected / Total Potential Rent × 100
```

### Key SQL Queries

```sql
-- Rent Roll: all units with occupancy and outstanding balance
SELECT
  p.name                          AS property_name,
  u.unit_number,
  u.rent_amount / 100.0           AS scheduled_rent,
  l.rent_amount / 100.0           AS actual_rent,
  l.start_date, l.end_date,
  l.lease_status,
  CASE WHEN l.id IS NOT NULL AND l.lease_status = 'active'
       THEN 'occupied' ELSE 'vacant' END  AS occupancy_status,
  CONCAT(t.first_name, ' ', t.last_name) AS tenant_name,
  COALESCE(
    (SELECT SUM(rp.amount)/100.0 FROM rent_payments rp
     WHERE rp.lease_id = l.id AND rp.status IN ('pending', 'failed')),
    0
  )                               AS outstanding_balance_usd
FROM properties p
JOIN units u ON u.property_id = p.id
LEFT JOIN leases l ON l.unit_id = u.id AND l.lease_status = 'active'
LEFT JOIN tenants t ON t.id = l.primary_tenant_id
WHERE p.owner_user_id = $1
ORDER BY p.name, u.unit_number;

-- Monthly NOI with running totals (window functions)
WITH monthly AS (
  SELECT
    date_trunc('month', rp.paid_date)::date  AS month,
    SUM(rp.amount) / 100.0                   AS revenue,
    0                                         AS expenses
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  JOIN units u ON l.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE p.owner_user_id = $1
    AND rp.status = 'succeeded'
    AND rp.paid_date >= now() - interval '12 months'
  GROUP BY 1
)
SELECT
  month,
  revenue,
  expenses,
  revenue - expenses                         AS noi,
  SUM(revenue - expenses) OVER (
    ORDER BY month ROWS UNBOUNDED PRECEDING
  )                                          AS cumulative_noi
FROM monthly
ORDER BY month;

-- Occupancy rate by property
SELECT
  p.name,
  COUNT(u.id)                                         AS total_units,
  COUNT(l.id) FILTER (WHERE l.lease_status = 'active') AS occupied_units,
  ROUND(
    COUNT(l.id) FILTER (WHERE l.lease_status = 'active')::numeric
    / NULLIF(COUNT(u.id), 0) * 100, 2
  )                                                   AS occupancy_rate
FROM properties p
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN leases l ON l.unit_id = u.id
WHERE p.owner_user_id = $1
GROUP BY p.id, p.name
ORDER BY occupancy_rate DESC;
```

### Schedule E Tax Categories

```typescript
// Tax categories for US rental property (Schedule E)
export const SCHEDULE_E_CATEGORIES = [
  'advertising',
  'auto_and_travel',
  'cleaning_and_maintenance',
  'commissions',
  'insurance',
  'legal_and_professional_fees',
  'management_fees',
  'mortgage_interest',
  'other_interest',
  'repairs',
  'supplies',
  'taxes',
  'utilities',
  'depreciation',
  'other',
] as const
```

### Missing Schema Fields for Financial Reporting

Currently missing from the schema and needed for complete financial reporting:

1. `properties.market_value NUMERIC(12,2)` — for cap rate calculation
2. `expenses` table with `category`, `is_capital_improvement`, `receipt_url`
3. `expense_categories` mapped to Schedule E categories
4. Monthly `financial_snapshots` table for historical trend tracking

---

## 11. Playwright E2E Testing

### Auth Architecture: API-Based (Not UI-Based)

```
setup-owner (auth-api.setup.ts)
  → POST /auth/v1/token?grant_type=password  (direct Supabase API)
  → Get access_token + refresh_token
  → Base64URL encode session JSON
  → Chunk at 3180 bytes (matches @supabase/ssr format)
  → Write cookies + localStorage to playwright/.auth/owner.json
  → This file = storageState

setup-tenant (depends on setup-owner)
  → POST /auth/v1/invite (admin creates tenant invite)
  → POST /auth/v1/token (tenant sets password)
  → Write playwright/.auth/tenant.json

owner project   → uses storageState: OWNER_AUTH_FILE
tenant project  → uses storageState: TENANT_AUTH_FILE
chromium project → uses storageState: OWNER_AUTH_FILE
```

### Cookie Encoding: The Critical Detail

`@supabase/ssr` uses Base64URL encoding with chunking — NOT raw JSON:

```typescript
// auth-api.setup.ts
const jsonSession = JSON.stringify(session)
const base64UrlSession = Buffer.from(jsonSession)
  .toString('base64')
  .replace(/\+/g, '-')    // Base64URL: + → -
  .replace(/\//g, '_')    // Base64URL: / → _
  .replace(/=/g, '')      // Base64URL: remove padding
const encodedSession = `base64-${base64UrlSession}`  // Prefix required

// Chunk at 3180 bytes (must match what @supabase/ssr writes)
const CHUNK_SIZE = 3180
const chunks: string[] = []
for (let i = 0; i < encodedSession.length; i += CHUNK_SIZE) {
  chunks.push(encodedSession.slice(i, i + CHUNK_SIZE))
}

// Write cookies for each chunk
const cookies = chunks.map((chunk, i) => ({
  name: i === 0 ? AUTH_COOKIE_NAME : `${AUTH_COOKIE_NAME}.${i}`,
  value: chunk,
  domain: 'localhost',
  path: '/',
  httpOnly: false,
  secure: false,
  sameSite: 'Lax' as const,
}))
```

If you write raw JSON as the cookie value (without Base64URL + `base64-` prefix + chunking), the Next.js middleware will not recognize the session and will redirect every test to `/login`.

### storageState File Structure

```json
{
  "cookies": [
    {
      "name": "sb-bshjmbshupiibfiewpxb-auth-token.0",
      "value": "base64-eyJhY2Nlc3...",
      "domain": "localhost",
      "path": "/",
      "expires": 1739999999,
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "http://localhost:3050",
      "localStorage": [
        {
          "name": "sb-bshjmbshupiibfiewpxb-auth-token",
          "value": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}"
        }
      ]
    }
  ]
}
```

Cookies = SSR/middleware reads. localStorage = browser-side Supabase client reads. Both must be set.

### Double-Auth Loop Bug (Fixed)

**Symptom**: Test times out looking for login form that never appears.

**Cause**: `storageState` already injects auth cookies before test starts. When `loginAsOwner(page)` navigates to `/login`, middleware detects the valid session and redirects to `/dashboard`. The login form never appears, causing `waitForURL(/login/)` or `getByLabel(/email/)` to time out.

**Fix**: Never call `loginAsOwner()` in `test.beforeEach()` when the test project already uses `storageState`.

```typescript
// ❌ WRONG
test.beforeEach(async ({ page }) => {
  await loginAsOwner(page)  // Causes double-auth loop
})

// ✅ CORRECT
// No beforeEach needed — the project's storageState handles auth
// Comment in the test file explaining why:
// "No beforeEach login needed — storageState: OWNER_AUTH_FILE is injected
//  by the chromium project config before every test. Adding loginAsOwner()
//  here causes a double-auth loop."
```

### Playwright Config Pattern

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup-owner',
      testMatch: /auth-api\.setup\.ts/,
      retries: 2,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: OWNER_AUTH_FILE,
      },
      dependencies: ['setup-owner'],
      testMatch: ['**/owner/**/*.spec.ts'],
    },
  ],
})
```

### Test Organization

```
apps/e2e-tests/
├── tests/
│   ├── auth-api.setup.ts       # API-based auth setup (fast, reliable)
│   ├── auth-tenant.setup.ts    # Tenant auth setup
│   ├── owner/                  # Owner-facing tests
│   │   ├── properties/
│   │   │   └── property-creation.spec.ts
│   │   │   └── property-image-upload.spec.ts
│   │   ├── leases/
│   │   └── dashboard/
│   └── tenant/                 # Tenant-facing tests
├── auth-helpers.ts             # Helper functions (use API auth, not UI)
└── playwright.config.ts
```

---

## 12. NestJS Module Architecture

### Module Structure Rules

```
One domain = One module
Each module owns: controller + service + DTOs + sub-services
Module imports only what it needs (no "import everything" patterns)
SharedModule = @Global() for cross-cutting concerns (auth, database, config)
```

### Guard Execution Order (CRITICAL)

Guards run in declaration order. This order must be followed:

```typescript
@UseGuards(
  ThrottleGuard,          // 1. Rate limiting first (prevents abuse before auth)
  JwtAuthGuard,           // 2. Auth (401 if no token)
  SubscriptionGuard,      // 3. Subscription check (403 if plan expired)
  PropertyLimitGuard,     // 4. Feature limits (403 if limit exceeded)
  RolesGuard,             // 5. Role check last (403 if wrong role)
)
```

### Controller Route Order (CRITICAL)

NestJS matches routes top-to-bottom — first match wins. Static routes must come before dynamic routes:

```typescript
@Controller('properties')
export class PropertiesController {
  @Get('stats')      // ✅ Static route FIRST
  getStats() {}

  @Get('export')     // ✅ Static route SECOND
  exportCsv() {}

  @Get(':id')        // ✅ Dynamic route LAST
  findOne(@Param('id') id: string) {}
}
// ❌ If :id came first, /properties/stats would match with id='stats'
```

### Service Pattern: Never Use Admin Client Without User ID Filter

```typescript
// ✅ CORRECT: User client (RLS enforces isolation)
async findAll(userId: string, token: string) {
  const client = this.supabase.getUserClient(token)
  return client.from('properties').select('*').neq('status', 'inactive')
}

// ✅ CORRECT: Admin client WITH explicit user filter
async findAll(userId: string) {
  return this.supabase.getAdminClient()
    .from('properties')
    .select('*')
    .eq('owner_user_id', userId)   // REQUIRED — admin bypasses RLS
    .neq('status', 'inactive')
}

// 🚨 WRONG: Admin client without user filter = data leak
async findAll() {
  return this.supabase.getAdminClient()
    .from('properties')
    .select('*')  // Returns ALL properties from ALL users!
}
```

### Zod DTO Pattern (Single Source of Truth)

```typescript
// packages/shared/src/validation/properties.ts
export const propertyCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address_line1: z.string().min(1, 'Address is required'),
  city: z.string().min(1),
  state: z.string().length(2, 'Use 2-letter state code'),
  postal_code: z.string().min(5),
  property_type: propertyTypeSchema,
  address_line2: z.string().optional(),
  country: z.string().default('US'),
})

// apps/backend/src/modules/properties/dto/create-property.dto.ts
export class CreatePropertyDto extends createZodDto(propertyCreateSchema) {}

// Frontend: same schema for form validation
import { propertyCreateSchema } from '@repo/shared/validation/properties'
const form = useForm({ validators: { onChange: propertyCreateSchema } })
```

---

## 13. Deployment: Vercel + Railway

### Vercel (Frontend)

```json
// vercel.json
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@repo/frontend",
  "outputDirectory": "apps/frontend/.next",
  "framework": "nextjs",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

**Environment variables scoped by Vercel environment:**
- Production: connects to production Supabase project
- Preview: connects to staging Supabase project (or Supabase Branch per PR)
- Development: local Supabase via `vercel env pull`

**Edge Middleware limits:**
- Max 5 KB per individual env variable (middleware is edge-deployed)
- Only `NEXT_PUBLIC_*` variables accessible in middleware without config

### Railway (Backend)

```toml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
healthcheckPath = "/health/ping"
healthcheckTimeout = 120
overlapSeconds = 10       # Zero-downtime deploys
drainingSeconds = 30      # In-flight requests complete before shutdown
restartPolicyType = "ALWAYS"
restartPolicyMaxRetries = 5
```

**Dockerfile: 4-stage multi-stage build**
1. `base`: Node 24 Alpine + build tools
2. `deps`: pnpm install with cache mount
3. `build`: TypeScript compilation via Turbo
4. `runtime`: Minimal Alpine, production deps only, non-root user

### Health Check Endpoint

```typescript
// apps/backend/src/modules/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get('ping')
  @HttpCode(200)
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  async readiness() {
    // Check database connectivity
    const { error } = await this.supabase.getAdminClient()
      .from('properties')
      .select('id')
      .limit(1)

    if (error) throw new ServiceUnavailableException('Database unavailable')
    return { status: 'ready' }
  }
}
```

---

## 14. Pricing Strategy

### Competitor Landscape

| Platform | Model | Entry Price | Target |
|---------|-------|------------|--------|
| AppFolio | Per unit ($1.40) + $280 min | ~$280/mo | 200+ units |
| Buildium | Flat tiers | $58/mo | SMB managers |
| TurboTenant | Freemium + tenant fees | Free | Independent landlords |
| Innago | Free to landlords | Free | All sizes |
| Rentec Direct | Flat + per unit | $35/mo | 5-25 units |
| Avail | Free + $9/unit/mo premium | Free | 1-10 units |

### Recommended TenantFlow Pricing

```
FREE (up to 3 units)
├── Listings
├── Online applications
├── Basic tenant portal
├── Maintenance request tracking
└── 1 free screening report

STARTER ($29/month — up to 20 units)
├── Everything in Free
├── eSignatures
├── Online rent collection (ACH, 5-day deposits)
├── Automated late fee reminders
└── Basic financial reports

GROWTH ($79/month — unlimited units)
├── Everything in Starter
├── Financial reporting (NOI, cap rate, occupancy)
├── Schedule E export for taxes
├── QuickBooks sync
├── Owner portal (for property managers with clients)
├── Tenant screening discounts
└── Next-day ACH deposits

PRO ($149/month — unlimited units)
├── Everything in Growth
├── Multi-user / team access
├── API access
├── White-label options
├── Priority support
└── Custom lease templates
```

**Transaction fees:**
- Free tier: $2/ACH transaction (charged to landlord)
- Starter+: ACH included, credit cards at 2.9% + $0.30 (Stripe passthrough)
- Never charge a percentage of rent — landlords see it as rent-skimming

**3-unit free cap logic:** Average US landlord owns 2.9 units. Free tier is genuinely useful for most starting landlords. They hit the wall quickly at 4+ units and must upgrade. Those who stay on free become advocates.

---

## 15. Feature Roadmap

### Critical (Blocking — Must Fix First)

1. **Property creation column mismatch** — `owner_user_id` vs `property_owner_id` in `properties.service.ts`
2. **RLS policy audit** — Verify `20260103120000_fix_properties_rls_comprehensive.sql` correctly uses `owner_user_id = (select auth.uid())`

### High Priority (Core Product)

3. **Automated rent collection** — ACH SetupIntent flow, monthly charge cron, Stripe webhooks
4. **Lease digital signatures** — DocuSeal integration or Stripe Identity for e-signatures
5. **Tenant screening** — Background check + income verification integration
6. **Maintenance workflow** — Status updates, photo uploads, vendor assignment

### Medium Priority (Monetization)

7. **Subscription enforcement** — PropertyLimitGuard active in production
8. **Stripe Connect onboarding** — Express account creation + onboarding links
9. **Platform billing** — Subscription webhooks updating plan limits in real time
10. **Financial reporting dashboard** — NOI, cap rate, occupancy charts (Recharts via shadcn/ui)

### Lower Priority (Growth Features)

11. **Document management** — Lease storage, expense receipts, inspection reports
12. **Owner portal** — Multi-client property management companies
13. **Mobile app** — React Native or PWA using same API
14. **Bulk property import** — CSV upload with validation
15. **QuickBooks integration** — Bidirectional sync for accounting

### Architecture Gaps to Address

| Gap | Impact | Solution |
|-----|--------|---------|
| No cross-request auth cache | High latency on first request | Redis cache for `adminClient.auth.getUser()` results (30s TTL) |
| No image compression | Large uploads, slow UI | Integrate `browser-image-compression` library |
| New Stripe Price per subscription | Cost/latency | Cache Price IDs by plan name |
| `expenses` table missing | Can't compute real NOI | Add migration with Schedule E categories |
| `market_value` missing on properties | Can't compute cap rate | Add column to properties migration |
| No pgTAP RLS tests | Silent RLS bugs | Add `supabase-test-helpers` pgTAP suite |

---

## Appendix: Research Agent Coverage

This document synthesizes findings from 54 parallel research agents covering:

| Topic | Agents |
|-------|--------|
| Auth & RLS | a32097f, a53686f, aff0e67, a310de1 |
| Property creation | a9cabdc, a1e864f |
| NestJS architecture | a61fb48, a156ca4, a6af842, a2f71e5 |
| Stripe Connect + Subscriptions | a6e1bcc, addfed8, a33a05a |
| Image upload | a0eaace, acd4243 |
| Financial reporting | a6f9f4d, adeb29a |
| Playwright E2E | aa2db67, aeb0088 |
| TanStack Query/Form | a5b2638, a9a29dc |
| Next.js 15 App Router | a7c5ba1, a05ed0b, a7f8ca1 |
| PostgreSQL triggers | acce755 |
| Deployment | a9b54bb |
| Pricing | a8a1d58 |
| Maintenance | ad9fb2a |
| Notifications | a813031 |
| Shadcn UI | ab0f7fb |
| Zustand v5 | ac04f36 |
| Realtime | af26f1b |
| Leases + Documents | a89ff7e, a7ca39c |
| Tenant onboarding | ac46e0b, ac953b1 |
| Occupancy management | a7c9553 |
| Geographic/mapping | a2e5e13 |
| Compliance/legal | ab64f18 |
| Search/pagination | acc13b7 |
| Mobile | af108f7 |
| Monorepo types | a1c9289 |
| Dashboard analytics | afcb14d |
| SaaS onboarding | afc7dfd |
| Subscription limits | a1712eb |
| Industry entities | a24dfab |
| Insurance/utilities | a52a713 |
| Messaging | aa03aa2 |
| Performance/PostgreSQL | a136e63 |
| Edge Functions vs NestJS | af33cbf |
| Property onboarding/bulk import | aea6c45 |
| Overall architecture | acb0784, a0f3855, ae10bb2 |

---

## 16. Email Notifications

### Email Stack: Resend + React Email (Already Implemented)

TenantFlow uses Resend (correct choice for 2025). The architecture in `apps/backend/src/modules/email/`:

```
EmailQueue (BullMQ) → EmailService → EmailRendererService (React Email → HTML) → EmailSenderService (Resend API)
```

### Essential Emails Needed

| Email | Trigger | Priority |
|-------|---------|---------|
| Welcome (owner) | Signup | High |
| Welcome (tenant) | Accepts invitation | High |
| Rent due reminder | 3 days before due date | High |
| Rent overdue | 1 day after grace period | High |
| Payment succeeded | Stripe `payment_intent.succeeded` | High |
| Payment failed | Stripe `payment_intent.payment_failed` | High |
| Lease expiring | 90/60/30 days before end | High |
| Lease activated | Both parties sign | High |
| Maintenance received | Tenant submits request | Medium |
| Maintenance updated | Status change | Medium |

### React Email Template Pattern

```tsx
// apps/backend/src/emails/payment-reminder-email.tsx
import { Body, Button, Container, Html, Preview, Text } from '@react-email/components'

export const PaymentReminderEmail = ({
  tenantName, amount, dueDate, paymentUrl,
}: { tenantName: string; amount: number; dueDate: string; paymentUrl: string }) => (
  <Html>
    <Preview>Rent due reminder — ${(amount / 100).toFixed(2)}</Preview>
    <Body>
      <Container>
        <Text>Hi {tenantName}, your rent of ${(amount / 100).toFixed(2)} is due on {dueDate}.</Text>
        <Button href={paymentUrl}>Pay Now</Button>
      </Container>
    </Body>
  </Html>
)

// Render: const html = await render(PaymentReminderEmail(data))
```

---

## 17. Maintenance Request Management

### Two-Document Architecture

Industry pattern: **Request** (tenant intake) → **Work Order** (manager authorization).

```
Tenant submits Maintenance Request
  → Manager acknowledges (SLA: 24-48 hours)
  → Manager creates Work Order with vendor assignment + budget approval
  → Vendor completes work → uploads photos + invoice
  → Manager verifies completion
  → Request closed, expense recorded, notification sent
```

### Core Tables Needed

```sql
-- maintenance_requests: tenant-facing
create table maintenance_requests (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references properties(id),
  unit_id             uuid references units(id),
  tenant_id           uuid references tenants(id),
  title               text not null,
  description         text not null,
  category            text not null,  -- plumbing, electrical, hvac, appliance, structural, other
  priority            text not null default 'normal',
  status              text not null default 'new',
  permission_to_enter boolean default false,
  internal_notes      text,
  resolution_notes    text,
  submitted_at        timestamptz default now(),
  completed_at        timestamptz,
  constraint maintenance_requests_priority_check
    check (priority in ('emergency', 'urgent', 'high', 'normal', 'low')),
  constraint maintenance_requests_status_check
    check (status in ('new', 'acknowledged', 'in_progress', 'on_hold', 'completed', 'cancelled'))
);

-- work_orders: manager-facing, vendor assignment
create table work_orders (
  id                      uuid primary key default gen_random_uuid(),
  maintenance_request_id  uuid references maintenance_requests(id),
  vendor_id               uuid references vendors(id),
  estimated_total_cost    numeric(10,2),
  actual_total_cost       numeric(10,2),
  owner_approved          boolean default false,
  approved_budget         numeric(10,2),
  status                  text default 'draft',
  scheduled_start         timestamptz,
  completed_at            timestamptz
);

-- vendors: tracked contacts for repair work
create table vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  trade       text,        -- plumber, electrician, general_contractor
  phone       text,
  email       text,
  license_number text,
  insurance_expiry date
);
```

### SLA Response Times by Priority

| Priority | Response SLA | Resolution SLA |
|---------|-------------|----------------|
| Emergency | 1 hour | 4 hours |
| Urgent | 4 hours | 24 hours |
| High | 24 hours | 72 hours |
| Normal | 48 hours | 7 days |
| Low | 5 days | 30 days |

---

## 18. Key Supabase Realtime Patterns

### When to Use Realtime vs TanStack Query Polling

| Use Case | Best Approach |
|---------|--------------|
| Maintenance request status updates | Realtime (tenant waits for manager response) |
| Chat/messaging between landlord and tenant | Realtime |
| Dashboard metrics refresh | TanStack Query polling (5 min interval) |
| Payment status | Webhooks → database update → TanStack Query refetch |
| Lease signing status | Webhooks, not realtime |

### Realtime Subscription Pattern

```typescript
// apps/frontend/src/hooks/use-maintenance-realtime.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

export function useMaintenanceRealtime(propertyId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`maintenance:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'maintenance_requests',
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          // Invalidate maintenance queries when status changes
          queryClient.invalidateQueries({ queryKey: ['maintenance', propertyId] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [propertyId, queryClient, supabase])
}
```

**IMPORTANT**: Realtime subscriptions bypass RLS by default. Use `private` channels with JWT auth or add channel-level RLS when exposing realtime to tenants.
