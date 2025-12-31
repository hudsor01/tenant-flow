'use client'

import { use } from 'react'
import { PropertyForm } from '#components/properties/property-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { Skeleton } from '#components/ui/skeleton'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { useQuery } from '@tanstack/react-query'
import { notFound } from 'next/navigation'

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
export default function EditPropertyModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = use(params)
	const {
		data: property,
		isLoading,
		error
	} = useQuery(propertyQueries.detail(id))

	if (error) {
		notFound()
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
	)
}
