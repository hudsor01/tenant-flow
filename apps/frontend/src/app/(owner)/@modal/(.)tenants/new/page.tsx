'use client'

import { RouteModal } from '#components/ui/route-modal'
import { Skeleton } from '#components/ui/skeleton'
import { InviteTenantForm } from '#components/tenants/invite-tenant-form'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
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
	const { data: propertiesResponse, isLoading: propertiesLoading } = useQuery(propertyQueries.list())
	const { data: unitsResponse, isLoading: unitsLoading } = useQuery(unitQueries.list())
	const properties = propertiesResponse?.data ?? []
	const units = unitsResponse?.data ?? []

	const isLoading = propertiesLoading || unitsLoading

	return (
		<RouteModal
			modalId="invite-tenant"
			className="max-w-lg max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold">Invite Tenant</h2>
					<p className="text-muted">
						Send a portal invitation to a new tenant. You can create their lease after they complete onboarding.
					</p>
				</div>
				{isLoading ? (
					<div className="space-y-4">
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : (
					<InviteTenantForm
						properties={properties}
						units={units}
						modalId="invite-tenant"
					/>
				)}
			</div>
		</RouteModal>
	)
}
