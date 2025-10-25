import { createServerApi } from '@/lib/api-client'
import { requireSession } from '@/lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Tables } from '@repo/shared/types/supabase'
import { CreateTenantForm } from '../../../tenant/create-tenant-form.client'

type Property = Tables<'property'>
type Unit = Tables<'unit'>

export default async function NewTenantPage() {
	const { user, accessToken } = await requireSession()
	const serverApi = createServerApi(accessToken)
	const logger = createLogger({ component: 'NewTenantPage', userId: user.id })

	let properties: Property[] = []
	let units: Unit[] = []

	try {
		const [propertiesData, unitsData] = await Promise.all([
			serverApi.properties.list(),
			serverApi.units.list()
		])

		properties = propertiesData ?? []
		units = unitsData ?? []
	} catch (err) {
		logger.warn('Failed to fetch properties and units for tenant creation', {
			error: err instanceof Error ? err.message : String(err)
		})
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
