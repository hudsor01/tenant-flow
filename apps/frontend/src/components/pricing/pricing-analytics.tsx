/**
 * Pricing analytics and performance monitoring
 * Tracks user interactions and page performance
 */

'use client'

import { useEffect, useRef } from 'react'
import { usePricingPageData } from '@/hooks/use-pricing-page-data'
import { type UsageMetrics } from '@repo/shared/config/pricing'

interface PricingAnalyticsProps {
	trackInteractions?: boolean
	trackPerformance?: boolean
	trackErrors?: boolean
}

// Performance metrics interface
interface PerformanceMetrics {
	readonly pageLoadTime: number
	readonly dataLoadTime: number
	readonly timeToInteractive: number
	readonly cumulativeLayoutShift: number
	readonly largestContentfulPaint: number
	readonly firstContentfulPaint: number
}

// Interaction tracking
interface InteractionEvent {
	readonly type: 'click' | 'view' | 'hover' | 'scroll'
	readonly element: string
	readonly timestamp: number
	readonly planId?: string
	readonly section?: string
}

export function PricingAnalytics({
	trackInteractions = true,
	trackPerformance = true,
	trackErrors = true
}: PricingAnalyticsProps) {
	const metricsRef = useRef<PerformanceMetrics | null>(null)
	const interactionsRef = useRef<InteractionEvent[]>([])
	const { data: pricingData, isLoading, error } = usePricingPageData()

	// Track performance metrics
	useEffect(() => {
		if (!trackPerformance) return undefined

		const measurePerformance = () => {
			try {
				const navigation = performance.getEntriesByType(
					'navigation'
				)[0] as PerformanceNavigationTiming
				const paint = performance.getEntriesByType('paint')

				const metrics: PerformanceMetrics = {
					pageLoadTime:
						navigation.loadEventEnd - navigation.fetchStart,
					dataLoadTime: pricingData ? performance.now() : 0,
					timeToInteractive:
						navigation.domInteractive - navigation.fetchStart,
					cumulativeLayoutShift: 0, // Would need CLS observer
					largestContentfulPaint: 0, // Would need LCP observer
					firstContentfulPaint:
						paint.find(p => p.name === 'first-contentful-paint')
							?.startTime || 0
				}

				metricsRef.current = metrics

				// Send to analytics
				if (
					typeof window !== 'undefined' &&
					(
						window as unknown as {
							gtag?: (...args: unknown[]) => void
						}
					).gtag
				) {
					;(
						window as unknown as {
							gtag: (...args: unknown[]) => void
						}
					).gtag('event', 'pricing_page_performance', {
						page_load_time: metrics.pageLoadTime,
						data_load_time: metrics.dataLoadTime,
						time_to_interactive: metrics.timeToInteractive,
						first_contentful_paint: metrics.firstContentfulPaint,
						custom_map: {
							pricing_data_loaded: !!pricingData,
							has_subscription: !!pricingData?.subscription
						}
					})
				}
			} catch (error) {
				console.warn('Performance measurement failed:', error)
			}
		}

		// Measure after page load
		if (document.readyState === 'complete') {
			measurePerformance()
			return undefined
		} else {
			window.addEventListener('load', measurePerformance)
			return () => window.removeEventListener('load', measurePerformance)
		}
	}, [trackPerformance, pricingData])

	// Track pricing data load performance
	useEffect(() => {
		if (!trackPerformance || isLoading) return undefined

		const loadTime = performance.now()

		if (
			typeof window !== 'undefined' &&
			(window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
		) {
			;(window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
				'event',
				'pricing_data_loaded',
				{
					load_time: loadTime,
					has_error: !!error,
					has_subscription: !!pricingData?.subscription,
					usage_level: pricingData?.usage
						? getUsageLevel(pricingData.usage)
						: 'none',
					recommendations_shown:
						!!pricingData?.recommendations.shouldUpgrade
				}
			)
		}
	}, [isLoading, error, pricingData, trackPerformance])

	// Track user interactions
	useEffect(() => {
		if (!trackInteractions) return undefined

		const trackInteraction = (event: Event) => {
			const target = event.target as HTMLElement
			if (!target) return

			// Identify pricing-related elements
			const planElement = target.closest('[data-plan-id]')
			const sectionElement = target.closest('[data-section]')

			const interaction: InteractionEvent = {
				type: event.type as 'click' | 'view' | 'hover',
				element:
					target.tagName.toLowerCase() +
					(target.className
						? `.${target.className.split(' ')[0]}`
						: ''),
				timestamp: Date.now(),
				planId: planElement?.getAttribute('data-plan-id') || undefined,
				section:
					sectionElement?.getAttribute('data-section') || undefined
			}

			interactionsRef.current.push(interaction)

			// Send high-value interactions immediately
			if (
				event.type === 'click' &&
				(target.textContent?.includes('Get Started') ||
					target.textContent?.includes('Start Free Trial') ||
					target.textContent?.includes('Contact Sales'))
			) {
				if (
					typeof window !== 'undefined' &&
					(
						window as unknown as {
							gtag?: (...args: unknown[]) => void
						}
					).gtag
				) {
					;(
						window as unknown as {
							gtag: (...args: unknown[]) => void
						}
					).gtag('event', 'pricing_cta_click', {
						cta_text: target.textContent,
						plan_id: interaction.planId,
						section: interaction.section,
						timestamp: interaction.timestamp
					})
				}
			}
		}

		// Track clicks and key interactions
		document.addEventListener('click', trackInteraction)

		// Track plan card views using Intersection Observer
		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						const planId = entry.target.getAttribute('data-plan-id')
						if (planId) {
							trackInteraction({
								type: 'view',
								target: entry.target,
								timestamp: Date.now()
							} as Event & {
								type: InteractionEvent['type']
								target: HTMLElement
								timestamp: number
							})
						}
					}
				})
			},
			{ threshold: 0.5 }
		)

		// Observe plan cards
		document.querySelectorAll('[data-plan-id]').forEach(el => {
			observer.observe(el)
		})

		return () => {
			document.removeEventListener('click', trackInteraction)
			observer.disconnect()
		}
	}, [trackInteractions])

	// Track errors
	useEffect(() => {
		if (!trackErrors) return undefined

		const handleError = (event: ErrorEvent) => {
			if (
				typeof window !== 'undefined' &&
				(window as unknown as { gtag?: (...args: unknown[]) => void })
					.gtag
			) {
				;(
					window as unknown as { gtag: (...args: unknown[]) => void }
				).gtag('event', 'exception', {
					description: `Pricing Page Error: ${event.message}`,
					fatal: false,
					custom_map: {
						filename: event.filename,
						lineno: event.lineno,
						colno: event.colno,
						page: 'pricing'
					}
				})
			}
		}

		window.addEventListener('error', handleError)
		return () => window.removeEventListener('error', handleError)
	}, [trackErrors])

	// Send batch analytics on page unload
	useEffect(() => {
		const sendBatchAnalytics = () => {
			// Simplified analytics - just track basic metrics
			if (
				typeof window !== 'undefined' &&
				(window as unknown as { gtag?: (...args: unknown[]) => void })
					.gtag
			) {
				;(
					window as unknown as { gtag: (...args: unknown[]) => void }
				).gtag('event', 'pricing_session_summary', {
					total_interactions: interactionsRef.current.length,
					performance_grade: getPerformanceGrade(metricsRef.current)
				})
			}
		}

		window.addEventListener('beforeunload', sendBatchAnalytics)
		return () =>
			window.removeEventListener('beforeunload', sendBatchAnalytics)
	}, [])

	return null // This component only tracks, doesn't render
}

// Helper functions
function getUsageLevel(usage: UsageMetrics): 'low' | 'medium' | 'high' {
	const totalUsage =
		(usage.properties || 0) + (usage.units || 0) + (usage.users || 0)
	if (totalUsage < 10) return 'low'
	if (totalUsage < 50) return 'medium'
	return 'high'
}

function _getMostViewedPlan(interactions: InteractionEvent[]): string | null {
	const planViews = interactions
		.filter(i => i.type === 'view' && i.planId)
		.reduce(
			(acc, i) => {
				acc[i.planId!] = (acc[i.planId!] || 0) + 1
				return acc
			},
			{} as Record<string, number>
		)

	return (
		Object.entries(planViews).sort(([, a], [, b]) => b - a)[0]?.[0] || null
	)
}

function getPerformanceGrade(
	metrics: PerformanceMetrics | null
): 'A' | 'B' | 'C' | 'D' {
	if (!metrics) return 'D'

	const { pageLoadTime, firstContentfulPaint } = metrics

	if (pageLoadTime < 1000 && firstContentfulPaint < 1500) return 'A'
	if (pageLoadTime < 2000 && firstContentfulPaint < 2500) return 'B'
	if (pageLoadTime < 3000 && firstContentfulPaint < 4000) return 'C'
	return 'D'
}
