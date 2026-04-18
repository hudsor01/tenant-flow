import Stripe from 'stripe'
import { captureWebhookError, logEvent } from '../../_shared/errors.ts'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle checkout.session.completed event.
 * Writes landlord SaaS subscription state to users table so the proxy gate
 * flips immediately on checkout completion (before subscription.created is
 * processed). Tenant-rent subscription and autopay-payment-method paths were
 * removed with the landlord-only refactor.
 */
export async function handleCheckoutSessionCompleted(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session

  // Landlord SaaS subscription — write subscription state for proxy gate.
  if (!session.subscription || !session.metadata?.['supabase_user_id']) {
    return
  }

  const subId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription.id

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
      captureWebhookError(error, {
        message: '[CHECKOUT] Failed to update user subscription state',
        user_id: session.metadata['supabase_user_id'],
        sub_id: sub.id,
      })
    } else {
      logEvent('[CHECKOUT] Granted dashboard access to user', {
        user_id: session.metadata['supabase_user_id'],
        sub_id: sub.id,
        status: sub.status,
      })
    }
  } catch (subErr) {
    captureWebhookError(subErr, {
      message: '[CHECKOUT] Failed to retrieve subscription for user gate',
      sub_id: subId,
    })
  }
}
