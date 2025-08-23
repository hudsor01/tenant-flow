/**
 * Embedded Billing Actions
 * Server actions for handling Stripe embedded checkout flows
 */

/**
 * Handle checkout return from Stripe embedded checkout
 */
export async function handleCheckoutReturn(sessionId: string): Promise<{
  success: boolean
  session?: unknown
  error?: string
}> {
  if (!sessionId) {
    return { success: false, error: 'No session ID provided' }
  }
  
  try {
    // Verify the checkout session with backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/stripe/checkout-session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      return { success: false, error: 'Invalid session' }
    }
    
    const session = await response.json()
    
    return { success: true, session }
  } catch (error) {
    console.error('Error handling checkout return:', error)
    return { success: false, error: 'Unknown error occurred' }
  }
}

/**
 * Create embedded checkout session
 */
export async function createEmbeddedCheckoutSession(priceId: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/stripe/embedded-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId })
    })
    
    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}