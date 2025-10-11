import { LeaseDetails } from './lease-details.client'

interface LeaseDetailPageProps {
	params: { id: string }
}

export default function LeaseDetailPage({ params }: LeaseDetailPageProps) {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Lease overview
				</h1>
				<p className="text-muted-foreground">
					Review lease terms, tenant assignment, and unit information.
				</p>
			</div>
			<LeaseDetails id={params.id} />
		</div>
	)
}
