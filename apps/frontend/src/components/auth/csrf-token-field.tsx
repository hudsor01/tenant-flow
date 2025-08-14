'use client'

import { useEffect, useState } from 'react'
import { getCSRFToken } from '@/lib/auth/csrf-client'

/**
 * Hidden CSRF token field for forms
 * Automatically fetches and includes CSRF token
 */
export function CSRFTokenField() {
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    // Fetch CSRF token on mount
    getCSRFToken().then(setToken).catch(() => {
      console.error('Failed to fetch CSRF token')
    })
  }, [])

  return (
    <input
      type="hidden"
      name="_csrf"
      value={token}
      readOnly
    />
  )
}