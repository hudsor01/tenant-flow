import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { loaders } from '@/lib/loaders'
import { logger } from '@/lib/logger'
import type { EnhancedRouterContext } from '@/lib/router-context'

const PropertyDetail = lazy(() => import('@/pages/Properties/PropertyDetail'))

// Enhanced search parameter validation schema
const propertySearchSchema = z.object({
	tab: z.enum(['overview', 'units', 'analytics', 'maintenance', 'documents']).default('overview').catch('overview'),
	includeAnalytics: z.boolean().default(false).catch(false),
	unitId: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/properties/$propertyId')({
	validateSearch: propertySearchSchema,
	component: PropertyDetail,
	loader: async ({ params, context }) => {
		try {
			const { propertyId } = params
			
			if (!propertyId) {
				throw new Error('Property ID is required')
			}
			
			// Use enhanced property detail loader with default analytics
			const propertyLoader = loaders.property(propertyId, false)
			const result = await propertyLoader(context as EnhancedRouterContext)
			
			logger.info('Property detail loaded', undefined, {
				propertyId,
				loadTime: result.metadata.loadTime,
				cacheHit: result.metadata.cacheHit,
				hasErrors: !!result.metadata.errors
			})
			
			// Return structured data for the component
			return {
				property: result.data.property,
				units: result.data.units,
				analytics: result.data.analytics,
				maintenanceRequests: result.data.maintenanceRequests
			}
		} catch (error) {
			logger.error('Property detail loader failed', error as Error, {
				propertyId: params.propertyId
			})
			
			// Re-throw for error boundary to handle
			throw error
		}
	},
	// Error component for loader failures
	errorComponent: ({ error: _error, reset }) => (
		<div className="flex flex-col items-center justify-center min-h-[400px] p-8">
			<div className="text-center">
				<h2 className="text-2xl font-semibold text-gray-900 mb-2">
					Property Not Found
				</h2>
				<p className="text-gray-600 mb-4">
					The property you're looking for doesn't exist or you don't have permission to view it.
				</p>
				<div className="space-x-4">
					<button
						onClick={reset}
						className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Try Again
					</button>
					<button
						onClick={() => window.history.back()}
						className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
					>
						Go Back
					</button>
				</div>
			</div>
		</div>
	)
})