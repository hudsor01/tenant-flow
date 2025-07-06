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

// Price ID mapping from environment variables
const PRICE_IDS = {
  freeTrial: {
    monthly: process.env.VITE_STRIPE_FREE_TRIAL,
    annual: process.env.VITE_STRIPE_FREE_TRIAL
  },
  starter: {
    monthly: process.env.VITE_STRIPE_STARTER_MONTHLY,
    annual: process.env.VITE_STRIPE_STARTER_ANNUAL
  },
  growth: {
    monthly: process.env.VITE_STRIPE_GROWTH_MONTHLY,
    annual: process.env.VITE_STRIPE_GROWTH_ANNUAL
  },
  enterprise: {
    monthly: process.env.VITE_STRIPE_ENTERPRISE_MONTHLY,
    annual: process.env.VITE_STRIPE_ENTERPRISE_ANNUAL
  }
}

function getPriceId(planId, billingPeriod) {
  const plan = PRICE_IDS[planId]
  if (!plan) {
    throw new Error(`Invalid plan ID: ${planId}`)
  }
  
  const priceId = plan[billingPeriod]
  if (!priceId) {
    throw new Error(`Invalid billing period '${billingPeriod}' for plan '${planId}'`)
  }
  
  return priceId
}

async function getOrCreateStripeCustomer(userId) {
  // First, try to find existing customer in database
  const { data: user, error: userError } = await supabase
    .from('User')
    .select('email, stripeCustomerId, firstName, lastName')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`User not found: ${userError.message}`)
  }

  // If user already has a Stripe customer ID, return it
  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId)
      return customer
    } catch (error) {
      console.warn(`Stripe customer ${user.stripeCustomerId} not found, creating new one`)
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
    metadata: {
      userId: userId,
      source: 'tenantflow'
    }
  })

  // Update user record with Stripe customer ID
  const { error: updateError } = await supabase
    .from('User')
    .update({ stripeCustomerId: customer.id })
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to update user with Stripe customer ID:', updateError)
    // Don't throw error here as the customer was created successfully
  }

  return customer
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
    const { 
      planId, 
      billingPeriod = 'monthly', 
      userId,
      paymentMethodCollection = 'always' 
    } = req.body

    // Validate required parameters
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' })
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!['monthly', 'annual'].includes(billingPeriod)) {
      return res.status(400).json({ error: 'Invalid billing period' })
    }

    // Get price ID for the plan
    const priceId = getPriceId(planId, billingPeriod)

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(userId)

    console.log(`Creating subscription for customer ${customer.id}, plan: ${planId}, period: ${billingPeriod}`)

    // Create subscription based on plan type
    if (planId === 'freeTrial') {
      // For free trial, handle payment method collection based on preference
      if (paymentMethodCollection === 'if_required') {
        // Create subscription without requiring payment method
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          trial_period_days: 14,
          metadata: {
            userId,
            planId,
            billingPeriod,
            source: 'tenantflow',
            paymentMethodCollection
          }
        })

        return res.json({
          subscriptionId: subscription.id,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          clientSecret: null
        })
      } else {
        // Create setup intent to collect payment method for post-trial billing
        const setupIntent = await stripe.setupIntents.create({
          customer: customer.id,
          usage: 'off_session',
          metadata: {
            userId,
            planId,
            billingPeriod,
            source: 'tenantflow'
          }
        })

        // Create subscription that will use the setup intent's payment method
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          trial_period_days: 14,
          payment_behavior: 'default_incomplete',
          payment_settings: { 
            save_default_payment_method: 'on_subscription',
            payment_method_types: ['card']
          },
          metadata: {
            userId,
            planId,
            billingPeriod,
            source: 'tenantflow',
            setupIntentId: setupIntent.id
          }
        })

        return res.json({
          subscriptionId: subscription.id,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          clientSecret: setupIntent.client_secret,
          setupIntentId: setupIntent.id
        })
      }
    } else {
      // For paid plans, we need to use a different approach
      // Create subscription with payment_behavior that ensures payment intent creation
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          planId,
          billingPeriod,
          source: 'tenantflow'
        }
      })

      console.log(`Created subscription ${subscription.id} with status: ${subscription.status}`)

      // For default_incomplete, we need to ensure the invoice can collect payment
      // The payment intent will be created when customer submits payment method
      // But we need to return the invoice details for frontend
      
      let paymentIntent = subscription.latest_invoice?.payment_intent

      if (!paymentIntent && subscription.latest_invoice) {
        // For default_incomplete behavior, this is expected
        // We need to create a payment intent manually for the invoice amount
        console.log('Creating payment intent for incomplete subscription...')
        
        try {
          const invoice = subscription.latest_invoice
          
          // Create a manual payment intent for the invoice
          paymentIntent = await stripe.paymentIntents.create({
            amount: invoice.amount_due,
            currency: invoice.currency || 'usd',
            customer: customer.id,
            payment_method_types: ['card'],
            metadata: {
              subscriptionId: subscription.id,
              invoiceId: invoice.id,
              userId,
              planId,
              billingPeriod,
              source: 'tenantflow'
            }
          })
          
          console.log(`Created payment intent: ${paymentIntent.id}`)
          
        } catch (paymentIntentError) {
          console.error('Failed to create payment intent:', paymentIntentError)
          throw new Error('Failed to create payment intent for subscription')
        }
      }

      if (!paymentIntent) {
        throw new Error('Failed to create payment intent for subscription')
      }

      return res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
        status: subscription.status
      })
    }

  } catch (error) {
    console.error('Subscription creation failed:', error)
    
    // Return appropriate error messages
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: error.message })
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid request to Stripe' })
    } else if (error.message.includes('Invalid plan ID') || error.message.includes('Invalid billing period')) {
      return res.status(400).json({ error: error.message })
    } else {
      return res.status(500).json({ error: 'Failed to create subscription' })
    }
  }
}