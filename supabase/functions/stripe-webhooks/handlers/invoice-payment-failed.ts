import Stripe from 'stripe'
import { escapeHtml } from '../../_shared/escape-html.ts'
import { sendEmail } from '../../_shared/resend.ts'
import { captureWebhookError, logEvent } from '../../_shared/errors.ts'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle invoice.payment_failed event (platform subscription failure).
 * Looks up owner by stripe_customer_id and sends failure notification email.
 */
export async function handleInvoicePaymentFailed(
  supabase: SupabaseAdmin,
  _stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : (invoice.customer as { id: string } | null)?.id

  if (!customerId) {
    captureWebhookError(new Error('No customer ID on invoice'), { message: '[WEBHOOK] invoice.payment_failed: no customer ID on invoice', invoice_id: invoice.id })
    return
  }

  // Look up owner by stripe_customer_id
  const { data: owner } = await supabase
    .from('users')
    .select('id, email, first_name, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!owner) {
    captureWebhookError(new Error('No user found for customer'), { message: '[WEBHOOK] invoice.payment_failed: no user found for customer', customer_id: customerId })
    return
  }

  // Send owner notification email about subscription payment failure
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://app.tenantflow.app'
  await sendEmail({
    to: [owner.email as string],
    subject: 'Action Required: Subscription Payment Failed',
    html: `<p>Hi ${escapeHtml((owner.first_name as string) || 'there')},</p>
      <p>Your TenantFlow subscription payment failed. Please update your payment method to avoid service interruption.</p>
      <p>You have a 7-day grace period before premium features are restricted.</p>
      <p><a href="${escapeHtml(frontendUrl)}/owner/billing">Update Payment Method</a></p>`,
    tags: [{ name: 'category', value: 'subscription_failure' }],
  })

  logEvent('[WEBHOOK] invoice.payment_failed processed', { user_id: owner.id })
}
