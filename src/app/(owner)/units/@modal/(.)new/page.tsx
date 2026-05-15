import { RouteModal } from "#components/ui/route-modal";
import { UnitForm } from "#components/units/unit-form.client";

/**
 * New Unit Modal (Intercepting Route)
 */
export default function NewUnitModal() {
	return (
		<RouteModal
			intent="create"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3">Add New Unit</h2>
					<p className="text-muted-foreground">Create a new rental unit</p>
				</div>
				<UnitForm mode="create" />
			</div>
		</RouteModal>
	);
}
