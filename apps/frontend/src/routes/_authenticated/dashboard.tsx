import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import { logger } from '@/lib/logger'

const DashboardPage = lazy(() => import('@/pages/Dashboard'))

const dashboardSearchSchema = z.object({
	tab: z.enum(['overview', 'recent', 'analytics', 'alerts']).optional(),
	timeframe: z.enum(['week', 'month', 'quarter', 'year']).optional(),
	subscription: z.enum(['success', 'cancelled']).optional(),
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
						logger.warn('Properties preload failed', error as Error)
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
						logger.warn('Financial analytics preload failed', error as Error)
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
						logger.warn('Subscription preload failed', error as Error)
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