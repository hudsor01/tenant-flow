import { UnitForm } from '#components/units/unit-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { requireSession } from '#lib/server-auth'

interface EditUnitModalProps {
	params: Promise<{ id: string }>
}

/**
 * Edit Unit Modal (Intercepting Route)
 */
export default async function EditUnitModal({ params }: EditUnitModalProps) {
	await requireSession()
	const { id } = await params

	return (
		<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="text-2xl font-bold">Edit Unit</h2>
					<p className="text-muted-foreground">
						Update unit details
					</p>
				</div>
				<UnitForm mode="edit" id={id} />
			</div>
		</RouteModal>
	)
}
