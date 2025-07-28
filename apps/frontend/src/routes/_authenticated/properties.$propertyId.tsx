import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import { api } from '@/lib/api/axios-client'

const PropertyDetail = lazy(() => import('@/pages/Properties/PropertyDetail'))

const propertySearchSchema = z.object({
	tab: z.enum(['overview', 'tenants', 'maintenance', 'finances']).optional(),
})

export const Route = createFileRoute('/_authenticated/properties/$propertyId')({
	validateSearch: propertySearchSchema,
	component: PropertyDetail,
	loader: async ({ params, context }) => {
		const { propertyId } = params
		const { queryClient } = context

		// Preload property detail and related data in parallel
		const promises = [
			// Property details
			queryClient.prefetchQuery({
				queryKey: queryKeys.properties.detail(propertyId),
				queryFn: async () => {
					const response = await api.properties.get(propertyId)
					return response.data
				},
				...cacheConfig.business,
			}),
			// Property units
			queryClient.prefetchQuery({
				queryKey: queryKeys.properties.units(propertyId),
				queryFn: async () => {
					const response = await api.units.list({ propertyId })
					return response.data
				},
				...cacheConfig.business,
			}),
			// Property tenants
			queryClient.prefetchQuery({
				queryKey: queryKeys.tenants.list({ propertyId }),
				queryFn: async () => {
					const response = await api.tenants.list({ propertyId })
					return response.data
				},
				...cacheConfig.business,
			}),
			// Property maintenance requests
			queryClient.prefetchQuery({
				queryKey: queryKeys.maintenance.propertyRequests(propertyId),
				queryFn: async () => {
					const response = await api.maintenance.list({ propertyId })
					return response.data
				},
				...cacheConfig.business,
			}),
		]

		// Load all data in parallel, but don't fail if some requests fail
		const results = await Promise.allSettled(promises)
		
		// Log any failures for debugging
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				const queryNames = ['property details', 'units', 'tenants', 'maintenance requests']
				logger.warn(`Failed to prefetch ${queryNames[index]} for property ${propertyId}`, result.reason)
			}
		})
	},
})