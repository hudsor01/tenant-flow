'use client'

/**
 * ULTRA-SIMPLIFIED PageTracker - NO useSearchParams(), NO complex logic
 * Uses only PostHog's native auto-tracking + custom event properties
 */

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

interface PageTrackerProps {
	pageName: string
	pageCategory?: string
	properties?: Record<string, string | number | boolean>
}

export function PageTracker({ 
	pageName,
	pageCategory = 'dashboard', 
	properties = {} 
}: PageTrackerProps) {
	const posthog = usePostHog()

	useEffect(() => {
		// PostHog auto-captures pageviews, we just add custom properties
		posthog?.capture('page_view_custom', {
			page_name: pageName,
			page_category: pageCategory,
			...properties
		})
	}, [posthog, pageName, pageCategory, properties])

	return null
}

export default PageTracker
