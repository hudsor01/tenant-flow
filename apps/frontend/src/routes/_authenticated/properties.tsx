import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { queryKeys, cacheConfig } from '@/lib/query-keys'

const PropertiesPage = lazy(() => import('@/pages/Properties/PropertiesPage'))

export const Route = createFileRoute('/_authenticated/properties')({
	component: PropertiesPage,
	loader: async ({ context }) => {
		// Preload properties list data
		await context.queryClient.ensureQueryData({
			queryKey: queryKeys.properties.lists(),
			queryFn: async () => {
				try {
					// Simulated API call - replace with actual Supabase call
					return []
				} catch (error) {
					console.warn('Properties list preload failed:', error)
					return []
				}
			},
			...cacheConfig.business,
		})
	},
})