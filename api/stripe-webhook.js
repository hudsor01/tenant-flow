import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

// Use environment variables that work in Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

// Disable body parsing for this API route
export const config = {
  api: {
    bodyParser: false,
  },
};

// Official Vercel approach using micro buffer (recommended by Vercel docs)
async function getRawBody(req) {
  console.log('📖 STARTING MICRO BUFFER READ...');
  console.log('📖 Request state before buffer:', {
    hasBody: !!req.body,
    readable: req.readable,
    readableEnded: req.readableEnded,
    readableFlowing: req.readableFlowing
  });
  
  try {
    // This is the official Vercel-recommended approach for raw body
    const buf = await buffer(req);
    console.log('📖 MICRO BUFFER SUCCESS:', {
      bufferLength: buf.length,
      isBuffer: Buffer.isBuffer(buf),
      bufferType: typeof buf
    });
    return buf;
  } catch (error) {
    console.error('📖 MICRO BUFFER FAILED:', {
      errorMessage: error.message,
      errorType: error.constructor.name,
      errorStack: error.stack ? error.stack.substring(0, 300) + '...' : 'NO_STACK'
    });
    throw new Error(`Unable to read webhook payload: ${error.message}`);
  }
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

  // Enhanced verbose debugging for webhook troubleshooting
  console.log('🔍 VERBOSE REQUEST DEBUG:', {
    timestamp: new Date().toISOString(),
    hasSignature: !!sig,
    hasSecret: !!webhookSecret,
    method: req.method,
    url: req.url,
    headers: {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      stripeSignature: sig ? sig.substring(0, 50) + '...' : 'MISSING',
      userAgent: req.headers['user-agent'],
      authorization: req.headers['authorization'] ? 'PRESENT' : 'NONE'
    },
    body: {
      hasBody: !!req.body,
      bodyType: typeof req.body,
      bodyContent: req.body ? req.body.toString().substring(0, 100) + '...' : 'NONE'
    },
    stream: {
      readable: req.readable,
      readableEnded: req.readableEnded,
      readableFlowing: req.readableFlowing,
      readableLength: req.readableLength,
      destroyed: req.destroyed
    },
    secret: {
      hasSecret: !!webhookSecret,
      secretLength: webhookSecret ? webhookSecret.length : 0,
      secretFormat: webhookSecret ? webhookSecret.startsWith('whsec_') : false,
      secretPreview: webhookSecret ? webhookSecret.substring(0, 15) + '...' : 'MISSING'
    }
  });

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  console.log('🔄 ATTEMPTING RAW BODY READ...');
  
  try {
    // Get raw body using Vercel-specific method
    const rawBody = await getRawBody(req);
    
    console.log('✅ RAW BODY SUCCESSFULLY READ:', {
      bodyLength: rawBody.length,
      bodyType: typeof rawBody,
      isBuffer: Buffer.isBuffer(rawBody),
      bodyPreview: rawBody.toString().substring(0, 100) + '...',
      bodyHash: require('crypto').createHash('sha256').update(rawBody).digest('hex').substring(0, 16),
      firstChar: rawBody.length > 0 ? rawBody.toString().charAt(0) : 'EMPTY',
      lastChar: rawBody.length > 0 ? rawBody.toString().charAt(rawBody.length - 1) : 'EMPTY'
    });
    
    if (!rawBody || rawBody.length === 0) {
      throw new Error('No webhook payload was provided.');
    }
    
    // Attempt webhook signature verification
    console.log('🔐 ATTEMPTING SIGNATURE VERIFICATION...');
    console.log('🔐 Verification inputs:', {
      bodyLength: rawBody.length,
      signaturePresent: !!sig,
      secretPresent: !!webhookSecret,
      signaturePrefix: sig ? sig.substring(0, 20) + '...' : 'NONE'
    });
    
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    
    console.log(`✅ SIGNATURE VERIFICATION SUCCESS! Event details:`, {
      eventType: event.type,
      eventId: event.id,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode,
      apiVersion: event.api_version
    });
  } catch (err) {
    console.error(`❌ WEBHOOK SIGNATURE VERIFICATION FAILED: ${err.message}`);
    console.error('🔍 FAILURE DEBUG INFO:', {
      errorMessage: err.message,
      errorType: err.constructor.name,
      errorStack: err.stack ? err.stack.substring(0, 500) + '...' : 'NO_STACK',
      hasSignature: !!sig,
      hasSecret: !!webhookSecret,
      method: req.method,
      contentType: req.headers['content-type'],
      headers: Object.keys(req.headers),
      timestamp: new Date().toISOString(),
      possibleCauses: [
        'Wrong webhook secret (90% of failures)',
        'Body modification/parsing issue (10% of failures)',
        'Network/transmission corruption',
        'Timestamp tolerance exceeded'
      ]
    });
    return res.status(400).json({ 
      error: `Webhook Error: ${err.message}`,
      timestamp: new Date().toISOString(),
      debug: process.env.NODE_ENV !== 'production' ? {
        hasSignature: !!sig,
        hasSecret: !!webhookSecret,
        errorType: err.constructor.name
      } : undefined
    });
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

    console.log(`✅ Successfully processed ${event.type}`);
    return res.json({ received: true, eventType: event.type });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
}

async function handleCheckoutCompleted(session) {
  if (!session.customer || !session.subscription) return;

  const metadata = session.metadata || {};
  
  try {
    console.log('Processing subscription for:', metadata.userEmail || 'existing user');

    // Store subscription data using existing schema
    const { error: subError } = await supabase
      .from('Subscription')
      .upsert({
        userId: metadata.userId || 'pending-' + session.customer,
        plan: metadata.planId || 'professional',
        status: 'ACTIVE',
        startDate: new Date().toISOString(),
        endDate: null,
        cancelledAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (subError) {
      console.error('Error creating subscription record:', subError);
      throw subError;
    } else {
      console.log('✅ Successfully stored subscription for:', metadata.userEmail || metadata.userId);
    }

  } catch (error) {
    console.error('❌ Error in checkout completion:', error);
    throw error;
  }
}

async function handleSubscriptionChange(subscription) {
  const { error } = await supabase
    .from('Subscription')
    .update({
      status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELED',
      endDate: subscription.cancel_at_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      cancelledAt: subscription.status === 'canceled' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .eq('userId', subscription.metadata?.userId || 'pending-' + subscription.customer);

  if (error) {
    console.error('❌ Error updating subscription:', error);
    throw error;
  } else {
    console.log('✅ Successfully updated subscription:', subscription.id);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const { error } = await supabase
    .from('Subscription')
    .update({
      status: 'CANCELED',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('userId', subscription.metadata?.userId || 'pending-' + subscription.customer);

  if (error) {
    console.error('❌ Error canceling subscription:', error);
    throw error;
  } else {
    console.log('✅ Successfully canceled subscription:', subscription.id);
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
      console.error('❌ Error recording payment:', error);
      throw error;
    } else {
      console.log('✅ Successfully recorded rent payment:', paymentIntent.id);
    }
  }
}