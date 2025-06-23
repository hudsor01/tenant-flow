import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

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
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Create a portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || 'https://tenantflow.app'}/settings/billing`,
      configuration: {
        business_profile: {
          headline: 'TenantFlow - Manage your subscription',
        },
        features: {
          customer_update: {
            allowed_updates: ['email', 'name', 'address', 'phone'],
            enabled: true,
          },
          invoice_history: {
            enabled: true,
          },
          payment_method_update: {
            enabled: true,
          },
          subscription_cancel: {
            enabled: true,
            mode: 'at_period_end',
            proration_behavior: 'none',
          },
          subscription_pause: {
            enabled: false, // Disable pause for now
          },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ['price', 'quantity', 'promotion_code'],
            proration_behavior: 'create_prorations',
          },
        },
      },
    });

    return res.status(200).json({
      url: portalSession.url,
    });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create portal session' 
    });
  }
}