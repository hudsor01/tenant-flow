import { serverFetch } from '#lib/api/server'
import { requireSession } from '#lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, Unit } from '@repo/shared/types/core'
import { CreateTenantForm } from '../../../tenant/create-tenant-form.client'

export default async function NewTenantPage() {
	const { user, accessToken } = await requireSession()
	const logger = createLogger({ component: 'NewTenantPage', user_id: user.id })

	// DEBUG: Log token info
	logger.info('NewTenantPage auth info', {
		user_id: user.id,
		hasToken: !!accessToken,
		tokenLength: accessToken?.length,
		tokenPrefix: accessToken?.substring(0, 20)
	})

	let properties: Property[] = []
	let units: Unit[] = []

	try {
		logger.info('Fetching properties and units for tenant creation...')

		const [propertiesData, unitsData] = await Promise.all([
			serverFetch<import('@repo/shared/types/core').Property[]>('/api/v1/properties'),
			serverFetch<import('@repo/shared/types/core').Unit[]>('/api/v1/units')
		])

		properties = propertiesData ?? []
		units = unitsData ?? []

		logger.info('Successfully fetched data', {
			propertiesCount: properties.length,
			unitsCount: units.length
		})
	} catch (err) {
		// Extract comprehensive error details for debugging
		const isError = err instanceof Error
		const errorMessage = isError ? err.message : String(err)
		const errorName = isError ? err.name : 'Unknown'
		const errorStack = isError ? err.stack : undefined
		const statusCode = (err as { statusCode?: number }).statusCode
		const responseData = (err as { response?: unknown }).response

		// Log with all available context
		logger.error('Failed to fetch properties and units for tenant creation', {
			errorName,
			errorMessage: errorMessage || '(empty error message)',
			errorStack,
			statusCode,
			responseData,
			errorObject: JSON.stringify(err, Object.getOwnPropertyNames(err)),

			hasToken: !!accessToken,
			tokenLength: accessToken?.length,
			tokenPreview: accessToken?.substring(0, 30) + '...'
		})

		// Still render the form with empty arrays - allow tenant creation even if fetch fails
	}

	return (
		<div className="mx-auto w-full max-w-2xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Onboard New Tenant
				</h1>
				<p className="text-muted-foreground">
					Create a tenant profile, assign a lease, and send a portal invitation
					in one step.
				</p>
			</div>
			<CreateTenantForm properties={properties} units={units} />
		</div>
	)
}
