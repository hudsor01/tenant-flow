import { MaintenanceEditForm } from './maintenance-edit-form.client'

interface MaintenanceEditPageProps {
	params: { id: string }
}

export default function MaintenanceEditPage({ params }: MaintenanceEditPageProps) {
	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Edit maintenance request</h1>
				<p className="text-muted-foreground">
					Update request details and communicate changes with your team.
				</p>
			</div>
			<MaintenanceEditForm id={params.id} />
		</div>
	)
}
