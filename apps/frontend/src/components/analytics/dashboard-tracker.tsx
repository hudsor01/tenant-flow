'use client'

/**
 * Dashboard-specific analytics tracker
 * Tracks dashboard interactions and metrics views
 */

import { useEffect, useCallback } from 'react'
import { usePostHog } from 'posthog-js/react'

interface DashboardTrackerProps {
	section?: string
	metrics?: Record<string, number>
	userId?: string
}

export function DashboardTracker({
	section = 'main',
	metrics = {},
	userId
}: DashboardTrackerProps) {
	const posthog = usePostHog()

	useEffect(() => {
<<<<<<< HEAD
		if (!posthog) {
			return
		}
=======
		if (!posthog) return
>>>>>>> origin/main

		// Track dashboard view
		posthog.capture('dashboard_viewed', {
			section,
			user_id: userId,
			...metrics,
			timestamp: new Date().toISOString()
		})
	}, [posthog, section, metrics, userId])

	// Track specific dashboard interactions
	const trackDashboardAction = useCallback(
		(action: string, properties?: Record<string, unknown>) => {
<<<<<<< HEAD
			if (!posthog) {
				return
			}
=======
			if (!posthog) return
>>>>>>> origin/main

			posthog.capture('dashboard_action', {
				action,
				section,
				user_id: userId,
				...properties,
				timestamp: new Date().toISOString()
			})
		},
		[posthog, section, userId]
	)

	// Expose tracking function via ref callback pattern
	useEffect(() => {
		// Store tracker function on window for easy access
<<<<<<< HEAD
		// @ts-expect-error - global augmentation would be overkill for this use case
=======
		// @ts-ignore - global augmentation would be overkill for this use case
>>>>>>> origin/main
		window.trackDashboardAction = trackDashboardAction
	}, [trackDashboardAction])

	return null
}

export default DashboardTracker
