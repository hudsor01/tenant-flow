import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
})

// Use environment variables that work in Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration:', {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey
  })
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getStripeCustomerByUserId(userId) {
  const { data: user, error } = await supabase
    .from('User')
    .select('stripeCustomerId, email')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`User not found: ${error.message}`)
  }

  if (!user.stripeCustomerId) {
    throw new Error('User does not have a Stripe customer ID')
  }

  return user
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Get user's Stripe customer ID
    const user = await getStripeCustomerByUserId(userId)

    console.log(`Creating portal session for customer ${user.stripeCustomerId}`)

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing`,
      locale: 'en', // Can be made dynamic based on user preference
    })

    return res.json({ 
      url: session.url,
      sessionId: session.id
    })

  } catch (error) {
    console.error('Portal session creation failed:', error)
    
    // Return appropriate error messages
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid request to Stripe' })
    } else if (error.message.includes('User not found')) {
      return res.status(404).json({ error: 'User not found' })
    } else if (error.message.includes('does not have a Stripe customer ID')) {
      return res.status(400).json({ error: 'User has no billing account. Please subscribe to a plan first.' })
    } else {
      return res.status(500).json({ error: 'Failed to create portal session' })
    }
  }
}