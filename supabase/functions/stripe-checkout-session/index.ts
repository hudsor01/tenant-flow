// Stripe Checkout Session Retrieval Edge Function
// AUTH-05: Returns minimal data only (customer_email). Rate limiting deferred to Phase 4 (EDGE-02).
// Unauthenticated by design — users completing checkout may not have an account yet.
// The Stripe session_id is the secret (Stripe-issued opaque token).
//
// POST { sessionId: string }
// -> 200 { customer_email: string }
// -> 400 { error: 'sessionId is required' | 'Checkout session is not complete' }
// -> 500 { error: '...' }

import Stripe from 'stripe'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

  try {
    const body = await req.json()
    const sessionId: string = body.sessionId

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // AUTH-05: Validate session is complete before returning any data
    if (session.status !== 'complete') {
      return new Response(
        JSON.stringify({ error: 'Checkout session is not complete' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // AUTH-05: Return ONLY customer_email — no other session data, metadata, or payment info
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null

    return new Response(
      JSON.stringify({ customer_email: customerEmail }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to retrieve session' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
