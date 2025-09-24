import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=denonext'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2024-11-20'
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

console.log('Stripe Checkout Edge Function initialized')

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Create Supabase client with authenticated user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    // Get authenticated user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user?.email) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const body = await req.json()
    const { priceId, planName, description } = body

    // Validate required fields
    if (!priceId || !planName) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: priceId and planName' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate priceId format
    if (!priceId.startsWith('price_')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid priceId format. Expected Stripe price ID starting with "price_"' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get('origin') || process.env.FRONTEND_URL || (() => {
      throw new Error('origin header or FRONTEND_URL environment variable is required for Stripe checkout')
    })()

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false },
      metadata: {
        user_id: user.id,
        user_email: user.email,
        plan_name: planName,
        description: description || `${planName} subscription for TenantFlow`
      }
    })

    console.log(`✅ Checkout session created: ${session.id} for user: ${user.email}`)

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (err) {
    console.error('❌ Stripe checkout error:', err)
    
    const errorMessage = err instanceof Error ? err.message : 'Checkout creation failed'
    const statusCode = err instanceof Error && err.message.includes('Invalid') ? 400 : 500

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})