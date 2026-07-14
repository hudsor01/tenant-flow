import { MaintenanceForm } from "#components/maintenance/maintenance-form.client";
import { RouteModal } from "#components/ui/route-modal";

/**
 * New Maintenance Request Modal (Intercepting Route)
 *
 * MaintenanceForm's form-level onSuccess calls router.back(), so a successful
 * create dismisses the modal without extra wiring. The heading mirrors the full
 * page at /maintenance/new for sibling parity.
 */
export default function NewMaintenanceModal() {
	return (
		<RouteModal
			intent="create"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3 tracking-tight">
						New maintenance request
					</h2>
					<p className="text-muted-foreground">
						Capture maintenance issues and coordinate with your operations team.
					</p>
				</div>
				<MaintenanceForm mode="create" />
			</div>
		</RouteModal>
	);
}
