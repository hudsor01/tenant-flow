import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import { logger } from '@/lib/logger'

const PropertyDetail = lazy(() => import('@/pages/Properties/PropertyDetail'))

const propertySearchSchema = z.object({
	tab: z.enum(['overview', 'tenants', 'maintenance', 'finances']).optional(),
})

export const Route = createFileRoute('/_authenticated/properties/$propertyId')({
	validateSearch: propertySearchSchema,
	component: PropertyDetail,
	loader: async ({ params, context }) => {
		const { propertyId } = params
		const { queryClient, trpcClient } = context

		// Preload property detail and related data in parallel using TRPC
		const promises = [
			// Property details via TRPC
			queryClient.prefetchQuery({
				queryKey: queryKeys.properties.detail(propertyId),
				queryFn: () => trpcClient.properties.byId.query({ id: propertyId }),
				...cacheConfig.business,
			}),
			// Property units via TRPC
			queryClient.prefetchQuery({
				queryKey: queryKeys.properties.units(propertyId),
				queryFn: () => trpcClient.units.list.query({ propertyId }),
				...cacheConfig.business,
			}),
			// Property tenants via TRPC
			queryClient.prefetchQuery({
				queryKey: queryKeys.tenants.list({ propertyId }),
				queryFn: () => trpcClient.tenants.list.query({}),
				...cacheConfig.business,
			}),
			// Property maintenance requests via TRPC
			queryClient.prefetchQuery({
				queryKey: queryKeys.maintenance.propertyRequests(propertyId),
				queryFn: () => trpcClient.maintenance.list.query({ propertyId }),
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