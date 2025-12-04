'use client'

import { use } from 'react'
import { MaintenanceForm } from '#components/maintenance/maintenance-form.client'
import { Skeleton } from '#components/ui/skeleton'
import { maintenanceQueries } from '#hooks/api/queries/maintenance-queries'
import { useQuery } from '@tanstack/react-query'

interface MaintenanceEditPageProps {
	params: Promise<{ id: string }>
}

export default function MaintenanceEditPage({
	params
}: MaintenanceEditPageProps) {
	const { id } = use(params)
	const { data: request, isLoading } = useQuery(maintenanceQueries.detail(id))

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<div className="space-y-2">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-5 w-80" />
				</div>
				<Skeleton className="h-96 w-full rounded-xl" />
			</div>
		)
	}

	if (!request) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<p className="text-muted-foreground">Maintenance request not found</p>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Edit maintenance request
				</h1>
				<p className="text-muted-foreground">
					Update request details and communicate changes with your team.
				</p>
			</div>
			<MaintenanceForm mode="edit" request={request} />
		</div>
	)
}
