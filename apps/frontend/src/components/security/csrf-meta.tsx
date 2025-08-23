/**
 * CSRF Meta Tag Component
 * Generates and injects CSRF token into HTML meta tags
 */

import { setCSRFToken } from '@/lib/auth/csrf-token'

export async function CSRFMeta() {
  // Generate CSRF token and set HTTP-only cookie
  const csrfToken = await setCSRFToken()
  
  return (
    <meta name="csrf-token" content={csrfToken} />
  )
}