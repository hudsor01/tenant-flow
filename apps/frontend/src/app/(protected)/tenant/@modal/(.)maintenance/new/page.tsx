/**
 * Maintenance Request Modal Route
 *
 * Intercepting route that shows maintenance request form in a modal.
 * Provides better UX by keeping context while submitting request.
 *
 * Note: Wraps the full NewMaintenanceRequestPage which includes its own
 * header and back button. The RouteModal provides close functionality.
 */

import { RouteModal } from '#components/ui/route-modal'
import NewMaintenanceRequestPage from '../../../maintenance/new/page'

export default function MaintenanceRequestModal() {
	return (
		<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
			<NewMaintenanceRequestPage />
		</RouteModal>
	)
}
