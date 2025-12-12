'use client'

import { use } from 'react'
import { MaintenanceForm } from '#components/maintenance/maintenance-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { Skeleton } from '#components/ui/skeleton'
import { maintenanceQueries } from '#hooks/api/queries/maintenance-queries'
import { useQuery } from '@tanstack/react-query'
import { notFound } from 'next/navigation'

/**
 * Edit Maintenance Request Modal (Intercepting Route)
 */
export default function EditMaintenanceModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = use(params)
	const { data: request, isLoading, error } = useQuery(maintenanceQueries.detail(id))

	if (error) {
		notFound()
	}

	return (
		<RouteModal intent="edit" className="max-w-3xl max-h-[90vh] overflow-y-auto">
			{isLoading ? (
				<Skeleton className="h-96 w-full rounded-xl" />
			) : request ? (
				<MaintenanceForm mode="edit" request={request} />
			) : null}
		</RouteModal>
	)
}
