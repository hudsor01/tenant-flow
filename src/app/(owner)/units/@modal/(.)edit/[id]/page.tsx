import { UnitForm } from '#components/units/unit-form.client'
import { RouteModal } from '#components/ui/route-modal'

interface EditUnitModalProps {
	params: Promise<{ id: string }>
}

/**
 * Edit Unit Modal (Intercepting Route)
 */
export default async function EditUnitModal({ params }: EditUnitModalProps) {
	const { id } = await params

	return (
		<RouteModal
			intent="edit"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3">Edit Unit</h2>
					<p className="text-muted-foreground">Update unit details</p>
				</div>
				<UnitForm mode="edit" id={id} />
			</div>
		</RouteModal>
	)
}
