import Stripe from 'stripe'
import { captureWebhookWarning, logEvent } from '../../_shared/errors.ts'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle customer.subscription.deleted event.
 * Marks lease subscription_status as 'canceled' AND owner user subscription_status
 * as 'canceled' (revokes dashboard access on next request via proxy gate).
 */
export async function handleCustomerSubscriptionDeleted(
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
    const { error } = await supabase
      .from('leases')
      .update({ stripe_subscription_status: 'canceled' })
      .eq('stripe_subscription_id', sub.id)
    if (error) throw error
    return
  }

  // Path 2: owner SaaS subscription — revoke dashboard access
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!user) {
    captureWebhookWarning('[WEBHOOK] deleted subscription matches no lease and no user', { sub_id: sub.id, customer_id: customerId })
    return
  }

  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_cancel_at_period_end: false,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (userUpdateError) throw userUpdateError

  logEvent('[WEBHOOK] Canceled owner subscription — dashboard access revoked', { user_id: user.id, sub_id: sub.id })
}
