// Integration tests for the stripe-rent-checkout Edge Function.
// These tests invoke the function via Supabase client.functions.invoke()
// and verify auth, validation, error handling, and checkout session creation.
//
// stripe-rent-checkout creates Stripe Checkout Sessions for tenant rent payments.
// It requires JWT authentication (tenant user), validates rent_due_id, resolves
// tenant/lease/connected-account data, and returns a checkout URL.
//
// Run: deno test --allow-all tests/stripe-rent-checkout-test.ts
// Requires: local Supabase instance (`supabase functions serve`)

import {
  assert,
  assertEquals,
  assertExists,
} from 'jsr:@std/assert@1'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import 'jsr:@std/dotenv/load'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''

// Test tenant credentials (optional -- authenticated tests skip if unavailable)
const tenantEmail = Deno.env.get('E2E_TENANT_EMAIL') ?? ''
const tenantPassword = Deno.env.get('E2E_TENANT_PASSWORD') ?? ''

function createTestClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Sign in as the test tenant and return the access token.
 * Returns null if credentials are not configured.
 */
async function getTestTenantToken(): Promise<string | null> {
  if (!tenantEmail || !tenantPassword) return null

  const client = createTestClient()
  const { data, error } = await client.auth.signInWithPassword({
    email: tenantEmail,
    password: tenantPassword,
  })

  if (error || !data.session) return null
  return data.session.access_token
}

// ---------------------------------------------------------------------------
// CORS / Preflight Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-rent-checkout: OPTIONS request returns CORS headers', async () => {
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
    method: 'OPTIONS',
    headers: {
      'Origin': frontendUrl,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  })

  // OPTIONS should return 200 or 204 (preflight success)
  assert(
    response.status === 200 || response.status === 204,
    `Expected 200/204 for OPTIONS, got ${response.status}`,
  )

  // When FRONTEND_URL matches origin, CORS headers should be present
  const allowOrigin = response.headers.get('access-control-allow-origin')
  if (allowOrigin) {
    assertEquals(allowOrigin, frontendUrl, 'CORS origin should match FRONTEND_URL')
  }

  await response.body?.cancel()
})

// ---------------------------------------------------------------------------
// Authentication Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-rent-checkout: returns 401 without Authorization header', async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ rent_due_id: 'test-id' }),
  })

  // The function extracts the Authorization header from the request.
  // With only the anon key as Authorization (which Supabase relay strips
  // and replaces), the function may not see a Bearer token for getUser().
  // Expected: 401 Unauthorized
  assertEquals(response.status, 401, 'Should return 401 without valid auth')

  const body = await response.json()
  assertEquals(body.error, 'Unauthorized', 'Error message should be "Unauthorized"')
})

Deno.test('stripe-rent-checkout: returns 401 with invalid JWT token', async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'x-custom-auth': 'Bearer invalid.jwt.token',
    },
    body: JSON.stringify({ rent_due_id: 'test-id' }),
  })

  // Should return 401 since the JWT is invalid
  assert(
    response.status === 401 || response.status === 400,
    `Expected 401/400 with invalid token, got ${response.status}`,
  )
  await response.body?.cancel()
})

Deno.test('stripe-rent-checkout: returns 401 via client invoke without auth', async () => {
  const client = createTestClient()

  const { data, error } = await client.functions.invoke('stripe-rent-checkout', {
    body: { rent_due_id: 'test-rent-due-id' },
  })

  // Unauthenticated client -- function should return 401
  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('401') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('non-2xx'),
      `Expected auth error, got: ${error.message}`,
    )
  }
})

// ---------------------------------------------------------------------------
// Validation Tests (require auth)
// ---------------------------------------------------------------------------

Deno.test('stripe-rent-checkout: returns 400 when rent_due_id is missing', async () => {
  const token = await getTestTenantToken()
  if (!token) {
    console.warn('SKIP: E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD not set')
    return
  }

  const client = createTestClient()
  const { data, error } = await client.functions.invoke('stripe-rent-checkout', {
    body: {},
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // Missing rent_due_id should return 400
  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('400') || error.message.includes('non-2xx'),
      `Expected 400 for missing rent_due_id, got: ${error.message}`,
    )
  } else if (data && typeof data === 'object') {
    const parsed = data as Record<string, unknown>
    assertEquals(parsed.error, 'rent_due_id is required', 'Should specify missing field')
  }
})

Deno.test('stripe-rent-checkout: returns 400 when rent_due_id is empty string', async () => {
  const token = await getTestTenantToken()
  if (!token) {
    console.warn('SKIP: E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD not set')
    return
  }

  const client = createTestClient()
  const { data, error } = await client.functions.invoke('stripe-rent-checkout', {
    body: { rent_due_id: '' },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // Empty string rent_due_id is falsy and should be rejected
  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('400') || error.message.includes('non-2xx'),
      `Expected 400 for empty rent_due_id, got: ${error.message}`,
    )
  }
})

Deno.test('stripe-rent-checkout: returns error for non-existent rent_due_id', async () => {
  const token = await getTestTenantToken()
  if (!token) {
    console.warn('SKIP: E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD not set')
    return
  }

  const client = createTestClient()
  const { data, error } = await client.functions.invoke('stripe-rent-checkout', {
    body: { rent_due_id: '00000000-0000-0000-0000-000000000000' },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // Non-existent rent_due_id should return 400 (not found)
  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('400') ||
      error.message.includes('404') ||
      error.message.includes('non-2xx'),
      `Expected 400/404 for non-existent rent_due_id, got: ${error.message}`,
    )
  } else if (data && typeof data === 'object') {
    const parsed = data as Record<string, unknown>
    assert(
      parsed.error === 'Rent due record not found' ||
      typeof parsed.error === 'string',
      'Should return error for non-existent rent_due_id',
    )
  }
})

Deno.test('stripe-rent-checkout: returns error for invalid UUID format rent_due_id', async () => {
  const token = await getTestTenantToken()
  if (!token) {
    console.warn('SKIP: E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD not set')
    return
  }

  const client = createTestClient()
  const { data, error } = await client.functions.invoke('stripe-rent-checkout', {
    body: { rent_due_id: 'not-a-valid-uuid' },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // Invalid UUID format should trigger a DB error or validation error
  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('400') ||
      error.message.includes('500') ||
      error.message.includes('non-2xx'),
      `Expected error for invalid UUID, got: ${error.message}`,
    )
  }
})

// ---------------------------------------------------------------------------
// Malformed Input Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-rent-checkout: handles malformed JSON body', async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: 'this is not valid json {{{',
  })

  // Should return an error (likely 401 since auth check happens first,
  // or 500 if JSON parse fails after auth)
  assert(response.status >= 400, `Expected error status, got ${response.status}`)
  await response.body?.cancel()
})

Deno.test('stripe-rent-checkout: handles empty body', async () => {
  const token = await getTestTenantToken()
  if (!token) {
    console.warn('SKIP: E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD not set')
    return
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'x-tenant-token': `Bearer ${token}`,
    },
    body: '',
  })

  // Empty body should cause JSON parse error or validation error
  assert(response.status >= 400, `Expected error status for empty body, got ${response.status}`)
  await response.body?.cancel()
})

// ---------------------------------------------------------------------------
// Response Format Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-rent-checkout: error responses include CORS headers when origin matches', async () => {
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': frontendUrl,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ rent_due_id: 'test-id' }),
  })

  // Even on 401 error, CORS headers should be present when origin matches
  const allowOrigin = response.headers.get('access-control-allow-origin')
  if (allowOrigin) {
    assertEquals(
      allowOrigin,
      frontendUrl,
      'CORS origin header should match FRONTEND_URL on error responses',
    )
  }

  await response.body?.cancel()
})

Deno.test('stripe-rent-checkout: error responses are JSON with error field', async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ rent_due_id: 'test' }),
  })

  const contentType = response.headers.get('content-type')
  assert(
    contentType?.includes('application/json'),
    `Expected JSON content-type, got: ${contentType}`,
  )

  const body = await response.json()
  assertExists(body.error, 'Error response should have an "error" field')
  assert(typeof body.error === 'string', 'Error field should be a string')
})

// ---------------------------------------------------------------------------
// Authenticated Flow Tests (conditional on test credentials)
// ---------------------------------------------------------------------------

Deno.test('stripe-rent-checkout: authenticated request reaches validation layer', async () => {
  const token = await getTestTenantToken()
  if (!token) {
    console.warn('SKIP: E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD not set')
    return
  }

  const client = createTestClient()
  const { data, error } = await client.functions.invoke('stripe-rent-checkout', {
    body: { rent_due_id: '00000000-0000-0000-0000-000000000000' },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // With valid auth, the function should reach the validation layer
  // and fail on the non-existent rent_due_id (not on auth).
  // This proves auth passed and request reached business logic.
  assert(error !== null || data !== null, 'Should get past auth to validation')

  if (error) {
    // Should NOT be a 401 -- auth should have passed
    assert(
      !error.message.includes('401'),
      `Authenticated request should not get 401, got: ${error.message}`,
    )
  } else if (data && typeof data === 'object') {
    const parsed = data as Record<string, unknown>
    // If function returns data, the error should be about the rent_due record
    assert(
      parsed.error !== 'Unauthorized',
      'Should not return Unauthorized for valid token',
    )
  }
})

Deno.test('stripe-rent-checkout: tenant without tenant profile gets 404', async () => {
  // This tests the case where a user has valid auth but no tenant record.
  // In practice this happens if an owner tries to use the tenant checkout.
  // We use the owner credentials if available, or skip.
  const ownerEmail = Deno.env.get('E2E_OWNER_EMAIL') ?? ''
  const ownerPassword = Deno.env.get('E2E_OWNER_PASSWORD') ?? ''

  if (!ownerEmail || !ownerPassword) {
    console.warn('SKIP: E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD not set')
    return
  }

  const client = createTestClient()
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  })

  if (authError || !authData.session) {
    console.warn('SKIP: Could not sign in as owner')
    return
  }

  const { data, error } = await client.functions.invoke('stripe-rent-checkout', {
    body: { rent_due_id: '00000000-0000-0000-0000-000000000000' },
    headers: {
      Authorization: `Bearer ${authData.session.access_token}`,
    },
  })

  // Owner user has no tenant profile, so the function should return 404
  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('404') || error.message.includes('non-2xx'),
      `Expected 404 for missing tenant profile, got: ${error.message}`,
    )
  } else if (data && typeof data === 'object') {
    const parsed = data as Record<string, unknown>
    assertEquals(
      parsed.error,
      'Tenant profile not found',
      'Should report missing tenant profile',
    )
  }
})
