import { UnitForm } from '#components/units/unit-form.client'

/**
 * New Unit Page (Full-Page Fallback)
 *
 * Accessed via:
 * - Hard navigation (direct URL, refresh, new tab)
 * - Fallback when intercepting route fails
 */
export default async function NewUnitPage() {

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<div className="space-y-2">
				<h1 className="typography-h2">Add New Unit</h1>
				<p className="text-muted-foreground">Create a new rental unit</p>
			</div>
			<UnitForm mode="create" />
		</div>
	)
}
