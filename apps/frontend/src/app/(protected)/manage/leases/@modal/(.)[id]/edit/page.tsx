import { LeaseForm } from '#components/leases/lease-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { clientFetch } from '#lib/api/client'
import type { Lease } from '@repo/shared/types/core'

/**
 * Edit Lease Modal (Intercepting Route)
 */
export default async function EditLeaseModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const lease = await clientFetch<Lease>(
		`${process.env.API_BASE_URL}/api/v1/leases/${id}`
	)

	return (
		<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="text-2xl font-bold">Edit Lease</h2>
					<p className="text-muted-foreground">Update lease details</p>
				</div>
				<LeaseForm mode="edit" lease={lease} />
			</div>
		</RouteModal>
	)
}
