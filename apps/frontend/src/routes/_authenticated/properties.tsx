import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { RouterContext, PropertyListResponse } from '@repo/shared'

const PropertiesPage = lazy(() => import('@/pages/Properties/PropertiesPage'))

// Search parameter validation schema
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
	loader: async ({ context, location }: { context: RouterContext; location: { search: z.infer<typeof propertiesSearchSchema> } }) => {
		const search = location.search
		try {
			// Fetch properties using the API client
			const response = await context.api.properties.list({
				page: search.page,
				limit: search.limit,
				search: search.search,
				type: search.type,
				status: search.status,
				sortBy: search.sortBy,
				sortOrder: search.sortOrder
			})
			
			const data = response.data as PropertyListResponse
			
			logger.info('Properties loaded successfully', undefined, {
				count: data.properties?.length || 0,
				page: search.page,
				limit: search.limit
			})
			
			// Return structured data
			return {
				properties: data.properties || [],
				totalCount: data.totalCount || 0,
				hasMore: data.hasMore || false,
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: data.hasMore || false
				},
				filters: {
					search: search.search,
					type: search.type,
					status: search.status,
					sortBy: search.sortBy,
					sortOrder: search.sortOrder
				}
			}
		} catch (error) {
			logger.error('Properties loader failed', error as Error, {
				search
			})
			
			// Re-throw for error boundary to handle
			throw error
		}
	},
})