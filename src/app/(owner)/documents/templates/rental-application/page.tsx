import { FileText } from 'lucide-react'
import { RentalApplicationTemplate } from '../components/rental-application-template.client'

export default function RentalApplicationTemplatePage() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<FileText className="hidden size-10 text-primary sm:block" />
					<div>
						<h1 className="typography-h2 tracking-tight">
							Rental Application
						</h1>
						<p className="text-muted-foreground">
							Collect tenant applications and include background check
							authorizations.
						</p>
					</div>
				</div>
			</header>

			<RentalApplicationTemplate />
		</div>
	)
}
