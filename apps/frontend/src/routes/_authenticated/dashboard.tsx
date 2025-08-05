import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
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
	loader: async ({ location }: { location: { search: z.infer<typeof dashboardSearchSchema> } }) => {
		const search = location.search
		try {
			// Dashboard doesn't need complex data loading for now
			// Components will handle their own data fetching via hooks
			logger.info('Dashboard loaded', undefined, {
				tab: search.tab,
				timeframe: search.timeframe
			})
			
			return {
				tab: search.tab,
				timeframe: search.timeframe,
				subscription: search.subscription
			}
		} catch (error) {
			logger.error('Dashboard loader failed', error as Error)
			
			// Re-throw for error boundary to handle
			throw error
		}
	},
})