// Stripe Webhooks Edge Function
// Verifies Stripe signature, records event for idempotency, processes event.
// PUBLIC endpoint — authentication is Stripe webhook signature (not JWT).
// On failure: return 500 so Stripe retries (retries for 72 hours).
// On duplicate: return 200 immediately (idempotent via stripe_webhook_events PK).

import Stripe from 'npm:stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          notification_type: 'stripe_connect_verified',
        }).then(({ error: notifError }) => {
          if (notifError) console.error('Failed to create notification:', notifError.message)
        })
      }
      break
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      // Upsert rent_payment record — update status if exists, create if not
      const { data: existingPayment } = await supabase
        .from('rent_payments')
        .select('id')
        .eq('stripe_payment_intent_id', pi.id)
        .single()

      if (existingPayment) {
        const { error } = await supabase
          .from('rent_payments')
          .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
          .eq('stripe_payment_intent_id', pi.id)
        if (error) throw error
      } else {
        // New payment_intent with no existing record — create from metadata
        const { error } = await supabase
          .from('rent_payments')
          .insert({
            stripe_payment_intent_id: pi.id,
            amount: pi.amount / 100, // Stripe stores in cents
            currency: pi.currency.toUpperCase(),
            status: 'paid',
            tenant_id: pi.metadata?.['tenant_id'] ?? '',
            lease_id: pi.metadata?.['lease_id'] ?? '',
            application_fee_amount: (pi.application_fee_amount ?? 0) / 100,
            payment_method_type: 'stripe',
            period_start: pi.metadata?.['period_start'] ?? new Date().toISOString().split('T')[0],
            period_end: pi.metadata?.['period_end'] ?? new Date().toISOString().split('T')[0],
            due_date: pi.metadata?.['due_date'] ?? new Date().toISOString().split('T')[0],
            paid_date: new Date().toISOString().split('T')[0],
          })
        if (error) throw error
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
        // Find the property owner via lease → unit → property → user_id
        const { data: leaseData } = await supabase
          .from('leases')
          .select('unit_id, units!inner(property_id, properties!inner(user_id))')
          .eq('id', failedPayment.lease_id)
          .single()

        const ownerId = (leaseData?.units as unknown as { properties: { user_id: string } })?.properties?.user_id
        if (ownerId) {
          await supabase.from('notifications').insert({
            user_id: ownerId,
            title: 'Rent payment failed',
            message: `A rent payment of $${failedPayment.amount.toFixed(2)} failed. Check your Stripe dashboard for details.`,
            notification_type: 'payment_failed',
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
