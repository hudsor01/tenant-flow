import Stripe from 'stripe'
import { captureWebhookWarning, logEvent } from '../../_shared/errors.ts'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle customer.subscription.created and customer.subscription.updated.
 * Landlord-only (v2.1): updates users.subscription_* columns that gate
 * dashboard access via proxy.ts. The tenant-rent-subscription lease path
 * (pre-PR #596) is gone — the leases table no longer has Stripe columns.
 */
export async function handleCustomerSubscriptionUpdated(
  supabase: SupabaseAdmin,
  _stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!user) {
    captureWebhookWarning('[WEBHOOK] subscription matches no user', { sub_id: sub.id, customer_id: customerId })
    return
  }

  const priceId = sub.items.data[0]?.price.id ?? null
  const planLookup = sub.items.data[0]?.price.lookup_key ?? null

  // Capture metadata.source for admin analytics if present on the subscription
  // (subscription_data.metadata propagates from checkout; also set directly
  // here so late-arriving subscription.updated events still fill it in).
  const source = typeof sub.metadata?.['source'] === 'string'
    ? sub.metadata['source']
    : null

  const updatePayload: Record<string, unknown> = {
    subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_plan: planLookup ?? priceId,
    subscription_current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
    subscription_updated_at: new Date().toISOString(),
  }
  if (source) updatePayload.subscription_source = source

  const { error: userUpdateError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', user.id)

  if (userUpdateError) throw userUpdateError

  logEvent('[WEBHOOK] Updated owner subscription', { user_id: user.id, status: sub.status, sub_id: sub.id })
}
