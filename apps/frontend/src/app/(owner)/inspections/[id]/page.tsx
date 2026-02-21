import { Suspense } from 'react'
import { Skeleton } from '#components/ui/skeleton'
import { InspectionDetailClient } from '#components/inspections/inspection-detail.client'

async function InspectionDetailWrapper({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	return <InspectionDetailClient id={id} />
}

export default async function InspectionDetailPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const resolvedParams = await params
	return (
		<div className="space-y-8">
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<InspectionDetailWrapper params={Promise.resolve(resolvedParams)} />
			</Suspense>
		</div>
	)
}
