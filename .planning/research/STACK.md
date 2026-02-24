# Stack Research: Post-Migration Hardening Patterns

**Research date:** 2026-02-23
**Milestone:** v8.0 Post-Migration Hardening

---

## 1. Supabase Deno Edge Function Security Patterns

### Fail-Closed Env Var Validation

```typescript
// ✅ CORRECT: Fail immediately if secret missing
const webhookSecret = Deno.env.get('DOCUSEAL_WEBHOOK_SECRET')
if (!webhookSecret) {
  return new Response(
    JSON.stringify({ error: 'Webhook endpoint not configured' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  )
}
```

Current DocuSeal webhook uses fail-open pattern (warns but continues). All Edge Functions use `?? ''` fallback — initializes Stripe SDK with empty key.

### CORS Restriction Pattern

```typescript
// ✅ Browser-facing functions: restrict to FRONTEND_URL
const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'
const corsHeaders = {
  'Access-Control-Allow-Origin': frontendUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ Webhook endpoints (stripe-webhooks, docuseal-webhook): NO CORS headers
// They are server-to-server only — browser CORS headers are meaningless and confusing
```

### IDOR Ownership Check Pattern

```typescript
// After JWT validation, verify ownership before service-role operations
const { data: { user } } = await supabase.auth.getUser(token)
if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

// Fetch with user client (not service role) to verify ownership via RLS
const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})
const { data: lease } = await userSupabase
  .from('leases')
  .select('id, owner_user_id')
  .eq('id', leaseId)
  .single()

if (!lease) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
// Then use service role for actual mutation
```

---

## 2. PostgREST Filter Injection Sanitization

### What PostgREST Actually Parses

PostgREST v12 (Supabase default) parses `.or()` strings as full filter expressions. Dangerous characters:
- `,` — operator separator (most dangerous: injects additional filters)
- `(` `)` — logical grouping
- `.` — column path separator
- `;` — statement terminator
- `'` `"` — string delimiters

### Sanitization Pattern

```typescript
function sanitizePostgrestSearch(input: string): string {
  // Remove characters that PostgREST treats as filter operators
  return input.replace(/[,.()"'\\;]/g, '').trim()
}

// Usage
if (filters?.search) {
  const safe = sanitizePostgrestSearch(filters.search)
  if (safe.length > 0) {
    q = q.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
  }
}
```

### Files to Fix
- `property-keys.ts` — `.or()` with name/city search
- `tenant-keys.ts` — tenant search
- `unit-keys.ts` — unit search
- `use-vendor.ts` — vendor search

---

## 3. RLS Write-Path Integration Test Patterns

### Test Infrastructure

```typescript
import { createClient } from '@supabase/supabase-js'

// Two separate clients, different authenticated users
const ownerAClient = createClient(URL, ANON_KEY, { auth: { persistSession: false } })
const ownerBClient = createClient(URL, ANON_KEY, { auth: { persistSession: false } })

beforeAll(async () => {
  await ownerAClient.auth.signInWithPassword({ email: OWNER_A_EMAIL, password: OWNER_A_PASS })
  await ownerBClient.auth.signInWithPassword({ email: OWNER_B_EMAIL, password: OWNER_B_PASS })
})
```

### INSERT Isolation Test Pattern

```typescript
test('Owner B cannot INSERT row claiming Owner A identity', async () => {
  const { error } = await ownerBClient
    .from('properties')
    .insert({ name: 'Forged Property', owner_user_id: OWNER_A_ID, address_line1: '123 Main' })

  expect(error).not.toBeNull()
  // RLS WITH CHECK fails: auth.uid() !== owner_user_id
})
```

### UPDATE Isolation Test Pattern

```typescript
test('Owner B cannot UPDATE Owner A property', async () => {
  const { error, data } = await ownerBClient
    .from('properties')
    .update({ name: 'Hijacked' })
    .eq('id', OWNER_A_PROPERTY_ID)
    .select()

  // PostgREST returns empty result set (not 403) for SELECT/UPDATE via RLS
  expect(data).toEqual([])  // Zero rows updated — RLS filtered them out
})
```

### DELETE Isolation Test Pattern

```typescript
test('Owner B cannot DELETE Owner A property', async () => {
  const { error, data } = await ownerBClient
    .from('properties')
    .delete()
    .eq('id', OWNER_A_PROPERTY_ID)
    .select()

  expect(data).toEqual([])  // Zero rows deleted
})
```

### CI/CD: Dedicated Integration Project

- Use separate Supabase project (not production) for RLS tests
- Secrets: `INTEGRATION_SUPABASE_URL`, `INTEGRATION_SUPABASE_ANON_KEY`, `INTEGRATION_SUPABASE_SERVICE_ROLE_KEY`
- Add `pull_request` trigger (not just `push: [main]`)

---

## 4. Deno Dependency Pinning (deno.json Import Maps)

### Create supabase/functions/deno.json

```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2.45.0",
    "stripe": "npm:stripe@14.27.0"
  }
}
```

Replace all occurrences of:
- `'https://esm.sh/@supabase/supabase-js@2'` → `'supabase'`
- `'npm:stripe@14'` → `'stripe'`

### Why This Matters

Without pinning, `@2` resolves to latest 2.x patch on every cold start. A breaking 2.x patch would affect all Edge Functions simultaneously. The deno.json import map is the Deno-recommended pattern.

---

## 5. TanStack Query Auth Caching

### Problem

86 occurrences of `supabase.auth.getUser()` across 23 hook files — each is a network call to validate the JWT server-side. Dashboard with 5 parallel queries = 5 auth round-trips on mount.

### Solution: `useCachedUser()` Hook

```typescript
// apps/frontend/src/hooks/api/use-cached-user.ts
import { queryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'

export const authQueryKeys = {
  user: () => ['auth', 'user'] as const,
}

export function cachedUserQuery() {
  return queryOptions({
    queryKey: authQueryKeys.user(),
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Not authenticated')
      return user
    },
    staleTime: 10 * 60 * 1000,   // 10 minutes
    gcTime: 30 * 60 * 1000,       // 30 minutes
    refetchOnWindowFocus: false,   // No extra calls on tab focus
  })
}

export function useCachedUser() {
  return useQuery(cachedUserQuery())
}
```

### Migration Pattern for Query Functions

```typescript
// Before: getUser() inside every queryFn
queryFn: async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return supabase.rpc('get_dashboard_stats', { p_user_id: user?.id })
}

// After: userId passed as parameter, resolved once at component level
queryFn: async ({ userId }: { userId: string }) => {
  const supabase = createClient()
  return supabase.rpc('get_dashboard_stats', { p_user_id: userId })
}

// In component:
const { data: user } = useCachedUser()
const { data } = useQuery(dashboardQueries.stats(user?.id!))
```

### Auth Store Integration

`auth-provider.tsx` already populates `['auth', 'user']` via `onAuthStateChange`. The `useCachedUser()` hook reads from the same key — zero additional network calls when auth store is initialized.

---

## 6. Stripe SDK Upgrade (@14 → @17)

**Recommendation: Defer to post-v8.0 milestone.**

- `stripe@14` is stable, tested in production
- Breaking changes @14→@17 are minimal (types only)
- Security fixes in v8.0 don't depend on Stripe version
- `constructEventAsync()` signature unchanged across versions

When upgrading: update `deno.json` import to `npm:stripe@17.18.0`, re-run Stripe integration tests. Estimated 2 hours, no breaking changes expected.

---

## Version Reference (Current as of 2026-02-23)

| Package | Current in Use | Latest Stable | Action |
|---------|---------------|---------------|--------|
| `@supabase/supabase-js` | `@2` (unpinned) | `@2.45.0` | Pin to `@2.45.0` |
| `stripe` | `@14` (unpinned) | `@17.18.0` | Pin to `@14.27.0` for now |
| `@tanstack/react-query` | `v5.90.21` | `v5.90.x` | No change needed |
| Deno runtime | Edge Functions default | 2.x | No change needed |
