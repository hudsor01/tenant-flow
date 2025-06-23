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
    // The portal configuration should be set up in the Stripe Dashboard at:
    // https://dashboard.stripe.com/settings/billing/portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: req.body.returnUrl || `${req.headers.origin || 'https://tenantflow.app'}/settings/billing`,
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