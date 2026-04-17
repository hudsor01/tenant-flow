// Stripe Webhooks Edge Function
// Thin router: verifies signature, checks idempotency, routes to handler modules.
// PUBLIC endpoint — authentication is Stripe webhook signature (not JWT).
// On failure: return 500 so Stripe retries (retries for 72 hours).
// On duplicate: return 200 immediately (idempotent via stripe_webhook_events PK).

import Stripe from 'stripe'
import * as Sentry from '@sentry/deno'
import { getStripeClient } from '../_shared/stripe-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse, captureWebhookWarning } from '../_shared/errors.ts'
import { handleCustomerSubscriptionUpdated } from './handlers/customer-subscription-updated.ts'
import { handleCustomerSubscriptionDeleted } from './handlers/customer-subscription-deleted.ts'
import { handleAccountUpdated } from './handlers/account-updated.ts'
import { handlePaymentIntentSucceeded } from './handlers/payment-intent-succeeded.ts'
import { handlePaymentIntentFailed } from './handlers/payment-intent-failed.ts'
import { handleCheckoutSessionCompleted } from './handlers/checkout-session-completed.ts'
import { handleInvoicePaymentFailed } from './handlers/invoice-payment-failed.ts'
import { handlePayoutLifecycle } from './handlers/payout-lifecycle.ts'

// Initialize Sentry for error monitoring (Decision #15: Sentry is MANDATORY for metadata validation)
const sentryDsn = Deno.env.get('SENTRY_DSN')
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn })
} else {
  console.warn('[SENTRY] SENTRY_DSN not set — falling back to structured console.error logging')
}

Deno.serve(async (req: Request) => {

  let env: Record<string, string>
  try {
    env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
      optional: ['SENTRY_DSN', 'FRONTEND_URL', 'RESEND_API_KEY'],
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'env_validation' })
  }

  const stripe = getStripeClient(env.STRIPE_SECRET_KEY)
  const supabase = createAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Verify Stripe signature
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: 'Webhook signature verification failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // PAY-15: Idempotency with status tracking
  const { error: idempotencyError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      data: event.data as unknown as Record<string, unknown>,
      status: 'processing',
    })

  if (idempotencyError) {
    if (idempotencyError.code === '23505') {
      const { data: existing } = await supabase
        .from('stripe_webhook_events')
        .select('status')
        .eq('id', event.id)
        .single()

      if (existing?.status === 'failed') {
        await supabase
          .from('stripe_webhook_events')
          .update({ status: 'processing', error_message: null })
          .eq('id', event.id)
      } else {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Failed to record event' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Route to handler
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleCustomerSubscriptionUpdated(supabase, stripe, event)
        break
      case 'customer.subscription.deleted':
        await handleCustomerSubscriptionDeleted(supabase, stripe, event)
        break
      case 'account.updated':
        await handleAccountUpdated(supabase, stripe, event)
        break
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, stripe, event)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, stripe, event)
        break
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(supabase, stripe, event)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, stripe, event)
        break
      case 'payout.created':
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutLifecycle(supabase, stripe, event)
        break
      default:
        captureWebhookWarning('[WEBHOOK] Unhandled event type', { event_type: event.type, event_id: event.id })
        break
    }

    await supabase
      .from('stripe_webhook_events')
      .update({ status: 'succeeded' })
      .eq('id', event.id)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    await supabase
      .from('stripe_webhook_events')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', event.id)
    return errorResponse(req, 500, err, { action: 'process_webhook_event', event_id: event.id })
  }
})
