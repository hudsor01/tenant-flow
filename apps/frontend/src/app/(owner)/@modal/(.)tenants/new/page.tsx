'use client'

import { RouteModal } from '#components/ui/route-modal'
import { DialogTitle, DialogDescription } from '#components/ui/dialog'
import { Skeleton } from '#components/ui/skeleton'
import { InviteTenantForm } from '#components/tenants/invite-tenant-form'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { useQuery } from '@tanstack/react-query'

/**
 * Invite Tenant Modal (Intercepting Route)
 *
 * Opens as a modal overlay when clicking "Invite Tenant" from /tenants page.
 * Collects basic tenant info + property assignment to send portal invitation.
 *
 * Lease creation is handled separately after tenant onboards.
 */
export default function InviteTenantModal() {
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
					<DialogTitle>Invite Tenant</DialogTitle>
					<DialogDescription>
						Send a portal invitation to a new tenant. You can create their lease
						after they complete onboarding.
					</DialogDescription>
				</div>
				{isLoading ? (
					<div className="space-y-4">
						{[1, 2, 3, 4].map(i => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : (
					<InviteTenantForm properties={properties} units={units} />
				)}
			</div>
		</RouteModal>
	)
}
