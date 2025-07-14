/**
 * Prefetching Utilities for TanStack Router + Query
 * 
 * Provides intelligent prefetching strategies to improve perceived performance
 * by loading data before users need it.
 */

import type { QueryClient } from '@tanstack/react-query'
import { queryKeys, cacheConfig, prefetchQuery } from '@/lib/query-keys'

/**
 * Prefetch related data when hovering over navigation links
 */
export class PrefetchManager {
	private queryClient: QueryClient
	private prefetchTimeouts = new Map<string, NodeJS.Timeout>()

	constructor(queryClient: QueryClient) {
		this.queryClient = queryClient
	}

	/**
	 * Prefetch dashboard data on navigation hover
	 */
	prefetchDashboard = () => {
		const timeoutId = setTimeout(() => {
			Promise.allSettled([
				prefetchQuery(
					this.queryClient,
					queryKeys.properties.lists(),
					async () => {
						// Replace with actual API call
						return []
					},
					'business'
				),
				prefetchQuery(
					this.queryClient,
					queryKeys.subscriptions.current(),
					async () => {
						// Replace with actual API call
						return null
					},
					'business'
				),
				prefetchQuery(
					this.queryClient,
					queryKeys.notifications.list(),
					async () => {
						// Replace with actual API call
						return []
					},
					'realtime'
				),
			])
		}, 100) // 100ms delay

		this.prefetchTimeouts.set('dashboard', timeoutId)
	}

	/**
	 * Prefetch properties data on navigation hover
	 */
	prefetchProperties = () => {
		const timeoutId = setTimeout(() => {
			prefetchQuery(
				this.queryClient,
				queryKeys.properties.lists(),
				async () => {
					// Replace with actual API call
					return []
				},
				'business'
			)
		}, 100)

		this.prefetchTimeouts.set('properties', timeoutId)
	}

	/**
	 * Prefetch tenants data on navigation hover
	 */
	prefetchTenants = () => {
		const timeoutId = setTimeout(() => {
			prefetchQuery(
				this.queryClient,
				queryKeys.tenants.lists(),
				async () => {
					// Replace with actual API call
					return []
				},
				'business'
			)
		}, 100)

		this.prefetchTimeouts.set('tenants', timeoutId)
	}

	/**
	 * Prefetch property detail and related data
	 */
	prefetchPropertyDetail = (propertyId: string) => {
		const timeoutId = setTimeout(() => {
			Promise.allSettled([
				// Property details
				prefetchQuery(
					this.queryClient,
					queryKeys.properties.detail(propertyId),
					async () => {
						// Replace with actual API call
						return { id: propertyId }
					},
					'business'
				),
				// Property tenants
				prefetchQuery(
					this.queryClient,
					queryKeys.tenants.list({ propertyId }),
					async () => {
						// Replace with actual API call
						return []
					},
					'business'
				),
				// Property maintenance
				prefetchQuery(
					this.queryClient,
					queryKeys.maintenance.propertyRequests(propertyId),
					async () => {
						// Replace with actual API call
						return []
					},
					'business'
				),
			])
		}, 150) // Slightly longer delay for detail pages

		this.prefetchTimeouts.set(`property-${propertyId}`, timeoutId)
	}

	/**
	 * Prefetch tenant detail and related data
	 */
	prefetchTenantDetail = (tenantId: string) => {
		const timeoutId = setTimeout(() => {
			Promise.allSettled([
				// Tenant details
				prefetchQuery(
					this.queryClient,
					queryKeys.tenants.detail(tenantId),
					async () => {
						// Replace with actual API call
						return { id: tenantId }
					},
					'business'
				),
				// Tenant payments
				prefetchQuery(
					this.queryClient,
					queryKeys.tenants.payments(tenantId),
					async () => {
						// Replace with actual API call
						return []
					},
					'business'
				),
				// Tenant maintenance
				prefetchQuery(
					this.queryClient,
					queryKeys.tenants.maintenance(tenantId),
					async () => {
						// Replace with actual API call
						return []
					},
					'business'
				),
			])
		}, 150)

		this.prefetchTimeouts.set(`tenant-${tenantId}`, timeoutId)
	}

	/**
	 * Cancel prefetch operation (called on mouse leave)
	 */
	cancelPrefetch = (key: string) => {
		const timeoutId = this.prefetchTimeouts.get(key)
		if (timeoutId) {
			clearTimeout(timeoutId)
			this.prefetchTimeouts.delete(key)
		}
	}

	/**
	 * Cancel all pending prefetch operations
	 */
	cancelAllPrefetch = () => {
		this.prefetchTimeouts.forEach((timeoutId) => {
			clearTimeout(timeoutId)
		})
		this.prefetchTimeouts.clear()
	}

	/**
	 * Cleanup method for component unmount
	 */
	cleanup = () => {
		this.cancelAllPrefetch()
	}
}

/**
 * Hook to use prefetch manager in components
 */
export function usePrefetchManager(queryClient: QueryClient) {
	const prefetchManager = new PrefetchManager(queryClient)
	
	// Cleanup on unmount
	React.useEffect(() => {
		return () => prefetchManager.cleanup()
	}, [prefetchManager])

	return prefetchManager
}

/**
 * React hook for intelligent link prefetching
 */
import React from 'react'

export function useLinkPrefetch() {
	const prefetchTimeouts = React.useRef<Map<string, NodeJS.Timeout>>(new Map())

	const prefetchOnHover = React.useCallback((key: string, prefetchFn: () => void, delay = 100) => {
		// Cancel any existing timeout for this key
		const existingTimeout = prefetchTimeouts.current.get(key)
		if (existingTimeout) {
			clearTimeout(existingTimeout)
		}

		// Set new timeout
		const timeoutId = setTimeout(prefetchFn, delay)
		prefetchTimeouts.current.set(key, timeoutId)
	}, [])

	const cancelPrefetch = React.useCallback((key: string) => {
		const timeoutId = prefetchTimeouts.current.get(key)
		if (timeoutId) {
			clearTimeout(timeoutId)
			prefetchTimeouts.current.delete(key)
		}
	}, [])

	// Cleanup on unmount
	React.useEffect(() => {
		return () => {
			prefetchTimeouts.current.forEach((timeoutId) => {
				clearTimeout(timeoutId)
			})
			prefetchTimeouts.current.clear()
		}
	}, [])

	return { prefetchOnHover, cancelPrefetch }
}

/**
 * Prefetch strategies for different data types
 */
export const PREFETCH_STRATEGIES = {
	// Immediate prefetch for critical data
	immediate: { delay: 0, staleTime: 30000 },
	// Fast prefetch for frequently accessed data
	fast: { delay: 50, staleTime: 60000 },
	// Normal prefetch for regular navigation
	normal: { delay: 100, staleTime: 120000 },
	// Slow prefetch for heavy data
	slow: { delay: 200, staleTime: 300000 },
} as const

/**
 * Smart prefetch based on user behavior patterns
 */
export class SmartPrefetch {
	private static instance: SmartPrefetch
	private navigationPatterns = new Map<string, number>()
	private queryClient: QueryClient

	constructor(queryClient: QueryClient) {
		this.queryClient = queryClient
	}

	static getInstance(queryClient: QueryClient): SmartPrefetch {
		if (!SmartPrefetch.instance) {
			SmartPrefetch.instance = new SmartPrefetch(queryClient)
		}
		return SmartPrefetch.instance
	}

	/**
	 * Track navigation patterns to improve prefetching
	 */
	trackNavigation(from: string, to: string) {
		const pattern = `${from}->${to}`
		const count = this.navigationPatterns.get(pattern) || 0
		this.navigationPatterns.set(pattern, count + 1)
	}

	/**
	 * Get prefetch probability based on navigation patterns
	 */
	getPrefetchProbability(from: string, to: string): number {
		const pattern = `${from}->${to}`
		const count = this.navigationPatterns.get(pattern) || 0
		const totalNavigations = Array.from(this.navigationPatterns.values()).reduce((sum, val) => sum + val, 0)
		
		return totalNavigations > 0 ? count / totalNavigations : 0
	}

	/**
	 * Intelligently prefetch based on user patterns
	 */
	smartPrefetch(currentRoute: string, candidateRoutes: string[]) {
		candidateRoutes.forEach(route => {
			const probability = this.getPrefetchProbability(currentRoute, route)
			
			// Only prefetch if probability is above threshold
			if (probability > 0.3) {
				// Prefetch with delay inversely proportional to probability
				const delay = Math.max(50, 500 * (1 - probability))
				
				setTimeout(() => {
					// Trigger route-specific prefetch logic
					this.prefetchRoute(route)
				}, delay)
			}
		})
	}

	private prefetchRoute(route: string) {
		// Implementation depends on specific routes
		// This would trigger the appropriate prefetch methods
		console.log(`Smart prefetching route: ${route}`)
	}
}