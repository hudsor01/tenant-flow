# Features Research: Post-Migration Hardening Approaches

**Research date:** 2026-02-23
**Milestone:** v8.0 Post-Migration Hardening

---

## 1. IDOR Prevention in Edge Functions

### Table Stakes (Must-Do)

**Three-zone pattern** — every Edge Function must follow this structure:

```typescript
// Zone 1: Auth — extract and verify JWT
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabase.auth.getUser(token)
if (authError || !user) return errorResponse('Unauthorized', 401)

// Zone 2: Ownership — verify caller owns the resource
const { data: lease } = await supabase
  .from('leases')
  .select('id, owner_user_id')
  .eq('id', leaseId)
  .single()
if (!lease || lease.owner_user_id !== user.id) return errorResponse('Forbidden', 403)

// Zone 3: Action — only now proceed with service-role operations
const { error } = await serviceRoleClient.from('leases').update({ ... }).eq('id', leaseId)
```

**Applies to:**
- `docuseal` — all 5 actions: verify `lease.owner_user_id === user.id`
- `generate-pdf` (lease mode) — verify `lease.owner_user_id === user.id` before PDF generation
- `export-report` — already scoped by RPC user_id param (safe, but add explicit check)
- `stripe-connect` — verify `stripe_connected_accounts.user_id === user.id`

**Testing:** Call each Edge Function with User A's JWT + User B's resource ID → expect 403.

### Differentiators

- Audit log IDOR failures to Sentry (attack pattern detection)
- Rate-limit per-user failed ownership checks (5 failures → temporary block)

---

## 2. PostgREST Search Sanitization

### Table Stakes (Must-Do)

PostgREST parses `.or()` strings as full filter expressions. Special characters that must be stripped:
- `,` — OR operator separator (most dangerous: injects additional filters)
- `;` — AND separator
- `(` `)` — logical grouping
- `.` — column path separator
- `'` `"` — string delimiters

```typescript
// lib/sanitize-postgrest.ts
export function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/[,.()"';]/g, '')  // Strip injection chars
    .trim()
    .substring(0, 200)           // Enforce max length
}

// Usage in query-key files
if (filters?.search) {
  const safe = sanitizePostgrestSearch(filters.search)
  if (safe.length > 0) {
    q = q.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
  }
}
```

**Files requiring sanitization:**
1. `property-keys.ts` — name, city search
2. `tenant-keys.ts` — full_name, email search
3. `unit-keys.ts` — unit number search
4. `use-vendor.ts` — vendor name search

**Testing:** `search = "admin,owner_user_id.eq.other-uuid"` → verify injected clause is stripped.

### Differentiators

- Full-text search via `tsvector` + RPC (eliminates injection risk entirely)
- Zod schema validation of search term before PostgREST call

---

## 3. RLS Write-Path Isolation Testing

### Table Stakes (Must-Do)

```typescript
// Pattern: Two clients, two authenticated users, cross-ownership attempts
const ownerA = createClient(URL, ANON_KEY, { auth: { persistSession: false } })
const ownerB = createClient(URL, ANON_KEY, { auth: { persistSession: false } })

await ownerA.auth.signInWithPassword({ email: OWNER_A_EMAIL, password: OWNER_A_PASS })
await ownerB.auth.signInWithPassword({ email: OWNER_B_EMAIL, password: OWNER_B_PASS })

// INSERT isolation — User B cannot INSERT claiming User A's identity
test('Owner B cannot INSERT with Owner A owner_user_id', async () => {
  const { error } = await ownerB.from('properties').insert({
    name: 'Forged', owner_user_id: OWNER_A_ID, address_line1: '1 Main St'
  })
  expect(error).not.toBeNull()  // RLS WITH CHECK blocks it
})

// UPDATE isolation — User B cannot UPDATE User A's records
test('Owner B cannot UPDATE Owner A property', async () => {
  const { data } = await ownerB.from('properties')
    .update({ name: 'Hijacked' }).eq('id', OWNER_A_PROPERTY_ID).select()
  expect(data).toEqual([])  // Zero rows updated
})

// DELETE isolation
test('Owner B cannot DELETE Owner A property', async () => {
  const { data } = await ownerB.from('properties')
    .delete().eq('id', OWNER_A_PROPERTY_ID).select()
  expect(data).toEqual([])  // Zero rows deleted
})
```

**Coverage matrix** — for all 7 domains: properties, units, tenants, leases, maintenance_requests, vendors, inspections:
- INSERT with forged `owner_user_id` → expect blocked
- UPDATE on other user's record → expect 0 rows affected
- DELETE on other user's record → expect 0 rows affected

**CI/CD:** Requires dedicated integration Supabase project (not production). Add `pull_request` trigger.

---

## 4. Auth Token Caching in TanStack Query

### Table Stakes (Must-Do)

Replace 86 per-query `getUser()` calls with a single cached query:

```typescript
// hooks/api/use-cached-user.ts (NEW)
export const authQueryKeys = {
  user: () => ['auth', 'user'] as const,
}

export function useCachedUser() {
  return useQuery(queryOptions({
    queryKey: authQueryKeys.user(),
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Not authenticated')
      return user
    },
    staleTime: 10 * 60 * 1000,      // 10 minutes
    gcTime: 30 * 60 * 1000,          // 30 minutes
    refetchOnWindowFocus: false,      // Prevent excessive calls
    retry: false,
  }))
}
```

**Migration pattern:**
```typescript
// Before: getUser() in queryFn (every execution)
queryFn: async () => {
  const { data: { user } } = await supabase.auth.getUser()  // Network call!
  return supabase.rpc('get_dashboard', { p_user_id: user?.id })
}

// After: userId passed as parameter, resolved at component level
queryFn: async () => supabase.rpc('get_dashboard', { p_user_id: userId })

// Component:
const { data: user } = useCachedUser()
const { data } = useQuery(dashboardQueries.stats(user?.id!))
```

**Impact:** ~80% reduction in auth network calls. Dashboard mount: 5 parallel queries × 0 auth calls = 0 auth round-trips (vs. 5 currently).

---

## 5. Edge Function Error Response Standardization

### Table Stakes (Must-Do)

```typescript
// supabase/functions/_shared/responses.ts (NEW)
export const corsHeaders = (frontendUrl: string) => ({
  'Access-Control-Allow-Origin': frontendUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

export function errorResponse(message: string, status: number, code?: string): Response {
  return new Response(
    JSON.stringify({ error: message, ...(code ? { code } : {}) }),
    { status, headers: { 'Content-Type': 'application/json' } }
  )
}

export function successResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { 'Content-Type': 'application/json' } }
  )
}
```

**Status code mapping:**

| Situation | Status | Body |
|-----------|--------|------|
| Missing/invalid JWT | 401 | `{ error: 'Unauthorized' }` |
| Ownership check failed | 403 | `{ error: 'Forbidden' }` |
| Invalid params | 400 | `{ error: 'Bad request' }` |
| Third-party service failure | 502 | `{ error: 'Service unavailable' }` |
| Missing env var | 503 | `{ error: 'Not configured' }` |
| Unhandled exception | 500 | `{ error: 'Internal error' }` |

**Current inconsistencies:**
- Stripe-checkout 401: returns plain text `'Unauthorized'` (should be JSON)
- DocuSeal-webhook 400: returns plain text `'Invalid signature'` (should be JSON)
- All functions: `Content-Type` sometimes omitted

---

## 6. Non-Atomic Transaction Workarounds

### Table Stakes (Must-Do)

**Pattern: RPC functions for multi-table operations**

```sql
-- Example: atomic set_default_payment_method
CREATE OR REPLACE FUNCTION set_default_payment_method(
  p_user_id UUID,
  p_payment_method_id UUID
) RETURNS void AS $$
BEGIN
  -- Single atomic UPDATE: set one default, clear all others
  UPDATE payment_methods
  SET is_default = (id = p_payment_method_id)
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Workflows requiring atomicity:**
1. `set_default_payment_method` — clear old default + set new (current: 2 sequential calls)
2. `mark_tenant_moved_out` — update lease status + update unit status
3. `cancel_lease_atomically` — update lease + notify + clear unit

**Edge Function pattern** (external calls + DB update):
1. Call external service first (DocuSeal, Stripe)
2. If success → update DB
3. If DB update fails → compensating call to external service to undo
4. Never partially succeed: return 500 if any step fails so client can retry

---

## 7. CSV Export Safety

### Table Stakes (Must-Do)

```typescript
// lib/csv-utils.ts
export function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '').trim()
  // Formula injection: prefix with single quote
  if (/^[=+\-@\t]/.test(str)) return `'${str}`
  // Wrap in quotes if contains special chars
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Query limit
const EXPORT_LIMIT = 10_000
const { data } = await supabase.from('...').select().limit(EXPORT_LIMIT)
if (data.length === EXPORT_LIMIT) {
  toast.warning(`Export limited to ${EXPORT_LIMIT.toLocaleString()} rows. Apply filters to narrow results.`)
}
```

**Files requiring limit + formula injection fix:**
- `use-payments.ts` — `exportPaymentsCSV()`
- `export-report` Edge Function — `rowsToCsv()`
- Any other client-side CSV generation

---

## Implementation Order

| Priority | Category | Effort | Risk |
|----------|----------|--------|------|
| P0 | IDOR Prevention (DocuSeal, generate-pdf) | 2d | Critical security |
| P0 | Search Sanitization | 1d | Critical security |
| P1 | RLS Write Tests | 3d | Primary security validation |
| P1 | Error Standardization | 2d | Developer experience |
| P2 | Auth Token Caching | 3d | Performance |
| P2 | Non-Atomic Transactions | 3d | Data integrity |
| P2 | CSV Export Safety | 1d | Data safety |
