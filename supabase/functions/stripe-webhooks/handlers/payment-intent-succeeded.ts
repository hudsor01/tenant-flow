import Stripe from 'stripe'
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendEmail } from '../../_shared/resend.ts'
import { captureWebhookError, captureWebhookWarning, logEvent } from '../../_shared/errors.ts'
import { PaymentReceipt } from '../_templates/payment-receipt.tsx'
import { OwnerNotification } from '../_templates/owner-notification.tsx'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle payment_intent.succeeded event.
 * Records payment via RPC, sends receipt emails (fire-and-forget).
 */
export async function handlePaymentIntentSucceeded(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const pi = event.data.object as Stripe.PaymentIntent
  const metadata = pi.metadata ?? {}

  // ---------------------------------------------------------------------------
  // RENT_PAYMENTS_ENABLED flag — refuse to record a rent payment while the
  // feature is disabled. This branch should be UNREACHABLE in normal operation
  // (cron is unscheduled, tenant checkout returns 503). If we see it fire, it
  // means real money moved through Stripe while the platform was supposed to
  // be off — surface loudly for manual reconciliation rather than silently
  // persisting DB state for it.
  // Gated on metadata.kind === 'rent' (affirmative marker set at every rent
  // PI creation site) rather than inferring from tenant_id/lease_id presence.
  // ---------------------------------------------------------------------------
  if (Deno.env.get('RENT_PAYMENTS_ENABLED') !== 'true' && metadata['kind'] === 'rent') {
    captureWebhookError(
      new Error('Rent payment_intent.succeeded received while RENT_PAYMENTS_ENABLED is off'),
      {
        message: '[WEBHOOK] Rent payment succeeded while feature disabled — manual reconciliation required',
        event_id: event.id,
        pi_id: pi.id,
        pi_amount: pi.amount,
        tenant_id: metadata['tenant_id'],
        lease_id: metadata['lease_id'],
        rent_due_id: metadata['rent_due_id'],
      }
    )
    return
  }

  // PAY-10: Validate required metadata — reject empty strings
  const tenantId = metadata['tenant_id']
  const leaseId = metadata['lease_id']
  const rentDueId = metadata['rent_due_id'] || null

  if (!tenantId || !leaseId) {
    captureWebhookError(
      new Error('Missing required payment metadata'),
      {
        message: '[WEBHOOK] Missing required metadata — skipping payment_intent.succeeded',
        event_id: event.id,
        pi_id: pi.id,
        tenant_id: tenantId ?? 'MISSING',
        lease_id: leaseId ?? 'MISSING',
        metadata: pi.metadata,
      }
    )
    return
  }

  const grossAmount = pi.amount / 100 // Stripe stores in cents
  const platformFeeAmount = (pi.application_fee_amount ?? 0) / 100

  // PAY-18: Get the charge to access balance_transaction for fee breakdown
  // Charge is reused in sendReceiptEmails for last4 — fetched once here, passed down
  let stripeFeeAmount = 0
  let charge: Stripe.Charge | null = null
  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : (pi.latest_charge as Stripe.Charge | null)?.id
  if (chargeId) {
    try {
      charge = await stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] })
      const bt = charge.balance_transaction
      if (bt && typeof bt !== 'string') {
        stripeFeeAmount = bt.fee / 100
      }
    } catch (feeErr) {
      // Non-fatal — log and continue with stripeFeeAmount = 0
      captureWebhookError(feeErr, { message: 'Failed to retrieve balance transaction for fee calculation', charge_id: chargeId })
    }
  }

  const netAmount = grossAmount - platformFeeAmount - stripeFeeAmount

  // PAY-02: Use record_rent_payment RPC for atomic payment recording + rent_due status update
  const { error: rpcError } = await supabase.rpc('record_rent_payment', {
    p_stripe_payment_intent_id: pi.id,
    p_rent_due_id: rentDueId,
    p_tenant_id: tenantId,
    p_lease_id: leaseId,
    p_amount: grossAmount,
    p_gross_amount: grossAmount,
    p_platform_fee_amount: platformFeeAmount,
    p_stripe_fee_amount: stripeFeeAmount,
    p_net_amount: netAmount,
    p_currency: pi.currency.toUpperCase(),
    p_period_start: metadata['period_start'] ?? new Date().toISOString().split('T')[0],
    p_period_end: metadata['period_end'] ?? new Date().toISOString().split('T')[0],
    p_due_date: metadata['due_date'] ?? new Date().toISOString().split('T')[0],
    p_checkout_session_id: metadata['checkout_session_id'] ?? null,
  })
  if (rpcError) throw rpcError

  // Fire-and-forget receipt emails — errors logged, never thrown
  try {
    await sendReceiptEmails(supabase, stripe, pi, grossAmount, stripeFeeAmount, platformFeeAmount, netAmount, charge)
  } catch (emailErr) {
    captureWebhookError(emailErr, { message: '[RESEND_ERROR] sendReceiptEmails unexpected error', pi_id: pi.id })
  }
}

// ---------------------------------------------------------------------------
// Receipt email sending — fire-and-forget after successful payment
// NEVER throws — all errors are caught and logged. Webhook response is not affected.
// ---------------------------------------------------------------------------
async function sendReceiptEmails(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  pi: Stripe.PaymentIntent,
  grossAmount: number,
  stripeFeeAmount: number = 0,
  platformFeeAmount: number = 0,
  netAmount: number = 0,
  existingCharge: Stripe.Charge | null = null,
): Promise<void> {
  const metadata = pi.metadata ?? {}
  const tenantId = metadata['tenant_id']
  const leaseId = metadata['lease_id']
  const propertyId = metadata['property_id']
  const unitId = metadata['unit_id']
  const periodMonth = metadata['period_month'] ?? ''
  const periodYear = metadata['period_year'] ?? ''

  // Bail if missing critical metadata (e.g., non-rent payment_intent)
  if (!tenantId || !leaseId || !propertyId) {
    logEvent('[EMAIL_SKIP] Missing metadata for receipt emails — likely a non-rent PaymentIntent', { pi_id: pi.id })
    return
  }

  // 1. Resolve tenant, lease, property, unit data in parallel
  const [tenantResult, leaseResult, propertyResult, unitResult] = await Promise.all([
    supabase.from('tenants').select('user_id').eq('id', tenantId).single(),
    supabase.from('leases').select('owner_user_id').eq('id', leaseId).single(),
    supabase.from('properties').select('address_line1, city, state, postal_code').eq('id', propertyId).single(),
    unitId
      ? supabase.from('units').select('unit_number').eq('id', unitId).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (!tenantResult.data || !leaseResult.data || !propertyResult.data) {
    captureWebhookError(new Error('Missing critical data for receipt emails'), {
      message: '[RESEND_ERROR] Missing critical data for receipt emails',
      tenant: !!tenantResult.data,
      lease: !!leaseResult.data,
      property: !!propertyResult.data,
    })
    return
  }

  const tenantUserId = tenantResult.data.user_id as string
  const ownerUserId = leaseResult.data.owner_user_id as string
  const prop = propertyResult.data
  const unitNumber = (unitResult.data as { unit_number: string | null } | null)?.unit_number ?? null

  // 2. Resolve user emails, names, and notification_settings in parallel
  const [tenantUserResult, ownerUserResult, tenantSettingsResult, ownerSettingsResult] = await Promise.all([
    supabase.from('users').select('email, full_name').eq('id', tenantUserId).single(),
    supabase.from('users').select('email, full_name').eq('id', ownerUserId).single(),
    supabase.from('notification_settings').select('email').eq('user_id', tenantUserId).maybeSingle(),
    supabase.from('notification_settings').select('email').eq('user_id', ownerUserId).maybeSingle(),
  ])

  // notification_settings: default to sending if no row exists (absence = opt-in)
  const tenantEmailEnabled = tenantSettingsResult.data?.email !== false
  const ownerEmailEnabled = ownerSettingsResult.data?.email !== false

  // 3. Resolve payment method last4 from the charge (reused from caller — no extra API call)
  const paymentMethodLast4 = existingCharge?.payment_method_details?.card?.last4 ?? null

  // 4. Format data for templates
  const propertyAddress = `${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.postal_code}`
  const formattedAmount = grossAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const paymentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Check for late fee from the rent_payments record
  let lateFeeAmount: string | null = null
  let baseRentAmount: string | null = null
  const { data: paymentRecord } = await supabase
    .from('rent_payments')
    .select('late_fee_amount')
    .eq('stripe_payment_intent_id', pi.id)
    .single()
  if (paymentRecord?.late_fee_amount && paymentRecord.late_fee_amount > 0) {
    const lateFee = paymentRecord.late_fee_amount
    lateFeeAmount = lateFee.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    baseRentAmount = (grossAmount - lateFee).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  // 5. Render and send emails in parallel
  const emailPromises: Promise<void>[] = []

  // Tenant receipt email
  if (tenantUserResult.data?.email && tenantEmailEnabled) {
    const tenantEmail = tenantUserResult.data.email as string
    const tenantName = (tenantUserResult.data.full_name as string) || 'Tenant'

    emailPromises.push((async () => {
      const html = await renderAsync(
        React.createElement(PaymentReceipt, {
          tenantName,
          amount: formattedAmount,
          propertyAddress,
          unitNumber,
          paymentDate,
          periodMonth,
          periodYear,
          paymentMethodLast4,
          lateFeeAmount,
          baseRentAmount,
        })
      )
      const result = await sendEmail({
        to: [tenantEmail],
        subject: `Payment Receipt - ${periodMonth} ${periodYear}`,
        html,
        tags: [
          { name: 'type', value: 'payment_receipt' },
          { name: 'tenant_id', value: tenantId },
        ],
      })
      if (!result.success) {
        captureWebhookError(new Error(result.error), { message: '[RESEND_ERROR] Tenant receipt email failed', tenant_id: tenantId })
      }
    })())
  } else if (!tenantUserResult.data?.email) {
    captureWebhookWarning('[EMAIL_SKIP] Tenant has no email address', { tenant_user_id: tenantUserId })
  } else {
    logEvent('[EMAIL_SKIP] Tenant email notifications disabled', { tenant_user_id: tenantUserId })
  }

  // Owner notification email
  if (ownerUserResult.data?.email && ownerEmailEnabled) {
    const ownerEmail = ownerUserResult.data.email as string
    const ownerName = (ownerUserResult.data.full_name as string) || 'Property Owner'
    const tenantName = (tenantUserResult.data?.full_name as string) || 'Tenant'

    // PAY-18: Include fee breakdown in owner notification
    const formatUSD = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    const ownerFeeProps = stripeFeeAmount > 0 || platformFeeAmount > 0 ? {
      platformFee: platformFeeAmount > 0 ? formatUSD(platformFeeAmount) : null,
      stripeFee: stripeFeeAmount > 0 ? formatUSD(stripeFeeAmount) : null,
      netAmount: formatUSD(netAmount),
    } : {}

    emailPromises.push((async () => {
      const html = await renderAsync(
        React.createElement(OwnerNotification, {
          ownerName,
          tenantName,
          amount: formattedAmount,
          propertyAddress,
          unitNumber,
          paymentDate,
          ...ownerFeeProps,
        })
      )
      const result = await sendEmail({
        to: [ownerEmail],
        subject: `Payment Received - ${tenantName}`,
        html,
        tags: [
          { name: 'type', value: 'owner_payment_notification' },
          { name: 'lease_id', value: leaseId },
        ],
      })
      if (!result.success) {
        captureWebhookError(new Error(result.error), { message: '[RESEND_ERROR] Owner notification email failed', lease_id: leaseId })
      }
    })())
  } else if (!ownerUserResult.data?.email) {
    captureWebhookWarning('[EMAIL_SKIP] Owner has no email address', { owner_user_id: ownerUserId })
  } else {
    logEvent('[EMAIL_SKIP] Owner email notifications disabled', { owner_user_id: ownerUserId })
  }

  // Wait for all emails — allSettled ensures one failure doesn't block the other
  const results = await Promise.allSettled(emailPromises)
  for (const result of results) {
    if (result.status === 'rejected') {
      captureWebhookError(result.reason, { message: '[RESEND_ERROR] Email promise rejected', pi_id: pi.id })
    }
  }
}
