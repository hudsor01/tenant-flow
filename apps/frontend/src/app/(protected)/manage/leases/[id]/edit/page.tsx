import { LeaseEditForm } from './lease-edit-form.client'

interface LeaseEditPageProps {
	params: { id: string }
}

export default function LeaseEditPage({ params }: LeaseEditPageProps) {
	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Edit lease</h1>
				<p className="text-muted-foreground">
					Make changes to lease timelines, tenant assignment, or financial
					terms.
				</p>
			</div>
			<LeaseEditForm id={params.id} />
		</div>
	)
}
