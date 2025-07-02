import { buffer } from 'micro';

// Configure Vercel function to receive raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Test webhook to debug body handling
export default async function handler(req, res) {
  // Try micro buffer
  let microBody = null;
  let microError = null;
  try {
    microBody = await buffer(req);
  } catch (e) {
    microError = e.message;
  }
  
  return res.json({
    success: true,
    bodyReceived: microBody ? microBody.toString() : null,
    bodyLength: microBody ? microBody.length : 0,
    error: microError,
    hasSignature: !!req.headers['stripe-signature']
  });
}