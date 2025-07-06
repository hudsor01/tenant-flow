import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing for raw webhook data
export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

// Use environment variables that work in Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration:', {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to get raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

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

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Get raw body for signature verification
    const body = await getRawBody(req);
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

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Log detailed error for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      eventType: event.type,
      eventId: event.id
    });
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      eventType: event.type,
      eventId: event.id 
    });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout session:', session.id);
  
  try {
    if (!session.customer) {
      console.log('No customer found in session');
      return;
    }

    const metadata = session.metadata || {};
    console.log('Session metadata:', metadata);

    // For subscriptions, handle the subscription creation
    if (session.subscription) {
      console.log('Subscription found in session:', session.subscription);
      
      // Get the subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      console.log('Retrieved subscription:', subscription.id);
      
      // Store subscription data using correct schema
      const subscriptionData = {
        userId: metadata.userId || `pending-${session.customer}`,
        plan: metadata.planId || metadata.plan || 'starter',
        status: subscription.status,
        startDate: new Date(subscription.current_period_start * 1000).toISOString(),
        endDate: subscription.cancel_at_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString() 
          : null,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        planId: metadata.planId || metadata.plan,
        billingPeriod: subscription.items.data[0]?.price.recurring?.interval,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('Upserting subscription data:', subscriptionData);

      const { data, error: subError } = await supabase
        .from('Subscription')
        .upsert(subscriptionData, {
          onConflict: 'stripeSubscriptionId'
        });

      if (subError) {
        console.error('Error creating subscription record:', subError);
        throw subError;
      } else {
        console.log('Successfully stored subscription:', data);
      }
    }

    // Handle one-time payments
    if (session.payment_intent && !session.subscription) {
      console.log('One-time payment completed:', session.payment_intent);
      // Handle one-time payments if needed
    }

  } catch (error) {
    console.error('Error in checkout completion:', error);
    throw error;
  }
}

async function handleSubscriptionChange(subscription) {
  console.log('Processing subscription change:', subscription.id);
  
  try {
    const { data, error } = await supabase
      .from('Subscription')
      .update({
        status: subscription.status,
        endDate: subscription.cancel_at_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        cancelledAt: subscription.status === 'canceled' ? new Date().toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('stripeSubscriptionId', subscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    } else {
      console.log('Successfully updated subscription:', subscription.id);
    }
  } catch (error) {
    console.error('Error in subscription change:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription deletion:', subscription.id);
  
  try {
    const { data, error } = await supabase
      .from('Subscription')
      .update({
        status: 'canceled',
        cancelledAt: new Date().toISOString(),
        cancelAtPeriodEnd: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('stripeSubscriptionId', subscription.id);

    if (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    } else {
      console.log('Successfully canceled subscription:', subscription.id);
    }
  } catch (error) {
    console.error('Error in subscription deletion:', error);
    throw error;
  }
}

async function handlePaymentSuccess(paymentIntent) {
  console.log('Processing payment success:', paymentIntent.id);
  
  try {
    const metadata = paymentIntent.metadata;

    // Handle rent payments
    if (metadata.leaseId && metadata.rentAmount) {
      const { data, error } = await supabase.from('Payment').insert({
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
        throw error;
      } else {
        console.log('Successfully recorded rent payment:', paymentIntent.id);
      }
    }
  } catch (error) {
    console.error('Error in payment success:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Processing invoice payment succeeded:', invoice.id);
  
  try {
    // Update subscription if this is a subscription invoice
    if (invoice.subscription) {
      const { data, error } = await supabase
        .from('Subscription')
        .update({
          status: 'active',
          currentPeriodStart: new Date(invoice.period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(invoice.period_end * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('stripeSubscriptionId', invoice.subscription);

      if (error) {
        console.error('Error updating subscription after invoice payment:', error);
        throw error;
      } else {
        console.log('Successfully updated subscription after invoice payment');
      }
    }
  } catch (error) {
    console.error('Error in invoice payment succeeded:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Processing invoice payment failed:', invoice.id);
  
  try {
    // Update subscription status if payment failed
    if (invoice.subscription) {
      const { data, error } = await supabase
        .from('Subscription')
        .update({
          status: 'past_due',
          updatedAt: new Date().toISOString(),
        })
        .eq('stripeSubscriptionId', invoice.subscription);

      if (error) {
        console.error('Error updating subscription after failed payment:', error);
        throw error;
      } else {
        console.log('Successfully marked subscription as past due');
      }
    }
  } catch (error) {
    console.error('Error in invoice payment failed:', error);
    throw error;
  }
}
