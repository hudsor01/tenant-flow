'use client'

import { useEffect } from 'react'
import { useInteractionTracking } from '@/lib/analytics/business-events'

interface PageTrackerProps {
	pageName: string
	section?: string
}

/**
 * Page Analytics Tracker
 * Automatically tracks page views with load time and section data
 */
export function PageTracker({ pageName, section: _section }: PageTrackerProps) {
	const { trackPageView } = useInteractionTracking()

	useEffect(() => {
		const startTime = Date.now()

		// Track page view with load time
		const handleLoad = () => {
			const loadTime = Date.now() - startTime
			trackPageView(pageName, loadTime)
		}

		// If page is already loaded
		if (document.readyState === 'complete') {
			handleLoad()
		} else {
			window.addEventListener('load', handleLoad)
		}

		return () => {
			window.removeEventListener('load', handleLoad)
		}
	}, [pageName, trackPageView])

	return null // This component doesn't render anything
}
