// TEST-03: Autopay final-attempt exhaustion integration test (Deno).
// Proves the 3rd failed autopay attempt does NOT schedule a 4th retry
// (autopay_next_retry_at stays null) and inserts an owner notification
// with title containing "Autopay exhausted".
//
// Scope note: the requirement wording says "sends the 'autopay final
// attempt failed' notification via the Resend path". This test asserts
// the DB notifications row (deterministic) rather than intercepting the
// outbound Resend HTTP call (flaky, non-deterministic). Reaching
// attempts=3 gates the Resend send in handleAutopayFailure, so the row
// is sufficient proof the branch executed.
//
// Run locally:
//   supabase start
//   supabase functions serve
//   export STRIPE_SECRET_KEY=sk_test_...
//   cd supabase/functions && deno test --allow-all --no-check tests/autopay-final-attempt.test.ts

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildAutopayBody,
  cleanupAutopayFixture,
  createAutopayFixture,
} from './_helpers/autopay-fixtures.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

interface AutopayInvokeResult {
  status: number
  data: Record<string, unknown>
}

async function invokeAutopayCharge(
  body: Record<string, unknown>,
): Promise<AutopayInvokeResult> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/stripe-autopay-charge`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    },
  )
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, data }
}

Deno.test('autopay-final-attempt: 3rd decline stops retrying and inserts owner notification', async () => {
  if (!STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.log('SKIP: STRIPE_SECRET_KEY sk_test_* required')
    return
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('SKIP: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required')
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const fixture = await createAutopayFixture(supabase, {
    paymentMethodId: 'pm_card_chargeDeclined',
    initialAttempts: 2,
  })

  try {
    const { status } = await invokeAutopayCharge(buildAutopayBody(fixture))
    assertEquals(status, 402, 'Stripe decline returns 402')

    // Verify rent_due: attempts=3, next_retry=null, status unchanged.
    const { data: rentDue } = await supabase
      .from('rent_due')
      .select('status, autopay_attempts, autopay_next_retry_at')
      .eq('id', fixture.rentDueId)
      .single()

    assertEquals(
      rentDue?.autopay_attempts,
      3,
      'attempts must reach MAX_AUTOPAY_ATTEMPTS=3',
    )
    assertEquals(
      rentDue?.autopay_next_retry_at,
      null,
      'no 4th retry should be scheduled',
    )
    assertEquals(
      rentDue?.status,
      'pending',
      'status stays pending -- payment never succeeded',
    )

    // Verify owner notification row was inserted.
    const { data: notifications } = await supabase
      .from('notifications')
      .select('title, notification_type, entity_type, entity_id, user_id')
      .eq('user_id', fixture.ownerUserId)
      .eq('entity_id', fixture.rentDueId)
      .eq('notification_type', 'payment')

    assert(
      notifications !== null && notifications.length >= 1,
      'Owner notification must be inserted when attempts reaches MAX',
    )
    const exhaustedNotif = notifications!.find(
      (n) =>
        typeof n.title === 'string' && n.title.includes('Autopay exhausted'),
    )
    assertExists(
      exhaustedNotif,
      `Expected 'Autopay exhausted' title, got titles: ${
        notifications!.map((n) => n.title).join(', ')
      }`,
    )
    assertEquals(exhaustedNotif.entity_type, 'rent_due')
  } finally {
    // Notification rows are cleaned by cleanupAutopayFixture's
    // notifications-by-entity_id delete step.
    await cleanupAutopayFixture(supabase, fixture)
  }
})
