import type { Metadata } from 'next'
import { NewInspectionForm } from '#components/inspections/new-inspection-form.client'

export const metadata: Metadata = {
	title: 'New Inspection | TenantFlow',
	description: 'Create a new move-in or move-out property inspection'
}

export default function NewInspectionPage() {
	return (
		<div className="mx-auto w-full max-w-2xl space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">New inspection</h1>
				<p className="text-muted-foreground">
					Create a move-in or move-out inspection for a lease.
				</p>
			</div>
			<NewInspectionForm />
		</div>
	)
}
