'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePostHog } from '@/hooks/use-posthog'

export function PostHogUserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { posthog, trackEvent } = usePostHog()

  useEffect(() => {
    if (user && posthog) {
      // Identify the user in PostHog
      posthog.identify(user.id, {
        email: user.email,
        created_at: user.createdAt,
      })
      
      // Track sign in event if user just logged in
      const isNewSession = sessionStorage.getItem('posthog_new_session') !== 'false'
      if (isNewSession) {
        trackEvent('user_signed_in', {
          user_id: user.id,
        })
        sessionStorage.setItem('posthog_new_session', 'false')
      }
    } else if (posthog) {
      // Reset user identification on logout
      posthog.reset()
      sessionStorage.removeItem('posthog_new_session')
    }
  }, [user, posthog, trackEvent])

  return <>{children}</>
}