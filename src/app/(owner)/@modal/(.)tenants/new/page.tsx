'use client'

import { RouteModal } from '#components/ui/route-modal'
import { DialogTitle, DialogDescription } from '#components/ui/dialog'
import { Skeleton } from '#components/ui/skeleton'
import { AddTenantForm } from '#components/tenants/add-tenant-form'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { useQuery } from '@tanstack/react-query'

/**
 * Add Tenant Modal (Intercepting Route)
 *
 * Opens as a modal overlay when clicking "Add Tenant" from /tenants page.
 * Collects basic tenant info + optional property assignment for the landlord's records.
 *
 * Lease creation is handled separately.
 */
export default function AddTenantModal() {
	const { data: propertiesResponse, isLoading: propertiesLoading } = useQuery(
		propertyQueries.list()
	)
	const { data: unitsResponse, isLoading: unitsLoading } = useQuery(
		unitQueries.list()
	)
	const properties = propertiesResponse?.data ?? []
	const units = unitsResponse?.data ?? []

	const isLoading = propertiesLoading || unitsLoading

	return (
		<RouteModal intent="create" className="max-w-lg">
			<div className="space-y-4">
				<div>
					<DialogTitle>Add Tenant</DialogTitle>
					<DialogDescription>
						Add a tenant record. You can assign them to a property now or
						attach them to a lease later.
					</DialogDescription>
				</div>
				{isLoading ? (
					<div className="space-y-4">
						{[1, 2, 3, 4].map(i => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : (
					<AddTenantForm properties={properties} units={units} />
				)}
			</div>
		</RouteModal>
	)
}
