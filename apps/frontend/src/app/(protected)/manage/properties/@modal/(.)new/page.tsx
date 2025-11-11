import { PropertyForm } from '#components/properties/property-form.client'
import { RouteModal } from '#components/ui/route-modal'

/**
 * New Property Modal (Intercepting Route)
 *
 * Intercepted route that displays when user navigates to /manage/properties/new
 * via soft navigation (clicking Link from list page).
 *
 * Behavior:
 * - Soft navigation: Shows as modal overlay on list page
 * - Hard navigation: Falls back to full page at /manage/properties/new/page.tsx
 * - Back button: Closes modal, returns to list
 * - URL: /manage/properties/new (shareable, bookmarkable)
 */
export default function NewPropertyModal() {
	return (
		<RouteModal
			modalId="new-property"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<PropertyForm
				mode="create"
				modalId="new-property"
				showSuccessState={false}
			/>
		</RouteModal>
	)
}
