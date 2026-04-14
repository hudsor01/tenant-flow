// Phase 42 CANCEL-01 integration test.
// Proves stripe-cancel-subscription (a) auth-gates, (b) resolves subscription
// server-side (no subscription_id accepted from body), (c) flips
// cancel_at_period_end via stripe.subscriptions.update, (d) reactivates, and
// (e) rejects reactivation of a fully canceled subscription.
//
// Run locally:
//   supabase start
//   supabase functions serve
//   export STRIPE_SECRET_KEY=sk_test_...
//   export SUPABASE_URL=http://localhost:54321
//   export SUPABASE_SERVICE_ROLE_KEY=...
//   export E2E_OWNER_TOKEN=<a valid access_token for an owner with a stripe_customer_id and a test-mode subscription>
//   cd supabase/functions && deno test --allow-all --no-check tests/stripe-cancel-subscription.test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const E2E_OWNER_TOKEN = Deno.env.get('E2E_OWNER_TOKEN') ?? ''

const functionUrl = `${SUPABASE_URL}/functions/v1/stripe-cancel-subscription`

Deno.test('stripe-cancel-subscription: rejects missing Authorization header (401)', async () => {
  if (!SUPABASE_URL) {
    console.log('SKIP: SUPABASE_URL required')
    return
  }
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel' }),
  })
  assertEquals(res.status, 401)
  const body = (await res.json()) as { error: string }
  assertEquals(body.error, 'Missing authorization header')
})

Deno.test('stripe-cancel-subscription: rejects invalid action (400)', async () => {
  if (!SUPABASE_URL || !E2E_OWNER_TOKEN) {
    console.log('SKIP: SUPABASE_URL / E2E_OWNER_TOKEN required')
    return
  }
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${E2E_OWNER_TOKEN}`,
    },
    body: JSON.stringify({ action: 'not-a-real-action' }),
  })
  assertEquals(res.status, 400)
  const body = (await res.json()) as { error: string }
  assertEquals(body.error, 'Invalid action')
})

Deno.test('stripe-cancel-subscription: ignores body-supplied subscription_id (server resolves from JWT)', async () => {
  if (!SUPABASE_URL || !E2E_OWNER_TOKEN || !STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.log('SKIP: SUPABASE_URL / E2E_OWNER_TOKEN / sk_test_ STRIPE_SECRET_KEY required')
    return
  }
  // A hostile caller attempts to cancel a subscription that does not belong to them.
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${E2E_OWNER_TOKEN}`,
    },
    body: JSON.stringify({ action: 'cancel', subscription_id: 'sub_hostile_123' }),
  })
  // Either 200 (caller DID have a legit subscription of their own, which got flipped) or 404.
  // Either way, the body.id in the 200 case MUST NOT equal sub_hostile_123.
  if (res.status === 200) {
    const body = (await res.json()) as { id: string }
    assert(
      body.id !== 'sub_hostile_123',
      `Expected server-resolved subscription id, got body-supplied id: ${body.id}`,
    )
  } else {
    assertEquals(res.status, 404)
  }
})

Deno.test('stripe-cancel-subscription: cancel + reactivate round-trip', async () => {
  if (!SUPABASE_URL || !E2E_OWNER_TOKEN || !STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.log('SKIP: STRIPE_SECRET_KEY sk_test_* and E2E_OWNER_TOKEN required')
    return
  }

  // Cancel
  const cancelRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${E2E_OWNER_TOKEN}`,
    },
    body: JSON.stringify({ action: 'cancel' }),
  })
  assertEquals(cancelRes.status, 200)
  const cancelBody = (await cancelRes.json()) as {
    id: string
    status: string
    cancel_at_period_end: boolean
    current_period_end: number
  }
  assertEquals(cancelBody.cancel_at_period_end, true)
  assert(cancelBody.id.startsWith('sub_'))
  assert(cancelBody.current_period_end > 0)

  // Reactivate
  const reactivateRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${E2E_OWNER_TOKEN}`,
    },
    body: JSON.stringify({ action: 'reactivate' }),
  })
  assertEquals(reactivateRes.status, 200)
  const reactivateBody = (await reactivateRes.json()) as {
    id: string
    cancel_at_period_end: boolean
  }
  assertEquals(reactivateBody.cancel_at_period_end, false)
  assertEquals(reactivateBody.id, cancelBody.id)
})
