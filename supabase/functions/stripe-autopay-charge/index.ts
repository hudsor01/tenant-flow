// Stripe Autopay Charge Edge Function
// Creates an off-session PaymentIntent with destination charge for automatic rent payment.
// Called by pg_cron via pg_net (not by browsers — no CORS needed).
// Reuses the same fee split pattern as stripe-rent-checkout: platform fee to TenantFlow,
// remainder to owner's Express account via transfer_data.destination.
//
// PAY-14: Verifies per-tenant portion from lease_tenants.responsibility_percentage.
// PAY-08: Uses idempotency key (rent_due_id + tenant_id) on Stripe PaymentIntent.
// PAY-13: Tracks retry attempts and sends failure notification emails.
//
// Auth: service_role key in Authorization header (sent by pg_net from process_autopay_charges).

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../_shared/resend.ts'

interface AutopayRequest {
  tenant_id: string
  lease_id: string
  rent_due_id: string
  amount: number
  stripe_customer_id: string
  autopay_payment_method_id: string
  owner_user_id: string
  unit_id: string
}

Deno.serve(async (req: Request) => {
  const jsonHeaders = { 'Content-Type': 'application/json' }

  // ---------------------------------------------------------------------------
  // Environment variables
  // ---------------------------------------------------------------------------
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  // ---------------------------------------------------------------------------
  // 1. Authenticate via service role key (pg_net sends it in Authorization header)
  // ---------------------------------------------------------------------------
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: jsonHeaders }
    )
  }

  const token = authHeader.replace('Bearer ', '')
  if (token !== supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: jsonHeaders }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Parse body outside try so catch block can access fields for retry tracking
  let parsedBody: Partial<AutopayRequest> = {}
  try {
    parsedBody = await req.json() as Partial<AutopayRequest>
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: jsonHeaders }
    )
  }

  const {
    tenant_id,
    lease_id,
    rent_due_id,
    amount,
    stripe_customer_id,
    autopay_payment_method_id,
    owner_user_id,
    unit_id,
  } = parsedBody

  if (!tenant_id || !lease_id || !rent_due_id || !amount ||
      !stripe_customer_id || !autopay_payment_method_id || !owner_user_id || !unit_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: jsonHeaders }
    )
  }

  // Track computed tenant amount for use in catch block
  let computedTenantAmount = amount

  try {

    // -------------------------------------------------------------------------
    // 3. Duplicate payment check — prevent double-charging same rent_due
    // -------------------------------------------------------------------------
    const { data: existingPayment } = await supabase
      .from('rent_payments')
      .select('id')
      .eq('rent_due_id', rent_due_id)
      .eq('tenant_id', tenant_id)
      .in('status', ['succeeded', 'processing'])
      .maybeSingle()

    if (existingPayment) {
      console.log(`[AUTOPAY] Skipping rent_due ${rent_due_id} tenant ${tenant_id} — payment already exists`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Payment already exists' }),
        { status: 200, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 3b. PAY-14: Verify per-tenant portion from lease_tenants
    // -------------------------------------------------------------------------
    const { data: leaseTenant, error: leaseTenantsError } = await supabase
      .from('lease_tenants')
      .select('responsibility_percentage')
      .eq('lease_id', lease_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    if (leaseTenantsError) {
      console.error('[AUTOPAY] Error fetching lease_tenants:', leaseTenantsError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to verify tenant lease membership' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!leaseTenant) {
      console.error(`[AUTOPAY] Tenant ${tenant_id} not found on lease ${lease_id}`)
      return new Response(
        JSON.stringify({ error: 'Tenant not found on lease' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Fetch rent_due record for full amount and due date
    const { data: rentDue } = await supabase
      .from('rent_due')
      .select('amount, due_date, autopay_attempts')
      .eq('id', rent_due_id)
      .single()

    if (!rentDue) {
      console.error(`[AUTOPAY] rent_due ${rent_due_id} not found`)
      return new Response(
        JSON.stringify({ error: 'Rent due record not found' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const percentage = (leaseTenant as Record<string, unknown>).responsibility_percentage as number ?? 100
    const computedAmount = Number(((rentDue.amount as number) * percentage / 100).toFixed(2))

    // Safety net: verify passed amount matches computed amount
    if (Math.abs(amount - computedAmount) > 0.01) {
      console.warn(`[AUTOPAY] Amount mismatch: passed=${amount}, computed=${computedAmount} (percentage=${percentage}). Using computed value.`)
    }

    const tenantAmount = computedAmount
    computedTenantAmount = tenantAmount

    // -------------------------------------------------------------------------
    // 4. Resolve connected account for the property owner
    // -------------------------------------------------------------------------
    const { data: connectedAccount, error: connectedError } = await supabase
      .from('stripe_connected_accounts')
      .select('stripe_account_id, default_platform_fee_percent, charges_enabled')
      .eq('user_id', owner_user_id)
      .maybeSingle()

    if (connectedError) {
      console.error('[AUTOPAY] Error fetching connected account:', connectedError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payment configuration' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!connectedAccount) {
      console.error(`[AUTOPAY] No connected account for owner ${owner_user_id}`)
      return new Response(
        JSON.stringify({ error: 'Owner has no connected account' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!connectedAccount.charges_enabled) {
      console.error(`[AUTOPAY] Charges not enabled for owner ${owner_user_id}`)
      return new Response(
        JSON.stringify({ error: 'Owner charges not enabled' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 5. Calculate fees — owner absorbs all fees, tenant pays their portion
    // -------------------------------------------------------------------------
    const amountCents = Math.round(tenantAmount * 100)
    const platformFeePercent = connectedAccount.default_platform_fee_percent ?? 5
    const applicationFeeCents = Math.round(amountCents * platformFeePercent / 100)

    // -------------------------------------------------------------------------
    // 6. Resolve property_id from unit
    // -------------------------------------------------------------------------
    const { data: unitData } = await supabase
      .from('units')
      .select('property_id')
      .eq('id', unit_id)
      .maybeSingle()

    const propertyId = unitData?.property_id ?? ''

    // -------------------------------------------------------------------------
    // 7. Derive period dates from rent_due date
    // -------------------------------------------------------------------------
    const dueDate = new Date(rentDue.due_date as string)
    const periodMonth = String(dueDate.getMonth() + 1)
    const periodYear = String(dueDate.getFullYear())
    const periodStart = `${periodYear}-${periodMonth.padStart(2, '0')}-01`
    const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
    const periodEnd = `${periodYear}-${periodMonth.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // -------------------------------------------------------------------------
    // 8. Create off-session PaymentIntent with destination charge
    //    PAY-08: Idempotency key prevents duplicate charges for same rent_due + tenant
    // -------------------------------------------------------------------------
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion })

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: stripe_customer_id,
      payment_method: autopay_payment_method_id,
      off_session: true,
      confirm: true,
      application_fee_amount: applicationFeeCents,
      transfer_data: {
        destination: connectedAccount.stripe_account_id,
      },
      metadata: {
        tenant_id,
        lease_id,
        property_id: propertyId,
        unit_id,
        rent_due_id,
        amount: String(tenantAmount),
        full_rent_amount: String(rentDue.amount),
        responsibility_percentage: String(percentage),
        period_month: periodMonth,
        period_year: periodYear,
        due_date: rentDue.due_date as string,
        period_start: periodStart,
        period_end: periodEnd,
        autopay: 'true',
      },
    }, {
      idempotencyKey: `${rent_due_id}_${tenant_id}`,
    })

    // -------------------------------------------------------------------------
    // 9. Insert rent_payments record with status 'processing'
    //    The webhook handler will update to 'succeeded' or 'failed'.
    // -------------------------------------------------------------------------
    const { error: insertError } = await supabase
      .from('rent_payments')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        amount: tenantAmount,
        gross_amount: tenantAmount,
        currency: 'USD',
        status: 'processing',
        tenant_id,
        lease_id,
        application_fee_amount: tenantAmount * platformFeePercent / 100,
        payment_method_type: 'stripe',
        period_start: periodStart,
        period_end: periodEnd,
        due_date: rentDue.due_date as string,
        rent_due_id,
      })

    if (insertError) {
      console.error('[AUTOPAY] Failed to insert rent_payments record:', insertError.message)
    }

    console.log(`[AUTOPAY] Created PaymentIntent ${paymentIntent.id} for rent_due ${rent_due_id} tenant ${tenant_id} amount $${tenantAmount}`)

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        rent_due_id,
        tenant_id,
        amount: tenantAmount,
      }),
      { status: 200, headers: jsonHeaders }
    )
  } catch (err) {
    // Handle Stripe card errors specifically (requires_action, card_declined, etc.)
    const errorObj = err as Record<string, unknown>
    const isStripeCardError = err instanceof Error &&
      typeof errorObj.type === 'string' &&
      (errorObj.type === 'StripeCardError' || String(errorObj.type).startsWith('Stripe'))

    // -------------------------------------------------------------------------
    // PAY-13: Retry tracking + failure notifications
    // Body fields are accessible via outer scope (parsed before try block)
    // -------------------------------------------------------------------------

    if (isStripeCardError && rent_due_id && tenant_id) {
      await handleAutopayFailure(
        supabase,
        rent_due_id,
        tenant_id,
        lease_id ?? '',
        computedTenantAmount,
        frontendUrl,
        (err as Error).message
      )
    }

    if (isStripeCardError) {
      const stripeError = errorObj as { code?: string; decline_code?: string }
      console.error(`[AUTOPAY] Stripe error: ${(err as Error).message}`, {
        code: stripeError.code,
        decline_code: stripeError.decline_code,
        rent_due_id,
        tenant_id,
      })

      return new Response(
        JSON.stringify({
          error: 'Payment failed',
          code: stripeError.code,
          decline_code: stripeError.decline_code,
        }),
        { status: 402, headers: jsonHeaders }
      )
    }

    console.error('[AUTOPAY] Unexpected error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: jsonHeaders }
    )
  }
})

// =============================================================================
// PAY-13: Autopay failure handler — retry tracking + email notifications
// =============================================================================
// Retry schedule: day 1 (initial), day 3 (retry 1), day 7 (retry 2)
// Tenant emailed on every attempt. Owner emailed only on final (3rd) failure.

type SupabaseClient = ReturnType<typeof createClient>

async function handleAutopayFailure(
  supabase: SupabaseClient,
  rentDueId: string,
  tenantId: string,
  leaseId: string,
  failedAmount: number,
  frontendUrl: string,
  errorMessage: string
): Promise<void> {
  // Fetch current attempt count
  const { data: rentDue } = await supabase
    .from('rent_due')
    .select('autopay_attempts, amount, due_date')
    .eq('id', rentDueId)
    .single()

  const currentAttempts = (rentDue?.autopay_attempts as number) ?? 0
  const attemptNumber = currentAttempts + 1

  // Compute next retry date based on attempt number
  // Retry schedule: day 1 (initial), day 3 (retry 1), day 7 (retry 2)
  let nextRetryAt: string | null = null
  if (attemptNumber < 3) {
    const retryDaysFromNow = attemptNumber === 1 ? 2 : 4 // +2 days for day 3, +4 days for day 7
    const retryDate = new Date()
    retryDate.setDate(retryDate.getDate() + retryDaysFromNow)
    nextRetryAt = retryDate.toISOString()
  }

  // Update rent_due with retry tracking
  const { error: updateError } = await supabase
    .from('rent_due')
    .update({
      autopay_attempts: attemptNumber,
      autopay_last_attempt_at: new Date().toISOString(),
      autopay_next_retry_at: nextRetryAt,
    })
    .eq('id', rentDueId)

  if (updateError) {
    console.error(`[AUTOPAY] Failed to update retry tracking for rent_due ${rentDueId}:`, updateError.message)
  }

  // Look up tenant info for email
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('user_id')
    .eq('id', tenantId)
    .single()

  let tenantEmail = ''
  let tenantFirstName = 'Tenant'
  if (tenantData?.user_id) {
    const { data: tenantUser } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', tenantData.user_id)
      .single()

    tenantEmail = (tenantUser?.email as string) ?? ''
    const fullName = (tenantUser?.full_name as string) ?? ''
    tenantFirstName = fullName.split(' ')[0] || 'Tenant'
  }

  const formattedAmount = `$${failedAmount.toFixed(2)}`
  const payNowUrl = `${frontendUrl}/tenant/payments?rent_due_id=${rentDueId}`

  // Email tenant on EVERY failed attempt
  if (tenantEmail) {
    const nextRetryMessage = attemptNumber < 3 && nextRetryAt
      ? `<p>We'll retry automatically on <strong>${new Date(nextRetryAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>.</p>`
      : '<p>This was the final attempt. No more automatic retries will be made.</p>'

    const tenantEmailResult = await sendEmail({
      to: [tenantEmail],
      subject: `Autopay Failed - Attempt ${attemptNumber} of 3`,
      html: `
        <h2>Autopay Payment Failed</h2>
        <p>Hi ${tenantFirstName},</p>
        <p>Your automatic rent payment of <strong>${formattedAmount}</strong> failed (Attempt ${attemptNumber} of 3).</p>
        <p><strong>Reason:</strong> ${errorMessage}</p>
        ${nextRetryMessage}
        <p>You can make a manual payment at any time:</p>
        <p><a href="${payNowUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Pay Now</a></p>
        <p>If you need to update your payment method, please visit your payment settings in the tenant portal.</p>
        <p>Thank you,<br>TenantFlow</p>
      `,
      tags: [
        { name: 'category', value: 'autopay_failure' },
        { name: 'attempt', value: String(attemptNumber) },
      ],
    })

    if (!tenantEmailResult.success) {
      console.error(`[AUTOPAY] Failed to send tenant failure email: ${tenantEmailResult.error}`)
    }
  }

  // Email owner ONLY on final failure (attempt 3)
  if (attemptNumber >= 3 && leaseId) {
    const { data: lease } = await supabase
      .from('leases')
      .select('owner_user_id, unit_id')
      .eq('id', leaseId)
      .single()

    if (lease?.owner_user_id) {
      const { data: ownerUser } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', lease.owner_user_id)
        .single()

      const ownerEmail = (ownerUser?.email as string) ?? ''
      const ownerFirstName = ((ownerUser?.full_name as string) ?? '').split(' ')[0] || 'Owner'

      // Get unit/property info for context
      let propertyInfo = ''
      if (lease.unit_id) {
        const { data: unit } = await supabase
          .from('units')
          .select('name, property_id')
          .eq('id', lease.unit_id)
          .single()

        if (unit) {
          const { data: property } = await supabase
            .from('properties')
            .select('name')
            .eq('id', unit.property_id)
            .single()

          propertyInfo = property?.name
            ? `${property.name} - ${unit.name ?? 'Unit'}`
            : unit.name ?? 'Unit'
        }
      }

      if (ownerEmail) {
        const ownerEmailResult = await sendEmail({
          to: [ownerEmail],
          subject: `Autopay Failed for ${tenantFirstName} - Manual Follow-up Required`,
          html: `
            <h2>Autopay Final Failure Notice</h2>
            <p>Hi ${ownerFirstName},</p>
            <p>Automatic rent payment for tenant <strong>${tenantFirstName}</strong> has failed after all 3 attempts.</p>
            ${propertyInfo ? `<p><strong>Property:</strong> ${propertyInfo}</p>` : ''}
            <p><strong>Amount:</strong> ${formattedAmount}</p>
            <p><strong>Reason:</strong> ${errorMessage}</p>
            <p>All 3 autopay attempts have been exhausted. The tenant has been notified and given a link to pay manually. You may want to follow up with them directly.</p>
            <p>Thank you,<br>TenantFlow</p>
          `,
          tags: [
            { name: 'category', value: 'autopay_final_failure' },
          ],
        })

        if (!ownerEmailResult.success) {
          console.error(`[AUTOPAY] Failed to send owner final failure email: ${ownerEmailResult.error}`)
        }
      }
    }
  }

  console.log(`[AUTOPAY] Failure handled for rent_due ${rentDueId} tenant ${tenantId}: attempt ${attemptNumber}/3, next_retry=${nextRetryAt ?? 'none'}`)
}
