// TEST-02: Autopay decline-retry integration test (Deno).
// Proves a Stripe card decline (pm_card_chargeDeclined) increments
// rent_due.autopay_attempts, sets rent_due.autopay_last_attempt_at, and
// schedules rent_due.autopay_next_retry_at per the documented retry
// schedule (attempt 1 -> +2 days, attempt 2 -> +4 days). rent_due.status
// must stay 'pending'.
//
// Run locally:
//   supabase start
//   supabase functions serve
//   export STRIPE_SECRET_KEY=sk_test_...
//   cd supabase/functions && deno test --allow-all --no-check tests/autopay-decline-retry.test.ts

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

Deno.test('autopay-decline-retry: first decline -> attempts=1, next_retry ~ +2 days, status unchanged', async () => {
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
  })

  try {
    const startTime = Date.now()
    const { status, data } = await invokeAutopayCharge(buildAutopayBody(fixture))

    assertEquals(status, 402, 'Stripe decline should return 402')
    assertEquals(data.error, 'Payment failed')
    assertExists(data.code, 'decline response should include code')
    assertExists(data.decline_code, 'decline response should include decline_code')

    const { data: rentDue } = await supabase
      .from('rent_due')
      .select(
        'status, autopay_attempts, autopay_last_attempt_at, autopay_next_retry_at',
      )
      .eq('id', fixture.rentDueId)
      .single()

    assertEquals(
      rentDue?.status,
      'pending',
      'rent_due.status must remain pending after decline',
    )
    assertEquals(
      rentDue?.autopay_attempts,
      1,
      'autopay_attempts should be incremented to 1',
    )
    assertExists(
      rentDue?.autopay_last_attempt_at,
      'autopay_last_attempt_at must be set',
    )

    const lastAttemptMs = new Date(
      rentDue!.autopay_last_attempt_at as string,
    ).getTime()
    assert(
      Math.abs(lastAttemptMs - startTime) < 120_000,
      'autopay_last_attempt_at within 2 minutes of call',
    )

    assertExists(
      rentDue?.autopay_next_retry_at,
      'autopay_next_retry_at must be scheduled after attempt 1',
    )
    const nextRetryHours =
      (new Date(rentDue!.autopay_next_retry_at as string).getTime() -
        startTime) /
      (1000 * 60 * 60)
    assert(
      nextRetryHours >= 36 && nextRetryHours <= 60,
      `next_retry should be ~48h out (got ${nextRetryHours}h)`,
    )
  } finally {
    await cleanupAutopayFixture(supabase, fixture)
  }
})

Deno.test('autopay-decline-retry: second decline -> attempts=2, next_retry ~ +4 days', async () => {
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
    initialAttempts: 1,
  })

  try {
    const startTime = Date.now()
    const { status } = await invokeAutopayCharge(buildAutopayBody(fixture))
    assertEquals(status, 402)

    const { data: rentDue } = await supabase
      .from('rent_due')
      .select('status, autopay_attempts, autopay_next_retry_at')
      .eq('id', fixture.rentDueId)
      .single()

    assertEquals(
      rentDue?.status,
      'pending',
      'rent_due.status must remain pending after second decline',
    )
    assertEquals(rentDue?.autopay_attempts, 2)
    assertExists(rentDue?.autopay_next_retry_at)

    const nextRetryHours =
      (new Date(rentDue!.autopay_next_retry_at as string).getTime() -
        startTime) /
      (1000 * 60 * 60)
    assert(
      nextRetryHours >= 84 && nextRetryHours <= 108,
      `next_retry ~96h expected, got ${nextRetryHours}h`,
    )
  } finally {
    await cleanupAutopayFixture(supabase, fixture)
  }
})
