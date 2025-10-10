import { TenantEditForm } from '../../tenant-edit-form.client'

interface TenantEditPageProps {
	params: { id: string }
}

export default function TenantEditPage({ params }: TenantEditPageProps) {
	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Edit tenant</h1>
				<p className="text-muted-foreground">
					Update tenant contact details and emergency contact information.
				</p>
			</div>
			<TenantEditForm id={params.id} />
		</div>
	)
}
