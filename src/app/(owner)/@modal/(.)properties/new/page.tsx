"use client";

import { useRouter } from "next/navigation";
import { PropertyForm } from "#components/properties/property-form.client";
import { RouteModal } from "#components/ui/route-modal";

/**
 * New Property Modal (Intercepting Route)
 *
 * Intercepted route that displays when the user navigates to /properties/new
 * via soft navigation (clicking a Link from the list page or a dashboard
 * quick action).
 *
 * Behavior:
 * - Soft navigation: shows as a modal overlay on the current page
 * - Hard navigation: falls back to the full page at /properties/new
 * - Back button / successful create: closes the modal (router.back())
 * - URL: /properties/new (shareable, bookmarkable)
 *
 * The create path of PropertyForm has no default dismissal, so the modal
 * supplies `onSuccess={() => router.back()}` — the only dismissal hook.
 */
export default function NewPropertyModal() {
	const router = useRouter();

	return (
		<RouteModal intent="create" className="max-w-3xl">
			<PropertyForm
				mode="create"
				showSuccessState={false}
				onSuccess={() => router.back()}
			/>
		</RouteModal>
	);
}
