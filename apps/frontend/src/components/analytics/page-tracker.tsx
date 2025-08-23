'use client'

/**
 * Page tracker component for analytics
 * Tracks page views and user interactions with PostHog
 */

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'

interface PageTrackerProps {
	pageTitle?: string
	pageName?: string
	pageCategory?: string
	properties?: Record<string, string | number | boolean>
}

export function PageTracker({
	pageTitle,
	pageName,
	pageCategory = 'dashboard',
	properties = {}
}: PageTrackerProps) {
	const posthog = usePostHog()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	useEffect(() => {
		if (!posthog) return

		// Track page view
		posthog.capture('$pageview', {
			$current_url: `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`,
			page_title: pageTitle || pageName || document.title,
			page_name: pageName,
			page_category: pageCategory,
			...properties
		})
	}, [
		posthog,
		pathname,
		searchParams,
		pageTitle,
		pageName,
		pageCategory,
		properties
	])

	// This component doesn't render anything
	return null
}

export default PageTracker
