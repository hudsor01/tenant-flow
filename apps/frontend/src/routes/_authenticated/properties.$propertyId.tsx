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

		// Preload property detail and related data in parallel
		const promises = [
			// Property details
			context.queryClient.ensureQueryData({
				queryKey: queryKeys.properties.detail(propertyId),
				queryFn: async () => {
					try {
						// Simulated API call - replace with actual Supabase call
						return { id: propertyId, name: `Property ${propertyId}` }
					} catch (error) {
						logger.warn('Property detail preload failed', error as Error)
						return null
					}
				},
				...cacheConfig.business,
			}),
			// Property tenants
			context.queryClient.ensureQueryData({
				queryKey: queryKeys.tenants.list({ propertyId }),
				queryFn: async () => {
					try {
						// Simulated API call - replace with actual Supabase call
						return []
					} catch (error) {
						logger.warn('Property tenants preload failed', error as Error)
						return []
					}
				},
				...cacheConfig.business,
			}),
			// Property maintenance requests
			context.queryClient.ensureQueryData({
				queryKey: queryKeys.maintenance.propertyRequests(propertyId),
				queryFn: async () => {
					try {
						// Simulated API call - replace with actual Supabase call
						return []
					} catch (error) {
						logger.warn('Property maintenance preload failed', error as Error)
						return []
					}
				},
				...cacheConfig.business,
			}),
		]

		// Load all data in parallel
		await Promise.allSettled(promises)
	},
})