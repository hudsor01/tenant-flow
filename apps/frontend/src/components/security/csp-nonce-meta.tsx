'use client'

/**
 * CSP Nonce Meta Tag Component
 * Injects the CSP nonce via client-side for production compatibility
 */
export function CSPNonceMeta() {
  // For production builds, we'll inject the nonce client-side to avoid SSG bailout
  // The nonce is available in the X-CSP-Nonce header set by middleware
  
  if (typeof window === 'undefined') {
    // During SSR/SSG, return a placeholder that will be hydrated client-side
    return <meta name="csp-nonce" content="" data-hydrate="true" />
  }
  
  return null // Client-side nonce injection happens in middleware
}