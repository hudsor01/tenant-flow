import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { queryKeys, cacheConfig } from '@/lib/query-keys'

const DashboardPage = lazy(() => import('@/pages/Dashboard'))

const dashboardSearchSchema = z.object({
	tab: z.enum(['overview', 'recent', 'analytics', 'alerts']).optional(),
	timeframe: z.enum(['week', 'month', 'quarter', 'year']).optional(),
})

export const Route = createFileRoute('/_authenticated/dashboard')({
	validateSearch: dashboardSearchSchema,
	component: DashboardPage,
	loader: async ({ context }) => {
		// Preload critical dashboard data in parallel
		const promises = [
			// Properties overview
			context.queryClient.ensureQueryData({
				queryKey: queryKeys.properties.lists(),
				queryFn: async () => {
					try {
						// Simulated API call - replace with actual API
						return []
					} catch (error) {
						console.warn('Properties preload failed:', error)
						return []
					}
				},
				...cacheConfig.business,
			}),
			// Financial overview
			context.queryClient.ensureQueryData({
				queryKey: queryKeys.financial.analytics(),
				queryFn: async () => {
					try {
						// Simulated API call - replace with actual API  
						return null
					} catch (error) {
						console.warn('Financial analytics preload failed:', error)
						return null
					}
				},
				...cacheConfig.business,
			}),
			// Subscription status
			context.queryClient.ensureQueryData({
				queryKey: queryKeys.subscriptions.current(),
				queryFn: async () => {
					try {
						// Simulated API call - replace with actual API
						return null
					} catch (error) {
						console.warn('Subscription preload failed:', error)
						return null
					}
				},
				...cacheConfig.business,
			}),
		]

		// Load all critical data in parallel - non-blocking
		await Promise.allSettled(promises)
	},
})