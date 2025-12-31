import { FileText } from 'lucide-react'
import { MaintenanceRequestTemplate } from '../components/maintenance-request-template.client'

export default function MaintenanceRequestTemplatePage() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<FileText className="hidden size-10 text-primary sm:block" />
					<div>
						<h1 className="typography-h2 tracking-tight">
							Maintenance Request Form
						</h1>
						<p className="text-muted-foreground">
							Generate printable work order forms for vendors and tenants.
						</p>
					</div>
				</div>
			</header>

			<MaintenanceRequestTemplate />
		</div>
	)
}
