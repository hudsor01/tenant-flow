// Stripe Checkout Edge Function
// Creates a Stripe Checkout Session for new TenantFlow platform subscriptions.
// Returns { url } — frontend redirects to this URL.
// Authenticated: requires JWT Bearer token.

import { handleCorsOptions, getJsonHeaders } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getStripeClient } from '../_shared/stripe-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  let env: Record<string, string>
  try {
    env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'],
      optional: ['FRONTEND_URL', 'STRIPE_PRO_PRICE_ID'],
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'env_validation' })
  }

  const stripeKey = env.STRIPE_SECRET_KEY
  const supabaseUrl = env.SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:3050'

  // Authenticate
  const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)
  const auth = await validateBearerAuth(req, supabase)
  if ('error' in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: getJsonHeaders(req),
    })
  }
  const { user } = auth

  try {
    const body = await req.json()
    const priceId: string = body.price_id ?? env.STRIPE_PRO_PRICE_ID ?? ''

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'price_id is required' }), {
        status: 400, headers: getJsonHeaders(req),
      })
    }

    const stripe = getStripeClient(stripeKey)

    // Get or create Stripe customer for this user
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single()

    let customerId = userData?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? userData?.email,
        name: userData?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      // Save customer ID
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // Create Checkout Session (hosted checkout with Radar fraud detection)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${frontendUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/settings/billing?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: getJsonHeaders(req),
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'create_checkout_session' })
  }
})
