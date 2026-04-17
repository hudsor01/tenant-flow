import Stripe from 'stripe'
import { captureWebhookError, logEvent } from '../../_shared/errors.ts'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle checkout.session.completed event.
 * Updates lease with subscription ID and saves payment method for autopay.
 */
export async function handleCheckoutSessionCompleted(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session
  // Path 1: tenant rent — update lease with the subscription ID from checkout
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

  // Path 2: owner SaaS — write subscription state to users table for proxy gate
  // (subscription.created webhook also fires; this handler ensures the user is gated
  // immediately upon checkout completion, before subscription.created is processed)
  if (session.subscription && session.metadata?.['supabase_user_id']) {
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
    try {
      const sub = await stripe.subscriptions.retrieve(subId)
      const priceId = sub.items.data[0]?.price.id ?? null
      const planLookup = sub.items.data[0]?.price.lookup_key ?? null
      const { error } = await supabase
        .from('users')
        .update({
          subscription_id: sub.id,
          subscription_status: sub.status,
          subscription_plan: planLookup ?? priceId,
          subscription_current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq('id', session.metadata['supabase_user_id'])
      if (error) {
        captureWebhookError(error, { message: '[CHECKOUT] Failed to update user subscription state', user_id: session.metadata['supabase_user_id'], sub_id: sub.id })
      } else {
        logEvent('[CHECKOUT] Granted dashboard access to user', {
          user_id: session.metadata['supabase_user_id'],
          sub_id: sub.id,
          status: sub.status,
        })
      }
    } catch (subErr) {
      captureWebhookError(subErr, { message: '[CHECKOUT] Failed to retrieve subscription for user gate', sub_id: subId })
    }
  }

  // Save payment method from checkout with setup_future_usage for autopay.
  if (session.payment_intent && session.customer) {
    try {
      await saveCheckoutPaymentMethod(supabase, stripe, session)
    } catch (saveErr) {
      // Non-fatal — log and continue. Tenant can still add payment methods manually.
      captureWebhookError(saveErr, { message: '[AUTOPAY] Failed to save checkout payment method', session_id: session.id })
    }
  }
}

// ---------------------------------------------------------------------------
// Save payment method from Stripe Checkout session for autopay use.
// ---------------------------------------------------------------------------
async function saveCheckoutPaymentMethod(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<void> {
  const piId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as Stripe.PaymentIntent | null)?.id

  if (!piId) return

  const pi = await stripe.paymentIntents.retrieve(piId)
  const pmId = typeof pi.payment_method === 'string'
    ? pi.payment_method
    : (pi.payment_method as Stripe.PaymentMethod | null)?.id

  if (!pmId) return

  const tenantId = pi.metadata?.['tenant_id']
  if (!tenantId) return

  // Check if this payment method already exists in our DB
  const { data: existing } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('stripe_payment_method_id', pmId)
    .maybeSingle()

  if (existing) return // Already saved

  // Retrieve the full payment method details from Stripe
  const pm = await stripe.paymentMethods.retrieve(pmId)

  // Check if tenant has any existing payment methods (to set is_default)
  const { count } = await supabase
    .from('payment_methods')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const isFirst = (count ?? 0) === 0

  const { error: insertError } = await supabase
    .from('payment_methods')
    .insert({
      tenant_id: tenantId,
      stripe_payment_method_id: pmId,
      type: pm.type ?? 'card',
      brand: pm.card?.brand ?? null,
      last_four: pm.card?.last4 ?? null,
      exp_month: pm.card?.exp_month ?? null,
      exp_year: pm.card?.exp_year ?? null,
      is_default: isFirst,
    })

  if (insertError) {
    captureWebhookError(insertError, { message: '[AUTOPAY] Failed to insert payment method', pm_id: pmId, tenant_id: tenantId })
  } else {
    logEvent('[AUTOPAY] Saved payment method', { pm_id: pmId, tenant_id: tenantId })
  }
}
