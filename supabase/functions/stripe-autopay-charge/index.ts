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

import * as Sentry from '@sentry/deno'
import { sendEmail } from '../_shared/resend.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse, captureWebhookError, captureWebhookWarning, logEvent } from '../_shared/errors.ts'
import { getStripeClient } from '../_shared/stripe-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import {
  tenantAutopayFailureEmail,
  ownerAutopayFailureEmail,
} from '../_shared/autopay-email-template.ts'

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
  // RENT_PAYMENTS_ENABLED flag — defense in depth.
  // Primary kill-switch is cron.unschedule('process-autopay-charges').
  // This guard stops any ad-hoc invocation (manual curl, rescheduled cron,
  // anything else that reaches the function) from firing real charges.
  // Default: OFF. Set RENT_PAYMENTS_ENABLED=true in Supabase secrets to enable.
  // ---------------------------------------------------------------------------
  if (Deno.env.get('RENT_PAYMENTS_ENABLED') !== 'true') {
    logEvent('[AUTOPAY] Skipped: RENT_PAYMENTS_ENABLED flag is off', {})
    return new Response(
      JSON.stringify({ skipped: true, reason: 'Rent payments disabled (RENT_PAYMENTS_ENABLED flag off)' }),
      { status: 200, headers: jsonHeaders }
    )
  }

  // ---------------------------------------------------------------------------
  // Environment variables
  // ---------------------------------------------------------------------------
  let env: Record<string, string>
  try {
    env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'],
      optional: ['FRONTEND_URL', 'RESEND_API_KEY'],
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'env_validation' })
  }

  const stripeKey = env.STRIPE_SECRET_KEY
  const supabaseUrl = env.SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:3050'

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

  const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

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
    // 3-6. Parallel lookups — all 5 depend only on validated body fields
    // -------------------------------------------------------------------------
    const [
      existingPaymentResult,
      leaseTenantsResult,
      rentDueResult,
      connectedAccountResult,
      unitResult,
    ] = await Promise.all([
      // Step 3: Duplicate payment check
      supabase.from('rent_payments').select('id')
        .eq('rent_due_id', rent_due_id).eq('tenant_id', tenant_id)
        .in('status', ['succeeded', 'processing']).maybeSingle(),
      // Step 3b: Lease tenant responsibility percentage
      supabase.from('lease_tenants').select('responsibility_percentage')
        .eq('lease_id', lease_id).eq('tenant_id', tenant_id).maybeSingle(),
      // rent_due: amount, due_date, attempts
      supabase.from('rent_due').select('amount, due_date, autopay_attempts')
        .eq('id', rent_due_id).single(),
      // Step 4: Connected account
      supabase.from('stripe_connected_accounts')
        .select('stripe_account_id, default_platform_fee_percent, charges_enabled')
        .eq('user_id', owner_user_id).maybeSingle(),
      // Step 6: Unit -> property_id
      supabase.from('units').select('property_id')
        .eq('id', unit_id).maybeSingle(),
    ])

    // Handle duplicate payment check
    if (existingPaymentResult.data) {
      logEvent('[AUTOPAY] Skipping — payment already exists', { rent_due_id, tenant_id })
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Payment already exists' }),
        { status: 200, headers: jsonHeaders }
      )
    }

    // Handle lease_tenants result
    const { data: leaseTenant, error: leaseTenantsError } = leaseTenantsResult

    if (leaseTenantsError) {
      captureWebhookError(leaseTenantsError, { message: '[AUTOPAY] Error fetching lease_tenants', rent_due_id, tenant_id, lease_id })
      return new Response(
        JSON.stringify({ error: 'Failed to verify tenant lease membership' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!leaseTenant) {
      captureWebhookError(new Error('Tenant not found on lease'), { message: '[AUTOPAY] Tenant not found on lease', tenant_id, lease_id })
      return new Response(
        JSON.stringify({ error: 'Tenant not found on lease' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Handle rent_due result
    const rentDue = rentDueResult.data

    if (!rentDue) {
      captureWebhookError(new Error('rent_due not found'), { message: '[AUTOPAY] rent_due not found', rent_due_id })
      return new Response(
        JSON.stringify({ error: 'Rent due record not found' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const percentage = (leaseTenant as Record<string, unknown>).responsibility_percentage as number ?? 100
    const computedAmount = Number(((rentDue.amount as number) * percentage / 100).toFixed(2))

    // Safety net: verify passed amount matches computed amount
    if (Math.abs(amount - computedAmount) > 0.01) {
      captureWebhookWarning('[AUTOPAY] Amount mismatch — using computed value', {
        passed: amount,
        computed: computedAmount,
        percentage,
        rent_due_id,
        tenant_id,
      })
    }

    const tenantAmount = computedAmount
    computedTenantAmount = tenantAmount

    // Handle connected account result
    const { data: connectedAccount, error: connectedError } = connectedAccountResult

    if (connectedError) {
      captureWebhookError(connectedError, { message: '[AUTOPAY] Error fetching connected account', owner_user_id })
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payment configuration' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!connectedAccount) {
      captureWebhookError(new Error('No connected account for owner'), { message: '[AUTOPAY] No connected account for owner', owner_user_id })
      return new Response(
        JSON.stringify({ error: 'Owner has no connected account' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!connectedAccount.charges_enabled) {
      captureWebhookError(new Error('Charges not enabled for owner'), { message: '[AUTOPAY] Charges not enabled for owner', owner_user_id })
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

    // Handle unit result
    const propertyId = unitResult.data?.property_id ?? ''

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
    const stripe = getStripeClient(stripeKey)

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
        kind: 'rent',
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
      captureWebhookError(insertError, { message: '[AUTOPAY] Failed to insert rent_payments record', rent_due_id, tenant_id })
    }

    logEvent('[AUTOPAY] Created PaymentIntent', {
      payment_intent_id: paymentIntent.id,
      rent_due_id,
      tenant_id,
      amount: tenantAmount,
    })

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
      // Log the decline to Sentry so ops sees it alongside other exceptions.
      Sentry.captureException(err, {
        tags: { category: 'autopay_failure' },
        extra: {
          rent_due_id,
          tenant_id,
          lease_id,
          owner_user_id,
          amount: computedTenantAmount,
        },
      })

      await handleAutopayFailure(
        supabase,
        rent_due_id,
        tenant_id,
        lease_id ?? '',
        owner_user_id ?? '',
        computedTenantAmount,
        frontendUrl,
        (err as Error).message
      )
    }

    if (isStripeCardError) {
      const stripeError = errorObj as { code?: string; decline_code?: string }
      captureWebhookError(err, {
        message: '[AUTOPAY] Stripe error',
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

    return errorResponse(req, 500, err, { action: 'autopay_charge', rent_due_id, tenant_id })
  }
})

// =============================================================================
// PAY-13: Autopay failure handler — retry tracking + email notifications
// =============================================================================
// Retry schedule: day 1 (initial), day 3 (retry 1), day 7 (retry 2)
// Tenant emailed on every attempt. Owner emailed + notifications row on final (3rd).

type SupabaseClient = ReturnType<typeof createAdminClient>

const MAX_AUTOPAY_ATTEMPTS = 3

async function handleAutopayFailure(
  supabase: SupabaseClient,
  rentDueId: string,
  tenantId: string,
  leaseId: string,
  ownerUserId: string,
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
  if (attemptNumber < MAX_AUTOPAY_ATTEMPTS) {
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
    captureWebhookError(updateError, { message: '[AUTOPAY] Failed to update retry tracking', rent_due_id: rentDueId })
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

  // Insert in-app notification for the OWNER on every failed attempt so the
  // NotificationBell badge shows counts. notification_type 'payment' is a valid
  // CHECK constraint value (see 20251231081143_migrate_enums_to_text_constraints.sql).
  if (ownerUserId) {
    const title = attemptNumber >= MAX_AUTOPAY_ATTEMPTS
      ? `Autopay exhausted for ${tenantFirstName}`
      : `Autopay failed for ${tenantFirstName} (attempt ${attemptNumber} of ${MAX_AUTOPAY_ATTEMPTS})`

    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: ownerUserId,
      notification_type: 'payment',
      entity_type: 'rent_due',
      entity_id: rentDueId,
      title,
      message: `${formattedAmount} - ${errorMessage}`,
    })

    if (notifError) {
      captureWebhookError(notifError, {
        message: '[AUTOPAY] Failed to insert owner notification',
        rent_due_id: rentDueId,
        owner_user_id: ownerUserId,
        category: 'autopay_notification_insert',
      })
    }
  }

  // Email tenant on EVERY failed attempt, using branded template
  if (tenantEmail) {
    const { subject, html } = tenantAutopayFailureEmail({
      tenantFirstName,
      amount: formattedAmount,
      attemptNumber,
      maxAttempts: MAX_AUTOPAY_ATTEMPTS,
      failureReason: errorMessage,
      nextRetryAt,
      payNowUrl,
      appUrl: frontendUrl,
    })

    const tenantEmailResult = await sendEmail({
      to: [tenantEmail],
      subject,
      html,
      tags: [
        { name: 'category', value: 'autopay_failure' },
        { name: 'attempt', value: String(attemptNumber) },
      ],
    })

    if (!tenantEmailResult.success) {
      captureWebhookError(new Error(tenantEmailResult.error), { message: '[AUTOPAY] Failed to send tenant failure email', rent_due_id: rentDueId, tenant_id: tenantId })
    }
  }

  // Email owner ONLY on final failure (attempt 3)
  if (attemptNumber >= MAX_AUTOPAY_ATTEMPTS && leaseId) {
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
        const { subject, html } = ownerAutopayFailureEmail({
          ownerFirstName,
          tenantFirstName,
          propertyInfo,
          amount: formattedAmount,
          maxAttempts: MAX_AUTOPAY_ATTEMPTS,
          failureReason: errorMessage,
          dashboardUrl: `${frontendUrl}/rent-collection`,
          appUrl: frontendUrl,
        })

        const ownerEmailResult = await sendEmail({
          to: [ownerEmail],
          subject,
          html,
          tags: [
            { name: 'category', value: 'autopay_final_failure' },
          ],
        })

        if (!ownerEmailResult.success) {
          captureWebhookError(new Error(ownerEmailResult.error), { message: '[AUTOPAY] Failed to send owner final failure email', rent_due_id: rentDueId, owner_user_id: ownerUserId })
        }
      }
    }
  }

  logEvent('[AUTOPAY] Failure handled', {
    rent_due_id: rentDueId,
    tenant_id: tenantId,
    attempt_number: attemptNumber,
    max_attempts: MAX_AUTOPAY_ATTEMPTS,
    next_retry_at: nextRetryAt,
  })
}
