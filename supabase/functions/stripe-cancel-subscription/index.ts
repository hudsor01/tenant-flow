// Stripe Cancel Subscription Edge Function (Phase 42 / CANCEL-01).
// Flips `cancel_at_period_end` on the authenticated user's subscription via
// `stripe.subscriptions.update`. Caller cannot specify subscription id —
// it is resolved server-side from users.stripe_customer_id to prevent IDOR.
//
// Authenticated: requires JWT Bearer token.
// Body: { action: 'cancel' | 'reactivate' }
// Response: { id: string, status: string, cancel_at_period_end: boolean, current_period_end: number }

import { handleCorsOptions, getJsonHeaders } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getStripeClient } from '../_shared/stripe-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

interface CancelRequest {
  action?: unknown
}

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

  const supabase = createAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const auth = await validateBearerAuth(req, supabase)
  if ('error' in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: getJsonHeaders(req),
    })
  }
  const { user } = auth

  try {
    const body = (await req.json().catch(() => ({}))) as CancelRequest
    const action = body.action
    if (action !== 'cancel' && action !== 'reactivate') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: getJsonHeaders(req),
      })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!userData?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No subscription to modify' }),
        { status: 404, headers: getJsonHeaders(req) },
      )
    }

    const stripe = getStripeClient(env.STRIPE_SECRET_KEY)

    const subList = await stripe.subscriptions.list({
      customer: userData.stripe_customer_id,
      status: 'all',
      limit: 1,
    })
    const subscription = subList.data[0]
    if (!subscription) {
      return new Response(
        JSON.stringify({ error: 'No subscription found' }),
        { status: 404, headers: getJsonHeaders(req) },
      )
    }

    // Guards: Stripe rejects update() on a `canceled` subscription with 400. Catch this
    // before calling Stripe so the caller gets a meaningful response (UI can render the
    // appropriate empty/lapsed state) instead of an opaque 500.
    if (subscription.status === 'canceled') {
      if (action === 'reactivate') {
        return new Response(
          JSON.stringify({ error: 'Subscription has ended. Please subscribe again from /pricing.' }),
          { status: 400, headers: getJsonHeaders(req) },
        )
      }
      // action === 'cancel' on an already-canceled sub: idempotent success. Return the
      // current state so the UI can refresh without an error toast.
      return new Response(
        JSON.stringify({
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: subscription.current_period_end,
        }),
        { status: 200, headers: getJsonHeaders(req) },
      )
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: action === 'cancel',
    })

    return new Response(
      JSON.stringify({
        id: updated.id,
        status: updated.status,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end,
      }),
      { status: 200, headers: getJsonHeaders(req) },
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'cancel_subscription' })
  }
})
