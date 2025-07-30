import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { loaders } from '@/lib/loaders'
import { logger } from '@/lib/logger'
import type { EnhancedRouterContext } from '@/lib/router-context'

const TenantsPage = lazy(() => import('@/pages/Tenants/TenantsPage'))

// Enhanced search parameter validation schema
const tenantsSearchSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	search: z.string().optional(),
	status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
	propertyId: z.string().optional(),
	sortBy: z.enum(['name', 'email', 'created_at', 'lease_start']).default('created_at'),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const Route = createFileRoute('/_authenticated/tenants')({
	validateSearch: tenantsSearchSchema,
	component: TenantsPage,
	loader: async ({ context, location }) => {
		const search = location.search as z.infer<typeof tenantsSearchSchema>
		try {
			// Cast to enhanced context with type safety
			const enhancedContext = context as unknown as EnhancedRouterContext
			
			// Authentication and permission checks
			if (!enhancedContext.isAuthenticated) {
				throw new Error('Authentication required for tenants')
			}
			
			if (!enhancedContext.hasPermission('tenants:read')) {
				throw new Error('Insufficient permissions to view tenants')
			}
			
			// Check subscription limits for tenant management
			const currentTenantsCount = search.search ? 0 : 10 // Rough estimate
			if (!enhancedContext.isWithinLimit('tenants', currentTenantsCount)) {
				logger.warn('Approaching tenants limit', undefined, {
					user: enhancedContext.user?.email,
					limit: enhancedContext.user?.subscription.tenantsLimit,
					current: currentTenantsCount
				})
			}
			
			// Use enhanced tenants loader with search parameters
			const tenantsLoader = loaders.tenants({
				page: search.page,
				limit: search.limit,
				search: search.search,
				status: search.status,
				propertyId: search.propertyId,
				sortBy: search.sortBy,
				sortOrder: search.sortOrder
			})
			
			const result = await tenantsLoader(enhancedContext)
			
			logger.info('Tenants loaded successfully', undefined, {
				user: enhancedContext.user?.email,
				count: Array.isArray(result.data) ? result.data.length : 0,
				page: search.page,
				limit: search.limit,
				filters: {
					search: search.search,
					status: search.status,
					propertyId: search.propertyId
				},
				loadTime: result.metadata.loadTime,
				cacheHit: result.metadata.cacheHit,
				hasErrors: !!result.metadata.errors
			})
			
			// Return enhanced data structure
			return {
				tenants: result.data || [],
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: Array.isArray(result.data) && result.data.length === search.limit,
					total: Array.isArray(result.data) ? result.data.length : 0
				},
				filters: {
					search: search.search,
					status: search.status,
					propertyId: search.propertyId,
					sortBy: search.sortBy,
					sortOrder: search.sortOrder
				},
				_metadata: {
					loadTime: result.metadata.loadTime,
					cacheHit: result.metadata.cacheHit,
					errors: result.metadata.errors,
					userPermissions: enhancedContext.user?.permissions || [],
					canCreate: enhancedContext.hasPermission('tenants:write'),
					canManage: enhancedContext.hasPermission('tenants:write'),
					withinLimit: enhancedContext.isWithinLimit('tenants', Array.isArray(result.data) ? result.data.length : 0),
					subscriptionTier: enhancedContext.user?.subscription.tier || 'free'
				}
			}
		} catch (error) {
			const enhancedError = (context as unknown as EnhancedRouterContext).handleError(error, 'tenants-loader')
			
			logger.error('Tenants loader failed', error as Error, {
				search,
				errorType: enhancedError.type,
				retryable: enhancedError.retryable
			})
			
			// Return fallback structure for graceful degradation
			return {
				tenants: [],
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: false,
					total: 0
				},
				filters: {
					search: search.search,
					status: search.status,
					propertyId: search.propertyId,
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