// Stripe Webhooks Edge Function
// Verifies Stripe signature, records event for idempotency, processes event.
// PUBLIC endpoint — authentication is Stripe webhook signature (not JWT).
// On failure: return 500 so Stripe retries (retries for 72 hours).
// On duplicate: return 200 immediately (idempotent via stripe_webhook_events PK).
// After successful payment: sends receipt emails via Resend (fire-and-forget, never affects response).

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendEmail } from '../_shared/resend.ts'
import { PaymentReceipt } from './_templates/payment-receipt.tsx'
import { OwnerNotification } from './_templates/owner-notification.tsx'

Deno.serve(async (req: Request) => {

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify Stripe signature
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Webhook signature verification failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Idempotency check — attempt to insert event ID
  // ON CONFLICT (PK violation) means already processed — return 200
  const { error: idempotencyError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      data: event.data as unknown as Record<string, unknown>,
    })

  if (idempotencyError) {
    if (idempotencyError.code === '23505') {
      // Duplicate key — already processed
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    // Other DB errors — return 500 so Stripe retries
    return new Response(
      JSON.stringify({ error: 'Failed to record event' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Process the event
  try {
    await processEvent(supabase, stripe, event)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Processing failed — delete the idempotency record so Stripe retry can re-process
    await supabase.from('stripe_webhook_events').delete().eq('id', event.id)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function processEvent(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // Find lease by stripe_subscription_id and update subscription status
      const { data: leases, error } = await supabase
        .from('leases')
        .select('id')
        .eq('stripe_subscription_id', sub.id)
        .limit(1)
      if (error) throw error
      if (leases && leases.length > 0) {
        const { error: updateError } = await supabase
          .from('leases')
          .update({
            stripe_subscription_status: sub.status,
          })
          .eq('stripe_subscription_id', sub.id)
        if (updateError) throw updateError
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const { error } = await supabase
        .from('leases')
        .update({ stripe_subscription_status: 'canceled' })
        .eq('stripe_subscription_id', sub.id)
      if (error) throw error
      break
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account

      // Fetch previous state to detect charges_enabled flip for notification
      const { data: existing } = await supabase
        .from('stripe_connected_accounts')
        .select('charges_enabled, user_id')
        .eq('stripe_account_id', account.id)
        .single()

      // Determine onboarding status based on Stripe account state
      let onboardingStatus: 'not_started' | 'in_progress' | 'completed' = 'in_progress'
      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        onboardingStatus = 'completed'
      } else if (!account.details_submitted) {
        onboardingStatus = 'not_started'
      }

      const requirementsDue = [
        ...(account.requirements?.currently_due ?? []),
        ...(account.requirements?.past_due ?? []),
        ...(account.requirements?.eventually_due ?? []),
      ]

      const { error } = await supabase
        .from('stripe_connected_accounts')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements_due: requirementsDue,
          onboarding_status: onboardingStatus,
          onboarding_completed_at: onboardingStatus === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_account_id', account.id)
      if (error) throw error

      // Notify owner only when charges_enabled flips to true
      if (!existing?.charges_enabled && account.charges_enabled && existing?.user_id) {
        await supabase.from('notifications').insert({
          user_id: existing.user_id,
          title: 'Stripe account verified',
          message: 'Your Stripe account has been fully verified — you can now receive rent payments.',
          notification_type: 'system',
        }).then(({ error: notifError }) => {
          if (notifError) console.error('Failed to create notification:', notifError.message)
        })
      }
      break
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const metadata = pi.metadata ?? {}
      const rentDueId = metadata['rent_due_id'] || null
      const grossAmount = pi.amount / 100 // Stripe stores in cents
      const platformFeeAmount = (pi.application_fee_amount ?? 0) / 100

      // Get the charge to access balance_transaction for Stripe processing fee
      let stripeFeeAmount = 0
      const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : (pi.latest_charge as Stripe.Charge | null)?.id
      if (chargeId) {
        try {
          const charge = await stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] })
          const bt = charge.balance_transaction
          if (bt && typeof bt !== 'string') {
            // balance_transaction.fee is in cents and includes Stripe processing fee
            stripeFeeAmount = bt.fee / 100
          }
        } catch (feeErr) {
          // Non-fatal — log and continue with stripeFeeAmount = 0
          console.error('Failed to retrieve balance transaction for fee calculation:', feeErr)
        }
      }

      const netAmount = grossAmount - platformFeeAmount - stripeFeeAmount

      // Upsert rent_payment record — update status if exists, create if not
      const { data: existingPayment } = await supabase
        .from('rent_payments')
        .select('id')
        .eq('stripe_payment_intent_id', pi.id)
        .single()

      if (existingPayment) {
        const { error } = await supabase
          .from('rent_payments')
          .update({
            status: 'succeeded',
            paid_date: new Date().toISOString().split('T')[0],
            gross_amount: grossAmount,
            platform_fee_amount: platformFeeAmount,
            stripe_fee_amount: stripeFeeAmount,
            net_amount: netAmount,
          })
          .eq('stripe_payment_intent_id', pi.id)
        if (error) throw error
      } else {
        // New payment_intent with no existing record — create from metadata
        const { error } = await supabase
          .from('rent_payments')
          .insert({
            stripe_payment_intent_id: pi.id,
            amount: grossAmount,
            gross_amount: grossAmount,
            platform_fee_amount: platformFeeAmount,
            stripe_fee_amount: stripeFeeAmount,
            net_amount: netAmount,
            currency: pi.currency.toUpperCase(),
            status: 'succeeded',
            tenant_id: metadata['tenant_id'] ?? '',
            lease_id: metadata['lease_id'] ?? '',
            application_fee_amount: platformFeeAmount,
            payment_method_type: 'stripe',
            period_start: metadata['period_start'] ?? new Date().toISOString().split('T')[0],
            period_end: metadata['period_end'] ?? new Date().toISOString().split('T')[0],
            due_date: metadata['due_date'] ?? new Date().toISOString().split('T')[0],
            paid_date: new Date().toISOString().split('T')[0],
            rent_due_id: rentDueId,
            checkout_session_id: metadata['checkout_session_id'] ?? null,
          })
        if (error) throw error
      }

      // Fire-and-forget receipt emails — errors logged, never thrown
      // This MUST NOT affect the webhook response (always 200 after DB write succeeds)
      try {
        await sendReceiptEmails(supabase, stripe, pi, grossAmount)
      } catch (emailErr) {
        console.error('[RESEND_ERROR] sendReceiptEmails unexpected error:', emailErr)
      }

      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent

      // Update rent_payment status to failed and retrieve record for owner notification
      const { data: failedPayment, error } = await supabase
        .from('rent_payments')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', pi.id)
        .select('tenant_id, lease_id, amount')
        .single()
      // Don't throw if no record found — payment may not exist in our DB
      if (error && error.code !== 'PGRST116') throw error

      // Notify the property owner about the failed payment
      if (failedPayment) {
        // leases.owner_user_id is the direct FK — no need to join through units/properties
        const { data: leaseData } = await supabase
          .from('leases')
          .select('owner_user_id')
          .eq('id', failedPayment.lease_id)
          .single()

        const ownerId = leaseData?.owner_user_id as string | null
        if (ownerId) {
          await supabase.from('notifications').insert({
            user_id: ownerId,
            title: 'Rent payment failed',
            message: `A rent payment of $${failedPayment.amount.toFixed(2)} failed. Check your Stripe dashboard for details.`,
            notification_type: 'payment',
          }).then(({ error: notifError }) => {
            if (notifError) console.error('Failed to create payment failure notification:', notifError.message)
          })
        }
      }
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      // Update lease with the subscription ID from checkout
      if (session.subscription && session.metadata?.['lease_id']) {
        const { error } = await supabase
          .from('leases')
          .update({
            stripe_subscription_id: session.subscription as string,
            stripe_subscription_status: 'active',
          })
          .eq('id', session.metadata['lease_id'])
        if (error) throw error
      }
      break
    }

    default:
      // Return 200 for unhandled events (acknowledge receipt)
      // No error for common non-critical events — Stripe should not retry
      console.log(`Unhandled event type: ${event.type}`)
      break
  }
}

// ---------------------------------------------------------------------------
// Receipt email sending — fire-and-forget after successful payment
// NEVER throws — all errors are caught and logged. Webhook response is not affected.
// Resend automatically checks its suppression list; suppressed recipients are skipped silently.
// ---------------------------------------------------------------------------
async function sendReceiptEmails(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  pi: Stripe.PaymentIntent,
  grossAmount: number
): Promise<void> {
  const metadata = pi.metadata ?? {}
  const tenantId = metadata['tenant_id']
  const leaseId = metadata['lease_id']
  const propertyId = metadata['property_id']
  const unitId = metadata['unit_id']
  const periodMonth = metadata['period_month'] ?? ''
  const periodYear = metadata['period_year'] ?? ''

  // Bail if missing critical metadata (e.g., non-rent payment_intent)
  if (!tenantId || !leaseId || !propertyId) {
    console.log('[EMAIL_SKIP] Missing metadata for receipt emails — likely a non-rent PaymentIntent')
    return
  }

  // 1. Resolve tenant, lease, property, unit data in parallel
  const [tenantResult, leaseResult, propertyResult, unitResult] = await Promise.all([
    supabase.from('tenants').select('user_id').eq('id', tenantId).single(),
    supabase.from('leases').select('owner_user_id').eq('id', leaseId).single(),
    supabase.from('properties').select('address_line1, city, state, postal_code').eq('id', propertyId).single(),
    unitId
      ? supabase.from('units').select('unit_number').eq('id', unitId).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (!tenantResult.data || !leaseResult.data || !propertyResult.data) {
    console.error('[RESEND_ERROR] Missing critical data for receipt emails:', {
      tenant: !!tenantResult.data,
      lease: !!leaseResult.data,
      property: !!propertyResult.data,
    })
    return
  }

  const tenantUserId = tenantResult.data.user_id as string
  const ownerUserId = leaseResult.data.owner_user_id as string
  const prop = propertyResult.data
  const unitNumber = (unitResult.data as { unit_number: string | null } | null)?.unit_number ?? null

  // 2. Resolve user emails, names, and notification_settings in parallel
  const [tenantUserResult, ownerUserResult, tenantSettingsResult, ownerSettingsResult] = await Promise.all([
    supabase.from('users').select('email, full_name').eq('id', tenantUserId).single(),
    supabase.from('users').select('email, full_name').eq('id', ownerUserId).single(),
    supabase.from('notification_settings').select('email').eq('user_id', tenantUserId).maybeSingle(),
    supabase.from('notification_settings').select('email').eq('user_id', ownerUserId).maybeSingle(),
  ])

  // notification_settings: default to sending if no row exists (absence = opt-in)
  const tenantEmailEnabled = tenantSettingsResult.data?.email !== false
  const ownerEmailEnabled = ownerSettingsResult.data?.email !== false

  // 3. Resolve payment method last4 from the charge (best-effort)
  let paymentMethodLast4: string | null = null
  try {
    const chargeId = typeof pi.latest_charge === 'string'
      ? pi.latest_charge
      : (pi.latest_charge as Stripe.Charge | null)?.id
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId)
      paymentMethodLast4 = (charge.payment_method_details?.card?.last4) ?? null
    }
  } catch (cardErr) {
    // Non-critical — receipt will omit payment method info
    console.error('[RESEND_ERROR] Failed to retrieve card last4:', cardErr)
  }

  // 4. Format data for templates
  const propertyAddress = `${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.postal_code}`
  const formattedAmount = grossAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const paymentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Check for late fee from the rent_payments record
  // late_fee_amount may be set by future phases; for now it defaults to null
  let lateFeeAmount: string | null = null
  let baseRentAmount: string | null = null
  const { data: paymentRecord } = await supabase
    .from('rent_payments')
    .select('late_fee_amount')
    .eq('stripe_payment_intent_id', pi.id)
    .single()
  if (paymentRecord?.late_fee_amount && paymentRecord.late_fee_amount > 0) {
    const lateFee = paymentRecord.late_fee_amount
    lateFeeAmount = lateFee.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    baseRentAmount = (grossAmount - lateFee).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  // 5. Render and send emails in parallel
  const emailPromises: Promise<void>[] = []

  // Tenant receipt email
  if (tenantUserResult.data?.email && tenantEmailEnabled) {
    const tenantEmail = tenantUserResult.data.email as string
    const tenantName = (tenantUserResult.data.full_name as string) || 'Tenant'

    emailPromises.push((async () => {
      const html = await renderAsync(
        React.createElement(PaymentReceipt, {
          tenantName,
          amount: formattedAmount,
          propertyAddress,
          unitNumber,
          paymentDate,
          periodMonth,
          periodYear,
          paymentMethodLast4,
          lateFeeAmount,
          baseRentAmount,
        })
      )
      const result = await sendEmail({
        to: [tenantEmail],
        subject: `Payment Receipt - ${periodMonth} ${periodYear}`,
        html,
        tags: [
          { name: 'type', value: 'payment_receipt' },
          { name: 'tenant_id', value: tenantId },
        ],
      })
      if (!result.success) {
        console.error('[RESEND_ERROR] Tenant receipt email failed:', result.error)
      }
    })())
  } else if (!tenantUserResult.data?.email) {
    console.warn('[EMAIL_SKIP] Tenant has no email address:', tenantUserId)
  } else {
    console.log('[EMAIL_SKIP] Tenant email notifications disabled:', tenantUserId)
  }

  // Owner notification email
  if (ownerUserResult.data?.email && ownerEmailEnabled) {
    const ownerEmail = ownerUserResult.data.email as string
    const ownerName = (ownerUserResult.data.full_name as string) || 'Property Owner'
    const tenantName = (tenantUserResult.data?.full_name as string) || 'Tenant'

    emailPromises.push((async () => {
      const html = await renderAsync(
        React.createElement(OwnerNotification, {
          ownerName,
          tenantName,
          amount: formattedAmount,
          propertyAddress,
          unitNumber,
          paymentDate,
        })
      )
      const result = await sendEmail({
        to: [ownerEmail],
        subject: `Payment Received - ${tenantName}`,
        html,
        tags: [
          { name: 'type', value: 'owner_payment_notification' },
          { name: 'lease_id', value: leaseId },
        ],
      })
      if (!result.success) {
        console.error('[RESEND_ERROR] Owner notification email failed:', result.error)
      }
    })())
  } else if (!ownerUserResult.data?.email) {
    console.warn('[EMAIL_SKIP] Owner has no email address:', ownerUserId)
  } else {
    console.log('[EMAIL_SKIP] Owner email notifications disabled:', ownerUserId)
  }

  // Wait for all emails — allSettled ensures one failure doesn't block the other
  const results = await Promise.allSettled(emailPromises)
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[RESEND_ERROR] Email promise rejected:', result.reason)
    }
  }
}
