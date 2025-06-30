// COPY THIS ENTIRE FILE TO SUPABASE DASHBOARD
// Function Name: stripe-webhook
// Description: Handles Stripe webhook events for subscriptions and payments

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const { default: Stripe } = await import('https://esm.sh/stripe@14.21.0')
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const { createClient } = await import('jsr:@supabase/supabase-js@2')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret')
      return new Response('Missing signature or webhook secret', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get raw body
    const body = await req.text()
    let event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return new Response(`Webhook Error: ${err.message}`, { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object, supabase)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object, supabase)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function handleSetupIntentSucceeded(setupIntent: any, supabase: any) {
  const metadata = setupIntent.metadata || {}
  
  if (!metadata.userId || metadata.userId === 'pending') {
    console.log('Skipping setup intent - no valid user ID')
    return
  }

  // Create subscription record when setup is complete and subscription exists
  if (metadata.subscriptionId) {
    const { error } = await supabase
      .from('Subscription')
      .upsert({
        userId: metadata.userId,
        stripeCustomerId: setupIntent.customer,
        stripeSubscriptionId: metadata.subscriptionId,
        plan: metadata.planId || 'starter',
        status: 'ACTIVE',
        startDate: new Date().toISOString(),
        endDate: null,
        cancelledAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

    if (error) {
      console.error('Error creating subscription record:', error)
    } else {
      console.log('Successfully stored subscription for user:', metadata.userId)
    }
  }
}

async function handleSubscriptionChange(subscription: any, supabase: any) {
  const metadata = subscription.metadata || {}
  
  const { error } = await supabase
    .from('Subscription')
    .upsert({
      userId: metadata.userId || `temp-${subscription.customer}`,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      plan: metadata.planId || 'starter',
      status: subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      startDate: new Date(subscription.created * 1000).toISOString(),
      endDate: subscription.cancel_at_period_end ? 
        new Date(subscription.current_period_end * 1000).toISOString() : null,
      cancelledAt: subscription.status === 'canceled' ? 
        new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })

  if (error) {
    console.error('Error updating subscription:', error)
  } else {
    console.log('Successfully updated subscription:', subscription.id)
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  const { error } = await supabase
    .from('Subscription')
    .update({
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('stripeSubscriptionId', subscription.id)

  if (error) {
    console.error('Error canceling subscription:', error)
  } else {
    console.log('Successfully canceled subscription:', subscription.id)
  }
}

async function handlePaymentSuccess(paymentIntent: any, supabase: any) {
  const metadata = paymentIntent.metadata || {}
  
  // Handle rent payments
  if (metadata.leaseId && metadata.rentAmount) {
    const { error } = await supabase
      .from('Payment')
      .insert({
        leaseId: metadata.leaseId,
        amount: parseFloat(metadata.rentAmount),
        date: new Date().toISOString(),
        type: 'RENT',
        stripePaymentIntentId: paymentIntent.id,
        status: 'COMPLETED',
        processingFee: parseFloat(metadata.processingFee || '0'),
        notes: `Rent payment via Stripe - Processing fee: $${metadata.processingFee || '0'}`,
      })

    if (error) {
      console.error('Error recording payment:', error)
    } else {
      console.log('Successfully recorded rent payment:', paymentIntent.id)
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: any, supabase: any) {
  // Handle subscription invoice payments
  if (invoice.subscription) {
    console.log('Invoice payment succeeded for subscription:', invoice.subscription)
    
    // Update subscription status to ensure it's active
    const { error } = await supabase
      .from('Subscription')
      .update({
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      })
      .eq('stripeSubscriptionId', invoice.subscription)

    if (error) {
      console.error('Error updating subscription after invoice payment:', error)
    }
  }
}