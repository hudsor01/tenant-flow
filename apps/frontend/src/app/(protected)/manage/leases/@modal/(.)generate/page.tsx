'use client'

import { LeaseGenerationForm } from '#components/leases/lease-generation-form'
import { RouteModal } from '#components/ui/route-modal'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function GenerateLeaseModal() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const propertyId = searchParams.get('propertyId') || ''
	const unitId = searchParams.get('unitId') || ''
	const tenantId = searchParams.get('tenantId') || ''

	// UUID validation regex (RFC 4122 compliant)
	const isValidUUID = (str: string): boolean =>
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

	// Immediate validation - show error before rendering form
	const hasInvalidParams =
		(propertyId && !isValidUUID(propertyId)) ||
		(unitId && !isValidUUID(unitId)) ||
		(tenantId && !isValidUUID(tenantId))

	if (hasInvalidParams) {
		return (
			<RouteModal className="max-w-md">
				<div className="space-y-4 p-6">
					<div className="space-y-2">
						<h2 className="text-2xl font-bold text-destructive">Invalid Parameters</h2>
						<p className="text-muted-foreground">
							The lease generation link contains invalid property, unit, or tenant IDs.
						</p>
					</div>
					<div className="flex justify-end">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
						>
							Go Back
						</button>
					</div>
				</div>
			</RouteModal>
		)
	}

	return (
		<RouteModal className="max-w-4xl max-h-[90vh] overflow-y-auto">
			<div className="space-y-6 p-6">
				<div className="space-y-2">
					<h2 className="text-2xl font-bold">Generate Texas Lease Agreement</h2>
					<p className="text-muted-foreground">
						Fill out the form below to generate a Texas Residential Lease
						Agreement PDF
					</p>
				</div>

				<LeaseGenerationForm
					propertyId={propertyId}
					unitId={unitId}
					tenantId={tenantId}
					onSuccess={() => router.back()}
				/>
			</div>
		</RouteModal>
	)
}
