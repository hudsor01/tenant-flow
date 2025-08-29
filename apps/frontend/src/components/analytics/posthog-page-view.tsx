'use client'

/**
 * ULTRA-SIMPLIFIED PostHogPageView - NO useSearchParams()  
 * PostHog auto-captures pageviews, we just add performance tracking
 */

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { usePostHog } from 'posthog-js/react'

export function PostHogPageView() {
	const pathname = usePathname()
	const posthog = usePostHog()
	const prevPathRef = useRef<string>('')

	useEffect(() => {
		if (!posthog || !pathname) {
			return
		}

		// Only track if the path has actually changed  
		if (prevPathRef.current !== pathname) {
			prevPathRef.current = pathname

			// PostHog auto-captures pageviews, just add performance data
			if (typeof window !== 'undefined' && window.performance) {
				const perfData = performance.getEntriesByType(
					'navigation'
				)[0] as PerformanceNavigationTiming
				if (perfData) {
					posthog.capture('$page_performance', {
						$pathname: pathname,
						load_time: perfData.loadEventEnd - perfData.loadEventStart,
						dom_interactive: perfData.domInteractive,
						dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart
					})
				}
			}
		}
	}, [pathname, posthog])

	return null
}
