import { MaintenanceDetails } from './maintenance-details.client'
import { Suspense } from 'react'
import { Skeleton } from '#components/ui/skeleton'

async function MaintenanceDetailsWrapper({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	return <MaintenanceDetails id={id} />
}

export default function MaintenanceDetailPage({
	params
}: PageProps<'/maintenance/[id]'>) {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Maintenance request
				</h1>
				<p className="text-muted-foreground">
					Review request details, contact information, and work status.
				</p>
			</div>
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<MaintenanceDetailsWrapper params={params} />
			</Suspense>
		</div>
	)
}
