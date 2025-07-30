import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { loaders } from '@/lib/loaders'
import { logger } from '@/lib/logger'
import type { EnhancedRouterContext } from '@/lib/router-context'

const DashboardPage = lazy(() => import('@/pages/Dashboard'))

const dashboardSearchSchema = z.object({
	tab: z.enum(['overview', 'recent', 'analytics', 'alerts']).optional(),
	timeframe: z.enum(['week', 'month', 'quarter', 'year']).optional(),
	subscription: z.enum(['success', 'cancelled']).optional(),
})

export const Route = createFileRoute('/_authenticated/dashboard')({
	validateSearch: dashboardSearchSchema,
	component: DashboardPage,
	loader: async ({ context, location }) => {
		const search = location.search as z.infer<typeof dashboardSearchSchema>
		try {
			// Cast context to enhanced router context with type safety
			const enhancedContext = context as unknown as EnhancedRouterContext
			
			// Check authentication before proceeding
			if (!enhancedContext.isAuthenticated) {
				throw new Error('Authentication required for dashboard')
			}
			
			// Check required permissions
			if (!enhancedContext.hasAnyPermission(['properties:read', 'analytics:read'])) {
				throw new Error('Insufficient permissions for dashboard')
			}
			
			// Use the enhanced dashboard loader with full context
			const dashboardLoader = loaders.dashboard
			const result = await dashboardLoader(enhancedContext)
			
			logger.info('Dashboard data loaded', undefined, {
				user: enhancedContext.user?.email,
				tab: search.tab,
				timeframe: search.timeframe,
				loadTime: result.metadata.loadTime,
				cacheHit: result.metadata.cacheHit,
				hasErrors: !!result.metadata.errors,
				dataKeys: Object.keys(result.data || {})
			})
			
			// Return data with additional metadata for the component
			return {
				...result.data,
				_metadata: {
					loadTime: result.metadata.loadTime,
					cacheHit: result.metadata.cacheHit,
					errors: result.metadata.errors,
					userPermissions: enhancedContext.user?.permissions || [],
					subscriptionTier: enhancedContext.user?.subscription.tier || 'free'
				}
			}
		} catch (error) {
			const enhancedError = (context as unknown as EnhancedRouterContext).handleError(error, 'dashboard-loader')
			
			logger.error('Dashboard loader failed', error as Error, {
				errorType: enhancedError.type,
				retryable: enhancedError.retryable
			})
			
			// Return fallback data structure for graceful degradation
			return {
				properties: [],
				propertyStats: { total: 0, active: 0, occupied: 0 },
				recentTenants: [],
				maintenanceRequests: [],
				financialAnalytics: { totalRent: 0, occupancyRate: 0, monthlyRevenue: 0, expenses: 0 },
				subscription: null,
				notifications: [],
				_metadata: {
					loadTime: 0,
					cacheHit: false,
					errors: [enhancedError],
					fallbackUsed: true
				}
			}
		}
	},
})