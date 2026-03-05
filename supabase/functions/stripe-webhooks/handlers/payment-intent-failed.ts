import Stripe from 'stripe'
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendEmail } from '../../_shared/resend.ts'
import { AutopayFailed } from '../_templates/autopay-failed.tsx'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle payment_intent.payment_failed event.
 * Updates payment status, notifies owner, sends autopay failure email to tenant.
 */
export async function handlePaymentIntentFailed(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const pi = event.data.object as Stripe.PaymentIntent
  const metadata = pi.metadata ?? {}

  // Update rent_payment status to failed and retrieve record for owner notification
  const { data: failedPayment, error } = await supabase
    .from('rent_payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', pi.id)
    .select('tenant_id, lease_id, amount')
    .single()
  // Don't throw if no record found — payment may not exist in our DB
  if (error && error.code !== 'PGRST116') throw error

  // Notify the property owner about the failed payment
  if (failedPayment) {
    const { data: leaseData } = await supabase
      .from('leases')
      .select('owner_user_id')
      .eq('id', failedPayment.lease_id)
      .single()

    const ownerId = leaseData?.owner_user_id as string | null
    if (ownerId) {
      await supabase.from('notifications').insert({
        user_id: ownerId,
        title: 'Rent payment failed',
        message: `A rent payment of $${failedPayment.amount.toFixed(2)} failed. Check your Stripe dashboard for details.`,
        notification_type: 'payment',
      }).then(({ error: notifError }) => {
        if (notifError) console.error('Failed to create payment failure notification:', notifError.message)
      })
    }
  }

  // Send autopay failure notification email to tenant (fire-and-forget)
  if (metadata['autopay'] === 'true' && failedPayment) {
    try {
      await sendAutopayFailureEmail(supabase, stripe, pi, failedPayment.amount)
    } catch (emailErr) {
      console.error('[RESEND_ERROR] sendAutopayFailureEmail unexpected error:', emailErr)
    }
  }
}

// ---------------------------------------------------------------------------
// Autopay failure email helpers
// ---------------------------------------------------------------------------

async function resolveAutopayFailureData(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  pi: Stripe.PaymentIntent
): Promise<{
  tenantEmail: string; tenantName: string; propertyAddress: string
  unitNumber: string | null; paymentMethodLast4: string | null; failureReason: string | null
} | null> {
  const metadata = pi.metadata ?? {}
  const tenantId = metadata['tenant_id']
  if (!tenantId) return null

  const [tenantResult, propertyResult, unitResult] = await Promise.all([
    supabase.from('tenants').select('user_id').eq('id', tenantId).single(),
    metadata['property_id']
      ? supabase.from('properties').select('address_line1, city, state, postal_code').eq('id', metadata['property_id']).single()
      : Promise.resolve({ data: null, error: null }),
    metadata['unit_id']
      ? supabase.from('units').select('unit_number').eq('id', metadata['unit_id']).single()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (!tenantResult.data) return null

  const tenantUserId = tenantResult.data.user_id as string
  const [userResult, settingsResult] = await Promise.all([
    supabase.from('users').select('email, full_name').eq('id', tenantUserId).single(),
    supabase.from('notification_settings').select('email').eq('user_id', tenantUserId).maybeSingle(),
  ])
  if (!userResult.data?.email || settingsResult.data?.email === false) return null

  let paymentMethodLast4: string | null = null
  const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : null
  if (pmId) {
    try { paymentMethodLast4 = (await stripe.paymentMethods.retrieve(pmId)).card?.last4 ?? null }
    catch (err) { console.warn('[stripe-webhooks] PM retrieval failed:', pmId, err) }
  }

  const lastError = pi.last_payment_error
  const prop = propertyResult?.data
  return {
    tenantEmail: userResult.data.email as string,
    tenantName: (userResult.data.full_name as string) || 'Tenant',
    propertyAddress: prop ? `${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.postal_code}` : 'Your property',
    unitNumber: (unitResult?.data as { unit_number: string | null } | null)?.unit_number ?? null,
    paymentMethodLast4,
    failureReason: lastError?.message ?? lastError?.decline_code ?? lastError?.code ?? null,
  }
}

async function sendAutopayFailureEmail(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  pi: Stripe.PaymentIntent,
  amount: number
): Promise<void> {
  const data = await resolveAutopayFailureData(supabase, stripe, pi)
  if (!data) return

  const metadata = pi.metadata ?? {}
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://tenantflow.app'
  const formattedAmount = amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  const html = await renderAsync(
    React.createElement(AutopayFailed, {
      tenantName: data.tenantName,
      amount: formattedAmount,
      propertyAddress: data.propertyAddress,
      unitNumber: data.unitNumber,
      periodMonth: metadata['period_month'] ?? '',
      periodYear: metadata['period_year'] ?? '',
      paymentMethodLast4: data.paymentMethodLast4,
      failureReason: data.failureReason,
      manualPaymentUrl: `${frontendUrl}/tenant/payments`,
    })
  )

  const result = await sendEmail({
    to: [data.tenantEmail],
    subject: `Autopay Failed - Action Required`,
    html,
    tags: [
      { name: 'type', value: 'autopay_failed' },
      { name: 'tenant_id', value: metadata['tenant_id'] },
    ],
  })
  if (!result.success) {
    console.error('[RESEND_ERROR] Autopay failure email failed:', result.error)
  }
}
