import { UnitForm } from '#components/units/unit-form.client'
import { requireSession } from '#lib/server-auth'

/**
 * Edit Unit Page (Full-Page)
 *
 * Accessed via:
 * - Hard navigation (direct URL, refresh, new tab)
 * - Fallback when intercepting route fails
 */
export default async function EditUnitPage({ params }: PageProps<'/manage/units/[id]/edit'>) {
	await requireSession()
	const { id } = await params

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Edit Unit</h1>
				<p className="text-muted-foreground">
					Update unit details
				</p>
			</div>
			<UnitForm mode="edit" id={id} />
		</div>
	)
}
