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
