'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { InviteTenantForm } from '#components/tenants/invite-tenant-form'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import { useQuery } from '@tanstack/react-query'

/**
 * Invite Tenant Page (Full Page Fallback)
 *
 * Renders when user navigates directly to /tenants/new (e.g., bookmark, refresh).
 * The intercepting route modal handles the normal flow from /tenants.
 */
export default function InviteTenantPage() {
	const { data: propertiesResponse, isLoading: propertiesLoading } = useQuery(propertyQueries.list())
	const { data: unitsResponse, isLoading: unitsLoading } = useQuery(unitQueries.list())
	const properties = propertiesResponse?.data ?? []
	const units = unitsResponse?.data ?? []

	const isLoading = propertiesLoading || unitsLoading

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-lg py-8">
				<Card>
					<CardHeader>
						<Skeleton className="h-7 w-32 mb-2" />
						<Skeleton className="h-5 w-full" />
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{[1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-lg py-8">
			<Card>
				<CardHeader>
					<CardTitle>Invite Tenant</CardTitle>
					<CardDescription>
						Send a portal invitation to a new tenant. You can create their lease after they complete onboarding.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<InviteTenantForm properties={properties} units={units} />
				</CardContent>
			</Card>
		</div>
	)
}
