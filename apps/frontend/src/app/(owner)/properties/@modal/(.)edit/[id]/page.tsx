import { PropertyForm } from '#components/properties/property-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { serverFetch } from '#lib/api/server'
import { logErrorDetails } from '#lib/utils/error-logging'
import type { Property } from '@repo/shared/types/core'
import { notFound } from 'next/navigation'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'EditPropertyModal' })

/**
 * Edit Property Modal (Intercepting Route)
 *
 * Intercepted route that displays when user navigates to /properties/[id]/edit
 * via soft navigation (clicking Edit from list page).
 *
 * Behavior:
 * - Soft navigation: Shows as modal overlay on list page
 * - Hard navigation: Falls back to full page at /properties/[id]/edit/page.tsx
 * - Back button: Closes modal, returns to list
 * - URL: /properties/[id]/edit (shareable, bookmarkable)
 */
export default async function EditPropertyModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params

	try {
		const property = await serverFetch<Property>(`/api/v1/properties/${id}`)

		if (!property?.id) {
			notFound()
		}

		return (
			<RouteModal
				modalId={`edit-property-${id}`}
				className="max-w-3xl max-h-[90vh] overflow-y-auto"
			>
				<PropertyForm
					mode="edit"
					property={property}
					modalId={`edit-property-${id}`}
					showSuccessState={false}
				/>
			</RouteModal>
		)
	} catch (error) {
		logErrorDetails(logger, 'Failed to fetch property', error, { id })
		notFound()
	}
}
