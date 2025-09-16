/**
 * Stripe integration client using Supabase Edge Functions
 * CLAUDE.md compliant - Native platform integration
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@repo/shared'

interface CreateCheckoutSessionRequest {
  priceId: string
  planName: string
  description?: string
}

interface CreateCheckoutSessionResponse {
  sessionId: string
  url: string
}

/**
 * Create a Stripe checkout session via Supabase Edge Function
 */
export async function createCheckoutSession(
  request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get current session for authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication required. Please sign in to continue.')
  }

  // Call Supabase Edge Function
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(request)
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      error: `HTTP ${response.status}: ${response.statusText}` 
    }))
    throw new Error(errorData.error || 'Failed to create checkout session')
  }

  return response.json()
}

/**
 * Create a payment intent for custom checkout flow
 */
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  metadata = {},
  customerEmail
}: {
  amount: number
  currency?: string
  metadata?: Record<string, string>
  customerEmail?: string
}) {
  const response = await fetch('/api/stripe/payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency, metadata, customerEmail })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Payment intent creation failed' }))
    throw new Error(error.error || 'Failed to create payment intent')
  }

  return response.json()
}

/**
 * Check if user is authenticated with Supabase
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { session } } = await supabase.auth.getSession()
  return !!session?.access_token
}

/**
 * Get authenticated user info
 */
export async function getCurrentUser() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('User not authenticated')
  }

  return user
}