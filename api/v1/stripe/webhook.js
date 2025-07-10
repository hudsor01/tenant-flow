// Direct Stripe webhook handler for Vercel
const handler = require('../../../backend/dist/serverless.js')

module.exports = async (req, res) => {
  // Preserve the raw body for Stripe signature verification
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  // Set the correct URL for NestJS
  req.url = '/api/v1/stripe/webhook'
  
  // The raw body should be available as req.body in Buffer format
  if (req.body && !req.rawBody) {
    req.rawBody = req.body
  }
  
  return handler(req, res)
}

// Disable body parsing to get raw body
module.exports.config = {
  api: {
    bodyParser: false
  }
}