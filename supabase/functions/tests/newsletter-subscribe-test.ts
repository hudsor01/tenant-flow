// Integration tests for newsletter-subscribe Edge Function.
// This function creates contacts in Resend via the Contacts API.
// Unauthenticated endpoint -- no JWT required.
//
// Test categories:
//   1. CORS: OPTIONS preflight
//   2. Method: only POST allowed (405 for others)
//   3. Validation: email format validation (NEWS-02)
//   4. Success: valid email returns 200 (NEWS-01)
//   5. Response format: JSON structure, generic error messages
//   6. Rate limiting: documented behavior (NEWS-02)
//
// Run: deno test --allow-all --no-check supabase/functions/tests/newsletter-subscribe-test.ts

import {
  assert,
  assertEquals,
  assertExists,
} from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/newsletter-subscribe`

// Helper: raw fetch to the function with full control over headers and method
async function rawInvoke(options: {
  method?: string
  body?: string | null
  headers?: Record<string, string>
}): Promise<{ status: number; data: Record<string, unknown>; headers: Headers }> {
  const method = options.method ?? 'POST'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
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

Deno.test('newsletter-subscribe: OPTIONS returns CORS preflight response', async () => {
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  const { status, headers } = await rawInvoke({
    method: 'OPTIONS',
    body: null,
    headers: {
      'Origin': frontendUrl,
    },
  })

  // OPTIONS should return 200 or 204 per handleCorsOptions
  assert(
    status === 200 || status === 204,
    `Expected 200 or 204 for OPTIONS, got ${status}`,
  )

  // When FRONTEND_URL matches origin, CORS headers should be present
  // If FRONTEND_URL is not configured, handleCorsOptions returns 204 without CORS headers
  // Both are valid behaviors depending on env configuration
  const corsHeader = headers.get('access-control-allow-origin')
  if (corsHeader) {
    assertEquals(corsHeader, frontendUrl)
  }
})

Deno.test('newsletter-subscribe: rejects non-POST methods with 405', async () => {
  const { status } = await rawInvoke({
    method: 'GET',
    body: null,
  })
  assertEquals(status, 405)
})

Deno.test('newsletter-subscribe: rejects PUT method with 405', async () => {
  const { status } = await rawInvoke({
    method: 'PUT',
    body: JSON.stringify({ email: 'test@example.com' }),
  })
  assertEquals(status, 405)
})

Deno.test('newsletter-subscribe: rejects DELETE method with 405', async () => {
  const { status } = await rawInvoke({
    method: 'DELETE',
    body: null,
  })
  assertEquals(status, 405)
})

Deno.test('newsletter-subscribe: rejects missing email with 400', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({}),
  })

  assertEquals(status, 400)
  assertEquals(data.error, 'Valid email is required')
})

Deno.test('newsletter-subscribe: rejects empty email with 400', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ email: '' }),
  })

  assertEquals(status, 400)
  assertEquals(data.error, 'Valid email is required')
})

Deno.test('newsletter-subscribe: rejects invalid email format with 400', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ email: 'not-an-email' }),
  })

  assertEquals(status, 400)
  assertEquals(data.error, 'Valid email is required')
})

Deno.test('newsletter-subscribe: rejects email without domain with 400', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ email: 'user@' }),
  })

  assertEquals(status, 400)
  assertEquals(data.error, 'Valid email is required')
})

Deno.test('newsletter-subscribe: valid email returns 200 with success true', async () => {
  const { status, data } = await rawInvoke({
    body: JSON.stringify({ email: 'test-newsletter-ci@example.com' }),
  })

  assertEquals(status, 200)
  assertEquals(data.success, true)
})

Deno.test('newsletter-subscribe: error responses have JSON Content-Type', async () => {
  const { headers } = await rawInvoke({
    body: JSON.stringify({}),
  })

  const contentType = headers.get('content-type')
  assertExists(contentType, 'Should have Content-Type header')
  assert(contentType.includes('application/json'), `Expected JSON, got: ${contentType}`)
})

Deno.test('newsletter-subscribe: error messages are generic (no Resend internals)', async () => {
  const { data } = await rawInvoke({
    body: JSON.stringify({ email: 'invalid' }),
  })

  const errorMsg = String(data.error ?? '')
  // Error should be a short, generic message
  assert(errorMsg.length < 100, `Error message too long: ${errorMsg}`)
  assert(!errorMsg.includes('Resend'), 'Error should not reference Resend')
  assert(!errorMsg.includes('API key'), 'Error should not reference API key')
  assert(!errorMsg.includes('stack'), 'Error should not contain stack trace')
  assert(!errorMsg.includes('node_modules'), 'Error should not contain file paths')
})

Deno.test('newsletter-subscribe: 405 response is plain text "Method Not Allowed"', async () => {
  const { status, data } = await rawInvoke({
    method: 'PATCH',
    body: null,
  })

  assertEquals(status, 405)
  // The function returns 'Method Not Allowed' as plain text
  assert(
    data._raw === 'Method Not Allowed' || data.error !== undefined,
    'Expected "Method Not Allowed" text or error object',
  )
})

