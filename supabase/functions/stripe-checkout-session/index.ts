// Stripe Checkout Session Retrieval Edge Function
// Retrieves a completed Stripe Checkout Session to extract customer email.
// Used by the post-checkout page to send a magic link to the new subscriber.
// Unauthenticated — the Stripe session_id is the secret (Stripe-issued opaque token).
//
// POST { sessionId: string }
// → 200 { customer_email: string, customer_details: { email: string, name: string | null } }
// → 400 { error: 'sessionId is required' }
// → 500 { error: '...' }

import Stripe from 'npm:stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

  try {
    const body = await req.json()
    const sessionId: string = body.sessionId

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details'],
    })

    const customerEmail =
      session.customer_email ??
      session.customer_details?.email ??
      null

    return new Response(
      JSON.stringify({
        customer_email: customerEmail,
        customer_details: session.customer_details ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to retrieve session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
