// Stripe Checkout Session Retrieval Edge Function
// AUTH-05: Returns minimal data only (customer_email). Rate limited at 10 req/min per IP.
// Unauthenticated by design — users completing checkout may not have an account yet.
// The Stripe session_id is the secret (Stripe-issued opaque token).
//
// POST { sessionId: string }
// -> 200 { customer_email: string }
// -> 400 { error: 'sessionId is required' | 'Checkout session is not complete' }
// -> 429 { error: 'Too many requests' }
// -> 500 { error: 'An error occurred' }

import { getCorsHeaders, handleCorsOptions, getJsonHeaders } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { rateLimit } from '../_shared/rate-limit.ts'
import { getStripeClient } from '../_shared/stripe-client.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  // Rate limit: 10 req/min per IP
  const rateLimited = await rateLimit(req, { maxRequests: 10, windowMs: 60_000, prefix: 'checkout-session' })
  if (rateLimited) return rateLimited

  try {
    const env = validateEnv({
      required: ['STRIPE_SECRET_KEY'],
      optional: ['FRONTEND_URL'],
    })

    const body = await req.json()
    const sessionId: string = body.sessionId

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    const stripe = getStripeClient(env['STRIPE_SECRET_KEY'])

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // AUTH-05: Validate session is complete before returning any data
    if (session.status !== 'complete') {
      return new Response(
        JSON.stringify({ error: 'Checkout session is not complete' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    // AUTH-05: Return ONLY customer_email — no other session data, metadata, or payment info
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null

    return new Response(
      JSON.stringify({ customer_email: customerEmail }),
      { status: 200, headers: getJsonHeaders(req) }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'checkout_session_retrieve' })
  }
})
