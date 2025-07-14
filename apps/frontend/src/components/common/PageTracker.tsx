import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { usePostHog } from 'posthog-js/react'

export function PageTracker() {
	const router = useRouter()
	const posthog = usePostHog()

	useEffect(() => {
		// Track page views with PostHog
		if (posthog) {
			const location = router.state.location
			posthog.capture('$pageview', {
				$current_url: window.location.href,
				$pathname: location.pathname,
				$search: location.search,
				timestamp: new Date().toISOString()
			})
		}
	}, [router.state.location, posthog])

	// This component doesn't render anything
	return null
}
