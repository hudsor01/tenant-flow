import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { loaders } from '@/lib/loaders'
import { logger } from '@/lib/logger'
import type { EnhancedRouterContext } from '@/lib/router-context'

const MaintenancePage = lazy(() => import('@/pages/Maintenance/MaintenancePage'))

// Enhanced search parameter validation schema
const maintenanceSearchSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
	priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
	propertyId: z.string().optional(),
	tenantId: z.string().optional(),
	sortBy: z.enum(['created_at', 'updated_at', 'priority', 'status']).default('created_at'),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const Route = createFileRoute('/_authenticated/maintenance')({
	validateSearch: maintenanceSearchSchema,
	component: MaintenancePage,
	loader: async ({ context, location }) => {
		const search = location.search as z.infer<typeof maintenanceSearchSchema>
		try {
			// Cast to enhanced context with type safety
			const enhancedContext = context as unknown as EnhancedRouterContext
			
			// Authentication and permission checks
			if (!enhancedContext.isAuthenticated) {
				throw new Error('Authentication required for maintenance requests')
			}
			
			if (!enhancedContext.hasPermission('maintenance:read')) {
				throw new Error('Insufficient permissions to view maintenance requests')
			}
			
			// Use enhanced maintenance loader with search parameters
			const maintenanceLoader = loaders.maintenance({
				page: search.page,
				limit: search.limit,
				status: search.status,
				priority: search.priority,
				propertyId: search.propertyId,
				tenantId: search.tenantId,
				sortBy: search.sortBy,
				sortOrder: search.sortOrder
			})
			
			const result = await maintenanceLoader(enhancedContext)
			
			logger.info('Maintenance requests loaded successfully', undefined, {
				user: enhancedContext.user?.email,
				count: Array.isArray(result.data) ? result.data.length : 0,
				page: search.page,
				limit: search.limit,
				filters: {
					status: search.status,
					priority: search.priority,
					propertyId: search.propertyId,
					tenantId: search.tenantId
				},
				loadTime: result.metadata.loadTime,
				cacheHit: result.metadata.cacheHit,
				hasErrors: !!result.metadata.errors
			})
			
			// Return enhanced data structure
			return {
				maintenanceRequests: result.data || [],
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: Array.isArray(result.data) && result.data.length === search.limit,
					total: Array.isArray(result.data) ? result.data.length : 0
				},
				filters: {
					status: search.status,
					priority: search.priority,
					propertyId: search.propertyId,
					tenantId: search.tenantId,
					sortBy: search.sortBy,
					sortOrder: search.sortOrder
				},
				_metadata: {
					loadTime: result.metadata.loadTime,
					cacheHit: result.metadata.cacheHit,
					errors: result.metadata.errors,
					userPermissions: enhancedContext.user?.permissions || [],
					canCreate: enhancedContext.hasPermission('maintenance:write'),
					canManage: enhancedContext.hasPermission('maintenance:write'),
					subscriptionTier: enhancedContext.user?.subscription.tier || 'free'
				}
			}
		} catch (error) {
			const enhancedError = (context as unknown as EnhancedRouterContext).handleError(error, 'maintenance-loader')
			
			logger.error('Maintenance requests loader failed', error as Error, {
				search,
				errorType: enhancedError.type,
				retryable: enhancedError.retryable
			})
			
			// Return fallback structure for graceful degradation
			return {
				maintenanceRequests: [],
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: false,
					total: 0
				},
				filters: {
					status: search.status,
					priority: search.priority,
					propertyId: search.propertyId,
					tenantId: search.tenantId,
					sortBy: search.sortBy,
					sortOrder: search.sortOrder
				},
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