'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function OAuthRedirectHandler() {
  const router = useRouter()

  useEffect(() => {
    // Check if this is an OAuth callback
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    
    if (code) {
      // Redirect to the auth callback page with all parameters
      router.replace(`/auth/callback${window.location.search}`)
    }
  }, [router])

  return null
}