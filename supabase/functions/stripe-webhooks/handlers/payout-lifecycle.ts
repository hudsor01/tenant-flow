import Stripe from 'stripe'
import { captureWebhookError, captureWebhookWarning } from '../../_shared/errors.ts'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle payout.created | payout.paid | payout.failed events (Stripe Connect).
 *
 * Upserts a row in payout_events per stripe_payout_id to track timing:
 *   - created  → insert pending row
 *   - paid     → set paid_at, arrival_date, compute duration_hours (generated col)
 *   - failed   → set failed_at, failure_code, failure_message
 *
 * Owner is resolved via stripe_connected_accounts.user_id.
 * On paid: computes first_charge_at by finding earliest succeeded rent_payments
 * whose Stripe charge is part of the payout's balance transactions.
 */
export async function handlePayoutLifecycle(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const payout = event.data.object as Stripe.Payout
  const accountId = event.account ?? null

  if (!accountId) {
    captureWebhookWarning('[payout-lifecycle] Skipping payout with no connected account', { payout_id: payout.id })
    return
  }

  // Resolve owner from connected account
  const { data: connected } = await supabase
    .from('stripe_connected_accounts')
    .select('user_id')
    .eq('stripe_account_id', accountId)
    .single()

  const ownerUserId = (connected as { user_id?: string } | null)?.user_id
  if (!ownerUserId) {
    captureWebhookWarning('[payout-lifecycle] No owner for connected account', { stripe_account_id: accountId, payout_id: payout.id })
    return
  }

  // Stripe amounts are in cents — convert to dollars for storage consistency
  const amountDollars = (payout.amount ?? 0) / 100
  const arrivalDate = payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null

  // Upsert base row
  const basePayload: Record<string, unknown> = {
    stripe_payout_id: payout.id,
    stripe_account_id: accountId,
    owner_user_id: ownerUserId,
    amount: amountDollars,
    currency: payout.currency ?? 'usd',
    status: payout.status ?? 'pending',
    arrival_date: arrivalDate,
  }

  if (event.type === 'payout.paid') {
    basePayload.paid_at = new Date(event.created * 1000).toISOString()

    // Find earliest charge in this payout by walking ALL balance transactions on the connected account.
    // Stripe sorts descending by `created`, so the first 100 are the NEWEST — the true earliest
    // charge could be on a later page. Auto-paginate to capture every transaction.
    // Hard cap at 10K to bound worst-case API cost (a typical owner payout has <500 charges).
    try {
      const chargeIds: string[] = []
      const MAX_TRANSACTIONS = 10_000
      const iterator = stripe.balanceTransactions.list(
        { payout: payout.id, limit: 100, type: 'charge' },
        { stripeAccount: accountId },
      )
      for await (const txn of iterator) {
        const id = typeof txn.source === 'string' ? txn.source : (txn.source as Stripe.Charge | null)?.id
        if (typeof id === 'string') chargeIds.push(id)
        if (chargeIds.length >= MAX_TRANSACTIONS) {
          captureWebhookWarning('[payout-lifecycle] Hit MAX_TRANSACTIONS cap; first_charge_at may be inaccurate', {
            payout_id: payout.id,
            cap: MAX_TRANSACTIONS,
          })
          break
        }
      }

      if (chargeIds.length > 0) {
        const { data: earliestPayment } = await supabase
          .from('rent_payments')
          .select('stripe_charge_id, paid_at, created_at')
          .in('stripe_charge_id', chargeIds)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        const firstChargeAt =
          (earliestPayment as { paid_at?: string; created_at?: string } | null)?.paid_at ??
          (earliestPayment as { created_at?: string } | null)?.created_at ??
          null

        basePayload.first_charge_at = firstChargeAt
        basePayload.charge_count = chargeIds.length
      }
    } catch (err) {
      captureWebhookError(err, { message: '[payout-lifecycle] balanceTransactions.list failed', payout_id: payout.id, stripe_account_id: accountId })
      // Non-fatal — we still record the payout status
    }
  }

  if (event.type === 'payout.failed') {
    basePayload.failed_at = new Date(event.created * 1000).toISOString()
    basePayload.failure_code = payout.failure_code ?? null
    basePayload.failure_message = payout.failure_message ?? null
  }

  const { error } = await supabase
    .from('payout_events')
    .upsert(basePayload, { onConflict: 'stripe_payout_id' })

  if (error) throw error
}
