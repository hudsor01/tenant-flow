import { FileText } from 'lucide-react'
import { PropertyInspectionTemplate } from '../components/property-inspection-template.client'

export default function PropertyInspectionTemplatePage() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<FileText className="hidden size-10 text-primary sm:block" />
					<div>
						<h1 className="typography-h2 tracking-tight">
							Property Inspection Report
						</h1>
						<p className="text-muted-foreground">
							Capture pre/post move-in conditions with checklists and photo
							uploads.
						</p>
					</div>
				</div>
			</header>

			<PropertyInspectionTemplate />
		</div>
	)
}
