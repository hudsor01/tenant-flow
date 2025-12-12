import { LeaseForm } from '#components/leases/lease-form.client'
import { RouteModal } from '#components/ui/route-modal'

/**
 * New Lease Modal (Intercepting Route)
 */
export default function NewLeaseModal() {
	return (
		<RouteModal intent="create" className="max-w-3xl max-h-[90vh] overflow-y-auto">
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3">Create New Lease</h2>
					<p className="text-muted-foreground">
						Enter lease details and assign tenant
					</p>
				</div>
				<LeaseForm mode="create" />
			</div>
		</RouteModal>
	)
}
