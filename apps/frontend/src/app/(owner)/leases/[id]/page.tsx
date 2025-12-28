import { LeaseDetails } from './lease-details.client'

export default async function LeaseDetailPage({
	params
}: PageProps<'/leases/[id]'>) {
	const { id } = await params
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">Lease overview</h1>
				<p className="text-muted-foreground">
					Review lease terms, tenant assignment, and unit information.
				</p>
			</div>
			<LeaseDetails id={id} />
		</div>
	)
}
