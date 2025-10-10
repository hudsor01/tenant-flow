import { TenantDetails } from '../tenant-details.client'

interface TenantDetailPageProps {
	params: { id: string }
}

export default function TenantDetailPage({ params }: TenantDetailPageProps) {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Tenant details</h1>
				<p className="text-muted-foreground">
					Review tenant contact information, lease status, and associated property.
				</p>
			</div>
			<TenantDetails id={params.id} />
		</div>
	)
}
