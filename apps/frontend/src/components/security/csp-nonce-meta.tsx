import { headers } from 'next/headers'

/**
 * CSP Nonce Meta Tag Component
 * Injects the CSP nonce as a meta tag for client-side access
 */
export async function CSPNonceMeta() {
  try {
    // Get the nonce from response headers
    const headersList = await headers()
    const nonce = headersList.get('X-CSP-Nonce')
    
    if (!nonce) {
      return null
    }
    
    return (
      <meta name="csp-nonce" content={nonce} />
    )
  } catch (error) {
    // In case headers() is not available (e.g., during static generation)
    console.warn('CSP nonce not available:', error)
    return null
  }
}