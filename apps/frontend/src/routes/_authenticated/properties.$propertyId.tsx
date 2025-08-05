import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { RouterContext, Property } from '@repo/shared'

const PropertyDetail = lazy(() => import('@/pages/Properties/PropertyDetail'))

// Search parameter validation schema
const propertySearchSchema = z.object({
	tab: z.enum(['overview', 'units', 'analytics', 'maintenance', 'documents']).default('overview').catch('overview'),
	unitId: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/properties/$propertyId')({
	validateSearch: propertySearchSchema,
	component: PropertyDetail,
	loader: async ({ params, context }: { params: { propertyId: string }; context: RouterContext }) => {
		try {
			const { propertyId } = params
			
			if (!propertyId) {
				throw new Error('Property ID is required')
			}
			
			// Fetch property data using the API client
			const propertyResponse = await context.api.properties.get(propertyId)
			const property = propertyResponse.data as Property
			
			logger.info('Property detail loaded', undefined, {
				propertyId
			})
			
			// Return the property data
			return {
				property
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
	errorComponent: ({ reset }: { reset: () => void }) => (
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