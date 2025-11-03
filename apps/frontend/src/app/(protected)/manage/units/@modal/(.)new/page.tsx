import { UnitForm } from '#components/units/unit-form.client'
import { RouteModal } from '#components/ui/route-modal'

/**
 * New Unit Modal (Intercepting Route)
 */
export default function NewUnitModal() {
	return (
		<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="text-2xl font-bold">Add New Unit</h2>
					<p className="text-muted-foreground">Create a new rental unit</p>
				</div>
				<UnitForm mode="create" />
			</div>
		</RouteModal>
	)
}
