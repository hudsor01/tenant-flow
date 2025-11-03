import { PropertyForm } from '#components/properties/property-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { clientFetch } from '#lib/api/client'
import type { Property } from '@repo/shared/types/core'
import { notFound } from 'next/navigation'

/**
 * Edit Property Modal (Intercepting Route)
 *
 * Intercepted route that displays when user navigates to /manage/properties/[id]/edit
 * via soft navigation (clicking Edit from list page).
 *
 * Behavior:
 * - Soft navigation: Shows as modal overlay on list page
 * - Hard navigation: Falls back to full page at /manage/properties/[id]/edit/page.tsx
 * - Back button: Closes modal, returns to list
 * - URL: /manage/properties/[id]/edit (shareable, bookmarkable)
 */
export default async function EditPropertyModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	try {
		const { id } = await params
		const property = await clientFetch<Property>(
			`${process.env.API_BASE_URL}/api/v1/properties/${id}`
		)

		if (!property?.id) {
			notFound()
		}

		return (
			<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<PropertyForm mode="edit" property={property} showSuccessState={false} />
			</RouteModal>
		)
	} catch (error) {
		console.error('Failed to fetch property:', error)
		notFound()
	}
}
