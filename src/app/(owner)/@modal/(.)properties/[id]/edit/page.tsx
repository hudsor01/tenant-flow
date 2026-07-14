"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { use } from "react";
import { PropertyForm } from "#components/properties/property-form.client";
import { RouteModal } from "#components/ui/route-modal";
import { Skeleton } from "#components/ui/skeleton";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";

/**
 * Edit Property Modal (Intercepting Route)
 *
 * Intercepted route that displays when the user navigates to
 * /properties/[id]/edit via soft navigation (clicking Edit from the list page).
 *
 * Behavior:
 * - Soft navigation: shows as a modal overlay on the current page
 * - Hard navigation: falls back to the full page at /properties/[id]/edit
 * - Back button: closes the modal, returns to the list
 * - URL: /properties/[id]/edit (shareable, bookmarkable)
 *
 * PropertyForm's edit path ends with `if (!onSuccess) router.back()`, so it
 * dismisses the modal on a successful save without extra wiring here.
 */
export default function EditPropertyModal({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const {
		data: property,
		isLoading,
		error,
	} = useQuery(propertyQueries.detail(id));

	if (error) {
		notFound();
	}

	return (
		<RouteModal intent="edit" className="max-w-3xl">
			{isLoading ? (
				<Skeleton className="h-96 w-full rounded-xl" />
			) : property ? (
				<PropertyForm
					mode="edit"
					property={property}
					showSuccessState={false}
				/>
			) : null}
		</RouteModal>
	);
}
