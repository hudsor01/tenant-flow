import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { loaders } from '@/lib/loaders'
import { logger } from '@/lib/logger'
import type { EnhancedRouterContext } from '@/lib/router-context'

const PropertiesPage = lazy(() => import('@/pages/Properties/PropertiesPage'))

// Enhanced search parameter validation schema with better defaults
const propertiesSearchSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	search: z.string().optional(),
	type: z.enum(['SINGLE_FAMILY', 'MULTI_FAMILY', 'APARTMENT', 'COMMERCIAL']).optional(),
	status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
	sortBy: z.enum(['name', 'created_at', 'updated_at']).default('created_at'),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const Route = createFileRoute('/_authenticated/properties')({
	validateSearch: propertiesSearchSchema,
	component: PropertiesPage,
	loader: async ({ context, location }) => {
		const search = location.search as z.infer<typeof propertiesSearchSchema>
		try {
			// Cast to enhanced context with type safety
			const enhancedContext = context as unknown as EnhancedRouterContext
			
			// Authentication and permission checks
			if (!enhancedContext.isAuthenticated) {
				throw new Error('Authentication required for properties')
			}
			
			if (!enhancedContext.hasPermission('properties:read')) {
				throw new Error('Insufficient permissions to view properties')
			}
			
			// Use enhanced properties loader with default parameters
			const propertiesLoader = loaders.properties({
				page: 1,
				limit: 20,
				sortBy: 'created_at',
				sortOrder: 'desc'
			})
			
			const result = await propertiesLoader(enhancedContext)
			
			logger.info('Properties loaded successfully', undefined, {
				user: enhancedContext.user?.email,
				count: Array.isArray(result.data) ? result.data.length : 0,
				page: search.page,
				limit: search.limit,
				filters: {
					search: search.search,
					type: search.type,
					status: search.status
				},
				loadTime: result.metadata.loadTime,
				cacheHit: result.metadata.cacheHit,
				hasErrors: !!result.metadata.errors
			})
			
			// Return enhanced data structure
			return {
				properties: result.data || [],
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: Array.isArray(result.data) && result.data.length === search.limit,
					total: Array.isArray(result.data) ? result.data.length : 0
				},
				filters: {
					search: search.search,
					type: search.type,
					status: search.status,
					sortBy: search.sortBy,
					sortOrder: search.sortOrder
				},
				_metadata: {
					loadTime: result.metadata.loadTime,
					cacheHit: result.metadata.cacheHit,
					errors: result.metadata.errors,
					userPermissions: enhancedContext.user?.permissions || [],
					canCreate: enhancedContext.hasPermission('properties:write'),
					withinLimit: enhancedContext.isWithinLimit('properties', Array.isArray(result.data) ? result.data.length : 0)
				}
			}
		} catch (error) {
			const enhancedError = (context as unknown as EnhancedRouterContext).handleError(error, 'properties-loader')
			
			logger.error('Properties loader failed', error as Error, {
				search,
				errorType: enhancedError.type,
				retryable: enhancedError.retryable
			})
			
			// Return fallback structure for graceful degradation
			return {
				properties: [],
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: false,
					total: 0
				},
				filters: {
					search: search.search,
					type: search.type,
					status: search.status,
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