// COPY THIS ENTIRE FILE TO SUPABASE DASHBOARD
// Function Name: create-subscription
// Description: Creates Stripe subscriptions with trial periods

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Stripe configuration - loads from environment variables
const STRIPE_CONFIG = {
  secretKey: Deno.env.get('STRIPE_SECRET_KEY'),
  priceIds: {
    starter: {
      monthly: Deno.env.get('STRIPE_STARTER_MONTHLY'),
      annual: Deno.env.get('STRIPE_STARTER_ANNUAL'),
    },
    growth: {
      monthly: Deno.env.get('STRIPE_GROWTH_MONTHLY'),
      annual: Deno.env.get('STRIPE_GROWTH_ANNUAL'),
    },
    enterprise: {
      monthly: Deno.env.get('STRIPE_ENTERPRISE_MONTHLY'),
      annual: Deno.env.get('STRIPE_ENTERPRISE_ANNUAL'),
    },
  },
};

function getPriceId(planId: 'starter' | 'growth' | 'enterprise', billingPeriod: 'monthly' | 'annual'): string {
  const priceId = STRIPE_CONFIG.priceIds[planId]?.[billingPeriod];
  if (!priceId) {
    throw new Error(`Price ID not found for plan: ${planId}, period: ${billingPeriod}`);
  }
  return priceId;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔑 Creating subscription with Stripe...');
    
    const { default: Stripe } = await import('https://esm.sh/stripe@14.21.0')
    const stripe = new Stripe(STRIPE_CONFIG.secretKey || '', {
      apiVersion: '2023-10-16',
    })

    const { createClient } = await import('jsr:@supabase/supabase-js@2')
    const authHeader = req.headers.get('Authorization')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? {
        global: { headers: { Authorization: authHeader } },
      } : {}
    )

    let user = null
    if (authHeader) {
      try {
        const { data } = await supabaseClient.auth.getUser()
        user = data.user
      } catch {
        console.log('No valid auth token, proceeding as unauthenticated user')
      }
    }

    const { planId, billingPeriod, userId, userEmail, userName, createAccount = false } = await req.json()

    if (!planId || !billingPeriod || !userEmail) {
      throw new Error('Missing required fields: planId, billingPeriod, userEmail')
    }

    const priceId = getPriceId(planId as 'starter' | 'growth' | 'enterprise', billingPeriod as 'monthly' | 'annual')

    let customerId: string | null = null
    
    if (user && userId) {
      const { data: existingSubscription } = await supabaseClient
        .from('Subscription')
        .select('stripeCustomerId')
        .eq('userId', userId)
        .single()

      if (existingSubscription?.stripeCustomerId) {
        customerId = existingSubscription.stripeCustomerId
      }
    }
    
    if (!customerId) {
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        metadata: {
          userId: userId || 'pending',
          createAccount: createAccount.toString(),
          planId: planId,
          billingPeriod: billingPeriod,
        },
      })
      customerId = customer.id
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      metadata: {
        userId: userId || 'pending',
        planId: planId,
        billingPeriod: billingPeriod,
        priceId: priceId,
        userEmail: userEmail,
        userName: userName || '',
        createAccount: createAccount.toString(),
      },
      automatic_payment_methods: { enabled: true },
    })

    const getTrialDays = (planId: string) => {
      switch (planId) {
        case 'starter': return 14;
        case 'growth': return 14;
        case 'enterprise': return 30;
        default: return 14;
      }
    };

    const trialDays = getTrialDays(planId);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      trial_period_days: trialDays,
      metadata: {
        userId: userId || 'pending',
        planId: planId,
        billingPeriod: billingPeriod,
        userEmail: userEmail,
        userName: userName || '',
        createAccount: createAccount.toString(),
        trialDays: trialDays.toString(),
      },
    })

    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id,
        clientSecret: setupIntent.client_secret!,
        customerId: customerId,
        status: subscription.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})