import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'

export function PageTracker() {
	const _router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const posthog = usePostHog()

	useEffect(() => {
		// Track page views with PostHog
		if (posthog) {
			posthog.capture('$pageview', {
				$current_url: window.location.href,
				$pathname: pathname,
				$search: searchParams.toString(),
				timestamp: new Date().toISOString()
			})
		}
	}, [pathname, searchParams, posthog])

	// This component doesn't render anything
	return null
}
