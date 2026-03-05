import Stripe from 'stripe'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle customer.subscription.created and customer.subscription.updated events.
 * Updates the lease's stripe_subscription_status to match Stripe's status.
 */
export async function handleCustomerSubscriptionUpdated(
  supabase: SupabaseAdmin,
  _stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
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
}
