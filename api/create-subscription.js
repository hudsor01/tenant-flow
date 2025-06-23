import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

// Stripe configuration with price IDs
function getStripeConfig() {
  return {
    priceIds: {
      starter: {
        monthly: process.env.VITE_STRIPE_STARTER_MONTHLY?.trim(),
        annual: process.env.VITE_STRIPE_STARTER_ANNUAL?.trim(),
      },
      professional: {
        monthly: process.env.VITE_STRIPE_PROFESSIONAL_MONTHLY?.trim(),
        annual: process.env.VITE_STRIPE_PROFESSIONAL_ANNUAL?.trim(),
      },
      enterprise: {
        monthly: process.env.VITE_STRIPE_ENTERPRISE_MONTHLY?.trim(),
        annual: process.env.VITE_STRIPE_ENTERPRISE_ANNUAL?.trim(),
      },
    },
  };
}

function getPriceId(planId, billingPeriod) {
  const config = getStripeConfig();
  const priceId = config.priceIds[planId]?.[billingPeriod];
  
  if (!priceId) {
    console.error('Available environment variables:', {
      VITE_STRIPE_STARTER_MONTHLY: process.env.VITE_STRIPE_STARTER_MONTHLY?.trim(),
      VITE_STRIPE_PROFESSIONAL_MONTHLY: process.env.VITE_STRIPE_PROFESSIONAL_MONTHLY?.trim(),
      planId,
      billingPeriod
    });
    throw new Error(`Price ID not found for plan: ${planId}, period: ${billingPeriod}. Check environment variables.`);
  }
  
  return priceId;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('API Route called:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, billingPeriod, userId, userEmail, userName, createAccount = false } = req.body;

    console.log('Received subscription request:', { planId, billingPeriod, userEmail, createAccount });

    if (!planId || !billingPeriod || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields: planId, billingPeriod, userEmail' });
    }

    // Get price ID from configuration
    const priceId = getPriceId(planId, billingPeriod);
    console.log('Using price ID:', JSON.stringify(priceId), 'Length:', priceId?.length);

    // Check if customer already exists
    let customerId = null;
    
    // Search Stripe for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    }

    // Create customer if doesn't exist
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
      });
      customerId = customer.id;
    }

    // Create subscription with proper trial configuration
    let subscription;

    if (planId !== 'free') {
      // For trials, create a setup intent first to collect payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: {
          userId: userId || 'pending',
          planId: planId,
          billingPeriod: billingPeriod,
          userEmail: userEmail,
          userName: userName || '',
          createAccount: createAccount.toString(),
        },
      });

      // Then create subscription that will use the payment method after trial
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 14,
        payment_settings: { 
          save_default_payment_method: 'on_subscription'
        },
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel'
          }
        },
        metadata: {
          userId: userId || 'pending',
          planId: planId,
          billingPeriod: billingPeriod,
          userEmail: userEmail,
          userName: userName || '',
          createAccount: createAccount.toString(),
          setupIntentId: setupIntent.id,
        },
      });

      // Return setup intent client secret for payment method collection
      return res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: setupIntent.client_secret, // This forces Stripe payment form
        customerId: customerId,
        status: subscription.status,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        isSetupIntent: true,
      });
    } else {
      // Free plan - no trial or payment needed
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          userId: userId || 'pending',
          planId: planId,
          billingPeriod: billingPeriod,
          userEmail: userEmail,
          userName: userName || '',
          createAccount: createAccount.toString(),
        },
      });
    }

    // Get client secret from the payment intent created for the subscription
    const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      customerId: customerId,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ error: error.message });
  }
}