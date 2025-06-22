import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

// Use environment variables that work in Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Get raw body
    const body = req.body;
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Processing webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session) {
  if (!session.customer || !session.subscription) return;

  const metadata = session.metadata || {};
  
  // Store subscription info for existing users OR pending users
  try {
    console.log('Processing subscription for:', metadata.userEmail || 'existing user');

    // Store subscription data
    const { error: subError } = await supabase
      .from('Subscription')
      .upsert({
        userId: metadata.userId || null, // Use userId if provided, null for new users
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        status: 'active',
        planId: metadata.planId || 'professional',
        billingPeriod: metadata.billingPeriod || 'monthly',
        userEmail: metadata.userEmail, // Store email to match later for new users
        userName: metadata.userName,   // Store name to match later for new users
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (subError) {
      console.error('Error creating subscription record:', subError);
    } else {
      console.log('Successfully stored subscription for:', metadata.userEmail || metadata.userId);
    }

  } catch (error) {
    console.error('Error in checkout completion:', error);
  }
}

async function handleSubscriptionChange(subscription) {
  const { error } = await supabase
    .from('Subscription')
    .upsert({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'stripeSubscriptionId'
    });

  if (error) {
    console.error('Error updating subscription:', error);
  } else {
    console.log('Successfully updated subscription:', subscription.id);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const { error } = await supabase
    .from('Subscription')
    .update({
      status: 'canceled',
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('stripeSubscriptionId', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
  } else {
    console.log('Successfully canceled subscription:', subscription.id);
  }
}

async function handlePaymentSuccess(paymentIntent) {
  const metadata = paymentIntent.metadata;
  
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
      });

    if (error) {
      console.error('Error recording payment:', error);
    } else {
      console.log('Successfully recorded rent payment:', paymentIntent.id);
    }
  }
}