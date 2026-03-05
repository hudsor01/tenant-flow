import Stripe from 'stripe'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle customer.subscription.deleted event.
 * Marks the lease's stripe_subscription_status as 'canceled'.
 */
export async function handleCustomerSubscriptionDeleted(
  supabase: SupabaseAdmin,
  _stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
  const { error } = await supabase
    .from('leases')
    .update({ stripe_subscription_status: 'canceled' })
    .eq('stripe_subscription_id', sub.id)
  if (error) throw error
}
