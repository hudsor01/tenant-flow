// Debug endpoint to verify webhook secret configuration
export default async function handler(req, res) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  return res.json({
    hasWebhookSecret: !!webhookSecret,
    secretPrefix: webhookSecret ? webhookSecret.substring(0, 10) + '...' : 'not set',
    secretLength: webhookSecret ? webhookSecret.length : 0,
    startsWithWhsec: webhookSecret ? webhookSecret.startsWith('whsec_') : false,
    environment: {
      vercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV
    }
  });
}