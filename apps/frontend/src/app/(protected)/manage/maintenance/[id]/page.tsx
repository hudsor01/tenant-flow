import { MaintenanceDetails } from './maintenance-details.client'

interface MaintenanceDetailPageProps {
	params: { id: string }
}

export default function MaintenanceDetailPage({
	params
}: MaintenanceDetailPageProps) {
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
			<MaintenanceDetails id={params.id} />
		</div>
	)
}
