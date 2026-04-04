// Detach Payment Method Edge Function
// Detaches a payment method from Stripe API, then deletes from DB.
// Stripe API detach is MANDATORY per Decision #20 -- no DB-only fallback.
//
// POST { payment_method_id: string } (UUID from payment_methods table)
// Auth: Bearer token required (tenant must own the payment method)
//
// Flow:
// 1. Authenticate caller
// 2. Look up payment_methods row, verify ownership via tenant join
// 3. stripe.paymentMethods.detach(stripe_pm_id) -- MANDATORY
// 4. Delete from payment_methods table
// 5. If deleted method was default, promote next most recent
// 6. If deleted method was used for autopay and no others remain, disable autopay

import { getCorsHeaders, handleCorsOptions, getJsonHeaders } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getStripeClient } from '../_shared/stripe-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: getCorsHeaders(req),
    })
  }

  const jsonHeaders = getJsonHeaders(req)

  let env: Record<string, string>
  try {
    env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'],
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'env_validation' })
  }

  try {
    // 1. Authenticate
    const supabaseUrl = env.SUPABASE_URL
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
    const stripeKey = env.STRIPE_SECRET_KEY

    // Use admin client for auth verification (validateBearerAuth calls getUser with the token)
    const supabaseAuth = createAdminClient(supabaseUrl, supabaseServiceKey)

    const auth = await validateBearerAuth(req, supabaseAuth)
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: jsonHeaders,
      })
    }
    const { user } = auth

    // Parse request body
    const body = await req.json()
    const paymentMethodId: string | undefined = body.payment_method_id

    if (!paymentMethodId) {
      return new Response(
        JSON.stringify({ error: 'payment_method_id is required' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Use service role client for DB operations
    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

    // 2. Look up payment method and verify ownership
    const { data: paymentMethod, error: pmError } = await supabase
      .from('payment_methods')
      .select('id, stripe_payment_method_id, tenant_id, is_default')
      .eq('id', paymentMethodId)
      .single()

    if (pmError || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Payment method not found' }),
        { status: 404, headers: jsonHeaders }
      )
    }

    // Verify the payment method belongs to the caller's tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', paymentMethod.tenant_id)
      .eq('user_id', user.id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: payment method does not belong to you' }),
        { status: 403, headers: jsonHeaders }
      )
    }

    // 3. Detach from Stripe API -- MANDATORY, no fallback
    const stripe = getStripeClient(stripeKey)
    const stripePmId = paymentMethod.stripe_payment_method_id as string

    await stripe.paymentMethods.detach(stripePmId)

    // 4. Delete from DB
    const wasDefault = paymentMethod.is_default as boolean

    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', paymentMethodId)

    if (deleteError) {
      console.error('Failed to delete payment method from DB after Stripe detach', deleteError)
      return new Response(
        JSON.stringify({ error: 'Stripe detach succeeded but DB deletion failed' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    // 5. If deleted method was default, promote next most recent
    if (wasDefault) {
      const { data: nextMethod } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (nextMethod) {
        await supabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', nextMethod.id)
      }
    }

    // 6. Check if deleted method was used for autopay
    // Find leases where this tenant has autopay enabled with the detached payment method
    const { data: leases } = await supabase
      .from('leases')
      .select('id, autopay_payment_method_id, lease_tenants!inner(tenant_id)')
      .eq('lease_tenants.tenant_id', tenant.id)
      .eq('auto_pay_enabled', true)
      .eq('autopay_payment_method_id', stripePmId)

    if (leases && leases.length > 0) {
      // Check if tenant has any remaining payment methods
      const { count } = await supabase
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      if ((count ?? 0) === 0) {
        // No payment methods left -- disable autopay on affected leases
        for (const lease of leases) {
          await supabase.rpc('toggle_autopay', {
            p_lease_id: lease.id,
            p_enabled: false,
            p_payment_method_id: null,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: jsonHeaders }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'detach_payment_method' })
  }
})
