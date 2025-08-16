/**
 * Interactive pricing table with progressive enhancement
 * Minimal client component that enhances static pricing grid
 */

'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { PricingErrorBoundary } from './pricing-error-boundary'
import { StaticPricingGrid } from './static-pricing-grid'
import { PricingProvider, usePricingContext } from '@/contexts/pricing-context'
import { PricingTable } from './pricing-table'
import { UsageIndicator } from './usage-indicator'
import { PricingRecommendations } from './pricing-recommendations'

interface InteractivePricingTableProps {
	className?: string
	enableStripeTable?: boolean
	showUsageIndicator?: boolean
	showRecommendations?: boolean
}

// Loading skeleton for pricing table
function PricingTableSkeleton() {
	return (
		<div className="animate-pulse">
			<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="h-96 rounded-lg bg-gray-200"></div>
				))}
			</div>
		</div>
	)
}

// Enhanced pricing table with user context
function EnhancedPricingTable({
	enableStripeTable = true,
	showUsageIndicator = true,
	showRecommendations = true,
	className
}: InteractivePricingTableProps) {
	const { currentPlan, subscription, recommendations, isLoading, error } =
		usePricingContext()
	const [isClient, setIsClient] = useState(false)

	// Ensure client-side rendering for hydration safety
	useEffect(() => {
		setIsClient(true)
	}, [])

	if (!isClient) {
		return <StaticPricingGrid className={className} />
	}

	if (isLoading) {
		return (
			<div className={className}>
				<PricingTableSkeleton />
			</div>
		)
	}

	if (error) {
		throw error // Let error boundary handle it
	}

	return (
		<div className={className}>
			{/* Usage indicator for existing users */}
			{showUsageIndicator && currentPlan && subscription ? (
				<Suspense
					fallback={
						<div className="mb-8 h-32 animate-pulse rounded-lg bg-gray-100" />
					}
				>
					<UsageIndicator className="mb-8" />
				</Suspense>
			) : null}

			{/* Smart recommendations */}
			{showRecommendations &&
			currentPlan &&
			recommendations.length > 0 ? (
				<Suspense
					fallback={
						<div className="mb-8 h-24 animate-pulse rounded-lg bg-blue-50" />
					}
				>
					<PricingRecommendations className="mb-8" />
				</Suspense>
			) : null}

			{/* Primary pricing display */}
			{enableStripeTable ? (
				<Suspense fallback={<StaticPricingGrid className="mb-8" />}>
					<PricingTable
						customerEmail={subscription ? undefined : ''} // Only pre-fill for new users
						className="mb-8"
					/>
				</Suspense>
			) : (
				<StaticPricingGrid className="mb-8" />
			)}
		</div>
	)
}

/**
 * Main interactive pricing table component with error boundary and context
 */
export function InteractivePricingTable(props: InteractivePricingTableProps) {
	return (
		<PricingProvider>
			<PricingErrorBoundary
				fallback={<StaticPricingGrid className={props.className} />}
				onError={(error, errorInfo) => {
					// Track pricing table errors specifically
					console.error('Interactive Pricing Table Error:', {
						error,
						errorInfo
					})

					// In production, send to error tracking service
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
						).gtag('event', 'exception', {
							description: `Interactive Pricing Error: ${error.message}`,
							fatal: false,
							custom_map: {
								component: 'interactive_pricing_table',
								props: JSON.stringify(props)
							}
						})
					}
				}}
			>
				<EnhancedPricingTable {...props} />
			</PricingErrorBoundary>
		</PricingProvider>
	)
}

// Performance monitoring hook
export function usePricingTableMetrics() {
	const [metrics, setMetrics] = useState({
		loadTime: 0,
		interactionTime: 0,
		errorCount: 0
	})

	useEffect(() => {
		const startTime = performance.now()

		// Track load time
		const handleLoad = () => {
			setMetrics(prev => ({
				...prev,
				loadTime: performance.now() - startTime
			}))
		}

		// Track first interaction
		const handleFirstInteraction = () => {
			setMetrics(prev => ({
				...prev,
				interactionTime: performance.now() - startTime
			}))

			// Remove listener after first interaction
			document.removeEventListener('click', handleFirstInteraction)
		}

		window.addEventListener('load', handleLoad)
		document.addEventListener('click', handleFirstInteraction)

		return () => {
			window.removeEventListener('load', handleLoad)
			document.removeEventListener('click', handleFirstInteraction)
		}
	}, [])

	return metrics
}
