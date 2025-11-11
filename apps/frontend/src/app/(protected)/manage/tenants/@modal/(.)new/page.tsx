import { RouteModal } from '#components/ui/route-modal'
import { CreateTenantForm } from '#app/(protected)/tenant/create-tenant-form.client'
import { serverFetch } from '#lib/api/server'
import type { Tables } from '@repo/shared/types/supabase'

type Property = Tables<'property'>
type Unit = Tables<'unit'>

/**
 * New Tenant Modal (Intercepting Route)
 *
 * NOTE: Tenants use separate forms intentionally - CreateTenantForm handles
 * the onboarding workflow (tenant + lease creation), while TenantEditForm
 * handles only tenant info updates. This differs from other entities where
 * create/edit forms share the same fields.
 */
export default async function NewTenantModal() {
	let properties: Property[] = []
	let units: Unit[] = []

	try {
		const [propertiesData, unitsData] = await Promise.all([
			serverFetch<import('@repo/shared/types/core').Property[]>(
				'/api/v1/properties'
			),
			serverFetch<import('@repo/shared/types/core').Unit[]>('/api/v1/units')
		])

		properties = propertiesData ?? []
		units = unitsData ?? []
	} catch {
		// Allow form to render with empty arrays if fetch fails
	}

	return (
		<RouteModal
			modalId="new-tenant"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<CreateTenantForm
				properties={properties}
				units={units}
				modalId="new-tenant"
			/>
		</RouteModal>
	)
}
