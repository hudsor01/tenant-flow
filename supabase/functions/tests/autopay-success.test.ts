// TEST-01: Autopay success integration test (Deno).
// Proves `stripe-autopay-charge` settles a rent_due row end-to-end using
// Stripe test mode -- no mocked Stripe client.
//
// Run locally:
//   supabase start
//   supabase functions serve
//   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks
//   export STRIPE_SECRET_KEY=sk_test_...
//   export STRIPE_WEBHOOK_SECRET=whsec_...
//   cd supabase/functions && deno test --allow-all --no-check tests/autopay-success.test.ts
//
// Schema deviation from plan (Rule 3): `rent_payments` has NO `stripe_charge_id`
// column and uses `paid_date` (not `paid_at`). Assertions adapted accordingly.

import { assert, assertEquals, assertExists, assertMatch } from 'jsr:@std/assert@1'
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

Deno.test('autopay-success: charges a rent_due row end-to-end via Stripe test mode', async () => {
  if (!STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.log(
      'SKIP: STRIPE_SECRET_KEY sk_test_* required for live autopay integration',
    )
    return
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('SKIP: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required')
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const fixture = await createAutopayFixture(supabase, {
    paymentMethodId: 'pm_card_visa',
  })

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/stripe-autopay-charge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(buildAutopayBody(fixture)),
      },
    )

    assertEquals(response.status, 200, `Expected 200, got ${response.status}`)
    const body = (await response.json()) as {
      success: boolean
      payment_intent_id: string
      rent_due_id: string
      tenant_id: string
      amount: number
    }
    assertEquals(body.success, true)
    assertMatch(body.payment_intent_id, /^pi_/)
    assertEquals(body.rent_due_id, fixture.rentDueId)
    assertEquals(body.tenant_id, fixture.tenantId)
    assertEquals(body.amount, fixture.tenantAmount)

    // Poll for webhook settlement: `payment_intent.succeeded` is async.
    const deadline = Date.now() + 20_000
    let payment: Record<string, unknown> | null = null
    while (Date.now() < deadline) {
      const { data } = await supabase
        .from('rent_payments')
        .select(
          'status, paid_date, tenant_id, lease_id, amount, stripe_payment_intent_id',
        )
        .eq('stripe_payment_intent_id', body.payment_intent_id)
        .maybeSingle()
      if (data && data.status === 'succeeded') {
        payment = data as Record<string, unknown>
        break
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    assertExists(
      payment,
      'rent_payments row should reach status=succeeded via webhook within 20s',
    )
    assertEquals(payment.status, 'succeeded')
    assertEquals(payment.tenant_id, fixture.tenantId)
    assertEquals(payment.lease_id, fixture.leaseId)
    assertEquals(Number(payment.amount), fixture.tenantAmount)
    assertEquals(
      payment.stripe_payment_intent_id,
      body.payment_intent_id,
      'rent_payments.stripe_payment_intent_id must match the returned PI id',
    )
    assertExists(
      payment.paid_date,
      'paid_date should be non-null after webhook succeeds',
    )

    // rent_due.status must flip to 'paid'.
    const { data: rentDue } = await supabase
      .from('rent_due')
      .select('status')
      .eq('id', fixture.rentDueId)
      .single()
    assertEquals(rentDue?.status, 'paid')

    // Sanity: assert the PI id shape (belt + braces on the pi_ prefix).
    assert(
      String(payment.stripe_payment_intent_id).startsWith('pi_'),
      'stripe_payment_intent_id must start with pi_',
    )
  } finally {
    await cleanupAutopayFixture(supabase, fixture)
  }
})
