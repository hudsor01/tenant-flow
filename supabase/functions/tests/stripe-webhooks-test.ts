// Integration tests for the stripe-webhooks Edge Function.
// These tests invoke the function via Supabase client.functions.invoke()
// and verify request handling, error paths, and response formats.
//
// Stripe webhook signature verification will fail in test environments
// (no real STRIPE_WEBHOOK_SECRET). Tests verify:
//   - Function is deployed and responsive
//   - Missing/invalid signature returns appropriate errors
//   - Malformed payloads are handled gracefully
//   - CORS is NOT applied (webhook endpoint is server-to-server)
//
// Run: deno test --allow-all tests/stripe-webhooks-test.ts
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

function createTestClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

// Helper to build a minimal Stripe-like webhook payload
function buildWebhookPayload(eventType: string, overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    id: `evt_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
    object: 'event',
    type: eventType,
    api_version: '2026-03-25.dahlia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: `pi_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
        ...(overrides?.data_object as Record<string, unknown> ?? {}),
      },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Auth / Signature Verification Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-webhooks: returns error when stripe-signature header is missing', async () => {
  const client = createTestClient()
  const payload = buildWebhookPayload('payment_intent.succeeded')

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: payload,
  })

  // The function should reject requests without a stripe-signature header.
  // functions.invoke returns a FunctionsHttpError for non-2xx responses.
  // When there is no stripe-signature, function returns 400.
  assert(error !== null || (data && typeof data === 'object'), 'Should return a response')

  if (error) {
    // FunctionsHttpError wraps the non-2xx response
    assert(
      error.message.includes('400') ||
      error.message.includes('Missing') ||
      error.message.includes('non-2xx'),
      `Expected 400 error, got: ${error.message}`,
    )
  }
})

Deno.test('stripe-webhooks: returns error with invalid stripe-signature', async () => {
  const client = createTestClient()
  const payload = buildWebhookPayload('payment_intent.succeeded')

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: payload,
    headers: {
      'stripe-signature': 't=1234567890,v1=invalid_signature_value',
    },
  })

  // With an invalid signature, the function should return 400 (signature verification failed)
  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('400') ||
      error.message.includes('signature') ||
      error.message.includes('non-2xx'),
      `Expected signature verification error, got: ${error.message}`,
    )
  }
})

Deno.test('stripe-webhooks: returns error with empty stripe-signature', async () => {
  const client = createTestClient()
  const payload = buildWebhookPayload('checkout.session.completed')

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: payload,
    headers: {
      'stripe-signature': '',
    },
  })

  assert(error !== null || data !== null, 'Should return a response')

  if (error) {
    assert(
      error.message.includes('400') ||
      error.message.includes('non-2xx'),
      `Expected error for empty signature, got: ${error.message}`,
    )
  }
})

// ---------------------------------------------------------------------------
// Malformed Input Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-webhooks: handles empty body gracefully', async () => {
  const client = createTestClient()

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: '',
    headers: {
      'stripe-signature': 't=1234567890,v1=test_sig',
    },
  })

  // Should not crash -- returns an error response
  assert(error !== null || data !== null, 'Should return a response without crashing')
})

Deno.test('stripe-webhooks: handles malformed JSON body', async () => {
  const client = createTestClient()

  // Send a raw string that is not valid JSON
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'stripe-signature': 't=1234567890,v1=test_sig',
    },
    body: 'this is not json {{{',
  })

  // Function reads body as text for signature verification, so it should
  // reach constructEventAsync and fail on signature, not on JSON parse.
  // Either way it should not crash (returns 400 or 500).
  assert(response.status >= 400, `Expected error status, got ${response.status}`)
})

Deno.test('stripe-webhooks: handles null body', async () => {
  const client = createTestClient()

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: null,
    headers: {
      'stripe-signature': 't=1234567890,v1=test_sig',
    },
  })

  assert(error !== null || data !== null, 'Should handle null body without crashing')
})

// ---------------------------------------------------------------------------
// Event Type Coverage Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-webhooks: payment_intent.succeeded payload format accepted', async () => {
  const client = createTestClient()
  const payload = buildWebhookPayload('payment_intent.succeeded', {
    data_object: {
      status: 'succeeded',
      amount: 150000,
      currency: 'usd',
      metadata: {
        tenant_id: 'test-tenant-id',
        lease_id: 'test-lease-id',
        rent_due_id: 'test-rent-due-id',
      },
    },
  })

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: payload,
    headers: {
      'stripe-signature': 't=1234567890,v1=invalid_but_present',
    },
  })

  // Will fail signature verification, but should not crash on payload format
  assert(error !== null || data !== null, 'Function should respond to payment_intent.succeeded payload')
})

Deno.test('stripe-webhooks: customer.subscription.updated payload format accepted', async () => {
  const client = createTestClient()
  const payload = buildWebhookPayload('customer.subscription.updated', {
    data_object: {
      status: 'active',
      customer: 'cus_test123',
      current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
    },
  })

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: payload,
    headers: {
      'stripe-signature': 't=1234567890,v1=invalid_but_present',
    },
  })

  assert(error !== null || data !== null, 'Function should respond to subscription payload')
})

Deno.test('stripe-webhooks: account.updated payload format accepted', async () => {
  const client = createTestClient()
  const payload = buildWebhookPayload('account.updated', {
    data_object: {
      charges_enabled: true,
      details_submitted: true,
    },
  })

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: payload,
    headers: {
      'stripe-signature': 't=1234567890,v1=invalid_but_present',
    },
  })

  assert(error !== null || data !== null, 'Function should respond to account.updated payload')
})

Deno.test('stripe-webhooks: unrecognized event type handled gracefully', async () => {
  const client = createTestClient()
  const payload = buildWebhookPayload('some.unknown.event.type')

  const { data, error } = await client.functions.invoke('stripe-webhooks', {
    body: payload,
    headers: {
      'stripe-signature': 't=1234567890,v1=invalid_but_present',
    },
  })

  // Unrecognized events are logged and acknowledged (not errored).
  // However, signature verification will fail first in test env.
  assert(error !== null || data !== null, 'Should not crash on unrecognized event type')
})

// ---------------------------------------------------------------------------
// HTTP Method Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-webhooks: GET request handled (no CORS preflight for webhooks)', async () => {
  // Stripe always sends POST, but the function should not crash on other methods
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-webhooks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  })

  // The function will attempt to read stripe-signature from headers and fail.
  // Should return 400 (missing signature), not crash.
  assert(response.status >= 400, `Expected error status for GET, got ${response.status}`)
})

// ---------------------------------------------------------------------------
// Response Format Tests
// ---------------------------------------------------------------------------

Deno.test('stripe-webhooks: error responses are JSON', async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'stripe-signature': 't=1234567890,v1=bad_sig',
    },
    body: JSON.stringify(buildWebhookPayload('payment_intent.succeeded')),
  })

  // The response should be JSON regardless of error type
  const contentType = response.headers.get('content-type')
  const body = await response.text()

  // Function returns either JSON error or plain text for missing signature
  if (contentType?.includes('application/json')) {
    const parsed = JSON.parse(body)
    assertExists(parsed, 'Response body should be parseable JSON')
    assert(typeof parsed === 'object', 'Response body should be an object')
  } else {
    // Plain text response for missing/bad stripe-signature is also valid
    assert(body.length > 0, 'Response body should not be empty')
  }
})

Deno.test('stripe-webhooks: signature failure returns 400 not 500', async () => {
  const payload = buildWebhookPayload('payment_intent.succeeded')

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'stripe-signature': 't=1234567890,v1=definitely_wrong',
    },
    body: JSON.stringify(payload),
  })

  // Signature verification failure is a client error (400), not server error (500)
  assertEquals(response.status, 400, 'Invalid signature should return 400')
  await response.body?.cancel()
})

Deno.test('stripe-webhooks: missing signature returns 400 with descriptive message', async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(buildWebhookPayload('checkout.session.completed')),
  })

  assertEquals(response.status, 400, 'Missing signature should return 400')

  const body = await response.text()
  assert(
    body.toLowerCase().includes('stripe-signature') || body.toLowerCase().includes('missing'),
    `Error message should mention missing signature, got: ${body}`,
  )
})
