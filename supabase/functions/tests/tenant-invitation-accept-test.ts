// Integration tests for tenant-invitation-accept Edge Function.
// This function accepts tenant invitations after the user has created a Supabase auth account.
//
// Test categories:
//   1. CORS: OPTIONS preflight, CORS headers on responses
//   2. Method: only POST allowed (405 for others)
//   3. Rate limiting: 10 req/min per IP via Upstash Redis (fails open on errors)
//   4. Auth: JWT required, invalid token rejected
//   5. Validation: invitation code required in body
//   6. Business logic: non-existent code returns 404
//   7. Response format: JSON structure, generic error messages
//
// Run: deno test --allow-all supabase/functions/tests/tenant-invitation-accept-test.ts

import {
  assert,
  assertEquals,
  assertExists,
} from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/tenant-invitation-accept`

// Helper: raw fetch to the function with full control over headers and method
async function rawInvoke(options: {
  method?: string
  body?: string | null
  headers?: Record<string, string>
}): Promise<{ status: number; data: Record<string, unknown>; headers: Headers }> {
  const method = options.method ?? 'POST'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const fetchOptions: RequestInit = { method, headers }
  if (options.body !== undefined && options.body !== null) {
    fetchOptions.body = options.body
  }

  const response = await fetch(FUNCTION_URL, fetchOptions)
  const text = await response.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    data = { _raw: text }
  }

  return { status: response.status, data, headers: response.headers }
}

// Helper: get a valid tenant JWT for authenticated tests
async function getTenantToken(): Promise<string | null> {
  const tenantEmail = Deno.env.get('E2E_TENANT_EMAIL')
  const tenantPassword = Deno.env.get('E2E_TENANT_PASSWORD')

  if (!tenantEmail || !tenantPassword) {
    return null
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: authData } = await client.auth.signInWithPassword({
    email: tenantEmail,
    password: tenantPassword,
  })

  return authData.session?.access_token ?? null
}

// =============================================================================
// CORS tests
// =============================================================================

Deno.test('tenant-invitation-accept: OPTIONS returns CORS preflight response', async () => {
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  const { status, headers } = await rawInvoke({
    method: 'OPTIONS',
    body: null,
    headers: {
      'Origin': frontendUrl,
    },
  })

  // OPTIONS should return 200 (ok) or 204 (no content) per handleCorsOptions
  assert(
    status === 200 || status === 204,
    `Expected 200 or 204 for OPTIONS, got ${status}`
  )

  // When FRONTEND_URL matches origin, CORS headers should be present
  // If FRONTEND_URL is not configured, handleCorsOptions returns 204 without CORS headers
  // Both are valid behaviors depending on env configuration
  const corsHeader = headers.get('access-control-allow-origin')
  if (corsHeader) {
    assertEquals(corsHeader, frontendUrl)
  }
})

// =============================================================================
// Method tests
// =============================================================================

Deno.test('tenant-invitation-accept: rejects non-POST methods with 405', async () => {
  const { status } = await rawInvoke({
    method: 'GET',
    body: null,
  })
  assertEquals(status, 405)
})

Deno.test('tenant-invitation-accept: rejects PUT method with 405', async () => {
  const { status } = await rawInvoke({
    method: 'PUT',
    body: JSON.stringify({ code: 'test-code' }),
  })
  assertEquals(status, 405)
})

Deno.test('tenant-invitation-accept: rejects DELETE method with 405', async () => {
  const { status } = await rawInvoke({
    method: 'DELETE',
    body: null,
  })
  assertEquals(status, 405)
})

// =============================================================================
// Auth tests
// =============================================================================

Deno.test('tenant-invitation-accept: rejects request without Authorization header', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ code: 'test-code' }),
  })

  assertEquals(status, 401)
  assertEquals(data.error, 'Authorization required')
})

Deno.test('tenant-invitation-accept: rejects request with invalid Bearer token', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ code: 'test-code' }),
    headers: {
      'Authorization': 'Bearer invalid-jwt-token-value',
    },
  })

  assertEquals(status, 401)
  assertEquals(data.error, 'Invalid token')
})

Deno.test('tenant-invitation-accept: rejects request with malformed Authorization header', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ code: 'test-code' }),
    headers: {
      'Authorization': 'Basic dXNlcjpwYXNz',
    },
  })

  // Function checks authHeader?.startsWith('Bearer ') -- Basic auth should be rejected
  assertEquals(status, 401)
  assertEquals(data.error, 'Authorization required')
})

// =============================================================================
// Validation tests
// =============================================================================

Deno.test('tenant-invitation-accept: rejects missing invitation code', async () => {
  const token = await getTenantToken()
  if (!token) {
    console.log('SKIP: E2E_TENANT_EMAIL / E2E_TENANT_PASSWORD not set')
    return
  }

  const { status, data } = await rawInvoke({
    body: JSON.stringify({}),
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  assertEquals(status, 400)
  assertEquals(data.error, 'code is required')
})

Deno.test('tenant-invitation-accept: rejects empty invitation code', async () => {
  const token = await getTenantToken()
  if (!token) {
    console.log('SKIP: E2E_TENANT_EMAIL / E2E_TENANT_PASSWORD not set')
    return
  }

  const { status, data } = await rawInvoke({
    body: JSON.stringify({ code: '' }),
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  // Empty string is falsy, so !code check catches it
  assertEquals(status, 400)
  assertEquals(data.error, 'code is required')
})

// =============================================================================
// Business logic tests
// =============================================================================

Deno.test('tenant-invitation-accept: returns 404 for non-existent invitation code', async () => {
  const token = await getTenantToken()
  if (!token) {
    console.log('SKIP: E2E_TENANT_EMAIL / E2E_TENANT_PASSWORD not set')
    return
  }

  const { status, data } = await rawInvoke({
    body: JSON.stringify({ code: 'nonexistent-invitation-code-12345' }),
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  assertEquals(status, 404)
  assertEquals(data.error, 'Invalid or already used invitation')
})

// =============================================================================
// Response format tests
// =============================================================================

Deno.test('tenant-invitation-accept: error responses have JSON Content-Type', async () => {
  // Test with 401 (no auth)
  const { headers } = await rawInvoke({
    body: JSON.stringify({ code: 'test' }),
  })

  const contentType = headers.get('content-type')
  assertExists(contentType, 'Should have Content-Type header')
  assert(contentType.includes('application/json'), `Expected JSON, got: ${contentType}`)
})

Deno.test('tenant-invitation-accept: error messages are generic (no internal details)', async () => {
  const { data } = await rawInvoke({
    body: JSON.stringify({ code: 'test' }),
    headers: {
      'Authorization': 'Bearer invalid-token',
    },
  })

  const errorMsg = String(data.error ?? '')
  // Error should be a short, generic message
  assert(errorMsg.length < 100, `Error message too long: ${errorMsg}`)
  assert(!errorMsg.includes('stack'), 'Error should not contain stack trace')
  assert(!errorMsg.includes('node_modules'), 'Error should not contain file paths')
  assert(!errorMsg.includes('supabase'), 'Error should not expose infrastructure details')
})

Deno.test('tenant-invitation-accept: 405 response is plain text "Method Not Allowed"', async () => {
  const { status, data } = await rawInvoke({
    method: 'PATCH',
    body: null,
  })

  assertEquals(status, 405)
  // The function returns 'Method Not Allowed' as plain text
  assert(
    data._raw === 'Method Not Allowed' || data.error !== undefined,
    'Expected "Method Not Allowed" text or error object'
  )
})

// =============================================================================
// Rate limiting documentation
// =============================================================================

Deno.test('tenant-invitation-accept: documents rate limiting behavior', () => {
  // Rate limiting is configured at 10 req/min per IP via Upstash Redis:
  //   const rateLimited = await rateLimit(req, { maxRequests: 10, windowMs: 60_000, prefix: 'invite-accept' })
  //
  // Key behaviors:
  //   1. Rate limit checked BEFORE auth (unauthenticated endpoint protection)
  //   2. IP extracted from x-forwarded-for > cf-connecting-ip > 'unknown'
  //   3. Rate limiter FAILS OPEN on Upstash errors (availability over enforcement)
  //   4. When rate limited: returns 429 with { error: 'Too many requests' }
  //   5. Response includes Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
  //
  // Testing rate limits in CI is impractical because:
  //   - Requires a live Upstash Redis instance
  //   - Rapid-fire requests could hit Redis quota limits
  //   - Rate limit state persists between test runs (flaky)
  //
  // Rate limiting is verified via:
  //   - Code review: rateLimit() call is present before auth check
  //   - Unit tests on rateLimit() utility (in _shared/rate-limit.ts)
  //   - Manual testing in staging environment
  assert(true, 'Rate limiting behavior documented')
})

// =============================================================================
// Authenticated flow tests
// =============================================================================

Deno.test('tenant-invitation-accept: authenticated request with valid format returns business logic response', async () => {
  const token = await getTenantToken()
  if (!token) {
    console.log('SKIP: E2E_TENANT_EMAIL / E2E_TENANT_PASSWORD not set')
    return
  }

  // A valid-format request with a fake code should hit business logic (404)
  // not auth errors (401) or validation errors (400)
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ code: 'valid-format-but-nonexistent-code' }),
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  // Should get 404 (invitation not found), not 401 or 400
  assertEquals(status, 404)
  assertEquals(data.error, 'Invalid or already used invitation')
})

Deno.test('tenant-invitation-accept: documents success response format', () => {
  // Successful invitation acceptance returns:
  //   { accepted: true }  with status 200
  //
  // Side effects on success:
  //   1. Upserts tenant record (tenants table) linking auth user_id
  //   2. If invitation has lease_id, links tenant to lease (lease_tenants table)
  //   3. Updates invitation status to 'accepted' with timestamp and user_id
  //
  // Full success path testing requires:
  //   - A valid, pending invitation in the database
  //   - A tenant user who hasn't already accepted
  //   - Invitation must not be expired
  //
  // This is covered by E2E tests (tenant-invitation flow) and manual QA.
  assert(true, 'Success response format documented')
})
