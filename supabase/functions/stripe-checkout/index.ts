// Stripe Checkout Edge Function
// Creates a Stripe Checkout Session for new TenantFlow platform subscriptions.
// Returns { url } — frontend redirects to this URL.
// Authenticated: requires JWT Bearer token.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

  // Authenticate
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: getCorsHeaders(req) })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401, headers: getCorsHeaders(req) })
  }

  try {
    const body = await req.json()
    const priceId: string = body.price_id ?? Deno.env.get('STRIPE_PRO_PRICE_ID') ?? ''

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'price_id is required' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

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
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Checkout session failed' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
