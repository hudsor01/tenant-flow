import { UnitForm } from '#components/units/unit-form.client'
import { requireSession } from '#lib/server-auth'

/**
 * New Unit Page (Full-Page Fallback)
 *
 * Accessed via:
 * - Hard navigation (direct URL, refresh, new tab)
 * - Fallback when intercepting route fails
 */
export default async function NewUnitPage() {
	await requireSession()

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Add New Unit</h1>
				<p className="text-muted-foreground">Create a new rental unit</p>
			</div>
			<UnitForm mode="create" />
		</div>
	)
}
