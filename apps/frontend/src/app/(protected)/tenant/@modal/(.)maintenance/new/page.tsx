/**
 * Maintenance Request Modal Route
 *
 * Intercepting route that shows maintenance request form in a modal.
 * Provides better UX by keeping context while submitting request.
 */

import { RouteModal } from '#components/ui/route-modal'
import NewMaintenanceRequestPage from '../../../maintenance/new/page'

export default function MaintenanceRequestModal() {
	return (
		<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="text-2xl font-bold">Submit Maintenance Request</h2>
					<p className="text-muted-foreground">
						Describe the issue and we'll get it fixed as soon as possible
					</p>
				</div>
				<NewMaintenanceRequestPage />
			</div>
		</RouteModal>
	)
}
