import { MaintenanceForm } from '#components/maintenance/maintenance-form.client'
import { RouteModal } from '#components/ui/route-modal'

/**
 * New Maintenance Request Modal (Intercepting Route)
 */
export default function NewMaintenanceModal() {
	return (
		<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
			<MaintenanceForm mode="create" />
		</RouteModal>
	)
}
