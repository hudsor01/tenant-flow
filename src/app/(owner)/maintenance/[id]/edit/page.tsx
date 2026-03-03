'use client'

import { use } from 'react'
import { MaintenanceForm } from '#components/maintenance/maintenance-form.client'
import { Skeleton } from '#components/ui/skeleton'
import { maintenanceQueries } from '#hooks/api/query-keys/maintenance-keys'
import { useQuery } from '@tanstack/react-query'

interface MaintenanceEditPageProps {
	params: Promise<{ id: string }>
}

export default function MaintenanceEditPage({
	params
}: MaintenanceEditPageProps) {
	const { id } = use(params)
	const { data: request, isLoading, error } = useQuery(maintenanceQueries.detail(id))

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

	if (error) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive mb-2">
						Error Loading Request
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load maintenance request'}
					</p>
				</div>
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
				<h1 className="typography-h3 tracking-tight">
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
