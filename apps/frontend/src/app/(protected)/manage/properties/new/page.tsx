import { requireSession } from '#lib/server-auth'
import { PropertyForm } from '#components/properties/property-form.client'

/**
 * New Property Page - Server Component
 *
 * Ensures session is established before rendering client form.
 * This prevents 401 errors from TanStack Query trying to refetch
 * persisted cache before browser session is ready.
 */
export default async function NewPropertyPage() {
	// ✅ Server-side auth - ensures session exists before client hydration
	await requireSession()

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-bold">Add New Property</h2>
				<p className="text-muted-foreground">
					Enter property details to add it to your portfolio
				</p>
			</div>
			<PropertyForm mode="create" />
		</div>
	)
}
