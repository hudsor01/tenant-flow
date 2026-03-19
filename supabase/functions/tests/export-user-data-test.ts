// Integration tests for export-user-data Edge Function.
// This function exports all personal data for the authenticated user as a downloadable JSON file.
// Supports both OWNER and TENANT roles with role-specific data sections.
//
// Test categories:
//   1. CORS: OPTIONS preflight response
//   2. Method: only GET allowed (405 for others)
//   3. Auth: JWT required, invalid token rejected
//   4. Response format: Content-Type, Content-Disposition headers, JSON structure
//
// Run: deno test --allow-all supabase/functions/tests/export-user-data-test.ts

import {
  assert,
  assertEquals,
  assertExists,
} from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/export-user-data`

// Helper: raw fetch to the function with full control over headers and method
async function rawInvoke(options: {
  method?: string
  headers?: Record<string, string>
}): Promise<{ status: number; text: string; data: Record<string, unknown>; headers: Headers }> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {
    ...options.headers,
  }

  const response = await fetch(FUNCTION_URL, { method, headers })
  const text = await response.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    data = { _raw: text }
  }

  return { status: response.status, text, data, headers: response.headers }
}

// =============================================================================
// CORS tests
// =============================================================================

Deno.test('export-user-data: OPTIONS returns CORS preflight response', async () => {
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  const { status, headers } = await rawInvoke({
    method: 'OPTIONS',
    headers: {
      'Origin': frontendUrl,
    },
  })

  assert(
    status === 200 || status === 204,
    `Expected 200 or 204 for OPTIONS, got ${status}`
  )

  const corsHeader = headers.get('access-control-allow-origin')
  if (corsHeader) {
    assertEquals(corsHeader, frontendUrl)
  }
})

// =============================================================================
// Method tests
// =============================================================================

Deno.test('export-user-data: rejects POST method with 405', async () => {
  const { status } = await rawInvoke({ method: 'POST' })
  assertEquals(status, 405)
})

Deno.test('export-user-data: rejects PUT method with 405', async () => {
  const { status } = await rawInvoke({ method: 'PUT' })
  assertEquals(status, 405)
})

Deno.test('export-user-data: rejects DELETE method with 405', async () => {
  const { status } = await rawInvoke({ method: 'DELETE' })
  assertEquals(status, 405)
})

Deno.test('export-user-data: rejects PATCH method with 405', async () => {
  const { status } = await rawInvoke({ method: 'PATCH' })
  assertEquals(status, 405)
})

// =============================================================================
// Auth tests
// =============================================================================

Deno.test('export-user-data: rejects request without Authorization header', async () => {
  const { status, data } = await rawInvoke({})

  assertEquals(status, 401)
  assertEquals(data.error, 'Authorization required')
})

Deno.test('export-user-data: rejects request with invalid Bearer token', async () => {
  const { status, data } = await rawInvoke({
    headers: {
      'Authorization': 'Bearer invalid-jwt-token-value',
    },
  })

  assertEquals(status, 401)
  assertEquals(data.error, 'Invalid token')
})

Deno.test('export-user-data: rejects request with malformed Authorization header', async () => {
  const { status, data } = await rawInvoke({
    headers: {
      'Authorization': 'Basic dXNlcjpwYXNz',
    },
  })

  assertEquals(status, 401)
  assertEquals(data.error, 'Authorization required')
})

// =============================================================================
// Response format tests (requires valid auth)
// =============================================================================

Deno.test('export-user-data: response Content-Type is application/json', async () => {
  const ownerEmail = Deno.env.get('E2E_OWNER_EMAIL')
  const ownerPassword = Deno.env.get('E2E_OWNER_PASSWORD')
  if (!ownerEmail || !ownerPassword) {
    console.log('SKIP: E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set')
    return
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2')
  const client = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const { data: authData } = await client.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  })
  const token = authData.session?.access_token
  if (!token) {
    console.log('SKIP: Could not authenticate owner')
    return
  }

  const { headers } = await rawInvoke({
    headers: { 'Authorization': `Bearer ${token}` },
  })

  const contentType = headers.get('content-type')
  assertExists(contentType, 'Should have Content-Type header')
  assert(contentType.includes('application/json'), `Expected JSON, got: ${contentType}`)
})

Deno.test('export-user-data: response Content-Disposition is attachment with filename', async () => {
  const ownerEmail = Deno.env.get('E2E_OWNER_EMAIL')
  const ownerPassword = Deno.env.get('E2E_OWNER_PASSWORD')
  if (!ownerEmail || !ownerPassword) {
    console.log('SKIP: E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set')
    return
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2')
  const client = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const { data: authData } = await client.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  })
  const token = authData.session?.access_token
  if (!token) {
    console.log('SKIP: Could not authenticate owner')
    return
  }

  const { headers } = await rawInvoke({
    headers: { 'Authorization': `Bearer ${token}` },
  })

  const disposition = headers.get('content-disposition')
  assertExists(disposition, 'Should have Content-Disposition header')
  assert(disposition.includes('attachment'), `Expected attachment, got: ${disposition}`)
  assert(disposition.includes('tenantflow-data-export'), `Expected filename with tenantflow-data-export, got: ${disposition}`)
  // Filename should contain user role (owner or tenant) and date
  assert(
    disposition.includes('owner') || disposition.includes('tenant'),
    `Expected filename to contain role, got: ${disposition}`
  )
})

Deno.test('export-user-data: response body is valid JSON with expected top-level keys', async () => {
  const ownerEmail = Deno.env.get('E2E_OWNER_EMAIL')
  const ownerPassword = Deno.env.get('E2E_OWNER_PASSWORD')
  if (!ownerEmail || !ownerPassword) {
    console.log('SKIP: E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set')
    return
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2')
  const client = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const { data: authData } = await client.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  })
  const token = authData.session?.access_token
  if (!token) {
    console.log('SKIP: Could not authenticate owner')
    return
  }

  const { data } = await rawInvoke({
    headers: { 'Authorization': `Bearer ${token}` },
  })

  // Top-level metadata keys
  assertExists(data.exported_at, 'Should have exported_at timestamp')
  assertExists(data.user_role, 'Should have user_role')
  assertExists(data.user_id, 'Should have user_id')
  assertExists(data.profile, 'Should have profile section')

  // Validate exported_at is a valid ISO date string
  const exportedAt = String(data.exported_at)
  assert(!isNaN(Date.parse(exportedAt)), `exported_at should be valid date: ${exportedAt}`)
})

// =============================================================================
// Error response format tests
// =============================================================================

Deno.test('export-user-data: error responses have JSON Content-Type', async () => {
  const { headers } = await rawInvoke({})

  const contentType = headers.get('content-type')
  assertExists(contentType, 'Should have Content-Type header')
  assert(contentType.includes('application/json'), `Expected JSON, got: ${contentType}`)
})

Deno.test('export-user-data: 405 response is plain text "Method Not Allowed"', async () => {
  const { status, data } = await rawInvoke({ method: 'PATCH' })

  assertEquals(status, 405)
  assert(
    data._raw === 'Method Not Allowed' || data.error !== undefined,
    'Expected "Method Not Allowed" text or error object'
  )
})

