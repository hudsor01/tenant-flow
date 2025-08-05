import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { RouterContext, TenantListResponse } from '@repo/shared'

const TenantsPage = lazy(() => import('@/pages/Tenants/TenantsPage'))

// Search parameter validation schema
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
	loader: async ({ context, location }: { context: RouterContext; location: { search: z.infer<typeof tenantsSearchSchema> } }) => {
		const search = location.search
		try {
			// Fetch tenants using the API client
			const response = await context.api.tenants.list({
				page: search.page,
				limit: search.limit,
				search: search.search,
				status: search.status,
				propertyId: search.propertyId,
				sortBy: search.sortBy,
				sortOrder: search.sortOrder
			})
			
			const data = response.data as TenantListResponse
			
			logger.info('Tenants loaded successfully', undefined, {
				count: data.tenants?.length || 0,
				page: search.page,
				limit: search.limit
			})
			
			// Return structured data
			return {
				tenants: data.tenants || [],
				totalCount: data.totalCount || 0,
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: (data.tenants?.length || 0) === search.limit
				},
				filters: {
					search: search.search,
					status: search.status,
					propertyId: search.propertyId,
					sortBy: search.sortBy,
					sortOrder: search.sortOrder
				}
			}
		} catch (error) {
			logger.error('Tenants loader failed', error as Error, {
				search
			})
			
			// Re-throw for error boundary to handle
			throw error
		}
	},
})