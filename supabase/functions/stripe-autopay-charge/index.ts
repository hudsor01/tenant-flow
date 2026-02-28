// Stripe Autopay Charge Edge Function
// Creates an off-session PaymentIntent with destination charge for automatic rent payment.
// Called by pg_cron via pg_net (not by browsers — no CORS needed).
// Reuses the same fee split pattern as stripe-rent-checkout: platform fee to TenantFlow,
// remainder to owner's Express account via transfer_data.destination.
//
// Auth: service_role key in Authorization header (sent by pg_net from process_autopay_charges).
// On failure: returns error response; Stripe's built-in retry handles payment retries.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

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

  try {
    // -------------------------------------------------------------------------
    // 2. Parse and validate request body
    // -------------------------------------------------------------------------
    const body = await req.json() as Partial<AutopayRequest>
    const {
      tenant_id,
      lease_id,
      rent_due_id,
      amount,
      stripe_customer_id,
      autopay_payment_method_id,
      owner_user_id,
      unit_id,
    } = body

    if (!tenant_id || !lease_id || !rent_due_id || !amount ||
        !stripe_customer_id || !autopay_payment_method_id || !owner_user_id || !unit_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 3. Duplicate payment check — prevent double-charging same rent_due
    // -------------------------------------------------------------------------
    const { data: existingPayment } = await supabase
      .from('rent_payments')
      .select('id')
      .eq('rent_due_id', rent_due_id)
      .in('status', ['succeeded', 'processing'])
      .maybeSingle()

    if (existingPayment) {
      console.log(`[AUTOPAY] Skipping rent_due ${rent_due_id} — payment already exists`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Payment already exists' }),
        { status: 200, headers: jsonHeaders }
      )
    }

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
    // 5. Calculate fees — owner absorbs all fees, tenant pays exact rent
    // -------------------------------------------------------------------------
    const amountCents = Math.round(amount * 100)
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
    const { data: rentDue } = await supabase
      .from('rent_due')
      .select('due_date')
      .eq('id', rent_due_id)
      .single()

    const dueDate = rentDue ? new Date(rentDue.due_date as string) : new Date()
    const periodMonth = String(dueDate.getMonth() + 1)
    const periodYear = String(dueDate.getFullYear())
    const periodStart = `${periodYear}-${periodMonth.padStart(2, '0')}-01`
    const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
    const periodEnd = `${periodYear}-${periodMonth.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // -------------------------------------------------------------------------
    // 8. Create off-session PaymentIntent with destination charge
    // -------------------------------------------------------------------------
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

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
        amount: String(amount),
        period_month: periodMonth,
        period_year: periodYear,
        due_date: rentDue?.due_date ?? new Date().toISOString().split('T')[0],
        period_start: periodStart,
        period_end: periodEnd,
        autopay: 'true',
      },
    })

    // -------------------------------------------------------------------------
    // 9. Insert rent_payments record with status 'processing'
    //    The webhook handler will update to 'succeeded' or 'failed'.
    // -------------------------------------------------------------------------
    const { error: insertError } = await supabase
      .from('rent_payments')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        amount,
        gross_amount: amount,
        currency: 'USD',
        status: 'processing',
        tenant_id,
        lease_id,
        application_fee_amount: amount * platformFeePercent / 100,
        payment_method_type: 'stripe',
        period_start: periodStart,
        period_end: periodEnd,
        due_date: rentDue?.due_date ?? new Date().toISOString().split('T')[0],
        rent_due_id,
      })

    if (insertError) {
      // Non-fatal: the webhook will create the record if this fails.
      // Log the error but don't return 500 since the payment was already created in Stripe.
      console.error('[AUTOPAY] Failed to insert rent_payments record:', insertError.message)
    }

    console.log(`[AUTOPAY] Created PaymentIntent ${paymentIntent.id} for rent_due ${rent_due_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        rent_due_id,
      }),
      { status: 200, headers: jsonHeaders }
    )
  } catch (err) {
    // Handle Stripe card errors specifically (requires_action, card_declined, etc.)
    const errorObj = err as Record<string, unknown>
    const isStripeCardError = err instanceof Error &&
      typeof errorObj.type === 'string' &&
      (errorObj.type === 'StripeCardError' || String(errorObj.type).startsWith('Stripe'))

    if (isStripeCardError) {
      const stripeError = errorObj as { code?: string; decline_code?: string }
      console.error(`[AUTOPAY] Stripe error: ${(err as Error).message}`, {
        code: stripeError.code,
        decline_code: stripeError.decline_code,
      })

      // For authentication_required errors, the payment needs manual intervention.
      // The webhook handler for payment_intent.payment_failed will send the notification.
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
