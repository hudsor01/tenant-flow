'use client'

import { useEffect } from 'react'
import {
	useBusinessEvents,
	useInteractionTracking
} from '@/lib/analytics/business-events'

/**
 * Dashboard Analytics Tracker
 * Automatically tracks dashboard views and user engagement
 */
export function DashboardTracker() {
	const { trackDashboardView } = useBusinessEvents()
	const { trackPageView } = useInteractionTracking()

	useEffect(() => {
		const startTime = Date.now()

		// Track dashboard view
		trackDashboardView('overview')

		// Track page view with load time
		const handleLoad = () => {
			const loadTime = Date.now() - startTime
			trackPageView('dashboard', loadTime)
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
	}, [trackDashboardView, trackPageView])

	return null // This component doesn't render anything
}
