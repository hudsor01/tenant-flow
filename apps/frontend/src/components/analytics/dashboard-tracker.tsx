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
		if (!posthog) return

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
			if (!posthog) return

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
		// @ts-ignore - global augmentation would be overkill for this use case
		window.trackDashboardAction = trackDashboardAction
	}, [trackDashboardAction])

	return null
}

export default DashboardTracker
