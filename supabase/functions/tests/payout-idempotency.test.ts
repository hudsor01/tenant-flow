// TEST-05: Payout webhook idempotency integration test (Deno).
// Proves that re-delivering the same signed `payout.paid` event (same event.id,
// same rawBody, same signature) is idempotent:
//   - Second response returns { received: true, duplicate: true } with HTTP 200
//   - Exactly one payout_events row exists (no duplicate insert / upsert-overwrite)
//   - stripe_webhook_events.status stays 'succeeded' (not flipped by duplicate)
//
// Requires all of:
//   1. `supabase functions serve` running locally
//   2. STRIPE_WEBHOOK_SECRET set to the shared secret the serve is configured for
//   3. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
//
// Run locally:
//   cd supabase/functions && deno test --allow-all --no-check \
//     tests/payout-idempotency.test.ts

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildPayoutPaidEvent,
  createPayoutFixture,
  postSignedWebhook,
  signPayoutEvent,
} from './_helpers/payout-fixtures.ts'

function requireEnv(names: string[]): string[] {
  return names.filter((n) => !Deno.env.get(n))
}

Deno.test('payout-idempotency: duplicate payout.paid delivery does not create a second payout_events row', async () => {
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
    const event = buildPayoutPaidEvent({
      stripeAccountId: fixture.stripeAccountId,
    })
    const { rawBody, signatureHeader, eventId } = signPayoutEvent(event)

    // First delivery -- should process the event for real.
    const first = await postSignedWebhook(rawBody, signatureHeader)
    assertEquals(
      first.status,
      200,
      `first delivery expected 200, got ${first.status}: ${JSON.stringify(first.data)}`,
    )
    assertEquals(first.data.received, true)
    // First delivery must NOT be flagged duplicate (there is nothing prior).
    assert(
      first.data.duplicate !== true,
      'first delivery must NOT be flagged duplicate',
    )

    // Second delivery -- same rawBody + same signature + same event.id.
    const second = await postSignedWebhook(rawBody, signatureHeader)
    assertEquals(
      second.status,
      200,
      `second delivery expected 200, got ${second.status}: ${JSON.stringify(second.data)}`,
    )
    assertEquals(second.data.received, true)
    assertEquals(second.data.duplicate, true, 'second delivery must be marked duplicate:true')

    // Exactly one payout_events row for this stripe_payout_id.
    const payoutObj = (event.data as { object: { id: string } }).object
    const { data: rows, error } = await admin
      .from('payout_events')
      .select('id, paid_at, charge_count')
      .eq('stripe_payout_id', payoutObj.id)
    assertEquals(error, null)
    assertExists(rows)
    assertEquals(rows.length, 1, `expected exactly 1 payout_events row, got ${rows.length}`)

    // stripe_webhook_events row stays status='succeeded' after the duplicate.
    const { data: whe } = await admin
      .from('stripe_webhook_events')
      .select('status')
      .eq('id', eventId)
      .single<{ status: string }>()
    assertExists(whe)
    assertEquals(
      whe.status,
      'succeeded',
      'stripe_webhook_events.status must stay succeeded on duplicate',
    )
  } finally {
    await fixture.cleanup()
  }
})
