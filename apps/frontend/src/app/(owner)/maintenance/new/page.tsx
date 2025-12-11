import { MaintenanceForm } from '#components/maintenance/maintenance-form.client'

export default async function NewMaintenanceRequestPage() {

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">
					New maintenance request
				</h1>
				<p className="text-muted-foreground">
					Capture maintenance issues and coordinate with your operations team.
				</p>
			</div>
			<MaintenanceForm mode="create" />
		</div>
	)
}
