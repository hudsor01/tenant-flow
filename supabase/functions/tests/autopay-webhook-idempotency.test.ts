// TEST-04: Stripe webhook replay idempotency integration test (Deno).
// Proves replaying the same payment_intent.succeeded event.id leaves DB
// state idempotent: no duplicate rent_payments rows, stripe_webhook_events
// stays status='succeeded', no double-decrement of retry counters.
//
// Run locally:
//   supabase start
//   supabase functions serve
//   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks
//   export STRIPE_WEBHOOK_SECRET=whsec_...  (from `stripe listen` output)
//   cd supabase/functions && deno test --allow-all --no-check tests/autopay-webhook-idempotency.test.ts

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'
import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@20'
import {
  cleanupAutopayFixture,
  createAutopayFixture,
} from './_helpers/autopay-fixtures.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

Deno.test('autopay-webhook-idempotency: replaying payment_intent.succeeded is idempotent', async () => {
  if (!STRIPE_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
    console.log(
      'SKIP: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY required',
    )
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const fixture = await createAutopayFixture(supabase)

  const uuidPart = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  const eventId = `evt_test_idempotent_${uuidPart}`
  const piId = `pi_test_idempotent_${uuidPart}`
  const chargeId = `ch_test_idempotent_${uuidPart}`

  const today = new Date().toISOString().split('T')[0]
  const amountCents = Math.round(fixture.tenantAmount * 100)

  const event = {
    id: eventId,
    object: 'event',
    type: 'payment_intent.succeeded',
    api_version: '2026-02-25.clover',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: piId,
        object: 'payment_intent',
        amount: amountCents,
        currency: 'usd',
        status: 'succeeded',
        latest_charge: chargeId,
        application_fee_amount: Math.round(amountCents * 0.05),
        metadata: {
          tenant_id: fixture.tenantId,
          lease_id: fixture.leaseId,
          property_id: fixture.propertyId,
          unit_id: fixture.unitId,
          rent_due_id: fixture.rentDueId,
          period_start: today,
          period_end: today,
          due_date: today,
        },
      },
    },
  }

  const payload = JSON.stringify(event)

  // Generate a valid Stripe signature so the webhook accepts the payload.
  // The Stripe client constructor arg is unused for signature generation;
  // we just need access to webhooks.generateTestHeaderString.
  const stripeClient = new Stripe('sk_test_webhook_idempotency_unused', {
    apiVersion: '2026-02-25.clover',
  })
  const signature = stripeClient.webhooks.generateTestHeaderString({
    payload,
    secret: STRIPE_WEBHOOK_SECRET,
  })

  async function postWebhook(): Promise<{
    status: number
    body: Record<string, unknown>
  }> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return { status: res.status, body }
  }

  try {
    // First delivery.
    const first = await postWebhook()
    assertEquals(first.status, 200)
    assertEquals(first.body.received, true)
    assertEquals(
      first.body.duplicate,
      undefined,
      'first delivery must NOT be flagged duplicate',
    )

    // Verify state after first delivery.
    const { data: payments1, count: count1 } = await supabase
      .from('rent_payments')
      .select('status, stripe_payment_intent_id', { count: 'exact' })
      .eq('stripe_payment_intent_id', piId)
    assertEquals(
      count1,
      1,
      'exactly one rent_payments row after first delivery',
    )
    assertExists(payments1)
    assertEquals(payments1![0]!.status, 'succeeded')

    const { data: webhookRow1 } = await supabase
      .from('stripe_webhook_events')
      .select('status, error_message')
      .eq('id', eventId)
      .single()
    assertEquals(webhookRow1?.status, 'succeeded')

    const { data: rentDue1 } = await supabase
      .from('rent_due')
      .select('status, autopay_attempts')
      .eq('id', fixture.rentDueId)
      .single()
    assertEquals(rentDue1?.status, 'paid')
    const attemptsAfterFirst = rentDue1?.autopay_attempts as number

    // Second delivery -- same event.id, same signature.
    const second = await postWebhook()
    assertEquals(second.status, 200)
    assertEquals(second.body.received, true)
    assertEquals(
      second.body.duplicate,
      true,
      'second delivery must be flagged duplicate',
    )

    // Verify state unchanged.
    const { count: count2 } = await supabase
      .from('rent_payments')
      .select('stripe_payment_intent_id', { count: 'exact', head: true })
      .eq('stripe_payment_intent_id', piId)
    assertEquals(
      count2,
      1,
      'rent_payments row count must still be exactly 1 (no duplicate insert)',
    )

    const { data: webhookRow2 } = await supabase
      .from('stripe_webhook_events')
      .select('status')
      .eq('id', eventId)
      .single()
    assertEquals(
      webhookRow2?.status,
      'succeeded',
      'webhook status stays succeeded on replay',
    )

    const { data: rentDue2 } = await supabase
      .from('rent_due')
      .select('status, autopay_attempts')
      .eq('id', fixture.rentDueId)
      .single()
    assertEquals(rentDue2?.status, 'paid')
    assertEquals(
      rentDue2?.autopay_attempts,
      attemptsAfterFirst,
      'autopay_attempts must not change on replay',
    )

    // Sanity: both invocations returned valid JSON bodies.
    assert(typeof first.body === 'object' && typeof second.body === 'object')
  } finally {
    // Clean up the hand-crafted rent_payments and webhook_events rows
    // before the fixture cleanup (FK dependency).
    await supabase
      .from('rent_payments')
      .delete()
      .eq('stripe_payment_intent_id', piId)
    await supabase.from('stripe_webhook_events').delete().eq('id', eventId)
    await cleanupAutopayFixture(supabase, fixture)
  }
})
