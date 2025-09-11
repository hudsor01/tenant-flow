'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { usePostHog } from 'posthog-js/react'

export function WebVitals() {
	const posthog = usePostHog()

	useReportWebVitals((metric) => {
		// Report to PostHog using official hook
		if (posthog) {
			posthog.capture('web_vital', {
				name: metric.name,
				value: metric.value,
				rating: metric.rating,
				delta: metric.delta,
				id: metric.id
			})
		}

		// Log in development
		if (process.env.NODE_ENV === 'development') {
			console.info('Web Vital:', {
				name: metric.name,
				value: metric.value,
				rating: metric.rating
			})
		}

		// Report to custom analytics endpoint (optional)
		if (process.env.NODE_ENV === 'production') {
			fetch('/api/analytics/web-vitals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(metric),
				keepalive: true
			}).catch(() => {
				// Ignore network errors for analytics
			})
		}
	})

	return null
}