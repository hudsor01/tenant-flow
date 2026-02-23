# Phase 2: Security & Performance Review

## Security Findings

### CRITICAL

**SEC-01: DocuSeal Webhook Fail-Open — Unauthenticated Lease Manipulation**
CVSS 9.1 | CWE-306 | OWASP A07
File: `supabase/functions/docuseal-webhook/index.ts`
If `DOCUSEAL_WEBHOOK_SECRET` is not set (common in staging, after env var rotation failures), the webhook processes all requests unauthenticated. Uses service role key (bypasses RLS). Anyone can POST to flip any lease status to `active`, forge `owner_signed_at` / `tenant_signed_at`.
Fix: Fail-closed — return 503 if secret not configured:
```typescript
const webhookSecret = Deno.env.get('DOCUSEAL_WEBHOOK_SECRET')
if (!webhookSecret) {
  return new Response(JSON.stringify({ error: 'Webhook endpoint not configured' }), { status: 503 })
}
```

**SEC-02: DocuSeal Edge Function Missing Ownership Authorization (IDOR)**
CVSS 8.1 | CWE-639, CWE-862 | OWASP A01
File: `supabase/functions/docuseal/index.ts` (all action handlers)
Authenticates the caller's JWT but never checks whether the user owns or is a party to the lease. All DB operations use service role key (bypasses RLS). Any authenticated user can send any lease for signature, sign any lease as owner or tenant, cancel or resend for any lease.
PoC: Owner B with a valid JWT calls `{ action: 'sign-owner', leaseId: 'owner-a-lease-uuid' }` → succeeds.
Fix: After JWT validation, verify ownership before any action:
```typescript
const { data: lease } = await supabase.from('leases').select('id, owner_user_id, primary_tenant_id').eq('id', leaseId).single()
if (['send-for-signature', 'sign-owner', 'cancel', 'resend'].includes(action) && lease.owner_user_id !== user.id) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
}
```

**SEC-03: PostgREST Filter Injection via Unsanitized Search Input**
CVSS 7.5 | CWE-943 | OWASP A03
Files: `property-keys.ts`, `tenant-keys.ts`, `unit-keys.ts`, `use-vendor.ts`
User-controlled strings interpolated directly into PostgREST `.or()` filter expressions. PostgREST parses the full string — injected clauses (commas, operator prefixes) are honored. RLS provides secondary defense but injection can bypass application-level filters and probe schema.
PoC: Search `%,owner_user_id.neq.00000000-0000-0000-0000-000000000000` modifies query semantics.
Fix: Sanitize all search inputs before PostgREST interpolation:
```typescript
function sanitizePostgrestSearch(input: string): string {
  return input.replace(/[,.()"'\\]/g, '').trim()
}
```

### HIGH

**SEC-04: generate-pdf Edge Function IDOR via leaseId**
CVSS 6.5 | CWE-639 | OWASP A01
File: `supabase/functions/generate-pdf/index.ts`
Accepts `{ leaseId }` from any authenticated user, fetches full lease details (rent, deposit, tenant/owner names, addresses) using service role key with no ownership check. Any authenticated user can generate a PDF of any lease in the system.
Fix: Verify `lease.owner_user_id === user.id` or tenant relationship before `buildLeasePreviewHtml()`.

**SEC-05: `Access-Control-Allow-Origin: *` on All 8 Edge Functions**
CVSS 5.4 | CWE-942 | OWASP A05
Files: All `supabase/functions/*/index.ts`
Wildcard CORS combined with `Access-Control-Allow-Headers: authorization` enables authenticated cross-origin requests. Malicious site visited by logged-in user could trigger Edge Function calls using their credentials.
Fix: Restrict to `Deno.env.get('FRONTEND_URL')`. Webhook endpoints should have no CORS headers at all (server-to-server calls).

**SEC-06: Stripe Webhook `notification_type` CHECK Constraint Mismatch**
CVSS 5.9 | CWE-20 | OWASP A04
File: `supabase/functions/stripe-webhooks/index.ts` lines 170, 244
The webhook inserts `notification_type: 'stripe_connect_verified'` and `notification_type: 'payment_failed'`. The DB CHECK constraint only allows `('maintenance', 'lease', 'payment', 'system')`.
- Line 170: notification insert fails silently — owner never notified of Stripe Connect verification
- Line 244: failure propagates, deletes idempotency record, Stripe retries for 72 hours → infinite retry loop
Fix: Use `notification_type: 'system'` for Connect verification, `notification_type: 'payment'` for failures. Or update the CHECK constraint.

### MEDIUM

**SEC-07: `getSession()` Used for Edge Function Auth Tokens (20+ locations)**
CVSS 5.3 | CWE-613 | OWASP A07
Files: `stripe-client.ts`, `use-lease.ts`, `use-reports.ts`, `use-billing.ts`, `use-stripe-connect.ts`, `export-buttons.tsx`
`getSession()` reads a locally-cached JWT that may be expired/revoked. Edge Functions correctly validate server-side (will reject expired tokens), but user experience degrades with confusing 401 errors.
Fix: Use `getUser()` for write-path operations to validate session before sending. Then extract token from session for the auth header.

**SEC-08: Client-Side `owner_user_id` in INSERT Mutations**
CVSS 4.3 | CWE-807 | OWASP A01 (Mitigated by RLS)
Files: 6 hooks (properties, lease, maintenance, unit, inspections, vendor)
`owner_user_id` sent as part of insert payload from client. A modified client could forge this to any UUID. **Currently mitigated** by RLS `WITH CHECK ((select auth.uid()) = owner_user_id)`. Risk materializes if any policy is weakened.
Fix: Add column default `ALTER TABLE properties ALTER COLUMN owner_user_id SET DEFAULT (select auth.uid())` to remove client ability to set it.

**SEC-09: Edge Function Env Vars Default to Empty String**
CVSS 5.0 | CWE-1188 | OWASP A05
Files: All Edge Functions use `?? ''` fallback for secrets
`STRIPE_SECRET_KEY ?? ''` initializes Stripe SDK with empty key — unpredictable behavior. `STRIPE_WEBHOOK_SECRET ?? ''` potentially allows forged Stripe payloads depending on SDK version.
Fix: Fail immediately if required vars are missing (return 503, not empty-string fallback).

**SEC-10: HTML Injection in PDF Report Generation**
CVSS 4.3 | CWE-79 | OWASP A03
Files: `export-report/index.ts`, `generate-pdf/index.ts`, `docuseal/index.ts`
Database values (property names, tenant names, addresses) interpolated unescaped into HTML templates. If a record contains `<img src=x onerror=...>`, StirlingPDF's rendering engine may execute it — potential SSRF from the rendering server.
Fix: HTML-escape all dynamic values: `.replace(/[&<>"']/g, ...)`.

**SEC-11: Arbitrary HTML in generate-pdf Enables SSRF**
CVSS 5.0 | CWE-918 | OWASP A10
File: `supabase/functions/generate-pdf/index.ts`
`{ html: string }` payload from any authenticated user forwarded directly to StirlingPDF. Attacker can craft `<img src="http://169.254.169.254/...">` to probe internal services from the StirlingPDF Chromium instance.
Fix: Restrict HTML mode to internal callers only (check service role token), or configure StirlingPDF sandbox to block external network requests.

### LOW

**SEC-12: Incomplete RLS Integration Tests (no INSERT/UPDATE/DELETE)**
All 7 RLS test files test SELECT isolation only. With NestJS gone, write isolation is enforced solely by RLS — these tests are now the primary security validation for writes.
Fix: Add mutation isolation tests per domain (can Owner A UPDATE Owner B's records? INSERT with forged owner_user_id?).

**SEC-13: Hardcoded Demo Keys in E2E Playwright Config**
File: `apps/e2e-tests/playwright.config.ts`
Standard Supabase local-dev demo keys hardcoded as fallbacks. Low risk but triggers secret scanners.

**SEC-14: CSV Formula Injection**
File: `supabase/functions/export-report/index.ts` — `rowsToCsv()`
Values starting with `=`, `+`, `-`, `@` not prefixed before CSV output. Malicious tenant name could inject Excel formula.
Fix: Prefix formula-starting cells with single quote.

**SEC-15: Stripe Webhook Retry Storm from Idempotency Record Deletion**
File: `supabase/functions/stripe-webhooks/index.ts`
On processing failure, idempotency record deleted so Stripe retries. If failure is deterministic (e.g., SEC-06 CHECK constraint), creates 72-hour retry loop.
Fix: Track `retry_count`; mark as permanently failed after 3 attempts instead of deleting.

---

## Performance Findings

### CRITICAL

**PERF-01: 86 Unshared `getUser()` Network Calls — Auth Round-Trip Fan-Out**
Files: 23 hook files (86 occurrences)
Every `queryFn` that needs `user.id` calls `supabase.auth.getUser()` + `createClient()` independently. `getUser()` validates the JWT server-side (not a cache read). New `createBrowserClient()` instance per call means internal session cache is not shared. Dashboard page with 5 parallel queries = 5 auth round-trips on mount.
The `['auth', 'user']` TanStack Query cache (populated by `AuthStoreProvider`) is bypassed entirely.
Estimated impact: 50–100ms added latency per parallel query batch.
Fix: For RPC calls, use `auth.uid()` directly in the RPC function body (remove `p_user_id` client param). For cases where `user.id` genuinely needed client-side, read from TanStack Query cache:
```typescript
const user = queryClient.getQueryData<User>(authQueryKeys.user)
if (!user) throw new Error('Not authenticated')
```

**PERF-02: Batch Tenant Operations — N Sequential HTTP Requests**
File: `apps/frontend/src/hooks/api/use-tenant.ts` `useBatchTenantOperations()` ~line 528
`batchUpdate` and `batchDelete` use `await` inside `for...of` loops — fully sequential. N tenants = N×60–120ms round-trips. At 10 tenants: 600–1200ms. No parallelism.
Estimated impact: N × 80ms per operation.
Fix: `batchDelete` → single `.in('tenant_id', ids)`. For heterogeneous `batchUpdate`, create an RPC that accepts array of `(id, data)` pairs.

### HIGH

**PERF-03: CSV Export — Unbounded Client-Side Data Load**
File: `apps/frontend/src/hooks/api/use-payments.ts` `exportPaymentsCSV()` ~line 325
No `.limit()` on PostgREST query. All matching rows fetched to browser, then converted to CSV in memory. For large accounts: 50k+ rows could crash the tab.
Fix: Route through `export-report` Edge Function (already deployed) with server-side streaming. Until then, add `.limit(10000)` as safety valve.

### MEDIUM

**PERF-04: PostgREST `units(*)` Wildcard — Unnecessary Column Transfer**
Files: `property-keys.ts` `withUnits()` query
`'*, units(*)'` fetches all columns on `units` table. Replace with explicit column list matching what list views actually need.

**PERF-05: Dashboard 9-RPC Fan-Out — 4 Redundant Metric Trend Calls**
File: `apps/frontend/src/hooks/api/use-owner-dashboard.ts` ~line 487
`get_metric_trend` called 4× with different `p_metric_name` — same RPC, different params. These 4 round-trips can be one consolidated `get_all_metric_trends` RPC.
Additionally: `ownerDashboardQueries.analytics.stats()` and `ownerDashboardQueries.analytics.pageData()` may both invoke `get_dashboard_stats` independently (different query keys). Audit for dual-invocation.

**PERF-06: Tenant Portal — 3-Step Serial Lookup (getUser → tenant → data)**
Files: `maintenance-keys.ts`, `use-payments.ts`, `use-tenant.ts`
Three sequential round-trips for tenant portal queries: (1) `getUser()`, (2) `tenants` row by `user_id`, (3) actual data query. Serial waterfall adds 120–200ms.
Fix: Join through `users → tenants` in a single query: `.select('..., tenants!inner(user_id)').eq('tenants.user_id', user.id)`. Or store `tenant_id` in JWT `app_metadata`.

**PERF-07: `useAllTenants` — Unbounded Query for Dropdown Population**
File: `apps/frontend/src/hooks/api/query-keys/tenant-keys.ts` ~line 260
Fetches ALL tenants with 5-level join, no `.limit()`. Used for dropdown/select. 200 tenants = 200 records × full join data. Also triggers N `queryClient.setQueryData()` writes per tenant.
Fix: Add `.limit(100)`. Implement server-side search for large portfolios.

**PERF-08: Lease Stats — Client-Side SUM/AVG Aggregation**
File: `apps/frontend/src/hooks/api/query-keys/lease-keys.ts` ~line 242
Fetches all active leases' `rent_amount` + `security_deposit` to compute totals client-side. O(N) data transfer instead of 2 aggregate values.
Fix: Move to RPC with `SUM(rent_amount), AVG(rent_amount), COUNT(*) WHERE lease_status = 'active'`.

### LOW

**PERF-09: Maintenance Stats — 7 Parallel HEAD Queries**
File: `maintenance-keys.ts` ~line 143
7 `{ count: 'exact', head: true }` queries per refresh — one per status value. At scale: 7×concurrent_users PgBouncer connections per 3-minute refresh cycle.
Fix: Single `get_maintenance_stats_by_status` RPC with `COUNT(*) FILTER (WHERE status = ...)` per value.

**PERF-10: Urgent/Overdue Maintenance and Expiring Leases — No LIMIT**
Files: `maintenance-keys.ts`, `lease-keys.ts`
Queries for urgent maintenance, overdue maintenance, and expiring leases have no `.limit()`.
Fix: Add `.limit(100)` with pagination or "load more".

**PERF-11: Stripe Connect Edge Function — Cold Start + Duplicate DB Lookup**
File: `supabase/functions/stripe-connect/index.ts`
`stripe_connected_accounts` lookup duplicated in 4 actions. Edge Function cold start 500–1500ms after idle. Users checking payouts page (5min staleTime) hit cold starts regularly.
Fix: Hoist lookup before dispatch. Consider keepalive strategy for critical functions.

**PERF-12: Missing Index — `maintenance_requests(tenant_id)`**
Migration `20260221053507` adds `(unit_id, status)` but not `(tenant_id)`. Tenant portal queries (`tenantPortal()` in `maintenance-keys.ts`) filter by `tenant_id` — sequential scan on large tables.
Fix: Add `CREATE INDEX idx_maintenance_requests_tenant_id ON maintenance_requests(tenant_id)`.

**PERF-13: Lease Stats Client-Side Reduce (Minor)**
File: `lease-keys.ts` — Two `.reduce()` passes over same array.
Part of PERF-08; address with same RPC fix.

---

## Critical Issues for Phase 3 Context

**For testing requirements:**
1. **SEC-01/02**: DocuSeal webhook and Edge Function IDOR — no tests currently verify that signature operations require correct ownership
2. **SEC-03**: PostgREST injection — no tests for malformed search inputs
3. **SEC-06**: Stripe notification_type mismatch — webhook handler has a runtime bug that would surface only in integration tests
4. **PERF-02**: Batch operations — no performance tests for large tenant counts
5. **SEC-12 / CQ-16**: RLS write-path isolation tests missing entirely

**For documentation requirements:**
1. The new RLS-only security boundary (no more NestJS middleware) is undocumented — critical architectural change
2. TODO(phase-57) stubs span multiple phases — no central tracking document
3. Edge Function deployment env var requirements are scattered (no consolidated list)
4. The `FRONTEND_URL` env var needed for CORS fix is not currently in any config documentation
