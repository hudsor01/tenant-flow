// Supabase Edge Function: stripe-connect
// Handles Stripe Connect onboarding URL generation and account status retrieval.
// Authenticates via JWT bearer token — no anon access.
// Stripe API calls are made server-side using the secret key stored in Edge Function secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate via Bearer token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    const returnUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3050'

    // Verify user JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
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
        return new Response(
          JSON.stringify({ error: dbError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!row) {
        return new Response(
          JSON.stringify({ account: null, hasAccount: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (_stripeErr) {
        // Return DB data only if Stripe is unreachable
        return new Response(
          JSON.stringify({ account: row, hasAccount: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const balance = await stripe.balance.retrieve({
        stripeAccount: row.stripe_account_id as string,
      })

      return new Response(
        JSON.stringify({ balance: { available: balance.available, pending: balance.pending } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'payouts' — list payouts for connected account
    // -----------------------------------------------------------------------
    if (action === 'payouts') {
      const limit = (body.limit as number | undefined) ?? 10
      const starting_after = body.starting_after as string | undefined

      const { data: row, error: dbError } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError || !row) {
        return new Response(
          JSON.stringify({ error: 'No connected account found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const params: Stripe.PayoutListParams = { limit }
      if (starting_after) params.starting_after = starting_after

      const payouts = await stripe.payouts.list(params, {
        stripeAccount: row.stripe_account_id as string,
      })

      return new Response(
        JSON.stringify({ payouts: payouts.data, hasMore: payouts.has_more }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'transfers' — list transfers to connected account
    // -----------------------------------------------------------------------
    if (action === 'transfers') {
      const limit = (body.limit as number | undefined) ?? 10
      const starting_after = body.starting_after as string | undefined

      const { data: row, error: dbError } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError || !row) {
        return new Response(
          JSON.stringify({ error: 'No connected account found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
