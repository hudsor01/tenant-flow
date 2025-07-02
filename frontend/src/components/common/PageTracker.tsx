import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { usePostHog } from 'posthog-js/react'

export function PageTracker() {
  const location = useLocation()
  const posthog = usePostHog()

  useEffect(() => {
    // Track page views with PostHog
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        $pathname: location.pathname,
        $search: location.search,
        timestamp: new Date().toISOString(),
      })
    }
  }, [location, posthog])

  // This component doesn't render anything
  return null
}