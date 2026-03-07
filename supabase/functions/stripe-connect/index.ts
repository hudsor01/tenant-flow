// Supabase Edge Function: stripe-connect
// Handles Stripe Connect onboarding URL generation and account status retrieval.
// Authenticates via JWT bearer token — no anon access.
// Stripe API calls are made server-side using the secret key stored in Edge Function secrets.

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  try {
    const env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'],
      optional: ['FRONTEND_URL'],
    })

    // Authenticate via Bearer token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: getCorsHeaders(req) })
    }

    const supabase = createClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])
    const stripe = new Stripe(env['STRIPE_SECRET_KEY'], { apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion })
    const returnUrl = env['FRONTEND_URL'] ?? 'http://localhost:3050'

    // Verify user JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: getCorsHeaders(req) })
    }

    // Parse action from request body
    const body = await req.json() as Record<string, unknown>
    const action = body.action as string

    // -----------------------------------------------------------------------
    // action: 'account' — returns live account status from Stripe
    // -----------------------------------------------------------------------
    if (action === 'account') {
      const { data: row, error: dbError } = await supabase
        .from('stripe_connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError) {
        return errorResponse(req, 500, dbError, { action: 'stripe_connect_account_fetch' })
      }

      if (!row) {
        return new Response(
          JSON.stringify({ account: null, hasAccount: false }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // Fetch live Stripe account status — degrade gracefully on Stripe API error
      try {
        const stripeAccount = await stripe.accounts.retrieve(row.stripe_account_id as string)
        const account = {
          ...row,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          requirements_due: stripeAccount.requirements?.currently_due ?? [],
          onboarding_status: stripeAccount.charges_enabled ? 'complete' : 'pending',
        }
        return new Response(
          JSON.stringify({ account, hasAccount: true }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      } catch (stripeErr) {
        console.warn('[stripe-connect] Stripe API unreachable, returning DB data:', stripeErr)
        return new Response(
          JSON.stringify({ account: row, hasAccount: true }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }
    }

    // -----------------------------------------------------------------------
    // action: 'onboard' — create Stripe account + return onboarding URL
    // -----------------------------------------------------------------------
    if (action === 'onboard') {
      const displayName = body.displayName as string | undefined
      const businessName = body.businessName as string | undefined
      const country = (body.country as string | undefined) ?? 'US'
      const entityType = body.entityType as 'individual' | 'company' | undefined

      // Check for existing account
      const { data: existingRow } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      let stripeAccountId: string

      if (existingRow?.stripe_account_id) {
        stripeAccountId = existingRow.stripe_account_id as string
      } else {
        // Create a new Stripe Express account
        const account = await stripe.accounts.create({
          type: 'express',
          country,
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: displayName ? { name: displayName } : undefined,
        })
        stripeAccountId = account.id

        // Persist the new account record
        await supabase.from('stripe_connected_accounts').insert({
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          business_type: entityType ?? 'individual',
          onboarding_status: 'pending',
          business_name: businessName ?? null,
        })
      }

      // Create the account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${returnUrl}/settings/payouts`,
        return_url: `${returnUrl}/dashboard?stripe_connect=success`,
        type: 'account_onboarding',
      })

      return new Response(
        JSON.stringify({ onboardingUrl: accountLink.url, accountId: stripeAccountId }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'refresh-link' — refresh expired onboarding link
    // -----------------------------------------------------------------------
    if (action === 'refresh-link') {
      const { data: row, error: dbError } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError || !row) {
        return new Response(
          JSON.stringify({ error: 'No connected account found' }),
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      const accountLink = await stripe.accountLinks.create({
        account: row.stripe_account_id as string,
        refresh_url: `${returnUrl}/settings/payouts`,
        return_url: `${returnUrl}/dashboard?stripe_connect=success`,
        type: 'account_onboarding',
      })

      return new Response(
        JSON.stringify({ onboardingUrl: accountLink.url }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'balance' — get connected account balance
    // -----------------------------------------------------------------------
    if (action === 'balance') {
      const { data: row, error: dbError } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError || !row) {
        return new Response(
          JSON.stringify({ error: 'No connected account found' }),
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      const balance = await stripe.balance.retrieve({
        stripeAccount: row.stripe_account_id as string,
      })

      return new Response(
        JSON.stringify({ balance: { available: balance.available, pending: balance.pending } }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'payouts' — list payouts for connected account
    // -----------------------------------------------------------------------
    if (action === 'payouts') {
      // EDGE-08: Cap limit parameter at 100 to prevent abuse
      const limit = Math.min(Number(body.limit) || 10, 100)
      const starting_after = body.starting_after as string | undefined

      const { data: row, error: dbError } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError || !row) {
        return new Response(
          JSON.stringify({ error: 'No connected account found' }),
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      const params: Stripe.PayoutListParams = { limit }
      if (starting_after) params.starting_after = starting_after

      const payouts = await stripe.payouts.list(params, {
        stripeAccount: row.stripe_account_id as string,
      })

      return new Response(
        JSON.stringify({ payouts: payouts.data, hasMore: payouts.has_more }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'transfers' — list transfers to connected account
    // -----------------------------------------------------------------------
    if (action === 'transfers') {
      // EDGE-08: Cap limit parameter at 100 to prevent abuse
      const limit = Math.min(Number(body.limit) || 10, 100)
      const starting_after = body.starting_after as string | undefined

      const { data: row, error: dbError } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError || !row) {
        return new Response(
          JSON.stringify({ error: 'No connected account found' }),
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      const params: Stripe.TransferListParams = {
        destination: row.stripe_account_id as string,
        limit,
      }
      if (starting_after) params.starting_after = starting_after

      const transfers = await stripe.transfers.list(params)

      return new Response(
        JSON.stringify({ transfers: transfers.data, hasMore: transfers.has_more }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'stripe_connect' })
  }
})
