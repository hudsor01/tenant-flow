// Test webhook to debug body handling
export default async function handler(req, res) {
  console.log('🔍 Request debug:');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);
  console.log('Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('Body:', req.body);
  
  // Try to read from stream
  let streamBody = null;
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    streamBody = Buffer.concat(chunks).toString('utf8');
  } catch (e) {
    console.log('Stream read error:', e.message);
  }
  
  return res.json({
    method: req.method,
    headers: req.headers,
    bodyInfo: {
      type: typeof req.body,
      isBuffer: Buffer.isBuffer(req.body),
      bodyValue: req.body,
      streamBody: streamBody,
      streamError: streamBody === null
    },
    environment: {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    }
  });
}