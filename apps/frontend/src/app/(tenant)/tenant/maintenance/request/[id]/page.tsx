import { Suspense } from 'react'
import { Skeleton } from '#components/ui/skeleton'
import { TenantMaintenanceRequestDetails } from './tenant-maintenance-request-details.client'

export default async function TenantMaintenanceRequestPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params

	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">Maintenance request</h1>
				<p className="text-muted-foreground">
					Review request details and the latest status updates.
				</p>
			</div>
			<Suspense fallback={<Skeleton className="h-80 w-full" />}>
				<TenantMaintenanceRequestDetails id={id} />
			</Suspense>
		</div>
	)
}

