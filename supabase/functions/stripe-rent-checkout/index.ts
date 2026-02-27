// Stripe Rent Checkout Edge Function
// Creates a Stripe Checkout Session with a destination charge for rent payment.
// Tenant pays exact rent amount; platform fee + Stripe fee are absorbed by owner.
// Returns { url, session_id } — frontend redirects tenant to the Checkout URL.
// Authenticated: requires JWT Bearer token (tenant user).

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  const corsHeaders = getCorsHeaders(req)
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  // ---------------------------------------------------------------------------
  // Environment variables
  // ---------------------------------------------------------------------------
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  // ---------------------------------------------------------------------------
  // 1. Authenticate tenant via JWT
  // ---------------------------------------------------------------------------
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: jsonHeaders }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: jsonHeaders }
    )
  }

  try {
    // -------------------------------------------------------------------------
    // Parse request body
    // -------------------------------------------------------------------------
    const body = await req.json() as Record<string, unknown>
    const rentDueId = body.rent_due_id as string | undefined

    if (!rentDueId) {
      return new Response(
        JSON.stringify({ error: 'rent_due_id is required' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 2. Resolve tenant record from authenticated user
    // -------------------------------------------------------------------------
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tenantError) {
      console.error('Error resolving tenant:', tenantError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to resolve tenant' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant profile not found' }),
        { status: 404, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 3. Validate rent_due record
    // -------------------------------------------------------------------------
    const { data: rentDue, error: rentDueError } = await supabase
      .from('rent_due')
      .select('id, amount, due_date, lease_id, unit_id, status')
      .eq('id', rentDueId)
      .maybeSingle()

    if (rentDueError) {
      console.error('Error fetching rent_due:', rentDueError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rent due record' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!rentDue) {
      return new Response(
        JSON.stringify({ error: 'Rent due record not found' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!rentDue.lease_id) {
      return new Response(
        JSON.stringify({ error: 'Rent due record is not linked to a lease' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 4. Duplicate payment check — prevent paying same rent_due twice
    // -------------------------------------------------------------------------
    const { data: existingPayment, error: dupError } = await supabase
      .from('rent_payments')
      .select('id')
      .eq('rent_due_id', rentDueId)
      .eq('status', 'succeeded')
      .maybeSingle()

    if (dupError) {
      console.error('Error checking duplicate payment:', dupError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to check payment status' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (existingPayment) {
      return new Response(
        JSON.stringify({ error: 'Already paid for this period' }),
        { status: 409, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 5. Resolve lease and verify tenant access
    // -------------------------------------------------------------------------
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, owner_user_id, rent_amount, unit_id')
      .eq('id', rentDue.lease_id)
      .maybeSingle()

    if (leaseError) {
      console.error('Error fetching lease:', leaseError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lease' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!lease) {
      return new Response(
        JSON.stringify({ error: 'Lease not found' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Verify tenant is on this lease via lease_tenants junction table
    const { data: leaseTenant, error: leaseTenantsError } = await supabase
      .from('lease_tenants')
      .select('id')
      .eq('lease_id', lease.id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (leaseTenantsError) {
      console.error('Error verifying tenant lease access:', leaseTenantsError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to verify lease access' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!leaseTenant) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 6. Resolve connected account for the property owner
    // -------------------------------------------------------------------------
    const { data: connectedAccount, error: connectedError } = await supabase
      .from('stripe_connected_accounts')
      .select('stripe_account_id, default_platform_fee_percent, charges_enabled')
      .eq('user_id', lease.owner_user_id)
      .maybeSingle()

    if (connectedError) {
      console.error('Error fetching connected account:', connectedError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payment configuration' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!connectedAccount) {
      return new Response(
        JSON.stringify({ error: 'Property owner has not set up payment receiving. Please contact your landlord.' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 7. Check charges_enabled — owner must complete Stripe onboarding
    // -------------------------------------------------------------------------
    if (!connectedAccount.charges_enabled) {
      return new Response(
        JSON.stringify({ error: 'Property owner payment setup is incomplete. Please contact your landlord.' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // -------------------------------------------------------------------------
    // 8. Calculate fees — owner absorbs all fees, tenant pays exact rent
    // -------------------------------------------------------------------------
    const amountCents = Math.round(rentDue.amount * 100)
    const platformFeePercent = connectedAccount.default_platform_fee_percent ?? 5
    const applicationFeeCents = Math.round(amountCents * platformFeePercent / 100)

    // -------------------------------------------------------------------------
    // 9. Resolve property_id from unit
    // -------------------------------------------------------------------------
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('property_id')
      .eq('id', lease.unit_id)
      .maybeSingle()

    if (unitError) {
      console.error('Error fetching unit:', unitError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to resolve property' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    const propertyId = unit?.property_id ?? ''

    // -------------------------------------------------------------------------
    // 10. Derive period dates from rent_due.due_date
    // -------------------------------------------------------------------------
    const dueDate = new Date(rentDue.due_date)
    const periodMonth = String(dueDate.getMonth() + 1)
    const periodYear = String(dueDate.getFullYear())
    // Period start/end = first and last day of the due_date month
    const periodStart = `${periodYear}-${periodMonth.padStart(2, '0')}-01`
    const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
    const periodEnd = `${periodYear}-${periodMonth.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // -------------------------------------------------------------------------
    // 11. Create Stripe Checkout Session with destination charge
    // -------------------------------------------------------------------------
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Rent Payment',
            description: `Rent for ${periodMonth}/${periodYear}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: {
          destination: connectedAccount.stripe_account_id,
        },
        metadata: {
          tenant_id: tenant.id,
          lease_id: lease.id,
          property_id: propertyId,
          unit_id: lease.unit_id,
          rent_due_id: rentDueId,
          amount: String(rentDue.amount),
          period_month: periodMonth,
          period_year: periodYear,
          due_date: rentDue.due_date,
          period_start: periodStart,
          period_end: periodEnd,
        },
      },
      success_url: `${frontendUrl}/tenant?checkout=success`,
      cancel_url: `${frontendUrl}/tenant?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30-minute expiry
    })

    // Back-fill checkout_session_id onto PaymentIntent metadata
    // (cannot be set during session.create because session.id doesn't exist yet)
    if (session.payment_intent) {
      const piId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent.id
      await stripe.paymentIntents.update(piId, {
        metadata: { checkout_session_id: session.id },
      })
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { status: 200, headers: jsonHeaders }
    )
  } catch (err) {
    // Check if this is a Stripe API error (has a `type` property like 'StripeCardError')
    const errorObj = err as Record<string, unknown>
    const isStripeError = err instanceof Error && typeof errorObj.type === 'string' &&
      String(errorObj.type).startsWith('Stripe')

    if (isStripeError) {
      console.error('Stripe error:', (err as Error).message)
      return new Response(
        JSON.stringify({ error: 'Payment service unavailable. Please try again.' }),
        { status: 502, headers: jsonHeaders }
      )
    }

    console.error('Unexpected error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: jsonHeaders }
    )
  }
})
