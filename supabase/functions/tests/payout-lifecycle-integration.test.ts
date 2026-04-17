// TEST-05: Payout lifecycle integration test (Deno).
// Exercises the live `stripe-webhooks` Edge Function with a signed `payout.paid`
// event (and a `payout.failed` variant), then asserts the resulting
// payout_events + stripe_webhook_events rows in the DB.
//
// Requires all of:
//   1. `supabase functions serve` running locally AND
//   2. STRIPE_WEBHOOK_SECRET set to the shared secret the serve is configured
//      for (e.g. the whsec_* printed by `stripe listen`)
//   3. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
//
// If any of the above are missing the test logs SKIP: ... and returns so
// integration tests never become silent false-positives.
//
// Run locally:
//   supabase start
//   supabase functions serve
//   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks
//   export STRIPE_WEBHOOK_SECRET=whsec_...
//   export SUPABASE_URL=http://localhost:54321
//   export SUPABASE_ANON_KEY=<anon key>
//   export SUPABASE_SERVICE_ROLE_KEY=<service role key>
//   cd supabase/functions && deno test --allow-all --no-check \
//     tests/payout-lifecycle-integration.test.ts

import { assertEquals, assertExists } from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildPayoutFailedEvent,
  buildPayoutPaidEvent,
  createPayoutFixture,
  postSignedWebhook,
  signPayoutEvent,
} from './_helpers/payout-fixtures.ts'

function requireEnv(names: string[]): string[] {
  return names.filter((n) => !Deno.env.get(n))
}

Deno.test('payout-lifecycle-integration: payout.paid writes payout_events row end-to-end', async () => {
  const missing = requireEnv([
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])
  if (missing.length > 0) {
    console.log(`SKIP: missing ${missing.join(', ')}`)
    return
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const fixture = await createPayoutFixture(admin)

  try {
    const createdUnix = Math.floor(Date.now() / 1000)
    const arrivalUnix = createdUnix + 2 * 86400

    const event = buildPayoutPaidEvent({
      stripeAccountId: fixture.stripeAccountId,
      amountCents: 150000,
      arrivalDateUnix: arrivalUnix,
      createdUnix,
    })

    const { rawBody, signatureHeader, eventId } = signPayoutEvent(event)
    const { status, data } = await postSignedWebhook(rawBody, signatureHeader)

    // Webhook accepted
    assertEquals(
      status,
      200,
      `Expected 200 from stripe-webhooks, got ${status}: ${JSON.stringify(data)}`,
    )
    assertEquals(data.received, true)

    // payout_events row exists with correct columns
    const payoutObj = (event.data as { object: { id: string } }).object
    const { data: rows, error } = await admin
      .from('payout_events')
      .select(
        'stripe_payout_id, stripe_account_id, owner_user_id, amount, currency, status, paid_at, arrival_date',
      )
      .eq('stripe_payout_id', payoutObj.id)
    assertEquals(error, null)
    assertExists(rows)
    assertEquals(rows.length, 1, `expected exactly one payout_events row, got ${rows.length}`)
    const row = rows[0] as Record<string, unknown>
    assertEquals(row.stripe_account_id, fixture.stripeAccountId)
    assertEquals(row.owner_user_id, fixture.ownerUserId)
    // 150000 cents -> 1500 dollars (handler divides by 100)
    assertEquals(Number(row.amount), 1500)
    assertEquals(row.currency, 'usd')
    assertEquals(row.status, 'paid')
    assertExists(row.paid_at, 'paid_at must be set on payout.paid')
    assertExists(row.arrival_date, 'arrival_date must be set')

    // stripe_webhook_events row succeeded
    const { data: whe, error: wheErr } = await admin
      .from('stripe_webhook_events')
      .select('status')
      .eq('id', eventId)
      .single<{ status: string }>()
    assertEquals(wheErr, null)
    assertExists(whe)
    assertEquals(whe.status, 'succeeded')
  } finally {
    await fixture.cleanup()
  }
})

Deno.test('payout-lifecycle-integration: payout.failed records failure_code + failure_message', async () => {
  const missing = requireEnv([
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])
  if (missing.length > 0) {
    console.log(`SKIP: missing ${missing.join(', ')}`)
    return
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const fixture = await createPayoutFixture(admin)

  try {
    const event = buildPayoutFailedEvent({
      stripeAccountId: fixture.stripeAccountId,
      amountCents: 50000,
      failureCode: 'insufficient_funds',
      failureMessage: 'Not enough balance',
    })

    const { rawBody, signatureHeader, eventId } = signPayoutEvent(event)
    const { status, data } = await postSignedWebhook(rawBody, signatureHeader)

    assertEquals(
      status,
      200,
      `Expected 200 from stripe-webhooks, got ${status}: ${JSON.stringify(data)}`,
    )
    assertEquals(data.received, true)

    const payoutObj = (event.data as { object: { id: string } }).object
    const { data: rows, error } = await admin
      .from('payout_events')
      .select(
        'status, failed_at, failure_code, failure_message, paid_at',
      )
      .eq('stripe_payout_id', payoutObj.id)
    assertEquals(error, null)
    assertExists(rows)
    assertEquals(rows.length, 1)
    const row = rows[0] as Record<string, unknown>
    assertEquals(row.status, 'failed')
    assertExists(row.failed_at, 'failed_at must be set on payout.failed')
    assertEquals(row.failure_code, 'insufficient_funds')
    assertEquals(row.failure_message, 'Not enough balance')
    assertEquals(row.paid_at, null, 'paid_at must stay null on payout.failed')

    const { data: whe } = await admin
      .from('stripe_webhook_events')
      .select('status')
      .eq('id', eventId)
      .single<{ status: string }>()
    assertExists(whe)
    assertEquals(whe.status, 'succeeded')
  } finally {
    await fixture.cleanup()
  }
})
