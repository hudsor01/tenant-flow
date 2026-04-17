import Stripe from 'stripe'
import { captureWebhookWarning, logEvent } from '../../_shared/errors.ts'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle customer.subscription.created and customer.subscription.updated events.
 *
 * Two paths:
 *   1. Tenant rent subscription → update leases.stripe_subscription_status
 *   2. Owner SaaS subscription → update users.subscription_* columns (gates dashboard access)
 *
 * Disambiguation: lease subscriptions have lease_id in metadata; owner subscriptions are
 * identified by matching customer to users.stripe_customer_id.
 */
export async function handleCustomerSubscriptionUpdated(
  supabase: SupabaseAdmin,
  _stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // Path 1: tenant rent subscription
  const { data: leases } = await supabase
    .from('leases')
    .select('id')
    .eq('stripe_subscription_id', sub.id)
    .limit(1)

  if (leases && leases.length > 0) {
    const { error: updateError } = await supabase
      .from('leases')
      .update({ stripe_subscription_status: sub.status })
      .eq('stripe_subscription_id', sub.id)
    if (updateError) throw updateError
    return
  }

  // Path 2: owner SaaS subscription — find user by stripe_customer_id
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!user) {
    captureWebhookWarning('[WEBHOOK] subscription matches no lease and no user', { sub_id: sub.id, customer_id: customerId })
    return
  }

  const priceId = sub.items.data[0]?.price.id ?? null
  const planLookup = sub.items.data[0]?.price.lookup_key ?? null

  const { error: userUpdateError } = await supabase
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
    .eq('id', user.id)

  if (userUpdateError) throw userUpdateError

  logEvent('[WEBHOOK] Updated owner subscription', { user_id: user.id, status: sub.status, sub_id: sub.id })
}
