import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { MaintenanceListResponse } from '@repo/shared'

const MaintenancePage = lazy(() => import('@/pages/Maintenance/MaintenancePage'))

// Search parameter validation schema
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
		// Ensure search parameters have defaults
		const search = {
			page: 1,
			limit: 20,
			sortBy: 'created_at' as const,
			sortOrder: 'desc' as const,
			status: undefined as 'open' | 'in_progress' | 'completed' | 'cancelled' | undefined,
			priority: undefined as 'low' | 'medium' | 'high' | 'urgent' | undefined,
			propertyId: undefined as string | undefined,
			tenantId: undefined as string | undefined,
			...(location.search as any)
		}
		try {
			// Fetch maintenance requests using the API client
			const response = await (context as any).api.maintenance.list({
				page: search.page,
				limit: search.limit,
				status: search.status,
				priority: search.priority,
				propertyId: search.propertyId,
				tenantId: search.tenantId,
				sortBy: search.sortBy,
				sortOrder: search.sortOrder
			})
			
			const data = response.data as MaintenanceListResponse
			
			logger.info('Maintenance requests loaded successfully', undefined, {
				count: data.requests?.length || 0,
				page: search.page,
				limit: search.limit
			})
			
			// Return structured data
			return {
				maintenanceRequests: data.requests || [],
				totalCount: data.totalCount || 0,
				pagination: {
					page: search.page,
					limit: search.limit,
					hasMore: (data.requests?.length || 0) === search.limit
				},
				filters: {
					status: search.status,
					priority: search.priority,
					propertyId: search.propertyId,
					tenantId: search.tenantId,
					sortBy: search.sortBy,
					sortOrder: search.sortOrder
				}
			}
		} catch (error) {
			logger.error('Maintenance requests loader failed', error as Error, {
				search
			})
			
			// Re-throw for error boundary to handle
			throw error
		}
	},
})