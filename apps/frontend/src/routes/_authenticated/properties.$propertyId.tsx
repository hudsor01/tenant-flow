import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import { getHonoClient } from '@/lib/clients/hono-client'
import { supabase } from '@/lib/clients'

// Helper to get auth token
async function getAuthToken(): Promise<string> {
	const { data: { session } } = await supabase.auth.getSession()
	return session?.access_token || ''
}

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

		// Helper to extract data from Hono response
		async function extractHonoData<T>(response: Promise<Response>): Promise<T> {
			const res = await response
			if (!res.ok) {
				const errorText = await res.text()
				throw new Error(errorText || `HTTP ${res.status}`)
			}
			return res.json()
		}

		// Preload property detail and related data in parallel using Hono
		const promises = [
			// Property details via Hono
			queryClient.prefetchQuery({
				queryKey: queryKeys.properties.detail(propertyId),
				queryFn: async () => {
					const client = await getHonoClient()
					if (!client.api) {
						throw new Error('API client not available')
					}
					// Use direct fetch until Hono client types are properly generated
					const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://tenantflow.app/api/v1/'
					const response = await fetch(`${backendUrl}/api/hono/api/v1/properties/${propertyId}`, {
						headers: {
							'Authorization': `Bearer ${await getAuthToken()}`,
							'Content-Type': 'application/json'
						}
					})
					if (!response.ok) {
						throw new Error('Failed to fetch property')
					}
					return response.json()
				},
				...cacheConfig.business,
			}),
			// Property units via Hono
			queryClient.prefetchQuery({
				queryKey: queryKeys.properties.units(propertyId),
				queryFn: async () => {
					const client = await getHonoClient()
					if (!client.api) {
						throw new Error('API client not available')
					}
					return extractHonoData(client.api.v1.units.$get({
						query: { propertyId }
					}))
				},
				...cacheConfig.business,
			}),
			// Property tenants via Hono
			queryClient.prefetchQuery({
				queryKey: queryKeys.tenants.list({ propertyId }),
				queryFn: async () => {
					const client = await getHonoClient()
					if (!client.api) {
						throw new Error('API client not available')
					}
					return extractHonoData(client.api.v1.tenants.$get())
				},
				...cacheConfig.business,
			}),
			// Property maintenance requests via Hono
			queryClient.prefetchQuery({
				queryKey: queryKeys.maintenance.propertyRequests(propertyId),
				queryFn: async () => {
					const client = await getHonoClient()
					if (!client.api) {
						throw new Error('API client not available')
					}
					return extractHonoData(client.api.v1.maintenance.$get({
						query: { propertyId }
					}))
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