// Minimal webhook test for api.tenantflow.app
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Diagnose the two main failure causes from Stripe docs
  const diagnosis = {
    webhookSecret: {
      exists: !!webhookSecret,
      length: webhookSecret?.length || 0,
      validFormat: webhookSecret?.startsWith('whsec_') || false,
      preview: webhookSecret ? webhookSecret.substring(0, 12) + '...' : 'MISSING'
    },
    signature: {
      exists: !!sig,
      length: sig?.length || 0,
      hasTimestamp: sig?.includes('t=') || false,
      hasV1: sig?.includes('v1=') || false,
      preview: sig ? sig.substring(0, 30) + '...' : 'MISSING'
    },
    request: {
      method: req.method,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length']
    }
  };

  // Try to read body
  try {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const rawBody = Buffer.concat(chunks);
    diagnosis.body = {
      received: true,
      length: rawBody.length,
      preview: rawBody.toString().substring(0, 50) + '...'
    };

    // Attempt verification if we have all components
    if (webhookSecret && sig && rawBody.length > 0) {
      try {
        const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        diagnosis.verification = { success: true, eventType: event.type };
      } catch (err) {
        diagnosis.verification = { success: false, error: err.message };
      }
    }
  } catch (err) {
    diagnosis.body = { received: false, error: err.message };
  }

  return res.json({
    status: 'webhook_test',
    timestamp: new Date().toISOString(),
    diagnosis
  });
}