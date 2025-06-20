import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

// Stripe configuration with price IDs
function getStripeConfig() {
  return {
    priceIds: {
      starter: {
        monthly: process.env.VITE_STRIPE_STARTER_MONTHLY,
        annual: process.env.VITE_STRIPE_STARTER_ANNUAL,
      },
      professional: {
        monthly: process.env.VITE_STRIPE_PROFESSIONAL_MONTHLY,
        annual: process.env.VITE_STRIPE_PROFESSIONAL_ANNUAL,
      },
      enterprise: {
        monthly: process.env.VITE_STRIPE_ENTERPRISE_MONTHLY,
        annual: process.env.VITE_STRIPE_ENTERPRISE_ANNUAL,
      },
    },
  };
}

function getPriceId(planId, billingPeriod) {
  const config = getStripeConfig();
  const priceId = config.priceIds[planId]?.[billingPeriod];
  
  if (!priceId) {
    console.error('Available environment variables:', {
      VITE_STRIPE_STARTER_MONTHLY: process.env.VITE_STRIPE_STARTER_MONTHLY,
      VITE_STRIPE_PROFESSIONAL_MONTHLY: process.env.VITE_STRIPE_PROFESSIONAL_MONTHLY,
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

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId || 'pending',
        planId: planId,
        billingPeriod: billingPeriod,
        userEmail: userEmail,
        userName: userName || '',
        createAccount: createAccount.toString(),
      },
      trial_period_days: planId === 'starter' ? 14 : 0, // 14-day trial for starter
    });

    // Get the client secret from the payment intent
    const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      customerId: customerId,
      status: subscription.status,
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ error: error.message });
  }
}