// Stripe Billing Portal Edge Function
// Creates a Stripe Customer Portal Session for existing subscribers.
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
      optional: ['FRONTEND_URL'],
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
    const stripe = getStripeClient(stripeKey)

    // Get Stripe customer ID for this user
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!userData?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found. Subscribe to a plan first.' }),
        { status: 404, headers: getJsonHeaders(req) }
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
      headers: getJsonHeaders(req),
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'create_billing_portal_session' })
  }
})
