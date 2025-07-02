// Minimal test to isolate webhook secret vs body modification issues
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

  // Test 1: Check webhook secret configuration
  const secretCheck = {
    hasSecret: !!webhookSecret,
    secretLength: webhookSecret ? webhookSecret.length : 0,
    startsWithWhsec: webhookSecret ? webhookSecret.startsWith('whsec_') : false,
    secretPreview: webhookSecret ? webhookSecret.substring(0, 10) + '...' : 'MISSING'
  };

  // Test 2: Check signature header
  const signatureCheck = {
    hasSignature: !!sig,
    signatureLength: sig ? sig.length : 0,
    signatureFormat: sig ? sig.includes('t=') && sig.includes('v1=') : false,
    signaturePreview: sig ? sig.substring(0, 30) + '...' : 'MISSING'
  };

  // Test 3: Try to read request body
  let bodyCheck = {};
  try {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const rawBody = Buffer.concat(chunks);
    bodyCheck = {
      success: true,
      bodyLength: rawBody.length,
      isBuffer: Buffer.isBuffer(rawBody),
      bodyPreview: rawBody.toString().substring(0, 100) + '...',
      isEmpty: rawBody.length === 0
    };

    // Test 4: Only try signature verification if we have all required components
    if (webhookSecret && sig && rawBody.length > 0) {
      try {
        const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        bodyCheck.signatureVerification = {
          success: true,
          eventType: event.type,
          eventId: event.id
        };
      } catch (err) {
        bodyCheck.signatureVerification = {
          success: false,
          error: err.message,
          errorType: err.constructor.name
        };
      }
    } else {
      bodyCheck.signatureVerification = {
        skipped: true,
        reason: !webhookSecret ? 'No webhook secret' : 
                !sig ? 'No signature header' : 
                'Empty body'
      };
    }
  } catch (err) {
    bodyCheck = {
      success: false,
      error: err.message
    };
  }

  return res.json({
    timestamp: new Date().toISOString(),
    method: req.method,
    contentType: req.headers['content-type'],
    checks: {
      secret: secretCheck,
      signature: signatureCheck,
      body: bodyCheck
    },
    diagnosis: {
      likelyIssue: !webhookSecret ? 'MISSING_SECRET' :
                   !webhookSecret.startsWith('whsec_') ? 'INVALID_SECRET_FORMAT' :
                   !sig ? 'MISSING_SIGNATURE' :
                   bodyCheck.isEmpty ? 'EMPTY_BODY' :
                   bodyCheck.signatureVerification?.success ? 'ALL_GOOD' :
                   'VERIFICATION_FAILED',
      recommendation: !webhookSecret ? 'Set STRIPE_WEBHOOK_SECRET in Vercel environment' :
                      !sig ? 'Ensure Stripe is sending webhooks to this endpoint' :
                      bodyCheck.isEmpty ? 'Body parsing issue - check Vercel configuration' :
                      'Check webhook secret matches Stripe Dashboard'
    }
  });
}