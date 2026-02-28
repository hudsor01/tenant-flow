// Stripe Billing Portal Edge Function
// Creates a Stripe Customer Portal Session for existing subscribers.
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
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    // Get Stripe customer ID for this user
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!userData?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found. Subscribe to a plan first.' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Create Customer Portal Session
    // Proration behavior: Stripe Customer Portal default (per user decision)
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${frontendUrl}/dashboard?billing=updated`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Portal session failed' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
